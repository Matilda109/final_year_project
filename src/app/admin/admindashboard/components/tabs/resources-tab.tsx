"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Trash2, FileText, File, FilePenLine, FileSpreadsheet, FileImage, Calendar } from "lucide-react"
import { addResource, deleteResource, getAllResources, uploadResourceFile, Resource } from "@/lib/resources"

export default function ResourcesTab() {
  const [activeView, setActiveView] = useState("add")
  const [resourceTitle, setResourceTitle] = useState("")
  const [resourceDescription, setResourceDescription] = useState("")
  const [resourceType, setResourceType] = useState("pdf")
  const [resourceFile, setResourceFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [resourceToDelete, setResourceToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Fetch resources on component mount
  useEffect(() => {
    fetchResources();
  }, []);
  
  const fetchResources = async () => {
    setLoading(true);
    try {
      const resourcesData = await getAllResources();
      setResources(resourcesData);
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast.error("Failed to load resources");
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResourceFile(e.target.files[0]);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resourceTitle || !resourceDescription || !resourceType) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (!resourceFile) {
      toast.error("Please select a file to upload");
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Upload file
      const uploadResult = await uploadResourceFile(resourceFile);
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Failed to upload file");
      }
      
      // Add resource to database
      const resourceData: Resource = {
        title: resourceTitle,
        description: resourceDescription,
        type: resourceType,
        url: uploadResult.url
      };
      
      const result = await addResource(resourceData);
      
      if (!result.success) {
        throw new Error("Failed to add resource to database");
      }
      
      toast.success("Resource added successfully");
      
      // Reset form
      setResourceTitle("");
      setResourceDescription("");
      setResourceType("pdf");
      setResourceFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('resourceUpload') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      // Refresh resource list
      fetchResources();
      
    } catch (error) {
      console.error("Error adding resource:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add resource");
    } finally {
      setSubmitting(false);
    }
  };
  
  const confirmDeleteResource = (id: string) => {
    setResourceToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteResource = async () => {
    if (!resourceToDelete) return;
    
    setDeleting(true);
    try {
      const result = await deleteResource(resourceToDelete);
      if (result.success) {
        toast.success("Resource deleted successfully");
        fetchResources();
      } else {
        throw new Error(result.error || "Failed to delete resource");
      }
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete resource");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setResourceToDelete(null);
    }
  };

  const getIconForResourceType = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'word':
        return <FilePenLine className="h-5 w-5 text-blue-500" />;
      case 'powerpoint':
        return <FileImage className="h-5 w-5 text-orange-500" />;
      case 'excel':
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      case 'other':
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="add" value={activeView} onValueChange={setActiveView}>
        <TabsList className="grid grid-cols-2 w-[400px]">
          <TabsTrigger value="add">Add New Resource</TabsTrigger>
          <TabsTrigger value="manage">Manage Resources</TabsTrigger>
        </TabsList>
        
        <TabsContent value="add" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Resource</CardTitle>
              <CardDescription>
                Add a new resource that will be available to students in their dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resourceTitle">Resource Title</Label>
                  <Input 
                    id="resourceTitle" 
                    placeholder="Enter resource title" 
                    value={resourceTitle}
                    onChange={(e) => setResourceTitle(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="resourceDescription">Description</Label>
                  <Textarea 
                    id="resourceDescription" 
                    placeholder="Enter a brief description" 
                    value={resourceDescription}
                    onChange={(e) => setResourceDescription(e.target.value)}
                    required
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="resourceType">Resource Type</Label>
                  <Select value={resourceType} onValueChange={setResourceType}>
                    <SelectTrigger id="resourceType" className="text-gray-700 border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="pdf" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:bg-blue-50">PDF Document</SelectItem>
                      <SelectItem value="word" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:bg-blue-50">Word Document</SelectItem>
                      <SelectItem value="powerpoint" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:bg-blue-50">Presentation</SelectItem>
                      <SelectItem value="excel" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:bg-blue-50">Spreadsheet</SelectItem>
                      <SelectItem value="other" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:bg-blue-50">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="resourceUpload">Upload File</Label>
                  <Input 
                    id="resourceUpload" 
                    type="file"
                    onChange={handleFileChange}
                    required
                    className="text-gray-700 border-gray-300 bg-white"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-[#424769] hover:bg-[#2D3250] text-white !rounded-button transition-all duration-300" 
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Add Resource</span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="manage" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Resources</CardTitle>
              <CardDescription>View and manage all available resources</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : resources.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No resources available. Add resources to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.map((resource) => (
                      <TableRow key={resource.id}>
                        <TableCell>
                          <div className="flex items-center">
                            {getIconForResourceType(resource.type)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{resource.title}</TableCell>
                        <TableCell>{resource.description}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDeleteResource(resource.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Resource</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this resource? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteResource} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Delete</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 