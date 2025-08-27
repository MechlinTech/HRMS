import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useAssets, 
  useAssetAssignments, 
  useAssetCategories, 
  useAvailableAssets,
  useCreateAssetAssignment,
  useCreateAsset,
  useAllEmployees,
  useUpdateAsset,
  useDeleteAsset,
  useUpdateAssetAssignment,
  useDeleteAssetAssignment
} from '@/hooks/useEmployees';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { ConfirmDelete } from '@/components/ui/confirm-delete';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Package,
  Plus,
  Search,
  Filter,
  User,
  Monitor,
  Smartphone,
  HardDrive,
  Keyboard,
  Mouse,
  Headphones,
  Eye,
  Calendar as CalendarIcon,
  Edit,
  Trash2
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const assetIcons = {
  laptop: Monitor,
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Smartphone,
  storage: HardDrive,
  keyboard: Keyboard,
  mouse: Mouse,
  headphones: Headphones,
  other: Package
};

const assignmentSchema = z.object({
  asset_id: z.string().min(1, 'Please select an asset'),
  user_id: z.string().min(1, 'Please select an employee'),
  notes: z.string().optional(),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

const assetSchema = z.object({
  asset_tag: z.string().min(1, 'Asset tag is required'),
  name: z.string().min(1, 'Asset name is required'),
  category_id: z.string().min(1, 'Please select a category'),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  purchase_date: z.date().optional(),
  purchase_cost: z.number().min(0, 'Purchase cost must be positive').optional(),
  warranty_expiry: z.date().optional(),
  location: z.string().optional(),
  condition: z.string().min(1, 'Please select condition'),
  notes: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;

export function AssetManagement() {
  const { user } = useAuth();
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: assignments, isLoading: assignmentsLoading } = useAssetAssignments();
  const { data: categories } = useAssetCategories();
  const { data: availableAssets } = useAvailableAssets();
  const { data: employees } = useAllEmployees();
  const createAssignment = useCreateAssetAssignment();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const updateAssignment = useUpdateAssetAssignment();
  const deleteAssignment = useDeleteAssetAssignment();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isCreateAssetDialogOpen, setIsCreateAssetDialogOpen] = useState(false);
  const [isEditAssetDialogOpen, setIsEditAssetDialogOpen] = useState(false);
  const [isEditAssignmentDialogOpen, setIsEditAssignmentDialogOpen] = useState(false);

  const assignmentForm = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      asset_id: '',
      user_id: '',
      notes: '',
    },
  });

  const assetForm = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      asset_tag: '',
      name: '',
      category_id: '',
      brand: '',
      model: '',
      serial_number: '',
      purchase_cost: 0,
      location: '',
      condition: 'good',
      notes: '',
    },
  });

  const filteredAssignments = assignments?.filter(assignment => {
    const matchesSearch = assignment.asset?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.user?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.asset?.asset_tag.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || assignment.asset?.category?.name === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const onAssignmentSubmit = async (data: AssignmentFormData) => {
    if (!user) return;

    createAssignment.mutate({
      asset_id: data.asset_id,
      user_id: data.user_id,
      assigned_by: user.id,
      notes: data.notes,
      assigned_date: new Date().toISOString().split('T')[0],
      is_active: true
    }, {
      onSuccess: () => {
        assignmentForm.reset();
        setIsAssignDialogOpen(false);
      }
    });
  };

  const onAssetSubmit = async (data: AssetFormData) => {
    if (!user) return;

    const assetData = {
      ...data,
      purchase_date: data.purchase_date?.toISOString().split('T')[0],
      warranty_expiry: data.warranty_expiry?.toISOString().split('T')[0],
      current_value: data.purchase_cost || 0,
      status: 'available'
    };

    createAsset.mutate(assetData, {
      onSuccess: () => {
        assetForm.reset();
        setIsCreateAssetDialogOpen(false);
      }
    });
  };

  const handleEditAsset = (asset: any) => {
    setSelectedAsset(asset);
    assetForm.reset({
      asset_tag: asset.asset_tag,
      name: asset.name,
      category_id: asset.category_id,
      brand: asset.brand || '',
      model: asset.model || '',
      serial_number: asset.serial_number || '',
      purchase_date: asset.purchase_date ? new Date(asset.purchase_date) : undefined,
      purchase_cost: asset.purchase_cost || 0,
      warranty_expiry: asset.warranty_expiry ? new Date(asset.warranty_expiry) : undefined,
      location: asset.location || '',
      condition: asset.condition,
      notes: asset.notes || '',
    });
    setIsEditAssetDialogOpen(true);
  };

  const handleEditAssignment = (assignment: any) => {
    setSelectedAssignment(assignment);
    assignmentForm.reset({
      asset_id: assignment.asset_id,
      user_id: assignment.user_id,
      notes: assignment.notes || '',
    });
    setIsEditAssignmentDialogOpen(true);
  };

  const onAssetUpdate = async (data: AssetFormData) => {
    if (!selectedAsset) return;

    const assetData = {
      ...data,
      purchase_date: data.purchase_date?.toISOString().split('T')[0],
      warranty_expiry: data.warranty_expiry?.toISOString().split('T')[0],
      current_value: data.purchase_cost || 0,
    };

    updateAsset.mutate({
      id: selectedAsset.id,
      updates: assetData
    }, {
      onSuccess: () => {
        setIsEditAssetDialogOpen(false);
        setSelectedAsset(null);
        assetForm.reset();
      }
    });
  };

  const onAssignmentUpdate = async (data: AssignmentFormData) => {
    if (!selectedAssignment) return;

    updateAssignment.mutate({
      id: selectedAssignment.id,
      updates: {
        asset_id: data.asset_id,
        user_id: data.user_id,
        notes: data.notes,
      }
    }, {
      onSuccess: () => {
        setIsEditAssignmentDialogOpen(false);
        setSelectedAssignment(null);
        assignmentForm.reset();
      }
    });
  };

  const getAssetIcon = (categoryName: string) => {
    const category = categoryName.toLowerCase();
    if (category.includes('laptop') || category.includes('computer')) return assetIcons.laptop;
    if (category.includes('mobile') || category.includes('phone')) return assetIcons.mobile;
    if (category.includes('storage') || category.includes('drive')) return assetIcons.storage;
    if (category.includes('keyboard')) return assetIcons.keyboard;
    if (category.includes('mouse')) return assetIcons.mouse;
    if (category.includes('headphone') || category.includes('audio')) return assetIcons.headphones;
    return assetIcons.other;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      assigned: 'bg-blue-100 text-blue-800',
      available: 'bg-green-100 text-green-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      retired: 'bg-red-100 text-red-800',
    };
    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  const getConditionBadge = (condition: string) => {
    const variants = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      fair: 'bg-yellow-100 text-yellow-800',
      poor: 'bg-orange-100 text-orange-800',
      damaged: 'bg-red-100 text-red-800',
    };
    return variants[condition as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  if (assignmentsLoading) {
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
          <h1 className="text-3xl font-bold tracking-tight">Asset Management</h1>
          <p className="text-muted-foreground">
            Track and manage company assets and assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateAssetDialogOpen} onOpenChange={setIsCreateAssetDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Asset</DialogTitle>
                <DialogDescription>
                  Add a new asset to the company inventory
                </DialogDescription>
              </DialogHeader>
              <Form {...assetForm}>
                <form onSubmit={assetForm.handleSubmit(onAssetSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={assetForm.control}
                      name="asset_tag"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asset Tag *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., LAP-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={assetForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asset Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., MacBook Pro 16-inch" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={assetForm.control}
                      name="category_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories?.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={assetForm.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condition *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select condition" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="excellent">Excellent</SelectItem>
                              <SelectItem value="good">Good</SelectItem>
                              <SelectItem value="fair">Fair</SelectItem>
                              <SelectItem value="poor">Poor</SelectItem>
                              <SelectItem value="damaged">Damaged</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={assetForm.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Apple, Dell, HP" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={assetForm.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., MacBook Pro M3" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={assetForm.control}
                      name="serial_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serial Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Device serial number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={assetForm.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Office Floor 2" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={assetForm.control}
                      name="purchase_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "PPP") : "Pick purchase date"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={assetForm.control}
                      name="purchase_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Cost</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00" 
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={assetForm.control}
                    name="warranty_expiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warranty Expiry</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : "Pick warranty expiry date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={assetForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional information about the asset..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateAssetDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createAsset.isPending}>
                      {createAsset.isPending ? 'Creating...' : 'Create Asset'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Assign Asset
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Asset to Employee</DialogTitle>
                <DialogDescription>
                  Create a new asset assignment record
                </DialogDescription>
              </DialogHeader>
              <Form {...assignmentForm}>
                <form onSubmit={assignmentForm.handleSubmit(onAssignmentSubmit)} className="space-y-4">
                  <FormField
                    control={assignmentForm.control}
                    name="asset_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an asset" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableAssets?.map((asset) => (
                              <SelectItem key={asset.id} value={asset.id}>
                                <div className="flex items-center gap-2">
                                  {React.createElement(getAssetIcon(asset.category?.name || ''), { className: "h-4 w-4" })}
                                  <span>{asset.name} ({asset.asset_tag})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={assignmentForm.control}
                    name="user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an employee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {employees?.map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={employee.avatar_url} />
                                    <AvatarFallback className="text-xs">
                                      {employee.full_name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{employee.full_name} ({employee.employee_id})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={assignmentForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Purpose, project, or additional notes..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createAssignment.isPending}>
                      {createAssignment.isPending ? 'Assigning...' : 'Assign Asset'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
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
                placeholder="Search assets or employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('');
                  setStatusFilter('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Asset Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Assignments</CardTitle>
          <CardDescription>
            All active asset assignments and their details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Assigned Date</TableHead>
                <TableHead>Assigned By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments?.map((assignment) => {
                const IconComponent = getAssetIcon(assignment.asset?.category?.name || '');
                return (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{assignment.asset?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {assignment.asset?.asset_tag} • {assignment.asset?.brand} {assignment.asset?.model}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {assignment.user?.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{assignment.user?.full_name}</div>
                          <div className="text-sm text-muted-foreground">{assignment.user?.employee_id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{assignment.asset?.category?.name}</Badge>
                    </TableCell>
                    <TableCell>{format(new Date(assignment.assigned_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{assignment.assigned_by_user?.full_name}</TableCell>
                    <TableCell>
                      <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setSelectedAssignment(assignment)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Asset Assignment Details</DialogTitle>
                              <DialogDescription>
                                Complete information about this asset assignment
                              </DialogDescription>
                            </DialogHeader>
                            {selectedAssignment && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="font-medium">Asset:</p>
                                    <p className="text-muted-foreground">{selectedAssignment.asset?.name}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Asset Tag:</p>
                                    <p className="text-muted-foreground">{selectedAssignment.asset?.asset_tag}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Brand/Model:</p>
                                    <p className="text-muted-foreground">
                                      {selectedAssignment.asset?.brand} {selectedAssignment.asset?.model}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Category:</p>
                                    <p className="text-muted-foreground">{selectedAssignment.asset?.category?.name}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Assigned To:</p>
                                    <p className="text-muted-foreground">{selectedAssignment.user?.full_name}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Employee ID:</p>
                                    <p className="text-muted-foreground">{selectedAssignment.user?.employee_id}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Assigned Date:</p>
                                    <p className="text-muted-foreground">
                                      {format(new Date(selectedAssignment.assigned_date), 'MMM dd, yyyy')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="font-medium">Assigned By:</p>
                                    <p className="text-muted-foreground">{selectedAssignment.assigned_by_user?.full_name}</p>
                                  </div>
                                </div>
                                
                                {selectedAssignment.notes && (
                                  <div>
                                    <p className="font-medium mb-2">Notes:</p>
                                    <p className="text-muted-foreground text-sm">{selectedAssignment.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditAssignment(assignment)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <ConfirmDelete
                          trigger={(
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          title="Delete Assignment"
                          description="Are you sure you want to delete this asset assignment? This will make the asset available for reassignment."
                          confirmText="Delete Assignment"
                          onConfirm={() => deleteAssignment.mutate(assignment.id)}
                          loading={deleteAssignment.isPending}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Assets</CardTitle>
          <CardDescription>
            Complete inventory of all company assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Brand/Model</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Purchase Info</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets?.map((asset) => {
                const IconComponent = getAssetIcon(asset.category?.name || '');
                return (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{asset.name}</div>
                          <div className="text-sm text-muted-foreground">{asset.asset_tag}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{asset.category?.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{asset.brand}</div>
                        <div className="text-sm text-muted-foreground">{asset.model}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getConditionBadge(asset.condition)}>
                        {asset.condition}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(asset.status)}>
                        {asset.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {asset.purchase_cost && (
                          <div className="font-medium">${asset.purchase_cost.toLocaleString()}</div>
                        )}
                        {asset.purchase_date && (
                          <div className="text-muted-foreground">
                            {format(new Date(asset.purchase_date), 'MMM yyyy')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditAsset(asset)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <ConfirmDelete
                          trigger={(
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          title="Delete Asset"
                          description="Are you sure you want to delete this asset? This action cannot be undone."
                          confirmText="Delete Asset"
                          onConfirm={() => deleteAsset.mutate(asset.id)}
                          loading={deleteAsset.isPending}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Asset Dialog */}
      <Dialog open={isEditAssetDialogOpen} onOpenChange={setIsEditAssetDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update asset information and details
            </DialogDescription>
          </DialogHeader>
          <Form {...assetForm}>
            <form onSubmit={assetForm.handleSubmit(onAssetUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={assetForm.control}
                  name="asset_tag"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Tag *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., LAP-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={assetForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., MacBook Pro 16-inch" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={assetForm.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                          <SelectItem value="damaged">Damaged</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={assetForm.control}
                  name="purchase_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Cost</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00" 
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditAssetDialogOpen(false);
                    setSelectedAsset(null);
                    assetForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateAsset.isPending}>
                  {updateAsset.isPending ? 'Updating...' : 'Update Asset'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={isEditAssignmentDialogOpen} onOpenChange={setIsEditAssignmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset Assignment</DialogTitle>
            <DialogDescription>
              Update asset assignment details
            </DialogDescription>
          </DialogHeader>
          <Form {...assignmentForm}>
            <form onSubmit={assignmentForm.handleSubmit(onAssignmentUpdate)} className="space-y-4">
              <FormField
                control={assignmentForm.control}
                name="asset_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an asset" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableAssets?.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            <div className="flex items-center gap-2">
                              {React.createElement(getAssetIcon(asset.category?.name || ''), { className: "h-4 w-4" })}
                              <span>{asset.name} ({asset.asset_tag})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={assignmentForm.control}
                name="user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees?.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={employee.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {employee.full_name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{employee.full_name} ({employee.employee_id})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={assignmentForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Purpose, project, or additional notes..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditAssignmentDialogOpen(false);
                    setSelectedAssignment(null);
                    assignmentForm.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateAssignment.isPending}>
                  {updateAssignment.isPending ? 'Updating...' : 'Update Assignment'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}