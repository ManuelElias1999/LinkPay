"use client";
import React, { useState, useEffect } from 'react';
import { Coins, Users, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';

interface PaymentSchedulerProps {
  companies: Company[];
  onSchedule: (payment: any) => void;
  currentCompanyId: number;
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

export function PaymentScheduler({ companies, onSchedule, currentCompanyId }: PaymentSchedulerProps) {
  const [formData, setFormData] = useState({
    employeeName: '',
    employeeWallet: '',
    amount: '',
    blockchainNetwork: 'base',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.employeeName && formData.employeeWallet && formData.amount) {
      onSchedule({
        companyId: currentCompanyId,
        employeeName: formData.employeeName,
        employeeWallet: formData.employeeWallet,
        amount: parseFloat(formData.amount),
        blockchainNetwork: formData.blockchainNetwork,
      });
      setFormData({
        employeeName: '',
        employeeWallet: '',
        amount: '',
        blockchainNetwork: 'base',
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
            {currentCompanyId === 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">
                  You must register a company first before adding employees. Only company owners can add employees.
                </p>
              </div>
            )}

            {currentCompanyId > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-600">
                  Adding employee to your company (ID: {currentCompanyId})
                </p>
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
                  placeholder="0x..."
                  value={formData.employeeWallet}
                  onChange={(e) => setFormData({ ...formData, employeeWallet: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-gray-500">
                This address will receive payments on the selected blockchain network
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blockchainNetwork">Blockchain Network</Label>
              <select
                id="blockchainNetwork"
                value={formData.blockchainNetwork}
                onChange={(e) => setFormData({ ...formData, blockchainNetwork: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="base">Base (Selector: 0)</option>
                <option value="arbitrum">Arbitrum (Selector: 1)</option>
                <option value="avalanche">Avalanche (Selector: 2)</option>
                <option value="eth-sepolia">Ethereum Sepolia (Selector: 3)</option>
              </select>
              <p className="text-xs text-gray-500">
                Select the blockchain network where the employee will receive payments
              </p>
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

            <Button type="submit" className="w-full" disabled={currentCompanyId === 0}>
              {currentCompanyId === 0 ? 'Register Company First' : 'Schedule Payment'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
