import { Building2, Wallet, Users, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface DashboardProps {
  companies: Company[];
  payments: Payment[];
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
}

export function Dashboard({ companies, payments }: DashboardProps) {
  const totalCompanies = companies.length;
  const totalPayments = payments.length;
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'scheduled').length;
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

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
            <CardTitle className="text-sm">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{totalCompanies}</div>
            <p className="text-xs text-gray-500 mt-1">Registered companies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Payments</CardTitle>
            <Calendar className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{totalPayments}</div>
            <p className="text-xs text-gray-500 mt-1">All scheduled payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Pending Payments</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{pendingPayments}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Amount</CardTitle>
            <Wallet className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{totalAmount.toLocaleString()} USDC</div>
            <p className="text-xs text-gray-500 mt-1">Total scheduled</p>
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
                return (
                  <div key={payment.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p>{payment.employeeName}</p>
                      <p className="text-sm text-gray-500">{company?.name || 'Unknown Company'}</p>
                    </div>
                    <div className="text-right">
                      <p>{payment.amount.toLocaleString()} USDC</p>
                      <p className="text-sm text-gray-500">{payment.scheduledDate}</p>
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
