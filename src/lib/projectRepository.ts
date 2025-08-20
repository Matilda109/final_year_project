import { supabase } from './supabase';

export interface RepositoryProject {
  id?: string;
  title: string;
  author: string;
  supervisor: string;
  year: number;
  department: string;
  description: string;
  tags: string[];
  document_url?: string;
  image_url?: string;
}

// Fetch all projects from the repository
export async function getAllProjects(): Promise<RepositoryProject[]> {
  try {
    const { data, error } = await supabase
      .from('project_repository')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

// Add a new project to the repository
export async function addProject(project: RepositoryProject): Promise<{ success: boolean; error?: any; id?: string }> {
  try {
    const { data, error } = await supabase
      .from('project_repository')
      .insert(project)
      .select('id')
      .single();
    
    if (error) throw error;
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Error adding project:', error);
    return { success: false, error };
  }
}

// Update an existing project
export async function updateProject(id: string, project: Partial<RepositoryProject>): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('project_repository')
      .update(project)
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating project:', error);
    return { success: false, error };
  }
}

// Delete a project
export async function deleteProject(id: string): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('project_repository')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { success: false, error };
  }
}

// Upload a project document
export async function uploadProjectDocument(file: File): Promise<{ success: boolean; url?: string; error?: any }> {
  try {
    // Check if file size is within limits (50MB max)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      return { 
        success: false, 
        error: `File size exceeds the maximum limit of 50MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB` 
      };
    }
    
    // Check file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'zip'];
    
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      return {
        success: false,
        error: `Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`
      };
    }
    
    // Generate a unique file name
    const fileName = `documents/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    
    // Upload the file
    const { data, error } = await supabase.storage
      .from('projects')
      .upload(fileName, file);
    
    if (error) {
      console.error('Storage upload error:', error);
      return { success: false, error: error.message };
    }
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('projects')
      .getPublicUrl(data.path);
    
    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    console.error('Error uploading document:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Upload a project image
export async function uploadProjectImage(file: File): Promise<{ success: boolean; url?: string; error?: any }> {
  try {
    // Check if file size is within limits (10MB max for images)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      return { 
        success: false, 
        error: `File size exceeds the maximum limit of 10MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB` 
      };
    }
    
    // Check file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      return {
        success: false,
        error: `Invalid image type. Allowed types: ${allowedExtensions.join(', ')}`
      };
    }
    
    // Generate a unique file name
    const fileName = `images/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    
    // Upload the file
    const { data, error } = await supabase.storage
      .from('projects')
      .upload(fileName, file, {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`
      });
    
    if (error) {
      console.error('Storage upload error:', error);
      return { success: false, error: error.message };
    }
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('projects')
      .getPublicUrl(data.path);
    
    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    console.error('Error uploading image:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Filter projects by department, year, etc.
export async function filterProjects(filters: {
  department?: string;
  year?: number;
  searchQuery?: string;
}): Promise<RepositoryProject[]> {
  try {
    let query = supabase
      .from('project_repository')
      .select('*');
    
    if (filters.department && filters.department !== 'All') {
      query = query.eq('department', filters.department);
    }
    
    if (filters.year && filters.year !== 0) {
      query = query.eq('year', filters.year);
    }
    
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const searchTerm = `%${filters.searchQuery.toLowerCase()}%`;
      query = query.or(`title.ilike.${searchTerm},author.ilike.${searchTerm},description.ilike.${searchTerm}`);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error filtering projects:', error);
    return [];
  }
} 