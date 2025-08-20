export interface Project {
  id: number
  student: string
  title: string
  date: string
  status: string
}

export interface Student {
  id: number
  name: string
  progress: number
  avatar: string
}

export interface RepositoryProject {
  id: number
  title: string
  year: number
  department: string
  author: string
  supervisor: string
  tags: string[]
  description: string
  image: string
}

export interface ProjectSubmission {
  id: string
  student_id: string
  supervisor_id: string
  student_name: string
  student_reference: string
  supervisor_name: string
  supervisor_reference: string
  project_type: 'proposal' | 'literature' | 'methodology' | 'implementation' | 'thesis'
  title: string
  abstract?: string
  keywords?: string[]
  document_url?: string
  status: 'pending' | 'approved' | 'rejected'
  feedback?: string
  submitted_at: string
  reviewed_at?: string
}

// Meeting types
export type MeetingType = 'individual' | 'group' | 'workshop';
export type LocationType = 'virtual' | 'office' | 'custom';
export type MeetingStatus = 'upcoming' | 'completed' | 'cancelled';
export type AttendanceStatus = 'pending' | 'confirmed' | 'declined' | 'attended' | 'absent';
export type MeetingRequestStatus = 'pending' | 'approved' | 'rejected';

export interface Meeting {
  meeting_id: string;
  title: string;
  meeting_type: MeetingType;
  date_time: string;
  duration_minutes: number;
  location_type: LocationType;
  location_details?: string;
  agenda?: string;
  status: MeetingStatus;
  created_by: string;
  created_by_name: string;
  participant_count?: number;
  created_at: string;
  updated_at: string;
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  participant_id: string;
  participant_name: string;
  participant_type: string;
  attendance_status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

export interface UpcomingMeeting extends Meeting {
  participant_id: string;
  participant_name: string;
  participant_type: string;
  attendance_status: AttendanceStatus;
}

export interface StudentMeeting {
  meeting_id: string;
  title: string;
  meeting_type: MeetingType;
  date_time: string;
  duration_minutes: number;
  location_type: LocationType;
  location_details?: string;
  agenda?: string;
  status: MeetingStatus;
  created_by: string;
  supervisor_name: string;
  student_id: string;
  attendance_status: AttendanceStatus;
  created_at: string;
  updated_at: string;
}

export interface MeetingRequest {
  id: string;
  title: string;
  description?: string;
  preferred_date: string;
  preferred_time: string;
  student_id: string;
  student_name?: string;
  supervisor_id: string;
  status: MeetingRequestStatus;
  meeting_id?: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingStats {
  today: {
    total: number;
    completed: number;
    upcoming: number;
  };
  thisWeek: {
    total: number;
    scheduled: number;
    pending: number;
  };
  requests: {
    total: number;
  };
}

export interface MeetingRequestUpdateResult {
  success: boolean;
  error?: any;
  message?: string;
  meetingId?: string;
}

export interface ProjectDeadline {
  id: string;
  project_type: 'proposal' | 'literature' | 'methodology' | 'implementation' | 'thesis';
  deadline_date: string;
  description?: string;
  supervisor_id: string;
  student_id?: string; // Optional: if null/undefined, applies to all students
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
  updated_at?: string;
}

export interface ProjectDeadlineWithStudentInfo extends ProjectDeadline {
  student_name?: string;
  target_type: 'all' | 'specific';
}

export interface StudentProjectDeadline {
  id: string;
  project_type: string;
  deadline_date: string;
  description: string;
  supervisor_id: string;
  supervisor_name: string;
  created_at: string;
  is_specific: boolean;
}

export interface Feedback {
  id: string;
  student_id: string;
  supervisor_id: string;
  project_type: string;
  status: 'approved' | 'revisions' | 'rejected';
  comments: string;
  document_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface FeedbackView extends Feedback {
  student_name: string;
  student_reference: string;
  supervisor_name: string;
  supervisor_reference: string;
  project_title?: string;
  submission_id?: string;
}
