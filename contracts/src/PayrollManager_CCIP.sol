// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IRouterClient} from "@chainlink/contracts-ccip@1.6.2/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip@1.6.2/contracts/libraries/Client.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// Minimal ERC20 interface
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function safeTransfer(address to, uint256 amount) external returns (bool);
}

/// Minimal Chainlink Automation interface (compatible)
interface AutomationCompatibleInterface {
    function checkUpkeep(bytes calldata checkData) external returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
}

/// PayrollManager.sol
/// Core contract on Base that manages companies, employees and scheduled payrolls.
/// NOTE: CCIP integration is left as an internal placeholder (sendCrossChain) so you can
/// integrate the exact CCIP Router interface you choose later. For hackathon MVP this
/// emits an event with the payment intent which can be wired to CCIP send logic.
contract PayrollManager is AutomationCompatibleInterface {
    IERC20 public immutable usdc;          // USDC token (6 decimals assumed)
    address public owner;                  // admin owner

    /// All fees go to this wallet
    address public feeWallet;

    uint256 public nextCompanyId = 1;      // auto-increment company ids
    uint256 public lastCheckedCompanyIndex;// automation pointer
    uint256 public lastCheckedEmployeeIndex;// automation pointer per-company processed in check loop
    uint256 public registrationFee;        // registration fee in USDC (e.g., 100 * 1e6)

    /// Interval between payments (used to advance nextPayDate). Default 5 minutes for testing.
    uint256 public interval;

    address public tokenTransferor;

    /// Company structure
    struct Company {
        address owner;
        string name;
        bool active;
        uint256 registrationDate;
        uint256 companyId;
        uint256[] employeeIds; // list of employee ids
    }

    /// Employee structure
    struct Employee {
        uint256 companyId;
        string name;
        address wallet;
        uint64 destinationChainSelector; // chain selector for CCIP
        uint256 salary; // salary amount in USDC (raw units, e.g., 1 USDC == 1e6)
        uint256 nextPayDate; // unix timestamp
        bool active;
        uint256 employeeId;
    }

    /// Storage mappings
    mapping(uint256 => Company) public companies; // companyId -> Company
    mapping(address => uint256) public companyOfOwner; // owner address -> companyId (0 if none)
    mapping(uint256 => Employee) public employees; // employeeId -> Employee
    uint256 public nextEmployeeId = 1;

    uint256[] public companyIds; // list of registered company ids

    /// Events
    event CompanyRegistered(uint256 indexed companyId, address indexed owner, string name);
    event EmployeeAdded(uint256 indexed companyId, uint256 indexed employeeId, string name, address wallet, uint256 salary, uint256 nextPayDate);
    event EmployeeUpdated(uint256 indexed companyId, uint256 indexed employeeId);
    event EmployeeDeactivated(uint256 indexed companyId, uint256 indexed employeeId);
    event PaymentScheduled(uint256 indexed companyId, uint256 indexed employeeId, address indexed wallet, uint256 amount, uint64 destChain);
    event PaymentExecuted(uint256 indexed companyId, uint256 indexed employeeId, address indexed wallet, uint256 amount);
    event RegistrationFeeUpdated(uint256 newFee);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event IntervalUpdated(uint256 newInterval);

    /// Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyCompanyOwner(uint256 _companyId) {
        Company storage c = companies[_companyId];
        require(c.owner == msg.sender, "not company owner");
        _;
    }

    constructor(address _usdc, address _feewallet, uint256 _registrationFee, address _router, address _link) {
        require(_usdc != address(0), "zero usdc");
        usdc = IERC20(_usdc);
        owner = msg.sender;
        registrationFee = _registrationFee;
        interval = 5 minutes; // default to 5 minutes for testing (modifiable by owner)
        feeWallet = _feewallet;
        s_router = IRouterClient(_router);
        s_linkToken = IERC20(_link);
    }

    // -------------------------
    // Company management
    // -------------------------

    /// @notice Register a new company by paying the registration fee (one-time).
    /// The company must have approved the contract to spend `registrationFee` USDC.
    /// The registration fee is forwarded to the feeWallet.
    /// Each wallet can only register one company.
    function registerCompany(string calldata _name) external {
        require(bytes(_name).length > 0, "name required");
        require(companyOfOwner[msg.sender] == 0, "wallet already has company");
        require(usdc.allowance(msg.sender, address(this)) >= registrationFee, "approve registrationFee");

        // Double-check (defensive): make sure msg.sender isn't already owner of another registered company
        for (uint256 i = 0; i < companyIds.length; i++) {
            if (companies[companyIds[i]].owner == msg.sender) {
                revert("wallet already registered as owner");
            }
        }

        bool ok = usdc.transferFrom(msg.sender, feeWallet, registrationFee);
        require(ok, "transferFrom failed");

        uint256 cid = nextCompanyId++;
        Company storage c = companies[cid];
        c.owner = msg.sender;
        c.name = _name;
        c.active = true;
        c.registrationDate = block.timestamp;
        c.companyId = cid;

        companyOfOwner[msg.sender] = cid;
        companyIds.push(cid);

        emit CompanyRegistered(cid, msg.sender, _name);
    }

    /// @notice Update registration fee (admin)
    function setRegistrationFee(uint256 _fee) external onlyOwner {
        registrationFee = _fee;
        emit RegistrationFeeUpdated(_fee);
    }

    /// @notice Deactivate company (admin)
    function deactivateCompany(uint256 _companyId) external onlyOwner {
        companies[_companyId].active = false;
    }

    /// @notice Reactivate company (admin)
    function activateCompany(uint256 _companyId) external onlyOwner {
        companies[_companyId].active = true;
    }

    /// @notice Update payment interval (seconds). Only admin.
    function setInterval(uint256 _interval) external onlyOwner {
        require(_interval > 0, "invalid interval");
        interval = _interval;
        emit IntervalUpdated(_interval);
    }

    // -------------------------
    // Employee management
    // -------------------------

    /// @notice Add an employee to the calling company owner
    /// The caller must be the registered company's owner.
    /// The first payment date is set automatically to block.timestamp + interval.
    function addEmployee(
        string calldata _name,
        address _wallet,
        uint64 _destinationChainSelector,
        uint256 _salary
    ) external {
        uint256 _companyId = companyOfOwner[msg.sender];
        require(_companyId != 0, "not company owner");
        Company storage company = companies[_companyId];
        require(company.active, "company inactive");
        require(_wallet != address(0), "zero wallet");
        require(_salary > 0, "salary zero");

        uint256 eid = nextEmployeeId++;
        Employee storage e = employees[eid];
        e.companyId = _companyId;
        e.name = _name;
        e.wallet = _wallet;
        e.destinationChainSelector = _destinationChainSelector;
        e.salary = _salary;
        e.nextPayDate = block.timestamp + interval;
        e.active = true;
        e.employeeId = eid;

        company.employeeIds.push(eid);

        emit EmployeeAdded(_companyId, eid, _name, _wallet, _salary, e.nextPayDate);
    }

    /// @notice Update employee details (company owner)
    function updateEmployee(
        uint256 _employeeId,
        string calldata _name,
        address _wallet,
        uint64 _destinationChainSelector,
        uint256 _salary,
        uint256 _nextPayDate,
        bool _active
    ) external {
        uint256 _companyId = companyOfOwner[msg.sender];
        require(_companyId != 0, "not company owner");
        Employee storage e = employees[_employeeId];
        require(e.companyId == _companyId, "mismatched company");

        e.name = _name;
        e.wallet = _wallet;
        e.destinationChainSelector = _destinationChainSelector;
        e.salary = _salary;
        e.nextPayDate = _nextPayDate;
        e.active = _active;

        emit EmployeeUpdated(_companyId, _employeeId);
    }

    /// @notice Deactivate employee (company owner)
    function deactivateEmployee(uint256 _employeeId) external {
        uint256 _companyId = companyOfOwner[msg.sender];
        require(_companyId != 0, "not company owner");
        Employee storage e = employees[_employeeId];
        require(e.companyId == _companyId, "mismatched company");

        e.active = false;
        emit EmployeeDeactivated(_companyId, _employeeId);
    }


    

    // -------------------------
    // Payments & scheduling
    // -------------------------

    /// Internal: schedule or execute payment.
    /// For same-chain payments (if destinationChainSelector == 0 we assume Base mainnet), we transfer to wallet.
    /// For cross-chain we emit PaymentScheduled event to be consumed by CCIP sender.
    function _scheduleOrExecutePayment(uint256 _companyId, uint256 _employeeId, Employee storage e) internal {
        // Attempt to pull salary from company owner (company wallet)
        address companyOwnerAddr = companies[_companyId].owner;
        uint256 allowance = usdc.allowance(companyOwnerAddr, address(this));
        if (allowance < e.salary) {
            // Not enough allowance: emit scheduled event failed (no transfer). Do nothing.
            emit PaymentScheduled(_companyId, _employeeId, e.wallet, 0, e.destinationChainSelector);
            return;
        }

        // If destinationChainSelector == 0 -> assume same chain (Base) and transfer directly to wallet
        if (e.destinationChainSelector == 0) {
            bool ok = usdc.transferFrom(companyOwnerAddr, e.wallet, e.salary);
            if (ok) {
                emit PaymentExecuted(_companyId, _employeeId, e.wallet, e.salary);
            } else {
                emit PaymentScheduled(_companyId, _employeeId, e.wallet, 0, e.destinationChainSelector);
                return;
            }
        } else {
            // Cross-chain: We emit an event with payment intent.
            // Integrate actual CCIP send in sendCrossChain() later (call CCIP Router).
            // For now, emit event which can be used by off-chain relayer or integrated CCIP logic.
            emit PaymentScheduled(_companyId, _employeeId, e.wallet, e.salary, e.destinationChainSelector);

            // Pull the tokens from the company into the contract for later CCIP-send (escrow)
            bool ok = usdc.transferFrom(companyOwnerAddr, address(this), e.salary);
            require(ok, "transferFrom to escrow failed");
            transferTokensPayLINK(3478487238524512106, e.wallet, 0x88A2d74F47a237a62e7A51cdDa67270CE381555e, e.salary);
            // Note: actual CCIP send should transfer these tokens onward; currently they stay in contract until CCIP integration.
        }

        // update nextPayDate: advance by configured interval
        e.nextPayDate = e.nextPayDate + interval;
    }

    // -------------------------
    // Chainlink Automation (Keeper) integration
    // We will scan companies and employees for due payments.
    // To limit gas, checkUpkeep tries to find one due employee and returns performData with companyId and employeeId.
    // -------------------------

    /// @notice Chainlink Keeper check. Returns (true, performData) when there's any due payment.
    function checkUpkeep(bytes calldata) external override returns (bool upkeepNeeded, bytes memory performData) {
        uint256 cLen = companyIds.length;
        if (cLen == 0) return (false, bytes(""));

        // iterate companies starting from lastCheckedCompanyIndex
        for (uint256 i = 0; i < cLen; i++) {
            uint256 cIdx = (lastCheckedCompanyIndex + i) % cLen;
            uint256 cid = companyIds[cIdx];
            Company storage comp = companies[cid];
            if (!comp.active) continue;

            uint256[] storage eids = comp.employeeIds;
            uint256 eLen = eids.length;
            if (eLen == 0) continue;

            // iterate employees from a remembered index to spread load
            uint256 start = lastCheckedEmployeeIndex % eLen;
            for (uint256 j = 0; j < eLen; j++) {
                uint256 eIdx = (start + j) % eLen;
                uint256 eid = eids[eIdx];
                Employee storage emp = employees[eid];
                if (!emp.active) continue;
                if (block.timestamp >= emp.nextPayDate) {
                    upkeepNeeded = true;
                    performData = abi.encode(cid, eid);
                    // advance pointers
                    lastCheckedCompanyIndex = (cIdx + 1) % cLen;
                    lastCheckedEmployeeIndex = (eIdx + 1) % eLen;
                    return (upkeepNeeded, performData);
                }
            }
            // reset employee pointer per company if none due
            lastCheckedEmployeeIndex = 0;
        }

        return (false, bytes(""));
    }

    /// @notice Keeper performUpkeep: executes one due payment encoded in performData (companyId, employeeId)
    function performUpkeep(bytes calldata performData) external override {
        require(performData.length == 64, "bad performData");
        (uint256 cid, uint256 eid) = abi.decode(performData, (uint256, uint256));
        Company storage comp = companies[cid];
        require(comp.active, "company inactive");
        Employee storage emp = employees[eid];
        require(emp.companyId == cid, "mismatched");
        require(emp.active, "employee inactive");
        require(block.timestamp >= emp.nextPayDate, "not due");

        _scheduleOrExecutePayment(cid, eid, emp);
    }

    // -------------------------
    // Admin utilities
    // -------------------------

    /// @notice Return list of registered company ids
    function getCompanyIds() external view returns (uint256[] memory) {
        return companyIds;
    }

    /// @notice Return employee ids for a company
    function getEmployeesOfCompany(uint256 _companyId) external view returns (uint256[] memory) {
        return companies[_companyId].employeeIds;
    }

    /// @notice Transfer contract ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero addr");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // -------------------------
    // Placeholder for CCIP integration
    // -------------------------
    // Implement your CCIP Router call here. Typical flow:
    // 1) Approve CCIP Router to move tokens from this contract.
    // 2) Call router.ccipSend(...) with encoded payload and target chain/receiver.
    // For the hackathon MVP we emit PaymentScheduled events and keep tokens escrowed in this contract
    // until you wire the sendCrossChain implementation.
    //
    // Example signature (pseudo):
    // function sendCrossChain(uint64 destinationChainSelector, address token, uint256 amount, bytes memory data) internal {
    //     // call CCIP router...
    // }

    // -------------------------
    // View / Helpers
    // -------------------------

    function getEmployee(uint256 _employeeId) external view returns (
        uint256 companyId,
        string memory name,
        address wallet,
        uint64 destinationChainSelector,
        uint256 salary,
        uint256 nextPayDate,
        bool active,
        uint256 employeeId
    ) {
        Employee storage e = employees[_employeeId];
        return (
            e.companyId,
            e.name,
            e.wallet,
            e.destinationChainSelector,
            e.salary,
            e.nextPayDate,
            e.active,
            e.employeeId
        );
    }

    function adminDeactivateEmployee(uint256 _companyId, uint256 _employeeId) external onlyOwner {
        Employee storage e = employees[_employeeId];
        require(e.companyId == _companyId, "mismatched company");
        require(e.active, "already inactive");

        e.active = false;
        emit EmployeeDeactivated(_companyId, _employeeId);
    }

    // ----------------------------- CCIP -----------------------------
    using SafeERC20 for IERC20;

    // Custom errors to provide more descriptive revert messages.
    error NotEnoughBalance(uint256 currentBalance, uint256 requiredBalance); // Used to make sure contract has enough
    // token balance
    error NothingToWithdraw(); // Used when trying to withdraw Ether but there's nothing to withdraw.
    error FailedToWithdrawEth(address owner, address target, uint256 value); // Used when the withdrawal of Ether fails.
    error DestinationChainNotAllowlisted(uint64 destinationChainSelector); // Used when the destination chain has not been
    // allowlisted by the contract owner.
    error InvalidReceiverAddress(); // Used when the receiver address is 0.
    // Event emitted when the tokens are transferred to an account on another chain.

    // The chain selector of the destination chain.
    // The address of the receiver on the destination chain.
    // The token address that was transferred.
    // The token amount that was transferred.
    // the token address used to pay CCIP fees.
    // The fees paid for sending the message.
    event TokensTransferred( // The unique ID of the message.
        bytes32 indexed messageId,
        uint64 indexed destinationChainSelector,
        address receiver,
        address token,
        uint256 tokenAmount,
        address feeToken,
        uint256 fees
    );

    // Mapping to keep track of allowlisted destination chains.
    mapping(uint64 => bool) public allowlistedChains;

    IRouterClient private s_router;

    IERC20 private s_linkToken;


    /// @dev Modifier that checks if the chain with the given destinationChainSelector is allowlisted.
    /// @param _destinationChainSelector The selector of the destination chain.
    modifier onlyAllowlistedChain(
        uint64 _destinationChainSelector
    ) {
        if (!allowlistedChains[_destinationChainSelector]) {
        revert DestinationChainNotAllowlisted(_destinationChainSelector);
        }
        _;
    }

    /// @dev Modifier that checks the receiver address is not 0.
    /// @param _receiver The receiver address.
    modifier validateReceiver(
        address _receiver
    ) {
        if (_receiver == address(0)) revert InvalidReceiverAddress();
        _;
    }

    /// @dev Updates the allowlist status of a destination chain for transactions.
    /// @notice This function can only be called by the owner.
    /// @param _destinationChainSelector The selector of the destination chain to be updated.
    /// @param allowed The allowlist status to be set for the destination chain.
    function allowlistDestinationChain(
        uint64 _destinationChainSelector,
        bool allowed
    ) external onlyOwner {
        allowlistedChains[_destinationChainSelector] = allowed;
    }

    /// @notice Transfer tokens to receiver on the destination chain.
    /// @notice pay in LINK.
    /// @notice the token must be in the list of supported tokens.
    /// @notice This function can only be called by the owner.
    /// @dev Assumes your contract has sufficient LINK tokens to pay for the fees.
    /// @param _destinationChainSelector The identifier (aka selector) for the destination blockchain.
    /// @param _receiver The address of the recipient on the destination blockchain.
    /// @param _token token address.
    /// @param _amount token amount.
    /// @return messageId The ID of the message that was sent.
    function transferTokensPayLINK(
        uint64 _destinationChainSelector,
        address _receiver,
        address _token,
        uint256 _amount
    )
        internal
        onlyAllowlistedChain(_destinationChainSelector)
        validateReceiver(_receiver)
        returns (bytes32 messageId)
    {
        // Create an EVM2AnyMessage struct in memory with necessary information for sending a cross-chain message
        //  address(linkToken) means fees are paid in LINK
        Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(_receiver, _token, _amount, address(s_linkToken));

        // Get the fee required to send the message
        uint256 fees = s_router.getFee(_destinationChainSelector, evm2AnyMessage);

        uint256 requiredLinkBalance;
        if (_token == address(s_linkToken)) {
        // Required LINK Balance is the sum of fees and amount to transfer, if the token to transfer is LINK
        requiredLinkBalance = fees + _amount;
        } else {
        requiredLinkBalance = fees;
        }

        uint256 linkBalance = s_linkToken.balanceOf(address(this));

        if (requiredLinkBalance > linkBalance) {
        revert NotEnoughBalance(linkBalance, requiredLinkBalance);
        }

        // approve the Router to transfer LINK tokens on contract's behalf. It will spend the requiredLinkBalance
        s_linkToken.approve(address(s_router), requiredLinkBalance);

        // If sending a token other than LINK, approve it separately
        if (_token != address(s_linkToken)) {
        uint256 tokenBalance = IERC20(_token).balanceOf(address(this));
        if (_amount > tokenBalance) {
            revert NotEnoughBalance(tokenBalance, _amount);
        }
        // approve the Router to spend tokens on contract's behalf. It will spend the amount of the given token
        IERC20(_token).approve(address(s_router), _amount);
        }

        // Send the message through the router and store the returned message ID
        messageId = s_router.ccipSend(_destinationChainSelector, evm2AnyMessage);

        // Emit an event with message details
        emit TokensTransferred(messageId, _destinationChainSelector, _receiver, _token, _amount, address(s_linkToken), fees);

        // Return the message ID
        return messageId;
    }

    /// @notice Transfer tokens to receiver on the destination chain.
    /// @notice Pay in native gas such as ETH on Ethereum or POL on Polygon.
    /// @notice the token must be in the list of supported tokens.
    /// @notice This function can only be called by the owner.
    /// @dev Assumes your contract has sufficient native gas like ETH on Ethereum or POL on Polygon.
    /// @param _destinationChainSelector The identifier (aka selector) for the destination blockchain.
    /// @param _receiver The address of the recipient on the destination blockchain.
    /// @param _token token address.
    /// @param _amount token amount.
    /// @return messageId The ID of the message that was sent.
    function transferTokensPayNative(
        uint64 _destinationChainSelector,
        address _receiver,
        address _token,
        uint256 _amount
    )
        external
        onlyOwner
        onlyAllowlistedChain(_destinationChainSelector)
        validateReceiver(_receiver)
        returns (bytes32 messageId)
    {
        // Create an EVM2AnyMessage struct in memory with necessary information for sending a cross-chain message
        // address(0) means fees are paid in native gas
        Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(_receiver, _token, _amount, address(0));

        // Get the fee required to send the message
        uint256 fees = s_router.getFee(_destinationChainSelector, evm2AnyMessage);

        if (fees > address(this).balance) {
        revert NotEnoughBalance(address(this).balance, fees);
        }

        // approve the Router to spend tokens on contract's behalf. It will spend the amount of the given token
        IERC20(_token).approve(address(s_router), _amount);

        // Send the message through the router and store the returned message ID
        messageId = s_router.ccipSend{value: fees}(_destinationChainSelector, evm2AnyMessage);

        // Emit an event with message details
        emit TokensTransferred(messageId, _destinationChainSelector, _receiver, _token, _amount, address(0), fees);

        // Return the message ID
        return messageId;
    }

    /// @notice Construct a CCIP message.
    /// @dev This function will create an EVM2AnyMessage struct with all the necessary information for tokens transfer.
    /// @param _receiver The address of the receiver.
    /// @param _token The token to be transferred.
    /// @param _amount The amount of the token to be transferred.
    /// @param _feeTokenAddress The address of the token used for fees. Set address(0) for native gas.
    /// @return Client.EVM2AnyMessage Returns an EVM2AnyMessage struct which contains information for sending a CCIP
    /// message.
    function _buildCCIPMessage(
        address _receiver,
        address _token,
        uint256 _amount,
        address _feeTokenAddress
    ) private pure returns (Client.EVM2AnyMessage memory) {
        // Set the token amounts
        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({token: _token, amount: _amount});

        // Create an EVM2AnyMessage struct in memory with necessary information for sending a cross-chain message
        return Client.EVM2AnyMessage({
        receiver: abi.encode(_receiver), // ABI-encoded receiver address
        data: "", // No data
        tokenAmounts: tokenAmounts, // The amount and type of token being transferred
        extraArgs: Client._argsToBytes(
            // Additional arguments, setting gas limit and allowing out-of-order execution.
            // Best Practice: For simplicity, the values are hardcoded. It is advisable to use a more dynamic approach
            // where you set the extra arguments off-chain. This allows adaptation depending on the lanes, messages,
            // and ensures compatibility with future CCIP upgrades. Read more about it here:
            // https://docs.chain.link/ccip/concepts/best-practices/evm#using-extraargs
            Client.GenericExtraArgsV2({
            gasLimit: 0, // Gas limit for the callback on the destination chain
            allowOutOfOrderExecution: true // Allows the message to be executed out of order relative to other messages
            // from
            // the same sender
            })
        ),
        // Set the feeToken to a feeTokenAddress, indicating specific asset will be used for fees
        feeToken: _feeTokenAddress
        });
    }

    /// @notice Fallback function to allow the contract to receive Ether.
    /// @dev This function has no function body, making it a default function for receiving Ether.
    /// It is automatically called when Ether is transferred to the contract without any data.
    receive() external payable {}

    /// @notice Allows the contract owner to withdraw the entire balance of Ether from the contract.
    /// @dev This function reverts if there are no funds to withdraw or if the transfer fails.
    /// It should only be callable by the owner of the contract.
    /// @param _beneficiary The address to which the Ether should be transferred.
    function withdraw(
        address _beneficiary
    ) public onlyOwner {
        // Retrieve the balance of this contract
        uint256 amount = address(this).balance;

        // Revert if there is nothing to withdraw
        if (amount == 0) revert NothingToWithdraw();

        // Attempt to send the funds, capturing the success status and discarding any return data
        (bool sent,) = _beneficiary.call{value: amount}("");

        // Revert if the send failed, with information about the attempted transfer
        if (!sent) revert FailedToWithdrawEth(msg.sender, _beneficiary, amount);
    }

    /// @notice Allows the owner of the contract to withdraw all tokens of a specific ERC20 token.
    /// @dev This function reverts with a 'NothingToWithdraw' error if there are no tokens to withdraw.
    /// @param _beneficiary The address to which the tokens will be sent.
    /// @param _token The contract address of the ERC20 token to be withdrawn.
    function withdrawToken(
        address _beneficiary,
        address _token
    ) public onlyOwner {
        // Retrieve the balance of this contract
        uint256 amount = IERC20(_token).balanceOf(address(this));

        // Revert if there is nothing to withdraw
        if (amount == 0) revert NothingToWithdraw();

        IERC20(_token).safeTransfer(_beneficiary, amount);
    }
}