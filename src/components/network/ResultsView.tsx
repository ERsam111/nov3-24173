import { useState, useEffect } from "react";
import { ResultsSidebar } from "./ResultsSidebar";
import { ResultsTable } from "./ResultsTable";
import { useScenarios } from "@/contexts/ScenarioContext";
import { useNetwork } from "@/contexts/NetworkContext";
import { ResultHistoryBadges } from "@/components/ResultHistoryBadges";
import { toast } from "sonner";

export function ResultsView() {
  const [activeTable, setActiveTable] = useState<string>("productFlow");
  const { currentScenario, loadAllScenarioOutputs, loadScenarioOutputByVersion } = useScenarios();
  const { setResults } = useNetwork();
  const [resultHistory, setResultHistory] = useState<any[]>([]);
  const [selectedResultNumber, setSelectedResultNumber] = useState<number | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      if (currentScenario) {
        const results = await loadAllScenarioOutputs(currentScenario.id);
        setResultHistory(results);
        if (results.length > 0) {
          const latest = results[results.length - 1];
          setSelectedResultNumber(latest.result_number);
          setResults(latest.output_data);
        }
      }
    };
    loadHistory();
  }, [currentScenario]);

  const handleResultSelect = async (resultNumber: number) => {
    if (!currentScenario) return;
    
    const outputData = await loadScenarioOutputByVersion(currentScenario.id, resultNumber);
    if (outputData) {
      setSelectedResultNumber(resultNumber);
      setResults(outputData);
      toast.success(`Loaded Result ${resultNumber}`);
    }
  };

  return (
    <div className="space-y-4">
      <ResultHistoryBadges
        resultHistory={resultHistory}
        selectedResultNumber={selectedResultNumber}
        onResultSelect={handleResultSelect}
      />
      
      <div className="flex gap-4 h-[calc(100vh-350px)]">
        <ResultsSidebar activeTable={activeTable} onTableSelect={setActiveTable} />
        <div className="flex-1 overflow-hidden">
          <ResultsTable tableType={activeTable} />
        </div>
      </div>
    </div>
  );
}
