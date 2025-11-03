import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, MapPin, BarChart3, TrendingUp, Upload, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Customer, DistributionCenter, OptimizationSettings, Product } from "@/types/gfa";
import { optimizeWithConstraints } from "@/utils/geoCalculations";
import { exportReport } from "@/utils/exportReport";
import { toast } from "sonner";
import { GFAInputPanel } from "@/components/gfa/GFAInputPanel";
import { GFAMapPanel } from "@/components/gfa/GFAMapPanel";
import { GFAOptimizationPanel } from "@/components/gfa/GFAOptimizationPanel";
import { GFAResultsPanel } from "@/components/gfa/GFAResultsPanel";
import { ScenarioSelector } from "@/components/gfa/ScenarioSelector";
import { useScenarios } from "@/contexts/ScenarioContext";
import { ProjectScenarioNav } from "@/components/ProjectScenarioNav";
import { useProjects, Project } from "@/contexts/ProjectContext";

const GFA = () => {
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { currentScenario, saveScenarioInput, saveScenarioOutput, loadScenarioInput, loadScenarioOutput, updateScenario, loadScenariosByProject } = useScenarios();
  const [activeTab, setActiveTab] = useState("input");
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dcs, setDcs] = useState<DistributionCenter[]>([]);
  const [feasible, setFeasible] = useState(true);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<{ totalCost: number; transportationCost: number; facilityCost: number; numSites: number } | undefined>();
  
  const [settings, setSettings] = useState<OptimizationSettings>({
    mode: 'sites',
    numDCs: 3,
    maxRadius: 50,
    demandPercentage: 100,
    dcCapacity: 0,
    capacityUnit: 'm3',
    transportationCostPerMilePerUnit: 0.5,
    facilityCost: 100000,
    distanceUnit: 'km',
    costUnit: 'm3',
  });

  // Load scenario data when scenario is selected
  const handleScenarioReady = async (scenarioId: string, projectId: string) => {
    setActiveTab("input");
    
    // Load saved input data
    const inputData = await loadScenarioInput(scenarioId);
    if (inputData) {
      setCustomers(inputData.customers || []);
      setProducts(inputData.products || []);
      setSettings(inputData.settings || settings);
      toast.success("Scenario data loaded");
    }

    // Load saved output data
    const outputData = await loadScenarioOutput(scenarioId);
    if (outputData) {
      setDcs(outputData.dcs || []);
      setFeasible(outputData.feasible ?? true);
      setWarnings(outputData.warnings || []);
      setCostBreakdown(outputData.costBreakdown);
    }
  };

  // Save input data whenever it changes
  useEffect(() => {
    if (currentScenario && (customers.length > 0 || products.length > 0)) {
      const saveData = async () => {
        await saveScenarioInput(currentScenario.id, {
          customers,
          products,
          settings,
        });
      };
      saveData();
    }
  }, [customers, products, settings]);

  // Extract unique products from customers
  useEffect(() => {
    setProducts(prevProducts => {
      const productMap = new Map<string, Product>();
      
      customers.forEach((customer) => {
        if (!productMap.has(customer.product)) {
          const existingProduct = prevProducts.find(p => p.name === customer.product);
          
          productMap.set(customer.product, {
            name: customer.product,
            baseUnit: customer.unitOfMeasure,
            conversionToStandard: customer.conversionFactor,
            unitConversions: existingProduct?.unitConversions || [],
            sellingPrice: existingProduct?.sellingPrice,
          });
        }
      });
      
      return Array.from(productMap.values());
    });
  }, [customers]);

  const handleOptimize = async () => {
    if (customers.length === 0) {
      toast.error("Add at least one customer before optimizing");
      return;
    }

    if (!currentScenario) {
      toast.error("Please select a scenario first");
      return;
    }

    toast.info("Running optimization algorithm...");
    
    // Update scenario status to running
    await updateScenario(currentScenario.id, { status: 'running' });

    const result = optimizeWithConstraints(
      customers, 
      settings.numDCs, 
      {
        maxRadius: settings.maxRadius,
        demandPercentage: settings.demandPercentage,
        dcCapacity: settings.dcCapacity,
        capacityUnit: settings.capacityUnit,
      },
      settings.mode,
      settings.mode === 'cost' ? {
        transportationCostPerMilePerUnit: settings.transportationCostPerMilePerUnit,
        facilityCost: settings.facilityCost,
        distanceUnit: settings.distanceUnit,
        costUnit: settings.costUnit,
      } : undefined,
      products
    );

    setDcs(result.dcs);
    setFeasible(result.feasible);
    setWarnings(result.warnings);
    setCostBreakdown(result.costBreakdown);

    // Save output data
    await saveScenarioOutput(currentScenario.id, {
      dcs: result.dcs,
      feasible: result.feasible,
      warnings: result.warnings,
      costBreakdown: result.costBreakdown,
    });

    // Update scenario status to completed
    await updateScenario(currentScenario.id, { status: 'completed' });

    if (result.feasible) {
      if (settings.mode === 'cost' && result.costBreakdown) {
        toast.success(`Optimization complete! Optimal solution: ${result.costBreakdown.numSites} sites with total cost $${result.costBreakdown.totalCost.toLocaleString()}`);
      } else {
        toast.success("Optimization complete! All constraints satisfied.");
      }
      setActiveTab("results");
    } else {
      toast.warning("Optimization complete with constraint violations. See warnings in Results tab.");
      setActiveTab("results");
    }
  };

  const handleExportReport = () => {
    if (customers.length === 0) {
      toast.error("No data to export. Add customer data first.");
      return;
    }

    try {
      exportReport({
        customers,
        products,
        dcs,
        settings,
        costBreakdown
      });
      toast.success("Report exported successfully!");
    } catch (error) {
      toast.error("Failed to export report");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          {customers.length > 0 && (
            <Button onClick={handleExportReport} variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          )}
        </div>
      </div>

      {/* Project & Scenario Navigation */}
      <ProjectScenarioNav
        currentProjectId={currentProject?.id}
        currentScenarioId={currentScenario?.id}
        moduleType="gfa"
        moduleName="Green Field Analysis"
        onProjectChange={(project) => {
          setCurrentProject(project);
          loadScenariosByProject(project.id);
        }}
        onScenarioChange={async (scenario) => {
          await handleScenarioReady(scenario.id, scenario.project_id);
        }}
      />

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="input" className="gap-2" disabled={!currentScenario}>
              <Upload className="h-4 w-4" />
              Input Data
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2" disabled={!currentScenario}>
              <MapPin className="h-4 w-4" />
              Map View
            </TabsTrigger>
            <TabsTrigger value="optimization" className="gap-2" disabled={!currentScenario}>
              <Play className="h-4 w-4" />
              Optimization
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2" disabled={dcs.length === 0}>
              <BarChart3 className="h-4 w-4" />
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="space-y-6">
            <GFAInputPanel
              customers={customers}
              products={products}
              settings={settings}
              onCustomersChange={setCustomers}
              onProductsChange={setProducts}
              onSettingsChange={setSettings}
            />
          </TabsContent>

          <TabsContent value="map" className="space-y-6">
            <GFAMapPanel
              customers={customers}
              dcs={dcs}
              settings={settings}
            />
          </TabsContent>

          <TabsContent value="optimization" className="space-y-6">
            <GFAOptimizationPanel
              customers={customers}
              products={products}
              settings={settings}
              onSettingsChange={setSettings}
              onOptimize={handleOptimize}
            />
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <GFAResultsPanel
              dcs={dcs}
              customers={customers}
              products={products}
              settings={settings}
              feasible={feasible}
              warnings={warnings}
              costBreakdown={costBreakdown}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GFA;
