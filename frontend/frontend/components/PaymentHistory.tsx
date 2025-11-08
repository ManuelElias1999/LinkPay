"use client";
import { CheckCircle2, Clock, Calendar, ExternalLink, X, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { useState } from 'react';

interface PaymentHistoryProps {
  companies: Company[];
  payments: Payment[];
  currentCompanyId?: number;
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
  transactionHash?: string;
  network?: string;
  timestamp?: number;
}

export function PaymentHistory({ companies, payments, currentCompanyId }: PaymentHistoryProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Filter payments by current company and status
  const filteredPayments = payments.filter((payment) => {
    if (currentCompanyId && currentCompanyId > 0 && payment.companyId !== currentCompanyId.toString()) return false;
    if (filterStatus !== 'all' && payment.status !== filterStatus) return false;
    return true;
  });

  // Get current company name
  const currentCompany = companies.find(c => currentCompanyId && parseInt(c.id) === currentCompanyId);
  const companyName = currentCompany?.name || 'Payment History';

  // Show message if no company is registered
  const hasCompany = currentCompanyId && currentCompanyId > 0;

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

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDateTime = (timestamp?: number, dateString?: string) => {
    if (timestamp) {
      const date = new Date(timestamp * 1000);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
    return dateString || 'N/A';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2>{companyName}</h2>
        <p className="text-gray-500">
          {hasCompany ? 'View all scheduled and completed payments' : 'Register your company to view payment history'}
        </p>
      </div>

      {!hasCompany && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No company registered</p>
              <p className="text-sm text-gray-400 mt-1">Register your company to start tracking payments</p>
            </div>
          </CardContent>
        </Card>
      )}

      {hasCompany && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter payments by status</CardDescription>
            </CardHeader>
        <CardContent>
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
                    <TableHead>Network</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => {
                    const company = companies.find(c => c.id === payment.companyId);
                    return (
                      <TableRow
                        key={payment.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedPayment(payment)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{payment.employeeName}</p>
                            <p className="text-xs text-gray-500 font-mono truncate max-w-[150px]">
                              {payment.employeeWallet}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{company?.name || 'Unknown'}</TableCell>
                        <TableCell className="font-medium">{payment.amount.toLocaleString()} USDC</TableCell>
                        <TableCell>
                          {payment.network ? (
                            <Badge variant="outline">{payment.network}</Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{payment.scheduledDate}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell>
                          {payment.transactionHash ? (
                            <a
                              href={`https://sepolia.basescan.org/tx/${payment.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-xs font-mono"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {payment.transactionHash.substring(0, 10)}...
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Details Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Payment Details</h3>
              <button
                onClick={() => setSelectedPayment(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status */}
              <div>
                <label className="text-sm text-gray-500">Status</label>
                <div className="mt-1">
                  {getStatusBadge(selectedPayment.status)}
                </div>
              </div>

              {/* Employee Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Employee Name</label>
                  <p className="mt-1 font-medium">{selectedPayment.employeeName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Company</label>
                  <p className="mt-1 font-medium">
                    {companies.find(c => c.id === selectedPayment.companyId)?.name || 'Unknown'}
                  </p>
                </div>
              </div>

              {/* Employee Wallet */}
              <div>
                <label className="text-sm text-gray-500">Employee Wallet Address</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 text-sm bg-gray-50 px-3 py-2 rounded border font-mono break-all">
                    {selectedPayment.employeeWallet}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(selectedPayment.employeeWallet, 'wallet')}
                  >
                    {copiedField === 'wallet' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Payment Amount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Amount</label>
                  <p className="mt-1 text-2xl font-bold text-green-600">
                    {selectedPayment.amount.toLocaleString()} USDC
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Network</label>
                  <div className="mt-1">
                    {selectedPayment.network ? (
                      <Badge variant="outline" className="text-base px-3 py-1">
                        {selectedPayment.network}
                      </Badge>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div>
                <label className="text-sm text-gray-500">Date & Time</label>
                <p className="mt-1 font-medium">
                  {formatDateTime(selectedPayment.timestamp, selectedPayment.scheduledDate)}
                </p>
              </div>

              {/* Transaction Hash */}
              {selectedPayment.transactionHash && (
                <div>
                  <label className="text-sm text-gray-500">Transaction Hash</label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 text-sm bg-gray-50 px-3 py-2 rounded border font-mono break-all">
                      {selectedPayment.transactionHash}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(selectedPayment.transactionHash!, 'tx')}
                    >
                      {copiedField === 'tx' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <a
                    href={`https://sepolia.basescan.org/tx/${selectedPayment.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    View on Block Explorer
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Payment ID */}
              <div>
                <label className="text-sm text-gray-500">Payment ID</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 text-xs bg-gray-50 px-3 py-2 rounded border font-mono break-all">
                    {selectedPayment.id}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(selectedPayment.id, 'id')}
                  >
                    {copiedField === 'id' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end border-t">
              <Button onClick={() => setSelectedPayment(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
