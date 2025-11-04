/**
 * Auto-naming utility for deterministic collision-safe naming
 */

export async function nextAutoName(
  listExisting: () => Promise<string[]>,
  base: 'Project' | 'Scenario' | 'Result'
): Promise<string> {
  const names = await listExisting();
  const used = new Set<number>();
  const re = new RegExp(`^${base}\\s+(\\d+)$`, 'i');
  
  names.forEach(n => {
    const m = n.match(re);
    if (m) used.add(parseInt(m[1], 10));
  });
  
  let i = 1;
  while (used.has(i)) i++;
  
  return `${base} ${i}`;
}

export function generateNameSuggestions(baseName: string, count: number = 3): string[] {
  const suggestions: string[] = [];
  for (let i = 2; i <= count + 1; i++) {
    suggestions.push(`${baseName} (${i})`);
  }
  return suggestions;
}
