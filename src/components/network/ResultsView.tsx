import { useState, useEffect } from "react";
import { ResultsSidebar } from "./ResultsSidebar";
import { ResultsTable } from "./ResultsTable";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useScenarios } from "@/contexts/ScenarioContext";
import { getScenarioResults } from "@/utils/resultVersioning";
import { useNetwork } from "@/contexts/NetworkContext";

export function ResultsView() {
  const [activeTable, setActiveTable] = useState<string>("productFlow");
  const { currentScenario } = useScenarios();
  const { setResults } = useNetwork();
  const [resultHistory, setResultHistory] = useState<any[]>([]);
  const [selectedResultNumber, setSelectedResultNumber] = useState<number | null>(null);

  useEffect(() => {
    if (currentScenario) {
      const results = getScenarioResults(currentScenario.id);
      setResultHistory(results);
      if (results.length > 0) {
        const latest = results[results.length - 1];
        setSelectedResultNumber(latest.resultNumber);
      }
    }
  }, [currentScenario]);

  const handleResultSelect = (resultNumber: number) => {
    const result = resultHistory.find(r => r.resultNumber === resultNumber);
    if (result) {
      setSelectedResultNumber(resultNumber);
      setResults(result.data);
    }
  };

  return (
    <div className="space-y-4">
      {resultHistory.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Result History</CardTitle>
              <div className="flex gap-2">
                {resultHistory.map((result) => (
                  <Badge
                    key={result.resultNumber}
                    variant={selectedResultNumber === result.resultNumber ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleResultSelect(result.resultNumber)}
                  >
                    Result {result.resultNumber}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
        </Card>
      )}
      
      <div className="flex gap-4 h-[calc(100vh-350px)]">
        <ResultsSidebar activeTable={activeTable} onTableSelect={setActiveTable} />
        <div className="flex-1 overflow-hidden">
          <ResultsTable tableType={activeTable} />
        </div>
      </div>
    </div>
  );
}
