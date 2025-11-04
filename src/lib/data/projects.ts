import { supabase } from '@/integrations/supabase/client';
import { nextAutoName } from '../naming';

type ToolType = 'gfa' | 'forecasting' | 'network' | 'inventory' | 'transportation';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  tool_type: ToolType;
  input_data: any;
  results_data: any;
  size_mb: number;
  created_at: string;
  updated_at: string;
}

/**
 * Ensure a project exists for the user in the given module
 * Returns existing project or creates one with auto-name
 */
export async function ensureProject(userId: string, toolType: ToolType): Promise<Project | null> {
  try {
    // Try to get the most recent project for this tool type
    const { data: existing, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .eq('tool_type', toolType)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (existing && !fetchError) {
      return existing as Project;
    }

    // Create new project with auto-name
    const name = await nextAutoName(
      async () => {
        const { data } = await supabase
          .from('projects')
          .select('name')
          .eq('user_id', userId);
        return data?.map(p => p.name) || [];
      },
      'Project'
    );

    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert([{
        user_id: userId,
        name,
        tool_type: toolType,
        description: null,
        input_data: {},
        results_data: {},
        size_mb: 0
      }])
      .select()
      .single();

    if (createError) {
      // Handle race condition - try again with next number
      if (createError.code === '23505') {
        const retryName = await nextAutoName(
          async () => {
            const { data } = await supabase
              .from('projects')
              .select('name')
              .eq('user_id', userId);
            return data?.map(p => p.name) || [];
          },
          'Project'
        );

        const { data: retryProject, error: retryError } = await supabase
          .from('projects')
          .insert([{
            user_id: userId,
            name: retryName,
            tool_type: toolType,
            description: null,
            input_data: {},
            results_data: {},
            size_mb: 0
          }])
          .select()
          .single();

        if (retryError) throw retryError;
        return retryProject as Project;
      }
      throw createError;
    }

    return newProject as Project;
  } catch (error) {
    console.error('Error ensuring project:', error);
    return null;
  }
}

/**
 * Rename a project with uniqueness validation
 */
export async function renameProject(
  id: string,
  newName: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if name is already taken
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId)
      .eq('name', newName)
      .neq('id', id)
      .single();

    if (existing) {
      return {
        success: false,
        error: `A project named '${newName}' already exists. Please choose a different name.`
      };
    }

    const { error } = await supabase
      .from('projects')
      .update({ name: newName })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      if (error.code === '23505') {
        return {
          success: false,
          error: `A project named '${newName}' already exists. Please choose a different name.`
        };
      }
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error renaming project:', error);
    return { success: false, error: 'Failed to rename project' };
  }
}

/**
 * List projects with pagination
 */
export async function listProjects(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<Project[]> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data as Project[];
  } catch (error) {
    console.error('Error listing projects:', error);
    return [];
  }
}
