
-- Migration: 20251103074553

-- Migration: 20251103054852
-- Create enums for scenario management
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.module_type AS ENUM ('gfa', 'inventory', 'forecasting', 'network');
CREATE TYPE public.scenario_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- Create scenarios table
CREATE TABLE public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  module_type module_type NOT NULL,
  status scenario_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

-- Create scenario_inputs table
CREATE TABLE public.scenario_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  input_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scenario_inputs ENABLE ROW LEVEL SECURITY;

-- Create scenario_outputs table
CREATE TABLE public.scenario_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  output_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scenario_outputs ENABLE ROW LEVEL SECURITY;

-- Create computation_logs table
CREATE TABLE public.computation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  cpu_type TEXT NOT NULL,
  ram_size TEXT NOT NULL,
  execution_time_seconds FLOAT,
  cpu_usage_percent FLOAT,
  memory_usage_mb FLOAT,
  cost_usd FLOAT,
  aws_task_arn TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.computation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for scenarios
CREATE POLICY "Users can view their own scenarios"
  ON public.scenarios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scenarios"
  ON public.scenarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenarios"
  ON public.scenarios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenarios"
  ON public.scenarios FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for scenario_inputs
CREATE POLICY "Users can view inputs for their scenarios"
  ON public.scenario_inputs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scenarios
      WHERE scenarios.id = scenario_inputs.scenario_id
      AND scenarios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create inputs for their scenarios"
  ON public.scenario_inputs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scenarios
      WHERE scenarios.id = scenario_inputs.scenario_id
      AND scenarios.user_id = auth.uid()
    )
  );

-- RLS Policies for scenario_outputs
CREATE POLICY "Users can view outputs for their scenarios"
  ON public.scenario_outputs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scenarios
      WHERE scenarios.id = scenario_outputs.scenario_id
      AND scenarios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create outputs for their scenarios"
  ON public.scenario_outputs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scenarios
      WHERE scenarios.id = scenario_outputs.scenario_id
      AND scenarios.user_id = auth.uid()
    )
  );

-- RLS Policies for computation_logs
CREATE POLICY "Users can view logs for their scenarios"
  ON public.computation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scenarios
      WHERE scenarios.id = computation_logs.scenario_id
      AND scenarios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create logs for their scenarios"
  ON public.computation_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scenarios
      WHERE scenarios.id = computation_logs.scenario_id
      AND scenarios.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger to auto-update updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-update updated_at on scenarios
CREATE TRIGGER update_scenarios_updated_at
  BEFORE UPDATE ON public.scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for scenarios table
ALTER PUBLICATION supabase_realtime ADD TABLE public.scenarios;
ALTER PUBLICATION supabase_realtime ADD TABLE public.computation_logs;

-- Migration: 20251103062302
-- Create projects table for storing user projects
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  tool_type text NOT NULL,
  input_data jsonb,
  results_data jsonb,
  size_mb numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;

-- Migration: 20251103062331
-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Migration: 20251103062856
-- Add project_id to scenarios table to link scenarios to projects
ALTER TABLE public.scenarios
ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- Update RLS policies to check project ownership through scenarios
DROP POLICY IF EXISTS "Users can view inputs for their scenarios" ON public.scenario_inputs;
DROP POLICY IF EXISTS "Users can create inputs for their scenarios" ON public.scenario_inputs;
DROP POLICY IF EXISTS "Users can view outputs for their scenarios" ON public.scenario_outputs;
DROP POLICY IF EXISTS "Users can create outputs for their scenarios" ON public.scenario_outputs;

-- Recreate policies with project ownership check
CREATE POLICY "Users can view inputs for their scenarios"
  ON public.scenario_inputs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM scenarios s
    JOIN projects p ON s.project_id = p.id
    WHERE s.id = scenario_inputs.scenario_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can create inputs for their scenarios"
  ON public.scenario_inputs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM scenarios s
    JOIN projects p ON s.project_id = p.id
    WHERE s.id = scenario_inputs.scenario_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can view outputs for their scenarios"
  ON public.scenario_outputs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM scenarios s
    JOIN projects p ON s.project_id = p.id
    WHERE s.id = scenario_outputs.scenario_id
    AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can create outputs for their scenarios"
  ON public.scenario_outputs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM scenarios s
    JOIN projects p ON s.project_id = p.id
    WHERE s.id = scenario_outputs.scenario_id
    AND p.user_id = auth.uid()
  ));

