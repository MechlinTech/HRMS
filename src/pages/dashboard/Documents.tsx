import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileText,
  Download,
  Upload,
  Calendar,
  DollarSign,
  Target,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function Documents() {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadCategory, setUploadCategory] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Fetch available documents from database
  const { data: availableDocuments, isLoading: documentsLoading } = useQuery({
    queryKey: ['available-documents', user?.id],
    queryFn: async () => {
      // This would fetch from a documents table in real implementation
      // For now, return empty array since no documents table exists
      return [];
    },
    enabled: !!user?.id,
  });

  // Fetch upload requests from database
  const { data: uploadRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['upload-requests', user?.id],
    queryFn: async () => {
      // This would fetch from a document_requests table in real implementation
      // For now, return empty array since no document_requests table exists
      return [];
    },
    enabled: !!user?.id,
  });

  // Fetch recent uploads from database
  const { data: recentUploads, isLoading: uploadsLoading } = useQuery({
    queryKey: ['recent-uploads', user?.id],
    queryFn: async () => {
      // This would fetch from a user_documents table in real implementation
      // For now, return empty array since no user_documents table exists
      return [];
    },
    enabled: !!user?.id,
  });

  const handleDownload = (document: any) => {
    // Simulate download
    console.log('Downloading:', document.name);
    // In real implementation, this would trigger actual file download
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || !uploadCategory) return;

    setIsUploading(true);
    try {
      // Simulate upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reset form
      setSelectedFiles(null);
      setUploadCategory('');
      
      alert('Files uploaded successfully!');
    } catch (error) {
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      available: 'bg-green-100 text-green-800',
      processing: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      approved: 'bg-green-100 text-green-800',
      under_review: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return variants[priority as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Download your documents and upload requested files
        </p>
      </div>

      <Tabs defaultValue="download" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="download">Download Documents</TabsTrigger>
          <TabsTrigger value="upload">Upload Documents</TabsTrigger>
          <TabsTrigger value="requests">Upload Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="download" className="space-y-6">
          {documentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : availableDocuments && availableDocuments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(availableDocuments || []).map((doc: any) => {
                const IconComponent = FileText; // Default icon since we don't have icon field
                return (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <Badge className={getStatusBadge(doc.status)}>
                          {doc.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h3 className="font-semibold text-sm mb-2 line-clamp-2">{doc.name}</h3>
                      <div className="space-y-1 text-xs text-muted-foreground mb-4">
                        <p>Category: {doc.category}</p>
                        <p>Date: {format(new Date(doc.date), 'MMM dd, yyyy')}</p>
                        <p>Size: {doc.size}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleDownload(doc)}
                          disabled={doc.status !== 'available'}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Documents Available</h3>
              <p className="text-muted-foreground">
                Your documents will appear here once they are generated by HR or Finance
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Documents
                </CardTitle>
                <CardDescription>
                  Upload documents as requested by HR or for your records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="category">Document Category</Label>
                    <select
                      id="category"
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select category</option>
                      <option value="personal">Personal Documents</option>
                      <option value="professional">Professional Documents</option>
                      <option value="certificates">Certificates</option>
                      <option value="medical">Medical Documents</option>
                      <option value="tax">Tax Documents</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="files">Select Files</Label>
                    <Input
                      id="files"
                      type="file"
                      multiple
                      onChange={(e) => setSelectedFiles(e.target.files)}
                      className="mt-1"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB per file)
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={!selectedFiles || !uploadCategory || isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Documents'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Uploads</CardTitle>
                <CardDescription>Your recently uploaded documents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(recentUploads || []).map((upload) => (
                    <div key={upload.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{upload.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(upload.uploadedAt), 'MMM dd, yyyy')} • {upload.size}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusBadge(upload.status)}>
                        {upload.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Upload Requests</CardTitle>
              <CardDescription>
                Documents requested by various departments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <LoadingSpinner size="sm" />
              ) : uploadRequests && uploadRequests.length > 0 ? (
                <div className="space-y-4">
                  {(uploadRequests || []).map((request: any) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{request.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {request.description}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getPriorityBadge(request.priority)}>
                            {request.priority}
                          </Badge>
                          <Badge className={getStatusBadge(request.status)}>
                            {request.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Requested by: {request.requestedBy}</span>
                        <span>Due: {format(new Date(request.dueDate), 'MMM dd, yyyy')}</span>
                      </div>

                      {request.status === 'pending' && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex gap-2">
                            <Input type="file" className="flex-1" />
                            <Button size="sm">
                              <Upload className="h-4 w-4 mr-1" />
                              Upload
                            </Button>
                          </div>
                        </div>
                      )}

                      {request.status === 'completed' && (
                        <Alert className="mt-3">
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            Document uploaded successfully and approved.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No document upload requests at this time
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}