// Result versioning utility for scenarios
export interface VersionedResult {
  resultNumber: number;
  timestamp: string;
  data: any;
}

export interface ResultHistory {
  scenarioId: string;
  results: VersionedResult[];
}

// Get all results for a scenario
export function getScenarioResults(scenarioId: string): VersionedResult[] {
  const key = `scenario_results_${scenarioId}`;
  const stored = localStorage.getItem(key);
  if (!stored) return [];
  
  try {
    const parsed = JSON.parse(stored);
    return parsed.results || [];
  } catch {
    return [];
  }
}

// Add a new result version
export function addScenarioResult(scenarioId: string, resultData: any): number {
  const existing = getScenarioResults(scenarioId);
  const resultNumber = existing.length + 1;
  
  const newResult: VersionedResult = {
    resultNumber,
    timestamp: new Date().toISOString(),
    data: resultData
  };
  
  const updated: ResultHistory = {
    scenarioId,
    results: [...existing, newResult]
  };
  
  const key = `scenario_results_${scenarioId}`;
  localStorage.setItem(key, JSON.stringify(updated));
  
  return resultNumber;
}

// Get the latest result
export function getLatestResult(scenarioId: string): VersionedResult | null {
  const results = getScenarioResults(scenarioId);
  if (results.length === 0) return null;
  return results[results.length - 1];
}

// Clear all results for a scenario
export function clearScenarioResults(scenarioId: string) {
  const key = `scenario_results_${scenarioId}`;
  localStorage.removeItem(key);
}
