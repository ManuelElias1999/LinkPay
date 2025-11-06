import { useState } from 'react';
import { Coins, Users, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';

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
    employeeName: '',
    employeeWallet: '',
    amount: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.employeeName && formData.employeeWallet && formData.amount) {
      // Use first company as default or empty string
      const companyId = companies.length > 0 ? companies[0].id : '';
      const currentDate = new Date().toISOString().split('T')[0];
      
      onSchedule({
        companyId: companyId,
        employeeName: formData.employeeName,
        employeeWallet: formData.employeeWallet,
        amount: parseFloat(formData.amount),
        scheduledDate: currentDate,
      });
      setFormData({
        employeeName: '',
        employeeWallet: '',
        amount: '',
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2>Schedule Payment</h2>
        <p className="text-gray-500">Schedule payments to employees</p>
      </div>

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

            <Button type="submit" className="w-full">
              Schedule Payment
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
