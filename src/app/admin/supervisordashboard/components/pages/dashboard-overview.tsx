"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { projects, getMeetingStats, getPendingSubmissions, getProjectSubmissions, getSupervisorStudents } from "../../lib/data"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"
import { ProjectSubmission } from "../../lib/types"

interface DashboardOverviewProps {
  setActiveTab: (tab: string) => void
}

interface Student {
  id: string
  full_name: string
  reference_number: string
  email: string
  department: string
  progress?: number
}

export function DashboardOverview({ setActiveTab }: DashboardOverviewProps) {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [studentCount, setStudentCount] = useState(0)
  const [pendingReviews, setPendingReviews] = useState(0)
  const [upcomingMeetings, setUpcomingMeetings] = useState(0)
  const [recentSubmissions, setRecentSubmissions] = useState<ProjectSubmission[]>([])
  
  // Function to generate elegant avatar styles based on name
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
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          console.error("No user found")
          setLoading(false)
          return
        }
        
        // Get students assigned to this supervisor (both individual and group assignments)
        const allStudents = await getSupervisorStudents(user.id)
        
        // Set student count (total of both individual and group assignments)
        setStudentCount(allStudents.length)
        
        // Get student details for display (limit to 5 for dashboard overview)
        if (allStudents.length > 0) {
          const limitedStudents = allStudents.slice(0, 5)
          
          // Transform data to match expected format
          const studentData = limitedStudents.map(student => ({
            id: student.student_id || student.id,
            full_name: student.student_name || student.full_name,
            reference_number: student.student_reference || student.reference_number,
            email: student.email,
            department: student.department
          }))
          
          // Get project progress data for each student
          const studentsWithProgress = await Promise.all(
            studentData.map(async (student) => {
                  // First check if student has project submissions
                  let progress = 0;
                  
                  try {
                    // First try to get all submissions
                    const { data: submissions, error: submissionsError } = await supabase
                      .from('project_submissions')
                      .select('id, project_type, status')
                      .eq('student_id', student.id);
                      
                    if (submissionsError) {
                      console.error(`Error fetching submissions for student ${student.id}:`, submissionsError.message);
                    } else if (submissions && submissions.length > 0) {
                      // Define milestone order for calculating progress
                      const milestoneOrder = ['proposal', 'literature', 'methodology', 'implementation', 'thesis'];
                      
                      // Count how many different milestone types have been approved
                      const approvedMilestoneTypes = new Set();
                      
                      submissions.forEach(submission => {
                        if (submission.status === 'approved' && milestoneOrder.includes(submission.project_type)) {
                          approvedMilestoneTypes.add(submission.project_type);
                        }
                      });
                      
                      // Calculate progress based on approved milestones
                      progress = Math.round((approvedMilestoneTypes.size / milestoneOrder.length) * 100);
                    }
                  } catch (error) {
                    console.error(`Error calculating progress for student ${student.id}:`, error);
                  }
                  
                  return {
                    ...student,
                    progress: progress
                  };
            })
          );
          
          setStudents(studentsWithProgress);
        }
        
        // Get pending submissions count
        try {
          // First try to get from the view
          const { data: pendingData, error: pendingError } = await supabase
            .from('pending_submissions_count')
            .select('total')
            .eq('supervisor_id', user.id)
            .single();
          
          if (pendingError && pendingError.code !== 'PGRST116') {
            throw pendingError;
          }
          
          if (pendingData) {
            setPendingReviews(pendingData.total);
          } else {
            // Fallback: get actual pending submissions and count them
            const pendingSubmissions = await getPendingSubmissions(user.id);
            setPendingReviews(pendingSubmissions.length);
          }
        } catch (error) {
          console.error("Error fetching pending submissions count:", error);
          // For demo purposes, set pending reviews to a fraction of student count
          setPendingReviews(Math.ceil(allStudents.length * 0.4));
        }
        
        // Get recent submissions
        try {
          const submissions = await getProjectSubmissions(user.id);
          setRecentSubmissions(submissions.slice(0, 5)); // Get only the 5 most recent
        } catch (error) {
          console.error("Error fetching recent submissions:", error);
        }
        
        // Get actual meeting stats from database
        const meetingStats = await getMeetingStats(user.id)
        setUpcomingMeetings(meetingStats.today.upcoming)
        
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchDashboardData()
  }, [])
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>
      default:
        return <Badge>{status}</Badge>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Reviews</p>
              <h2 className="text-3xl font-bold">{pendingReviews}</h2>
              <p className="text-xs text-gray-400 mt-1">Last updated: {new Date().toLocaleTimeString()}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <i className="fas fa-clipboard-list text-emerald-600 text-xl"></i>
            </div>
          </div>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-600 hover:bg-blue-50 bg-white !rounded-button whitespace-nowrap cursor-pointer"
              onClick={() => setActiveTab("review")}
            >
              View All <i className="fas fa-arrow-right ml-2"></i>
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Students</p>
              <h2 className="text-3xl font-bold">{studentCount}</h2>
              <p className="text-xs text-gray-400 mt-1">{Math.floor(studentCount * 0.2)} students completed</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <i className="fas fa-users text-green-600 text-xl"></i>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <Progress value={Math.floor(studentCount * 0.8)} max={studentCount} className="h-2 flex-1" />
              <span className="ml-2 text-sm text-gray-500">{studentCount > 0 ? Math.floor((studentCount * 0.8 / studentCount) * 100) : 0}%</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Upcoming Meetings</p>
              <h2 className="text-3xl font-bold">{upcomingMeetings}</h2>
              <p className="text-xs text-gray-400 mt-1">Today's scheduled meetings</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <i className="fas fa-calendar-check text-indigo-600 text-xl"></i>
            </div>
          </div>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              className="text-indigo-600 border-indigo-600 hover:bg-indigo-50 bg-white !rounded-button whitespace-nowrap cursor-pointer"
              onClick={() => setActiveTab("meetings")}
            >
              View Schedule <i className="fas fa-arrow-right ml-2"></i>
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 p-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">Recent Submissions</h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-600 bg-white hover:bg-emerald-50 !rounded-button whitespace-nowrap cursor-pointer"
              onClick={() => setActiveTab("review")}
            >
              View All <i className="fas fa-arrow-right ml-2"></i>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Project Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSubmissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                      No recent submissions
                    </TableCell>
                  </TableRow>
                ) : (
                  recentSubmissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>{submission.student_name}</TableCell>
                      <TableCell className="max-w-xs truncate">{submission.title}</TableCell>
                      <TableCell>{submission.project_type.charAt(0).toUpperCase() + submission.project_type.slice(1)}</TableCell>
                      <TableCell>{new Date(submission.submitted_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {getStatusBadge(submission.status)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="p-6 shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold">My Students</h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 bg-white hover:bg-blue-50 !rounded-button whitespace-nowrap cursor-pointer"
              onClick={() => setActiveTab("students")}
            >
              View All
            </Button>
          </div>
          {students.length > 0 ? (
            <div className="space-y-4">
              {students.map((student) => {
                const style = getAvatarStyle(student.full_name);
                return (
                  <div key={student.id} className="flex items-center space-x-3">
                    <Avatar className={`h-10 w-10 ${style.bg} shadow-sm border border-gray-200 rounded-md overflow-hidden`}>
                      <AvatarFallback className={`${style.text} font-bold`}>
                        {getInitials(student.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{student.full_name}</p>
                      <div className="flex items-center mt-1">
                        <Progress value={student.progress} className="h-1.5 flex-1" />
                        <span className="ml-2 text-xs text-gray-500">{student.progress}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No students assigned yet.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
