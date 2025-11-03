import React from "react";
import InvIndex from "../../Simlation based invenrotu optimzation/inventoryoptimizationtool-main/src/pages/Index";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ProjectScenarioNav } from "@/components/ProjectScenarioNav";
import { useProjects, Project } from "@/contexts/ProjectContext";
import { useScenarios } from "@/contexts/ScenarioContext";

export default function InventoryOptimizationV2() {
  const navigate = useNavigate();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const { currentScenario, setCurrentScenario, loadScenariosByProject } = useScenarios();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </div>
      </div>
      
      {/* Project & Scenario Navigation */}
      <ProjectScenarioNav
        currentProjectId={currentProject?.id}
        currentScenarioId={currentScenario?.id}
        moduleType="inventory"
        moduleName="Simulation-based Inventory Optimization"
        onProjectChange={(project) => {
          setCurrentProject(project);
          loadScenariosByProject(project.id);
        }}
        onScenarioChange={(scenario) => {
          setCurrentScenario(scenario);
        }}
      />
      
      <div className="flex-1">
        <InvIndex />
      </div>
    </div>
  );
}
