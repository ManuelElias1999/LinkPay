import { CheckCircle2, Clock, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useState } from 'react';

interface PaymentHistoryProps {
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

export function PaymentHistory({ companies, payments }: PaymentHistoryProps) {
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredPayments = payments.filter((payment) => {
    if (filterCompany !== 'all' && payment.companyId !== filterCompany) return false;
    if (filterStatus !== 'all' && payment.status !== filterStatus) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { variant: 'outline' as const, icon: Clock, label: 'Pending' },
      scheduled: { variant: 'secondary' as const, icon: Calendar, label: 'Scheduled' },
      completed: { variant: 'default' as const, icon: CheckCircle2, label: 'Completed' },
    };
    const { variant, icon: Icon, label } = config[status as keyof typeof config] || config.pending;
    return (
      <Badge variant={variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2>Payment History</h2>
        <p className="text-gray-500">View all scheduled and completed payments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter payments by company and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm">Company</label>
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="All companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => {
                    const company = companies.find(c => c.id === payment.companyId);
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div>
                            <p>{payment.employeeName}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">
                              {payment.employeeWallet}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{company?.name || 'Unknown'}</TableCell>
                        <TableCell>{payment.amount.toLocaleString()} USDC</TableCell>
                        <TableCell>{payment.scheduledDate}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
