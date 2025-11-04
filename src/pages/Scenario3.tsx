import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scenario3InputForm } from "@/components/forecasting/Scenario3Input";
import { Scenario3Results } from "@/components/forecasting/Scenario3Results";
import { Scenario3Input, Scenario3Output } from "@/types/scenario3";
import { processScenario3Adjustments } from "@/utils/elasticityCalculator";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ProjectScenarioNav } from "@/components/ProjectScenarioNav";
import { useScenarios } from "@/contexts/ScenarioContext";
import { ResultsNavigator } from "@/components/ResultsNavigator";
import { listResults, getResult } from "@/lib/data/results";
import { toast as sonnerToast } from "sonner";

const Scenario3 = () => {
  const { toast } = useToast();
  const [results, setResults] = useState<Scenario3Output[]>([]);
  const [scenario1Data, setScenario1Data] = useState<any>(null);
  const [scenario2Data, setScenario2Data] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("inputs");
  const [resultHistory, setResultHistory] = useState<any[]>([]);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const { currentScenario, loadScenarioInput, saveScenarioOutput, saveScenarioInput } = useScenarios();

  useEffect(() => {
    const loadData = async () => {
      if (currentScenario) {
        const inputData = await loadScenarioInput(currentScenario.id);
        if (inputData) {
          setScenario1Data(inputData.scenario1Data || null);
          setScenario2Data(inputData.scenario2Data || null);
        }

        // Load result history
        const allResults = await listResults(currentScenario.id);
        setResultHistory(allResults);
        
        // Load latest result
        if (allResults.length > 0) {
          const latest = allResults[0];
          setSelectedResultId(latest.id);
          setResults(latest.output_data?.results || []);
        }
      }
    };

    loadData();
  }, [currentScenario]);

  const handleResultSelect = async (result: any) => {
    setSelectedResultId(result.id);
    const fullResult = await getResult(result.id);
    if (fullResult) {
      setResults(fullResult.output_data?.results || []);
      setActiveTab("results");
      sonnerToast.success(`Loaded ${result.name}`);
    }
  };

  const refreshResultHistory = async () => {
    if (currentScenario) {
      const allResults = await listResults(currentScenario.id);
      setResultHistory(allResults);
    }
  };

  const handleDataSubmit = async (inputs: Scenario3Input[]) => {
    if (!scenario2Data || scenario2Data.length === 0) {
      toast({
        title: "No Scenario 2 data",
        description: "Please complete Scenario 2 first to use as baseline",
        variant: "destructive"
      });
      return;
    }

    try {
      const enrichedInputs = inputs.flatMap(input => {
        const matchingS2Data = scenario2Data.filter((s2: any) => {
          const s2Date = new Date(s2.period);
          return s2.product === input.product_name &&
                 s2Date >= input.fromPeriod &&
                 s2Date <= input.toPeriod;
        });

        const actualPrice = input.base_price * (1 - input.discount_rate / 100);

        return matchingS2Data.map((s2: any) => ({
          product_id: s2.product.substring(0, 10),
          product_name: s2.product,
          period: new Date(s2.period),
          scenario2_forecast: s2.adjustedForecast,
          base_price: input.base_price,
          actual_price: actualPrice,
          promotion_flag: (input.discount_rate > 0 ? 1 : 0) as 0 | 1,
          discount_rate: input.discount_rate,
          elasticity: input.elasticity,
          target_units: input.target_units,
          target_revenue: input.target_revenue
        }));
      });

      if (enrichedInputs.length === 0) {
        toast({
          title: "No matching data",
          description: "No Scenario 2 data found for the selected products and date ranges",
          variant: "destructive"
        });
        return;
      }

      const processedResults = processScenario3Adjustments(enrichedInputs);
      setResults(processedResults);
      
      if (currentScenario) {
        const metrics = {
          totalForecasts: processedResults.length,
          avgElasticity: enrichedInputs.reduce((sum, i) => sum + i.elasticity, 0) / enrichedInputs.length,
          productsAdjusted: new Set(enrichedInputs.map(i => i.product_name)).size
        };
        
        await saveScenarioOutput(currentScenario.id, { results: processedResults }, metrics);
        await saveScenarioInput(currentScenario.id, { scenario1Data, scenario2Data });
        await refreshResultHistory();
      }
      
      toast({
        title: "Scenario 3 calculated and saved",
        description: `Processed ${processedResults.length} forecasts with elasticity adjustments`
      });

      setActiveTab("results");
    } catch (error) {
      toast({
        title: "Calculation failed",
        description: "Error processing Scenario 3 adjustments",
        variant: "destructive"
      });
    }
  };

  const handleImportFromScenario2 = () => {
    if (!scenario2Data || scenario2Data.length === 0) {
      toast({
        title: "No Scenario 2 data",
        description: "Please complete Scenario 2 first",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Use form to select products",
      description: "Select products from the dropdown in the form below. Date ranges will auto-populate from Scenario 2.",
    });
  };

  const comparisonChartData = scenario2Data?.slice(0, 10).map((adj: any) => ({
    product: adj.product,
    baseline: adj.baselineForecast,
    scenario2: adj.adjustedForecast
  })) || [];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectScenarioNav
          currentProjectId={currentScenario?.project_id}
          currentScenarioId={currentScenario?.id}
          moduleType="forecasting"
          moduleName="Scenario 3 - Advanced Adjustments"
        />

        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Advanced Demand Adjustments</h1>
              <p className="text-muted-foreground mt-1">
                Apply price elasticity, promotions, and target-driven recommendations
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="inputs">Elasticity Inputs</TabsTrigger>
                <TabsTrigger value="results">Results</TabsTrigger>
              </TabsList>

              <TabsContent value="inputs" className="space-y-6">
                {/* Comparison Chart - Full Width at Top */}
                {(scenario1Data || scenario2Data) && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Previous Scenarios</CardTitle>
                          <CardDescription>
                            Compare baseline and adjusted forecasts
                          </CardDescription>
                        </div>
                        {scenario2Data && (
                          <Button onClick={handleImportFromScenario2} variant="outline" className="gap-2">
                            <Download className="h-4 w-4" />
                            Import from Scenario 2
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={comparisonChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="product" tick={{ fontSize: 10 }} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="baseline" fill="hsl(var(--muted))" name="Scenario 1" />
                          <Bar dataKey="scenario2" fill="hsl(var(--primary))" name="Scenario 2" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Input Form - Full Width at Bottom */}
                <Scenario3InputForm onDataSubmit={handleDataSubmit} scenario2Data={scenario2Data} />

                {/* Preview Results - Full Width */}
                {results.length > 0 && (
                  <Scenario3Results 
                    results={results} 
                    scenario1Data={scenario1Data}
                    scenario2Data={scenario2Data}
                  />
                )}
              </TabsContent>

              <TabsContent value="results" className="space-y-6">
                {currentScenario && (
                  <ResultsNavigator
                    results={resultHistory}
                    selectedResultId={selectedResultId}
                    onResultSelect={handleResultSelect}
                    onResultRenamed={refreshResultHistory}
                    scenarioId={currentScenario.id}
                  />
                )}
                
                {results.length > 0 ? (
                  <Scenario3Results 
                    results={results} 
                    scenario1Data={scenario1Data}
                    scenario2Data={scenario2Data}
                  />
                ) : (
                  <div className="h-[600px] flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
                    <div className="text-center text-muted-foreground p-12">
                      <p className="text-lg font-medium">No results available</p>
                      <p className="text-sm mt-2">Complete the inputs in the previous tab</p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scenario3;
