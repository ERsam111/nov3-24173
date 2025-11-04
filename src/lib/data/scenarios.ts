import { supabase } from '@/integrations/supabase/client';
import { nextAutoName } from '../naming';

type ModuleType = 'forecasting' | 'gfa' | 'inventory' | 'network';

export interface Scenario {
  id: string;
  project_id: string;
  user_id: string;
  module_type: ModuleType;
  name: string;
  description: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

/**
 * Ensure a scenario exists for the project and module
 * Returns existing scenario or creates one with auto-name
 */
export async function ensureScenario(
  projectId: string,
  userId: string,
  moduleType: ModuleType
): Promise<Scenario | null> {
  try {
    // Try to get the most recent scenario for this project and module
    const { data: existing, error: fetchError } = await supabase
      .from('scenarios')
      .select('*')
      .eq('project_id', projectId)
      .eq('module_type', moduleType)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (existing && !fetchError) {
      return existing as Scenario;
    }

    // Create new scenario with auto-name
    const name = await nextAutoName(
      async () => {
        const { data } = await supabase
          .from('scenarios')
          .select('name')
          .eq('project_id', projectId)
          .eq('module_type', moduleType);
        return data?.map(s => s.name) || [];
      },
      'Scenario'
    );

    const { data: newScenario, error: createError } = await supabase
      .from('scenarios')
      .insert([{
        project_id: projectId,
        user_id: userId,
        module_type: moduleType,
        name,
        description: null,
        status: 'pending'
      }])
      .select()
      .single();

    if (createError) {
      // Handle race condition - try again with next number
      if (createError.code === '23505') {
        const retryName = await nextAutoName(
          async () => {
            const { data } = await supabase
              .from('scenarios')
              .select('name')
              .eq('project_id', projectId)
              .eq('module_type', moduleType);
            return data?.map(s => s.name) || [];
          },
          'Scenario'
        );

        const { data: retryScenario, error: retryError } = await supabase
          .from('scenarios')
          .insert([{
            project_id: projectId,
            user_id: userId,
            module_type: moduleType,
            name: retryName,
            description: null,
            status: 'pending'
          }])
          .select()
          .single();

        if (retryError) throw retryError;
        return retryScenario as Scenario;
      }
      throw createError;
    }

    return newScenario as Scenario;
  } catch (error) {
    console.error('Error ensuring scenario:', error);
    return null;
  }
}

/**
 * Rename a scenario with uniqueness validation
 */
export async function renameScenario(
  id: string,
  newName: string,
  projectId: string,
  moduleType: ModuleType
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if name is already taken
    const { data: existing } = await supabase
      .from('scenarios')
      .select('id')
      .eq('project_id', projectId)
      .eq('module_type', moduleType)
      .eq('name', newName)
      .neq('id', id)
      .single();

    if (existing) {
      return {
        success: false,
        error: `A scenario named '${newName}' already exists in this module. Please choose a different name.`
      };
    }

    const { error } = await supabase
      .from('scenarios')
      .update({ name: newName })
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        return {
          success: false,
          error: `A scenario named '${newName}' already exists in this module. Please choose a different name.`
        };
      }
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error renaming scenario:', error);
    return { success: false, error: 'Failed to rename scenario' };
  }
}

/**
 * List scenarios with pagination
 */
export async function listScenarios(
  projectId: string,
  moduleType: ModuleType,
  limit: number = 20,
  offset: number = 0
): Promise<Scenario[]> {
  try {
    const { data, error } = await supabase
      .from('scenarios')
      .select('*')
      .eq('project_id', projectId)
      .eq('module_type', moduleType)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data as Scenario[];
  } catch (error) {
    console.error('Error listing scenarios:', error);
    return [];
  }
}
