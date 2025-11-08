"use client";
import { useState, useEffect } from 'react';
import { Building2, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';

interface CompanyRegistrationProps {
  onRegister: (company: Omit<Company, 'id' | 'registrationDate'>) => void;
  walletConnected?: boolean;
  walletAddress?: string;
}

interface Company {
  id: string;
  name: string;
  walletAddress: string;
  registrationDate: string;
}

export function CompanyRegistration({ onRegister, walletConnected, walletAddress }: CompanyRegistrationProps) {
  const [formData, setFormData] = useState({
    name: '',
    walletAddress: '',
  });

  // Sync wallet address from parent when available
  useEffect(() => {
    if (walletConnected && walletAddress) {
      setFormData(prev => ({ ...prev, walletAddress }));
    }
  }, [walletConnected, walletAddress]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.walletAddress) {
      onRegister(formData);
      setFormData({ name: '', walletAddress: '' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2>Register Company</h2>
        <p className="text-gray-500">Add a new company to the payment system</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            Enter the company details and wallet information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Enter company name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {walletConnected && formData.walletAddress && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  <Label>Connected Wallet</Label>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <p className="text-xs text-green-800 break-all">
                    <span className="font-medium">Wallet: </span>{formData.walletAddress}
                  </p>
                </div>
              </div>
            )}

            {!walletConnected && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  Please connect your wallet using the "Connect MetaMask" button in the header to register your company.
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={!walletConnected || !formData.walletAddress}>
              Register Company
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
