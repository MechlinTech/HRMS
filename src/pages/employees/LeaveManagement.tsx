import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAllLeaveApplications, useUpdateLeaveApplicationStatus } from '@/hooks/useLeaveManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Phone
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function LeaveManagement() {
  const { user } = useAuth();
  const { data: leaveApplications, isLoading: applicationsLoading } = useAllLeaveApplications();
  const updateLeaveStatus = useUpdateLeaveApplicationStatus();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');
  const [comments, setComments] = useState('');
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  const filteredApplications = leaveApplications?.filter(application => {
    const matchesSearch = application.user?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         application.user?.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         application.user?.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || statusFilter === 'all' || application.status === statusFilter;
    const matchesType = !typeFilter || typeFilter === 'all' || application.leave_type?.name === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

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
    };
    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityLevel = (application: any) => {
    const daysUntilStart = differenceInDays(new Date(application.start_date), new Date());
    if (daysUntilStart <= 3 && application.status === 'pending') return 'urgent';
    if (daysUntilStart <= 7 && application.status === 'pending') return 'high';
    return 'normal';
  };

  const handleStatusUpdate = () => {
    if (!selectedApplication || !newStatus) return;

    updateLeaveStatus.mutate({
      applicationId: selectedApplication.id,
      status: newStatus as 'approved' | 'rejected' | 'cancelled',
      comments: comments.trim() || undefined
    }, {
      onSuccess: () => {
        setIsUpdateDialogOpen(false);
        setNewStatus('');
        setComments('');
        setSelectedApplication(null);
      }
    });
  };

  const handleExportApplications = () => {
    if (!filteredApplications) return;
    
    // Create CSV content
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

    // Download file
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

  const totalApplications = leaveApplications?.length || 0;
  const pendingApplications = leaveApplications?.filter(app => app.status === 'pending').length || 0;
  const approvedApplications = leaveApplications?.filter(app => app.status === 'approved').length || 0;
  const urgentApplications = leaveApplications?.filter(app => getPriorityLevel(app) === 'urgent').length || 0;

  if (applicationsLoading) {
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
            Review and approve employee leave applications
          </p>
        </div>
        <Button onClick={handleExportApplications} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Applications
        </Button>
      </div>

      {/* Stats Cards */}
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
            <p className="text-xs text-muted-foreground">This month</p>
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

      {/* Filters */}
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
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedApplication(application)}
                            >
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
                            {selectedApplication && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="font-medium">Employee:</p>
                                    <p className="text-muted-foreground">{selectedApplication.user?.full_name}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Employee ID:</p>
                                    <p className="text-muted-foreground">{selectedApplication.user?.employee_id}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Email:</p>
                                    <p className="text-muted-foreground">{selectedApplication.user?.email}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Leave Type:</p>
                                    <p className="text-muted-foreground">{selectedApplication.leave_type?.name}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Start Date:</p>
                                    <p className="text-muted-foreground">{format(new Date(selectedApplication.start_date), 'MMM dd, yyyy')}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">End Date:</p>
                                    <p className="text-muted-foreground">{format(new Date(selectedApplication.end_date), 'MMM dd, yyyy')}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Duration:</p>
                                    <p className="text-muted-foreground">{selectedApplication.days_count} days</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Status:</p>
                                    <Badge className={getStatusBadge(selectedApplication.status)}>
                                      {selectedApplication.status}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="font-medium mb-2">Reason:</p>
                                  <p className="text-muted-foreground text-sm">{selectedApplication.reason}</p>
                                </div>

                                {selectedApplication.comments && (
                                  <div>
                                    <p className="font-medium mb-2">Manager Comments:</p>
                                    <p className="text-muted-foreground text-sm">{selectedApplication.comments}</p>
                                  </div>
                                )}

                                <div className="flex justify-between text-xs text-muted-foreground pt-4 border-t">
                                  <span>Applied: {format(new Date(selectedApplication.applied_at), 'MMM dd, yyyy HH:mm')}</span>
                                  {selectedApplication.approved_at && (
                                    <span>Approved: {format(new Date(selectedApplication.approved_at), 'MMM dd, yyyy HH:mm')}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        {application.status === 'pending' && (
                          <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm"
                                onClick={() => {
                                  setSelectedApplication(application);
                                  setNewStatus('');
                                  setComments('');
                                }}
                              >
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Review Leave Application</DialogTitle>
                                <DialogDescription>
                                  Approve or reject {selectedApplication?.user?.full_name}'s leave request
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="font-medium">Leave Type:</span>
                                      <span className="ml-2">{selectedApplication?.leave_type?.name}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium">Duration:</span>
                                      <span className="ml-2">{selectedApplication?.days_count} days</span>
                                    </div>
                                    <div>
                                      <span className="font-medium">Start Date:</span>
                                      <span className="ml-2">{selectedApplication && format(new Date(selectedApplication.start_date), 'MMM dd, yyyy')}</span>
                                    </div>
                                    <div>
                                      <span className="font-medium">End Date:</span>
                                      <span className="ml-2">{selectedApplication && format(new Date(selectedApplication.end_date), 'MMM dd, yyyy')}</span>
                                    </div>
                                  </div>
                                  <div className="mt-3">
                                    <span className="font-medium">Reason:</span>
                                    <p className="text-muted-foreground text-sm mt-1">{selectedApplication?.reason}</p>
                                  </div>
                                </div>

                                <div>
                                  <Label>Decision</Label>
                                  <Select value={newStatus} onValueChange={setNewStatus}>
                                    <SelectTrigger className="mt-1">
                                      <SelectValue placeholder="Select decision" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="approved">Approve</SelectItem>
                                      <SelectItem value="rejected">Reject</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label>Comments (Optional)</Label>
                                  <Textarea
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    placeholder="Add any comments or feedback..."
                                    className="mt-1"
                                    rows={3}
                                  />
                                </div>

                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
                                    Cancel
                                  </Button>
                                  <Button 
                                    onClick={handleStatusUpdate} 
                                    disabled={!newStatus || updateLeaveStatus.isPending}
                                    className={newStatus === 'approved' ? 'bg-green-600 hover:bg-green-700' : newStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
                                  >
                                    {updateLeaveStatus.isPending ? 'Processing...' : newStatus === 'approved' ? 'Approve Application' : newStatus === 'rejected' ? 'Reject Application' : 'Update Status'}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredApplications?.length === 0 && (
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
    </div>
  );
}