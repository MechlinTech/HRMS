import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { 
  Save, 
  Send, 
  Target, 
  MessageSquare,
  Calendar,
  CheckCircle,
  User,
  Eye,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import type { KRAAssignment } from '@/hooks/useKRA';
import type { KRAPermissions } from '@/hooks/useKRAPermissions';
import { useKRAAssignmentDetails, useUpdateKRAEvaluation } from '@/hooks/useKRA';

interface KRAManagerEvaluationFormProps {
  assignment: KRAAssignment;
  permissions?: KRAPermissions;
  onClose: () => void;
}

interface ManagerEvaluationData {
  [goalId: string]: {
    manager_evaluation_comments: string;
  };
}

export function KRAManagerEvaluationForm({ assignment, permissions, onClose }: KRAManagerEvaluationFormProps) {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<ManagerEvaluationData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: detailedAssignment, refetch } = useKRAAssignmentDetails(assignment.id);
  const updateEvaluation = useUpdateKRAEvaluation();

  useEffect(() => {
    if (detailedAssignment?.evaluations) {
      const evaluationData: ManagerEvaluationData = {};
      detailedAssignment.evaluations.forEach(evaluation => {
        if (evaluation.goal?.id) {
          evaluationData[evaluation.goal.id] = {
            manager_evaluation_comments: evaluation.manager_evaluation_comments || '',
          };
        }
      });
      setEvaluations(evaluationData);
    }
  }, [detailedAssignment]);

  const handleEvaluationChange = (goalId: string, comments: string) => {
    setEvaluations(prev => ({
      ...prev,
      [goalId]: {
        ...prev[goalId],
        manager_evaluation_comments: comments,
      },
    }));
  };

  const handleSubmitEvaluation = async () => {
    if (!detailedAssignment?.template?.goals) return;

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      
      for (const goal of detailedAssignment.template.goals) {
        const evaluation = evaluations[goal.id];
        const existingEval = detailedAssignment.evaluations?.find(e => e.goal_id === goal.id);
        
        if (evaluation && existingEval) {
          await updateEvaluation.mutateAsync({
            id: existingEval.id,
            manager_evaluation_comments: evaluation.manager_evaluation_comments,
            manager_evaluated_at: now,
            manager_evaluated_by: user?.id,
          });
        }
      }

      // Note: Assignment status update to 'evaluated' would be handled by backend trigger
      
      await refetch();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadOnlyMode = assignment.status !== 'submitted' || permissions?.isReadOnly;
  const isCompleted = assignment.status === 'evaluated' || assignment.status === 'approved';

  if (!detailedAssignment) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Assignment Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{detailedAssignment.template?.template_name}</CardTitle>
              <CardDescription className="mt-1">
                {detailedAssignment.template?.description}
              </CardDescription>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Employee: {assignment.employee?.full_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Assigned: {format(new Date(assignment.assigned_date), 'MMM dd, yyyy')}</span>
                </div>
                {assignment.submitted_at && (
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Submitted: {format(new Date(assignment.submitted_at), 'MMM dd, yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={
                assignment.status === 'submitted' ? 'bg-orange-100 text-orange-800' :
                assignment.status === 'evaluated' ? 'bg-green-100 text-green-800' :
                'bg-blue-100 text-blue-800'
              }>
                {assignment.status?.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </CardHeader>
        {assignment.overall_percentage > 0 && (
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span>Overall Performance</span>
              <span>{assignment.overall_percentage.toFixed(1)}% • {assignment.overall_rating || 'Not rated'}</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Goals Evaluation */}
      <div className="space-y-6">
        {detailedAssignment.template?.goals?.map((goal) => {
          const employeeEval = detailedAssignment.evaluations?.find(e => e.goal_id === goal.id);
          const managerEval = evaluations[goal.id] || {};
          
          return (
            <Card key={goal.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Badge variant="outline">{goal.goal_id}</Badge>
                      {goal.strategic_goal_title}
                    </CardTitle>
                    {goal.category && (
                      <Badge variant="secondary" className="mt-2">
                        {goal.category.name}
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{goal.weight}%</div>
                    <div className="text-xs text-muted-foreground">Weight</div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Goal Details */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">SMART Goal</Label>
                    <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{goal.smart_goal}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Target</Label>
                      <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{goal.target}</p>
                    </div>
                    {goal.dependencies && (
                      <div>
                        <Label className="text-sm font-medium">Dependencies</Label>
                        <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{goal.dependencies}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Employee Performance Selection */}
                {employeeEval?.selected_level && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Employee Selected Performance Level
                    </Label>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Level {employeeEval.selected_level} - {employeeEval.final_rating}</span>
                        <span className="text-sm text-blue-600">
                          {employeeEval.awarded_marks} marks • {employeeEval.awarded_points} points
                        </span>
                      </div>
                      
                      {/* Show all levels for reference */}
                      <div className="grid grid-cols-5 gap-2 mt-3">
                        {[1, 2, 3, 4, 5].map(level => {
                          const marks = goal[`level_${level}_marks` as keyof typeof goal] as string || '';
                          const points = goal[`level_${level}_points` as keyof typeof goal] as number || 0;
                          const rating = goal[`level_${level}_rating` as keyof typeof goal] as string || '';
                          const isSelected = employeeEval.selected_level === level;

                          return (
                            <div
                              key={level}
                              className={`p-2 border rounded text-center text-xs ${
                                isSelected 
                                  ? 'border-blue-500 bg-blue-100' 
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <div className="font-medium">Level {level}</div>
                              <div className="text-muted-foreground">{rating}</div>
                              <div className="mt-1">
                                <div className="whitespace-pre-line">{marks}</div>
                                <div>{points} points</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Employee Comments */}
                {employeeEval?.employee_comments && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Employee Evidence & Comments
                    </Label>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{employeeEval.employee_comments}</p>
                      {employeeEval.employee_submitted_at && (
                        <p className="text-xs text-green-600 mt-2">
                          Submitted on {format(new Date(employeeEval.employee_submitted_at), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Manager Evaluation */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Your Evaluation Comments
                  </Label>
                  <Textarea
                    value={managerEval.manager_evaluation_comments || ''}
                    onChange={(e) => handleEvaluationChange(goal.id, e.target.value)}
                    placeholder="Provide your assessment of the employee's performance, feedback on their evidence, and any additional comments..."
                    rows={4}
                    disabled={isReadOnlyMode}
                    className={isReadOnlyMode ? 'bg-muted' : ''}
                  />
                  {isReadOnlyMode && !managerEval.manager_evaluation_comments && (
                    <p className="text-xs text-muted-foreground">
                      No manager evaluation provided yet.
                    </p>
                  )}
                </div>

                {/* Previous Manager Evaluation (if exists and completed) */}
                {isCompleted && employeeEval?.manager_evaluation_comments && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <Label className="text-sm font-medium text-purple-800">Previous Manager Evaluation</Label>
                    <p className="text-sm mt-1 text-purple-700 whitespace-pre-wrap">
                      {employeeEval.manager_evaluation_comments}
                    </p>
                    {employeeEval.manager_evaluated_at && (
                      <p className="text-xs text-purple-600 mt-2">
                        Evaluated on {format(new Date(employeeEval.manager_evaluated_at), 'MMM dd, yyyy')}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        
        {assignment.status === 'submitted' && !permissions?.isReadOnly && (
          <Button 
            type="button" 
            onClick={handleSubmitEvaluation}
            disabled={isSubmitting}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Submitting...' : 'Complete Evaluation'}
          </Button>
        )}
      </div>

      {isCompleted && (
        <div className="flex items-center justify-center p-6 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-green-800 font-medium">Evaluation Completed</p>
            <p className="text-sm text-green-600">
              {assignment.evaluated_at && `Completed on ${format(new Date(assignment.evaluated_at), 'MMM dd, yyyy')}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
