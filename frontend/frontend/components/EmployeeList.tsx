"use client";
import { useState, useEffect } from 'react';
import { Users, Trash2, Edit, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface EmployeeListProps {
  employees: Employee[];
  companies: Company[];
  currentCompanyId: number;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Omit<Employee, 'id' | 'registrationDate'>) => void;
}

interface Company {
  id: string;
  name: string;
  walletAddress: string;
  registrationDate: string;
}

interface Employee {
  id: string;
  name: string;
  walletAddress: string;
  registrationDate: string;
  network?: string;
  chainSelector?: number;
  paymentStatus?: 'Paid' | 'Pending';
  nextPayDate?: number;
  salary?: string;
}

export function EmployeeList({ employees, companies, currentCompanyId, onDelete, onUpdate }: EmployeeListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', walletAddress: '' });

  const handleEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setEditForm({ name: employee.name, walletAddress: employee.walletAddress });
  };

  const handleSave = (id: string) => {
    onUpdate(id, editForm);
    setEditingId(null);
    setEditForm({ name: '', walletAddress: '' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ name: '', walletAddress: '' });
  };

  // Get current company name
  const currentCompany = companies.find(c => parseInt(c.id) === currentCompanyId);
  const companyName = currentCompany?.name || 'Employees';
  const hasCompany = currentCompanyId && currentCompanyId > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2>{hasCompany ? `${companyName} - Employees` : 'Employees'}</h2>
          <p className="text-gray-500">
            {hasCompany ? 'Manage your registered employees' : 'Register your company to add employees'}
          </p>
        </div>
        {hasCompany && <Badge variant="secondary">{employees.length} Employees</Badge>}
      </div>

      {!hasCompany ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No company registered</p>
              <p className="text-sm text-gray-400 mt-1">Register your company to start adding employees</p>
            </div>
          </CardContent>
        </Card>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No employees registered yet</p>
              <p className="text-sm text-gray-400 mt-1">Register your first employee to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Wallet Address</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Next Pay Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  editingId === employee.id ? (
                    <TableRow key={employee.id} className="bg-blue-50">
                      <TableCell colSpan={4}>
                        <div className="space-y-4 py-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`edit-name-${employee.id}`}>Name</Label>
                              <Input
                                id={`edit-name-${employee.id}`}
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                placeholder="Employee name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`edit-wallet-${employee.id}`}>Wallet Address</Label>
                              <Input
                                id={`edit-wallet-${employee.id}`}
                                value={editForm.walletAddress}
                                onChange={(e) => setEditForm({ ...editForm, walletAddress: e.target.value })}
                                placeholder="Wallet address"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancel}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSave(employee.id)}
                              disabled={!editForm.name || !editForm.walletAddress}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={employee.id}>
                      <TableCell>{employee.name}</TableCell>
                      <TableCell className="font-mono text-sm">{employee.walletAddress}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.network || 'Unknown'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={employee.paymentStatus === 'Paid' ? 'default' : 'secondary'}
                          className={employee.paymentStatus === 'Paid' ? 'bg-green-500' : 'bg-yellow-500'}
                        >
                          {employee.paymentStatus || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>{employee.registrationDate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(employee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
