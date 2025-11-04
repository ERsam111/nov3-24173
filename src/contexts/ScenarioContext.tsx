import { createContext, useContext, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { ensureScenario as ensureScenarioData, renameScenario as renameScenarioData } from '@/lib/data/scenarios';
import { createResult, listResults, getResult } from '@/lib/data/results';

export type ModuleType = 'gfa' | 'forecasting' | 'network' | 'inventory';

export interface Scenario {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  description: string | null;
  module_type: ModuleType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface ScenarioInput {
  id: string;
  scenario_id: string;
  input_data: any;
  created_at: string;
}

export interface ScenarioOutput {
  id: string;
  scenario_id: string;
  output_data: any;
  result_number: number;
  created_at: string;
}

interface ScenarioContextType {
  scenarios: Scenario[];
  currentScenario: Scenario | null;
  loading: boolean;
  ensureScenario: (projectId: string, moduleType: ModuleType) => Promise<Scenario | null>;
  loadScenariosByProject: (projectId: string) => Promise<void>;
  createScenario: (scenario: Omit<Scenario, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Scenario | null>;
  updateScenario: (id: string, updates: Partial<Scenario>) => Promise<void>;
  renameScenario: (id: string, newName: string) => Promise<{ success: boolean; error?: string }>;
  deleteScenario: (id: string) => Promise<void>;
  setCurrentScenario: (scenario: Scenario | null) => void;
  saveScenarioInput: (scenarioId: string, inputData: any) => Promise<void>;
  saveScenarioOutput: (scenarioId: string, outputData: any, metrics?: any) => Promise<number>;
  loadScenarioInput: (scenarioId: string) => Promise<any>;
  loadScenarioOutput: (scenarioId: string) => Promise<any>;
  loadAllScenarioOutputs: (scenarioId: string) => Promise<ScenarioOutput[]>;
  loadScenarioOutputByVersion: (scenarioId: string, resultNumber: number) => Promise<any>;
}

const ScenarioContext = createContext<ScenarioContextType | undefined>(undefined);

export const ScenarioProvider = ({ children }: { children: React.ReactNode }) => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const ensureScenario = async (projectId: string, moduleType: ModuleType) => {
    if (!user) return null;

    const scenario = await ensureScenarioData(projectId, user.id, moduleType);
    if (scenario) {
      // Update local state
      const existingIndex = scenarios.findIndex(s => s.id === scenario.id);
      if (existingIndex === -1) {
        setScenarios([scenario as Scenario, ...scenarios]);
      }
      setCurrentScenario(scenario as Scenario);
    }
    return scenario as Scenario | null;
  };

  const loadScenariosByProject = async (projectId: string) => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('scenarios')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setScenarios(data as Scenario[]);
    }
    setLoading(false);
  };

  const createScenario = async (scenario: Omit<Scenario, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    const { data, error } = await (supabase as any)
      .from('scenarios')
      .insert([{ ...scenario, user_id: user.id }])
      .select()
      .single();

    if (!error && data) {
      setScenarios([data as Scenario, ...scenarios]);
      return data as Scenario;
    }
    return null;
  };

  const updateScenario = async (id: string, updates: Partial<Scenario>) => {
    const { error } = await (supabase as any)
      .from('scenarios')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setScenarios(scenarios.map(s => s.id === id ? { ...s, ...updates } : s));
      if (currentScenario?.id === id) {
        setCurrentScenario({ ...currentScenario, ...updates });
      }
    }
  };

  const renameScenario = async (id: string, newName: string) => {
    if (!user || !currentScenario) return { success: false, error: 'Not authenticated' };

    const result = await renameScenarioData(id, newName, currentScenario.project_id, currentScenario.module_type);
    if (result.success) {
      // Update local state
      setScenarios(scenarios.map(s => s.id === id ? { ...s, name: newName } : s));
      if (currentScenario?.id === id) {
        setCurrentScenario({ ...currentScenario, name: newName });
      }
    }
    return result;
  };

  const deleteScenario = async (id: string) => {
    const { error } = await (supabase as any)
      .from('scenarios')
      .delete()
      .eq('id', id);

    if (!error) {
      setScenarios(scenarios.filter(s => s.id !== id));
      if (currentScenario?.id === id) {
        setCurrentScenario(null);
      }
    }
  };

  const saveScenarioInput = async (scenarioId: string, inputData: any) => {
    // Check if an input already exists for this scenario
    const { data: existing } = await (supabase as any)
      .from('scenario_inputs')
      .select('id')
      .eq('scenario_id', scenarioId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      // Update existing input
      await (supabase as any)
        .from('scenario_inputs')
        .update({ input_data: inputData })
        .eq('id', existing.id);
    } else {
      // Create new input
      await (supabase as any)
        .from('scenario_inputs')
        .insert([{ scenario_id: scenarioId, input_data: inputData }]);
    }
  };

  const saveScenarioOutput = async (scenarioId: string, outputData: any, metrics: any = {}) => {
    if (!currentScenario) return 1;

    // Use the new createResult function
    const result = await createResult({
      projectId: currentScenario.project_id,
      scenarioId: scenarioId,
      moduleType: currentScenario.module_type,
      metrics: metrics,
      payload: outputData
    });
    
    if (result) {
      // Automatically update scenario status to completed
      await updateScenario(scenarioId, { status: 'completed' });
      
      // Extract result number from name or use 1
      const match = result.name.match(/Result (\d+)/);
      return match ? parseInt(match[1]) : 1;
    }
    
    return 1;
  };

  const loadScenarioInput = async (scenarioId: string) => {
    const { data, error } = await (supabase as any)
      .from('scenario_inputs')
      .select('input_data')
      .eq('scenario_id', scenarioId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      return data.input_data;
    }
    return null;
  };

  const loadScenarioOutput = async (scenarioId: string) => {
    const { data, error } = await (supabase as any)
      .from('scenario_outputs')
      .select('output_data, result_number')
      .eq('scenario_id', scenarioId)
      .order('result_number', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      return data.output_data;
    }
    return null;
  };

  const loadAllScenarioOutputs = async (scenarioId: string) => {
    const { data, error } = await (supabase as any)
      .from('scenario_outputs')
      .select('*')
      .eq('scenario_id', scenarioId)
      .order('result_number', { ascending: true });

    if (!error && data) {
      return data as ScenarioOutput[];
    }
    return [];
  };

  const loadScenarioOutputByVersion = async (scenarioId: string, resultNumber: number) => {
    const { data, error } = await (supabase as any)
      .from('scenario_outputs')
      .select('output_data')
      .eq('scenario_id', scenarioId)
      .eq('result_number', resultNumber)
      .single();

    if (!error && data) {
      return data.output_data;
    }
    return null;
  };

  return (
    <ScenarioContext.Provider value={{
      scenarios,
      currentScenario,
      loading,
      ensureScenario,
      loadScenariosByProject,
      createScenario,
      updateScenario,
      renameScenario,
      deleteScenario,
      setCurrentScenario,
      saveScenarioInput,
      saveScenarioOutput,
      loadScenarioInput,
      loadScenarioOutput,
      loadAllScenarioOutputs,
      loadScenarioOutputByVersion,
    }}>
      {children}
    </ScenarioContext.Provider>
  );
};

export const useScenarios = () => {
  const context = useContext(ScenarioContext);
  if (context === undefined) {
    throw new Error('useScenarios must be used within a ScenarioProvider');
  }
  return context;
};
