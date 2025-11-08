// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IRouterClient} from "@chainlink/contracts-ccip@1.6.2/contracts/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip@1.6.2/contracts/libraries/Client.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PayrollManager with Chainlink Automation & CCIP
 * @notice This project is a payroll management platform for companies and employees, supporting USDC-based payment automation both on the same chain and cross-chain.
 *
 * @custom:verified-address Base Sepolia: 0x297599530b23464BD1920093Eb1aaB970b4c6B37
 * https://testnet.routescan.io/address/0x297599530b23464BD1920093Eb1aaB970b4c6B37/contract/84532/code
 * https://repo.sourcify.dev/84532/0x297599530b23464BD1920093Eb1aaB970b4c6B37
 * https://base-sepolia.blockscout.com/address/0x297599530b23464BD1920093Eb1aaB970b4c6B37?tab=contract
 *
 * - The contract allows companies to register, manage employees, and schedule or automate salary payments on multiple chains.
 * - Chainlink Automation is used to automatically check if salary payouts are due and execute payments when needed, eliminating manual intervention.
 *      - Main Automation logic can be found around lines 322 (function checkUpkeep) and 373 (function performUpkeep).
 * - Chainlink CCIP (Cross-Chain Interoperability Protocol) enables secure, automated cross-chain token transfers for employee payments to other chains.
 *      - Main CCIP logic is implemented around lines 429 (transferTokensPayLINK, transferTokensPayNative) to 596.
**/

/// ---------------------------------------------------------------
///                        INTERFACES
/// ---------------------------------------------------------------
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function safeTransfer(address to, uint256 amount) external returns (bool);
}

interface AutomationCompatibleInterface {
    function checkUpkeep(bytes calldata checkData) external returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
}

/// ---------------------------------------------------------------
///                        MAIN CONTRACT
/// ---------------------------------------------------------------
contract PayrollManager is AutomationCompatibleInterface {

    /// ---------------------------------------------------------------
    ///                    STATE VARIABLES
    /// ---------------------------------------------------------------
    // General Configuration
    IERC20 public immutable usdc;
    address public owner;
    address public feeWallet;
    uint256 public registrationFee;
    uint256 public interval;
    address public tokenTransferor;

    // Company and Employee Management
    uint256 public nextCompanyId = 1;
    uint256 public nextEmployeeId = 1;
    uint256 public lastCheckedCompanyIndex;
    uint256 public lastCheckedEmployeeIndex;
    uint256[] public companyIds;

    mapping(uint256 => Company) public companies;
    mapping(address => uint256) public companyOfOwner;
    mapping(uint256 => Employee) public employees;

    /// ---------------------------------------------------------------
    ///                    STRUCTS
    /// ---------------------------------------------------------------
    struct Company {
        address owner;
        string name;
        bool active;
        uint256 registrationDate;
        uint256 companyId;
        uint256[] employeeIds;
    }

    struct Employee {
        uint256 companyId;
        string name;
        address wallet;
        uint64 destinationChainSelector;
        uint256 salary;
        uint256 nextPayDate;
        bool active;
        uint256 employeeId;
    }

    /// ---------------------------------------------------------------
    ///                    EVENTS
    /// ---------------------------------------------------------------
    event CompanyRegistered(uint256 indexed companyId, address indexed owner, string name);
    event EmployeeAdded(uint256 indexed companyId, uint256 indexed employeeId, string name, address wallet, uint256 salary, uint256 nextPayDate);
    event EmployeeUpdated(uint256 indexed companyId, uint256 indexed employeeId);
    event EmployeeDeactivated(uint256 indexed companyId, uint256 indexed employeeId);
    event PaymentScheduled(uint256 indexed companyId, uint256 indexed employeeId, address indexed wallet, uint256 amount, uint64 destChain);
    event PaymentExecuted(uint256 indexed companyId, uint256 indexed employeeId, address indexed wallet, uint256 amount);
    event RegistrationFeeUpdated(uint256 newFee);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event IntervalUpdated(uint256 newInterval);

    /// ---------------------------------------------------------------
    ///                    MODIFIERS
    /// ---------------------------------------------------------------
    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyCompanyOwner(uint256 _companyId) {
        Company storage c = companies[_companyId];
        require(c.owner == msg.sender, "not company owner");
        _;
    }

    /// ---------------------------------------------------------------
    ///                    CONSTRUCTOR
    /// ---------------------------------------------------------------
    /// @notice Constructor to initialize the contract
    constructor(
        address _usdc,
        address _feewallet,
        uint256 _registrationFee,
        address _router,
        address _link
    ) {
        require(_usdc != address(0), "zero usdc");
        usdc = IERC20(_usdc);
        owner = msg.sender;
        registrationFee = _registrationFee;
        interval = 5 minutes;
        feeWallet = _feewallet;
        s_router = IRouterClient(_router);
        s_linkToken = IERC20(_link);
    }

    /// ---------------------------------------------------------------
    ///                    COMPANY MANAGEMENT
    /// ---------------------------------------------------------------
    /// @notice Registers a new company
    function registerCompany(string calldata _name) external {
        require(bytes(_name).length > 0, "name required");
        require(companyOfOwner[msg.sender] == 0, "wallet already has company");
        require(usdc.allowance(msg.sender, address(this)) >= registrationFee, "approve registrationFee");

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

    /// @notice Sets the registration fee
    function setRegistrationFee(uint256 _fee) external onlyOwner {
        registrationFee = _fee;
        emit RegistrationFeeUpdated(_fee);
    }

    /// @notice Deactivates a company (onlyOwner)
    function deactivateCompany(uint256 _companyId) external onlyOwner {
        companies[_companyId].active = false;
    }

    /// @notice Activates a company (onlyOwner)
    function activateCompany(uint256 _companyId) external onlyOwner {
        companies[_companyId].active = true;
    }

    /// @notice Sets the payment interval (onlyOwner)
    function setInterval(uint256 _interval) external onlyOwner {
        require(_interval > 0, "invalid interval");
        interval = _interval;
        emit IntervalUpdated(_interval);
    }

    /// ---------------------------------------------------------------
    ///                    EMPLOYEE MANAGEMENT
    /// ---------------------------------------------------------------
    /// @notice Adds an employee to the sender's company
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

    /// @notice Updates an employee's details
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

    /// @notice Deactivates an employee
    function deactivateEmployee(uint256 _employeeId) external {
        uint256 _companyId = companyOfOwner[msg.sender];
        require(_companyId != 0, "not company owner");
        Employee storage e = employees[_employeeId];
        require(e.companyId == _companyId, "mismatched company");

        e.active = false;
        emit EmployeeDeactivated(_companyId, _employeeId);
    }

    /// ---------------------------------------------------------------
    ///               INTERNAL: PAYMENT LOGIC
    /// ---------------------------------------------------------------
    /// @notice Internal logic to schedule or execute a payment to an employee
    function _scheduleOrExecutePayment(
        uint256 _companyId,
        uint256 _employeeId,
        Employee storage e
    ) internal {
        address companyOwnerAddr = companies[_companyId].owner;
        require(e.destinationChainSelector >= 0 && e.destinationChainSelector <= 3, "Invalid destinationChainSelector");
        uint256 allowance = usdc.allowance(companyOwnerAddr, address(this));
        if (allowance < e.salary) {
            emit PaymentScheduled(_companyId, _employeeId, e.wallet, 0, e.destinationChainSelector);
            return;
        }

        if (e.destinationChainSelector == 0) {
        //--------------------------------------------
        // Base
        //--------------------------------------------
        bool ok = usdc.transferFrom(companyOwnerAddr, e.wallet, e.salary);
        if (ok) {
            emit PaymentExecuted(_companyId, _employeeId, e.wallet, e.salary);
        } else {
            emit PaymentScheduled(_companyId, _employeeId, e.wallet, 0, e.destinationChainSelector);
            return;
        }

        } else if (e.destinationChainSelector == 1) {
            //--------------------------------------------
            // Base → Arbitrum
            //--------------------------------------------
            emit PaymentScheduled(_companyId, _employeeId, e.wallet, e.salary, e.destinationChainSelector);
            bool ok = usdc.transferFrom(companyOwnerAddr, address(this), e.salary);
            require(ok, "Transfer to escrow failed");
            transferTokensPayLINK(3478487238524512106, e.wallet, address(usdc), e.salary);

        } else if (e.destinationChainSelector == 2) {
            //--------------------------------------------
            // Base → Avalanche
            //--------------------------------------------
            emit PaymentScheduled(_companyId, _employeeId, e.wallet, e.salary, e.destinationChainSelector);
            bool ok = usdc.transferFrom(companyOwnerAddr, address(this), e.salary);
            require(ok, "Transfer to escrow failed");
            transferTokensPayLINK(14767482510784806043, e.wallet, address(usdc), e.salary);

        } else if (e.destinationChainSelector == 3) {
            //--------------------------------------------
            // Base → Ethereum
            //--------------------------------------------
            emit PaymentScheduled(_companyId, _employeeId, e.wallet, e.salary, e.destinationChainSelector);
            bool ok = usdc.transferFrom(companyOwnerAddr, address(this), e.salary);
            require(ok, "Transfer to escrow failed");
            transferTokensPayLINK(16015286601757825753, e.wallet, address(usdc), e.salary);

        } 

        e.nextPayDate = e.nextPayDate + interval;
    }

    /// ---------------------------------------------------------------
    ///                ------ Automation Chainlink ------
    /// ---------------------------------------------------------------
    /// @notice Checks if there are pending payments using Chainlink Automation
    function checkUpkeep(bytes calldata) external override returns (bool upkeepNeeded, bytes memory performData) {
        uint256 cLen = companyIds.length;
        if (cLen == 0) return (false, bytes(""));

        for (uint256 i = 0; i < cLen; i++) {
            uint256 cIdx = (lastCheckedCompanyIndex + i) % cLen;
            uint256 cid = companyIds[cIdx];
            Company storage comp = companies[cid];
            if (!comp.active) continue;

            uint256[] storage eids = comp.employeeIds;
            uint256 eLen = eids.length;
            if (eLen == 0) continue;

            uint256 start = lastCheckedEmployeeIndex % eLen;
            for (uint256 j = 0; j < eLen; j++) {
                uint256 eIdx = (start + j) % eLen;
                uint256 eid = eids[eIdx];
                Employee storage emp = employees[eid];
                if (!emp.active) continue;
                if (block.timestamp >= emp.nextPayDate) {
                    upkeepNeeded = true;
                    performData = abi.encode(cid, eid);
                    // Advance pointers
                    lastCheckedCompanyIndex = (cIdx + 1) % cLen;
                    lastCheckedEmployeeIndex = (eIdx + 1) % eLen;
                    return (upkeepNeeded, performData);
                }
            }
            lastCheckedEmployeeIndex = 0;
        }

        return (false, bytes(""));
    }

    /// @notice Executes payment to the required employee using Chainlink Automation performUpkeep
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

    /// ---------------------------------------------------------------
    ///                 UTILITY / VIEW FUNCTIONS
    /// ---------------------------------------------------------------
    /// @notice Returns the array of company IDs
    function getCompanyIds() external view returns (uint256[] memory) {
        return companyIds;
    }

    /// @notice Gets the IDs of employees of a company
    function getEmployeesOfCompany(uint256 _companyId) external view returns (uint256[] memory) {
        return companies[_companyId].employeeIds;
    }

    /// @notice Transfers contract ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero addr");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Returns the information of an employee by ID
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

    /// @notice The owner can administratively deactivate an employee
    function adminDeactivateEmployee(uint256 _companyId, uint256 _employeeId) external onlyOwner {
        Employee storage e = employees[_employeeId];
        require(e.companyId == _companyId, "mismatched company");
        require(e.active, "already inactive");

        e.active = false;
        emit EmployeeDeactivated(_companyId, _employeeId);
    }

    /// ---------------------------------------------------------------
    ///                ------ CCIP Chainlink ------
    /// ---------------------------------------------------------------

    using SafeERC20 for IERC20;

    // Errors
    error NotEnoughBalance(uint256 currentBalance, uint256 requiredBalance);
    error NothingToWithdraw();
    error FailedToWithdrawEth(address owner, address target, uint256 value);
    error DestinationChainNotAllowlisted(uint64 destinationChainSelector);
    error InvalidReceiverAddress();

    // Events
    event TokensTransferred(
        bytes32 indexed messageId,
        uint64 indexed destinationChainSelector,
        address receiver,
        address token,
        uint256 tokenAmount,
        address feeToken,
        uint256 fees
    );

    // Allowlist for cross-chain
    mapping(uint64 => bool) public allowlistedChains;

    // Chainlink CCIP references
    IRouterClient private s_router;
    IERC20 private s_linkToken;

    // Modifiers for CCIP
    modifier onlyAllowlistedChain(uint64 _destinationChainSelector) {
        if (!allowlistedChains[_destinationChainSelector]) {
            revert DestinationChainNotAllowlisted(_destinationChainSelector);
        }
        _;
    }

    modifier validateReceiver(address _receiver) {
        if (_receiver == address(0)) revert InvalidReceiverAddress();
        _;
    }

    /// @notice Allows the owner to add or remove a destination chain allowed for CCIP
    function allowlistDestinationChain(uint64 _destinationChainSelector, bool allowed) external onlyOwner {
        allowlistedChains[_destinationChainSelector] = allowed;
    }

    /// @notice Performs a cross-chain transfer using LINK as the fee token (internal)
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
        Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(
            _receiver, _token, _amount, address(s_linkToken)
        );

        uint256 fees = s_router.getFee(_destinationChainSelector, evm2AnyMessage);

        uint256 requiredLinkBalance;
        if (_token == address(s_linkToken)) {
            requiredLinkBalance = fees + _amount;
        } else {
            requiredLinkBalance = fees;
        }

        uint256 linkBalance = s_linkToken.balanceOf(address(this));

        if (requiredLinkBalance > linkBalance) {
            revert NotEnoughBalance(linkBalance, requiredLinkBalance);
        }

        s_linkToken.approve(address(s_router), requiredLinkBalance);

        if (_token != address(s_linkToken)) {
            uint256 tokenBalance = IERC20(_token).balanceOf(address(this));
            if (_amount > tokenBalance) {
                revert NotEnoughBalance(tokenBalance, _amount);
            }
            IERC20(_token).approve(address(s_router), _amount);
        }

        messageId = s_router.ccipSend(_destinationChainSelector, evm2AnyMessage);

        emit TokensTransferred(
            messageId,
            _destinationChainSelector,
            _receiver,
            _token,
            _amount,
            address(s_linkToken),
            fees
        );

        return messageId;
    }

    /// @notice Performs a cross-chain transfer paying the fee in native token (onlyOwner)
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
        Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(
            _receiver, _token, _amount, address(0)
        );

        uint256 fees = s_router.getFee(_destinationChainSelector, evm2AnyMessage);

        if (fees > address(this).balance) {
            revert NotEnoughBalance(address(this).balance, fees);
        }

        IERC20(_token).approve(address(s_router), _amount);

        messageId = s_router.ccipSend{value: fees}(_destinationChainSelector, evm2AnyMessage);

        emit TokensTransferred(
            messageId,
            _destinationChainSelector,
            _receiver,
            _token,
            _amount,
            address(0),
            fees
        );

        return messageId;
    }

    /// @notice Builds the CCIP message for cross-chain transfer
    function _buildCCIPMessage(
        address _receiver,
        address _token,
        uint256 _amount,
        address _feeTokenAddress
    ) private pure returns (Client.EVM2AnyMessage memory) {
        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({token: _token, amount: _amount});

        return Client.EVM2AnyMessage({
            receiver: abi.encode(_receiver),
            data: "",
            tokenAmounts: tokenAmounts,
            extraArgs: Client._argsToBytes(
                Client.GenericExtraArgsV2({
                    gasLimit: 0,
                    allowOutOfOrderExecution: true
                })
            ),
            feeToken: _feeTokenAddress
        });
    }

    /// ---------------------------------------------------------------
    ///                      WITHDRAWALS
    /// ---------------------------------------------------------------

    /// @notice Allows the contract to receive Ether
    receive() external payable {}

    /// @notice Allows the owner to withdraw contract Ether balance
    function withdraw(address _beneficiary) public onlyOwner {
        uint256 amount = address(this).balance;

        if (amount == 0) revert NothingToWithdraw();

        (bool sent,) = _beneficiary.call{value: amount}("");

        if (!sent) revert FailedToWithdrawEth(msg.sender, _beneficiary, amount);
    }

    /// @notice Allows the owner to withdraw ERC20 tokens from the contract
    function withdrawToken(address _beneficiary, address _token) public onlyOwner {
        uint256 amount = IERC20(_token).balanceOf(address(this));
        if (amount == 0) revert NothingToWithdraw();
        IERC20(_token).safeTransfer(_beneficiary, amount);
    }
}