import { supabase } from '@/lib/supabase';
import {
  Meeting, 
  MeetingParticipant, 
  MeetingRequest, 
  MeetingStats, 
  StudentMeeting, 
  UpcomingMeeting,
  MeetingRequestUpdateResult,
  ProjectSubmission
} from './types';

export const projects = [
  {
    id: 1,
    student: "Emma Thompson",
    title: "Machine Learning Applications in Healthcare",
    date: "2025-06-15",
    status: "Pending",
  },
  {
    id: 2,
    student: "James Wilson",
    title: "Blockchain Technology for Supply Chain Management",
    date: "2025-06-14",
    status: "Approved",
  },
  {
    id: 3,
    student: "Sophia Chen",
    title: "IoT Solutions for Smart Cities",
    date: "2025-06-12",
    status: "Revisions",
  },
  {
    id: 4,
    student: "Michael Rodriguez",
    title: "Cybersecurity Frameworks for Financial Institutions",
    date: "2025-06-10",
    status: "Pending",
  },
  {
    id: 5,
    student: "Olivia Johnson",
    title: "AI-Driven Customer Experience Optimization",
    date: "2025-06-08",
    status: "Overdue",
  },
  {
    id: 6,
    student: "William Zhang",
    title: "Quantum Computing Applications in Cryptography",
    date: "2025-06-05",
    status: "Approved",
  },
  {
    id: 7,
    student: "Ava Patel",
    title: "Sustainable Energy Solutions Using Big Data",
    date: "2025-06-03",
    status: "Pending",
  },
]

export const students = [
  {
    id: 1,
    name: "Emma Thompson",
    progress: 85,
    avatar:
      "https://readdy.ai/api/search-image?query=professional%20headshot%20portrait%20of%20a%20young%20female%20student%20with%20brown%20hair%2C%20neutral%20background%2C%20high%20quality%2C%20photorealistic%2C%20professional%20lighting&width=100&height=100&seq=1&orientation=squarish",
  },
  {
    id: 2,
    name: "James Wilson",
    progress: 60,
    avatar:
      "https://readdy.ai/api/search-image?query=professional%20headshot%20portrait%20of%20a%20young%20male%20student%20with%20short%20dark%20hair%2C%20neutral%20background%2C%20high%20quality%2C%20photorealistic%2C%20professional%20lighting&width=100&height=100&seq=2&orientation=squarish",
  },
  {
    id: 3,
    name: "Sophia Chen",
    progress: 75,
    avatar:
      "https://readdy.ai/api/search-image?query=professional%20headshot%20portrait%20of%20a%20young%20asian%20female%20student%20with%20black%20hair%2C%20neutral%20background%2C%20high%20quality%2C%20photorealistic%2C%20professional%20lighting&width=100&height=100&seq=3&orientation=squarish",
  },
  {
    id: 4,
    name: "Michael Rodriguez",
    progress: 40,
    avatar:
      "https://readdy.ai/api/search-image?query=professional%20headshot%20portrait%20of%20a%20young%20hispanic%20male%20student%20with%20dark%20hair%2C%20neutral%20background%2C%20high%20quality%2C%20photorealistic%2C%20professional%20lighting&width=100&height=100&seq=4&orientation=squarish",
  },
  {
    id: 5,
    name: "Olivia Johnson",
    progress: 90,
    avatar:
      "https://readdy.ai/api/search-image?query=professional%20headshot%20portrait%20of%20a%20young%20female%20student%20with%20blonde%20hair%2C%20neutral%20background%2C%20high%20quality%2C%20photorealistic%2C%20professional%20lighting&width=100&height=100&seq=5&orientation=squarish",
  },
]

export const repositoryProjects = [
  {
    id: 1,
    title: "Machine Learning for Medical Diagnosis",
    year: 2024,
    department: "Computer Science",
    author: "David Miller",
    supervisor: "Dr. Johnson",
    tags: ["Machine Learning", "Healthcare", "AI"],
    description: "A novel machine learning approach for early disease detection using medical imaging data, achieving 92% accuracy in clinical trials.",
    image: "https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=1480&auto=format&fit=crop"
  },
  {
    id: 2,
    title: "Sustainable Architecture in Urban Environments",
    year: 2024,
    department: "Architecture",
    author: "Sarah Johnson",
    supervisor: "Prof. Williams",
    tags: ["Sustainable Design", "Urban Planning", "Green Building"],
    description: "Research on integrating sustainable practices in urban architecture, focusing on energy efficiency and environmental impact reduction.",
    image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=1470&auto=format&fit=crop"
  },
  {
    id: 3,
    title: "Blockchain Applications in Finance",
    year: 2023,
    department: "Computer Science",
    author: "Michael Chang",
    supervisor: "Dr. Patel",
    tags: ["Blockchain", "FinTech", "Cryptography"],
    description: "Implementation of blockchain technology for secure and transparent financial transactions with a focus on reducing fraud and improving efficiency.",
    image: "https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=1632&auto=format&fit=crop"
  },
  {
    id: 4,
    title: "Renewable Energy Storage Solutions",
    year: 2023,
    department: "Engineering",
    author: "Jessica Williams",
    supervisor: "Dr. Chen",
    tags: ["Renewable Energy", "Energy Storage", "Sustainability"],
    description: "Development of advanced energy storage systems for renewable sources, addressing intermittency issues in solar and wind power generation.",
    image: "/sch.jpg"
  },
  {
    id: 5,
    title: "AI in Customer Relationship Management",
    year: 2023,
    department: "Business",
    author: "Robert Chen",
    supervisor: "Dr. Johnson",
    tags: ["AI", "CRM", "Business Intelligence"],
    description: "Application of artificial intelligence to enhance customer relationship management systems, resulting in 35% improvement in customer retention rates.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1470&auto=format&fit=crop"
  },
  {
    id: 6,
    title: "Quantum Computing Algorithms",
    year: 2022,
    department: "Computer Science",
    author: "Emily Zhang",
    supervisor: "Prof. Williams",
    tags: ["Quantum Computing", "Algorithms", "Cryptography"],
    description: "Research on quantum algorithms for solving complex computational problems, with applications in cryptography and optimization.",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1470&auto=format&fit=crop"
  },
]

// Fetch supervisor's students (both individual and group assignments)
export async function getSupervisorStudents(supervisorId: string): Promise<any[]> {
  try {
    const allStudents = new Map<string, any>();
    
    // 1. Get individual student assignments
    const { data: individualData, error: individualError } = await supabase
      .from('student_supervisor_relationships_view')
      .select('*')
      .eq('supervisor_id', supervisorId)
      .eq('status', 'active');
    
    if (individualError) {
      console.error('Error fetching individual relationships:', individualError);
    } else if (individualData) {
      individualData.forEach(student => {
        allStudents.set(student.student_id, {
          ...student,
          assignment_type: 'individual'
        });
      });
    }
    
    // 2. Get group assignments
    const { data: groupData, error: groupError } = await supabase
      .from('student_groups')
      .select(`
        id,
        name,
        status,
        group_members!inner(
          student_id,
          student:profiles!group_members_student_id_fkey(
            id,
            full_name,
            reference_number,
            email,
            department
          )
        )
      `)
      .eq('supervisor_id', supervisorId)
      .eq('status', 'active');
    
    if (groupError) {
      console.error('Error fetching group assignments:', groupError);
    } else if (groupData) {
      groupData.forEach(group => {
        group.group_members.forEach((member: any) => {
          const student = member.student;
          if (student) {
            allStudents.set(student.id, {
              id: student.id,
              student_id: student.id,
              supervisor_id: supervisorId,
              student_name: student.full_name,
              student_reference: student.reference_number,
              supervisor_name: '', // Will be filled if needed
              supervisor_reference: '', // Will be filled if needed
              department: student.department,
              status: 'active',
              project_title: group.name,
              assigned_date: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              assignment_type: 'group',
              group_name: group.name,
              group_id: group.id,
              full_name: student.full_name,
              reference_number: student.reference_number,
              email: student.email
            });
          }
        });
      });
    }
    
    return Array.from(allStudents.values());
  } catch (error) {
    console.error('Error fetching supervisor students:', error);
    return [];
  }
}

// Fetch meetings statistics
export async function getMeetingStats(supervisorId: string): Promise<MeetingStats> {
  try {
    // Today's meetings
    const { data: todayData, error: todayError } = await supabase
      .from('todays_meetings_count')
      .select('*')
      .eq('supervisor_id', supervisorId)
      .single();
    
    if (todayError && todayError.code !== 'PGRST116') throw todayError;

    // This week's meetings
    const { data: weekData, error: weekError } = await supabase
      .from('this_week_meetings_count')
      .select('*')
      .eq('supervisor_id', supervisorId)
      .single();
    
    if (weekError && weekError.code !== 'PGRST116') throw weekError;

    // Meeting requests
    const { data: requestsData, error: requestsError } = await supabase
      .from('meeting_requests_count')
      .select('*')
      .eq('supervisor_id', supervisorId)
      .single();
    
    if (requestsError && requestsError.code !== 'PGRST116') throw requestsError;

    return {
      today: {
        total: todayData?.total || 0,
        completed: todayData?.completed || 0,
        upcoming: todayData?.upcoming || 0,
      },
      thisWeek: {
        total: weekData?.total || 0,
        scheduled: weekData?.scheduled || 0,
        pending: weekData?.pending || 0,
      },
      requests: {
        total: requestsData?.total || 0,
      }
    };
  } catch (error) {
    console.error('Error fetching meeting stats:', error);
    return {
      today: { total: 0, completed: 0, upcoming: 0 },
      thisWeek: { total: 0, scheduled: 0, pending: 0 },
      requests: { total: 0 }
    };
  }
}

// Fetch upcoming meetings
export async function getUpcomingMeetings(supervisorId: string): Promise<UpcomingMeeting[]> {
  try {
    const { data, error } = await supabase
      .from('upcoming_meetings_view')
      .select('*')
      .eq('created_by', supervisorId)
      .order('date_time', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching upcoming meetings:', error);
    return [];
  }
}

// Fetch meeting requests
export async function getMeetingRequests(supervisorId: string): Promise<MeetingRequest[]> {
  try {
    const { data, error } = await supabase
      .from('meeting_requests')
      .select(`
        *,
        student:student_id (
          full_name
        )
      `)
      .eq('supervisor_id', supervisorId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Format the data to include student_name
    return (data || []).map(item => ({
      ...item,
      student_name: item.student?.full_name || 'Unknown Student'
    }));
  } catch (error) {
    console.error('Error fetching meeting requests:', error);
    return [];
  }
}

// Create a new meeting
export async function createMeeting(meeting: {
  title: string;
  meeting_type: string;
  date_time: string;
  duration_minutes: number;
  location_type: string;
  location_details?: string;
  agenda?: string;
  created_by: string;
  participants: string[];
}) {
  try {
    console.log("Creating meeting with data:", meeting);
    
    // Validate data before sending to Supabase
    if (!meeting.title || !meeting.meeting_type || !meeting.date_time || 
        !meeting.duration_minutes || !meeting.location_type || 
        !meeting.created_by || !meeting.participants || meeting.participants.length === 0) {
      return { 
        success: false, 
        error: "Missing required fields for meeting creation" 
      };
    }
    
    // Check date validity
    const meetingDate = new Date(meeting.date_time);
    if (isNaN(meetingDate.getTime())) {
      return { 
        success: false, 
        error: `Invalid date format: ${meeting.date_time}` 
      };
    }
    
    // Create meeting object to insert
    const meetingObject = {
      title: meeting.title,
      meeting_type: meeting.meeting_type,
      date_time: meeting.date_time,
      duration_minutes: meeting.duration_minutes,
      location_type: meeting.location_type,
      location_details: meeting.location_details,
      agenda: meeting.agenda,
      created_by: meeting.created_by,
      status: 'upcoming'
    };
    
    console.log("Inserting meeting with object:", meetingObject);
    
    // Insert meeting with more detailed error handling
    const { data: newMeeting, error: meetingError } = await supabase
      .from('meetings')
      .insert(meetingObject)
      .select();
    
    if (meetingError) {
      console.error("Error inserting meeting:", meetingError);
      return { 
        success: false, 
        error: meetingError.message || JSON.stringify(meetingError) 
      };
    }
    
    if (!newMeeting || newMeeting.length === 0) {
      console.error("No meeting data returned after insert");
      return { 
        success: false, 
        error: "No meeting data returned from database" 
      };
    }
    
    const meetingId = newMeeting[0].id;
    console.log("Meeting created with ID:", meetingId);
    
    // Add participants
    const participantsData = meeting.participants.map((participantId: string) => ({
      meeting_id: meetingId,
      participant_id: participantId,
      attendance_status: 'pending'
    }));
    
    console.log("Adding participants:", participantsData);
    
    // Insert participants with more detailed error handling
    const { error: participantsError } = await supabase
      .from('meeting_participants')
      .insert(participantsData);
    
    if (participantsError) {
      console.error("Error adding participants:", participantsError);
      
      // Try to clean up the meeting since participants failed
      try {
        await supabase.from('meetings').delete().eq('id', meetingId);
        console.log("Deleted meeting due to participant insertion failure");
      } catch (cleanupError) {
        console.error("Failed to clean up meeting after participant error:", cleanupError);
      }
      
      return { 
        success: false, 
        error: `Failed to add participants: ${participantsError.message || JSON.stringify(participantsError)}` 
      };
    }
    
    return { success: true, meeting: newMeeting[0] };
  } catch (error) {
    // Improved error handling for unexpected errors
    const errorMessage = error instanceof Error 
      ? error.message 
      : (typeof error === 'string' ? error : 'Unknown error');
      
    console.error('Error creating meeting:', error);
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

// Update meeting request status
export async function updateMeetingRequestStatus(
  requestId: string, 
  status: 'approved' | 'rejected',
  meetingId?: string
): Promise<MeetingRequestUpdateResult> {
  try {
    // First, get the request details
    const { data: requestData, error: requestError } = await supabase
      .from('meeting_requests')
      .select(`
        *,
        student:student_id (
          full_name
        )
      `)
      .eq('id', requestId)
      .single();
    
    if (requestError) {
      console.error('Error fetching request details:', requestError);
      return { success: false, error: requestError };
    }
    
    if (!requestData) {
      console.error('No request found with ID:', requestId);
      return { success: false, error: 'Meeting request not found' };
    }
    
    console.log('Request data:', requestData);
    
    let newMeetingId = meetingId;
    
    // If approved, create a new meeting
    if (status === 'approved' && !meetingId) {
      console.log('Creating new meeting from approved request');
      
      // Convert preferred_date and preferred_time to a datetime
      const dateTime = new Date(`${requestData.preferred_date}T${requestData.preferred_time}`);
      
      // Create the meeting
      const { data: newMeeting, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          title: requestData.title,
          meeting_type: 'individual',
          date_time: dateTime.toISOString(),
          duration_minutes: 30, // Default to 30 minutes
          location_type: 'office', // Default to office
          agenda: requestData.description,
          created_by: requestData.supervisor_id,
          status: 'upcoming'
        })
        .select();
      
      if (meetingError) {
        console.error('Error creating meeting from request:', meetingError);
        return { success: false, error: meetingError };
      }
      
      if (!newMeeting || newMeeting.length === 0) {
        console.error('No meeting data returned after insert');
        return { success: false, error: 'Failed to create meeting' };
      }
      
      newMeetingId = newMeeting[0].id;
      console.log('Created meeting with ID:', newMeetingId);
      
      // Add the student as a participant
      const { error: participantError } = await supabase
        .from('meeting_participants')
        .insert({
          meeting_id: newMeetingId,
          participant_id: requestData.student_id,
          attendance_status: 'confirmed'
        });
      
      if (participantError) {
        console.error('Error adding participant:', participantError);
        // Try to clean up the meeting
        await supabase.from('meetings').delete().eq('id', newMeetingId);
        return { success: false, error: participantError };
      }
    }
    
    // Update the request status
    const { error } = await supabase
      .from('meeting_requests')
      .update({ 
        status, 
        meeting_id: newMeetingId,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);
    
    if (error) {
      console.error('Error updating meeting request:', error);
      return { success: false, error };
    }
    
    return { 
      success: true, 
      meetingId: newMeetingId,
      message: status === 'approved' ? 'Meeting request approved and meeting created' : 'Meeting request rejected'
    };
  } catch (error) {
    console.error('Error updating meeting request:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Create a meeting request (for students)
export async function createMeetingRequest(requestData: {
  title: string;
  description?: string;
  preferred_date: string;
  preferred_time: string;
  student_id: string;
  supervisor_id: string;
}) {
  try {
    const { error } = await supabase
      .from('meeting_requests')
      .insert({
        title: requestData.title,
        description: requestData.description,
        preferred_date: requestData.preferred_date,
        preferred_time: requestData.preferred_time,
        student_id: requestData.student_id,
        supervisor_id: requestData.supervisor_id,
        status: 'pending'
      });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error creating meeting request:', error);
    return { success: false, error };
  }
}

// Get student meetings
export async function getStudentMeetings(studentId: string): Promise<StudentMeeting[]> {
  try {
    const { data, error } = await supabase
      .from('student_meetings_view')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'upcoming')
      .order('date_time', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching student meetings:', error);
    return [];
  }
}

// Get student meeting history
export async function getStudentMeetingHistory(studentId: string): Promise<StudentMeeting[]> {
  try {
    const { data, error } = await supabase
      .from('student_meetings_view')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'completed')
      .order('date_time', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching student meeting history:', error);
    return [];
  }
}

// Get student's meeting requests
export async function getStudentMeetingRequests(studentId: string): Promise<MeetingRequest[]> {
  try {
    const { data, error } = await supabase
      .from('meeting_requests')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching student meeting requests:', error);
    return [];
  }
}

// Fetch project submissions for a supervisor
export async function getProjectSubmissions(supervisorId: string): Promise<ProjectSubmission[]> {
  try {
    const { data, error } = await supabase
      .from('project_submissions_view')
      .select('*')
      .eq('supervisor_id', supervisorId)
      .order('submitted_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching project submissions:', error);
    return [];
  }
}

// Fetch pending project submissions for a supervisor
export async function getPendingSubmissions(supervisorId: string): Promise<ProjectSubmission[]> {
  try {
    const { data, error } = await supabase
      .from('project_submissions_view')
      .select('*')
      .eq('supervisor_id', supervisorId)
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pending submissions:', error);
    return [];
  }
}

// Update submission status (approve or reject)
export async function updateSubmissionStatus(
  submissionId: string, 
  status: 'approved' | 'rejected', 
  feedback?: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('project_submissions')
      .update({ 
        status, 
        feedback,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', submissionId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating submission status:', error);
    return { success: false, error };
  }
}

// Set project deadline
export async function setProjectDeadline(deadline: {
  project_type: string;
  deadline_date: string;
  description?: string;
  supervisor_id: string;
  student_id?: string; // Optional: if undefined/null, applies to all students
}): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('project_deadlines')
      .insert({
        project_type: deadline.project_type,
        deadline_date: deadline.deadline_date,
        description: deadline.description,
        supervisor_id: deadline.supervisor_id,
        student_id: deadline.student_id, // Will be null if not provided
        status: 'active',
        created_at: new Date().toISOString()
      });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error setting project deadline:', error);
    return { success: false, error };
  }
}

// Update project deadline
export async function updateProjectDeadline(deadline: {
  id: string;
  project_type?: string;
  deadline_date?: string;
  description?: string;
  student_id?: string | null;
  status?: string;
}): Promise<{ success: boolean; error?: any }> {
  try {
    // Only include fields that are provided
    const updateData: any = {};
    if (deadline.project_type !== undefined) updateData.project_type = deadline.project_type;
    if (deadline.deadline_date !== undefined) updateData.deadline_date = deadline.deadline_date;
    if (deadline.description !== undefined) updateData.description = deadline.description;
    if (deadline.student_id !== undefined) updateData.student_id = deadline.student_id;
    if (deadline.status !== undefined) updateData.status = deadline.status;
    
    const { error } = await supabase
      .from('project_deadlines')
      .update(updateData)
      .eq('id', deadline.id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating project deadline:', error);
    return { success: false, error };
  }
}

// Delete project deadline
export async function deleteProjectDeadline(deadlineId: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('project_deadlines')
      .delete()
      .eq('id', deadlineId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting project deadline:', error);
    return { success: false, error };
  }
}

// Get project deadlines for a supervisor
export async function getProjectDeadlines(supervisorId: string) {
  try {
    // First get all deadlines
    const { data, error } = await supabase
      .from('project_deadlines')
      .select(`
        *,
        student:student_id (
          full_name
        )
      `)
      .eq('supervisor_id', supervisorId)
      .eq('status', 'active')
      .order('deadline_date', { ascending: true });
    
    if (error) throw error;
    
    // Format the data to include student_name and target_type
    return (data || []).map(item => ({
      ...item,
      student_name: item.student?.full_name || null,
      target_type: item.student_id ? 'specific' : 'all'
    }));
  } catch (error) {
    console.error('Error fetching project deadlines:', error);
    return [];
  }
}

// Get project deadlines for a student
export async function getStudentProjectDeadlines(studentId: string) {
  try {
    // Get deadlines specific to this student
    const { data: specificDeadlines, error: specificError } = await supabase
      .from('project_deadlines')
      .select(`
        *,
        supervisor:supervisor_id (
          full_name
        )
      `)
      .eq('student_id', studentId)
      .eq('status', 'active')
      .order('deadline_date', { ascending: true });
    
    if (specificError) throw specificError;
    
    // Get general deadlines (for all students) from this student's supervisor
    const { data: supervisorData, error: supervisorError } = await supabase
      .from('student_supervisor_relationships_view')
      .select('supervisor_id')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .single();
    
    if (supervisorError && supervisorError.code !== 'PGRST116') throw supervisorError;
    
    let generalDeadlines: any[] = [];
    if (supervisorData?.supervisor_id) {
      const { data: genDeadlines, error: genError } = await supabase
        .from('project_deadlines')
        .select(`
          *,
          supervisor:supervisor_id (
            full_name
          )
        `)
        .eq('supervisor_id', supervisorData.supervisor_id)
        .is('student_id', null) // Deadlines for all students
        .eq('status', 'active')
        .order('deadline_date', { ascending: true });
      
      if (genError) throw genError;
      generalDeadlines = genDeadlines || [];
    }
    
    // Combine and format the deadlines
    const allDeadlines = [...(specificDeadlines || []), ...generalDeadlines];
    
    return allDeadlines.map(item => ({
      id: item.id,
      project_type: item.project_type,
      deadline_date: item.deadline_date,
      description: item.description || '',
      supervisor_id: item.supervisor_id,
      supervisor_name: item.supervisor?.full_name || 'Unknown',
      created_at: item.created_at,
      is_specific: item.student_id !== null
    }));
  } catch (error) {
    console.error('Error fetching student project deadlines:', error);
    return [];
  }
}

// Submit feedback for a student's project (with group sync support)
export async function submitFeedback(feedback: {
  student_id: string;
  supervisor_id: string;
  project_type: string;
  status: 'approved' | 'revisions' | 'rejected';
  comments: string;
  document_url?: string;
}): Promise<{ success: boolean; error?: any; feedback_id?: string; group_info?: any }> {
  try {
    // Use the group-aware feedback sync function
    const { data, error } = await supabase
      .rpc('supervisor_feedback_group_sync', {
        target_student_id: feedback.student_id,
        supervisor_id_param: feedback.supervisor_id,
        project_type_param: feedback.project_type,
        status_param: feedback.status,
        comments_param: feedback.comments,
        document_url_param: feedback.document_url || null
      });
    
    if (error) {
      console.error('Error with group feedback sync:', error);
      throw error;
    }
    
    // Parse the JSON response from the function
    const result = data;
    
    if (result.success) {
      console.log('Group feedback sync result:', result);
      return { 
        success: true, 
        feedback_id: 'group-sync', // We don't have individual IDs in group sync
        group_info: {
          is_group: result.is_group,
          group_name: result.group_name,
          affected_students: result.affected_students,
          message: result.message
        }
      };
    } else {
      throw new Error(result.message || 'Group feedback sync failed');
    }
    
  } catch (error) {
    console.error('Error submitting feedback:', error);
    
    // Fallback to individual feedback if group sync fails
    try {
      console.log('Falling back to individual feedback insertion...');
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('feedback')
        .insert({
          student_id: feedback.student_id,
          supervisor_id: feedback.supervisor_id,
          project_type: feedback.project_type,
          status: feedback.status,
          comments: feedback.comments,
          document_url: feedback.document_url,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (fallbackError) throw fallbackError;
      
      return { 
        success: true, 
        feedback_id: fallbackData?.id,
        group_info: {
          is_group: false,
          message: 'Individual feedback created (group sync failed)'
        }
      };
    } catch (fallbackError) {
      console.error('Fallback feedback insertion also failed:', fallbackError);
      return { success: false, error: fallbackError };
    }
  }
}

// Get feedback for a supervisor (feedback they've given)
export async function getSupervisorFeedback(supervisorId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('feedback_view')
      .select('*')
      .eq('supervisor_id', supervisorId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching supervisor feedback:', error);
    return [];
  }
}

// Get feedback for a student (feedback they've received)
export async function getStudentFeedback(studentId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('feedback_view')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching student feedback:', error);
    return [];
  }
}

// Get pending submissions for feedback (simplified approach)
export async function getPendingFeedbackSubmissions(supervisorId: string): Promise<any[]> {
  try {
    console.log(`\n=== STARTING SUBMISSION FETCH FOR SUPERVISOR: ${supervisorId} ===`);
    const allSubmissions = new Map<string, any>();
    
    // Step 1: Get all students assigned to this supervisor (individual assignments)
    console.log('Step 1: Fetching individually assigned students...');
    const { data: individualStudents, error: individualStudentsError } = await supabase
      .from('student_supervisor_relationships_view')
      .select('student_id')
      .eq('supervisor_id', supervisorId)
      .eq('status', 'active');
    
    if (individualStudentsError) {
      console.error('Error fetching individual students:', individualStudentsError);
    } else {
      console.log(`Found ${individualStudents?.length || 0} individually assigned students`);
    }
    
    // Step 2: Get submissions from individually assigned students
    if (individualStudents && individualStudents.length > 0) {
      console.log('Step 2: Fetching submissions from individual students...');
      const individualStudentIds = individualStudents.map(s => s.student_id);
      
      const { data: individualSubmissions, error: individualError } = await supabase
        .from('project_submissions')
        .select(`
          id,
          student_id,
          title,
          project_type,
          status,
          submitted_at,
          file_url,
          description
        `)
        .in('student_id', individualStudentIds)
        .order('submitted_at', { ascending: false });
    
      if (individualError) {
        console.error('Error fetching individual submissions:', individualError);
      } else {
        console.log(`Found ${individualSubmissions?.length || 0} individual submissions`);
        if (individualSubmissions) {
          // Get student names separately to avoid join issues
          for (const submission of individualSubmissions) {
            const { data: studentProfile } = await supabase
              .from('profiles')
              .select('full_name, reference_number')
              .eq('id', submission.student_id)
              .single();
            
            allSubmissions.set(submission.id, {
              ...submission,
              student_name: studentProfile?.full_name || 'Unknown Student',
              student_reference: studentProfile?.reference_number || '',
              assignment_type: 'individual'
            });
          }
        }
      }
    }
    
    // Step 3: Try to get group-assigned students (with error handling)
    console.log('Step 3: Attempting to fetch group-assigned students...');
    try {
      const { data: groupData, error: groupError } = await supabase
        .from('student_groups')
        .select('id, supervisor_id')
        .eq('supervisor_id', supervisorId)
        .eq('status', 'active')
        .limit(1); // Just test if the table exists
      
      if (groupError) {
        console.log('Group assignments table not accessible or doesn\'t exist:', groupError);
        console.log('Skipping group submissions - using individual assignments only');
      } else {
        console.log(`Found ${groupData?.length || 0} groups for this supervisor`);
        // If groups exist, try to get group members and their submissions
        // For now, we'll skip this complex query and focus on individual assignments
        console.log('Group functionality temporarily disabled for debugging');
      }
    } catch (groupErr) {
      console.log('Group functionality not available:', groupErr);
    }
    
    // Convert map to array and sort by submission date
    const submissions = Array.from(allSubmissions.values())
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
    
    console.log(`\n=== SUBMISSION FETCH RESULTS ===`);
    console.log(`Supervisor ID: ${supervisorId}`);
    console.log(`Individual students found: ${individualStudents?.length || 0}`);
    console.log(`Total submissions found: ${submissions.length}`);
    console.log(`Individual submissions: ${Array.from(allSubmissions.values()).filter(s => s.assignment_type === 'individual').length}`);
    console.log(`Group submissions: ${Array.from(allSubmissions.values()).filter(s => s.assignment_type === 'group').length}`);
    
    if (submissions.length > 0) {
      console.log('Sample submission:', submissions[0]);
    } else {
      console.log('No submissions found - this could mean:');
      console.log('1. No students have submitted any work yet');
      console.log('2. No students are assigned to this supervisor');
      console.log('3. Database table structure issues');
    }
    console.log(`=================================\n`);
    
    return submissions;
    
  } catch (error) {
    console.error('Error fetching pending feedback submissions:', error);
    return [];
  }
}
