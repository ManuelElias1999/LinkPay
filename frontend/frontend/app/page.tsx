"use client";
import { useState, useEffect } from 'react';
import { Building2, LayoutDashboard, Users, Coins, History, Wallet, LogOut } from 'lucide-react';
import { Dashboard } from '../components/Dashboard';
import { CompanyRegistration } from '../components/CompanyRegistration';
import { EmployeeList } from '../components/EmployeeList';
import { PaymentScheduler } from '../components/PaymentScheduler';
import { PaymentHistory } from '../components/PaymentHistory';
import { Button } from '../components/ui/button';
import { Toaster } from '../components/ui/sonner';
import { toast } from 'sonner';
import * as web3 from '../util/interact';
import {PriceFeed} from "@/components/ui/price-feed";

interface Company {
  id: string;
  name: string;
  walletAddress: string;
  registrationDate: string;
}

interface Employee {
  id: string;
  name: string;
  walletAddress: string;
  registrationDate: string;
}

interface Payment {
  id: string;
  companyId: string;
  employeeId?: number;
  employeeName: string;
  employeeWallet: string;
  amount: number;
  scheduledDate: string;
  status: 'pending' | 'completed' | 'scheduled';
  transactionHash?: string;
  network?: string;
  timestamp?: number;
}

type View = 'dashboard' | 'register' | 'employees' | 'schedule' | 'history';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [walletConnected, setWalletConnected] = useState(false);
  const [account, setAccount] = useState('');
  const [companyId, setCompanyId] = useState<number>(0);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [usdcBalance, setUsdcBalance] = useState<string>('0');

  // Connect wallet on mount
  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  // Load company data when wallet connects
  useEffect(() => {
    if (walletConnected && account) {
      loadCompanyData();
    }
  }, [walletConnected, account]);

  // Load employees when companyId changes
  useEffect(() => {
    if (companyId > 0) {
      loadEmployees();
    }
  }, [companyId]);

  useEffect(() => {
    if (walletConnected && currentView === 'history') {
      loadPaymentHistory();
    }
  }, [currentView, walletConnected, companyId]);

  useEffect(() => {
    if (walletConnected && currentView === 'dashboard') {
      loadDashboardData();
    }
  }, [currentView, walletConnected, companyId]);

  async function checkIfWalletIsConnected() {
    if (typeof window !== 'undefined' && window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        await handleConnectWallet();
      }
    }
  }

  async function handleConnectWallet() {
    try {
      const walletState = await web3.connectWallet();
      setAccount(walletState.account);
      setWalletConnected(true);
      toast.success(`Connected: ${walletState.account.substring(0, 6)}...${walletState.account.substring(38)}`);
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      toast.error(error.message || 'Failed to connect wallet');
    }
  }

  function handleDisconnectWallet() {
    // Set wallet as disconnected FIRST to prevent race conditions
    setWalletConnected(false);
    setAccount('');
    setCompanyId(0);
    setCompanies([]);
    setEmployees([]);
    setPayments([]);
    setUsdcBalance('0');
    setCurrentView('dashboard');

    // Then disconnect the web3 provider
    web3.disconnectWallet();

    toast.success('Wallet disconnected');
  }

  async function loadCompanyData() {
    try {
      // Get the current user's company ID
      const cid = await web3.getCompanyOfOwner(account);
      setCompanyId(cid);

      // Load all companies for the selector
      const allCompanies = await web3.getAllCompanies();
      setCompanies(allCompanies.map((company: any) => ({
        id: company.companyId.toString(),
        name: company.name,
        walletAddress: company.owner,
        registrationDate: new Date(company.registrationDate * 1000).toISOString().split('T')[0]
      })));
    } catch (error) {
      console.error("Error loading company data:", error);
    }
  }

  async function loadEmployees() {
    try {
      if (companyId === 0) return;

      const emps = await web3.getEmployeesOfCompany(companyId);

      // Load payment history to check if employees have been paid
      const paymentEvents = await web3.getPaymentHistory(companyId);

      // Helper function to get network name from chain selector
      const getNetworkName = (selector: number): string => {
        const networks: Record<number, string> = {
          0: 'Base',
          1: 'Arbitrum',
          2: 'Avalanche',
          3: 'Eth Sepolia'
        };
        return networks[selector] || 'Unknown';
      };

      // Helper function to determine payment status based on payment history
      const getPaymentStatus = (employeeId: number, employeeName: string): 'Paid' | 'Pending' => {
        // Check if this employee has any scheduled/completed payments
        const employeePayments = paymentEvents.filter(
          (payment) => payment.employeeId === employeeId
        );

        // Status 'scheduled' means the payment has been processed/completed
        const completedPayments = employeePayments.filter(p => p.status === 'scheduled');

        console.log(`Employee ${employeeName} (ID: ${employeeId}):`, {
          totalPayments: employeePayments.length,
          scheduledPayments: completedPayments.length,
          allPaymentStatuses: employeePayments.map(p => ({ id: p.employeeId, status: p.status }))
        });

        return completedPayments.length > 0 ? 'Paid' : 'Pending';
      };

      console.log('All payment events:', paymentEvents.map(p => ({
        employeeId: p.employeeId,
        employeeName: p.employeeName,
        status: p.status
      })));

      console.log('All employees:', emps.map(e => ({
        employeeId: e.employeeId,
        name: e.name
      })));

      setEmployees(emps.map((emp: any) => {
        // Ensure numeric values are properly converted
        const chainSelector = typeof emp.destinationChainSelector === 'number'
          ? emp.destinationChainSelector
          : Number(emp.destinationChainSelector);

        return {
          id: emp.employeeId.toString(),
          name: emp.name,
          walletAddress: emp.wallet,
          registrationDate: new Date(emp.nextPayDate * 1000).toISOString().split('T')[0],
          network: getNetworkName(chainSelector),
          chainSelector: chainSelector,
          paymentStatus: getPaymentStatus(emp.employeeId, emp.name),
          nextPayDate: emp.nextPayDate,
          salary: emp.salary
        };
      }));
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  }

  async function loadPaymentHistory() {
    if (!walletConnected) return; // Don't load if wallet is disconnected

    try {
      // Load payment history for the current user's company
      // Pass companyId if you want to filter, or undefined for all payments
      const paymentEvents = await web3.getPaymentHistory(companyId > 0 ? companyId : undefined);

      setPayments(paymentEvents.map((event) => ({
        id: event.id,
        companyId: event.companyId.toString(),
        employeeId: event.employeeId,
        employeeName: event.employeeName,
        employeeWallet: event.employeeWallet,
        amount: parseFloat(event.amount),
        scheduledDate: new Date(event.timestamp * 1000).toISOString().split('T')[0],
        status: event.status,
        transactionHash: event.transactionHash,
        network: event.network,
        timestamp: event.timestamp
      })));
    } catch (error: any) {
      // Silently ignore "Contract not initialized" errors when disconnecting
      if (!error?.message?.includes('Contract not initialized')) {
        console.error("Error loading payment history:", error);
      }
    }
  }

  async function loadDashboardData() {
    if (!walletConnected) return; // Don't load if wallet is disconnected

    try {
      // Load USDC balance
      const balance = await web3.getUSDCBalance();
      setUsdcBalance(balance);

      // Load payment history for dashboard stats
      await loadPaymentHistory();
    } catch (error: any) {
      // Silently ignore "Contract not initialized" errors when disconnecting
      if (!error?.message?.includes('Contract not initialized')) {
        console.error("Error loading dashboard data:", error);
      }
    }
  }

  const handleRegisterCompany = async (companyData: Omit<Company, 'id' | 'registrationDate'>) => {
    try {
      if (!walletConnected) {
        toast.error('Please connect your wallet first');
        return;
      }

      // Step 1: Get registration fee and check balance
      const fee = await web3.getRegistrationFee();
      const balance = await web3.getUSDCBalance();

      toast.info(`Registration fee: ${fee} USDC | Your balance: ${balance} USDC`);

      // Check if user has enough USDC
      if (parseFloat(balance) < parseFloat(fee)) {
        toast.error(`Insufficient USDC balance. You need ${fee} USDC but only have ${balance} USDC`);
        return;
      }

      // Step 2: Approve USDC with large allowance for future payments and WAIT for confirmation
      toast.info('Approving USDC for registration fee and future payments... Please confirm the transaction in MetaMask');
      const largeAllowance = "1000000000000000000000000"; // 1e24 wei = 1 million USDC (with 18 decimals)
      const approvalReceipt = await web3.approveUSDC(largeAllowance);
      toast.success(`USDC approved with large allowance! Transaction: ${approvalReceipt.transactionHash.substring(0, 10)}...`);

      // Step 3: Register company (now that approval is confirmed)
      toast.info('Registering company... Please confirm the transaction in MetaMask');
      const registerReceipt = await web3.registerCompany(companyData.name);
      toast.success(`Company registered! Transaction: ${registerReceipt.transactionHash.substring(0, 10)}...`);

      // Reload company data and navigate to schedule (add employee) view
      await loadCompanyData();
      await loadEmployees();
      setCurrentView('schedule');
      toast.success('Company registered! You can now add employees.');
    } catch (error: any) {
      console.error("Error registering company:", error);

      // Better error messages
      if (error.message.includes('user rejected')) {
        toast.error('Transaction rejected by user');
      } else if (error.message.includes('insufficient funds')) {
        toast.error('Insufficient funds for gas fees');
      } else {
        toast.error(error.message || 'Failed to register company');
      }
    }
  };

  const handleDeleteCompany = (id: string) => {
    const companyPayments = payments.filter(p => p.companyId === id);
    if (companyPayments.length > 0) {
      toast.error('Cannot delete company with scheduled payments');
      return;
    }
    setCompanies(companies.filter(c => c.id !== id));
    toast.success('Company deleted successfully');
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(employees.filter(e => e.id !== id));
    toast.success('Employee deleted successfully');
  };

  const handleUpdateEmployee = async (id: string, data: Omit<Employee, 'id' | 'registrationDate'>) => {
    try {
      if (!walletConnected || companyId === 0) {
        toast.error('Please connect wallet and register company first');
        return;
      }

      // Get current employee data
      const employee = await web3.getEmployee(parseInt(id));

      toast.info('Updating employee... Please confirm the transaction in MetaMask');

      // Update employee on smart contract and wait for confirmation
      const receipt = await web3.updateEmployee(
        parseInt(id),
        data.name,
        data.walletAddress,
        employee.destinationChainSelector,
        employee.receiverContract,
        employee.salary,
        employee.nextPayDate,
        true
      );

      toast.success(`Employee updated! Transaction: ${receipt.transactionHash.substring(0, 10)}...`);
      await loadEmployees();
    } catch (error: any) {
      console.error("Error updating employee:", error);

      // Better error messages
      if (error.message.includes('user rejected')) {
        toast.error('Transaction rejected by user');
      } else if (error.message.includes('insufficient funds')) {
        toast.error('Insufficient funds for gas fees');
      } else {
        toast.error(error.message || 'Failed to update employee');
      }
    }
  };

  const handleSchedulePayment = async (paymentData: any) => {
    try {
      if (!walletConnected || companyId === 0) {
        toast.error('Please connect wallet and register your company first');
        return;
      }

      // Validate that the user is adding to their own company
      if (paymentData.companyId !== companyId) {
        toast.error('You can only add employees to your own company');
        return;
      }

      // Validate inputs
      if (!paymentData.employeeName || !paymentData.employeeWallet || !paymentData.amount) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (paymentData.amount <= 0) {
        toast.error('Salary amount must be greater than 0');
        return;
      }

      // Verify company is active
      try {
        const company = await web3.getCompany(paymentData.companyId);

        console.log('Company verification:', {
          companyId: paymentData.companyId,
          companyOwner: company.owner,
          currentAccount: account,
          companyActive: company.active,
          ownersMatch: company.owner.toLowerCase() === account.toLowerCase()
        });

        if (!company.active) {
          toast.error('Your company is inactive. Please contact support.');
          return;
        }

        // Check if user is the company owner
        if (company.owner.toLowerCase() !== account.toLowerCase()) {
          toast.error(`You are not the owner of this company. Owner: ${company.owner.substring(0, 10)}... Your address: ${account.substring(0, 10)}...`);
          return;
        }
      } catch (err) {
        console.error("Error verifying company:", err);
        toast.error('Failed to verify company ownership');
        return;
      }

      // Map blockchain network to chain selector
      const chainSelectors: Record<string, number> = {
        'base': 0,
        'arbitrum': 1,
        'avalanche': 2,
        'eth-sepolia': 3,
      };

      const chainSelector = chainSelectors[paymentData.blockchainNetwork] || 0;

      // Check USDC balance and allowance
      const balance = await web3.getUSDCBalance();
      const allowance = await web3.getUSDCAllowance();
      const salaryAmount = paymentData.amount.toString();

      console.log('USDC Balance:', balance, 'USDC | Allowance:', allowance, 'USDC | Salary needed:', salaryAmount, 'USDC');

      if (parseFloat(balance) < parseFloat(salaryAmount)) {
        toast.error(`Insufficient USDC balance. You need at least ${salaryAmount} USDC but only have ${balance} USDC`);
        return;
      }

      if (parseFloat(allowance) < parseFloat(salaryAmount)) {
        toast.error(`Insufficient USDC allowance. Please increase your USDC approval for the PayrollManager contract.`);
        return;
      }

      // Add employee (USDC was already approved during company registration with large allowance)
      toast.info('Adding employee... Please confirm the transaction in MetaMask');

      // Add employee using smart contract and wait for confirmation
      const receipt = await web3.addEmployee(
        paymentData.employeeName,
        paymentData.employeeWallet,
        chainSelector,
        salaryAmount
      );

      toast.success(`Employee added! Transaction: ${receipt.transactionHash.substring(0, 10)}...`);

      // Navigate to employees view first
      setCurrentView('employees');

      // Wait a moment for blockchain state to settle, then reload data
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reload all data to refresh the app state
      await Promise.all([
        loadCompanyData(),
        loadEmployees()
      ]);

      toast.success('Employee added successfully!');
    } catch (error: any) {
      console.error("Error scheduling payment:", error);

      // Better error messages
      if (error.message.includes('user rejected')) {
        toast.error('Transaction rejected by user');
      } else if (error.message.includes('insufficient funds')) {
        toast.error('Insufficient funds for gas fees');
      } else if (error.message.includes('company inactive')) {
        toast.error('Company is inactive');
      } else if (error.message.includes('not company owner')) {
        toast.error('You are not the owner of this company');
      } else if (error.message.includes('zero wallet')) {
        toast.error('Invalid wallet address');
      } else if (error.message.includes('salary zero')) {
        toast.error('Salary must be greater than zero');
      } else {
        toast.error(error.message || 'Failed to schedule payment. Check console for details.');
      }
    }
  };

  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'register' as View, label: 'Register Company', icon: Building2 },
    { id: 'employees' as View, label: 'Employees', icon: Users },
    { id: 'schedule' as View, label: 'Schedule Payment', icon: Coins },
    { id: 'history' as View, label: 'Payment History', icon: History },
  ];

  return (
      <div className="min-h-screen bg-gray-50">
        <Toaster />

        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg">
                  <img className="h-25 text-white" src={"logo.png"} />
                </div>
                <div>
                  <h1 className="text-xl">LinkPay</h1>
                  <p className="text-m text-gray-500">Company Payment Management</p>
                </div>
              </div>
              <div>
                {!walletConnected ? (
                  <Button onClick={handleConnectWallet} className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Connect MetaMask
                  </Button>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="text-sm">
                      <p className="font-medium">Connected</p>
                      <p className="text-gray-500">{account.substring(0, 6)}...{account.substring(38)}</p>
                    </div>
                    <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    <Button
                      onClick={handleDisconnectWallet}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>

                )}
                <PriceFeed />
              </div>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-2 overflow-x-auto py-2">
              {navItems.map(({ id, label, icon: Icon }) => (
                  <Button
                      key={id}
                      variant={currentView === id ? 'default' : 'ghost'}
                      onClick={() => setCurrentView(id)}
                      className="flex items-center gap-2 whitespace-nowrap"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {currentView === 'dashboard' && (
              <Dashboard
                companies={companies}
                payments={payments}
                employees={employees}
                currentCompanyId={companyId}
                usdcBalance={usdcBalance}
              />
          )}
          {currentView === 'register' && (
              <CompanyRegistration
                onRegister={handleRegisterCompany}
                walletConnected={walletConnected}
                walletAddress={account}
              />
          )}
          {currentView === 'employees' && (
              <EmployeeList
                  employees={employees}
                  companies={companies}
                  currentCompanyId={companyId}
                  onDelete={handleDeleteEmployee}
                  onUpdate={handleUpdateEmployee}
              />
          )}
          {currentView === 'schedule' && (
              <PaymentScheduler
                companies={companies}
                onSchedule={handleSchedulePayment}
                currentCompanyId={companyId}
              />
          )}
          {currentView === 'history' && (
              <PaymentHistory
                companies={companies}
                payments={payments}
                currentCompanyId={companyId}
              />
          )}
        </main>
      </div>
  );
}
