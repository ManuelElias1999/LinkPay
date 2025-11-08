# LinkPay – Automated Cross-Chain Payroll System

**dApp:** [https://linkpay-seven.vercel.app/](https://linkpay-seven.vercel.app/)

**Smart Contract (Base Sepolia):** [0x291AB221FB0E8C8EEE246E9476Bb2E892D82DcaB](https://sepolia.basescan.org/address/0x291AB221FB0E8C8EEE246E9476Bb2E892D82DcaB#code)

**GitHub Repository:** [https://github.com/ManuelElias1999/LinkPay](https://github.com/ManuelElias1999/LinkPay)

**Slides / Presentation:** [https://gamma.app/docs/LinkPay-Secure-Payments-on-the-Blockchain-8ofb4o7ffjy3wmr?mode=doc](https://gamma.app/docs/LinkPay-Secure-Payments-on-the-Blockchain-8ofb4o7ffjy3wmr?mode=doc)

---

## 🌐 Project Overview

**LinkPay** is a decentralized, automated payroll platform that enables companies to pay employees in **USDC** across multiple blockchain networks, using **Chainlink services** for automation and cross-chain interoperability.

Traditional payroll systems are often **slow, expensive, and require manual processing**. LinkPay solves this by combining **Chainlink Automation** and **Chainlink CCIP** to create a **borderless, transparent, and self-operating payroll solution**.

### LinkPay platform
![LinkPay platform](./images/platform.jpeg)
---

## ⚙️ How It Works

1. **Company Registration:**

   * A company pays **0.01 CCIP-BnM** to be registered.
   * After registration, it can add employees with their **salary** and **destination chain**.
   * This registration fee generates revenue for LinkPay.

2. **Automated Payroll Execution:**

   * **Chainlink Automation** periodically calls the `performUpkeep` function to execute payroll payments automatically.

3. **Cross-Chain Payments:**

   * **Chainlink CCIP** transfers USDC across different blockchains directly to each employee’s wallet.

4. **On-Chain State Updates:**

   * Each transaction updates the state on-chain — transferring funds, updating balances, and recording completed payments.

**Important for Testing:**
For tests, the **CCIP-BnM token** can be routed through Chainlink and bridged across different testnet chains. Fund your wallet with test tokens from:
[https://docs.chain.link/ccip/test-tokens#evm-chains](https://docs.chain.link/ccip/test-tokens#evm-chains)

**Note:** On mainnet, **CCIP-BnM** is replaced with **USDC** for actual payments.

### Flow Diagram
![Flow Diagram](./images/diagrama.jpeg)

---

## 🚀 Key Features

* **Company Management:** Register, update, and manage companies
* **Employee Management:** Add employees with wallet, salary, and destination blockchain
* **Automated Payments:** Scheduled salary payments using Chainlink Automation
* **Cross-Chain Interoperability:** Secure transfers via Chainlink CCIP
* **Real-Time Price Feeds:** Track token values with Chainlink oracles
* **Payment History:** Transparent record of all payroll transactions
* **Wallet Integration:** MetaMask connection with network auto-switch

---

## 🛠️ Tech Stack

* **Smart Contracts:** Solidity
* **Frontend:** Next.js 16 + React 19, TypeScript, Tailwind CSS 4
* **Blockchain Interaction:** Ethers.js v5
* **UI & Components:** Radix UI, Lucide React, React Hook Form, Sonner, Recharts
* **Oracles & Automation:** Chainlink Automation, Chainlink CCIP, Chainlink Price Feeds

---

## 📂 Project Structure

```
LinkPay/
├── contracts/        # Smart contracts
├── frontend/         # React/Next.js frontend
│   ├── components/   # React components
│   ├── util/         # Contract interaction helpers
│   ├── styles/       # Tailwind and global styles
│   └── app/          # Main Next.js app
├── scripts/          # Deployment and testing scripts
└── README.md         # This general README
```

---

## 💡 Usage Guide

### Company Registration

1. Connect MetaMask wallet
2. Pay **0.01 CCIP-BnM** for registration
3. Add employees (name, wallet, destination chain, salary)

### Automated Payments

* Chainlink Automation triggers payroll automatically
* Cross-chain salaries sent via Chainlink CCIP

### Payment History

* Track all completed and scheduled payments
* Transparent on-chain record with transaction hashes

---

## 🌐 Supported Networks

| Selector | Network          |
| -------- | ---------------- |
| 0        | Base             |
| 1        | Arbitrum         |
| 2        | Avalanche        |
| 3        | Ethereum Sepolia |

---

## 🎁 Sponsors / Integrations

| Sponsor   | Service / Feature                                                           | File / Line Reference                                  |
| --------- | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| Chainlink | Automation – triggers scheduled payments                                    | `/contracts/LinkPay.sol` – Lines 336 & 387             |
| Chainlink | CCIP (Cross-Chain Interoperability Protocol) – secure cross-chain transfers | `/contracts/LinkPay.sol` – Lines 443–610               |
| Chainlink | Price Feeds – Real-time token conversion rates                              | `frontend/components/ui/price-feed.tsx` – Lines 60–196 |

---

## 📄 License

This project is part of the LinkPay system. See main repository for license details.

---

## 📧 Support

Open an issue in the GitHub repository or contact the development team for assistance.

---

**Built with ❤️ for decentralized, cross-chain payroll management.**

## 🖼️ Screenshots

### Chainlink Automation
![Chainlink Automation](./images/Automation_LinkPay.png)

### Payment in Base
![Payment in Base](./images/Base.png)

### Payment in Arbitrum
![Payment in Arbitrum](./images/CCIP_Arbitrum.png)

### Payment in Avalanche
![Payment in Avalanche](./images/CCIP_Avalanche.png)

### Payment in Ethereum
![Payment in Ethereum](./images/CCIP_Ethereum.png)
