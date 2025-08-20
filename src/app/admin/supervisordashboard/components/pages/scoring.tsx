"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"
import { Loader2, Save, Send, Download, Printer, FileText } from "lucide-react"

export function Scoring() {
  // Simple notification state
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | null; message: string | null }>({ 
    type: null, 
    message: null 
  })
  
  // Show notification function
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setNotification({ type: null, message: null })
    }, 5000)
  }
  const [loading, setLoading] = useState(false)
  interface Student {
    student_id: string;
    student_name: string;
    project_title: string;
    is_group: boolean;
    group_name?: string;
  }

  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [formData, setFormData] = useState({
    projectTitle: "",
    studentName: "",
    studentId: "",
    generalComments: "",
    finalScore: 0,
    criteria: [
      {
        id: 1,
        name: "Compliance to UMAT Standard",
        weight: 20,
        totalMarks: 20,
        subcriteria: [
          { name: "Correctness of preliminaries", maxMarks: 3, marks: 0 },
          { name: "Heading levels and letter numbering", maxMarks: 3, marks: 0 },
          { name: "Text layout", maxMarks: 4, marks: 0 },
          { name: "Authenticity and Correctness of references", maxMarks: 5, marks: 0 },
          { name: "List of all in-text cited references and vice versa", maxMarks: 5, marks: 0 }
        ]
      },
      {
        id: 2,
        name: "Documentation & Report Quality",
        weight: 15,
        totalMarks: 15,
        subcriteria: [
          { name: "Structure and organization", maxMarks: 5, marks: 0 },
          { name: "Clarity and readability", maxMarks: 5, marks: 0 },
          { name: "Technical depth and analysis", maxMarks: 5, marks: 0 }
        ]
      },
      {
        id: 3,
        name: "Clarity of tables and figures",
        weight: 10,
        totalMarks: 10,
        subcriteria: [
          { name: "Headings", maxMarks: 2.5, marks: 0 },
          { name: "Units", maxMarks: 2.5, marks: 0 },
          { name: "Readability", maxMarks: 2.5, marks: 0 },
          { name: "Relevance", maxMarks: 2.5, marks: 0 }
        ]
      },
      {
        id: 4,
        name: "Project Planning & Design",
        weight: 43,
        totalMarks: 43,
        subcriteria: [
          { name: "Clarity of introduction and problem definition", maxMarks: 10, marks: 0 },
          { name: "Clarity of objectives", maxMarks: 5, marks: 0 },
          { name: "Feasibility and scope", maxMarks: 5, marks: 0 },
          { name: "Depth and relevance of literature review", maxMarks: 10, marks: 0 },
          { name: "Appropriateness tools/technologies to be used", maxMarks: 8, marks: 0 },
          { name: "Work plan and timeline", maxMarks: 5, marks: 0 }
        ]
      },
      {
        id: 5,
        name: "Originality & Contribution",
        weight: 12,
        totalMarks: 12,
        subcriteria: [
          { name: "Novelty/Innovation of approach", maxMarks: 7, marks: 0 },
          { name: "Potential impact", maxMarks: 5, marks: 0 }
        ]
      }
    ]
  })

  // Calculate total score
  const calculateTotalScore = () => {
    let total = 0
    formData.criteria.forEach(criterion => {
      let criterionTotal = 0
      criterion.subcriteria.forEach(sub => {
        criterionTotal += sub.marks
      })
      total += criterionTotal
    })
    return total
  }

  // Update marks for a specific subcriterion
  const updateMarks = (criterionId: number, subcriterionIndex: number, value: string | number) => {
    const newFormData = { ...formData }
    const criterionIndex = newFormData.criteria.findIndex(c => c.id === criterionId)
    
    // Ensure value doesn't exceed max marks
    const maxMarks = newFormData.criteria[criterionIndex].subcriteria[subcriterionIndex].maxMarks
    const parsedValue = typeof value === 'string' ? parseFloat(value) || 0 : value
    const validValue = Math.min(parsedValue, maxMarks)
    
    newFormData.criteria[criterionIndex].subcriteria[subcriterionIndex].marks = validValue
    newFormData.finalScore = calculateTotalScore()
    setFormData(newFormData)
  }

  // Fetch students assigned to this supervisor
  const fetchStudents = async () => {
    try {
      setLoading(true)
      
      // Get current user/supervisor ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      // Fetch individual students
      const { data: individualStudents, error: individualError } = await supabase
        .from('student_supervisor_relationships_view')
        .select('student_id, student_name, project_title')
        .eq('supervisor_id', user.id)
      
      // Fetch group students - using a different approach with joins
      const { data: groupStudents, error: groupError } = await supabase
        .rpc('get_supervisor_group_students', { supervisor_uuid: user.id })
      
      if (individualError) {
        console.error('Error fetching individual students:', individualError)
      }
      
      if (groupError) {
        console.error('Error fetching group students:', groupError)
      }
      
      // Format individual students
      const formattedIndividualStudents = (individualStudents || []).map(s => ({
        student_id: s.student_id,
        student_name: s.student_name,
        project_title: s.project_title || 'Individual Project',
        is_group: false
      }))
      
      // Format group students
      const formattedGroupStudents = (groupStudents || []).map(s => ({
        student_id: s.student_id || s.reference_number,
        student_name: s.student_name || s.full_name,
        project_title: s.project_title || 'Group Project',
        group_name: s.group_name,
        is_group: true
      }))
      
      // Combine both types of students
      const allStudents = [
        ...formattedIndividualStudents,
        ...formattedGroupStudents
      ]
      
      console.log('Fetched students:', allStudents)
      setStudents(allStudents)
    } catch (error) {
      console.error('Error fetching students:', error)
      showNotification('error', "Failed to load students. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Handle student selection
  const handleStudentSelect = (studentId: string) => {
    const student = students.find(s => s.student_id === studentId)
    if (student) {
      setSelectedStudent(student)
    }
    
    // Update form with student info
    setFormData(prev => ({
      ...prev,
      studentName: student?.student_name || '',
      studentId: student?.student_id || '',
      projectTitle: student?.project_title || ''
    }))
  }

  // Save assessment
  const saveAssessment = async () => {
    try {
      setLoading(true)
      
      if (!selectedStudent) {
        throw new Error("Please select a student first")
      }
      
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.error('Error getting current user:', userError)
        throw new Error('Could not authenticate user')
      }
      
      const supervisorId = userData.user?.id
      if (!supervisorId) {
        throw new Error('User not authenticated')
      }
      
      // Format criteria scores as a proper JSONB object with keys
      const criteriaScoresObj: Record<string, any> = {}
      formData.criteria.forEach(criterion => {
        criteriaScoresObj[`criterion_${criterion.id}`] = {
          name: criterion.name,
          weight: criterion.weight,
          totalMarks: criterion.subcriteria.reduce((acc, sub) => acc + Number(sub.marks), 0),
          subcriteria: criterion.subcriteria.map(sub => ({
            name: sub.name,
            maxMarks: sub.maxMarks,
            marks: Number(sub.marks)
          }))
        }
      })
      
      // Calculate total score from criteria
      const calculatedTotalScore = formData.criteria.reduce((total, criterion) => {
        const criterionScore = criterion.subcriteria.reduce((acc, sub) => acc + Number(sub.marks), 0)
        return total + criterionScore
      }, 0)
      
      const assessmentData = {
        student_id: formData.studentId,
        project_title: formData.projectTitle || 'Untitled Project',
        total_score: calculatedTotalScore,
        general_comments: formData.generalComments || '',
        criteria_scores: criteriaScoresObj,
        is_group_assessment: selectedStudent.is_group || false,
        group_name: selectedStudent.group_name || null,
        supervisor_id: supervisorId
      }
      
      console.log('Saving assessment data:', JSON.stringify(assessmentData, null, 2))
      
      // First check if this student already has an assessment
      const { data: existingAssessment, error: checkError } = await supabase
        .from('project_assessments')
        .select('id')
        .eq('student_id', formData.studentId)
        .eq('supervisor_id', supervisorId)
        .maybeSingle()
      
      if (checkError) {
        console.error('Error checking existing assessment:', checkError)
      }
      
      let result;
      
      // If assessment exists, update it
      if (existingAssessment?.id) {
        console.log('Updating existing assessment:', existingAssessment.id)
        result = await supabase
          .from('project_assessments')
          .update(assessmentData)
          .eq('id', existingAssessment.id)
          .select()
      } else {
        // Otherwise insert new assessment
        console.log('Creating new assessment')
        result = await supabase
          .from('project_assessments')
          .insert(assessmentData)
          .select()
      }
      
      const { data, error } = result
      
      if (error) {
        console.error('Supabase error details:', error)
        throw new Error(`Database error: ${error.message || 'Unknown error'}`)
      }
      
      if (!data || data.length === 0) {
        throw new Error('No data returned from database')
      }
      
      console.log('Assessment saved successfully:', data)
      showNotification('success', `Assessment ${existingAssessment?.id ? 'updated' : 'saved'} successfully`)
      
      // Reset form for next assessment
      resetForm()
      
    } catch (error: unknown) {
      console.error('Error saving assessment:', error)
      showNotification('error', error instanceof Error ? error.message : "Failed to save assessment")
    } finally {
      setLoading(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setSelectedStudent(null)
    setFormData({
      ...formData,
      studentName: "",
      studentId: "",
      projectTitle: "",
      generalComments: "",
      finalScore: 0,
      criteria: formData.criteria.map(criterion => ({
        ...criterion,
        subcriteria: criterion.subcriteria.map(sub => ({
          ...sub,
          marks: 0
        }))
      }))
    })
  }

  // Generate PDF report
  const generateReport = () => {
    showNotification('success', "Coming Soon: PDF report generation will be available in the next update")
  }

  // Load students on component mount
  useEffect(() => {
    fetchStudents()
  }, [])

  return (
    <div className="p-6 space-y-6">
      {notification.type && (
        <div className={`p-4 mb-4 rounded-md ${notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {notification.type === 'success' ? (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setNotification({ type: null, message: null })}
                  className="inline-flex rounded-md p-1.5 text-gray-500 hover:bg-gray-100 focus:outline-none"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Assessment</h1>
          <p className="text-muted-foreground">
            Score student projects based on the UMAT assessment criteria
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm}>
            New Assessment
          </Button>
          <Button variant="outline" onClick={generateReport}>
            <Printer className="mr-2 h-4 w-4" />
            Print Form
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Selection</CardTitle>
          <CardDescription>
            Select a student to begin the assessment process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="student">Student</Label>
                <Select 
                  onValueChange={handleStudentSelect} 
                  value={selectedStudent?.student_id || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.student_id} value={student.student_id}>
                        {student.student_name} 
                        {student.is_group && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({student.group_name})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="projectTitle">Project Title</Label>
                <Input 
                  id="projectTitle" 
                  value={formData.projectTitle}
                  onChange={(e) => setFormData({...formData, projectTitle: e.target.value})}
                  placeholder="Project title" 
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedStudent && (
        <Card>
          <CardHeader>
            <CardTitle>Project Work Assessment Form</CardTitle>
            <CardDescription>
              University of Mines and Technology - Computer Science of Engineering Department
            </CardDescription>
            <div className="flex justify-between items-center mt-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  Student: {formData.studentName}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  ID: {formData.studentId}
                </Badge>
              </div>
              <Badge className="text-lg">
                Total Score: {formData.finalScore}/100
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-8">
                {formData.criteria.map((criterion) => (
                  <div key={criterion.id} className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-semibold">{criterion.id}. {criterion.name}</h3>
                        <p className="text-sm text-muted-foreground">Weight: {criterion.weight}%</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {criterion.subcriteria.reduce((acc, sub) => acc + sub.marks, 0)}/{criterion.totalMarks}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {criterion.subcriteria.map((sub, subIndex) => (
                        <div key={subIndex} className="flex items-center justify-between p-3 border rounded-md">
                          <div>
                            <p className="font-medium">• {sub.name}</p>
                            <p className="text-xs text-muted-foreground">Max: {sub.maxMarks} marks</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max={sub.maxMarks}
                              step="0.5"
                              value={sub.marks}
                              onChange={(e) => updateMarks(criterion.id, subIndex, e.target.value)}
                              className="w-16 text-right"
                            />
                            <span className="text-sm">/{sub.maxMarks}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Separator />
                  </div>
                ))}
                
                <div className="space-y-4">
                  <Label htmlFor="comments">General Comments</Label>
                  <Textarea
                    id="comments"
                    placeholder="Enter your general comments and feedback here..."
                    value={formData.generalComments}
                    onChange={(e) => setFormData({...formData, generalComments: e.target.value})}
                    rows={5}
                  />
                </div>
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-xl font-bold">
              Final Score: {formData.finalScore}/100
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForm}>
                Reset
              </Button>
              <Button onClick={saveAssessment} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Assessment
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
