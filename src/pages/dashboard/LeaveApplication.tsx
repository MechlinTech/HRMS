import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaveTypes, useLeaveBalance, useLeaveApplications, useCreateLeaveApplication, useEmployeesOnLeave, useUserLeaveSummary, useRecalculateUserBalance } from '@/hooks/useLeave';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Users,
  RefreshCw,
  Calculator,
  TrendingUp
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
  const { data: employeesOnLeave, isLoading: onLeaveLoading } = useEmployeesOnLeave();
  const { data: leaveSummary, isLoading: summaryLoading } = useUserLeaveSummary();
  const createLeaveApplication = useCreateLeaveApplication();
  const recalculateBalance = useRecalculateUserBalance();
  
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
    
    // Use enhanced balance information if available
    const remainingDays = leaveSummary?.success 
      ? leaveSummary.balance?.remaining_days || 0
      : totalLeaveBalance - usedLeave;
    
    // Check tenure and provide appropriate warnings
    const tenureMonths = leaveSummary?.user?.tenure_months || 0;
    const isEligibleForPaidLeaves = leaveSummary?.rules?.eligible_for_paid_leaves;
    
    // Warning for users with < 9 months tenure (all leave will be salary deduction)
    if (tenureMonths < 9 || !isEligibleForPaidLeaves) {
      const shouldProceed = window.confirm(
        `You have ${tenureMonths} months of tenure. Since your tenure is less than 9 months, ` +
        `ALL ${daysRequested} days will be deducted from your salary. ` +
        `Do you want to proceed with this unpaid leave application?`
      );
      if (!shouldProceed) return;
    }
    // Warning for users with paid leave balance but requesting more than available
    else if (daysRequested > remainingDays && remainingDays >= 0) {
      const excessDays = daysRequested - remainingDays;
      const shouldProceed = window.confirm(
        `This request uses your ${remainingDays} available paid leave days plus ${excessDays} additional days. ` +
        `The ${excessDays} excess days will be deducted from your salary. Do you want to proceed?`
      );
      if (!shouldProceed) return;
    }
    // For users with negative balance (already over their limit)
    else if (remainingDays < 0) {
      const shouldProceed = window.confirm(
        `Your leave balance is already negative (${remainingDays} days). ` +
        `All ${daysRequested} requested days will be deducted from your salary. Do you want to proceed?`
      );
      if (!shouldProceed) return;
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
                            const typeKey = type.name.toLowerCase().replace(' ', '_');
                            return (
                            <SelectItem key={type.id} value={typeKey}>
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${leaveTypeColors[typeKey as keyof typeof leaveTypeColors] || 'bg-gray-500'}`} />
                                {type.name}
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Leave Balance
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => recalculateBalance.mutate()}
                    disabled={recalculateBalance.isPending}
                    className="h-8 w-8 p-0"
                  >
                    <RefreshCw className={cn("h-4 w-4", recalculateBalance.isPending && "animate-spin")} />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {summaryLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : leaveSummary?.success ? (
                    <>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Total Leave Balance</span>
                          <span>{leaveSummary.balance?.allocated_days || totalLeaveBalance} days</span>
                        </div>
                        <Progress value={leaveSummary.balance?.allocated_days > 0 ? 
                          ((leaveSummary.balance.allocated_days - (leaveSummary.balance.used_days || 0)) / leaveSummary.balance.allocated_days) * 100 : 0} />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Used This Year</span>
                          <span>{leaveSummary.balance?.used_days || usedLeave} days</span>
                        </div>
                        <Progress 
                          value={leaveSummary.balance?.allocated_days > 0 ? 
                            ((leaveSummary.balance.used_days || 0) / leaveSummary.balance.allocated_days) * 100 : 0} 
                          className="bg-red-100" 
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Remaining</span>
                          <span className={cn(
                            "font-medium",
                            (leaveSummary.balance?.remaining_days || 0) < 0 ? "text-red-600" : "text-green-600"
                          )}>
                            {leaveSummary.balance?.remaining_days || (totalLeaveBalance - usedLeave)} days
                          </span>
                        </div>
                      </div>
                      
                      {/* Enhanced Information */}
                      <div className="border-t pt-3 space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Monthly Rate</span>
                          <span>{leaveSummary.rules?.current_monthly_rate || 0} days/month</span>
                        </div>
                        
                        {leaveSummary.balance?.carry_forward_from_previous_year > 0 && (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Carried Forward</span>
                            <span>{leaveSummary.balance.carry_forward_from_previous_year} days</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Tenure</span>
                          <span>{leaveSummary.user?.tenure_months || 0} months</span>
                        </div>
                        
                        {/* Salary deduction warning for < 9 months tenure */}
                        {leaveSummary.rules?.salary_deduction_warning && (
                          <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                            <AlertCircle className="h-3 w-3" />
                            <span>{leaveSummary.rules.salary_deduction_warning}</span>
                          </div>
                        )}
                        
                        {leaveSummary.rules?.next_credit_date && leaveSummary.rules?.eligible_for_paid_leaves && (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Next Credit</span>
                            <span>{format(new Date(leaveSummary.rules.next_credit_date), 'MMM dd')}</span>
                          </div>
                        )}
                        
                        {!leaveSummary.rules?.can_carry_forward && leaveSummary.balance?.anniversary_reset_date && (
                          <div className="flex items-center gap-1 text-xs text-amber-600">
                            <AlertCircle className="h-3 w-3" />
                            <span>Resets on {format(new Date(leaveSummary.balance.anniversary_reset_date), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    // Fallback to original display
                    <>
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
                    </>
                  )}
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Who's On Leave
                  </CardTitle>
                  <CardDescription>
                    All employees on leave today and upcoming days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {onLeaveLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : employeesOnLeave && employeesOnLeave.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {employeesOnLeave.map((leave: any) => {
                        const isCurrentUser = leave.user?.id === user?.id;
                        return (
                        <div 
                          key={leave.id} 
                          className={`flex items-center gap-3 p-2 rounded-lg border ${
                            isCurrentUser 
                              ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' 
                              : 'bg-white/50'
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={leave.user?.avatar_url} />
                            <AvatarFallback>
                              {leave.user?.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {leave.user?.full_name}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-blue-600 font-semibold">(You)</span>
                              )}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{leave.leave_type?.name}</span>
                              <span>•</span>
                              <span>
                                {format(new Date(leave.start_date), 'MMM dd')} - {format(new Date(leave.end_date), 'MMM dd')}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="text-xs">
                              {leave.days_count} day{leave.days_count !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No employees on leave
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="balance" className="space-y-6">
          {/* Leave Rules Information */}
          {leaveSummary?.success && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Info className="h-5 w-5" />
                  Your Leave Entitlements
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>Current Status:</strong></p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Tenure: {leaveSummary.user?.tenure_months || 0} months</li>
                      <li>Monthly Rate: {leaveSummary.rules?.current_monthly_rate || 0} days/month</li>
                      <li>Can Carry Forward: {leaveSummary.rules?.can_carry_forward ? 'Yes' : 'No'}</li>
                      <li>Leave Applications: Always allowed</li>
                    </ul>
                  </div>
                  <div>
                    <p><strong>Leave Rules:</strong></p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>&lt; 9 months: Can apply (salary deducted)</li>
                      <li>9-11 months: 1 leave/month</li>
                      <li>12+ months: 1.5 leaves/month</li>
                      <li>2+ years: Can carry forward</li>
                    </ul>
                  </div>
                </div>
                {leaveSummary.rules?.salary_deduction_warning && (
                  <Alert className="mt-3 border-orange-200 bg-orange-50">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      <strong>Salary Deduction Notice:</strong> {leaveSummary.rules.salary_deduction_warning}
                    </AlertDescription>
                  </Alert>
                )}
                {leaveSummary.balance?.anniversary_reset_date && !leaveSummary.rules?.can_carry_forward && (
                  <Alert className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your leave balance will reset on {format(new Date(leaveSummary.balance.anniversary_reset_date), 'MMMM dd, yyyy')} 
                      (your work anniversary). Unused leaves will be forfeited.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

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
                      <TableHead>Comments</TableHead>
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
                        <TableCell className="max-w-xs">
                          {leave.comments ? (
                            <div className="text-sm text-gray-600 truncate" title={leave.comments}>
                              {leave.comments}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No comments</span>
                          )}
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