"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"
import { getStudentSubmissions, ProjectSubmission } from "@/lib/projectSubmissions"
import { getStudentProjectDeadlines, getStudentFeedback, getStudentMeetings } from "@/app/admin/supervisordashboard/lib/data"
import { StudentProjectDeadline } from "@/app/admin/supervisordashboard/lib/types"

interface SupervisorInfo {
  id: string
  name: string
  reference_number: string
  department: string
  email: string
  assignment_type?: 'individual' | 'group'
  group_name?: string
  group_id?: string
}

interface ProjectInfo {
  title: string
  currentPhase: string
  status: string
  progress: number
  startDate: string | null
  dueDate: string | null
}

interface Activity {
  id: string
  type: 'submission' | 'feedback' | 'meeting' | 'deadline' | 'document'
  title: string
  description: string
  timestamp: string
  relatedId?: string
  icon: string
  iconBg: string
}

const DashboardTab: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [supervisor, setSupervisor] = useState<SupervisorInfo | null>(null)
  const [studentName, setStudentName] = useState("")
  const [studentId, setStudentId] = useState<string | null>(null)
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
    title: "No Project Found",
    currentPhase: "Not Started",
    status: "Not Started",
    progress: 0,
    startDate: null,
    dueDate: null
  })
  const [deadlines, setDeadlines] = useState<StudentProjectDeadline[]>([])
  const [feedback, setFeedback] = useState<any[]>([])
  const [meetings, setMeetings] = useState<any[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([])
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true)
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          console.error("No user found")
          setLoading(false)
          return
        }
        
        setStudentId(user.id)
        
        // Get student profile
        const { data: studentProfile, error: studentError } = await supabase
          .from('profiles')
          .select('full_name, reference_number')
          .eq('id', user.id)
          .single()
        
        if (studentError) {
          console.error("Error fetching student profile:", studentError)
        } else if (studentProfile) {
          setStudentName(studentProfile.full_name)
        }
        
        // Get supervisor information from both individual and group assignments
        let supervisorInfo = null
        
        // 1. First check for individual assignment
        const { data: individualRelationship, error: individualError } = await supabase
          .from('student_supervisor_relationships_view')
          .select('supervisor_id, supervisor_name, supervisor_reference, department')
          .eq('student_id', user.id)
          .eq('status', 'active')
          .single()
        
        if (individualError && individualError.code !== 'PGRST116') {
          console.error("Error fetching individual supervisor relationship:", individualError)
        } else if (individualRelationship) {
          supervisorInfo = {
            ...individualRelationship,
            assignment_type: 'individual' as const
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
                  full_name,
                  reference_number,
                  department
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
              supervisor_name: supervisor.full_name,
              supervisor_reference: supervisor.reference_number,
              department: supervisor.department,
              assignment_type: 'group' as const,
              group_name: group.name,
              group_id: group.id
            }
          }
        }
        
        // 3. If we found supervisor info, get their email and set the state
        if (supervisorInfo) {
          const { data: supervisorProfile, error: supervisorError } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', supervisorInfo.supervisor_id)
            .single()
            
          let supervisorEmail = ""
          if (supervisorError) {
            console.error("Error fetching supervisor email:", supervisorError)
          } else if (supervisorProfile) {
            supervisorEmail = supervisorProfile.email || ""
          }
          
          setSupervisor({
            id: supervisorInfo.supervisor_id,
            name: supervisorInfo.supervisor_name,
            reference_number: supervisorInfo.supervisor_reference,
            department: supervisorInfo.department,
            email: supervisorEmail,
            assignment_type: supervisorInfo.assignment_type,
            group_name: (supervisorInfo as any).group_name,
            group_id: (supervisorInfo as any).group_id
          })
        }
        
        // Get project submissions
        await fetchProjectData(user.id)
        
        // Get project deadlines
        const deadlinesData = await getStudentProjectDeadlines(user.id)
        setDeadlines(deadlinesData)
        
        // Get feedback from supervisor
        const feedbackData = await getStudentFeedback(user.id)
        setFeedback(feedbackData)
        console.log("Fetched feedback:", feedbackData)
        
        // Get upcoming meetings
        const meetingsData = await getStudentMeetings(user.id)
        setMeetings(meetingsData)
        console.log("Fetched meetings:", meetingsData)
        
        // Get student submissions
        const submissionsData = await getStudentSubmissions(user.id)
        setSubmissions(submissionsData)
        console.log("Fetched submissions:", submissionsData)
        
        // Generate activities from all data sources
        generateActivities(submissionsData, feedbackData, meetingsData, deadlinesData, supervisorInfo?.supervisor_name || "Supervisor")
        
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchUserData()
  }, [])
  
  // Function to fetch project data
  const fetchProjectData = async (userId: string) => {
    try {
      // Get submissions for this student
      const submissionsData = await getStudentSubmissions(userId)
      
      if (!submissionsData || submissionsData.length === 0) {
        return
      }
      
      // Find the most recent submission of each type
      const latestSubmissions = new Map<string, ProjectSubmission>()
      submissionsData.forEach(submission => {
        const existing = latestSubmissions.get(submission.project_type)
        if (!existing || 
            (submission.submitted_at && existing.submitted_at && 
             new Date(submission.submitted_at) > new Date(existing.submitted_at))) {
          latestSubmissions.set(submission.project_type, submission)
        }
      })
      
      // Define milestone order
      const milestoneOrder: Array<'proposal' | 'literature' | 'methodology' | 'implementation' | 'thesis'> = [
        'proposal', 'literature', 'methodology', 'implementation', 'thesis'
      ]
      
      // Find approved milestones
      const approvedMilestones: ProjectSubmission[] = []
      let currentPhase = "Not Started"
      let currentPhaseStatus = "Not Started"
      let projectTitle = "No Project Found"
      
      milestoneOrder.forEach((type, index) => {
        const submission = latestSubmissions.get(type)
        
        if (submission) {
          if (submission.status === 'approved') {
            approvedMilestones.push(submission)
            
            // If this is the proposal, set the project title
            if (type === 'proposal') {
              projectTitle = submission.title || "Untitled Project"
            }
            
            // Set the next milestone as the current phase
            if (index < milestoneOrder.length - 1) {
              currentPhase = getMilestoneTitle(milestoneOrder[index + 1])
              
              // Check if there's a submission for the next phase
              const nextSubmission = latestSubmissions.get(milestoneOrder[index + 1])
              if (nextSubmission && nextSubmission.status) {
                currentPhaseStatus = nextSubmission.status
              } else {
                currentPhaseStatus = "Not Started"
              }
            } else {
              currentPhase = "Completed"
              currentPhaseStatus = "Completed"
            }
          } else if (!currentPhase || currentPhase === "Not Started") {
            currentPhase = getMilestoneTitle(type)
            currentPhaseStatus = (submission.status as string) || "Pending"
          }
        } else if (currentPhase === "Not Started" && index > 0) {
          const prevType = milestoneOrder[index - 1]
          const prevSubmission = latestSubmissions.get(prevType)
          
          if (prevSubmission && prevSubmission.status === 'approved') {
            currentPhase = getMilestoneTitle(type)
            currentPhaseStatus = "Not Started"
          }
        }
      })
      
      // Calculate progress
      const progress = Math.round((approvedMilestones.length / milestoneOrder.length) * 100)
      
      // Get start date from first approved submission (usually proposal)
      let startDate = null
      if (approvedMilestones.length > 0) {
        const firstApproved = approvedMilestones[0]
        if (firstApproved.reviewed_at) {
          startDate = firstApproved.reviewed_at
        }
      }
      
      // Calculate due date (5 months from start date)
      let dueDate = null
      if (startDate) {
        const dueDateObj = new Date(startDate)
        dueDateObj.setMonth(dueDateObj.getMonth() + 5)
        dueDate = dueDateObj.toISOString()
      }
      
      // Update project info
      setProjectInfo({
        title: projectTitle,
        currentPhase,
        status: currentPhaseStatus,
        progress,
        startDate,
        dueDate
      })
      
    } catch (error) {
      console.error("Error fetching project data:", error)
    }
  }
  
  // Helper function to get milestone title
  const getMilestoneTitle = (type: string): string => {
    switch (type) {
      case 'proposal': return 'Project Proposal';
      case 'literature': return 'Literature Review';
      case 'methodology': return 'Methodology Chapter';
      case 'implementation': return 'Implementation & Results';
      case 'thesis': return 'Final Thesis';
      default: return 'Unknown Milestone';
    }
  }

  // Helper function to try parsing comments (assuming they are JSON)
  const tryParseComments = (comments: string | null): string => {
    if (!comments) return "No feedback provided.";
    try {
      const parsed = JSON.parse(comments);
      
      // Handle array of comment sections
      if (Array.isArray(parsed)) {
        // Get the first section or a summary
        const firstSection = parsed[0];
        if (firstSection && firstSection.content) {
          return firstSection.content;
        }
        // Fallback to concatenating the first few sections
        return parsed.slice(0, 2)
          .map(section => section.content || "")
          .filter(content => content)
          .join(" | ");
      }
      
      // Handle object with content field
      if (parsed.content) {
        return parsed.content;
      }
      
      // Handle object with comments field
      if (parsed.comments) {
        return parsed.comments;
      }
      
      // Fallback to stringifying the object
      return JSON.stringify(parsed).substring(0, 150) + "...";
    } catch (e) {
      // If not JSON, return as is (truncated if too long)
      return comments.length > 150 ? comments.substring(0, 150) + "..." : comments;
    }
  };

  // Helper function to get project type title
  const getProjectTypeTitle = (type: string): string => {
    switch (type) {
      case 'proposal': return 'Project Proposal';
      case 'literature': return 'Literature Review';
      case 'methodology': return 'Methodology Chapter';
      case 'implementation': return 'Implementation & Results';
      case 'thesis': return 'Final Thesis';
      default: return 'Unknown Project Type';
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "Not set"
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  // Format date and time for display
  const formatDateTime = (dateTimeString: string): string => {
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  // Generate activities from different data sources
  const generateActivities = (
    submissions: ProjectSubmission[], 
    feedbackItems: any[], 
    meetingItems: any[], 
    deadlineItems: StudentProjectDeadline[],
    supervisorName: string
  ) => {
    const allActivities: Activity[] = [];
    
    // Add submission activities
    submissions.forEach(submission => {
      allActivities.push({
        id: `submission-${submission.id}`,
        type: 'submission',
        title: 'Document Uploaded',
        description: `You uploaded "${submission.title || getProjectTypeTitle(submission.project_type)}"`,
        timestamp: submission.submitted_at || new Date().toISOString(),
        relatedId: submission.id,
        icon: 'fas fa-file-upload',
        iconBg: 'bg-blue-100 text-blue-600'
      });
    });
    
    // If no submissions, add a mock document upload activity
    if (submissions.length === 0) {
      allActivities.push({
        id: 'document-upload-mock',
        type: 'document',
        title: 'Document Uploaded',
        description: 'You uploaded "Project_Proposal_Draft.pdf"',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        icon: 'fas fa-file-upload',
        iconBg: 'bg-blue-100 text-blue-600'
      });
    }
    
    // Add feedback activities
    feedbackItems.forEach(feedback => {
      allActivities.push({
        id: `feedback-${feedback.id}`,
        type: 'feedback',
        title: 'Feedback Received',
        description: `${supervisorName} provided feedback on your ${getProjectTypeTitle(feedback.project_type).toLowerCase()}`,
        timestamp: feedback.created_at,
        relatedId: feedback.id,
        icon: 'fas fa-comment-alt',
        iconBg: 'bg-green-100 text-green-600'
      });
    });
    
    // Add meeting activities
    meetingItems.forEach(meeting => {
      allActivities.push({
        id: `meeting-${meeting.meeting_id}`,
        type: 'meeting',
        title: 'Meeting Scheduled',
        description: `${meeting.title} with ${supervisorName}`,
        timestamp: meeting.created_at,
        relatedId: meeting.meeting_id,
        icon: 'fas fa-calendar-check',
        iconBg: 'bg-purple-100 text-purple-600'
      });
    });
    
    // Add deadline activities
    deadlineItems.forEach(deadline => {
      allActivities.push({
        id: `deadline-${deadline.id}`,
        type: 'deadline',
        title: 'New Deadline Set',
        description: `${getMilestoneTitle(deadline.project_type)} due on ${formatDate(deadline.deadline_date)}`,
        timestamp: deadline.created_at,
        relatedId: deadline.id,
        icon: 'fas fa-calendar-alt',
        iconBg: 'bg-amber-100 text-amber-600'
      });
      
      // Also add deadline reminder for urgent deadlines
      const today = new Date();
      const dueDate = new Date(deadline.deadline_date);
      const diffTime = Math.abs(dueDate.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isPast = dueDate < today;
      const isUrgent = !isPast && diffDays <= 7;
      
      if (isUrgent) {
        allActivities.push({
          id: `reminder-${deadline.id}`,
          type: 'deadline',
          title: 'Deadline Reminder',
          description: `${getMilestoneTitle(deadline.project_type)} due soon`,
          timestamp: new Date().toISOString(), // Current time
          relatedId: deadline.id,
          icon: 'fas fa-exclamation-triangle',
          iconBg: 'bg-amber-100 text-amber-600'
        });
      }
    });
    
    // Sort activities by timestamp (newest first)
    allActivities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Take the 10 most recent activities
    setActivities(allActivities.slice(0, 10));
  };

  // Handle activity click
  const handleActivityClick = (activity: Activity) => {
    // Navigate to the appropriate tab based on activity type
    switch (activity.type) {
      case 'feedback':
        const feedbackTab = document.querySelector('[data-tab="feedback"]') as HTMLButtonElement;
        if (feedbackTab) {
          feedbackTab.click();
        }
        break;
      case 'meeting':
        const meetingsTab = document.querySelector('[data-tab="meetings"]') as HTMLButtonElement;
        if (meetingsTab) {
          meetingsTab.click();
        }
        break;
      case 'submission':
        const submissionsTab = document.querySelector('[data-tab="submit"]') as HTMLButtonElement;
        if (submissionsTab) {
          submissionsTab.click();
        }
        break;
      default:
        // For other types, do nothing
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Project Status Card */}
        <Card className="md:col-span-2">
          <div className="p-6 pb-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium">Current Project Status</h3>
                <p className="text-sm text-gray-500">{projectInfo.title}</p>
              </div>
              <div className={`px-2 py-1 text-white text-xs font-medium rounded-full ${
                projectInfo.status === 'approved' ? 'bg-green-500' :
                projectInfo.status === 'rejected' ? 'bg-red-500' :
                projectInfo.status === 'pending' ? 'bg-amber-500' :
                'bg-gray-500'
              }`}>
                {projectInfo.status === 'approved' ? 'Approved' :
                 projectInfo.status === 'rejected' ? 'Rejected' :
                 projectInfo.status === 'pending' ? 'Under Review' :
                 'Not Started'}
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Project Progress</span>
              <span className="text-sm font-medium">{projectInfo.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${projectInfo.progress}%` }}></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Phase</p>
                <p className="font-medium">{projectInfo.currentPhase}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Supervisor</p>
                <p className="font-medium">{supervisor ? supervisor.name : "Not Assigned"}</p>
                {supervisor && supervisor.assignment_type && (
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      supervisor.assignment_type === 'group' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {supervisor.assignment_type === 'group' ? (
                        <>
                          <i className="fas fa-users mr-1"></i>
                          Group
                        </>
                      ) : (
                        <>
                          <i className="fas fa-user mr-1"></i>
                          Individual
                        </>
                      )}
                    </span>
                    {supervisor.assignment_type === 'group' && supervisor.group_name && (
                      <p className="text-xs text-gray-600 mt-1 font-medium">
                        Group: {supervisor.group_name}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Start Date</p>
                <p className="font-medium">{formatDate(projectInfo.startDate)}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Due Date</p>
                <p className="font-medium">{formatDate(projectInfo.dueDate)}</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t text-sm text-gray-500">
            <i className="fas fa-clock mr-2"></i> Last updated: {new Date().toLocaleString()}
          </div>
        </Card>

        {/* Project Progress Chart */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium">Project Completion</h3>
            <p className="text-sm text-gray-500">Overall progress visualization</p>
          </div>
          <div className="p-6">
            <div className="h-[200px] flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-32 h-32">
                    <circle 
                      className="text-gray-200" 
                      strokeWidth="8" 
                      stroke="currentColor" 
                      fill="transparent" 
                      r="56" 
                      cx="64" 
                      cy="64"
                    />
                    <circle 
                      className="text-blue-600" 
                      strokeWidth="8" 
                      strokeLinecap="round" 
                      stroke="currentColor" 
                      fill="transparent" 
                      r="56" 
                      cx="64" 
                      cy="64"
                      strokeDasharray={`${projectInfo.progress * 3.51}, 351`} 
                      strokeDashoffset="0"
                    />
                  </svg>
                  <span className="absolute text-2xl font-bold text-blue-600">{projectInfo.progress}%</span>
                </div>
                <p className="text-gray-500 text-sm mt-4">Project Milestone Completion</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming Deadlines */}
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Upcoming Deadlines</h3>
            <Button variant="outline" size="sm" className="rounded-md whitespace-nowrap bg-transparent">
              <i className="fas fa-calendar-alt mr-2"></i> View Calendar
            </Button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {deadlines.length > 0 ? deadlines.map((deadline, index) => {
                // Calculate days until due
                const today = new Date();
                const dueDate = new Date(deadline.deadline_date);
                const diffTime = Math.abs(dueDate.getTime() - today.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const isPast = dueDate < today;
                
                // Determine urgency
                const isUrgent = !isPast && diffDays <= 3;
                const isWarning = !isPast && diffDays <= 7 && diffDays > 3;
                
                // Get project type title
                const projectTypeTitle = getMilestoneTitle(deadline.project_type);
                
                // Set color based on urgency
                const colorClass = isUrgent 
                  ? "bg-red-50 border-red-500" 
                  : isWarning 
                  ? "bg-amber-50 border-amber-500" 
                  : "bg-blue-50 border-blue-500";
                
                const iconColorClass = isUrgent 
                  ? "bg-red-100 text-red-500" 
                  : isWarning 
                  ? "bg-amber-100 text-amber-500" 
                  : "bg-blue-100 text-blue-500";
                
                const iconClass = isUrgent 
                  ? "fas fa-exclamation-circle" 
                  : isWarning 
                  ? "fas fa-clock" 
                  : "fas fa-file-alt";
                
                return (
                  <div key={deadline.id} className={`flex items-center p-3 rounded-lg border-l-4 ${colorClass}`}>
                    <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full ${iconColorClass}`}>
                      <i className={`${iconClass} text-lg`}></i>
              </div>
              <div className="ml-4 flex-grow">
                <h4 className="font-medium flex items-center">
                        {projectTypeTitle}
                        {isUrgent && (
                  <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">Urgent</span>
                        )}
                </h4>
                      <p className="text-sm text-gray-500">
                        {isPast 
                          ? `Overdue by ${diffDays} days (${formatDate(deadline.deadline_date)})` 
                          : `Due in ${diffDays} days (${formatDate(deadline.deadline_date)})`
                        }
                      </p>
                      {deadline.description && (
                        <p className="text-xs text-gray-500 mt-1">{deadline.description}</p>
                      )}
              </div>
              <Button variant="outline" size="sm" className="rounded-md whitespace-nowrap bg-transparent">
                <i className="fas fa-arrow-right"></i>
              </Button>
            </div>
                );
              }) : (
                <div className="text-center py-8 text-gray-500">
                  No upcoming deadlines
              </div>
              )}
          </div>
        </div>
      </Card>

      {/* Notifications & Messages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium">Supervisor Notifications</h3>
          </div>
          <div className="p-0">
            <div className="h-[300px] overflow-y-auto">
              <div className="p-6 space-y-4">
                {supervisor ? (
                  <>
                    {/* Display the most recent feedback if available */}
                    {feedback.length > 0 && (
                  <>
                    <div className="flex items-start space-x-4">
                      <div className="h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                        {supervisor.name.split(' ').map(name => name[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium">{supervisor.name}</h4>
                              <span className="text-xs text-gray-500">{formatDate(feedback[0].created_at)}</span>
                            </div>
                            <div className="flex items-center mt-1">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                feedback[0].status === 'approved' ? 'bg-green-500' :
                                feedback[0].status === 'revisions' ? 'bg-amber-500' : 'bg-red-500'
                              }`}></span>
                              <p className="text-sm font-medium">
                                {feedback[0].status === 'approved' ? 'Approved' :
                                 feedback[0].status === 'revisions' ? 'Revisions Required' : 'Rejected'}
                                : {getProjectTypeTitle(feedback[0].project_type)}
                              </p>
                        </div>
                            <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
                              {tryParseComments(feedback[0].comments)}
                        </p>
                        <div className="mt-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="rounded-md whitespace-nowrap bg-transparent"
                                onClick={() => {
                                  // Find the feedback tab button and click it
                                  const feedbackTab = document.querySelector('[data-tab="feedback"]') as HTMLButtonElement;
                                  if (feedbackTab) {
                                    feedbackTab.click();
                                  }
                                }}
                              >
                                <i className="fas fa-eye mr-2"></i> View Full Feedback
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Separator />
                      </>
                    )}

                    {/* Display the most recent meeting if available */}
                    {meetings.length > 0 && (
                    <div className="flex items-start space-x-4">
                      <div className="h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                        {supervisor.name.split(' ').map(name => name[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium">{supervisor.name}</h4>
                            <span className="text-xs text-gray-500">{formatDate(meetings[0].created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">
                            Meeting scheduled: <span className="font-medium">{meetings[0].title}</span> on {formatDateTime(meetings[0].date_time)}
                            {meetings[0].agenda && (
                              <>
                                <br />
                                <span className="text-xs text-gray-500 mt-1 block">
                                  Agenda: {meetings[0].agenda}
                                </span>
                              </>
                            )}
                        </p>
                        <div className="mt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="rounded-md whitespace-nowrap bg-transparent"
                              onClick={() => {
                                // Find the meetings tab button and click it
                                const meetingsTab = document.querySelector('[data-tab="meetings"]') as HTMLButtonElement;
                                if (meetingsTab) {
                                  meetingsTab.click();
                                }
                              }}
                            >
                              <i className="fas fa-calendar-check mr-2"></i> View Meeting Details
                          </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {feedback.length === 0 && meetings.length === 0 && (
                      <div className="text-center py-6 text-gray-500">
                        <p>No notifications from your supervisor yet.</p>
                    </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No supervisor assigned yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium">Recent Activities</h3>
          </div>
          <div className="p-0">
            <div className="h-[300px] overflow-y-auto">
              <div className="p-6">
                <div className="relative">
                  <div className="absolute top-0 bottom-0 left-[15px] w-0.5 bg-gray-200"></div>
                  <ul className="space-y-6">
                    {activities.length > 0 ? (
                      activities.map((activity) => (
                        <li 
                          key={activity.id} 
                          className="relative pl-8 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                          onClick={() => handleActivityClick(activity)}
                        >
                          <span className={`absolute left-0 flex items-center justify-center w-8 h-8 rounded-full ${activity.iconBg}`}>
                            <i className={activity.icon}></i>
                      </span>
                      <div>
                            <h4 className="font-medium">{activity.title}</h4>
                            <p className="text-sm text-gray-500">{activity.description}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatDate(activity.timestamp)}</p>
                      </div>
                    </li>
                      ))
                    ) : (
                      <li className="text-center py-8 text-gray-500">
                        <p>No recent activities</p>
                    </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default DashboardTab
