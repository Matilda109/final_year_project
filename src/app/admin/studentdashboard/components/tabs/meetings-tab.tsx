"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { getStudentMeetings, getStudentMeetingHistory, createMeetingRequest } from "../../../supervisordashboard/lib/data"

const MeetingsTab: React.FC = () => {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [upcomingMeetings, setUpcomingMeetings] = useState<any[]>([])
  const [meetingHistory, setMeetingHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [supervisor, setSupervisor] = useState<any>(null)
  
  // Meeting request form state
  const [meetingTitle, setMeetingTitle] = useState("")
  const [meetingDescription, setMeetingDescription] = useState("")
  const [preferredTime, setPreferredTime] = useState("9:00")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRequestDialog, setShowRequestDialog] = useState(false)

  // Fetch user data and meetings
  useEffect(() => {
    async function fetchUserAndMeetings() {
      try {
        setLoading(true)
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        
        setUser(user)
        
        // Get student's profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (profileData) {
          // Get supervisor info
          const { data: relationshipData } = await supabase
            .from('student_supervisor_relationships_view')
            .select('*')
            .eq('student_id', user.id)
            .eq('status', 'active')
            .single()
          
          if (relationshipData) {
            setSupervisor({
              id: relationshipData.supervisor_id,
              name: relationshipData.supervisor_name
            })
            
            // Fetch upcoming meetings
            const meetings = await getStudentMeetings(user.id)
            setUpcomingMeetings(meetings)
            
            // Fetch meeting history
            const history = await getStudentMeetingHistory(user.id)
            setMeetingHistory(history)
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast.error('Failed to load meetings data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchUserAndMeetings()
  }, [])
  
  // Function to refresh meeting data
  const refreshMeetingData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      toast.info("Refreshing meetings data...");
      
      // Fetch upcoming meetings
      const meetings = await getStudentMeetings(user.id);
      setUpcomingMeetings(meetings);
      
      // Fetch meeting history
      const history = await getStudentMeetingHistory(user.id);
      setMeetingHistory(history);
      
      toast.success("Meetings data refreshed");
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh meetings data');
    } finally {
      setLoading(false);
    }
  };

  // Handle meeting request submission
  const handleRequestMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!meetingTitle || !selectedDate) {
      toast.error('Please fill in all required fields')
      return
    }
    
    if (!supervisor) {
      toast.error('No supervisor assigned')
      return
    }
    
    try {
      setIsSubmitting(true)
      
      console.log("Submitting meeting request:", {
        title: meetingTitle,
        date: selectedDate.toISOString().split('T')[0],
        time: preferredTime,
        supervisor: supervisor.id
      })
      
      const result = await createMeetingRequest({
        title: meetingTitle,
        description: meetingDescription,
        preferred_date: selectedDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        preferred_time: preferredTime,
        student_id: user.id,
        supervisor_id: supervisor.id
      })
      
      if (result.success) {
        toast.success('Meeting request submitted successfully')
        
        // Reset form
        setMeetingTitle("")
        setMeetingDescription("")
        setSelectedDate(new Date())
        setPreferredTime("9:00")
        
        // Close dialog
        setShowRequestDialog(false)
        
        // Refresh data after a short delay to allow database to update
        setTimeout(async () => {
          try {
            // Refresh upcoming meetings
            const meetings = await getStudentMeetings(user.id)
            setUpcomingMeetings(meetings)
            console.log("Refreshed upcoming meetings:", meetings)
            
            // Refresh meeting history
            const history = await getStudentMeetingHistory(user.id)
            setMeetingHistory(history)
          } catch (refreshError) {
            console.error("Error refreshing data:", refreshError)
          }
        }, 1000)
      } else {
        console.error("Failed to submit meeting request:", result.error)
        toast.error(`Failed to submit meeting request: ${
          typeof result.error === 'object' && result.error !== null ? 
          JSON.stringify(result.error) : result.error || 'Unknown error'
        }`)
      }
    } catch (error) {
      console.error('Error requesting meeting:', error)
      toast.error(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Format date for display
  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr)
    return format(date, "MMMM d, yyyy • h:mm a")
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

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Upcoming Meetings</CardTitle>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={refreshMeetingData}
                  disabled={loading}
                  className="mr-2 text-gray-700 border-gray-300 bg-white hover:bg-gray-50 !rounded-button"
                >
                  <i className="fas fa-sync-alt mr-1"></i> Refresh
                </Button>
                <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
                  <DialogTrigger asChild>
                    <Button className="!rounded-button whitespace-nowrap">
                      <i className="fas fa-plus mr-2"></i> Request Meeting
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request a New Meeting</DialogTitle>
                      <DialogDescription>
                        Fill in the details to schedule a meeting with your supervisor.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRequestMeeting} className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="meeting-title">Meeting Title</Label>
                        <Input 
                          id="meeting-title" 
                          placeholder="Enter meeting title"
                          value={meetingTitle}
                          onChange={(e) => setMeetingTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="meeting-description">Description</Label>
                        <Textarea
                          id="meeting-description"
                          placeholder="Briefly describe the purpose of the meeting"
                          className="min-h-[100px]"
                          value={meetingDescription}
                          onChange={(e) => setMeetingDescription(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Preferred Date</Label>
                        <div className="flex items-center">
                          <Input
                            value={selectedDate ? selectedDate.toLocaleDateString() : ""}
                            readOnly
                            onClick={() => setCalendarOpen(true)}
                            className="cursor-pointer"
                          />
                          {calendarOpen && (
                            <div className="absolute z-50 mt-2 bg-white border rounded-md shadow-md">
                              <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => {
                                  if (date && date >= new Date(new Date().setHours(0, 0, 0, 0))) {
                                    setSelectedDate(date)
                                  }
                                  setCalendarOpen(false)
                                }}
                                initialFocus
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="meeting-time">Preferred Time</Label>
                        <select 
                          id="meeting-time" 
                          className="w-full p-2 border rounded-md"
                          value={preferredTime}
                          onChange={(e) => setPreferredTime(e.target.value)}
                        >
                          <option value="9:00">9:00 AM</option>
                          <option value="10:00">10:00 AM</option>
                          <option value="11:00">11:00 AM</option>
                          <option value="13:00">1:00 PM</option>
                          <option value="14:00">2:00 PM</option>
                          <option value="15:00">3:00 PM</option>
                          <option value="16:00">4:00 PM</option>
                        </select>
                      </div>
                      <DialogFooter className="mt-4">
                        <Button
                          variant="outline"
                          onClick={() => setShowRequestDialog(false)}
                          className="!rounded-button whitespace-nowrap bg-transparent"
                          type="button"
                        >
                          Cancel
                        </Button>
                        <Button 
                          className="!rounded-button whitespace-nowrap"
                          type="submit"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Submitting...' : 'Request Meeting'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Loading meetings...</p>
              </div>
            ) : upcomingMeetings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Meeting</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>With</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingMeetings.map((meeting) => (
                    <TableRow key={meeting.meeting_id}>
                      <TableCell className="font-medium">{meeting.title}</TableCell>
                      <TableCell>{formatDateTime(meeting.date_time)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarFallback>{meeting.supervisor_name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          {meeting.supervisor_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`
                          ${meeting.attendance_status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                            meeting.attendance_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-gray-100 text-gray-800'}
                        `}>
                          {meeting.attendance_status.charAt(0).toUpperCase() + meeting.attendance_status.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500">No upcoming meetings scheduled.</p>
                <p className="text-gray-500 mt-2">Use the "Request Meeting" button to schedule one.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meeting History</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {loading ? (
                <div className="p-4 text-center">
                  <p className="text-gray-500">Loading meeting history...</p>
                </div>
              ) : meetingHistory.length > 0 ? (
                <div className="space-y-4">
                  {meetingHistory.map((meeting) => (
                    <div key={meeting.meeting_id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{meeting.title}</h4>
                        <Badge variant="outline" className="bg-gray-100">
                          Completed
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        <i className="fas fa-calendar-day mr-2"></i> {formatDateTime(meeting.date_time)}
                      </p>
                      <p className="text-sm text-gray-500 mb-2">
                        <i className="fas fa-user mr-2"></i> {meeting.supervisor_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        <i className="fas fa-map-marker-alt mr-2"></i> {getLocationText(meeting.location_type, meeting.location_details)}
                      </p>
                      {meeting.agenda && (
                        <p className="text-sm text-gray-500 mt-2">
                          <i className="fas fa-clipboard-list mr-2"></i> {meeting.agenda}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-gray-500">No meeting history available.</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default MeetingsTab
