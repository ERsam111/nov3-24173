-- Add unique constraints and indexes for project/scenario/result management

-- Update projects table to ensure unique names per owner
ALTER TABLE public.projects 
  DROP CONSTRAINT IF EXISTS unique_project_name_per_owner;

ALTER TABLE public.projects 
  ADD CONSTRAINT unique_project_name_per_owner 
  UNIQUE (user_id, name);

-- Update scenarios table to ensure unique names per project+module
ALTER TABLE public.scenarios 
  DROP CONSTRAINT IF EXISTS unique_scenario_name_per_project_module;

ALTER TABLE public.scenarios 
  ADD CONSTRAINT unique_scenario_name_per_project_module 
  UNIQUE (project_id, module_type, name);

-- Add columns to scenario_outputs to support result management
ALTER TABLE public.scenario_outputs 
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS module_type TEXT,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id),
  ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Backfill module_type and project_id from scenarios table
UPDATE public.scenario_outputs so
SET 
  module_type = s.module_type,
  project_id = s.project_id,
  name = COALESCE(so.name, 'Result ' || so.result_number)
FROM public.scenarios s
WHERE so.scenario_id = s.id
  AND (so.module_type IS NULL OR so.project_id IS NULL OR so.name IS NULL);

-- Make columns NOT NULL after backfill
ALTER TABLE public.scenario_outputs 
  ALTER COLUMN module_type SET NOT NULL,
  ALTER COLUMN project_id SET NOT NULL,
  ALTER COLUMN name SET NOT NULL;

-- Add unique constraint for result names within a scenario
ALTER TABLE public.scenario_outputs 
  DROP CONSTRAINT IF EXISTS unique_result_name_per_scenario;

ALTER TABLE public.scenario_outputs 
  ADD CONSTRAINT unique_result_name_per_scenario 
  UNIQUE (scenario_id, name);

-- Create index for efficient result listing
DROP INDEX IF EXISTS idx_scenario_outputs_scenario_created;
CREATE INDEX idx_scenario_outputs_scenario_created 
  ON public.scenario_outputs(scenario_id, created_at DESC);

-- Update RLS policies for scenario_outputs to check project ownership
DROP POLICY IF EXISTS "Users can create outputs for their scenarios" ON public.scenario_outputs;
CREATE POLICY "Users can create outputs for their scenarios" 
  ON public.scenario_outputs 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = scenario_outputs.project_id 
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view outputs for their scenarios" ON public.scenario_outputs;
CREATE POLICY "Users can view outputs for their scenarios" 
  ON public.scenario_outputs 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = scenario_outputs.project_id 
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update outputs for their scenarios" ON public.scenario_outputs;
CREATE POLICY "Users can update outputs for their scenarios" 
  ON public.scenario_outputs 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = scenario_outputs.project_id 
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete outputs for their scenarios" ON public.scenario_outputs;
CREATE POLICY "Users can delete outputs for their scenarios" 
  ON public.scenario_outputs 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = scenario_outputs.project_id 
        AND p.user_id = auth.uid()
    )
  );