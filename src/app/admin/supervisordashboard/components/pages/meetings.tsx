"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { format } from "date-fns"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { 
  getMeetingStats, 
  getUpcomingMeetings, 
  getMeetingRequests,
  getSupervisorStudents,
  createMeeting,
  updateMeetingRequestStatus,
  setProjectDeadline,
  getProjectDeadlines,
  updateProjectDeadline,
  deleteProjectDeadline
} from "../../lib/data"
import { MeetingStats, UpcomingMeeting, MeetingRequest, MeetingRequestUpdateResult } from "../../lib/types"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function Meetings() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<MeetingStats>({
    today: { total: 0, completed: 0, upcoming: 0 },
    thisWeek: { total: 0, scheduled: 0, pending: 0 },
    requests: { total: 0 }
  })
  const [upcomingMeetings, setUpcomingMeetings] = useState<UpcomingMeeting[]>([])
  const [filteredMeetings, setFilteredMeetings] = useState<UpcomingMeeting[]>([])
  const [meetingFilter, setMeetingFilter] = useState("all")
  const [meetingRequests, setMeetingRequests] = useState<MeetingRequest[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showRequestsDialog, setShowRequestsDialog] = useState(false)
  const [deadlines, setDeadlines] = useState<any[]>([])
  
  // New meeting form state
  const [meetingTitle, setMeetingTitle] = useState("")
  const [meetingType, setMeetingType] = useState("individual")
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [meetingDate, setMeetingDate] = useState("")
  const [meetingTime, setMeetingTime] = useState("")
  const [meetingDuration, setMeetingDuration] = useState("30")
  const [locationType, setLocationType] = useState("office")
  const [locationDetails, setLocationDetails] = useState("")
  const [meetingAgenda, setMeetingAgenda] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Deadline form state
  const [showDeadlineDialog, setShowDeadlineDialog] = useState(false)
  const [deadlineProjectType, setDeadlineProjectType] = useState("proposal")
  const [deadlineDate, setDeadlineDate] = useState("")
  const [deadlineDescription, setDeadlineDescription] = useState("")
  const [isSubmittingDeadline, setIsSubmittingDeadline] = useState(false)
  const [deadlineTarget, setDeadlineTarget] = useState("all") // "all" or "specific"
  const [isEditingDeadline, setIsEditingDeadline] = useState(false)
  const [currentDeadlineId, setCurrentDeadlineId] = useState<string | null>(null)

  // Fetch current user and data
  useEffect(() => {
    async function fetchUserAndData() {
      try {
        setLoading(true)
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        setUser(user)
        
        // Get supervisor's data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profileData) {
          // Fetch meeting stats
          const statsData = await getMeetingStats(user.id)
          setStats(statsData)
          
          // Fetch upcoming meetings
          const meetings = await getUpcomingMeetings(user.id)
          setUpcomingMeetings(meetings)
          setFilteredMeetings(meetings)
          
          // Fetch meeting requests
          const requests = await getMeetingRequests(user.id)
          setMeetingRequests(requests)
          
          // Fetch students assigned to this supervisor
          const studentsData = await getSupervisorStudents(user.id)
          setStudents(studentsData)
          
          // Fetch project deadlines
          const deadlinesData = await getProjectDeadlines(user.id)
          setDeadlines(deadlinesData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchUserAndData()
  }, [])

  // Apply filter when filter or meetings change
  useEffect(() => {
    if (meetingFilter === "all") {
      setFilteredMeetings(upcomingMeetings);
    } else if (meetingFilter === "individual") {
      setFilteredMeetings(upcomingMeetings.filter(meeting => meeting.meeting_type === "individual"));
    } else if (meetingFilter === "workshop") {
      setFilteredMeetings(upcomingMeetings.filter(meeting => meeting.meeting_type === "workshop"));
    } else if (meetingFilter === "virtual") {
      setFilteredMeetings(upcomingMeetings.filter(meeting => meeting.location_type === "virtual"));
    } else if (meetingFilter === "in-person") {
      setFilteredMeetings(upcomingMeetings.filter(meeting => meeting.location_type !== "virtual"));
    }
  }, [meetingFilter, upcomingMeetings]);
  
  // Function to refresh all meeting data
  const refreshAllData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      toast.info("Refreshing meetings data...");
      
      // Fetch meeting stats
      const statsData = await getMeetingStats(user.id);
      setStats(statsData);
      
      // Fetch upcoming meetings
      const meetings = await getUpcomingMeetings(user.id);
      setUpcomingMeetings(meetings);
      setFilteredMeetings(meetings);
      
      // Fetch meeting requests
      const requests = await getMeetingRequests(user.id);
      setMeetingRequests(requests);
      
      // Fetch project deadlines
      const deadlinesData = await getProjectDeadlines(user.id);
      setDeadlines(deadlinesData);
      
      toast.success("Meetings data refreshed");
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh meetings data');
    } finally {
      setLoading(false);
    }
  };

  // Debug function to check permissions
  const checkPermissions = async () => {
    try {
      console.log("Checking permissions...");
      
      // Check current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Current user:", user);
      
      if (!user) {
        console.error("No authenticated user found");
        return;
      }
      
      // Check user's profile and role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return;
      }
      
      console.log("User profile:", profile);
      
      // Test if we can insert a test record
      const testMeeting = {
        title: "TEST MEETING - WILL BE DELETED",
        meeting_type: "individual",
        date_time: new Date().toISOString(),
        duration_minutes: 30,
        location_type: "office",
        created_by: user.id,
        status: 'upcoming'
      };
      
      console.log("Testing meeting insert with:", testMeeting);
      
      const { data: testData, error: testError } = await supabase
        .from('meetings')
        .insert(testMeeting)
        .select();
      
      if (testError) {
        console.error("Test insert failed:", testError);
        toast.error(`Permission test failed: ${testError.message || JSON.stringify(testError)}`);
      } else {
        console.log("Test insert succeeded:", testData);
        toast.success("Permission test passed");
        
        // Clean up test record
        if (testData && testData.length > 0) {
          const { error: deleteError } = await supabase
            .from('meetings')
            .delete()
            .eq('id', testData[0].id);
          
          if (deleteError) {
            console.error("Failed to delete test record:", deleteError);
          } else {
            console.log("Test record deleted successfully");
          }
        }
      }
    } catch (error) {
      console.error("Permission check error:", error);
      toast.error("Permission check failed with an unexpected error");
    }
  };

  // Handle meeting form submission
  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!meetingTitle || !meetingDate || !meetingTime || !selectedStudents.length) {
      toast.error('Please fill in all required fields')
      return
    }
    
    try {
      setIsSubmitting(true)
      
      // Format date and time for database
      const dateTime = new Date(`${meetingDate}T${meetingTime}`)
      
      console.log("Scheduling meeting with:", {
        title: meetingTitle,
        date: meetingDate,
        time: meetingTime,
        students: selectedStudents
      })
      
      const result = await createMeeting({
        title: meetingTitle,
        meeting_type: meetingType,
        date_time: dateTime.toISOString(),
        duration_minutes: parseInt(meetingDuration),
        location_type: locationType,
        location_details: locationDetails,
        agenda: meetingAgenda,
        created_by: user.id,
        participants: selectedStudents
      })
      
      if (result.success) {
        toast.success('Meeting scheduled successfully')
        
        // Reset form
        setMeetingTitle("")
        setMeetingType("individual")
        setSelectedStudents([])
        setMeetingDate("")
        setMeetingTime("")
        setMeetingDuration("30")
        setLocationType("office")
        setLocationDetails("")
        setMeetingAgenda("")
        
        // Refresh data
        refreshAllData()
      } else {
        console.error("Failed to schedule meeting:", result.error)
        toast.error(`Failed to schedule meeting: ${result.error}`)
      }
    } catch (error) {
      console.error('Error scheduling meeting:', error)
      toast.error('An error occurred while scheduling the meeting')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle setting project deadline
  const handleSetDeadline = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!deadlineProjectType || !deadlineDate) {
      toast.error('Please fill in all required fields')
      return
    }
    
    try {
      setIsSubmittingDeadline(true)
      
      let result;
      
      if (isEditingDeadline && currentDeadlineId) {
        // Update existing deadline
        result = await updateProjectDeadline({
          id: currentDeadlineId,
        project_type: deadlineProjectType,
        deadline_date: deadlineDate,
        description: deadlineDescription,
          student_id: selectedStudents.length === 1 ? selectedStudents[0] : null
        })
        
        if (result.success) {
          toast.success('Deadline updated successfully')
        }
      } else {
        // Create new deadline
        result = await setProjectDeadline({
          project_type: deadlineProjectType,
          deadline_date: deadlineDate,
          description: deadlineDescription,
          supervisor_id: user.id,
          student_id: selectedStudents.length === 1 ? selectedStudents[0] : undefined
      })
      
      if (result.success) {
        toast.success('Deadline set successfully')
        }
      }
        
      if (result.success) {
        // Reset form
        setDeadlineProjectType("proposal")
        setDeadlineDate("")
        setDeadlineDescription("")
        setSelectedStudents([])
        setDeadlineTarget("all")
        setIsEditingDeadline(false)
        setCurrentDeadlineId(null)
        
        // Close dialog
        setShowDeadlineDialog(false)
        
        // Refresh deadline data
        const deadlinesData = await getProjectDeadlines(user.id)
        setDeadlines(deadlinesData)
      } else {
        toast.error(`Failed to ${isEditingDeadline ? 'update' : 'set'} deadline: ${result.error}`)
      }
    } catch (error) {
      console.error(`Error ${isEditingDeadline ? 'updating' : 'setting'} deadline:`, error)
      toast.error(`An error occurred while ${isEditingDeadline ? 'updating' : 'setting'} the deadline`)
    } finally {
      setIsSubmittingDeadline(false)
    }
  }
  
  // Handle meeting request approval/rejection
  const handleMeetingRequest = async (requestId: string, status: 'approved' | 'rejected', meetingId?: string) => {
    try {
      console.log(`Processing ${status} for request ${requestId}`);
      
      const result = await updateMeetingRequestStatus(requestId, status, meetingId);
      
      if (result.success) {
        toast.success(result.message || `Meeting request ${status}`);
        
        // Refresh requests
        const requests = await getMeetingRequests(user.id);
        setMeetingRequests(requests);
        
        // Refresh meetings if a new one was created
        if (status === 'approved') {
          const meetings = await getUpcomingMeetings(user.id);
          setUpcomingMeetings(meetings);
          setFilteredMeetings(meetings);
          console.log('Refreshed upcoming meetings:', meetings);
        }
        
        // Refresh stats
        const statsData = await getMeetingStats(user.id);
        setStats(statsData);
      } else {
        const errorMessage = result.error 
          ? (typeof result.error === 'object' 
              ? (result.error.message || JSON.stringify(result.error)) 
              : result.error) 
          : 'Unknown error';
        
        console.error(`Failed to ${status} meeting request:`, result.error);
        toast.error(`Failed to ${status} meeting request: ${errorMessage}`);
      }
    } catch (error) {
      console.error(`Error ${status} meeting request:`, error);
      toast.error(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // Format date for display
  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr)
    return format(date, "MMM d, yyyy • h:mm a")
  }
  
  // Get location display text
  const getLocationText = (type: string, details?: string) => {
    switch (type) {
      case 'virtual':
        return 'Virtual Meeting'
      case 'office':
        return 'Office'
      case 'custom':
        return details || 'Custom Location'
      default:
        return 'Unknown'
    }
  }

  // Handle editing a deadline
  const handleEditDeadline = (deadline: any) => {
    setDeadlineProjectType(deadline.project_type)
    setDeadlineDate(new Date(deadline.deadline_date).toISOString().split('T')[0]) // Format as YYYY-MM-DD
    setDeadlineDescription(deadline.description || "")
    setCurrentDeadlineId(deadline.id)
    
    if (deadline.student_id) {
      setDeadlineTarget("specific")
      setSelectedStudents([deadline.student_id])
    } else {
      setDeadlineTarget("all")
      setSelectedStudents([])
    }
    
    setIsEditingDeadline(true)
    setShowDeadlineDialog(true)
  }
  
  // Handle deleting a deadline
  const handleDeleteDeadline = async (deadlineId: string) => {
    if (!confirm("Are you sure you want to delete this deadline?")) {
      return
    }
    
    try {
      const result = await deleteProjectDeadline(deadlineId)
      
      if (result.success) {
        toast.success("Deadline deleted successfully")
        
        // Refresh deadline data
        const deadlinesData = await getProjectDeadlines(user.id)
        setDeadlines(deadlinesData)
      } else {
        toast.error(`Failed to delete deadline: ${result.error}`)
      }
    } catch (error) {
      console.error("Error deleting deadline:", error)
      toast.error("An error occurred while deleting the deadline")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button 
          variant="outline" 
          size="sm"
          onClick={refreshAllData}
          disabled={loading}
        >
          <i className="fas fa-sync-alt mr-1"></i> Refresh All Data
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={checkPermissions}
        >
          Debug Permissions
        </Button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-6 flex flex-col h-full">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Today's Meetings</h3>
                <div className="mt-1 flex items-baseline">
                  <p className="text-2xl font-semibold">{stats.today.upcoming}</p>
                  <p className="ml-2 text-sm text-gray-500">of {stats.today.total}</p>
                </div>
              </div>
              <div className="p-2 bg-blue-50 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="mt-1">
              <span className={`text-xs font-medium ${stats.today.completed > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                {stats.today.completed} completed
              </span>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="p-6 flex flex-col h-full">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-gray-500">This Week</h3>
                <div className="mt-1 flex items-baseline">
                  <p className="text-2xl font-semibold">{stats.thisWeek.scheduled}</p>
                  <p className="ml-2 text-sm text-gray-500">meetings</p>
                </div>
              </div>
              <div className="p-2 bg-purple-50 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="mt-1">
              <span className={`text-xs font-medium ${stats.thisWeek.pending > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                {stats.thisWeek.pending} pending requests
              </span>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="p-6 flex flex-col h-full">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Meeting Requests</h3>
                <div className="mt-1 flex items-baseline">
                  <p className="text-2xl font-semibold">{stats.requests.total}</p>
                  <p className="ml-2 text-sm text-gray-500">pending</p>
                </div>
              </div>
              <div className="p-2 bg-amber-50 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="mt-1">
              <Button 
                variant="link" 
                className="p-0 h-auto text-xs font-medium text-blue-600"
                onClick={() => setShowRequestsDialog(true)}
              >
                View all requests
              </Button>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Project Submission Deadlines Section */}
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Project Submission Deadlines</h3>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-md"
              onClick={() => setShowDeadlineDialog(true)}
            >
              <i className="fas fa-plus mr-2"></i> Set New Deadline
            </Button>
          </div>
          
          {deadlines.length > 0 && (
            <div className="mt-4 space-y-4">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Project Phase</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Deadline</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Assigned To</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {deadlines.map((deadline) => {
                      // Get project type title
                      const projectTypeTitle = (() => {
                        switch (deadline.project_type) {
                          case 'proposal': return 'Project Proposal';
                          case 'literature': return 'Literature Review';
                          case 'methodology': return 'Methodology Chapter';
                          case 'implementation': return 'Implementation & Results';
                          case 'thesis': return 'Final Thesis';
                          default: return 'Unknown';
                        }
                      })();
                      
                      // Format date
                      const formattedDate = new Date(deadline.deadline_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      });
                      
                      return (
                        <tr key={deadline.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                            {projectTypeTitle}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {formattedDate}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {deadline.target_type === 'specific' ? deadline.student_name : 'All Students'}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-blue-600 hover:text-blue-900"
                              onClick={() => handleEditDeadline(deadline)}
                            >
                              <i className="fas fa-pencil-alt mr-1"></i> Edit
                    </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-900 ml-2"
                              onClick={() => handleDeleteDeadline(deadline.id)}
                            >
                              <i className="fas fa-trash-alt mr-1"></i> Delete
                    </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                  </div>
                </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-md">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h3 className="font-bold">Upcoming Meetings</h3>
              <div className="flex space-x-2">
                <Select 
                  value={meetingFilter} 
                  onValueChange={setMeetingFilter}
                >
                  <SelectTrigger className="w-40 !rounded-button whitespace-nowrap cursor-pointer bg-white">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Meetings</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="virtual">Virtual</SelectItem>
                    <SelectItem value="in-person">In Person</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="!rounded-button whitespace-nowrap cursor-pointer bg-transparent"
                >
                  <i className="fas fa-filter"></i>
                </Button>
              </div>
            </div>
          </div>
          <div className="divide-y">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Loading meetings...</p>
              </div>
            ) : filteredMeetings.length > 0 ? (
              filteredMeetings.map((meeting) => (
                <div key={meeting.meeting_id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-4">
                      <div className={`h-12 w-12 rounded-full ${meeting.location_type === 'virtual' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'} flex items-center justify-center`}>
                        <i className={`fas ${meeting.location_type === 'virtual' ? 'fa-video' : 'fa-map-marker-alt'}`}></i>
                      </div>
                      <div>
                        <h4 className="font-medium">{meeting.title} - {meeting.participant_name}</h4>
                        <p className="text-sm text-gray-500">
                          <i className="fas fa-clock mr-1"></i> {formatDateTime(meeting.date_time)} ({meeting.duration_minutes} mins)
                        </p>
                        <p className="text-sm text-gray-500">
                          <i className={`fas ${meeting.location_type === 'virtual' ? 'fa-video' : 'fa-map-marker-alt'} mr-1`}></i> {getLocationText(meeting.location_type, meeting.location_details)}
                        </p>
                        <div className="flex items-center mt-2">
                          <Badge className="bg-emerald-100 text-emerald-800 mr-2">
                            <i className="fas fa-check-circle mr-1"></i> {meeting.attendance_status === 'pending' ? 'Awaiting Confirmation' : meeting.attendance_status}
                          </Badge>
                          <Badge className={`${meeting.location_type === 'virtual' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            <i className={`fas ${meeting.location_type === 'virtual' ? 'fa-video' : 'fa-building'} mr-1`}></i> {meeting.location_type === 'virtual' ? 'Virtual' : 'In Person'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {meeting.location_type === 'virtual' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-600 hover:bg-blue-50 !rounded-button whitespace-nowrap cursor-pointer bg-white"
                        >
                          Join
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="!rounded-button whitespace-nowrap cursor-pointer">
                            <i className="fas fa-ellipsis-v"></i>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="cursor-pointer">
                            <i className="fas fa-edit mr-2"></i> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer">
                            <i className="fas fa-bell mr-2"></i> Remind
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer">
                            <i className="fas fa-link mr-2"></i> Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-red-600">
                            <i className="fas fa-times-circle mr-2"></i> Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500">No upcoming meetings scheduled.</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t text-center">
            <Button variant="ghost" className="text-blue-600 !rounded-button whitespace-nowrap cursor-pointer">
              View All Meetings <i className="fas fa-arrow-right ml-2"></i>
            </Button>
          </div>
        </Card>

        <Card className="shadow-md">
          <div className="p-6 border-b">
            <h3 className="font-bold">Schedule a Meeting</h3>
          </div>
          <form onSubmit={handleScheduleMeeting} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Meeting Title</label>
              <Input 
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                className="!rounded-button bg-white" 
                placeholder="Enter meeting title"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Meeting Type</label>
              <Select 
                value={meetingType}
                onValueChange={setMeetingType}
              >
                <SelectTrigger className="w-full !rounded-button whitespace-nowrap cursor-pointer bg-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Select Student(s)</label>
              <Select 
                value={selectedStudents.length === 1 ? selectedStudents[0] : undefined}
                onValueChange={(value) => setSelectedStudents([value])}
              >
                <SelectTrigger className="w-full !rounded-button whitespace-nowrap cursor-pointer bg-white">
                  <SelectValue placeholder="Select student(s)" />
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

            <div>
              <label className="block text-sm font-medium mb-2">Date & Time</label>
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  type="date" 
                  className="!rounded-button bg-white"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  required
                />
                <Input 
                  type="time" 
                  className="!rounded-button bg-white"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Duration</label>
              <Select 
                value={meetingDuration}
                onValueChange={setMeetingDuration}
              >
                <SelectTrigger className="w-full !rounded-button whitespace-nowrap cursor-pointer bg-white">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="virtual" 
                    checked={locationType === 'virtual'}
                    onCheckedChange={() => setLocationType('virtual')}
                  />
                  <label
                    htmlFor="virtual"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Virtual (Zoom)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="office" 
                    checked={locationType === 'office'}
                    onCheckedChange={() => setLocationType('office')}
                  />
                  <label
                    htmlFor="office"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Office
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="custom" 
                    checked={locationType === 'custom'}
                    onCheckedChange={() => setLocationType('custom')}
                  />
                  <label
                    htmlFor="custom"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Custom Location
                  </label>
                </div>
                
                {locationType === 'custom' && (
                  <Input 
                    className="mt-2 !rounded-button bg-white" 
                    placeholder="Enter location details"
                    value={locationDetails}
                    onChange={(e) => setLocationDetails(e.target.value)}
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Meeting Agenda</label>
              <textarea
                className="w-full p-3 border border-black rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-black"
                placeholder="Enter meeting details, topics to discuss, etc."
                rows={3}
                value={meetingAgenda}
                onChange={(e) => setMeetingAgenda(e.target.value)}
              ></textarea>
            </div>

            <div className="pt-2">
              <Button 
                type="submit"
                className="w-full bg-[#424769] hover:bg-[#2D3250] text-white !rounded-button whitespace-nowrap cursor-pointer transition-all duration-300"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Scheduling...' : 'Schedule Meeting'}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Meeting Requests Dialog */}
      <Dialog open={showRequestsDialog} onOpenChange={setShowRequestsDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Meeting Requests</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            {meetingRequests.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <i className="fas fa-calendar-check text-blue-600"></i>
                </div>
                <p className="text-gray-500">No pending meeting requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {meetingRequests.map((request) => (
                  <Card key={request.id} className="overflow-hidden">
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{request.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            Requested by {request.student_name}
                          </p>
                        </div>
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>
                      </div>
                      {request.description && (
                        <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                          {request.description}
                        </div>
                      )}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Preferred Date:</span>{" "}
                          <span className="font-medium">
                            {new Date(request.preferred_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Preferred Time:</span>{" "}
                          <span className="font-medium">{request.preferred_time}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleMeetingRequest(request.id, 'rejected')}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleMeetingRequest(request.id, 'approved')}
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRequestsDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Set Deadline Dialog */}
      <Dialog open={showDeadlineDialog} onOpenChange={(open) => {
        if (!open) {
          // Reset form when closing the dialog without submitting
          setDeadlineProjectType("proposal")
          setDeadlineDate("")
          setDeadlineDescription("")
          setSelectedStudents([])
          setDeadlineTarget("all")
          setIsEditingDeadline(false)
          setCurrentDeadlineId(null)
        }
        setShowDeadlineDialog(open)
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditingDeadline ? 'Edit Project Submission Deadline' : 'Set Project Submission Deadline'}</DialogTitle>
            <DialogDescription>
              {isEditingDeadline 
                ? 'Update the deadline for students to submit this phase of their projects.'
                : 'Set deadlines for students to submit different phases of their projects.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSetDeadline}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project-type">Project Phase</Label>
                <Select 
                  value={deadlineProjectType} 
                  onValueChange={setDeadlineProjectType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proposal">Project Proposal</SelectItem>
                    <SelectItem value="literature">Literature Review</SelectItem>
                    <SelectItem value="methodology">Methodology Chapter</SelectItem>
                    <SelectItem value="implementation">Implementation & Results</SelectItem>
                    <SelectItem value="thesis">Final Thesis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="student-selection">Apply To</Label>
                <Select 
                  value={deadlineTarget}
                  onValueChange={(value) => {
                    setDeadlineTarget(value);
                    if (value === "all") {
                      setSelectedStudents([]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select students" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    <SelectItem value="specific">Specific Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Student selection dropdown that appears when "Specific Student" is selected */}
              {deadlineTarget === "specific" && (
                <div className="space-y-2" id="student-selection-container">
                  <Select 
                    value={selectedStudents.length === 1 ? selectedStudents[0] : undefined}
                    onValueChange={(value) => setSelectedStudents([value])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
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
              )}
              
              <div className="space-y-2">
                <Label htmlFor="deadline-date">Submission Deadline</Label>
                <Input
                  id="deadline-date"
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deadline-description">Description (Optional)</Label>
                <Textarea
                  id="deadline-description"
                  placeholder="Add any specific instructions or requirements..."
                  value={deadlineDescription}
                  onChange={(e) => setDeadlineDescription(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <Checkbox id="notify-students" />
                  <span>Notify students about this deadline</span>
                </Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowDeadlineDialog(false)
                  setIsEditingDeadline(false)
                  setCurrentDeadlineId(null)
                  setDeadlineProjectType("proposal")
                  setDeadlineDate("")
                  setDeadlineDescription("")
                  setSelectedStudents([])
                  setDeadlineTarget("all")
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmittingDeadline}
              >
                {isSubmittingDeadline ? (
                  <>{isEditingDeadline ? 'Updating...' : 'Setting deadline...'}</>
                ) : (
                  <>{isEditingDeadline ? 'Update Deadline' : 'Set Deadline'}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
