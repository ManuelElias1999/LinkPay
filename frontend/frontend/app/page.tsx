import { useState } from 'react';
import { Building2, LayoutDashboard, Users, DollarSign, History } from 'lucide-react';
import { Dashboard } from '../components/Dashboard';
import { CompanyRegistration } from '../components/CompanyRegistration';
import { CompanyList } from '../components/CompanyList';
import { PaymentScheduler } from '../components/PaymentScheduler';
import { PaymentHistory } from '../components/PaymentHistory';
import { Button } from '../components/ui/button';
import { Toaster } from '../components/ui/sonner';
import { toast } from 'sonner@2.0.3';

interface Company {
  id: string;
  name: string;
  walletAddress: string;
  walletType: string;
  registrationDate: string;
}

interface Payment {
  id: string;
  companyId: string;
  employeeName: string;
  employeeWallet: string;
  amount: number;
  scheduledDate: string;
  status: 'pending' | 'completed' | 'scheduled';
}

type View = 'dashboard' | 'register' | 'companies' | 'schedule' | 'history';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [companies, setCompanies] = useState<Company[]>([
    {
      id: '1',
      name: 'Tech Solutions Inc',
      walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      walletType: 'ethereum',
      registrationDate: '2025-10-15',
    },
    {
      id: '2',
      name: 'Digital Marketing Co',
      walletAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      walletType: 'bitcoin',
      registrationDate: '2025-10-20',
    },
  ]);

  const [payments, setPayments] = useState<Payment[]>([
    {
      id: '1',
      companyId: '1',
      employeeName: 'John Doe',
      employeeWallet: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
      amount: 5000,
      scheduledDate: '2025-11-15',
      status: 'scheduled',
    },
    {
      id: '2',
      companyId: '1',
      employeeName: 'Jane Smith',
      employeeWallet: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
      amount: 4500,
      scheduledDate: '2025-11-15',
      status: 'scheduled',
    },
    {
      id: '3',
      companyId: '2',
      employeeName: 'Mike Johnson',
      employeeWallet: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      amount: 6000,
      scheduledDate: '2025-11-10',
      status: 'completed',
    },
  ]);

  const handleRegisterCompany = (companyData: Omit<Company, 'id' | 'registrationDate'>) => {
    const newCompany: Company = {
      ...companyData,
      id: Date.now().toString(),
      registrationDate: new Date().toISOString().split('T')[0],
    };
    setCompanies([...companies, newCompany]);
    toast.success('Company registered successfully!');
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

  const handleSchedulePayment = (paymentData: Omit<Payment, 'id' | 'status'>) => {
    const newPayment: Payment = {
      ...paymentData,
      id: Date.now().toString(),
      status: 'scheduled',
    };
    setPayments([...payments, newPayment]);
    toast.success('Payment scheduled successfully!');
  };

  const navItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'register' as View, label: 'Register Company', icon: Building2 },
    { id: 'companies' as View, label: 'Companies', icon: Users },
    { id: 'schedule' as View, label: 'Schedule Payment', icon: DollarSign },
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
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl">PayFlow</h1>
                  <p className="text-sm text-gray-500">Company Payment Management</p>
                </div>
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
              <Dashboard companies={companies} payments={payments} />
          )}
          {currentView === 'register' && (
              <CompanyRegistration onRegister={handleRegisterCompany} />
          )}
          {currentView === 'companies' && (
              <CompanyList companies={companies} onDelete={handleDeleteCompany} />
          )}
          {currentView === 'schedule' && (
              <PaymentScheduler companies={companies} onSchedule={handleSchedulePayment} />
          )}
          {currentView === 'history' && (
              <PaymentHistory companies={companies} payments={payments} />
          )}
        </main>
      </div>
  );
}
