import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Eye, 
  Edit, 
  Copy, 
  Users, 
  Calendar,
  Target,
  Trash2,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { KRATemplate } from '@/hooks/useKRA'
import type { KRAPermissions } from '@/hooks/useKRAPermissions';
import { useCreateKRATemplate, useUpdateKRATemplate, useTeamMembers, useBulkCreateKRAAssignments, useCreateKRAGoal, useUpdateKRAGoal } from '@/hooks/useKRA';
import { KRATemplateForm } from './KRATemplateForm';
import { KRATemplateDetails } from './KRATemplateDetails';
import { KRAAssignDialog } from './KRAAssignDialog';

interface KRATemplateManagerProps {
  templates: KRATemplate[];
  isLoading: boolean;
  permissions: KRAPermissions;
}

export function KRATemplateManager({ templates, isLoading, permissions }: KRATemplateManagerProps) {
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<KRATemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const createTemplate = useCreateKRATemplate();
  const updateTemplate = useUpdateKRATemplate();
  const { data: teamMembers } = useTeamMembers();
  const bulkAssign = useBulkCreateKRAAssignments();
  const createGoal = useCreateKRAGoal();
  const updateGoal = useUpdateKRAGoal();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateTemplate = async (templateData: Partial<KRATemplate> & { goals?: any[] }) => {
    try {
      const { goals, ...template } = templateData;
      
      // Create template first
      const newTemplate = await createTemplate.mutateAsync({
        ...template,
        created_by: user?.id,
        department_id: user?.department_id,
      });

      // Create goals if provided
      if (goals && goals.length > 0 && newTemplate?.id) {
        for (const goal of goals) {
          // Check required fields: goal_id, strategic_goal_title, smart_goal, weight, target
          const hasRequiredFields = goal.goal_id && 
                                   goal.strategic_goal_title && 
                                   goal.smart_goal && 
                                   goal.weight && 
                                   goal.target;
          
          if (hasRequiredFields) {
            const goalData = {
              ...goal,
              template_id: newTemplate.id,
              id: undefined, // Remove any temporary IDs
              tempId: undefined,
              isNew: undefined,
            };
            
            await createGoal.mutateAsync(goalData);
          }
        }
      }
      
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating template or goals:', error);
      throw error; // Re-throw to let the mutation handle it
    }
  };

  const handleUpdateTemplate = async (templateData: Partial<KRATemplate> & { goals?: any[] }) => {
    if (!selectedTemplate) return;
    
    const { goals, ...template } = templateData;
    
    // Update template first
    await updateTemplate.mutateAsync({
      id: selectedTemplate.id,
      ...template,
    });

    // Handle goals update/create/delete
    if (goals && selectedTemplate.id) {
      
      for (const goal of goals) {
        // Check required fields: goal_id, strategic_goal_title, smart_goal, weight, target
        const hasRequiredFields = goal.goal_id && 
                                 goal.strategic_goal_title && 
                                 goal.smart_goal && 
                                 goal.weight && 
                                 goal.target;
        
        if (hasRequiredFields) {
          if (goal.id && !(goal as any).isNew) {
            // Update existing goal
            await updateGoal.mutateAsync({
              id: goal.id,
              ...goal,
              template_id: selectedTemplate.id,
              tempId: undefined,
              isNew: undefined,
            });
          } else {
            // Create new goal
            await createGoal.mutateAsync({
              ...goal,
              template_id: selectedTemplate.id,
              id: undefined,
              tempId: undefined,
              isNew: undefined,
            });
          }
        } else {
          console.warn('Skipping goal - missing required fields:', {
            goal_id: goal.goal_id,
            strategic_goal_title: goal.strategic_goal_title,
            smart_goal: goal.smart_goal,
            weight: goal.weight,
            target: goal.target
          });
        }
      }
      
      // Note: For now, we'll skip deleting goals to avoid data loss
      // In a production system, you'd want to implement soft deletes or
      // proper goal deletion handling
    }
    
    setIsEditDialogOpen(false);
    setSelectedTemplate(null);
  };

  const handlePublishTemplate = async (templateId: string, selectedEmployees: string[], dueDate: string) => {
    const assignments = selectedEmployees.map(employeeId => ({
      template_id: templateId,
      employee_id: employeeId,
      assigned_by: user?.id,
      due_date: dueDate,
      status: 'assigned' as const,
    }));

    await bulkAssign.mutateAsync(assignments);
    
    // Update template status to active
    await updateTemplate.mutateAsync({
      id: templateId,
      status: 'active',
    });
    
    setIsAssignDialogOpen(false);
    setSelectedTemplate(null);
  };

  const handleDuplicateTemplate = async (template: KRATemplate) => {
    const duplicatedTemplate = {
      template_name: `${template.template_name} (Copy)`,
      description: template.description,
      evaluation_period_start: template.evaluation_period_start,
      evaluation_period_end: template.evaluation_period_end,
      status: 'draft' as const,
      total_weight: template.total_weight,
    };

    const newTemplate = await createTemplate.mutateAsync(duplicatedTemplate);
    
    // Note: Goals would need to be duplicated separately
    // This would require additional API calls to copy the goals
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {permissions.canCreateTemplates && !permissions.isReadOnly && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          )}
        </div>
      </div>

      {/* Templates Grid */}
      {templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.template_name}</CardTitle>
                    <CardDescription className="mt-1">
                      {template.description || 'No description'}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(template.status)}>
                    {template.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(template.evaluation_period_start), 'MMM dd')} - {format(new Date(template.evaluation_period_end), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <span>{template.goals?.length || 0} goals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Weight: {template.total_weight}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setIsViewDialogOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  
                  {permissions.canEditTemplates && !permissions.isReadOnly && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}

                  {template.status === 'draft' && permissions.canAssignKRA && !permissions.isReadOnly && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsAssignDialogOpen(true);
                      }}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Publish
                    </Button>
                  )}

                  {permissions.canCreateTemplates && !permissions.isReadOnly && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicateTemplate(template)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No KRA Templates</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Create your first KRA template to start managing your team's key result areas.
            </p>
            {permissions.canCreateTemplates && !permissions.isReadOnly && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Template
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create KRA Template</DialogTitle>
            <DialogDescription>
              Create a new KRA template with goals and evaluation criteria for your team.
            </DialogDescription>
          </DialogHeader>
          <KRATemplateForm
            onSubmit={handleCreateTemplate}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createTemplate.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit KRA Template</DialogTitle>
            <DialogDescription>
              Modify the KRA template details and goals.
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <KRATemplateForm
              template={selectedTemplate}
              onSubmit={handleUpdateTemplate}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedTemplate(null);
              }}
              isLoading={updateTemplate.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Template Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>KRA Template Details</DialogTitle>
            <DialogDescription>
              View the complete KRA template with all goals and evaluation criteria.
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <KRATemplateDetails
              template={selectedTemplate}
              onClose={() => {
                setIsViewDialogOpen(false);
                setSelectedTemplate(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Template Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Publish to Team Members</DialogTitle>
            <DialogDescription>
              Select team members to assign this KRA template and set a due date.
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <KRAAssignDialog
              template={selectedTemplate}
              teamMembers={teamMembers || []}
              onAssign={handlePublishTemplate}
              onCancel={() => {
                setIsAssignDialogOpen(false);
                setSelectedTemplate(null);
              }}
              isLoading={bulkAssign.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
