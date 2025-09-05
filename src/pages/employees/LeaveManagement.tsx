import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAllLeaveApplications, useUpdateLeaveApplicationStatus, useLeaveApplicationPermissions } from '@/hooks/useLeaveManagement';
import { useWithdrawLeaveApplication } from '@/hooks/useLeave';
import { useAllEmployeesLeaveBalances, useAdjustLeaveBalance, useLeaveBalanceAdjustments } from '@/hooks/useLeaveBalanceManagement';
import { useLeaveWithdrawalLogs } from '@/hooks/useLeave';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Download,
  Mail,
  Phone,
  Plus,
  Minus,
  TrendingUp,
  Calculator,
  History,
  Info,
  RotateCcw
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import { isPastDate } from '@/utils/dateUtils';

// Helper functions
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-gray-600" />;
    case 'withdrawn':
      return <RotateCcw className="h-4 w-4 text-gray-600" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-gray-600" />;
  }
};

const getStatusBadge = (status: string) => {
  const variants = {
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-gray-100 text-gray-800',
    withdrawn: 'bg-gray-100 text-gray-800',
  };
  return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
};

// Component for handling action buttons based on permissions
function LeaveApplicationActions({ application }: { application: any }) {
  const { data: permissions, isLoading: permissionsLoading } = useLeaveApplicationPermissions(application.user?.id);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [comments, setComments] = useState('');
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const updateLeaveStatus = useUpdateLeaveApplicationStatus();
  const withdrawLeaveApplication = useWithdrawLeaveApplication();

  const handleStatusUpdate = () => {
    if (!newStatus || !application) return;

    updateLeaveStatus.mutate({
      applicationId: application.id,
      status: newStatus as 'approved' | 'rejected' | 'cancelled',
      comments: comments || undefined
    }, {
      onSuccess: () => {
        setIsUpdateDialogOpen(false);
        setNewStatus('');
        setComments('');
      }
    });
  };

  const handleWithdrawLeave = () => {
    if (!withdrawalReason.trim() || !application) return;

    withdrawLeaveApplication.mutate({
      applicationId: application.id,
      reason: withdrawalReason.trim()
    }, {
      onSuccess: () => {
        setIsWithdrawDialogOpen(false);
        setWithdrawalReason('');
      }
    });
  };

  const canWithdrawLeave = () => {
    if (!['pending', 'approved'].includes(application.status)) {
      return false;
    }
    
    // Check if the leave is in the future (can only withdraw future leaves) using IST
    return !isPastDate(application.start_date);
  };

  return (
    <div className="flex gap-2">
      {/* View button - always visible */}
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Leave Application Details</DialogTitle>
            <DialogDescription>
              Complete information about this leave request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Employee:</p>
                <p className="text-muted-foreground">{application.user?.full_name}</p>
              </div>
              <div>
                <p className="font-medium">Employee ID:</p>
                <p className="text-muted-foreground">{application.user?.employee_id}</p>
              </div>
              <div>
                <p className="font-medium">Email:</p>
                <p className="text-muted-foreground">{application.user?.email}</p>
              </div>
              <div>
                <p className="font-medium">Leave Type:</p>
                <p className="text-muted-foreground">{application.leave_type?.name}</p>
              </div>
              <div>
                <p className="font-medium">Duration:</p>
                <p className="text-muted-foreground">{application.days_count} days</p>
              </div>
              <div>
                <p className="font-medium">Start Date:</p>
                <p className="text-muted-foreground">{format(new Date(application.start_date), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="font-medium">End Date:</p>
                <p className="text-muted-foreground">{format(new Date(application.end_date), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="font-medium">Status:</p>
                <Badge className={getStatusBadge(application.status)}>
                  {application.status}
                </Badge>
              </div>
            </div>
            <div>
              <p className="font-medium mb-2">Reason:</p>
              <p className="text-muted-foreground text-sm">{application.reason}</p>
            </div>
            {application.comments && (
              <div>
                <p className="font-medium mb-2">Manager Comments:</p>
                <p className="text-muted-foreground text-sm">{application.comments}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Review button - for users with edit permissions */}
      {permissions?.canEdit && (
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              Review
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Leave Application</DialogTitle>
              <DialogDescription>
                Approve or reject {application.user?.full_name}'s leave request
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Leave Type:</span>
                    <span className="ml-2">{application.leave_type?.name}</span>
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span>
                    <span className="ml-2">{application.days_count} days</span>
                  </div>
                  <div>
                    <span className="font-medium">Start Date:</span>
                    <span className="ml-2">{format(new Date(application.start_date), 'MMM dd, yyyy')}</span>
                  </div>
                  <div>
                    <span className="font-medium">End Date:</span>
                    <span className="ml-2">{format(new Date(application.end_date), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="font-medium">Reason:</span>
                  <p className="text-sm text-muted-foreground mt-1">{application.reason}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="status">Decision</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select decision" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approve</SelectItem>
                      <SelectItem value="rejected">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="comments">Comments (Optional)</Label>
                  <Textarea
                    id="comments"
                    placeholder="Add any comments for the employee..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                    className="mt-2"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleStatusUpdate}
                  disabled={!newStatus || updateLeaveStatus.isPending}
                >
                  {updateLeaveStatus.isPending ? 'Updating...' : 'Confirm'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Withdraw button - for admin/HR or specific permissions */}
      {permissions?.canEdit && canWithdrawLeave() && (
        <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <RotateCcw className="h-4 w-4 mr-1" />
              Withdraw
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Withdraw Leave Application</DialogTitle>
              <DialogDescription>
                Withdraw {application.user?.full_name}'s leave application
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Employee:</span>
                    <span className="ml-2">{application.user?.full_name}</span>
                  </div>
                  <div>
                    <span className="font-medium">Leave Type:</span>
                    <span className="ml-2">{application.leave_type?.name}</span>
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span>
                    <span className="ml-2">{application.days_count} days</span>
                  </div>
                  <div>
                    <span className="font-medium">Current Status:</span>
                    <Badge className={getStatusBadge(application.status)}>
                      {application.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Start Date:</span>
                    <span className="ml-2">{format(new Date(application.start_date), 'MMM dd, yyyy')}</span>
                  </div>
                  <div>
                    <span className="font-medium">End Date:</span>
                    <span className="ml-2">{format(new Date(application.end_date), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="font-medium">Original Reason:</span>
                  <p className="text-sm text-muted-foreground mt-1">{application.reason}</p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="withdrawalReason">Reason for Withdrawal</Label>
                <Textarea
                  id="withdrawalReason"
                  placeholder="Provide a reason for withdrawing this leave application..."
                  value={withdrawalReason}
                  onChange={(e) => setWithdrawalReason(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {application.status === 'approved' 
                    ? 'Withdrawing an approved leave will restore the employee\'s leave balance.'
                    : 'This will remove the leave application from the review queue.'}
                  {' '}Withdrawal notifications will be sent to HR, managers, and administrators.
                </AlertDescription>
              </Alert>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsWithdrawDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleWithdrawLeave}
                  disabled={!withdrawalReason.trim() || withdrawLeaveApplication.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {withdrawLeaveApplication.isPending ? 'Withdrawing...' : 'Confirm Withdrawal'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Show disabled withdraw button for past leaves */}
      {permissions?.canEdit && ['pending', 'approved'].includes(application.status) && !canWithdrawLeave() && (
        <Button 
          size="sm" 
          variant="outline" 
          disabled 
          className="text-gray-400 cursor-not-allowed"
          title="Cannot withdraw past leave applications"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Past Leave
        </Button>
      )}
    </div>
  );
}

// Component for leave balance adjustment dialog
function LeaveBalanceAdjustment({ employee, onClose }: { employee: any; onClose: () => void }) {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const adjustBalance = useAdjustLeaveBalance();

  const handleAdjustment = () => {
    if (!amount || !reason) return;

    adjustBalance.mutate({
      userId: employee.user_id,
      adjustment: {
        type: adjustmentType,
        amount: parseInt(amount),
        reason
      }
    }, {
      onSuccess: () => {
        onClose();
        setAmount('');
        setReason('');
      }
    });
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This adjustment will be applied to the employee's main leave balance pool.
        </AlertDescription>
      </Alert>

      <div>
        <Label>Action</Label>
        <Select value={adjustmentType} onValueChange={(value: 'add' | 'subtract') => setAdjustmentType(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add">Add Days</SelectItem>
            <SelectItem value="subtract">Subtract Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Number of Days</Label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter number of days"
          min="1"
        />
      </div>

      <div>
        <Label>Reason for Adjustment</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Provide a reason for this adjustment..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          onClick={handleAdjustment}
          disabled={!amount || !reason || adjustBalance.isPending}
        >
          {adjustBalance.isPending ? 'Processing...' : `${adjustmentType === 'add' ? 'Add' : 'Subtract'} ${amount || '0'} Days`}
        </Button>
      </div>
    </div>
  );
}

export function LeaveManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('applications');
  
  // Leave Applications data
  const { data: leaveApplications, isLoading: applicationsLoading } = useAllLeaveApplications();
  
  // Leave Balances data
  const { data: leaveBalances, isLoading: balancesLoading } = useAllEmployeesLeaveBalances();
  const { data: adjustmentHistory, isLoading: historyLoading } = useLeaveBalanceAdjustments(undefined, 100);
  
  // Withdrawal logs data
  const { data: withdrawalLogs, isLoading: withdrawalLogsLoading } = useLeaveWithdrawalLogs();
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('');
  
  // Dialog states
  const [selectedEmployeeForAdjustment, setSelectedEmployeeForAdjustment] = useState<any>(null);
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);

  // Filter leave applications
  const filteredApplications = leaveApplications?.filter(application => {
    const matchesSearch = application.user?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         application.user?.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         application.user?.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || statusFilter === 'all' || application.status === statusFilter;
    const matchesType = !typeFilter || typeFilter === 'all' || application.leave_type?.name === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Filter leave balances
  const filteredBalances = leaveBalances?.filter(balance => {
    const matchesSearch = balance.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         balance.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBalanceFilter = !balanceFilter || balanceFilter === 'all' ||
      (balanceFilter === 'positive' && (balance.remaining_days || 0) > 0) ||
      (balanceFilter === 'negative' && (balance.remaining_days || 0) < 0) ||
      (balanceFilter === 'zero' && (balance.remaining_days || 0) === 0);
    
    return matchesSearch && matchesBalanceFilter;
  });

  const getPriorityLevel = (application: any) => {
    const daysUntilStart = differenceInDays(new Date(application.start_date), new Date());
    if (daysUntilStart <= 3 && application.status === 'pending') return 'urgent';
    if (daysUntilStart <= 7 && application.status === 'pending') return 'high';
    return 'normal';
  };

  const handleExportApplications = () => {
    if (!filteredApplications) return;
    
    const headers = ['Employee Name', 'Employee ID', 'Email', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Reason', 'Status', 'Applied Date', 'Approved By', 'Comments'];
    const csvContent = [
      headers.join(','),
      ...filteredApplications.map(app => [
        `"${app.user?.full_name || ''}"`,
        app.user?.employee_id || '',
        app.user?.email || '',
        app.leave_type?.name || '',
        app.start_date,
        app.end_date,
        app.days_count,
        `"${app.reason}"`,
        app.status,
        format(new Date(app.applied_at), 'yyyy-MM-dd'),
        `"${app.approved_by_user?.full_name || ''}"`,
        `"${app.comments || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave_applications_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleExportBalances = () => {
    if (!filteredBalances) return;
    
    const headers = ['Employee Name', 'Employee ID', 'Tenure (Months)', 'Monthly Rate', 'Allocated Days', 'Used Days', 'Remaining Days', 'Can Carry Forward', 'Anniversary Reset Date'];
    const csvContent = [
      headers.join(','),
      ...filteredBalances.map(balance => [
        `"${balance.full_name || ''}"`,
        balance.employee_id || '',
        balance.tenure_months || 0,
        balance.monthly_rate || 0,
        balance.allocated_days || 0,
        balance.used_days || 0,
        balance.remaining_days || 0,
        balance.can_carry_forward ? 'Yes' : 'No',
        balance.anniversary_reset_date || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave_balances_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Calculate stats
  const totalApplications = leaveApplications?.length || 0;
  const pendingApplications = leaveApplications?.filter(app => app.status === 'pending').length || 0;
  const approvedApplications = leaveApplications?.filter(app => app.status === 'approved').length || 0;
  const urgentApplications = leaveApplications?.filter(app => getPriorityLevel(app) === 'urgent').length || 0;

  const totalEmployees = leaveBalances?.length || 0;
  const negativeBalances = leaveBalances?.filter(balance => (balance.remaining_days || 0) < 0).length || 0;
  const zeroBalances = leaveBalances?.filter(balance => (balance.remaining_days || 0) === 0).length || 0;
  const averageBalance = totalEmployees > 0 
    ? (leaveBalances?.reduce((sum, balance) => sum + (balance.remaining_days || 0), 0) || 0) / totalEmployees 
    : 0;

  if (applicationsLoading && balancesLoading) {
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
          <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground">
            Manage employee leave applications and leave balances
          </p>
        </div>
        <Button 
          onClick={activeTab === 'applications' ? handleExportApplications : handleExportBalances} 
          variant="outline"
        >
          <Download className="h-4 w-4 mr-2" />
          Export {activeTab === 'applications' ? 'Applications' : 'Balances'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="applications">Leave Applications</TabsTrigger>
          <TabsTrigger value="balances">Leave Balances</TabsTrigger>
          <TabsTrigger value="history">Adjustment History</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawal Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-6">
          {/* Applications Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalApplications}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingApplications}</div>
                <p className="text-xs text-muted-foreground">Awaiting approval</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{approvedApplications}</div>
                <p className="text-xs text-muted-foreground">This period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Urgent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{urgentApplications}</div>
                <p className="text-xs text-muted-foreground">Needs immediate attention</p>
              </CardContent>
            </Card>
          </div>

          {/* Urgent Applications Alert */}
          {urgentApplications > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Urgent:</strong> {urgentApplications} leave application{urgentApplications > 1 ? 's' : ''} 
                {urgentApplications > 1 ? ' are' : ' is'} starting within 3 days and require immediate approval.
              </AlertDescription>
            </Alert>
          )}

          {/* Applications Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Leave Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Leave Types</SelectItem>
                      <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                      <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                      <SelectItem value="Casual Leave">Casual Leave</SelectItem>
                      <SelectItem value="Maternity Leave">Maternity Leave</SelectItem>
                      <SelectItem value="Paternity Leave">Paternity Leave</SelectItem>
                      <SelectItem value="Emergency Leave">Emergency Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('');
                      setTypeFilter('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leave Applications Table */}
          <Card>
            <CardHeader>
              <CardTitle>Leave Applications</CardTitle>
              <CardDescription>
                All employee leave applications requiring review and approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {applicationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications?.map((application) => {
                      const priority = getPriorityLevel(application);
                      return (
                        <TableRow key={application.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>{application.user?.full_name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{application.user?.full_name}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {application.user?.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{application.leave_type?.name}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="font-medium">{application.days_count}</div>
                              <div className="text-xs text-muted-foreground">days</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{format(new Date(application.start_date), 'MMM dd')}</div>
                              <div className="text-muted-foreground">to {format(new Date(application.end_date), 'MMM dd, yyyy')}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(application.status)}
                              <Badge className={getStatusBadge(application.status)}>
                                {application.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {priority === 'urgent' && (
                              <Badge variant="destructive" className="text-xs">
                                Urgent
                              </Badge>
                            )}
                            {priority === 'high' && (
                              <Badge className="bg-orange-100 text-orange-800 text-xs">
                                High
                              </Badge>
                            )}
                            {priority === 'normal' && application.status === 'pending' && (
                              <Badge variant="outline" className="text-xs">
                                Normal
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{format(new Date(application.applied_at), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            <LeaveApplicationActions application={application} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              {filteredApplications?.length === 0 && !applicationsLoading && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Leave Applications Found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter || typeFilter
                      ? 'No applications match your current filters.'
                      : 'No leave applications have been submitted yet.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances" className="space-y-6">
          {/* Balance Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalEmployees}</div>
                <p className="text-xs text-muted-foreground">With leave balances</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Negative Balances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{negativeBalances}</div>
                <p className="text-xs text-muted-foreground">Require attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Zero Balances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{zeroBalances}</div>
                <p className="text-xs text-muted-foreground">No days remaining</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Average Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageBalance.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Days per employee</p>
              </CardContent>
            </Card>
          </div>

          {/* Balance Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Select value={balanceFilter} onValueChange={setBalanceFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Balances" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Balances</SelectItem>
                      <SelectItem value="positive">Positive Balance</SelectItem>
                      <SelectItem value="zero">Zero Balance</SelectItem>
                      <SelectItem value="negative">Negative Balance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div></div>
                <div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setBalanceFilter('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leave Balances Table */}
          <Card>
            <CardHeader>
              <CardTitle>Employee Leave Balances</CardTitle>
              <CardDescription>
                View and manage leave balances for all employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              {balancesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Tenure</TableHead>
                      <TableHead>Monthly Rate</TableHead>
                      <TableHead>Allocated</TableHead>
                      <TableHead>Used</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBalances?.map((balance) => {
                      const remainingDays = balance.remaining_days || 0;
                      const tenureMonths = balance.tenure_months || 0;
                      
                      return (
                        <TableRow key={balance.user_id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>{balance.full_name?.charAt(0) || 'U'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{balance.full_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  ID: {balance.employee_id}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="font-medium">{tenureMonths}</div>
                              <div className="text-xs text-muted-foreground">months</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="font-medium">{balance.monthly_rate || 0}</div>
                              <div className="text-xs text-muted-foreground">days/month</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="font-medium">{balance.allocated_days || 0}</div>
                              <div className="text-xs text-muted-foreground">allocated</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="font-medium">{balance.used_days || 0}</div>
                              <div className="text-xs text-muted-foreground">used</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={cn(
                              "text-center font-medium",
                              remainingDays < 0 ? "text-red-600" : 
                              remainingDays === 0 ? "text-orange-600" : "text-green-600"
                            )}>
                              <div>{remainingDays}</div>
                              <div className="text-xs text-muted-foreground">remaining</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {balance.can_carry_forward && (
                                <Badge variant="secondary" className="text-xs">
                                  Can Carry Forward
                                </Badge>
                              )}
                              {tenureMonths < 9 && (
                                <Badge variant="outline" className="text-xs text-orange-600">
                                  Salary Deduction
                                </Badge>
                              )}
                              {balance.is_anniversary_today && (
                                <Badge variant="destructive" className="text-xs">
                                  Anniversary Today
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Dialog 
                              open={isAdjustmentDialogOpen && selectedEmployeeForAdjustment?.user_id === balance.user_id}
                              onOpenChange={(open) => {
                                setIsAdjustmentDialogOpen(open);
                                if (!open) setSelectedEmployeeForAdjustment(null);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedEmployeeForAdjustment(balance);
                                    setIsAdjustmentDialogOpen(true);
                                  }}
                                >
                                  <Calculator className="h-4 w-4 mr-2" />
                                  Adjust
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Adjust Leave Balance</DialogTitle>
                                  <DialogDescription>
                                    Manually adjust leave balance for {balance.full_name}
                                  </DialogDescription>
                                </DialogHeader>
                                <LeaveBalanceAdjustment 
                                  employee={balance}
                                  onClose={() => {
                                    setIsAdjustmentDialogOpen(false);
                                    setSelectedEmployeeForAdjustment(null);
                                  }}
                                />
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              {filteredBalances?.length === 0 && !balancesLoading && (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Leave Balances Found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || balanceFilter
                      ? 'No balances match your current filters.'
                      : 'No leave balances have been set up yet.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Adjustment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Leave Balance Adjustment History
              </CardTitle>
              <CardDescription>
                Track all manual adjustments made to employee leave balances
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : adjustmentHistory && adjustmentHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Adjustment</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Adjusted By</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustmentHistory.map((adjustment: any) => (
                      <TableRow key={adjustment.id}>
                        <TableCell>
                          <div className="font-medium">{adjustment.user?.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {adjustment.user?.employee_id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {adjustment.leave_balance?.leave_type?.name || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className={cn(
                            "flex items-center gap-2 font-medium",
                            adjustment.adjustment_type === 'add' ? "text-green-600" : "text-red-600"
                          )}>
                            {adjustment.adjustment_type === 'add' ? (
                              <Plus className="h-4 w-4" />
                            ) : (
                              <Minus className="h-4 w-4" />
                            )}
                            {adjustment.amount} days
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {adjustment.previous_allocated} → {adjustment.new_allocated}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{adjustment.reason}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{adjustment.adjusted_by_user?.full_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {adjustment.adjusted_by_user?.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(adjustment.created_at), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Adjustment History</h3>
                  <p className="text-muted-foreground">
                    No manual leave balance adjustments have been made yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-6">
          {/* Withdrawal Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Leave Withdrawal Logs
              </CardTitle>
              <CardDescription>
                Track all leave applications that have been withdrawn by employees or administrators
              </CardDescription>
            </CardHeader>
            <CardContent>
              {withdrawalLogsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : withdrawalLogs && withdrawalLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Leave Details</TableHead>
                      <TableHead>Previous Status</TableHead>
                      <TableHead>Withdrawal Reason</TableHead>
                      <TableHead>Withdrawn By</TableHead>
                      <TableHead>Withdrawn Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawalLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="font-medium">{log.leave_application?.user?.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {log.leave_application?.user?.employee_id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {log.leave_application?.leave_type?.name}
                              </Badge>
                              <span className="text-sm">{log.leave_application?.days_count} days</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(log.leave_application?.start_date), 'MMM dd')} - {format(new Date(log.leave_application?.end_date), 'MMM dd, yyyy')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(log.previous_status)}>
                            {log.previous_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm max-w-xs truncate" title={log.withdrawal_reason}>
                            {log.withdrawal_reason}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{log.withdrawn_by_user?.full_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {log.withdrawn_by_user?.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(log.withdrawn_at), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <RotateCcw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Withdrawal Logs</h3>
                  <p className="text-muted-foreground">
                    No leave applications have been withdrawn yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}