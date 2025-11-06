import { useState } from 'react';
import { Calendar, Coins, Users, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface PaymentSchedulerProps {
  companies: Company[];
  onSchedule: (payment: Omit<Payment, 'id' | 'status'>) => void;
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

export function PaymentScheduler({ companies, onSchedule }: PaymentSchedulerProps) {
  const [formData, setFormData] = useState({
    companyId: '',
    employeeName: '',
    employeeWallet: '',
    amount: '',
    scheduledDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.companyId && formData.employeeName && formData.employeeWallet && formData.amount && formData.scheduledDate) {
      onSchedule({
        companyId: formData.companyId,
        employeeName: formData.employeeName,
        employeeWallet: formData.employeeWallet,
        amount: parseFloat(formData.amount),
        scheduledDate: formData.scheduledDate,
      });
      setFormData({
        companyId: formData.companyId,
        employeeName: '',
        employeeWallet: '',
        amount: '',
        scheduledDate: '',
      });
    }
  };

  const selectedCompany = companies.find(c => c.id === formData.companyId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2>Schedule Payment</h2>
        <p className="text-gray-500">Schedule payments to employees</p>
      </div>

      {companies.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Coins className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No companies registered</p>
              <p className="text-sm text-gray-400 mt-1">Please register a company first before scheduling payments</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Payment Details
            </CardTitle>
            <CardDescription>
              Enter employee and payment information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company">Select Company</Label>
                <Select
                  value={formData.companyId}
                  onValueChange={(value) => setFormData({ ...formData, companyId: value })}
                >
                  <SelectTrigger id="company">
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCompany && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm">Company Wallet Address</p>
                  <p className="text-sm text-gray-600 break-all">{selectedCompany.walletAddress}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="employeeName">Employee Name</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="employeeName"
                    placeholder="Enter employee name"
                    value={formData.employeeName}
                    onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeWallet">Employee Wallet Address</Label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="employeeWallet"
                    placeholder="Enter employee wallet address"
                    value={formData.employeeWallet}
                    onChange={(e) => setFormData({ ...formData, employeeWallet: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USDC)</Label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduledDate">Scheduled Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full">
                Schedule Payment
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
