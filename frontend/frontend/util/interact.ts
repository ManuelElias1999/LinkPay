import { ethers } from 'ethers';

// PayrollManager Contract Address - UPDATE THIS WITH YOUR DEPLOYED CONTRACT ADDRESS
export const PAYROLL_CONTRACT_ADDRESS = "0xF5253017fdBD741A74685696a95AA0B2cE8B53c8"; // TODO: Update with deployed address

// MockUSDC Contract Address - UPDATE THIS WITH YOUR DEPLOYED USDC ADDRESS
export const USDC_CONTRACT_ADDRESS = "0xD1d79eBa5F31F8aFBc82dB38Cc2789F973e861C2"; // TODO: Update with deployed address

// PayrollManager ABI
export const PAYROLL_ABI = [{"inputs":[{"internalType":"address","name":"_usdc","type":"address"},{"internalType":"address","name":"_feewallet","type":"address"},{"internalType":"uint256","name":"_registrationFee","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"companyId","type":"uint256"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"string","name":"name","type":"string"}],"name":"CompanyRegistered","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"companyId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"employeeId","type":"uint256"},{"indexed":false,"internalType":"string","name":"name","type":"string"},{"indexed":false,"internalType":"address","name":"wallet","type":"address"},{"indexed":false,"internalType":"uint256","name":"salary","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"nextPayDate","type":"uint256"}],"name":"EmployeeAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"companyId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"employeeId","type":"uint256"}],"name":"EmployeeDeactivated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"companyId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"employeeId","type":"uint256"}],"name":"EmployeeUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newInterval","type":"uint256"}],"name":"IntervalUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"companyId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"employeeId","type":"uint256"},{"indexed":true,"internalType":"address","name":"wallet","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"PaymentExecuted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"companyId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"employeeId","type":"uint256"},{"indexed":true,"internalType":"address","name":"wallet","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint64","name":"destChain","type":"uint64"},{"indexed":false,"internalType":"address","name":"receiver","type":"address"}],"name":"PaymentScheduled","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"newFee","type":"uint256"}],"name":"RegistrationFeeUpdated","type":"event"},{"inputs":[{"internalType":"uint256","name":"_companyId","type":"uint256"}],"name":"activateCompany","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_name","type":"string"},{"internalType":"address","name":"_wallet","type":"address"},{"internalType":"uint64","name":"_destinationChainSelector","type":"uint64"},{"internalType":"address","name":"_receiverContract","type":"address"},{"internalType":"uint256","name":"_salary","type":"uint256"}],"name":"addEmployee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_companyId","type":"uint256"},{"internalType":"uint256","name":"_employeeId","type":"uint256"}],"name":"adminDeactivateEmployee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes","name":"","type":"bytes"}],"name":"checkUpkeep","outputs":[{"internalType":"bool","name":"upkeepNeeded","type":"bool"},{"internalType":"bytes","name":"performData","type":"bytes"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"companies","outputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"string","name":"name","type":"string"},{"internalType":"bool","name":"active","type":"bool"},{"internalType":"uint256","name":"registrationDate","type":"uint256"},{"internalType":"uint256","name":"companyId","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"companyIds","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"companyOfOwner","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_companyId","type":"uint256"}],"name":"deactivateCompany","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_employeeId","type":"uint256"}],"name":"deactivateEmployee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"employees","outputs":[{"internalType":"uint256","name":"companyId","type":"uint256"},{"internalType":"string","name":"name","type":"string"},{"internalType":"address","name":"wallet","type":"address"},{"internalType":"uint64","name":"destinationChainSelector","type":"uint64"},{"internalType":"address","name":"receiverContract","type":"address"},{"internalType":"uint256","name":"salary","type":"uint256"},{"internalType":"uint256","name":"nextPayDate","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"},{"internalType":"uint256","name":"employeeId","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"feeWallet","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getCompanyIds","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_employeeId","type":"uint256"}],"name":"getEmployee","outputs":[{"internalType":"uint256","name":"companyId","type":"uint256"},{"internalType":"string","name":"name","type":"string"},{"internalType":"address","name":"wallet","type":"address"},{"internalType":"uint64","name":"destinationChainSelector","type":"uint64"},{"internalType":"address","name":"receiverContract","type":"address"},{"internalType":"uint256","name":"salary","type":"uint256"},{"internalType":"uint256","name":"nextPayDate","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"},{"internalType":"uint256","name":"employeeId","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_companyId","type":"uint256"}],"name":"getEmployeesOfCompany","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"interval","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lastCheckedCompanyIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lastCheckedEmployeeIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"nextCompanyId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"nextEmployeeId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes","name":"performData","type":"bytes"}],"name":"performUpkeep","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_name","type":"string"}],"name":"registerCompany","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"registrationFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_interval","type":"uint256"}],"name":"setInterval","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_fee","type":"uint256"}],"name":"setRegistrationFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_employeeId","type":"uint256"},{"internalType":"string","name":"_name","type":"string"},{"internalType":"address","name":"_wallet","type":"address"},{"internalType":"uint64","name":"_destinationChainSelector","type":"uint64"},{"internalType":"address","name":"_receiverContract","type":"address"},{"internalType":"uint256","name":"_salary","type":"uint256"},{"internalType":"uint256","name":"_nextPayDate","type":"uint256"},{"internalType":"bool","name":"_active","type":"bool"}],"name":"updateEmployee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"usdc","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"}];

// ERC20 ABI (for USDC approval)
export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

// Global variables
let provider: ethers.providers.Web3Provider | null = null;
let signer: ethers.Signer | null = null;
let account: string = "";
let payrollContract: ethers.Contract | null = null;
let usdcContract: ethers.Contract | null = null;

// Chain ID for Base Sepolia testnet (84532) - Change if using different network
const CHAIN_ID = "0x14a34"; // 84532 in hex

export interface WalletState {
  account: string;
  connected: boolean;
  chainId: string;
}

// Connect MetaMask wallet
export async function connectWallet(): Promise<WalletState> {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error("Please install MetaMask.");
    }

    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    account = accounts[0];

    // Setup provider and signer
    provider = new ethers.providers.Web3Provider(window.ethereum);

    // Switch to correct chain (Base Sepolia)
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_ID }],
      });
    } catch (switchError: any) {
      // Chain not added, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: CHAIN_ID,
            chainName: 'Base Sepolia',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: ['https://sepolia.base.org'],
            blockExplorerUrls: ['https://sepolia-explorer.base.org']
          }],
        });
      }
    }

    signer = provider.getSigner();

    // Initialize contracts
    payrollContract = new ethers.Contract(PAYROLL_CONTRACT_ADDRESS, PAYROLL_ABI, signer);
    usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, ERC20_ABI, signer);

    // Setup event listeners
    setupEventListeners();

    return {
      account,
      connected: true,
      chainId: CHAIN_ID
    };
  } catch (error) {
    console.error("Error connecting wallet:", error);
    throw error;
  }
}

// Setup MetaMask event listeners
function setupEventListeners() {
  if (!window.ethereum) return;

  window.ethereum.on('accountsChanged', (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      account = accounts[0];
      window.location.reload();
    }
  });

  window.ethereum.on('chainChanged', (_chainId: string) => {
    window.location.reload();
  });
}

// Disconnect wallet
export function disconnectWallet() {
  account = "";
  provider = null;
  signer = null;
  payrollContract = null;
  usdcContract = null;
}

// Get current account
export function getCurrentAccount(): string {
  return account;
}

// Get user balance
export async function getBalance(): Promise<string> {
  if (!provider || !account) throw new Error("Wallet not connected");

  const balanceWei = await provider.getBalance(account);
  return ethers.utils.formatEther(balanceWei);
}

// ============ COMPANY FUNCTIONS ============

export async function getRegistrationFee(): Promise<string> {
  if (!payrollContract) throw new Error("Contract not initialized");

  const fee = await payrollContract.registrationFee();
  return ethers.utils.formatUnits(fee, 6); // USDC has 6 decimals
}

export async function getUSDCBalance(): Promise<string> {
  if (!usdcContract || !account) throw new Error("Contract not initialized");

  const balance = await usdcContract.balanceOf(account);
  return ethers.utils.formatUnits(balance, 6); // USDC has 6 decimals
}

export async function getUSDCAllowance(): Promise<string> {
  if (!usdcContract || !account) throw new Error("Contract not initialized");

  const allowance = await usdcContract.allowance(account, PAYROLL_CONTRACT_ADDRESS);
  return ethers.utils.formatUnits(allowance, 6); // USDC has 6 decimals
}

export async function approveUSDC(amount: string): Promise<ethers.providers.TransactionReceipt> {
  if (!usdcContract || !account) throw new Error("Contract not initialized");

  const amountWei = ethers.utils.parseUnits(amount, 6); // USDC has 6 decimals
  const tx = await usdcContract.approve(PAYROLL_CONTRACT_ADDRESS, amountWei);
  return await tx.wait();
}

export async function registerCompany(name: string): Promise<ethers.providers.TransactionReceipt> {
  if (!payrollContract) throw new Error("Contract not initialized");

  const tx = await payrollContract.registerCompany(name);
  return await tx.wait();
}

export async function getCompanyOfOwner(ownerAddress: string): Promise<number> {
  if (!payrollContract) throw new Error("Contract not initialized");

  const companyId = await payrollContract.companyOfOwner(ownerAddress);
  return companyId.toNumber();
}

export async function getCompany(companyId: number): Promise<any> {
  if (!payrollContract) throw new Error("Contract not initialized");

  const company = await payrollContract.companies(companyId);
  return {
    owner: company.owner,
    name: company.name,
    active: company.active,
    registrationDate: company.registrationDate.toNumber(),
    companyId: company.companyId.toNumber()
  };
}

export async function getAllCompanies(): Promise<any[]> {
  if (!payrollContract) throw new Error("Contract not initialized");

  const companyIds = await payrollContract.getCompanyIds();
  const companies = [];

  for (const id of companyIds) {
    const company = await getCompany(id.toNumber());
    companies.push(company);
  }

  return companies;
}

// ============ EMPLOYEE FUNCTIONS ============

export async function addEmployee(
  name: string,
  wallet: string,
  destinationChainSelector: number,
  receiverContract: string,
  salary: string
): Promise<ethers.providers.TransactionReceipt> {
  if (!payrollContract || !account) throw new Error("Contract not initialized");

  const salaryWei = ethers.utils.parseUnits(salary, 6); // USDC has 6 decimals

  console.log('Calling addEmployee with params:', {
    name,
    wallet,
    destinationChainSelector,
    receiverContract,
    salary,
    salaryWei: salaryWei.toString()
  });

  const tx = await payrollContract.addEmployee(
    name,
    wallet,
    destinationChainSelector,
    receiverContract,
    salaryWei
  );
  return await tx.wait();
}

export async function updateEmployee(
  employeeId: number,
  name: string,
  wallet: string,
  destinationChainSelector: number,
  receiverContract: string,
  salary: string,
  nextPayDate: number,
  active: boolean
): Promise<ethers.providers.TransactionReceipt> {
  if (!payrollContract) throw new Error("Contract not initialized");

  const salaryWei = ethers.utils.parseUnits(salary, 6); // USDC has 6 decimals

  const tx = await payrollContract.updateEmployee(
    employeeId,
    name,
    wallet,
    destinationChainSelector,
    receiverContract,
    salaryWei,
    nextPayDate,
    active
  );
  return await tx.wait();
}

export async function getEmployee(employeeId: number): Promise<any> {
  if (!payrollContract) throw new Error("Contract not initialized");

  const employee = await payrollContract.getEmployee(employeeId);
  return {
    companyId: employee[0].toNumber(),
    name: employee[1],
    wallet: employee[2],
    destinationChainSelector: employee[3],
    receiverContract: employee[4],
    salary: ethers.utils.formatUnits(employee[5], 6),
    nextPayDate: employee[6].toNumber(),
    active: employee[7],
    employeeId: employee[8].toNumber()
  };
}

export async function getEmployeesOfCompany(companyId: number): Promise<any[]> {
  if (!payrollContract) throw new Error("Contract not initialized");

  const employeeIds = await payrollContract.getEmployeesOfCompany(companyId);
  const employees = [];

  for (const id of employeeIds) {
    const employee = await getEmployee(id.toNumber());
    employees.push(employee);
  }

  return employees;
}

export async function deactivateEmployee(employeeId: number): Promise<ethers.providers.TransactionReceipt> {
  if (!payrollContract) throw new Error("Contract not initialized");

  const tx = await payrollContract.deactivateEmployee(employeeId);
  return await tx.wait();
}

// Type definitions for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
