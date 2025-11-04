-- Add result_number column to scenario_outputs table
ALTER TABLE scenario_outputs ADD COLUMN IF NOT EXISTS result_number INTEGER NOT NULL DEFAULT 1;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_scenario_outputs_scenario_result ON scenario_outputs(scenario_id, result_number);

-- Add unique constraint to prevent duplicate result numbers per scenario
ALTER TABLE scenario_outputs DROP CONSTRAINT IF EXISTS unique_scenario_result;
ALTER TABLE scenario_outputs ADD CONSTRAINT unique_scenario_result UNIQUE (scenario_id, result_number);