import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MapPin, 
  TrendingUp, 
  Network, 
  Gauge, 
  Home, 
  User, 
  FolderOpen,
  Plus,
  ChevronDown,
  Calendar,
  HardDrive,
  Trash2,
  MoreVertical
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { useProjects } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { CreateProjectDialog } from './CreateProjectDialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const navigationItems = [
  { title: 'Dashboard', url: '/dashboard', icon: Home, type: null },
  { title: 'GFA', url: '/gfa', icon: MapPin, type: 'gfa' as const },
  { title: 'Demand Forecasting', url: '/demand-forecasting', icon: TrendingUp, type: 'forecasting' as const },
  { title: 'Network Analysis', url: '/network', icon: Network, type: 'network' as const },
  { title: 'Inventory Optimization', url: '/inventory-optimization-v2', icon: Gauge, type: 'inventory' as const },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { projects, deleteProject } = useProjects();
  const { user } = useAuth();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<typeof navigationItems[0] | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [scenarioCounts, setScenarioCounts] = useState<Record<string, number>>({});

  // Load scenario counts for all projects
  useEffect(() => {
    const loadScenarioCounts = async () => {
      if (!projects.length) return;
      
      const counts: Record<string, number> = {};
      await Promise.all(
        projects.map(async (project) => {
          const { count } = await (supabase as any)
            .from('scenarios')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);
          counts[project.id] = count || 0;
        })
      );
      setScenarioCounts(counts);
    };
    
    loadScenarioCounts();
  }, [projects]);

  const isActive = (path: string) => location.pathname === path;
  const collapsed = state === 'collapsed';

  const handleNavClick = (item: typeof navigationItems[0]) => {
    if (item.type) {
      setSelectedTool(item);
      setCreateDialogOpen(true);
    } else {
      navigate(item.url);
    }
  };

  const handleProjectClick = (projectId: string, toolType: string) => {
    const routeMap: Record<string, string> = {
      gfa: '/gfa',
      forecasting: '/demand-forecasting',
      network: '/network',
      inventory: '/inventory-optimization-v2',
    };
    navigate(routeMap[toolType] || '/dashboard');
  };

  const handleDeleteClick = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete(projectId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (projectToDelete) {
      await deleteProject(projectToDelete);
      toast.success('Project deleted successfully');
      setProjectToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Sidebar className={collapsed ? 'w-14' : 'w-64'} collapsible="icon">
        <SidebarHeader className="border-b p-4">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">SC</span>
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-sm">Supply Chain</h2>
                <p className="text-xs text-muted-foreground">Optimization Suite</p>
              </div>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent>
          {/* Navigation */}
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        onClick={() => handleNavClick(item)}
                        isActive={isActive(item.url)}
                        className="w-full"
                      >
                        <Icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Projects */}
          {!collapsed && (
            <SidebarGroup>
              <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer flex items-center justify-between hover:bg-accent/50 rounded-md px-2 py-1">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      <span>Projects</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${projectsOpen ? 'rotate-180' : ''}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {projects.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          No projects yet
                        </div>
                      ) : (
                        projects.map((project) => (
                          <SidebarMenuItem key={project.id}>
                            <div 
                              className="px-3 py-2 text-sm hover:bg-accent rounded-md cursor-pointer group flex items-start justify-between"
                              onClick={() => handleProjectClick(project.id, project.tool_type)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium truncate">{project.name}</div>
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                                    {scenarioCounts[project.id] || 0} scenarios
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{format(new Date(project.created_at), 'MMM d')}</span>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger 
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent-foreground/10 rounded"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={(e) => handleDeleteClick(project.id, e)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Project
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </SidebarMenuItem>
                        ))
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          )}

          {/* Profile */}
          {!collapsed && user && (
            <SidebarGroup className="mt-auto">
              <SidebarGroupLabel>Profile</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate('/profile')}>
                      <User className="h-4 w-4" />
                      <span>My Profile</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
      </Sidebar>

      {selectedTool && selectedTool.type && (
        <CreateProjectDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          toolType={selectedTool.type}
          toolName={selectedTool.title}
          redirectTo={selectedTool.url}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
