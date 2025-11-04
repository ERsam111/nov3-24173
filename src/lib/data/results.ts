import { supabase } from '@/integrations/supabase/client';
import { nextAutoName } from '../naming';

export interface ResultMetrics {
  totalCost?: number;
  serviceLevel?: number;
  runTimeSec?: number;
  [key: string]: any;
}

export interface Result {
  id: string;
  project_id: string;
  scenario_id: string;
  module_type: string;
  name: string;
  result_number: number;
  metrics: ResultMetrics;
  output_data: any; // Full payload for rendering
  version: number;
  created_at: string;
}

/**
 * Create a new result with auto-name
 */
export async function createResult(params: {
  projectId: string;
  scenarioId: string;
  moduleType: string;
  metrics: ResultMetrics;
  payload: any;
}): Promise<{ id: string; name: string; created_at: string } | null> {
  try {
    // Get next result number
    const { data: existingResults } = await supabase
      .from('scenario_outputs')
      .select('result_number, name')
      .eq('scenario_id', params.scenarioId)
      .order('result_number', { ascending: false })
      .limit(1);

    const nextResultNumber = existingResults && existingResults.length > 0
      ? existingResults[0].result_number + 1
      : 1;

    // Generate auto-name
    const name = await nextAutoName(
      async () => {
        const { data } = await supabase
          .from('scenario_outputs')
          .select('name')
          .eq('scenario_id', params.scenarioId);
        return data?.map(r => r.name) || [];
      },
      'Result'
    );

    const { data: newResult, error: createError } = await supabase
      .from('scenario_outputs')
      .insert([{
        project_id: params.projectId,
        scenario_id: params.scenarioId,
        module_type: params.moduleType,
        name,
        result_number: nextResultNumber,
        metrics: params.metrics,
        output_data: params.payload,
        version: 1
      }])
      .select('id, name, created_at')
      .single();

    if (createError) {
      // Handle race condition
      if (createError.code === '23505') {
        const retryName = await nextAutoName(
          async () => {
            const { data } = await supabase
              .from('scenario_outputs')
              .select('name')
              .eq('scenario_id', params.scenarioId);
            return data?.map(r => r.name) || [];
          },
          'Result'
        );

        const { data: retryResult, error: retryError } = await supabase
          .from('scenario_outputs')
          .insert([{
            project_id: params.projectId,
            scenario_id: params.scenarioId,
            module_type: params.moduleType,
            name: retryName,
            result_number: nextResultNumber,
            metrics: params.metrics,
            output_data: params.payload,
            version: 1
          }])
          .select('id, name, created_at')
          .single();

        if (retryError) throw retryError;
        return retryResult;
      }
      throw createError;
    }

    return newResult;
  } catch (error) {
    console.error('Error creating result:', error);
    return null;
  }
}

/**
 * List results with pagination
 */
export async function listResults(
  scenarioId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<Result[]> {
  const { limit = 10, offset = 0 } = options;

  try {
    const { data, error } = await supabase
      .from('scenario_outputs')
      .select('*')
      .eq('scenario_id', scenarioId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data as Result[];
  } catch (error) {
    console.error('Error listing results:', error);
    return [];
  }
}

/**
 * Get a single result by ID
 */
export async function getResult(id: string): Promise<Result | null> {
  try {
    const { data, error } = await supabase
      .from('scenario_outputs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Result;
  } catch (error) {
    console.error('Error getting result:', error);
    return null;
  }
}

/**
 * Rename a result with uniqueness validation
 */
export async function renameResult(
  id: string,
  newName: string,
  scenarioId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if name is already taken
    const { data: existing } = await supabase
      .from('scenario_outputs')
      .select('id')
      .eq('scenario_id', scenarioId)
      .eq('name', newName)
      .neq('id', id)
      .single();

    if (existing) {
      return {
        success: false,
        error: `A result named '${newName}' already exists in this scenario. Please choose a different name.`
      };
    }

    const { error } = await supabase
      .from('scenario_outputs')
      .update({ name: newName })
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        return {
          success: false,
          error: `A result named '${newName}' already exists in this scenario. Please choose a different name.`
        };
      }
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error renaming result:', error);
    return { success: false, error: 'Failed to rename result' };
  }
}
