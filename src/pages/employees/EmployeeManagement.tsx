import React, { useState } from 'react';
import { 
  useAllEmployees, 
  useUpdateUserPermissions,
  useUpdateEmployee,
  useAssetMetrics 
} from '@/hooks/useEmployees';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DashboardAccessManager } from '@/components/dashboard/DashboardAccessManager';
import {
  Users,
  Search,
  Download,
  Eye,
  Filter,
  Calendar,
  Phone,
  Mail,
  Building,
  UserCheck,
  Clock,
  DollarSign,
  Package,
  UserPlus,
  LogOut,
  Shield,
  Edit,
  Trash2,
  Save,
  X,
  TrendingUp,
  Monitor,
  CheckCircle,
  AlertTriangle,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const employeeSchema = z.object({
  id: z.string().uuid('Invalid employee ID'),
  full_name: z.string().min(1, 'Full name is required'),
  employee_id: z.string().optional(),
  email: z.string().email('Invalid email address'),
  company_email: z.string().optional(),
  personal_email: z.string().optional(),
  phone: z.string().optional(),
  alternate_contact_no: z.string().optional(),
  position: z.string().optional(),
  designation_offer_letter: z.string().optional(),
  salary: z.number().min(0, 'Salary must be positive').optional(),
  address: z.string().optional(),
  permanent_address: z.string().optional(),
  date_of_birth: z.string().optional(),
  date_of_joining: z.string().optional(),
  role_id: z.string().optional(),
  department_id: z.string().optional(),
  manager_id: z.string().optional(),
  status: z.string().optional(),
  level_grade: z.string().optional(),
  skill: z.array(z.string()).optional(),
  current_office_location: z.string().optional(),
  blood_group: z.string().optional(),
  religion: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  marital_status: z.enum(['single', 'married', 'divorced', 'widowed']).optional(),
  date_of_marriage_anniversary: z.string().optional(),
  father_name: z.string().optional(),
  father_dob: z.string().optional(),
  mother_name: z.string().optional(),
  mother_dob: z.string().optional(),
  aadhar_card_no: z.string().optional(),
  pan_no: z.string().optional(),
  bank_account_no: z.string().optional(),
  ifsc_code: z.string().optional(),
  qualification: z.string().optional(),
  employment_terms: z.enum(['part_time', 'full_time']).optional(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

export function EmployeeManagement() {
  const { data: employees, isLoading: employeesLoading } = useAllEmployees();
  const { data: assetMetrics, isLoading: metricsLoading } = useAssetMetrics();
  const updateEmployee = useUpdateEmployee();
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedEmployeeForAccess, setSelectedEmployeeForAccess] = useState<any>(null);
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [viewActiveTab, setViewActiveTab] = useState('basic');
  
  // Internal fields state
  const [internalPeople, setInternalPeople] = useState('none');
  const [internalPayroll, setInternalPayroll] = useState('none');
  const [isUpdatingInternal, setIsUpdatingInternal] = useState(false);
  const [isEditingInternal, setIsEditingInternal] = useState(false);
  const [peopleSearchTerm, setPeopleSearchTerm] = useState('');
  const [payrollSearchTerm, setPayrollSearchTerm] = useState('');
  const [isPeoplePopoverOpen, setIsPeoplePopoverOpen] = useState(false);
  const [isPayrollPopoverOpen, setIsPayrollPopoverOpen] = useState(false);

  const handleUpdateInternalFields = async () => {
    if (!userOptions || userOptions.length === 0) return;
    
    setIsUpdatingInternal(true);
    
    try {
      // Update ALL users (active, inactive, new) with the same internal values
      const { error } = await supabase
        .from('users')
        .update({
            internal_people: internalPeople === 'none' ? null : internalPeople,
            internal_payroll: internalPayroll === 'none' ? null : internalPayroll,
        })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all users except dummy records
      
      if (error) throw error;
      
      toast.success(`Internal fields updated for all ${userOptions.length} users!`);
      setIsUpdatingInternal(false);
      // Exit edit mode and reset search states
      setIsEditingInternal(false);
      setPeopleSearchTerm('');
      setPayrollSearchTerm('');
      setIsPeoplePopoverOpen(false);
      setIsPayrollPopoverOpen(false);
    } catch (error) {
      toast.error('Failed to update internal fields');
      console.error('Internal fields update error:', error);
    } finally {
      setIsUpdatingInternal(false);
    }
  };

  // Get departments, roles, and users for dropdowns
  const { data: departmentOptions } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: roleOptions } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: userOptions } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, internal_people, internal_payroll')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Initialize internal fields when user data loads
  React.useEffect(() => {
    if (userOptions && userOptions.length > 0) {
      // Find the first user with internal values or default to 'none'
      const userWithInternalData = userOptions.find(user => user.internal_people || user.internal_payroll);
      setInternalPeople(userWithInternalData?.internal_people || 'none');
      setInternalPayroll(userWithInternalData?.internal_payroll || 'none');
    }
  }, [userOptions]);

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      id: '',
      full_name: '',
      employee_id: '',
      email: '',
      company_email: '',
      personal_email: '',
      phone: '',
      alternate_contact_no: '',
      position: '',
      designation_offer_letter: '',
      salary: 0,
      address: '',
      permanent_address: '',
      date_of_birth: '',
      date_of_joining: '',
      role_id: '',
      department_id: '',
      manager_id: 'none',
      status: 'active',
      level_grade: '',
      skill: [],
      current_office_location: '',
      blood_group: '',
      religion: '',
      gender: undefined,
      marital_status: undefined,
      date_of_marriage_anniversary: '',
      father_name: '',
      father_dob: '',
      mother_name: '',
      mother_dob: '',
      aadhar_card_no: '',
      pan_no: '',
      bank_account_no: '',
      ifsc_code: '',
      qualification: '',
      employment_terms: 'full_time',
    },
  });

  const filteredEmployees = employees?.filter(emp => {
    const matchesSearch = emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !departmentFilter || departmentFilter === 'all' || emp.department?.name === departmentFilter;
    const matchesRole = !roleFilter || roleFilter === 'all' || emp.role?.name === roleFilter;
    
    return matchesSearch && matchesDepartment && matchesRole;
  });

  const departments = [...new Set(employees?.map(emp => emp.department?.name).filter(Boolean))];
  const roles = [...new Set(employees?.map(emp => emp.role?.name).filter(Boolean))];

  // Helper functions for displaying selected users and filtering
  const getSelectedUserDisplay = (userId: string) => {
    if (!userId || userId === 'none' || !userOptions) return null;
    const user = userOptions.find(u => u.id === userId);
    return user ? { name: user.full_name, email: user.email } : null;
  };

  const selectedPeopleUser = getSelectedUserDisplay(internalPeople);
  const selectedPayrollUser = getSelectedUserDisplay(internalPayroll);

  // Filter users based on search terms
  const getFilteredUsers = (searchTerm: string) => {
    if (!userOptions) return [];
    if (!searchTerm.trim()) return userOptions;
    
    return userOptions.filter(user => 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredPeopleUsers = getFilteredUsers(peopleSearchTerm);
  const filteredPayrollUsers = getFilteredUsers(payrollSearchTerm);

  const handleEditEmployee = (employee: any) => {
    setEditingEmployee(employee);
    form.reset({
      id: employee.id,
      full_name: employee.full_name,
      employee_id: employee.employee_id || '',
      email: employee.email,
      company_email: employee.company_email || '',
      personal_email: employee.personal_email || '',
      phone: employee.phone || '',
      alternate_contact_no: employee.alternate_contact_no || '',
      position: employee.position || '',
      designation_offer_letter: employee.designation_offer_letter || '',
      salary: employee.salary || 0,
      address: employee.address || '',
      permanent_address: employee.permanent_address || '',
      date_of_birth: employee.date_of_birth || '',
      date_of_joining: employee.date_of_joining || '',
      role_id: employee.role_id || '',
      department_id: employee.department_id || '',
      manager_id: employee.manager_id || 'none',
      status: employee.status || 'active',
      level_grade: employee.level_grade || '',
      skill: employee.skill || [],
      current_office_location: employee.current_office_location || '',
      blood_group: employee.blood_group || '',
      religion: employee.religion || '',
      gender: employee.gender || undefined,
      marital_status: employee.marital_status || undefined,
      date_of_marriage_anniversary: employee.date_of_marriage_anniversary || '',
      father_name: employee.father_name || '',
      father_dob: employee.father_dob || '',
      mother_name: employee.mother_name || '',
      mother_dob: employee.mother_dob || '',
      aadhar_card_no: employee.aadhar_card_no || '',
      pan_no: employee.pan_no || '',
      bank_account_no: employee.bank_account_no || '',
      ifsc_code: employee.ifsc_code || '',
      qualification: employee.qualification || '',
      employment_terms: employee.employment_terms || 'full_time',
    });
    setIsEditDialogOpen(true);
  };

  const onEmployeeSubmit = async (data: EmployeeFormData) => {
    if (!editingEmployee) return;

    // Coerce empty selects to null to avoid uuid parsing errors
    const safeUpdates = {
      ...data,
      role_id: data.role_id || null,
      department_id: data.department_id || null,
      manager_id: data.manager_id === 'none' ? null : data.manager_id || null,
      salary: data.salary || null,
      date_of_birth: data.date_of_birth || null,
      date_of_joining: data.date_of_joining || null,
      date_of_marriage_anniversary: data.date_of_marriage_anniversary || null,
      father_dob: data.father_dob || null,
      mother_dob: data.mother_dob || null,
      // Convert empty strings to null for optional fields
      company_email: data.company_email || null,
      personal_email: data.personal_email || null,
      alternate_contact_no: data.alternate_contact_no || null,
      designation_offer_letter: data.designation_offer_letter || null,
      permanent_address: data.permanent_address || null,
      level_grade: data.level_grade || null,
      current_office_location: data.current_office_location || null,
      blood_group: data.blood_group || null,
      religion: data.religion || null,
      gender: data.gender || null,
      marital_status: data.marital_status || null,
      father_name: data.father_name || null,
      mother_name: data.mother_name || null,
      aadhar_card_no: data.aadhar_card_no || null,
      pan_no: data.pan_no || null,
      bank_account_no: data.bank_account_no || null,
      ifsc_code: data.ifsc_code || null,
      qualification: data.qualification || null,
      employment_terms: data.employment_terms || 'full_time',
    };

    updateEmployee.mutate({
      id: editingEmployee.id,
      updates: safeUpdates
    }, {
      onSuccess: () => {
        setIsEditDialogOpen(false);
        setEditingEmployee(null);
        form.reset();
      }
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-red-100 text-red-800',
    };
    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  if (employeesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
          <p className="text-muted-foreground">
            Manage employee information, attendance, and records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            {employees?.length || 0} Total Employees
          </Badge>
        </div>
      </div>

      

      <Tabs defaultValue="employees" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="employees">All Employees</TabsTrigger>
          <TabsTrigger value="assets">Asset Management</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setDepartmentFilter('all');
                      setRoleFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Internal Fields Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Internal Fields Management
              </CardTitle>
              <CardDescription>
                Set common internal values for all employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isEditingInternal ? (
                /* View Mode */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Internal People</Label>
                      <div className="p-3 bg-gray-50 rounded-lg border">
                        {selectedPeopleUser ? (
                          <div>
                            <p className="font-medium">{selectedPeopleUser.name}</p>
                            <p className="text-xs text-muted-foreground">{selectedPeopleUser.email}</p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">None selected</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Internal Payroll</Label>
                      <div className="p-3 bg-gray-50 rounded-lg border">
                        {selectedPayrollUser ? (
                          <div>
                            <p className="font-medium">{selectedPayrollUser.name}</p>
                            <p className="text-xs text-muted-foreground">{selectedPayrollUser.email}</p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">None selected</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setIsEditingInternal(true)}
                    variant="outline"
                    className="w-full md:w-auto"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Internal Fields
                  </Button>
                </div>
              ) : (
                /* Edit Mode */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="internal-people" className="text-sm font-medium">
                        Internal People
                      </Label>
                      <Popover open={isPeoplePopoverOpen} onOpenChange={setIsPeoplePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isPeoplePopoverOpen}
                            className="w-full justify-between"
                          >
                            {selectedPeopleUser ? (
                              <div className="flex flex-col text-left">
                                <span>{selectedPeopleUser.name}</span>
                                <span className="text-xs text-muted-foreground">{selectedPeopleUser.email}</span>
                              </div>
                            ) : (
                              "Select internal people user"
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput 
                              placeholder="Search users by name or email..."
                              value={peopleSearchTerm}
                              onValueChange={setPeopleSearchTerm}
                            />
                            <CommandList>
                              <CommandEmpty>No users found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="none"
                                  onSelect={() => {
                                    setInternalPeople('none');
                                    setIsPeoplePopoverOpen(false);
                                    setPeopleSearchTerm('');
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      internalPeople === 'none' ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  None
                                </CommandItem>
                          {filteredPeopleUsers?.map((user) => (
                                  <CommandItem
                                    key={user.id}
                                    value={`${user.full_name} ${user.email}`}
                                    onSelect={() => {
                                      setInternalPeople(user.id);
                                      setIsPeoplePopoverOpen(false);
                                      setPeopleSearchTerm('');
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        internalPeople === user.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                              <div className="flex flex-col">
                                <span>{user.full_name}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="internal-payroll" className="text-sm font-medium">
                        Internal Payroll
                      </Label>
                      <Popover open={isPayrollPopoverOpen} onOpenChange={setIsPayrollPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isPayrollPopoverOpen}
                            className="w-full justify-between"
                          >
                            {selectedPayrollUser ? (
                              <div className="flex flex-col text-left">
                                <span>{selectedPayrollUser.name}</span>
                                <span className="text-xs text-muted-foreground">{selectedPayrollUser.email}</span>
                              </div>
                            ) : (
                              "Select internal payroll user"
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput 
                              placeholder="Search users by name or email..."
                              value={payrollSearchTerm}
                              onValueChange={setPayrollSearchTerm}
                            />
                            <CommandList>
                              <CommandEmpty>No users found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="none"
                                  onSelect={() => {
                                    setInternalPayroll('none');
                                    setIsPayrollPopoverOpen(false);
                                    setPayrollSearchTerm('');
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      internalPayroll === 'none' ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  None
                                </CommandItem>
                          {filteredPayrollUsers?.map((user) => (
                                  <CommandItem
                                    key={user.id}
                                    value={`${user.full_name} ${user.email}`}
                                    onSelect={() => {
                                      setInternalPayroll(user.id);
                                      setIsPayrollPopoverOpen(false);
                                      setPayrollSearchTerm('');
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        internalPayroll === user.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                              <div className="flex flex-col">
                                <span>{user.full_name}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={handleUpdateInternalFields}
                      disabled={isUpdatingInternal || !userOptions || userOptions.length === 0}
                      className="flex-1 md:flex-none"
                    >
                      {isUpdatingInternal ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setIsEditingInternal(false);
                        setPeopleSearchTerm('');
                        setPayrollSearchTerm('');
                        setIsPeoplePopoverOpen(false);
                        setIsPayrollPopoverOpen(false);
                        // Reset to original values from user data
                        if (userOptions && userOptions.length > 0) {
                          // Find the first user with internal values or default to 'none'
                          const userWithInternalData = userOptions.find(user => user.internal_people || user.internal_payroll);
                          setInternalPeople(userWithInternalData?.internal_people || 'none');
                          setInternalPayroll(userWithInternalData?.internal_payroll || 'none');
                        }
                      }}
                      disabled={isUpdatingInternal}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Employee List */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Directory</CardTitle>
              <CardDescription>
                Complete list of all employees with their basic information and dashboard access management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees?.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={employee.avatar_url} />
                            <AvatarFallback>{employee.full_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{employee.full_name}</div>
                            <div className="text-sm text-muted-foreground">{employee.position}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.employee_id || 'Not assigned'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {employee.email}
                          </div>
                          {employee.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {employee.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {employee.department?.name || 'Not assigned'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {employee.role?.name?.replace('_', ' ') || 'Not assigned'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(employee.status)}>
                          {employee.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setSelectedEmployee(employee)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] max-h-[90vh] flex flex-col">
                              <DialogHeader className="flex-shrink-0">
                                <DialogTitle>Employee Details</DialogTitle>
                                <DialogDescription>
                                  Complete information for {selectedEmployee?.full_name}
                                </DialogDescription>
                              </DialogHeader>
                              {selectedEmployee && (
                                <div className="flex flex-col flex-1 min-h-0">
                                  <div className="flex items-center gap-4 flex-shrink-0 mb-6">
                                    <Avatar className="h-16 w-16">
                                      <AvatarImage src={selectedEmployee.avatar_url} />
                                      <AvatarFallback className="text-lg">
                                        {selectedEmployee.full_name.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <h3 className="text-xl font-semibold">{selectedEmployee.full_name}</h3>
                                      <p className="text-muted-foreground">{selectedEmployee.position}</p>
                                      <div className="flex gap-2 mt-2">
                                        <Badge className={getStatusBadge(selectedEmployee.status)}>
                                          {selectedEmployee.status}
                                        </Badge>
                                        {selectedEmployee.employment_terms && (
                                          <Badge variant="outline">
                                            {selectedEmployee.employment_terms === 'full_time' ? 'Full Time' : 'Part Time'}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <Tabs value={viewActiveTab} onValueChange={setViewActiveTab} className="flex-1 flex flex-col min-h-0">
                                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0">
                                      <TabsTrigger value="basic" className="flex items-center gap-2 text-xs sm:text-sm">
                                        <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span className="hidden sm:inline">Basic Info</span>
                                        <span className="sm:hidden">Basic</span>
                                      </TabsTrigger>
                                      <TabsTrigger value="contact" className="flex items-center gap-2 text-xs sm:text-sm">
                                        <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span className="hidden sm:inline">Contact</span>
                                        <span className="sm:hidden">Contact</span>
                                      </TabsTrigger>
                                      <TabsTrigger value="personal" className="flex items-center gap-2 text-xs sm:text-sm">
                                        <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span className="hidden sm:inline">Personal</span>
                                        <span className="sm:hidden">Personal</span>
                                      </TabsTrigger>
                                      <TabsTrigger value="work" className="flex items-center gap-2 text-xs sm:text-sm">
                                        <Building className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span className="hidden sm:inline">Work Details</span>
                                        <span className="sm:hidden">Work</span>
                                      </TabsTrigger>
                                    </TabsList>

                                    <div className="flex-1 overflow-y-auto min-h-0 mt-6">
                                      <TabsContent value="basic" className="space-y-4">
                                        <div className="pb-4">
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                            <div>
                                              <p className="font-medium">Employee ID:</p>
                                              <p className="text-muted-foreground">{selectedEmployee.employee_id || 'Not assigned'}</p>
                                            </div>
                                        <div>
                                          <p className="font-medium">Date of Birth:</p>
                                          <p className="text-muted-foreground">
                                            {selectedEmployee.date_of_birth ? format(new Date(selectedEmployee.date_of_birth), 'MMM dd, yyyy') : 'Not provided'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Joining Date:</p>
                                          <p className="text-muted-foreground">
                                            {selectedEmployee.date_of_joining ? format(new Date(selectedEmployee.date_of_joining), 'MMM dd, yyyy') : 'Not set'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Tenure:</p>
                                          <p className="text-muted-foreground">
                                            {selectedEmployee.tenure_mechlin || 'Not calculated'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Gender:</p>
                                          <p className="text-muted-foreground capitalize">{selectedEmployee.gender?.replace('_', ' ') || 'Not specified'}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Blood Group:</p>
                                          <p className="text-muted-foreground">{selectedEmployee.blood_group || 'Not specified'}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Marital Status:</p>
                                          <p className="text-muted-foreground capitalize">{selectedEmployee.marital_status || 'Not specified'}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Marriage Anniversary:</p>
                                          <p className="text-muted-foreground">
                                            {selectedEmployee.date_of_marriage_anniversary ? format(new Date(selectedEmployee.date_of_marriage_anniversary), 'MMM dd, yyyy') : 'Not provided'}
                                          </p>
                                        </div>
                                            <div className="col-span-1 sm:col-span-2">
                                              <p className="font-medium">Religion:</p>
                                              <p className="text-muted-foreground">{selectedEmployee.religion || 'Not specified'}</p>
                                            </div>
                                          </div>
                                        </div>
                                      </TabsContent>

                                      <TabsContent value="contact" className="space-y-4">
                                        <div className="pb-4">
                                          <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <p className="font-medium">Official Email:</p>
                                          <p className="text-muted-foreground">{selectedEmployee.email}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Company Email:</p>
                                          <p className="text-muted-foreground">{selectedEmployee.company_email || 'Not provided'}</p>
                                        </div>
                                        <div className="col-span-2">
                                          <p className="font-medium">Personal Email:</p>
                                          <p className="text-muted-foreground">{selectedEmployee.personal_email || 'Not provided'}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Phone Number:</p>
                                          <p className="text-muted-foreground">{selectedEmployee.phone || 'Not provided'}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Alternate Contact:</p>
                                          <p className="text-muted-foreground">{selectedEmployee.alternate_contact_no || 'Not provided'}</p>
                                        </div>
                                        <div className="col-span-2">
                                          <p className="font-medium">Current Address:</p>
                                          <p className="text-muted-foreground">{selectedEmployee.address || 'Not provided'}</p>
                                        </div>
                                            <div className="col-span-2">
                                              <p className="font-medium">Permanent Address:</p>
                                              <p className="text-muted-foreground">{selectedEmployee.permanent_address || 'Not provided'}</p>
                                            </div>
                                          </div>
                                        </div>
                                      </TabsContent>

                                      <TabsContent value="personal" className="space-y-4">
                                        <div className="pb-4">
                                          <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <p className="font-medium">Father's Name:</p>
                                          <p className="text-muted-foreground">{selectedEmployee.father_name || 'Not provided'}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Father's DOB:</p>
                                          <p className="text-muted-foreground">
                                            {selectedEmployee.father_dob ? format(new Date(selectedEmployee.father_dob), 'MMM dd, yyyy') : 'Not provided'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Mother's Name:</p>
                                          <p className="text-muted-foreground">{selectedEmployee.mother_name || 'Not provided'}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Mother's DOB:</p>
                                          <p className="text-muted-foreground">
                                            {selectedEmployee.mother_dob ? format(new Date(selectedEmployee.mother_dob), 'MMM dd, yyyy') : 'Not provided'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Aadhar Number:</p>
                                          <p className="text-muted-foreground">{selectedEmployee.aadhar_card_no || 'Not provided'}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">PAN Number:</p>
                                          <p className="text-muted-foreground">{selectedEmployee.pan_no || 'Not provided'}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Bank Account:</p>
                                          <p className="text-muted-foreground">{selectedEmployee.bank_account_no || 'Not provided'}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">IFSC Code:</p>
                                          <p className="text-muted-foreground">{selectedEmployee.ifsc_code || 'Not provided'}</p>
                                        </div>
                                            <div className="col-span-2">
                                              <p className="font-medium">Qualification:</p>
                                              <p className="text-muted-foreground">{selectedEmployee.qualification || 'Not provided'}</p>
                                            </div>
                                          </div>
                                        </div>
                                      </TabsContent>

                                      <TabsContent value="work" className="space-y-4">
                                        <div className="pb-4">
                                          <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <p className="font-medium">Current Position:</p>
                                          <p className="text-muted-foreground">{selectedEmployee.position || 'Not assigned'}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Designation (Offer Letter):</p>
                                          <p className="text-muted-foreground">{selectedEmployee.designation_offer_letter || 'Not provided'}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Department:</p>
                                          <p className="text-muted-foreground">{selectedEmployee.department?.name || 'Not assigned'}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Role:</p>
                                          <p className="text-muted-foreground capitalize">{selectedEmployee.role?.name?.replace('_', ' ') || 'Not assigned'}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Manager:</p>
                                          <p className="text-muted-foreground">
                                            {selectedEmployee.manager?.full_name ? (
                                              <span>
                                                {selectedEmployee.manager.full_name}
                                                {selectedEmployee.manager.position && (
                                                  <span className="text-xs block text-muted-foreground/70">
                                                    {selectedEmployee.manager.position}
                                                  </span>
                                                )}
                                              </span>
                                            ) : (
                                              'No manager assigned'
                                            )}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Level/Grade:</p>
                                          <p className="text-muted-foreground">{selectedEmployee.level_grade || 'Not assigned'}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Tenure:</p>
                                          <p className="text-muted-foreground">
                                            {selectedEmployee.date_of_joining 
                                              ? (() => {
                                                  const startDate = new Date(selectedEmployee.date_of_joining);
                                                  const currentDate = new Date();
                                                  const diffInMs = currentDate.getTime() - startDate.getTime();
                                                  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
                                                  const years = Math.floor(diffInDays / 365);
                                                  const months = Math.floor((diffInDays % 365) / 30);
                                                  const days = diffInDays % 30;
                                                  
                                                  if (years > 0) {
                                                    return `${years} year${years > 1 ? 's' : ''}, ${months} month${months > 1 ? 's' : ''}`;
                                                  } else if (months > 0) {
                                                    return `${months} month${months > 1 ? 's' : ''}, ${days} day${days > 1 ? 's' : ''}`;
                                                  } else {
                                                    return `${days} day${days > 1 ? 's' : ''}`;
                                                  }
                                                })()
                                              : 'Not calculated'
                                            }
                                          </p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Office Location:</p>
                                          <p className="text-muted-foreground">{selectedEmployee.current_office_location || 'Not specified'}</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Employment Terms:</p>
                                          <p className="text-muted-foreground">
                                            {selectedEmployee.employment_terms === 'full_time' ? 'Full Time' : 
                                             selectedEmployee.employment_terms === 'part_time' ? 'Part Time' : 'Not specified'}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Status:</p>
                                          <Badge className={getStatusBadge(selectedEmployee.status)}>
                                            {selectedEmployee.status}
                                          </Badge>
                                        </div>
                                            {selectedEmployee.skill && selectedEmployee.skill.length > 0 && (
                                              <div className="col-span-2">
                                                <p className="font-medium">Skills:</p>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                  {selectedEmployee.skill.map((skill: string, index: number) => (
                                                    <Badge key={index} variant="secondary" className="text-xs">
                                                      {skill}
                                                    </Badge>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>

                                          {selectedEmployee.salary && (
                                            <div className="p-4 bg-green-50 rounded-lg">
                                              <div className="flex items-center gap-2 mb-2">
                                                <DollarSign className="h-4 w-4 text-green-600" />
                                                <span className="font-medium">Salary Information</span>
                                              </div>
                                              <p className="text-2xl font-bold text-green-600">
                                                ${selectedEmployee.salary.toLocaleString()}
                                              </p>
                                              <p className="text-sm text-muted-foreground">Annual salary</p>
                                            </div>
                                          )}
                                        </div>
                                      </TabsContent>
                                    </div>
                                  </Tabs>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditEmployee(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Dialog open={isAccessDialogOpen} onOpenChange={setIsAccessDialogOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm"
                                onClick={() => {
                                  setSelectedEmployeeForAccess(employee);
                                }}
                              >
                                <Shield className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Manage Dashboard Access</DialogTitle>
                                <DialogDescription>
                                  Configure dashboard permissions for {selectedEmployeeForAccess?.full_name}
                                </DialogDescription>
                              </DialogHeader>
                              {selectedEmployeeForAccess && (
                                <DashboardAccessManager
                                  employee={selectedEmployeeForAccess}
                                  onClose={() => {
                                    setIsAccessDialogOpen(false);
                                    setSelectedEmployeeForAccess(null);
                                  }}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets" className="space-y-6">
  {/* Top-right button */}
  <div className="flex justify-end">
    <Button onClick={() => (window.location.href = '/employees/assets')}>
      <Package className="h-4 w-4 mr-2" />
      Manage Assets
    </Button>
  </div>

  {/* Outer Card */}
  <Card>
    <CardHeader>
      <CardTitle>Asset Management Overview</CardTitle>
      <CardDescription>
        Quick overview of asset assignments and management
      </CardDescription>
    </CardHeader>

    {/* Inner grid for metrics */}
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetMetrics?.totalAssets || 0}</div>
            <p className="text-xs text-muted-foreground">Company inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Assigned Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetMetrics?.assignedAssets || 0}</div>
            <p className="text-xs text-muted-foreground">Currently in use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Available Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetMetrics?.availableAssets || 0}</div>
            <p className="text-xs text-muted-foreground">Ready for assignment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetMetrics?.maintenanceAssets || 0}</div>
            <p className="text-xs text-muted-foreground">Under maintenance</p>
          </CardContent>
        </Card>
      </div>

      {/* Footer message */}
      <p className="text-center text-muted-foreground py-8">
        Click "Manage Assets" to access the full asset management dashboard
      </p>
    </CardContent>
  </Card>
</TabsContent>

      </Tabs>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information and details
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEmployeeSubmit)} className="flex flex-col flex-1 min-h-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0">
                  <TabsTrigger value="basic" className="flex items-center gap-2 text-xs sm:text-sm">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Basic Info</span>
                    <span className="sm:hidden">Basic</span>
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="flex items-center gap-2 text-xs sm:text-sm">
                    <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Contact</span>
                    <span className="sm:hidden">Contact</span>
                  </TabsTrigger>
                  <TabsTrigger value="personal" className="flex items-center gap-2 text-xs sm:text-sm">
                    <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Personal</span>
                    <span className="sm:hidden">Personal</span>
                  </TabsTrigger>
                  <TabsTrigger value="work" className="flex items-center gap-2 text-xs sm:text-sm">
                    <Building className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Work Details</span>
                    <span className="sm:hidden">Work</span>
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto min-h-0 mt-4">
                  <TabsContent value="basic" className="space-y-6 h-full">
                    <div className="space-y-4 pb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="full_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Full Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter full name" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="employee_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Employee ID</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter employee ID" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="date_of_birth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Date of Birth</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="date_of_joining"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Date of Joining</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="gender"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Gender</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select gender" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="male">Male</SelectItem>
                                  <SelectItem value="female">Female</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="blood_group"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Blood Group</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter blood group (e.g., A+)" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="marital_status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Marital Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select marital status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="single">Single</SelectItem>
                                  <SelectItem value="married">Married</SelectItem>
                                  <SelectItem value="divorced">Divorced</SelectItem>
                                  <SelectItem value="widowed">Widowed</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="date_of_marriage_anniversary"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Marriage Anniversary</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="religion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Religion</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter religion" {...field} className="mt-1" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="contact" className="space-y-6 h-full">
                    <div className="space-y-4 pb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Official Email *</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="Enter official email" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="company_email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Company Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="Enter company email" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="personal_email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Personal Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter personal email" {...field} className="mt-1" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter phone number" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="alternate_contact_no"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Alternate Contact</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter alternate contact" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Current Address</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Enter current address" {...field} className="mt-1" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="permanent_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Permanent Address</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Enter permanent address" {...field} className="mt-1" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="personal" className="space-y-6 h-full">
                    <div className="space-y-4 pb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="father_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Father's Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter father's name" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="father_dob"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Father's Date of Birth</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="mother_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Mother's Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter mother's name" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="mother_dob"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Mother's Date of Birth</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="aadhar_card_no"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Aadhar Card Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter Aadhar number" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="pan_no"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">PAN Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter PAN number" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="bank_account_no"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Bank Account Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter bank account number" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="ifsc_code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">IFSC Code</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter IFSC code" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="qualification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Qualification</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Enter educational qualification" {...field} className="mt-1" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="work" className="space-y-6 h-full">
                    <div className="space-y-4 pb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="position"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Current Position</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter current position" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="designation_offer_letter"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Designation (As per Offer Letter)</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter designation from offer letter" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="role_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Role</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {roleOptions?.map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                      {role.name.replace('_', ' ')}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="department_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Department</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select department" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {departmentOptions?.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                      {dept.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="manager_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Manager</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select manager" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">No Manager</SelectItem>
                                  {userOptions?.filter(user => user.id !== editingEmployee?.id).map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                      <div className="flex flex-col">
                                        <span>{user.full_name}</span>
                                        <span className="text-xs text-muted-foreground">{user.email}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="level_grade"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Level/Grade</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter level or grade" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="current_office_location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Current Office Location</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter office location" {...field} className="mt-1" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="employment_terms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Employment Terms</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select employment terms" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="full_time">Full Time</SelectItem>
                                  <SelectItem value="part_time">Part Time</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="salary"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Annual Salary</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="Enter salary" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  className="mt-1"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
              
              <div className="flex justify-end gap-2 border-t pt-4 mt-6 flex-shrink-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingEmployee(null);
                    form.reset();
                    setActiveTab('basic');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={form.handleSubmit(onEmployeeSubmit)} 
                  disabled={updateEmployee.isPending}
                >
                  {updateEmployee.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}