import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { ensureProject as ensureProjectData, renameProject as renameProjectData, listProjects } from '@/lib/data/projects';

export type ToolType = 'gfa' | 'forecasting' | 'network' | 'inventory' | 'transportation';

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

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  ensureProject: (toolType: ToolType) => Promise<Project | null>;
  createProject: (project: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  renameProject: (id: string, newName: string) => Promise<{ success: boolean; error?: string }>;
  deleteProject: (id: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: React.ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchProjects = async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProjects(data as Project[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const ensureProject = async (toolType: ToolType) => {
    if (!user) return null;

    const project = await ensureProjectData(user.id, toolType);
    if (project) {
      // Refresh projects list
      await fetchProjects();
    }
    return project;
  };

  const createProject = async (project: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    const { data, error } = await (supabase as any)
      .from('projects')
      .insert([{ ...project, user_id: user.id }])
      .select()
      .single();

    if (!error && data) {
      setProjects([data as Project, ...projects]);
      return data as Project;
    }
    return null;
  };

  const renameProject = async (id: string, newName: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const result = await renameProjectData(id, newName, user.id);
    if (result.success) {
      await fetchProjects();
    }
    return result;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const { error } = await (supabase as any)
      .from('projects')
      .update(updates)
      .eq('id', id);

    if (!error) {
      await fetchProjects();
    }
  };

  const deleteProject = async (id: string) => {
    const { error } = await (supabase as any)
      .from('projects')
      .delete()
      .eq('id', id);

    if (!error) {
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  return (
    <ProjectContext.Provider value={{ 
      projects, 
      loading,
      ensureProject,
      createProject, 
      updateProject,
      renameProject,
      deleteProject,
      refreshProjects: fetchProjects 
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};