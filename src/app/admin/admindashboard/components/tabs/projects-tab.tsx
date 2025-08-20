"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { addProject, deleteProject, getAllProjects, uploadProjectDocument, uploadProjectImage, RepositoryProject } from "@/lib/projectRepository"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Trash2, Edit, Eye } from "lucide-react"

export default function ProjectsTab() {
  const [activeView, setActiveView] = useState("add")
  const [projectTitle, setProjectTitle] = useState("")
  const [projectAuthor, setProjectAuthor] = useState("")
  const [projectYear, setProjectYear] = useState("2024")
  const [projectDepartment, setProjectDepartment] = useState("")
  const [projectSupervisor, setProjectSupervisor] = useState("")
  const [projectDescription, setProjectDescription] = useState("")
  const [projectTags, setProjectTags] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [projects, setProjects] = useState<RepositoryProject[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [yearFilterManage, setYearFilterManage] = useState("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, []);
  
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const projectsData = await getAllProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'document' | 'image') => {
    if (e.target.files && e.target.files[0]) {
      if (type === 'document') {
        setDocumentFile(e.target.files[0]);
      } else {
        setImageFile(e.target.files[0]);
      }
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectTitle || !projectAuthor || !projectYear || !projectDepartment || !projectSupervisor || !projectDescription) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Process tags
      const tagsArray = projectTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      // Upload document if provided
      let documentUrl = '';
      if (documentFile) {
        const uploadResult = await uploadProjectDocument(documentFile);
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || "Failed to upload document");
        }
        documentUrl = uploadResult.url || '';
      }
      
      // Upload image if provided
      let imageUrl = '';
      if (imageFile) {
        const uploadResult = await uploadProjectImage(imageFile);
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || "Failed to upload image");
        }
        imageUrl = uploadResult.url || '';
      }
      
      // Add project to database
      const projectData: RepositoryProject = {
        title: projectTitle,
        author: projectAuthor,
        supervisor: projectSupervisor,
        year: parseInt(projectYear),
        department: projectDepartment,
        description: projectDescription,
        tags: tagsArray,
        document_url: documentUrl || undefined,
        image_url: imageUrl || undefined
      };
      
      const result = await addProject(projectData);
      
      if (!result.success) {
        throw new Error("Failed to add project to database");
      }
      
      toast.success("Project added successfully");
      
      // Reset form
      setProjectTitle("");
      setProjectAuthor("");
      setProjectYear("2024");
      setProjectDepartment("");
      setProjectSupervisor("");
      setProjectDescription("");
      setProjectTags("");
      setDocumentFile(null);
      setImageFile(null);
      
      // Reset file inputs
      const documentInput = document.getElementById('documentUpload') as HTMLInputElement;
      const imageInput = document.getElementById('imageUpload') as HTMLInputElement;
      if (documentInput) documentInput.value = "";
      if (imageInput) imageInput.value = "";
      
      // Refresh project list
      fetchProjects();
      
    } catch (error) {
      console.error("Error adding project:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add project");
    } finally {
      setSubmitting(false);
    }
  };
  
  const confirmDeleteProject = (id: string) => {
    setProjectToDelete(id);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    
    setDeleting(true);
    try {
      const result = await deleteProject(projectToDelete);
      if (result.success) {
        toast.success("Project deleted successfully");
        fetchProjects();
      } else {
        throw new Error(result.error || "Failed to delete project");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete project");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };
  
  // Filter projects for the manage tab
  const filteredProjects = projects.filter(project => {
    const matchesSearch = searchQuery === "" || 
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.department.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesYear = yearFilterManage === "all" || project.year.toString() === yearFilterManage;
    
    return matchesSearch && matchesYear;
  });
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="add" value={activeView} onValueChange={setActiveView}>
        <TabsList className="grid grid-cols-2 w-[400px]">
          <TabsTrigger value="add">Add New Project</TabsTrigger>
          <TabsTrigger value="manage">Manage Projects</TabsTrigger>
        </TabsList>
        
        <TabsContent value="add" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Project to Repository</CardTitle>
              <CardDescription>
                Add a new past project to be displayed in student or supervisor dashboards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectTitle">Project Title</Label>
                  <Input 
                    id="projectTitle" 
                    placeholder="Enter project title" 
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectAuthor">Author</Label>
                    <Input 
                      id="projectAuthor" 
                      placeholder="Enter author name" 
                      value={projectAuthor}
                      onChange={(e) => setProjectAuthor(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="projectSupervisor">Supervisor</Label>
                    <Input 
                      id="projectSupervisor" 
                      placeholder="Enter supervisor name" 
                      value={projectSupervisor}
                      onChange={(e) => setProjectSupervisor(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectYear">Year</Label>
                    <Select value={projectYear} onValueChange={setProjectYear}>
                      <SelectTrigger id="projectYear" className="text-gray-700 border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="2024" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:bg-blue-50">2024</SelectItem>
                        <SelectItem value="2023" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:bg-blue-50">2023</SelectItem>
                        <SelectItem value="2022" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:bg-blue-50">2022</SelectItem>
                        <SelectItem value="2021" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:bg-blue-50">2021</SelectItem>
                        <SelectItem value="2020" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:bg-blue-50">2020</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="projectDepartment">Department</Label>
                    <Input 
                      id="projectDepartment" 
                      placeholder="Enter department name" 
                      value={projectDepartment}
                      onChange={(e) => setProjectDepartment(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="projectTags">Tags (comma separated)</Label>
                  <Input 
                    id="projectTags" 
                    placeholder="E.g. AI, Machine Learning, Computer Vision" 
                    value={projectTags}
                    onChange={(e) => setProjectTags(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="projectDescription">Project Description</Label>
                  <Textarea 
                    id="projectDescription" 
                    placeholder="Enter project description" 
                    className="min-h-[100px]"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="documentUpload">Project Documentation</Label>
                  <Input 
                    id="documentUpload" 
                    type="file" 
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.zip"
                    onChange={(e) => handleFileChange(e, 'document')}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload project documentation (PDF, Word, PowerPoint, or ZIP files)
                  </p>
                  
                  {documentFile && (
                    <div className="flex items-center mt-2 p-2 bg-blue-50 rounded-md">
                      <div className="flex-1 truncate">
                        <p className="text-sm font-medium">{documentFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setDocumentFile(null);
                          const fileInput = document.getElementById('documentUpload') as HTMLInputElement;
                          if (fileInput) fileInput.value = "";
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="imageUpload">Project Image</Label>
                  <Input 
                    id="imageUpload" 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'image')}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload a cover image for the project (optional)
                  </p>
                  
                  {imageFile && (
                    <div className="flex items-center mt-2 p-2 bg-blue-50 rounded-md">
                      <div className="flex-1 truncate">
                        <p className="text-sm font-medium">{imageFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(imageFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setImageFile(null);
                          const fileInput = document.getElementById('imageUpload') as HTMLInputElement;
                          if (fileInput) fileInput.value = "";
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full bg-[#424769] hover:bg-[#2D3250] text-white !rounded-button transition-all duration-300" 
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding Project...
                      </>
                    ) : "Add Project to Repository"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="manage" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Existing Projects</CardTitle>
              <CardDescription>
                View, edit, or delete projects from the repository
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Select value={yearFilterManage} onValueChange={setYearFilterManage}>
                      <SelectTrigger className="w-[180px] text-gray-700 border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Filter by year" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="all" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:bg-blue-50">All Years</SelectItem>
                        <SelectItem value="2024" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:bg-blue-50">2024</SelectItem>
                        <SelectItem value="2023" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:bg-blue-50">2023</SelectItem>
                        <SelectItem value="2022" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:bg-blue-50">2022</SelectItem>
                        <SelectItem value="2021" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:bg-blue-50">2021</SelectItem>
                        <SelectItem value="2020" className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 focus:bg-blue-50">2020</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input 
                      placeholder="Search projects..." 
                      className="max-w-sm" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={fetchProjects}
                    disabled={loading}
                    className="text-gray-700 border-gray-300 bg-white hover:bg-gray-50 hover:text-blue-600 transition-all duration-200 !rounded-button"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                    ) : (
                      <i className="fas fa-sync-alt text-gray-600"></i>
                    )}
                    <span className="ml-2">Refresh</span>
                  </Button>
                </div>
                
                {loading ? (
                  <div className="py-20 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    <p className="mt-2 text-gray-500">Loading projects...</p>
                  </div>
                ) : filteredProjects.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Author</TableHead>
                          <TableHead>Year</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProjects.map((project) => (
                          <TableRow key={project.id}>
                            <TableCell className="font-medium">{project.title}</TableCell>
                            <TableCell>{project.author}</TableCell>
                            <TableCell>{project.year}</TableCell>
                            <TableCell>{project.department}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => project.id && confirmDeleteProject(project.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="border rounded-md py-10 text-center">
                    <p className="text-gray-500">No projects found</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <div className="flex items-center justify-between w-full">
                <p className="text-sm text-gray-500">
                  Showing {filteredProjects.length} of {projects.length} projects
                </p>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteProject}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 