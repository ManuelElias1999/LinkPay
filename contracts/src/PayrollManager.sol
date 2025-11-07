// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;


/// Minimal ERC20 interface
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
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
        address receiverContract; // contract address on destination chain that will finalize payment
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
    event PaymentScheduled(uint256 indexed companyId, uint256 indexed employeeId, address indexed wallet, uint256 amount, uint64 destChain, address receiver);
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

    constructor(address _usdc, address _feewallet, uint256 _registrationFee) {
        require(_usdc != address(0), "zero usdc");
        usdc = IERC20(_usdc);
        owner = msg.sender;
        registrationFee = _registrationFee;
        interval = 5 minutes; // default to 5 minutes for testing (modifiable by owner)
        feeWallet = _feewallet;
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
        address _receiverContract,
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
        e.receiverContract = _receiverContract;
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
        address _receiverContract,
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
        e.receiverContract = _receiverContract;
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
            emit PaymentScheduled(_companyId, _employeeId, e.wallet, 0, e.destinationChainSelector, e.receiverContract);
            return;
        }

        // If destinationChainSelector == 0 -> assume same chain (Base) and transfer directly to wallet
        if (e.destinationChainSelector == 0) {
            bool ok = usdc.transferFrom(companyOwnerAddr, e.wallet, e.salary);
            if (ok) {
                emit PaymentExecuted(_companyId, _employeeId, e.wallet, e.salary);
            } else {
                emit PaymentScheduled(_companyId, _employeeId, e.wallet, 0, e.destinationChainSelector, e.receiverContract);
                return;
            }
        } else {
            // Cross-chain: We emit an event with payment intent.
            // Integrate actual CCIP send in sendCrossChain() later (call CCIP Router).
            // For now, emit event which can be used by off-chain relayer or integrated CCIP logic.
            emit PaymentScheduled(_companyId, _employeeId, e.wallet, e.salary, e.destinationChainSelector, e.receiverContract);

            // Pull the tokens from the company into the contract for later CCIP-send (escrow)
            bool ok = usdc.transferFrom(companyOwnerAddr, address(this), e.salary);
            require(ok, "transferFrom to escrow failed");
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
    // function sendCrossChain(uint64 destinationChainSelector, address receiverContract, address token, uint256 amount, bytes memory data) internal {
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
        address receiverContract,
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
            e.receiverContract,
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
}