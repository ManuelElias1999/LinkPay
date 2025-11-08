# LinkPay Automation Payments in multichains

### Verified Contract on Base Sepolia

**Address:** [0x297599530b23464BD1920093Eb1aaB970b4c6B37 - routescan](https://testnet.routescan.io/address/0x297599530b23464BD1920093Eb1aaB970b4c6B37/contract/84532/code)
**Address:** [0x297599530b23464BD1920093Eb1aaB970b4c6B37 - sourcify](https://repo.sourcify.dev/84532/0x297599530b23464BD1920093Eb1aaB970b4c6B37)
**Address:** [0x297599530b23464BD1920093Eb1aaB970b4c6B37 - blockscout](https://base-sepolia.blockscout.com/address/0x297599530b23464BD1920093Eb1aaB970b4c6B37?tab=contract)


---

## Overview

**PayrollManager_CCIP** is a smart contract that enables automated payroll payments both within the same network (Base) and across different blockchains using **Chainlink Automation** and **Chainlink CCIP**.

With this system, companies can register employees, assign salaries, and automate payments on a recurring schedule. If the employee’s salary is meant to be sent to another blockchain, the system automatically executes a **cross-chain transfer** using **CCIP (Cross-Chain Interoperability Protocol)**.

---

## Technologies Used

* **Solidity** – Smart contract language
* **Chainlink Automation** – To schedule and execute automatic payments
* **Chainlink CCIP** – For secure cross-chain transfers
* **USDC (ERC20)** – Stablecoin used for salary payments
* **Base (Sepolia)** – Main deployment network
* **Arbitrum / Avalanche / Ethereum** – Destination networks for cross-chain payments

---

## Features

### Employer Management

* Register companies with their wallet and metadata.
* Update or deactivate companies (only the contract owner).

### Employee Management

* Register employees under a company.
* Assign wallet addresses, salaries, and destination blockchains.
* Update or deactivate employees.

### Automated & Cross-Chain Payments

* If `destinationChainSelector == 0`, the payment is made **locally on Base**.
* If the value is `1`, `2`, or `3`, a **cross-chain transfer** via **CCIP** is executed to:

  * `1`: Arbitrum
  * `2`: Avalanche
  * `3`: Ethereum
* Every payment is recorded through events for transparency and auditability.

---

## System Flow

1. **Company registration:**
   The contract owner registers a company and its employees, setting salary amounts and destination networks.

2. **Chainlink Automation:**
   The contract integrates with **Chainlink Automation**, which periodically checks if any scheduled payments are due.
   When a payment is due, it calls the `_scheduleOrExecutePayment()` function.

3. **Base Network Payment (Local):**
   If `destinationChainSelector == 0`, the contract directly transfers USDC from the company to the employee wallet on Base.

4. **Cross-Chain Payment (CCIP):**
   If the destination is another blockchain (`1`, `2`, or `3`), the contract:

   * Transfers the salary amount from the company to itself.
   * Calls `transferTokensPayLINK()` to send funds through **Chainlink CCIP**.
   * The CCIP message is received on the destination chain, and the employee receives the salary in USDC.

---

## Live References

### Chainlink Automation (Base)

* [Automation Job #80472880954508613833832536401671085047210258528964702769061970811236434835138](https://automation.chain.link/base-sepolia/80472880954508613833832536401671085047210258528964702769061970811236434835138)
* [Automation Screenshot](https://drive.google.com/file/d/1lA4mO37een5xVjdswokDiVvWpaJdKLPx/view?usp=sharing)

---

### Base Payment Example

* [Transaction Example on Base](https://sepolia.basescan.org/tx/0x7acf7a0d621d36ab7eb90f0c5c302b4f5fde058311be754f43a98ea2341a286b)
* [Transaction Screenshot](https://drive.google.com/file/d/15q1YkE4ytkn-S3KRlmgJnQg_q7OCIeul/view?usp=sharing)

---

### CCIP Transfers

#### Arbitrum

* [CCIP Message](https://ccip.chain.link/#/side-drawer/msg/0x14bd0ea77405ad60f26df9dfa7be7f449f1b6438e07eeee7d7d2362d8875c5e9)
* [Screenshot](https://drive.google.com/file/d/1ESgdmz5idkVLEAzmvKLisNk2zuFQ3T2-/view?usp=sharing)

#### Avalanche

* [CCIP Message](https://ccip.chain.link/#/side-drawer/msg/0x9b6f48867952b3bcfb8af27871231b6aaa9991022a11d5f964ac98cad371f1a2)
* [Screenshot](https://drive.google.com/file/d/1k2fyNtWfbQXEWuxpGOfFdhFtDy1aKViH/view?usp=sharing)

#### Ethereum

* [CCIP Message](https://ccip.chain.link/#/side-drawer/msg/0x13a922a5160b147a64a48282ae02b29f00ec9d0268be19a026c8fa5c9d0c9c12)
* [Screenshot](https://drive.google.com/file/d/1antjEf22Hc1OQ1sISAFu7vHXZ83bElm3/view?usp=sharing)

---

## Events

| Event                                                                               | Description                                       |
| ----------------------------------------------------------------------------------- | ------------------------------------------------- |
| `PaymentScheduled(companyId, employeeId, wallet, salary, destinationChainSelector)` | Triggered when a payment is scheduled             |
| `PaymentExecuted(companyId, employeeId, wallet, salary)`                            | Triggered when a payment is successfully executed |
| `CompanyRegistered(companyId, owner)`                                               | A new company is registered                       |
| `EmployeeAdded(employeeId, companyId, wallet, salary)`                              | A new employee is added                           |
| `EmployeeDeactivated(employeeId, companyId)`                                        | An employee is deactivated                        |

---

## Summary

This project demonstrates how **Chainlink Automation** and **CCIP** can be combined to create an **automated and cross-chain payroll system**.
A company can handle payroll directly on **Base**, while employees can receive their salary **on any supported blockchain**.

### Ideal Use Cases

* Web3 companies with multi-chain teams
* DAO payrolls with distributed contributors
* Automated financial applications requiring cross-chain settlements

**Testing Environment:**

* Base Sepolia testnet
* Chainlink CCIP Testnet endpoints
* Chainlink Automation Registry
