import { Building2, Wallet, Calendar, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface CompanyListProps {
  companies: Company[];
  onDelete: (id: string) => void;
}

interface Company {
  id: string;
  name: string;
  walletAddress: string;
  registrationDate: string;
}

export function CompanyList({ companies, onDelete }: CompanyListProps) {

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2>Registered Companies</h2>
          <p className="text-gray-500">Manage your registered companies</p>
        </div>
        <Badge variant="secondary">{companies.length} Companies</Badge>
      </div>

      {companies.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No companies registered yet</p>
              <p className="text-sm text-gray-400 mt-1">Register your first company to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companies.map((company) => (
            <Card key={company.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    <CardTitle>{company.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(company.id)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <Calendar className="h-3 w-3" />
                  Registered: {company.registrationDate}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">MetaMask Wallet Address</span>
                  </div>
                  <p className="text-sm bg-gray-50 p-2 rounded border break-all">
                    {company.walletAddress}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
