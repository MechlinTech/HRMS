import React, { useState } from 'react';
import { useAllReferrals, useUpdateReferralStatus } from '@/hooks/useEmployees';
import { useCreateJobPosition, useDepartmentsBasic, useAllJobPositions, useUpdateJobPosition, useDeleteJobPosition } from '@/hooks/useATS';
import { useAuth } from '@/contexts/AuthContext';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ConfirmDelete } from '@/components/ui/confirm-delete';

export function ReferralDashboard() {
  const { user } = useAuth();
  const { data: referrals, isLoading: referralsLoading } = useAllReferrals();
  const updateReferralStatus = useUpdateReferralStatus();
  const { data: departments } = useDepartmentsBasic();
  const createJobPosition = useCreateJobPosition();
  const updateJobPosition = useUpdateJobPosition();
  const deleteJobPosition = useDeleteJobPosition();
  const { data: allPositions } = useAllJobPositions();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedReferral, setSelectedReferral] = useState<any>(null);
  const [newStatus, setNewStatus] = useState('');
  const [hrNotes, setHrNotes] = useState('');
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  // Create Job Position form state
  const [isCreatePositionOpen, setIsCreatePositionOpen] = useState(false);
  const [positionTitle, setPositionTitle] = useState('');
  const [positionDepartmentId, setPositionDepartmentId] = useState('');
  const [positionDescription, setPositionDescription] = useState('');
  const [positionRequirements, setPositionRequirements] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('mid');
  const [employmentType, setEmploymentType] = useState('full_time');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [location, setLocation] = useState('');
  const [isRemote, setIsRemote] = useState(false);
  const [jobStatus, setJobStatus] = useState('open');

  // Positions tab filters and editing
  const [positionsSearch, setPositionsSearch] = useState('');
  const [positionsStatus, setPositionsStatus] = useState<'all' | 'open' | 'closed' | 'on_hold'>('open');
  const [positionsDepartment, setPositionsDepartment] = useState<string>('all');
  const [isEditPositionOpen, setIsEditPositionOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRequirements, setEditRequirements] = useState('');
  const [editExperienceLevel, setEditExperienceLevel] = useState('mid');
  const [editEmploymentType, setEditEmploymentType] = useState('full_time');
  const [editSalaryMin, setEditSalaryMin] = useState('');
  const [editSalaryMax, setEditSalaryMax] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editIsRemote, setEditIsRemote] = useState(false);
  const [editStatus, setEditStatus] = useState<'open' | 'closed' | 'on_hold'>('open');

  const handleCreatePosition = () => {
    if (!user?.id || !positionTitle.trim() || !positionDepartmentId) return;
    createJobPosition.mutate({
      title: positionTitle.trim(),
      department_id: positionDepartmentId,
      description: positionDescription.trim() || null,
      requirements: positionRequirements.trim() || null,
      experience_level: experienceLevel,
      employment_type: employmentType,
      salary_range_min: salaryMin ? Number(salaryMin) : null,
      salary_range_max: salaryMax ? Number(salaryMax) : null,
      location: location.trim() || null,
      is_remote: isRemote,
      status: jobStatus,
      posted_by: user.id,
    }, {
      onSuccess: () => {
        setIsCreatePositionOpen(false);
        setPositionTitle('');
        setPositionDepartmentId('');
        setPositionDescription('');
        setPositionRequirements('');
        setExperienceLevel('mid');
        setEmploymentType('full_time');
        setSalaryMin('');
        setSalaryMax('');
        setLocation('');
        setIsRemote(false);
        setJobStatus('open');
      }
    });
  };

  const filteredReferrals = referrals?.filter(referral => {
    const matchesSearch = referral.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         referral.candidate_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         referral.referred_by_user?.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || referral.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'hired':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'interviewed':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'contacted':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      hired: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      interviewed: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-purple-100 text-purple-800',
      submitted: 'bg-gray-100 text-gray-800',
    };
    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  const handleStatusUpdate = () => {
    if (!selectedReferral || !newStatus) return;

    updateReferralStatus.mutate({
      id: selectedReferral.id,
      status: newStatus,
      hrNotes: hrNotes.trim() || undefined
    }, {
      onSuccess: () => {
        setIsUpdateDialogOpen(false);
        setNewStatus('');
        setHrNotes('');
        setSelectedReferral(null);
      }
    });
  };

  const totalReferrals = referrals?.length || 0;
  const successfulReferrals = referrals?.filter(r => r.status === 'hired').length || 0;
  const pendingReferrals = referrals?.filter(r => ['submitted', 'under_review', 'contacted'].includes(r.status)).length || 0;
  const totalBonusPaid = referrals?.filter(r => r.bonus_paid).reduce((sum, r) => sum + (r.bonus_amount || 0), 0) || 0;

  if (referralsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Referral Dashboard</h1>
        <p className="text-muted-foreground">
          Manage employee referrals and track hiring progress
        </p>
      </div>

      <Tabs defaultValue="referrals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="referrals">All Referrals</TabsTrigger>
          <TabsTrigger value="positions">Open Positions</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalReferrals}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Successful Hires</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{successfulReferrals}</div>
                <p className="text-xs text-muted-foreground">
                  {totalReferrals > 0 ? Math.round((successfulReferrals / totalReferrals) * 100) : 0}% success rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingReferrals}</div>
                <p className="text-xs text-muted-foreground">Awaiting action</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Bonus Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalBonusPaid.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total distributed</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Input
                    placeholder="Search referrals..."
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
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="interviewed">Interviewed</SelectItem>
                      <SelectItem value="hired">Hired</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Referrals</CardTitle>
              <CardDescription>
                Employee referrals and their current status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Referred By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals?.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{referral.candidate_name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {referral.candidate_email}
                          </div>
                          {referral.candidate_phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {referral.candidate_phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{referral.position}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {referral.referred_by_user?.full_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{referral.referred_by_user?.full_name}</div>
                            <div className="text-sm text-muted-foreground">{referral.referred_by_user?.employee_id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(referral.status)}
                          <Badge className={getStatusBadge(referral.status)}>
                            {referral.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            ${(referral.bonus_amount || 0).toLocaleString()}
                          </div>
                          {referral.bonus_amount > 0 && (
                            <div className={`text-xs ${referral.bonus_paid ? 'text-green-600' : 'text-yellow-600'}`}>
                              {referral.bonus_paid ? 'Paid' : 'Pending'}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(referral.created_at), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                asChild={false}
                                onClick={() => setSelectedReferral(referral)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Referral Details</DialogTitle>
                                <DialogDescription>
                                  Complete information about this referral
                                </DialogDescription>
                              </DialogHeader>
                              {selectedReferral && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="font-medium">Candidate:</p>
                                      <p className="text-muted-foreground">{selectedReferral.candidate_name}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">Email:</p>
                                      <p className="text-muted-foreground">{selectedReferral.candidate_email}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">Phone:</p>
                                      <p className="text-muted-foreground">{selectedReferral.candidate_phone || 'Not provided'}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">Position:</p>
                                      <p className="text-muted-foreground">{selectedReferral.position}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">Relationship:</p>
                                      <p className="text-muted-foreground capitalize">{selectedReferral.relationship?.replace('_', ' ')}</p>
                                    </div>
                                    <div>
                                      <p className="font-medium">Referred By:</p>
                                      <p className="text-muted-foreground">{selectedReferral.referred_by_user?.full_name}</p>
                                    </div>
                                  </div>
                                  
                                  {selectedReferral.additional_info && (
                                    <div>
                                      <p className="font-medium mb-2">Additional Information:</p>
                                      <p className="text-muted-foreground text-sm">{selectedReferral.additional_info}</p>
                                    </div>
                                  )}

                                  {selectedReferral.hr_notes && (
                                    <div>
                                      <p className="font-medium mb-2">HR Notes:</p>
                                      <p className="text-muted-foreground text-sm">{selectedReferral.hr_notes}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm"
                                asChild={false}
                                onClick={() => {
                                  setSelectedReferral(referral);
                                  setNewStatus(referral.status);
                                  setHrNotes(referral.hr_notes || '');
                                }}
                              >
                                Update
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Update Referral Status</DialogTitle>
                                <DialogDescription>
                                  Update the status and add HR notes for {selectedReferral?.candidate_name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Status</Label>
                                  <Select value={newStatus} onValueChange={setNewStatus}>
                                    <SelectTrigger className="mt-1">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="submitted">Submitted</SelectItem>
                                      <SelectItem value="under_review">Under Review</SelectItem>
                                      <SelectItem value="contacted">Contacted</SelectItem>
                                      <SelectItem value="interviewed">Interviewed</SelectItem>
                                      <SelectItem value="hired">Hired</SelectItem>
                                      <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label>HR Notes</Label>
                                  <Textarea
                                    value={hrNotes}
                                    onChange={(e) => setHrNotes(e.target.value)}
                                    placeholder="Add notes about the referral process..."
                                    className="mt-1"
                                    rows={3}
                                  />
                                </div>

                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handleStatusUpdate} disabled={updateReferralStatus.isPending}>
                                    {updateReferralStatus.isPending ? 'Updating...' : 'Update Status'}
                                  </Button>
                                </div>
                              </div>
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

        <TabsContent value="positions" className="space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
                <CardDescription>Manage and publish roles employees can refer to</CardDescription>
              </div>
              <Dialog open={isCreatePositionOpen} onOpenChange={setIsCreatePositionOpen}>
                <DialogTrigger asChild>
                  <Button>Create Job Position</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Job Position</DialogTitle>
                    <DialogDescription>Define details for the new position</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Title *</Label>
                        <Input value={positionTitle} onChange={(e) => setPositionTitle(e.target.value)} placeholder="e.g., Senior React Developer" className="mt-1" />
                      </div>
                      <div>
                        <Label>Department *</Label>
                        <Select value={positionDepartmentId} onValueChange={setPositionDepartmentId}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments?.map((d: any) => (
                              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Experience Level</Label>
                        <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="entry">Entry</SelectItem>
                            <SelectItem value="mid">Mid</SelectItem>
                            <SelectItem value="senior">Senior</SelectItem>
                            <SelectItem value="lead">Lead</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Employment Type</Label>
                        <Select value={employmentType} onValueChange={setEmploymentType}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full_time">Full-time</SelectItem>
                            <SelectItem value="part_time">Part-time</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="internship">Internship</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Salary Range Min</Label>
                        <Input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="0" className="mt-1" />
                      </div>
                      <div>
                        <Label>Salary Range Max</Label>
                        <Input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="0" className="mt-1" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Location</Label>
                        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" className="mt-1" />
                      </div>
                      <div className="flex items-center gap-3 pt-6">
                        <Switch checked={isRemote} onCheckedChange={setIsRemote} className="data-[state=unchecked]:bg-gray-300" />
                        <Label className="!mt-0">Remote</Label>
                      </div>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea value={positionDescription} onChange={(e) => setPositionDescription(e.target.value)} rows={3} className="mt-1" placeholder="Role overview, responsibilities, etc." />
                    </div>

                    <div>
                      <Label>Requirements</Label>
                      <Textarea value={positionRequirements} onChange={(e) => setPositionRequirements(e.target.value)} rows={3} className="mt-1" placeholder="Skills, experience, must-haves..." />
                    </div>

                    <div>
                      <Label>Status</Label>
                      <Select value={jobStatus} onValueChange={setJobStatus}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreatePositionOpen(false)}>Cancel</Button>
                      <Button onClick={handleCreatePosition} disabled={!positionTitle.trim() || !positionDepartmentId || createJobPosition.isPending}>
                        {createJobPosition.isPending ? 'Creating...' : 'Create Position'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input placeholder="Search positions..." value={positionsSearch} onChange={(e) => setPositionsSearch(e.target.value)} />
                <Select value={positionsStatus} onValueChange={(v) => setPositionsStatus(v as 'all' | 'open' | 'closed' | 'on_hold')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={positionsDepartment} onValueChange={setPositionsDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments?.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => { setPositionsSearch(''); setPositionsStatus('all'); setPositionsDepartment('all'); }}>Clear</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Positions</CardTitle>
              <CardDescription>Open and closed positions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Posted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allPositions?.filter((p: any) => {
                    const matchSearch = p.title.toLowerCase().includes(positionsSearch.toLowerCase());
                    const matchStatus = positionsStatus === 'all' ? true : p.status === positionsStatus;
                    const matchDept = positionsDepartment === 'all' ? true : (p.department_id === positionsDepartment || p.department?.id === positionsDepartment);
                    return matchSearch && matchStatus && matchDept;
                  }).map((pos: any) => (
                    <TableRow key={pos.id}>
                      <TableCell>
                        <div className="font-medium">{pos.title}</div>
                      </TableCell>
                      <TableCell>{pos.department?.name}</TableCell>
                      <TableCell className="capitalize">{pos.experience_level?.replace('_', ' ')}</TableCell>
                      <TableCell className="capitalize">{pos.employment_type?.replace('_', ' ')}</TableCell>
                      <TableCell>{pos.is_remote ? 'Remote' : (pos.location || '—')}</TableCell>
                      <TableCell>
                        <Badge className={pos.status === 'open' ? 'bg-green-100 text-green-800' : pos.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}>
                          {pos.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(pos.created_at), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4"/>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl">
                              <DialogHeader>
                                <DialogTitle>Position Details</DialogTitle>
                                <DialogDescription>Full details</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-3 text-sm">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="font-medium">Title</p>
                                    <p className="text-muted-foreground">{pos.title}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Department</p>
                                    <p className="text-muted-foreground">{pos.department?.name}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Experience</p>
                                    <p className="text-muted-foreground capitalize">{pos.experience_level?.replace('_',' ')}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Type</p>
                                    <p className="text-muted-foreground capitalize">{pos.employment_type?.replace('_',' ')}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Salary Range</p>
                                    <p className="text-muted-foreground">{(pos.salary_range_min ?? '—')} - {(pos.salary_range_max ?? '—')}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Location</p>
                                    <p className="text-muted-foreground">{pos.is_remote ? 'Remote' : (pos.location || '—')}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Remote</p>
                                    <p className="text-muted-foreground">{pos.is_remote ? 'Yes' : 'No'}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Status</p>
                                    <p className="text-muted-foreground capitalize">{pos.status?.replace('_',' ')}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Posted By</p>
                                    <p className="text-muted-foreground">{pos.posted_by_user?.full_name || '—'}{pos.posted_by_user?.employee_id ? ` (${pos.posted_by_user.employee_id})` : ''}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Created At</p>
                                    <p className="text-muted-foreground">{pos.created_at ? format(new Date(pos.created_at), 'MMM dd, yyyy HH:mm') : '—'}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Updated At</p>
                                    <p className="text-muted-foreground">{pos.updated_at ? format(new Date(pos.updated_at), 'MMM dd, yyyy HH:mm') : '—'}</p>
                                  </div>
                                </div>
                                {pos.description && (
                                  <div>
                                    <p className="font-medium">Description</p>
                                    <p className="text-muted-foreground">{pos.description}</p>
                                  </div>
                                )}
                                {pos.requirements && (
                                  <div>
                                    <p className="font-medium">Requirements</p>
                                    <p className="text-muted-foreground whitespace-pre-line">{pos.requirements}</p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Dialog open={isEditPositionOpen && editingPosition?.id === pos.id} onOpenChange={(open) => { setIsEditPositionOpen(open); if (!open) setEditingPosition(null); }}>
                            <DialogTrigger asChild>
                              <Button size="sm" onClick={() => {
                                setEditingPosition(pos);
                                setEditTitle(pos.title || '');
                                setEditDepartmentId(pos.department_id || '');
                                setEditDescription(pos.description || '');
                                setEditRequirements(pos.requirements || '');
                                setEditExperienceLevel(pos.experience_level || 'mid');
                                setEditEmploymentType(pos.employment_type || 'full_time');
                                setEditSalaryMin(pos.salary_range_min ? String(pos.salary_range_min) : '');
                                setEditSalaryMax(pos.salary_range_max ? String(pos.salary_range_max) : '');
                                setEditLocation(pos.location || '');
                                setEditIsRemote(!!pos.is_remote);
                                setEditStatus(pos.status || 'open');
                              }}>
                                <Edit className="h-4 w-4"/>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Edit Job Position</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label>Title</Label>
                                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1" />
                                  </div>
                                  <div>
                                    <Label>Department</Label>
                                    <Select value={editDepartmentId} onValueChange={setEditDepartmentId}>
                                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {departments?.map((d: any) => (
                                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label>Experience</Label>
                                    <Select value={editExperienceLevel} onValueChange={setEditExperienceLevel}>
                                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="entry">Entry</SelectItem>
                                        <SelectItem value="mid">Mid</SelectItem>
                                        <SelectItem value="senior">Senior</SelectItem>
                                        <SelectItem value="lead">Lead</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label>Type</Label>
                                    <Select value={editEmploymentType} onValueChange={setEditEmploymentType}>
                                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="full_time">Full-time</SelectItem>
                                        <SelectItem value="part_time">Part-time</SelectItem>
                                        <SelectItem value="contract">Contract</SelectItem>
                                        <SelectItem value="internship">Internship</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label>Salary Min</Label>
                                    <Input type="number" value={editSalaryMin} onChange={(e) => setEditSalaryMin(e.target.value)} className="mt-1" />
                                  </div>
                                  <div>
                                    <Label>Salary Max</Label>
                                    <Input type="number" value={editSalaryMax} onChange={(e) => setEditSalaryMax(e.target.value)} className="mt-1" />
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label>Location</Label>
                                    <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="mt-1" />
                                  </div>
                                  <div className="flex items-center gap-3 pt-6">
                                    <Switch checked={editIsRemote} onCheckedChange={setEditIsRemote} className="data-[state=unchecked]:bg-gray-300" />
                                    <Label className="!mt-0">Remote</Label>
                                  </div>
                                </div>
                                <div>
                                  <Label>Description</Label>
                                  <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="mt-1" />
                                </div>
                                <div>
                                  <Label>Requirements</Label>
                                  <Textarea value={editRequirements} onChange={(e) => setEditRequirements(e.target.value)} rows={3} className="mt-1" />
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as 'open' | 'closed' | 'on_hold')}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="open">Open</SelectItem>
                                      <SelectItem value="on_hold">On Hold</SelectItem>
                                      <SelectItem value="closed">Closed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" onClick={() => { setIsEditPositionOpen(false); setEditingPosition(null); }}>Cancel</Button>
                                  <Button onClick={() => {
                                    if (!editingPosition) return;
                                    updateJobPosition.mutate({ id: editingPosition.id, updates: {
                                      title: editTitle.trim(),
                                      department_id: editDepartmentId || null,
                                      description: editDescription.trim() || null,
                                      requirements: editRequirements.trim() || null,
                                      experience_level: editExperienceLevel,
                                      employment_type: editEmploymentType,
                                      salary_range_min: editSalaryMin ? Number(editSalaryMin) : null,
                                      salary_range_max: editSalaryMax ? Number(editSalaryMax) : null,
                                      location: editLocation.trim() || null,
                                      is_remote: editIsRemote,
                                      status: editStatus,
                                    } }, {
                                      onSuccess: () => { setIsEditPositionOpen(false); setEditingPosition(null); }
                                    });
                                  }} disabled={updateJobPosition.isPending}>{updateJobPosition.isPending ? 'Saving...' : 'Save Changes'}</Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <ConfirmDelete
                            trigger={(
                              <Button size="sm" variant="destructive">
                                <Trash2 className="h-4 w-4"/>
                              </Button>
                            )}
                            title="Delete Job Position"
                            description="Are you sure you want to delete this job position? This action cannot be undone."
                            confirmText="Delete Position"
                            onConfirm={() => deleteJobPosition.mutate(pos.id)}
                            loading={deleteJobPosition.isPending}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}