import { useState } from 'react';
import { Building2, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface CompanyRegistrationProps {
  onRegister: (company: Omit<Company, 'id' | 'registrationDate'>) => void;
}

interface Company {
  id: string;
  name: string;
  walletAddress: string;
  registrationDate: string;
}

export function CompanyRegistration({ onRegister }: CompanyRegistrationProps) {
  const [formData, setFormData] = useState({
    name: '',
    walletAddress: '',
  });
  const [isConnecting, setIsConnecting] = useState(false);

  const connectMetaMask = async () => {
    setIsConnecting(true);
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        toast.error('MetaMask is not installed. Please install MetaMask to continue.');
        setIsConnecting(false);
        return;
      }

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts && accounts.length > 0) {
        setFormData({ ...formData, walletAddress: accounts[0] });
        toast.success('MetaMask connected successfully!');
      }
    } catch (error: any) {
      if (error.code === 4001) {
        toast.error('Connection rejected. Please approve the connection in MetaMask.');
      } else {
        toast.error('Failed to connect to MetaMask. Please try again.');
      }
      console.error('Error connecting to MetaMask:', error);
    } finally {
      setIsConnecting(false);
    }
  };

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

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                <Label>MetaMask Wallet</Label>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={connectMetaMask}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? 'Connecting...' : formData.walletAddress ? `Connected: ${formData.walletAddress.slice(0, 6)}...${formData.walletAddress.slice(-4)}` : 'Connect MetaMask'}
              </Button>

              {formData.walletAddress && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <p className="text-xs text-green-800 break-all">
                    <span className="font-medium">Wallet: </span>{formData.walletAddress}
                  </p>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full">
              Register Company
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
