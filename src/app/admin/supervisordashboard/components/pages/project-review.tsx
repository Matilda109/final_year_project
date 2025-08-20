"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { getProjectSubmissions, updateSubmissionStatus } from "../../lib/data"
import { ProjectSubmission } from "../../lib/types"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export function ProjectReview() {
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<ProjectSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [currentSubmission, setCurrentSubmission] = useState<ProjectSubmission | null>(null)
  const [feedback, setFeedback] = useState("")
  const [actionType, setActionType] = useState<'approved' | 'rejected'>('approved')
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Function to generate more elegant avatar styles based on name
  const getAvatarStyle = (name: string) => {
    // List of elegant gradient backgrounds with complementary text colors
    const styles = [
      { bg: 'bg-gradient-to-br from-purple-100 to-blue-200', text: 'text-indigo-800' },
      { bg: 'bg-gradient-to-br from-blue-100 to-cyan-200', text: 'text-blue-800' },
      { bg: 'bg-gradient-to-br from-emerald-100 to-teal-200', text: 'text-emerald-800' },
      { bg: 'bg-gradient-to-br from-orange-100 to-amber-200', text: 'text-orange-800' },
      { bg: 'bg-gradient-to-br from-pink-100 to-rose-200', text: 'text-pink-800' },
      { bg: 'bg-gradient-to-br from-violet-100 to-indigo-200', text: 'text-violet-800' },
      { bg: 'bg-gradient-to-br from-blue-100 to-indigo-200', text: 'text-blue-800' },
      { bg: 'bg-gradient-to-br from-emerald-100 to-green-200', text: 'text-emerald-800' }
    ];
    
    // Generate a simple hash of the name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Get a style from the array based on the hash
    const index = Math.abs(hash) % styles.length;
    return styles[index];
  }
  
  // Function to get initials from name
  const getInitials = (name: string) => {
    if (!name) return '??';
    
    return name.split(' ')
      .filter(part => part.length > 0)
      .slice(0, 2) // Take only first two parts of the name
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }
  
  // Fetch submissions when component mounts
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true)
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          console.error("No user found")
          setLoading(false)
          return
        }
        
        // Get submissions for this supervisor
        const submissionsData = await getProjectSubmissions(user.id)
        setSubmissions(submissionsData)
        setFilteredSubmissions(submissionsData)
      } catch (error) {
        console.error("Error fetching submissions:", error)
        toast.error("Failed to fetch project submissions")
      } finally {
        setLoading(false)
      }
    }
    
    fetchSubmissions()
  }, [])
  
  // Filter submissions when filter or search changes
  useEffect(() => {
    let filtered = [...submissions]
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(submission => submission.status === statusFilter)
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(submission => 
        submission.title.toLowerCase().includes(query) ||
        submission.student_name.toLowerCase().includes(query)
      )
    }
    
    setFilteredSubmissions(filtered)
  }, [statusFilter, searchQuery, submissions])

  const handleProjectSelection = (id: string) => {
    if (selectedProjects.includes(id)) {
      setSelectedProjects(selectedProjects.filter((projectId) => projectId !== id))
    } else {
      setSelectedProjects([...selectedProjects, id])
    }
  }

  const handleSelectAllProjects = () => {
    if (selectedProjects.length === filteredSubmissions.length) {
      setSelectedProjects([])
    } else {
      setSelectedProjects(filteredSubmissions.map((submission) => submission.id))
    }
  }
  
  const openFeedbackDialog = (submission: ProjectSubmission, action: 'approved' | 'rejected') => {
    setCurrentSubmission(submission)
    setActionType(action)
    setFeedback("")
    setFeedbackDialogOpen(true)
  }
  
  const handleBulkAction = (action: 'approved' | 'rejected') => {
    if (selectedProjects.length === 0) return
    
    // For bulk actions, we'll use a simple confirmation
    const confirmMessage = `Are you sure you want to ${action === 'approved' ? 'approve' : 'reject'} ${selectedProjects.length} project${selectedProjects.length > 1 ? 's' : ''}?`
    
    if (window.confirm(confirmMessage)) {
      // Process each selected project
      Promise.all(
        selectedProjects.map(id => 
          updateSubmissionStatus(id, action, action === 'rejected' ? 'Bulk rejection' : undefined)
        )
      ).then(results => {
        const successCount = results.filter(r => r.success).length
        
        if (successCount === selectedProjects.length) {
          toast.success(`Successfully ${action === 'approved' ? 'approved' : 'rejected'} ${successCount} project${successCount !== 1 ? 's' : ''}`)
          
          // Update local state
          setSubmissions(prev => prev.map(submission => 
            selectedProjects.includes(submission.id) 
              ? {...submission, status: action} 
              : submission
          ))
          
          // Clear selection
          setSelectedProjects([])
        } else {
          toast.error(`Failed to ${action === 'approved' ? 'approve' : 'reject'} some projects. Please try again.`)
        }
      })
    }
  }
  
  const handleStatusUpdate = async () => {
    if (!currentSubmission) return
    
    setIsProcessing(true)
    
    try {
      const result = await updateSubmissionStatus(
        currentSubmission.id, 
        actionType, 
        feedback
      )
      
      if (result.success) {
        toast.success(`Project ${actionType === 'approved' ? 'approved' : 'rejected'} successfully`)
        
        // Update local state
        setSubmissions(prev => prev.map(submission => 
          submission.id === currentSubmission.id 
            ? {...submission, status: actionType, feedback} 
            : submission
        ))
        
        // Close dialog
        setFeedbackDialogOpen(false)
      } else {
        throw new Error("Failed to update project status")
      }
    } catch (error) {
      console.error("Error updating project status:", error)
      toast.error(`Failed to ${actionType === 'approved' ? 'approve' : 'reject'} project. Please try again.`)
    } finally {
      setIsProcessing(false)
    }
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-600">Pending</Badge>
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-600">Approved</Badge>
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-600">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Project Review</h2>
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Search projects..."
            className="w-64 !rounded-button bg-white border-black text-black"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 !rounded-button whitespace-nowrap cursor-pointer bg-white border-black text-black">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedProjects.length > 0 && (
        <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
          <p className="text-sm text-gray-600">{selectedProjects.length} projects selected</p>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-600 hover:bg-green-50 !rounded-button whitespace-nowrap cursor-pointer bg-white"
              onClick={() => handleBulkAction('approved')}
            >
              <i className="fas fa-check mr-2"></i> Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-600 hover:bg-red-50 !rounded-button whitespace-nowrap cursor-pointer bg-white"
              onClick={() => handleBulkAction('rejected')}
            >
              <i className="fas fa-times-circle mr-2"></i> Reject
            </Button>
          </div>
        </div>
      )}

      <Card className="shadow-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedProjects.length === filteredSubmissions.length && filteredSubmissions.length > 0}
                    onCheckedChange={handleSelectAllProjects}
                    className="cursor-pointer"
                  />
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Project Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No project submissions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProjects.includes(submission.id)}
                        onCheckedChange={() => handleProjectSelection(submission.id)}
                        className="cursor-pointer"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className={`h-10 w-10 ${getAvatarStyle(submission.student_name).bg} shadow-sm border border-gray-200 rounded-md overflow-hidden`}>
                          <AvatarFallback className={`${getAvatarStyle(submission.student_name).text} font-bold`}>
                            {getInitials(submission.student_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{submission.student_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={submission.title}>
                      {submission.title}
                    </TableCell>
                    <TableCell>
                      {submission.project_type.charAt(0).toUpperCase() + submission.project_type.slice(1)}
                    </TableCell>
                    <TableCell>{new Date(submission.submitted_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {getStatusBadge(submission.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {submission.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-600 hover:bg-green-50 !rounded-button whitespace-nowrap cursor-pointer bg-white"
                              onClick={() => openFeedbackDialog(submission, 'approved')}
                            >
                              <i className="fas fa-check mr-2"></i> Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-600 hover:bg-red-50 !rounded-button whitespace-nowrap cursor-pointer bg-white"
                              onClick={() => openFeedbackDialog(submission, 'rejected')}
                            >
                              <i className="fas fa-times-circle mr-2"></i> Reject
                            </Button>
                          </>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="!rounded-button whitespace-nowrap cursor-pointer bg-white"
                            >
                              <i className="fas fa-ellipsis-v"></i>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {submission.document_url && (
                              <DropdownMenuItem className="cursor-pointer" onClick={() => window.open(submission.document_url, '_blank')}>
                                <i className="fas fa-download mr-2"></i> Download Document
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="cursor-pointer">
                              <i className="fas fa-share mr-2"></i> Share
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-red-600">
                              <i className="fas fa-flag mr-2"></i> Flag Issue
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {filteredSubmissions.length > 0 && (
          <div className="p-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {filteredSubmissions.length} of {submissions.length} projects
            </p>
          </div>
        )}
      </Card>
      
      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approved' ? 'Approve Project' : 'Reject Project'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approved' 
                ? 'Add optional feedback for the student about their project.'
                : 'Please provide feedback explaining why the project was rejected.'}
            </DialogDescription>
          </DialogHeader>
          
          {currentSubmission && (
            <div className="py-4">
              <h3 className="font-medium mb-1">{currentSubmission.title}</h3>
              <p className="text-sm text-gray-500 mb-4">Submitted by {currentSubmission.student_name}</p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="feedback" className="block text-sm font-medium">
                    Feedback {actionType === 'rejected' && <span className="text-red-500">*</span>}
                  </label>
                  <Textarea
                    id="feedback"
                    placeholder={actionType === 'approved' 
                      ? "Great work! Your project meets all requirements..." 
                      : "Your project needs improvement in the following areas..."}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="min-h-[120px]"
                    required={actionType === 'rejected'}
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFeedbackDialogOpen(false)}
              className="!rounded-button whitespace-nowrap bg-white"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              className={`!rounded-button whitespace-nowrap ${
                actionType === 'approved' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              disabled={isProcessing || (actionType === 'rejected' && !feedback)}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                </>
              ) : (
                <>
                  {actionType === 'approved' ? 'Approve Project' : 'Reject Project'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
