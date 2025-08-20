"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { Loader2, Search, FileText, User, Users, Filter, Download, Eye, Calendar } from "lucide-react"
import { format } from 'date-fns'

interface Assessment {
  id: string;
  student_id: string;
  student_name: string;
  project_title: string;
  total_score: number;
  general_comments: string;
  criteria_scores: Record<string, any>;
  is_group_assessment: boolean;
  group_name: string | null;
  created_at: string;
  supervisor_email: string;
  supervisor_name: string;
}

export default function AssessmentsTab() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [filterType, setFilterType] = useState<string>("all")

  // Fetch all assessments with simplified approach
  const fetchAssessments = async () => {
    try {
      setLoading(true)
      
      console.log('Fetching assessments for admin dashboard...')
      
      // Get current user for logging purposes only
      const { data: userData } = await supabase.auth.getUser()
      console.log('Current user ID:', userData?.user?.id || 'unknown')
      
      // Try using the RPC function first (bypasses RLS)
      console.log('Trying RPC function first...')
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_all_assessments_for_admin')
      
      console.log('RPC function result:', { 
        count: rpcData?.length || 0, 
        firstItem: rpcData?.[0] || null,
        error: rpcError 
      })
      
      // Initialize assessmentData variable to avoid TypeScript errors
      let assessmentData: any[] = [];
      
      // If RPC works, use that data
      if (!rpcError && rpcData && rpcData.length > 0) {
        console.log('Successfully fetched assessments via RPC function')
        assessmentData = rpcData
      } else {
        // Fallback to direct query if RPC fails
        console.log('RPC failed, falling back to direct query...')
        
        const { data: directData, error: directError } = await supabase
          .from('project_assessments')
          .select('*')
          .order('created_at', { ascending: false })
        
        console.log('Direct query result:', { 
          count: directData?.length || 0,
          firstItem: directData?.[0] || null,
          error: directError 
        })
        
        if (directError) {
          console.error('Error fetching assessments:', directError)
          throw new Error(`Failed to fetch assessments: ${directError.message}`)
        }
        
        if (!directData || directData.length === 0) {
          console.log('No assessments found in database')
          setAssessments([])
          setFilteredAssessments([])
          setLoading(false)
          return
        }
        
        // Use the assessments from direct query
        assessmentData = directData
      }
      
      // Get student names from profiles - batch query
      const studentIds = assessmentData.map(assessment => assessment.student_id)
      console.log('Student IDs to fetch:', studentIds)
      const { data: studentData, error: studentError } = await supabase
        .from('profiles')
        .select('id, reference_number, full_name')
        .in('id', studentIds)
      
      if (studentError) {
        console.error('Error fetching student data:', studentError)
      }
      
      // Get supervisor data - batch query
      const supervisorIds = [...new Set(assessmentData.map(assessment => assessment.supervisor_id))]
      const { data: supervisorData, error: supervisorError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', supervisorIds)
      
      if (supervisorError) {
        console.error('Error fetching supervisor data:', supervisorError)
      }
      
      // Map all data together
      const formattedAssessments = assessmentData.map(assessment => {
        const student = studentData?.find(s => s.id === assessment.student_id)
        const supervisor = supervisorData?.find(s => s.id === assessment.supervisor_id)
        
        console.log('Mapping student:', { 
          studentId: assessment.student_id, 
          foundStudent: student, 
          studentName: student?.full_name 
        })
        
        return {
          ...assessment,
          student_name: student?.full_name || 'Unknown Student',
          supervisor_email: supervisor?.email || 'unknown@example.com',
          supervisor_name: supervisor?.full_name || 'Unknown Supervisor'
        }
      })
      
      console.log('Formatted assessments:', { 
        count: formattedAssessments.length,
        firstItem: formattedAssessments[0] || null
      })
      
      setAssessments(formattedAssessments)
      setFilteredAssessments(formattedAssessments)
    } catch (error) {
      console.error('Error fetching assessments:', error)
      // Show a more detailed error message
      alert(`Error loading assessments: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Filter assessments based on search term and filter type
  const filterAssessments = () => {
    let filtered = [...assessments]
    
    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter(assessment => 
        assessment.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assessment.project_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assessment.supervisor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (assessment.group_name && assessment.group_name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    
    // Apply type filter
    if (filterType === "individual") {
      filtered = filtered.filter(assessment => !assessment.is_group_assessment)
    } else if (filterType === "group") {
      filtered = filtered.filter(assessment => assessment.is_group_assessment)
    }
    
    setFilteredAssessments(filtered)
  }

  // View assessment details
  const viewAssessmentDetails = (assessment: Assessment) => {
    setSelectedAssessment(assessment)
    setShowDetails(true)
  }

  // Close details modal
  const closeDetails = () => {
    setShowDetails(false)
    setSelectedAssessment(null)
  }

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch (error) {
      return 'Invalid date'
    }
  }

  // Export assessment as CSV
  const exportAssessment = (assessment: Assessment) => {
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,"
    
    // Header
    csvContent += "Student Name,Student ID,Project Title,Total Score,Submission Date\n"
    
    // Data
    csvContent += `${assessment.student_name},${assessment.student_id},${assessment.project_title},${assessment.total_score},${formatDate(assessment.created_at)}\n\n`
    
    // Criteria scores
    csvContent += "Assessment Criteria,Score\n"
    
    if (assessment.criteria_scores) {
      const criteria = assessment.criteria_scores
      Object.keys(criteria).forEach(key => {
        const criterion = criteria[key]
        csvContent += `${criterion.name},${criterion.totalMarks}\n`
        
        if (criterion.subcriteria) {
          criterion.subcriteria.forEach((sub: any) => {
            csvContent += `  - ${sub.name},${sub.marks}/${sub.maxMarks}\n`
          })
        }
      })
    }
    
    // Comments
    csvContent += `\nGeneral Comments\n${assessment.general_comments || 'No comments provided'}\n`
    
    // Create download link
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Assessment_${assessment.student_id}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Effect to fetch assessments on component mount
  useEffect(() => {
    fetchAssessments()
  }, [])

  // Effect to filter assessments when search term or filter type changes
  useEffect(() => {
    filterAssessments()
  }, [searchTerm, filterType, assessments])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Project Assessments</h2>
          <p className="text-muted-foreground">
            View and manage all project assessments submitted by supervisors
          </p>
        </div>
      </div>

      <Separator />

      {/* Filters and search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] border-2 border-blue-300 bg-blue-50 font-medium">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="font-medium">
              <SelectItem value="all" className="text-blue-700 font-bold">All Assessments</SelectItem>
              <SelectItem value="individual" className="text-indigo-600">Individual</SelectItem>
              <SelectItem value="group" className="text-purple-600">Group</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="default" className="ml-2 bg-blue-500 hover:bg-blue-600 text-white font-medium">
            {filteredAssessments.length} results
          </Badge>
        </div>
        
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search assessments..."
            className="w-full sm:w-[300px] pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Assessments table */}
      <Card>
        <CardHeader className="p-4">
          <CardTitle>Assessment Records</CardTitle>
          <CardDescription>
            Complete list of all project assessments in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No assessments found
            </div>
          ) : (
            <ScrollArea className="h-[600px] w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Project Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell className="font-medium">
                        {assessment.student_name}
                      </TableCell>
                      <TableCell>{assessment.project_title}</TableCell>
                      <TableCell>
                        {assessment.is_group_assessment ? (
                          <Badge variant="secondary" className="flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white font-medium py-1">
                            <Users className="h-3 w-3" />
                            Group
                          </Badge>
                        ) : (
                          <Badge variant="default" className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-1">
                            <User className="h-3 w-3" />
                            Individual
                          </Badge>
                        )}
                        {assessment.group_name && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {assessment.group_name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={Number(assessment.total_score) >= 70 ? "default" : 
                                 Number(assessment.total_score) >= 50 ? "default" : "destructive"}
                          className={`font-medium ${Number(assessment.total_score) >= 70 ? "bg-green-500 hover:bg-green-600" : ""}`}
                        >
                          {assessment.total_score}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {assessment.supervisor_name}
                        <div className="text-xs text-muted-foreground">
                          {assessment.supervisor_email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(assessment.created_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => viewAssessmentDetails(assessment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => exportAssessment(assessment)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Assessment details modal */}
      {showDetails && selectedAssessment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">Assessment Details</CardTitle>
                  <CardDescription>
                    {selectedAssessment.is_group_assessment ? 'Group' : 'Individual'} Assessment for {selectedAssessment.student_name}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={closeDetails}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-6">
                  {/* Header info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-muted-foreground mb-1">Student</h3>
                      <p>{selectedAssessment.student_name} ({selectedAssessment.student_id})</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-muted-foreground mb-1">Project Title</h3>
                      <p>{selectedAssessment.project_title}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-muted-foreground mb-1">Supervisor</h3>
                      <p>{selectedAssessment.supervisor_name}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-muted-foreground mb-1">Submission Date</h3>
                      <p>{formatDate(selectedAssessment.created_at)}</p>
                    </div>
                    {selectedAssessment.is_group_assessment && selectedAssessment.group_name && (
                      <div>
                        <h3 className="font-semibold text-muted-foreground mb-1">Group Name</h3>
                        <p>{selectedAssessment.group_name}</p>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-muted-foreground mb-1">Total Score</h3>
                      <Badge 
                        variant={Number(selectedAssessment.total_score) >= 70 ? "default" : 
                               Number(selectedAssessment.total_score) >= 50 ? "default" : "destructive"}
                        className={`text-lg px-3 py-1 ${Number(selectedAssessment.total_score) >= 70 ? "bg-green-500 hover:bg-green-600" : ""}`}
                      >
                        {selectedAssessment.total_score}%
                      </Badge>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Criteria scores */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Assessment Criteria</h3>
                    <div className="space-y-6">
                      {selectedAssessment.criteria_scores && Object.keys(selectedAssessment.criteria_scores).map((key) => {
                        const criterion = selectedAssessment.criteria_scores[key];
                        return (
                          <div key={key} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium">{criterion.name}</h4>
                              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                Weight: {criterion.weight}%
                              </Badge>
                            </div>
                            <div className="bg-muted rounded-md p-3">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Subcriteria</TableHead>
                                    <TableHead className="text-right">Score</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {criterion.subcriteria && criterion.subcriteria.map((sub: any, index: number) => (
                                    <TableRow key={index}>
                                      <TableCell>{sub.name}</TableCell>
                                      <TableCell className="text-right font-medium">
                                        {sub.marks} / {sub.maxMarks}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow>
                                    <TableCell className="font-bold">Total</TableCell>
                                    <TableCell className="text-right font-bold">
                                      {criterion.totalMarks}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Comments */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">General Comments</h3>
                    <div className="bg-muted rounded-md p-4">
                      {selectedAssessment.general_comments || 'No comments provided'}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-4">
              <Button variant="outline" onClick={closeDetails}>
                Close
              </Button>
              <Button onClick={() => exportAssessment(selectedAssessment)}>
                <Download className="mr-2 h-4 w-4" />
                Export as CSV
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
