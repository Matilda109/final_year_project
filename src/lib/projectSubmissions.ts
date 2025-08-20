import { supabase } from './supabase';

export interface ProjectSubmission {
  id?: string;
  student_id: string;
  supervisor_id: string;
  project_type: 'proposal' | 'literature' | 'methodology' | 'implementation' | 'thesis';
  title: string;
  abstract?: string;
  keywords?: string[];
  document_url?: string;
  status?: 'pending' | 'approved' | 'rejected';
  feedback?: string;
  submitted_at?: string;
  reviewed_at?: string;
}

// Submit a new project
export async function submitProject(submission: ProjectSubmission): Promise<{ success: boolean; error?: any; id?: string }> {
  try {
    const { data, error } = await supabase
      .from('project_submissions')
      .insert(submission)
      .select('id')
      .single();
    
    if (error) throw error;
    return { success: true, id: data?.id };
  } catch (error: any) {
    console.error('Error submitting project:', error);
    return { success: false, error: error.message || "Unknown error occurred" };
  }
}

// Get all submissions for a student
export async function getStudentSubmissions(studentId: string): Promise<ProjectSubmission[]> {
  try {
    const { data, error } = await supabase
      .from('project_submissions')
      .select('*')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching student submissions:', error);
    return [];
  }
}

// Get all submissions for a supervisor
export async function getSupervisorSubmissions(supervisorId: string): Promise<ProjectSubmission[]> {
  try {
    const { data, error } = await supabase
      .from('project_submissions_view')
      .select('*')
      .eq('supervisor_id', supervisorId)
      .order('submitted_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching supervisor submissions:', error);
    return [];
  }
}

// Get pending submissions for a supervisor
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
  } catch (error: any) {
    console.error('Error updating submission status:', error);
    return { success: false, error: error.message || "Unknown error occurred" };
  }
}

// Upload project document to storage
export async function uploadProjectDocument(file: File, studentId: string): Promise<{ success: boolean; url?: string; error?: any }> {
  try {
    // Note: We'll assume the bucket already exists and is properly configured in Supabase
    const bucketName = 'project-documents';
    
    // Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${studentId}_${Date.now()}.${fileExt}`;
    
    // Upload the file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }
    
    if (!uploadData || !uploadData.path) {
      return { success: false, error: 'Upload completed but no file path returned' };
    }
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uploadData.path);
    
    if (!urlData || !urlData.publicUrl) {
      return { success: false, error: 'Could not generate public URL for uploaded file' };
    }
    
    return { 
      success: true, 
      url: urlData.publicUrl 
    };
  } catch (error: any) {
    console.error('Error uploading project document:', error);
    return { 
      success: false, 
      error: error.message || "Unknown error occurred during file upload"
    };
  }
} 