import { supabase } from './supabase';

export interface Resource {
  id?: string;
  title: string;
  description: string;
  type: string; // pdf, word, powerpoint, etc.
  url?: string;
  created_at?: string;
  updated_at?: string;
}

// Fetch all resources
export async function getAllResources(): Promise<Resource[]> {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching resources:', error);
    throw error;
  }
}

// Add a new resource
export async function addResource(resource: Resource): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    // Use client with temporary permissive policy
    const { data, error } = await supabase
      .from('resources')
      .insert(resource)
      .select('id')
      .single();
    
    if (error) {
      throw error;
    }
    
    return { success: true, id: data?.id };
  } catch (error: any) {
    console.error('Error adding resource:', error);
    return { success: false, error: error.message };
  }
}

// Upload a resource file to storage
export async function uploadResourceFile(file: File): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `resources/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('resources')
      .upload(filePath, file);
    
    if (error) {
      throw error;
    }
    
    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('resources')
      .getPublicUrl(filePath);
    
    return {
      success: true,
      url: publicUrlData.publicUrl
    };
  } catch (error: any) {
    console.error('Error uploading resource file:', error);
    return { success: false, error: error.message };
  }
}

// Delete a resource
export async function deleteResource(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', id);
    
    if (error) {
      throw error;
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting resource:', error);
    return { success: false, error: error.message };
  }
} 