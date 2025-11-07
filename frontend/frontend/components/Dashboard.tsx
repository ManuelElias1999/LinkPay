import { Building2, Wallet, Users, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface DashboardProps {
  companies: Company[];
  payments: Payment[];
  employees?: Employee[];
  currentCompanyId?: number;
  usdcBalance?: string;
}

interface Employee {
  id: string;
  name: string;
  walletAddress: string;
}

interface Company {
  id: string;
  name: string;
  walletAddress: string;
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
  timestamp?: number;
}

export function Dashboard({ companies, payments, employees = [], currentCompanyId = 0, usdcBalance = '0' }: DashboardProps) {
  const totalCompanies = companies.length;
  const totalPayments = payments.length;
  const completedPayments = payments.filter(p => p.status === 'completed').length;
  const totalPaid = payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);

  // Filter employees for current company
  const myEmployees = employees.length;

  const recentPayments = payments.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2>Dashboard</h2>
        <p className="text-gray-500">Overview of your company payment system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">My Employees</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myEmployees}</div>
            <p className="text-xs text-gray-500 mt-1">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">USDC Balance</CardTitle>
            <Wallet className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parseFloat(usdcBalance).toLocaleString()} USDC</div>
            <p className="text-xs text-gray-500 mt-1">Available for payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Payments</CardTitle>
            <Calendar className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedPayments}</div>
            <p className="text-xs text-gray-500 mt-1">Successfully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Paid</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString()} USDC</div>
            <p className="text-xs text-gray-500 mt-1">Lifetime payments</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No payments scheduled yet</p>
          ) : (
            <div className="space-y-4">
              {recentPayments.map((payment) => {
                const company = companies.find(c => c.id === payment.companyId);

                // Format date and time
                const formatDateTime = (timestamp?: number, dateString?: string) => {
                  if (timestamp) {
                    const date = new Date(timestamp * 1000);
                    const dateStr = date.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                    const timeStr = date.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    return { date: dateStr, time: timeStr };
                  }
                  return { date: dateString || 'N/A', time: null };
                };

                const { date, time } = formatDateTime(payment.timestamp, payment.scheduledDate);

                return (
                  <div key={payment.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{payment.employeeName}</p>
                      <p className="text-sm text-gray-500">{company?.name || 'Unknown Company'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{payment.amount.toLocaleString()} USDC</p>
                      <p className="text-sm text-gray-500">{date}</p>
                      {time && <p className="text-xs text-gray-400">{time}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
