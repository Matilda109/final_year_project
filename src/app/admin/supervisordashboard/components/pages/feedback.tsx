"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { 
  getSupervisorStudents, 
  getPendingFeedbackSubmissions,
  submitFeedback,
  getSupervisorFeedback
} from "../../lib/data"
import { FeedbackView } from "../../lib/types"

export function Feedback() {
  // State for form
  const [selectedStudent, setSelectedStudent] = useState<string>("")
  const [selectedSubmission, setSelectedSubmission] = useState<string>("")
  const [feedbackStatus, setFeedbackStatus] = useState<string>("revisions")
  const [comments, setComments] = useState<string>("")
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [documentUrl, setDocumentUrl] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  
  // State for data
  const [user, setUser] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  
  // Fetch user and data
  useEffect(() => {
    const fetchUserAndData = async () => {
      try {
        setLoading(true)
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        setUser(user)
        
        // Get supervisor's students
        const studentsData = await getSupervisorStudents(user.id)
        setStudents(studentsData)
        console.log("Fetched students:", studentsData)
        
        // Get pending submissions
        const submissionsData = await getPendingFeedbackSubmissions(user.id)
        setSubmissions(submissionsData)
        console.log("Fetched submissions:", submissionsData)
        
        // Get recent submissions (feedback history)
        const feedbackData = await getSupervisorFeedback(user.id)
        setRecentSubmissions(feedbackData)
        console.log("Fetched feedback history:", feedbackData)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchUserAndData()
  }, [])
  

  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setDocumentFile(e.target.files[0])
    }
  }
  
  // Handle form submission
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedStudent || !comments) {
      toast.error('Please fill in all required fields')
      return
    }
    
    try {
      setIsSubmitting(true)
      
      // Upload document if provided
      let fileUrl = ""
      if (documentFile) {
        const fileExt = documentFile.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `feedback/${user.id}/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(filePath, documentFile)
        
        if (uploadError) {
          throw uploadError
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('project-files')
          .getPublicUrl(filePath)
        
        fileUrl = publicUrl
      }
      
      // Submit feedback
      const result = await submitFeedback({
        student_id: selectedStudent,
        supervisor_id: user.id,
        project_type: "general",
        status: feedbackStatus as 'approved' | 'revisions' | 'rejected',
        comments,
        document_url: fileUrl || undefined
      })
      
      if (result.success) {
        toast.success('Feedback submitted successfully')
        
        // Reset form
        setSelectedStudent("")
        setFeedbackStatus("revisions")
        setComments("")
        setDocumentFile(null)
        setDocumentUrl("")
        
        // Refresh data
        const feedbackData = await getSupervisorFeedback(user.id)
        setRecentSubmissions(feedbackData)
      } else {
        toast.error(`Failed to submit feedback: ${result.error}`)
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
      toast.error('An error occurred while submitting feedback')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  // Get status badge color
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'revisions':
        return 'bg-orange-100 text-orange-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button className="bg-[#424769] hover:bg-[#2D3250] text-white !rounded-button whitespace-nowrap cursor-pointer transition-all duration-300">
          <i className="fas fa-save mr-2"></i> Save as Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-md">
          <div className="p-6 border-b">
            <h3 className="text-xl font-semibold">Write Detailed Feedback</h3>
          </div>
          {loading ? (
            <div className="p-6 flex justify-center items-center h-64">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-500">Loading data...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback} className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Select Student</label>
                <Select
                  value={selectedStudent}
                  onValueChange={setSelectedStudent}
                >
                <SelectTrigger className="w-full !rounded-button whitespace-nowrap cursor-pointer bg-white border-black">
                  <SelectValue placeholder="Choose student..." />
                </SelectTrigger>
                <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.student_id} value={student.student_id}>
                        {student.student_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-4">
                <label className="block text-sm font-medium text-gray-700 whitespace-nowrap">Status:</label>
                  <Select
                    value={feedbackStatus}
                    onValueChange={setFeedbackStatus}
                  >
                  <SelectTrigger className="!rounded-button whitespace-nowrap cursor-pointer bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="revisions">Revisions Required</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Detailed Comments</label>
                <Textarea 
                  className="min-h-[300px] w-full p-4 bg-white border-2 border-gray-300 rounded-lg resize-vertical focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50" 
                  placeholder="Provide detailed comments outlining the student's mistakes and areas for improvement..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Attach Review Document</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                      <p className="text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PDF, DOCX, or other document formats</p>
                    </div>
                      <input 
                        id="file-upload" 
                        type="file" 
                        className="hidden"
                        onChange={handleFileChange}
                      />
                  </label>
                </div>
                  {documentFile && (
                    <p className="text-sm text-green-600">
                      File selected: {documentFile.name}
                    </p>
                  )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                  type="button"
                variant="outline"
                className="!rounded-button whitespace-nowrap border-gray-300 text-gray-700 bg-white"
              >
                <i className="fas fa-save mr-2"></i> Save Draft
              </Button>
                <Button 
                  type="submit"
                  className="!rounded-button whitespace-nowrap bg-green-600 hover:bg-green-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>Submitting...</>
                  ) : (
                    <><i className="fas fa-paper-plane mr-2"></i> Send Feedback</>
                  )}
              </Button>
            </div>
            </form>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="shadow-md">
            <div className="p-6 border-b">
              <h3 className="font-semibold">Recent Submissions</h3>
            </div>
            <ScrollArea className="h-[300px]">
              <div className="p-3 space-y-3">
                {recentSubmissions.length > 0 ? (
                  recentSubmissions.map((submission, i) => (
                  <div
                      key={submission.id}
                    className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-100">
                      <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {submission.student_name.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <div className="flex justify-between">
                          <h4 className="font-medium">{submission.student_name}</h4>
                          <Badge className={getStatusBadgeClass(submission.status)}>
                            {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                        </Badge>
                      </div>
                        <p className="text-sm text-gray-600 line-clamp-1">
                          {submission.project_title || "Untitled Project"}
                        </p>
                      <p className="text-xs text-gray-500 mt-1">
                        <span className="inline-block px-2 py-1 bg-gray-100 rounded text-gray-600 mr-2">
                            {submission.project_type}
                        </span>
                          {formatDate(submission.created_at)}
                      </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No feedback history found
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  )
}
