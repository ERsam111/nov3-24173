import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Play, Upload, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HistoricalDataUpload } from "@/components/forecasting/HistoricalDataUpload";
import { ModelSelector } from "@/components/forecasting/ModelSelector";
import { DataAnalytics } from "@/components/forecasting/DataAnalytics";
import { ForecastResults } from "@/components/forecasting/ForecastResults";
import { OutlierDetection } from "@/components/forecasting/OutlierDetection";
import { HistoricalDataPoint, ForecastResult } from "@/types/forecasting";
import { generateForecasts } from "@/utils/forecastingModels";
import { useToast } from "@/hooks/use-toast";
import { ProjectScenarioNav } from "@/components/ProjectScenarioNav";
import { useProjects, Project } from "@/contexts/ProjectContext";
import { useScenarios } from "@/contexts/ScenarioContext";
import { addScenarioResult, getScenarioResults } from "@/utils/resultVersioning";
import { Badge } from "@/components/ui/badge";

const DemandFromSale = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const { currentScenario, setCurrentScenario, loadScenariosByProject, saveScenarioInput, loadScenarioInput, updateScenario } = useScenarios();
  
  const [activeTab, setActiveTab] = useState("input");
  const [rawHistoricalData, setRawHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>(["moving_average", "exponential_smoothing"]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [forecastPeriods, setForecastPeriods] = useState<number>(6);
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [forecastResults, setForecastResults] = useState<ForecastResult[]>([]);
  const [modelParams, setModelParams] = useState<Record<string, any>>({
    moving_average: { window: 3 },
    exponential_smoothing: { alpha: 0.3 },
    weighted_moving_average: { window: 3 },
    seasonal_naive: { seasonLength: 12 },
    holt_winters: { alpha: 0.3, beta: 0.1, gamma: 0.1, seasonLength: 12 },
    random_forest: { nTrees: 10, windowSize: 5 },
    arima: { p: 2, d: 1, q: 2 }
  });
  const [resultHistory, setResultHistory] = useState<any[]>([]);
  const [selectedResultNumber, setSelectedResultNumber] = useState<number | null>(null);

  // Load scenario data
  useEffect(() => {
    if (currentScenario) {
      loadScenarioData();
      loadResultHistory();
    }
  }, [currentScenario]);

  const loadScenarioData = async () => {
    if (!currentScenario) return;
    
    const inputData = await loadScenarioInput(currentScenario.id);
    if (inputData) {
      setRawHistoricalData(inputData.historicalData || []);
      setHistoricalData(inputData.historicalData || []);
      setSelectedProduct(inputData.selectedProduct || "");
      setGranularity(inputData.granularity || "monthly");
      setForecastPeriods(inputData.forecastPeriods || 6);
      setSelectedModels(inputData.selectedModels || ["moving_average", "exponential_smoothing"]);
    }
  };

  const loadResultHistory = () => {
    if (!currentScenario) return;
    const results = getScenarioResults(currentScenario.id);
    setResultHistory(results);
    if (results.length > 0) {
      const latest = results[results.length - 1];
      setSelectedResultNumber(latest.resultNumber);
      setForecastResults(latest.data.results || []);
    }
  };

  // Save input data
  useEffect(() => {
    if (currentScenario && historicalData.length > 0) {
      const saveData = async () => {
        await saveScenarioInput(currentScenario.id, {
          historicalData,
          selectedProduct,
          granularity,
          forecastPeriods,
          selectedModels,
          modelParams
        });
      };
      saveData();
    }
  }, [historicalData, selectedProduct, granularity, forecastPeriods, selectedModels, currentScenario]);

  const handleDataUpload = (data: HistoricalDataPoint[]) => {
    setRawHistoricalData(data);
    setHistoricalData(data);
    setForecastResults([]);
    
    if (!selectedProduct && data.length > 0) {
      setSelectedProduct(data[0].product);
    }
  };

  const handleRemoveOutliers = (outlierIndices: number[]) => {
    const filtered = historicalData.filter((_, idx) => !outlierIndices.includes(idx));
    setHistoricalData(filtered);
    setForecastResults([]);
    
    toast({
      title: "Outliers removed",
      description: `Removed ${outlierIndices.length} outlier data points`
    });
  };

  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleParamChange = (modelId: string, paramName: string, value: number) => {
    setModelParams(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        [paramName]: value
      }
    }));
  };

  const runForecasting = async () => {
    if (!currentScenario) {
      toast({
        title: "No scenario selected",
        description: "Please select a scenario first",
        variant: "destructive"
      });
      return;
    }

    if (historicalData.length === 0) {
      toast({
        title: "No data available",
        description: "Please upload historical data first",
        variant: "destructive"
      });
      return;
    }

    if (selectedModels.length === 0) {
      toast({
        title: "No models selected",
        description: "Please select at least one forecasting model",
        variant: "destructive"
      });
      return;
    }

    if (!selectedProduct) {
      toast({
        title: "No product selected",
        description: "Please select a product to forecast",
        variant: "destructive"
      });
      return;
    }

    // Update scenario status
    await updateScenario(currentScenario.id, { status: 'running' });

    // Filter data
    let filteredData = historicalData.filter(d => d.product === selectedProduct);
    if (selectedCustomer !== "all") {
      filteredData = filteredData.filter(d => d.customer === selectedCustomer);
    }

    if (filteredData.length < 3) {
      toast({
        title: "Insufficient data",
        description: "Need at least 3 data points for forecasting",
        variant: "destructive"
      });
      await updateScenario(currentScenario.id, { status: 'failed' });
      return;
    }

    // Generate forecasts
    const results = generateForecasts(filteredData, forecastPeriods, selectedModels, modelParams, granularity);
    setForecastResults(results);

    // Add versioned result
    const resultNumber = addScenarioResult(currentScenario.id, {
      results,
      product: selectedProduct,
      granularity,
      timestamp: new Date().toISOString()
    });

    // Update scenario status
    await updateScenario(currentScenario.id, { status: 'completed' });

    // Reload history
    loadResultHistory();

    toast({
      title: "Forecast generated",
      description: `Result ${resultNumber} saved successfully`
    });

    setActiveTab("results");
  };

  const handleResultSelect = (resultNumber: number) => {
    const result = resultHistory.find(r => r.resultNumber === resultNumber);
    if (result) {
      setSelectedResultNumber(resultNumber);
      setForecastResults(result.data.results || []);
    }
  };

  const uniqueProducts = Array.from(new Set(historicalData.map(d => d.product)));
  const uniqueCustomers = Array.from(new Set(historicalData.map(d => d.customer)));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      <ProjectScenarioNav
        currentProjectId={currentProject?.id}
        currentScenarioId={currentScenario?.id}
        moduleType="forecasting"
        moduleName="Demand from the Sale"
        onProjectChange={(project) => {
          setCurrentProject(project);
          loadScenariosByProject(project.id);
        }}
        onScenarioChange={(scenario) => {
          setCurrentScenario(scenario);
        }}
      />

      <div className="flex-1 max-w-7xl mx-auto w-full p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="input" disabled={!currentScenario}>
              <Upload className="h-4 w-4 mr-2" />
              Input Data
            </TabsTrigger>
            <TabsTrigger value="insights" disabled={!currentScenario || historicalData.length === 0}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="results" disabled={forecastResults.length === 0}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Demand and Promotion
            </TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Historical Data</CardTitle>
              </CardHeader>
              <CardContent>
                <HistoricalDataUpload onDataUpload={handleDataUpload} />
              </CardContent>
            </Card>

            {historicalData.length > 0 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Forecast Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Product</Label>
                        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {uniqueProducts.map(product => (
                              <SelectItem key={product} value={product}>{product}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Customer (Optional)</Label>
                        <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Customers</SelectItem>
                            {uniqueCustomers.map(customer => (
                              <SelectItem key={customer} value={customer}>{customer}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Forecast Granularity</Label>
                        <Select value={granularity} onValueChange={(v: any) => setGranularity(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Forecast Horizon</Label>
                        <Input
                          type="number"
                          min="1"
                          value={forecastPeriods}
                          onChange={(e) => setForecastPeriods(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <Button onClick={runForecasting} className="w-full gap-2">
                      <Play className="h-4 w-4" />
                      Run Forecast
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Model Selection</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ModelSelector
                      selectedModels={selectedModels}
                      onModelToggle={handleModelToggle}
                      modelParams={modelParams}
                      onParamChange={handleParamChange}
                      granularity={granularity}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Outlier Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <OutlierDetection
                  data={historicalData}
                  onRemoveOutliers={handleRemoveOutliers}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <DataAnalytics data={historicalData} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
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

            {forecastResults.length > 0 && (
              <ForecastResults
                results={forecastResults}
                historicalData={historicalData}
                product={selectedProduct}
                granularity={granularity}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DemandFromSale;
