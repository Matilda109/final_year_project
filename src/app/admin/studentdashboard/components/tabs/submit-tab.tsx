"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { submitProject, uploadProjectDocument } from "@/lib/projectSubmissions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const SubmitTab: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [projectType, setProjectType] = useState("")
  const [projectTitle, setProjectTitle] = useState("")
  const [abstract, setAbstract] = useState("")
  const [keywords, setKeywords] = useState("")
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [supervisorId, setSupervisorId] = useState<string | null>(null)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [supervisorName, setSupervisorName] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Fetch current user and their supervisor
  useEffect(() => {
    const fetchUserAndSupervisor = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          toast.error("User not authenticated")
          return
        }
        
        setStudentId(user.id)
        
        // Get supervisor information from both individual and group assignments
        let supervisorInfo = null
        
        // 1. First check for individual assignment
        const { data: individualRelationship, error: individualError } = await supabase
          .from('student_supervisor_relationships_view')
          .select('supervisor_id, supervisor_name')
          .eq('student_id', user.id)
          .eq('status', 'active')
          .single()
        
        if (individualError && individualError.code !== 'PGRST116') {
          console.error("Error fetching individual supervisor relationship:", individualError)
        } else if (individualRelationship) {
          supervisorInfo = {
            supervisor_id: individualRelationship.supervisor_id,
            supervisor_name: individualRelationship.supervisor_name
          }
        }
        
        // 2. If no individual assignment, check for group assignment
        if (!supervisorInfo) {
          const { data: groupRelationship, error: groupError } = await supabase
            .from('group_members')
            .select(`
              group_id,
              student_groups!inner(
                id,
                name,
                supervisor_id,
                status,
                supervisor:profiles!student_groups_supervisor_id_fkey(
                  id,
                  full_name
                )
              )
            `)
            .eq('student_id', user.id)
            .eq('student_groups.status', 'active')
            .single()
          
          if (groupError && groupError.code !== 'PGRST116') {
            console.error("Error fetching group supervisor relationship:", groupError)
          } else if (groupRelationship && groupRelationship.student_groups) {
            const group = groupRelationship.student_groups as any
            const supervisor = group.supervisor as any
            
            supervisorInfo = {
              supervisor_id: supervisor.id,
              supervisor_name: supervisor.full_name
            }
          }
        }
        
        // 3. Set supervisor information if found
        if (supervisorInfo) {
          setSupervisorId(supervisorInfo.supervisor_id)
          setSupervisorName(supervisorInfo.supervisor_name)
        } else {
          console.error("No supervisor assignment found (individual or group)")
          toast.error("You don't have an assigned supervisor. Please contact your administrator.")
          return
        }
      } catch (error) {
        console.error("Error in fetchUserAndSupervisor:", error)
        toast.error("An error occurred while fetching your information")
      }
    }
    
    fetchUserAndSupervisor()
  }, [])

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!projectType) {
        toast.error("Please select a project type before proceeding.")
        return
      }
      if (!projectTitle) {
        toast.error("Please enter a project title before proceeding.")
        return
      }
    }
    
    if (currentStep === 2 && !documentFile) {
      toast.error("Please upload a document before proceeding.")
      return
    }
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocumentFile(e.target.files[0])
    }
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  const handleSubmitProject = async () => {
    if (!studentId || !supervisorId) {
      toast.error("Missing student or supervisor information")
      return
    }
    
    setIsSubmitting(true)
    
    try {
      // Upload document if provided
      let documentUrl = ''
      if (documentFile) {
        const uploadResult = await uploadProjectDocument(documentFile, studentId)
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || "Failed to upload document")
        }
        documentUrl = uploadResult.url || ''
      }
      
      // Process keywords
      const keywordsArray = keywords
        .split(',')
        .map(keyword => keyword.trim())
        .filter(keyword => keyword.length > 0)
      
      // Submit project
      const submissionData = {
        student_id: studentId,
        supervisor_id: supervisorId,
        project_type: projectType as any,
        title: projectTitle,
        abstract: abstract,
        keywords: keywordsArray,
        document_url: documentUrl
      }
      
      const result = await submitProject(submissionData)
      
      if (!result.success) {
        throw new Error(result.error || "Failed to submit project")
      }
      
      toast.success("Project submitted successfully!")
      
      // Reset form
      setCurrentStep(1)
      setProjectType("")
      setProjectTitle("")
      setAbstract("")
      setKeywords("")
      setDocumentFile(null)
    } catch (error) {
      console.error("Error submitting project:", error)
      if (error instanceof Error) {
        toast.error(`Submission failed: ${error.message}`)
      } else {
        toast.error("Failed to submit project. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderSubmissionStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-type" className="block text-sm font-medium text-gray-700">
                Project Type <span className="text-red-500">*</span>
              </Label>
              <Select value={projectType} onValueChange={setProjectType} required>
                <SelectTrigger className="w-full rounded-md border border-gray-300 shadow-sm focus:border-[#1B365D] focus:outline-none focus:ring-1 focus:ring-[#1B365D] bg-white text-gray-700">
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent className="bg-white text-gray-700">
                  <SelectItem value="proposal">Project Proposal</SelectItem>
                  <SelectItem value="literature">Literature Review</SelectItem>
                  <SelectItem value="methodology">Methodology Chapter</SelectItem>
                  <SelectItem value="implementation">Implementation & Results</SelectItem>
                  <SelectItem value="thesis">Final Thesis & Defense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-title" className="block text-sm font-medium text-gray-700">
                Project Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="project-title"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="Enter your project title"
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1B365D] focus:outline-none focus:ring-1 focus:ring-[#1B365D] text-gray-700 bg-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-abstract" className="block text-sm font-medium text-gray-700">
                Abstract
              </Label>
              <textarea
                id="project-abstract"
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
                placeholder="Provide a brief abstract of your project (max 500 words)"
                className="min-h-[150px] mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1B365D] focus:outline-none focus:ring-1 focus:ring-[#1B365D] text-gray-700 bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-keywords" className="block text-sm font-medium text-gray-700">
                Keywords
              </Label>
              <Input
                id="project-keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Enter keywords separated by commas"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#1B365D] focus:outline-none focus:ring-1 focus:ring-[#1B365D] text-gray-700 bg-white"
              />
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-6">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  setDocumentFile(e.dataTransfer.files[0])
                }
              }}
            >
              <div className="mx-auto w-12 h-12 mb-4 flex items-center justify-center rounded-full bg-blue-50 text-blue-500">
                <i className="fas fa-cloud-upload-alt text-xl"></i>
              </div>
              <h3 className="text-lg font-medium mb-2">
                {documentFile ? `Selected: ${documentFile.name}` : "Drag and drop files here"}
              </h3>
              <p className="text-sm text-gray-500 mb-4">or click to browse from your computer</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.zip"
              />
              <Button
                variant="outline"
                onClick={handleBrowseClick}
                className="rounded-md whitespace-nowrap bg-white text-gray-700 hover:text-blue-600 hover:bg-blue-50"
              >
                <i className="fas fa-file-upload mr-2"></i> Browse Files
              </Button>
              <p className="mt-3 text-xs text-gray-500">Supported formats: PDF, DOCX, ZIP (Max size: 50MB)</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-700 mb-2">
                <i className="fas fa-info-circle mr-2"></i> Submission Guidelines
              </h4>
              <ul className="text-sm text-blue-700 space-y-1 list-disc pl-5">
                <li>Ensure your document follows the required formatting guidelines</li>
                <li>Include all necessary references and citations</li>
                <li>Make sure all images and diagrams are properly labeled</li>
                <li>Check for plagiarism before submission</li>
              </ul>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-4">Project Submission Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Project Title:</span>
                  <span className="font-medium">{projectTitle}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-500">Project Type:</span>
                  <span className="font-medium">{projectType ? projectType.charAt(0).toUpperCase() + projectType.slice(1) : "Not specified"}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-500">Supervisor:</span>
                  <span className="font-medium">{supervisorName || "Not assigned"}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-500">Submission Date:</span>
                  <span className="font-medium">{new Date().toLocaleDateString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-500">File:</span>
                  <span className="font-medium">
                    {documentFile ? `${documentFile.name} (${(documentFile.size / (1024 * 1024)).toFixed(2)} MB)` : "No file uploaded"}
                  </span>
                </div>
                {abstract && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-gray-500">Abstract:</span>
                      <p className="mt-2 text-sm">{abstract}</p>
                    </div>
                  </>
                )}
                {keywords && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-gray-500">Keywords:</span>
                      <span className="font-medium">{keywords}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-yellow-800 text-sm flex items-start">
                <i className="fas fa-exclamation-triangle mr-2 mt-0.5"></i>
                <span>
                  By submitting this project, you confirm that this is your original work and you have followed all
                  academic integrity guidelines.
                </span>
              </p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-1">Submit Project</h2>
        <p className="text-gray-500">Complete the form below to submit your final year project</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Submission Form</CardTitle>
          <CardDescription>Please fill in all required information and upload necessary files</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-8">
            <div className="flex justify-between mb-8">
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep >= 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  1
                </div>
                <div className="ml-3">
                  <p className="font-medium">Basic Information</p>
                  <p className="text-xs text-gray-500">Project details</p>
                </div>
              </div>
              <div className="w-24 h-0.5 bg-gray-200 self-center mx-2"></div>
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep >= 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  2
                </div>
                <div className="ml-3">
                  <p className="font-medium">Document Upload</p>
                  <p className="text-xs text-gray-500">Upload files</p>
                </div>
              </div>
              <div className="w-24 h-0.5 bg-gray-200 self-center mx-2"></div>
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep >= 3 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  3
                </div>
                <div className="ml-3">
                  <p className="font-medium">Review & Submit</p>
                  <p className="text-xs text-gray-500">Final check</p>
                </div>
              </div>
            </div>

            {renderSubmissionStep()}
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4 flex justify-between">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handlePrevStep}
              className="!rounded-button whitespace-nowrap bg-white text-gray-700 hover:text-blue-600 hover:bg-blue-50"
              disabled={isSubmitting}
            >
              <i className="fas fa-arrow-left mr-2"></i> Previous
            </Button>
          )}
          {currentStep < 3 ? (
            <Button 
              onClick={handleNextStep} 
              className="ml-auto !rounded-button whitespace-nowrap"
              disabled={isSubmitting}
            >
              Next <i className="fas fa-arrow-right ml-2"></i>
            </Button>
          ) : (
            <Button
              onClick={handleSubmitProject}
              className="ml-auto bg-green-600 hover:bg-green-700 !rounded-button whitespace-nowrap"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2"></i> Submit Project
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

export default SubmitTab
