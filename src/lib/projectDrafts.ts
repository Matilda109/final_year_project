import { supabase } from './supabase';

export interface ProjectDraft {
  id?: string;
  user_id: string;
  title: string;
  description: string;
  tags: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Create a new project draft
 */
export async function createDraft(draft: ProjectDraft): Promise<ProjectDraft | null> {
  try {
    const { data, error } = await supabase
      .from('project_drafts')
      .insert([draft])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating draft:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception creating draft:', error);
    return null;
  }
}

/**
 * Get all drafts for a user
 */
export async function getUserDrafts(userId: string): Promise<ProjectDraft[]> {
  try {
    const { data, error } = await supabase
      .from('project_drafts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user drafts:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception fetching user drafts:', error);
    return [];
  }
}

/**
 * Update an existing draft
 */
export async function updateDraft(draft: ProjectDraft): Promise<ProjectDraft | null> {
  if (!draft.id) {
    console.error('Draft ID is required for update');
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('project_drafts')
      .update({
        title: draft.title,
        description: draft.description,
        tags: draft.tags,
        updated_at: new Date().toISOString()
      })
      .eq('id', draft.id)
      .eq('user_id', draft.user_id) // Security check
      .select()
      .single();
    
    if (error) {
      console.error('Error updating draft:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception updating draft:', error);
    return null;
  }
}

/**
 * Delete a draft
 */
export async function deleteDraft(draftId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('project_drafts')
      .delete()
      .eq('id', draftId)
      .eq('user_id', userId); // Security check
    
    if (error) {
      console.error('Error deleting draft:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception deleting draft:', error);
    return false;
  }
}

/**
 * Get a single draft by ID
 */
export async function getDraftById(draftId: string, userId: string): Promise<ProjectDraft | null> {
  try {
    const { data, error } = await supabase
      .from('project_drafts')
      .select('*')
      .eq('id', draftId)
      .eq('user_id', userId) // Security check
      .single();
    
    if (error) {
      console.error('Error fetching draft:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception fetching draft:', error);
    return null;
  }
} 