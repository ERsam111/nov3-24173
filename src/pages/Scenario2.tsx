import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scenario2Input } from "@/components/forecasting/Scenario2Input";
import { Scenario2Results } from "@/components/forecasting/Scenario2Results";
import { Scenario2Adjustment, Scenario2AdjustmentWithForecast } from "@/types/scenario2";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ProjectScenarioNav } from "@/components/ProjectScenarioNav";
import { useScenarios } from "@/contexts/ScenarioContext";
import { useNavigate } from "react-router-dom";

const Scenario2 = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [adjustments, setAdjustments] = useState<Scenario2Adjustment[]>([]);
  const [enrichedAdjustments, setEnrichedAdjustments] = useState<Scenario2AdjustmentWithForecast[]>([]);
  const [scenario1Data, setScenario1Data] = useState<any>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("adjustments");
  const { currentScenario, loadScenarioInput, loadScenarioOutput, saveScenarioOutput, saveScenarioInput } = useScenarios();

  useEffect(() => {
    const loadData = async () => {
      if (currentScenario) {
        // Load input data
        const inputData = await loadScenarioInput(currentScenario.id);
        if (inputData) {
          setScenario1Data(inputData.scenario1Data || null);
          setSelectedModelId(inputData.selectedModelId || "");
        }

        // Load output data
        const outputData = await loadScenarioOutput(currentScenario.id);
        if (outputData) {
          setEnrichedAdjustments(outputData.enrichedAdjustments || []);
        }
      }
    };

    loadData();
  }, [currentScenario]);

  const calculateAdjustedForecast = (baseline: number, type: "units" | "percentage", value: number): number => {
    if (type === "units") {
      return baseline + value;
    } else {
      return baseline * (1 + value / 100);
    }
  };

  const handleAdjustmentsSubmit = async (data: Scenario2Adjustment[]) => {
    setAdjustments(data);
    
    if (!scenario1Data) {
      toast({
        title: "No baseline data",
        description: "Import from Scenario 1 first to see detailed results",
        variant: "destructive"
      });
      return;
    }

    const selectedModel = scenario1Data.results.find((r: any) => r.modelId === selectedModelId);
    if (!selectedModel) {
      toast({
        title: "No forecast data",
        description: "Complete Scenario 1 or select a model",
        variant: "destructive"
      });
      return;
    }

    const enriched: Scenario2AdjustmentWithForecast[] = [];
    
    data.forEach(adj => {
      const predictions = selectedModel.predictions.filter((pred: any) => {
        const predDate = new Date(pred.date);
        return predDate >= adj.fromPeriod && predDate <= adj.toPeriod;
      });

      predictions.forEach((pred: any) => {
        enriched.push({
          ...adj,
          period: new Date(pred.date),
          baselineForecast: pred.predicted,
          adjustedForecast: calculateAdjustedForecast(pred.predicted, adj.adjustmentType, adj.adjustmentValue)
        });
      });
    });

    setEnrichedAdjustments(enriched);
    
    // Save results
    if (currentScenario) {
      await saveScenarioOutput(currentScenario.id, { enrichedAdjustments: enriched });
      await saveScenarioInput(currentScenario.id, { scenario1Data, selectedModelId });
    }
    
    toast({
      title: "Adjustments applied",
      description: `Applied ${data.length} adjustments across ${enriched.length} periods.`
    });

    setActiveTab("results");
  };

  const handleImportFromScenario1 = () => {
    if (!scenario1Data) {
      toast({
        title: "No Scenario 1 data",
        description: "Please complete Scenario 1 first",
        variant: "destructive"
      });
      return;
    }

    const selectedModel = scenario1Data.results.find((r: any) => r.modelId === selectedModelId);
    if (!selectedModel) {
      toast({
        title: "No model selected",
        description: "Select a forecast model first",
        variant: "destructive"
      });
      return;
    }

    const predictions = selectedModel.predictions;
    const imported: Scenario2Adjustment[] = [{
      product: scenario1Data.product,
      fromPeriod: new Date(predictions[0].date),
      toPeriod: new Date(predictions[predictions.length - 1].date),
      adjustmentType: "percentage" as const,
      adjustmentValue: 0,
      notes: `Imported from ${selectedModel.modelName} baseline`
    }];

    setAdjustments(imported);
    
    toast({
      title: "Data imported",
      description: `Imported baseline date range from ${selectedModel.modelName}`
    });
  };

  const selectedModel = scenario1Data?.results.find((r: any) => r.modelId === selectedModelId);
  const scenario1ChartData = selectedModel?.predictions.map((p: any) => ({
    date: new Date(p.date).toISOString().split('T')[0],
    baseline: p.predicted
  })) || [];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectScenarioNav
          currentProjectId={currentScenario?.project_id}
          currentScenarioId={currentScenario?.id}
          moduleType="forecasting"
          moduleName="Scenario 2 - Manual Adjustments"
        />

        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Manual Demand Adjustments</h1>
                <p className="text-muted-foreground mt-1">
                  Apply manual changes to baseline forecasts (add/remove units or percentage changes)
                </p>
              </div>
              <Button onClick={() => navigate("/scenario3")} className="gap-2">
                Next: Scenario 3
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="adjustments">Manual Adjustments</TabsTrigger>
                <TabsTrigger value="results">Results</TabsTrigger>
              </TabsList>

              <TabsContent value="adjustments" className="space-y-6">
                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 space-y-6">
                    {scenario1Data && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Scenario 1 Baseline</CardTitle>
                          <CardDescription>
                            {scenario1Data.product} - {scenario1Data.granularity} forecast
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Select Forecast Model</Label>
                            <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose model" />
                              </SelectTrigger>
                              <SelectContent>
                                {scenario1Data.results.map((model: any) => (
                                  <SelectItem key={model.modelId} value={model.modelId}>
                                    {model.modelName} {model.isRecommended && "⭐"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={scenario1ChartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                              <YAxis />
                              <Tooltip />
                              <Line type="monotone" dataKey="baseline" stroke="hsl(var(--primary))" strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                          <Button onClick={handleImportFromScenario1} className="w-full" variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Import Baseline Data
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                    <Scenario2Input onAdjustmentsSubmit={handleAdjustmentsSubmit} scenario1Data={scenario1Data} />
                  </div>

                  <div className="lg:col-span-2">
                    {enrichedAdjustments.length > 0 ? (
                      <Scenario2Results adjustments={enrichedAdjustments} scenario1Data={scenario1Data} />
                    ) : (
                      <div className="h-full flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
                        <div className="text-center text-muted-foreground p-12">
                          <p className="text-lg font-medium">No adjustments yet</p>
                          <p className="text-sm mt-2">Import baseline from Scenario 1, then apply adjustments to see results</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="results" className="space-y-6">
                {enrichedAdjustments.length > 0 ? (
                  <Scenario2Results adjustments={enrichedAdjustments} scenario1Data={scenario1Data} />
                ) : (
                  <div className="h-[600px] flex items-center justify-center border-2 border-dashed border-muted rounded-lg">
                    <div className="text-center text-muted-foreground p-12">
                      <p className="text-lg font-medium">No results available</p>
                      <p className="text-sm mt-2">Complete the adjustments in the previous tab</p>
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

export default Scenario2;
