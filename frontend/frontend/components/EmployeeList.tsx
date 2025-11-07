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
  onCompanyChange: (companyId: number) => void;
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
}

export function EmployeeList({ employees, companies, currentCompanyId, onDelete, onUpdate, onCompanyChange }: EmployeeListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', walletAddress: '' });
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(currentCompanyId > 0 ? currentCompanyId.toString() : (companies.length > 0 ? companies[0].id : ''));

  // Sync selectedCompanyId when currentCompanyId or companies change
  useEffect(() => {
    if (currentCompanyId > 0) {
      setSelectedCompanyId(currentCompanyId.toString());
    } else if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [currentCompanyId, companies, selectedCompanyId]);

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

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    onCompanyChange(parseInt(companyId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2>Employee List</h2>
          <p className="text-gray-500">Manage your registered employees</p>
        </div>
        <Badge variant="secondary">{employees.length} Employees</Badge>
      </div>

      {/* Company Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label htmlFor="companySelect" className="whitespace-nowrap font-medium">
              Select Company:
            </Label>
            <select
              id="companySelect"
              value={selectedCompanyId}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            >
              {companies.length === 0 ? (
                <option value="">No companies registered</option>
              ) : (
                companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} (ID: {company.id})
                  </option>
                ))
              )}
            </select>
          </div>
        </CardContent>
      </Card>

      {employees.length === 0 ? (
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
                  <TableHead>Registration Date</TableHead>
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
