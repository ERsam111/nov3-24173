import { useState, useEffect } from "react";
import { ChevronDown, FolderOpen, GitBranch, Plus, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProjects, Project } from "@/contexts/ProjectContext";
import { useScenarios, Scenario } from "@/contexts/ScenarioContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ProjectScenarioNavProps {
  currentProjectId?: string;
  currentScenarioId?: string;
  moduleType: 'gfa' | 'forecasting' | 'network' | 'inventory';
  moduleName: string;
  onProjectChange?: (project: Project) => void;
  onScenarioChange?: (scenario: Scenario) => void;
}

export const ProjectScenarioNav = ({
  currentProjectId,
  currentScenarioId,
  moduleType,
  moduleName,
  onProjectChange,
  onScenarioChange,
}: ProjectScenarioNavProps) => {
  const { projects, ensureProject, renameProject: renameProjectApi } = useProjects();
  const { scenarios, loadScenariosByProject, ensureScenario, updateScenario, renameScenario: renameScenarioApi, setCurrentScenario, currentScenario } = useScenarios();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [renameProjectOpen, setRenameProjectOpen] = useState(false);
  const [renameScenarioOpen, setRenameScenarioOpen] = useState(false);
  const [createScenarioOpen, setCreateScenarioOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDescription, setScenarioDescription] = useState("");

  // Filter projects by module type
  const moduleProjects = projects.filter(p => p.tool_type === moduleType);

  // Auto-create default project and scenario on mount using ensureProject/ensureScenario
  useEffect(() => {
    const initializeDefaults = async () => {
      // Ensure a project exists for this module
      const project = await ensureProject(moduleType);
      if (project) {
        setSelectedProject(project);
        onProjectChange?.(project);
        
        // Ensure a scenario exists for this project and module
        const scenario = await ensureScenario(project.id, moduleType);
        if (scenario) {
          setCurrentScenario(scenario);
          onScenarioChange?.(scenario);
        }
      }
    };

    if (!selectedProject) {
      initializeDefaults();
    }
  }, [moduleType]);

  // Load project and scenarios on mount or when IDs change
  useEffect(() => {
    if (currentProjectId) {
      const project = projects.find(p => p.id === currentProjectId);
      if (project) {
        setSelectedProject(project);
        loadScenariosByProject(project.id);
      }
    }
  }, [currentProjectId, projects]);

  // Auto-create default scenario if none exists - now handled by ensureScenario
  // This section is no longer needed as ensureScenario handles it

  useEffect(() => {
    if (currentScenarioId && scenarios.length > 0) {
      const scenario = scenarios.find(s => s.id === currentScenarioId);
      if (scenario) {
        setCurrentScenario(scenario);
      }
    }
  }, [currentScenarioId, scenarios]);

  const handleProjectSelect = async (project: Project) => {
    setSelectedProject(project);
    await loadScenariosByProject(project.id);
    onProjectChange?.(project);
    // Ensure a scenario exists for this project
    const scenario = await ensureScenario(project.id, moduleType);
    if (scenario) {
      setCurrentScenario(scenario);
      onScenarioChange?.(scenario);
    }
  };

  const handleScenarioSelect = (scenario: Scenario) => {
    setCurrentScenario(scenario);
    onScenarioChange?.(scenario);
  };

  const handleCreateProject = async () => {
    // Create a new project - ensureProject will handle auto-naming
    const newProject = await ensureProject(moduleType);

    if (newProject) {
      setSelectedProject(newProject);
      await loadScenariosByProject(newProject.id);
      onProjectChange?.(newProject);
      toast.success(`Created ${newProject.name}`);
      
      // Ensure a scenario for the new project
      const scenario = await ensureScenario(newProject.id, moduleType);
      if (scenario) {
        setCurrentScenario(scenario);
        onScenarioChange?.(scenario);
      }
    } else {
      toast.error("Failed to create project");
    }
  };

  const handleCreateScenario = async () => {
    if (!selectedProject) {
      toast.error("Please select a project first");
      return;
    }

    if (!scenarioName.trim()) {
      toast.error("Please enter a scenario name");
      return;
    }

    // Use ensureScenario then rename, or use createScenario - but we removed it
    // For now, we'll create a new scenario via ensureScenario and then rename
    const newScenario = await ensureScenario(selectedProject.id, moduleType);

    if (newScenario) {
      // Rename the scenario
      const result = await renameScenarioApi(newScenario.id, scenarioName);
      
      if (result.success) {
        toast.success(`Created ${scenarioName}`);
        setCreateScenarioOpen(false);
        setScenarioName("");
        setScenarioDescription("");
        handleScenarioSelect(newScenario);
      } else {
        toast.error(result.error || "Failed to set scenario name");
      }
    } else {
      toast.error("Failed to create scenario");
    }
  };

  const handleRenameProject = async () => {
    if (!selectedProject) return;
    
    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    const result = await renameProjectApi(selectedProject.id, projectName);
    
    if (result.success) {
      setSelectedProject({ ...selectedProject, name: projectName });
      setRenameProjectOpen(false);
      toast.success(`Renamed to ${projectName}`);
    } else {
      toast.error(result.error || "Failed to rename project");
    }
  };

  const handleRenameScenario = async () => {
    if (!currentScenario) return;
    
    if (!scenarioName.trim()) {
      toast.error("Please enter a scenario name");
      return;
    }

    const result = await renameScenarioApi(currentScenario.id, scenarioName);
    
    if (result.success) {
      setRenameScenarioOpen(false);
      toast.success(`Renamed to ${scenarioName}`);
    } else {
      toast.error(result.error || "Failed to rename scenario");
    }
  };

  const openRenameProject = () => {
    if (selectedProject) {
      setProjectName(selectedProject.name);
      setProjectDescription(selectedProject.description || "");
      setRenameProjectOpen(true);
    }
  };

  const openRenameScenario = () => {
    if (currentScenario) {
      setScenarioName(currentScenario.name);
      setScenarioDescription(currentScenario.description || "");
      setRenameScenarioOpen(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'running': return 'bg-warning text-warning-foreground';
      case 'failed': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border-b border-border">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border border-border">
          <span className="text-sm font-medium text-muted-foreground">{moduleName}</span>
        </div>

        {/* Project Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 bg-background hover:bg-accent">
              <FolderOpen className="h-4 w-4" />
              <span className="font-semibold">
                {selectedProject ? selectedProject.name : "Select Project"}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 bg-popover z-50">
            <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">Projects</div>
            <DropdownMenuSeparator />
            {moduleProjects.length > 0 ? (
              moduleProjects.map(project => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => handleProjectSelect(project)}
                  className={selectedProject?.id === project.id ? "bg-accent" : ""}
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{project.name}</span>
                    {project.description && (
                      <span className="text-xs text-muted-foreground truncate">{project.description}</span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                No projects found
              </div>
            )}
            <DropdownMenuSeparator />
            {selectedProject && (
              <DropdownMenuItem onClick={openRenameProject} className="gap-2">
                <Pencil className="h-4 w-4" />
                Rename Project
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleCreateProject} className="gap-2">
              <Plus className="h-4 w-4" />
              Create New Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Scenario Selector */}
        {selectedProject && (
          <>
            <div className="text-muted-foreground">/</div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 bg-background hover:bg-accent">
                  <GitBranch className="h-4 w-4" />
                  <span className="font-semibold">
                    {currentScenario ? currentScenario.name : "Select Scenario"}
                  </span>
                  {currentScenario && (
                    <Badge variant="secondary" className={getStatusColor(currentScenario.status)}>
                      {currentScenario.status}
                    </Badge>
                  )}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-popover z-50">
                <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">Scenarios</div>
                <DropdownMenuSeparator />
                {scenarios.length > 0 ? (
                  scenarios.map(scenario => (
                    <DropdownMenuItem
                      key={scenario.id}
                      onClick={() => handleScenarioSelect(scenario)}
                      className={currentScenario?.id === scenario.id ? "bg-accent" : ""}
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <span className="font-medium truncate">{scenario.name}</span>
                          {scenario.description && (
                            <span className="text-xs text-muted-foreground truncate">{scenario.description}</span>
                          )}
                        </div>
                        <Badge variant="secondary" className={`${getStatusColor(scenario.status)} text-xs shrink-0`}>
                          {scenario.status}
                        </Badge>
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    No scenarios found
                  </div>
                )}
                <DropdownMenuSeparator />
                {currentScenario && (
                  <DropdownMenuItem onClick={openRenameScenario} className="gap-2">
                    <Pencil className="h-4 w-4" />
                    Rename Scenario
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setCreateScenarioOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create New Scenario
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      <Dialog open={renameProjectOpen} onOpenChange={setRenameProjectOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Update the name and description for this project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description (Optional)</Label>
              <Textarea
                id="project-description"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameProjectOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameProject}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameScenarioOpen} onOpenChange={setRenameScenarioOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Rename Scenario</DialogTitle>
            <DialogDescription>
              Update the name and description for this scenario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-scenario-name">Scenario Name</Label>
              <Input
                id="rename-scenario-name"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rename-scenario-description">Description (Optional)</Label>
              <Textarea
                id="rename-scenario-description"
                value={scenarioDescription}
                onChange={(e) => setScenarioDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameScenarioOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameScenario}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createScenarioOpen} onOpenChange={setCreateScenarioOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Create New Scenario</DialogTitle>
            <DialogDescription>
              Create a new scenario for {selectedProject?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scenario-name">Scenario Name</Label>
              <Input
                id="scenario-name"
                placeholder="e.g., Baseline Analysis, What-if Scenario"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scenario-description">Description (Optional)</Label>
              <Textarea
                id="scenario-description"
                placeholder="Describe what this scenario analyzes..."
                value={scenarioDescription}
                onChange={(e) => setScenarioDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateScenarioOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateScenario}>
              Create Scenario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
