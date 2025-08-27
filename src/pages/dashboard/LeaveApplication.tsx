import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaveTypes, useLeaveBalance, useLeaveApplications, useCreateLeaveApplication } from '@/hooks/useLeave';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { useUpcomingHolidays } from '@/hooks/useDashboard';
import { useLocation } from 'react-router-dom';

const leaveTypeColors = {
  annual: 'bg-blue-500',
  sick: 'bg-red-500',
  casual: 'bg-green-500',
  maternity: 'bg-purple-500',
  paternity: 'bg-orange-500',
  emergency: 'bg-yellow-500',
};

export function LeaveApplication() {
  const { user } = useAuth();
  const location = useLocation();
  const { data: leaveTypes, isLoading: typesLoading } = useLeaveTypes();
  const { data: leaveBalance, isLoading: balanceLoading } = useLeaveBalance();
  const { data: leaveHistory, isLoading: historyLoading } = useLeaveApplications();
  const { data: holidays, isLoading: holidaysLoading } = useUpcomingHolidays();
  const createLeaveApplication = useCreateLeaveApplication();
  
  const [selectedType, setSelectedType] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultTab, setDefaultTab] = useState('apply');

  // Check if we should open history tab based on URL hash
  useEffect(() => {
    if (location.hash === '#history') {
      setDefaultTab('history');
    }
  }, [location.hash]);

  const calculateDays = () => {
    if (startDate && endDate) {
      return differenceInDays(endDate, startDate) + 1;
    }
    return 0;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !startDate || !endDate || !reason.trim() || !user) return;

    const leaveType = leaveTypes?.find(lt => lt.name.toLowerCase().replace(' ', '_') === selectedType);
    if (!leaveType) {
      toast.error('Invalid leave type selected');
      return;
    }

    const daysRequested = calculateDays();
    const userBalance = leaveBalance?.find(lb => lb.leave_type_id === leaveType.id);
    
    if (userBalance && daysRequested > userBalance.remaining_days) {
      toast.error(`Insufficient leave balance. You have ${userBalance.remaining_days} days remaining.`);
      return;
    }

    createLeaveApplication.mutate({
      user_id: user.id,
      leave_type_id: leaveType.id,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      days_count: daysRequested,
      reason: reason.trim(),
      status: 'pending'
    }, {
      onSuccess: () => {
        // Reset form
        setSelectedType('');
        setStartDate(undefined);
        setEndDate(undefined);
        setReason('');
      }
    });
  };

  const totalLeaveBalance = leaveBalance?.reduce((sum, lb) => sum + lb.allocated_days, 0) || 0;
  const usedLeave = leaveBalance?.reduce((sum, lb) => sum + lb.used_days, 0) || 0;

  if (typesLoading || balanceLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leave Application</h1>
        <p className="text-muted-foreground">
          Manage your leave requests and view your leave balance
        </p>
      </div>

      <Tabs value={defaultTab} onValueChange={setDefaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="apply">Apply for Leave</TabsTrigger>
          <TabsTrigger value="balance">Leave Balance</TabsTrigger>
          <TabsTrigger value="history">Leave History</TabsTrigger>
        </TabsList>

        <TabsContent value="apply" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    New Leave Application
                  </CardTitle>
                  <CardDescription>
                    Submit a new leave request for approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <Label htmlFor="leaveType">Leave Type</Label>
                      <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                        <SelectContent>
                          {leaveTypes?.map((type) => {
                            const balance = leaveBalance?.find(lb => lb.leave_type_id === type.id);
                            const typeKey = type.name.toLowerCase().replace(' ', '_');
                            return (
                            <SelectItem key={type.id} value={typeKey}>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${leaveTypeColors[typeKey as keyof typeof leaveTypeColors] || 'bg-gray-500'}`} />
                                {type.name} ({balance?.remaining_days || 0} days available)
                              </div>
                            </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Start Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal mt-1",
                                !startDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {startDate ? format(startDate, "PPP") : "Pick start date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={startDate}
                              onSelect={setStartDate}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <Label>End Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal mt-1",
                                !endDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {endDate ? format(endDate, "PPP") : "Pick end date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={endDate}
                              onSelect={setEndDate}
                              disabled={(date) => date < (startDate || new Date())}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {startDate && endDate && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          Total days requested: <strong>{calculateDays()} days</strong>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div>
                      <Label htmlFor="reason">Reason for Leave</Label>
                      <Textarea
                        id="reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Please provide a reason for your leave request..."
                        className="mt-1"
                        rows={4}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={!selectedType || !startDate || !endDate || !reason.trim() || createLeaveApplication.isPending}
                    >
                      {createLeaveApplication.isPending ? 'Submitting...' : 'Submit Leave Application'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Total Leave Balance</span>
                      <span>{totalLeaveBalance} days</span>
                    </div>
                    <Progress value={((totalLeaveBalance - usedLeave) / totalLeaveBalance) * 100} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Used This Year</span>
                      <span>{usedLeave} days</span>
                    </div>
                    <Progress value={(usedLeave / totalLeaveBalance) * 100} className="bg-red-100" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Remaining</span>
                      <span>{totalLeaveBalance - usedLeave} days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Holidays</CardTitle>
                </CardHeader>
                <CardContent>
                  {holidaysLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : holidays && holidays.length > 0 ? (
                    <div className="space-y-3">
                      {holidays.slice(0, 3).map((holiday: any) => (
                        <div key={holiday.id} className="flex justify-between items-center">
                          <span className="text-sm">{holiday.name}</span>
                          <Badge variant="outline">{format(new Date(holiday.date), 'MMM dd')}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No upcoming holidays
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="balance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {balanceLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <LoadingSpinner size="sm" />
                  </CardContent>
                </Card>
              ))
            ) : (
              leaveBalance?.map((balance) => {
                const typeKey = balance.leave_type?.name?.toLowerCase().replace(' ', '_') || 'other';
                return (
              <Card key={balance.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className={`w-4 h-4 rounded-full ${leaveTypeColors[typeKey as keyof typeof leaveTypeColors] || 'bg-gray-500'}`} />
                    {balance.leave_type?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{balance.remaining_days}</div>
                  <p className="text-sm text-muted-foreground">days available</p>
                  <Progress 
                    value={balance.allocated_days > 0 ? (balance.remaining_days / balance.allocated_days) * 100 : 0} 
                    className="mt-3" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {balance.used_days} days used this year
                  </p>
                </CardContent>
              </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Leave History</CardTitle>
              <CardDescription>
                View all your previous leave applications and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <LoadingSpinner size="sm" />
              ) : leaveHistory && leaveHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveHistory.map((leave: any) => (
                      <TableRow key={leave.id}>
                        <TableCell className="font-medium">{leave.leave_type?.name}</TableCell>
                        <TableCell>
                          {format(new Date(leave.start_date), 'MMM dd')} - {format(new Date(leave.end_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>{leave.days_count}</TableCell>
                        <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(leave.status)}
                            <Badge className={getStatusBadge(leave.status)}>
                              {leave.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{format(new Date(leave.applied_at), 'MMM dd, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No leave applications found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}