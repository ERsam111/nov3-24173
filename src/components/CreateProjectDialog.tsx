import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProjects } from '@/contexts/ProjectContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolType: 'gfa' | 'forecasting' | 'network' | 'inventory' | 'transportation';
  toolName: string;
  redirectTo: string;
}

export function CreateProjectDialog({ 
  open, 
  onOpenChange, 
  toolType, 
  toolName,
  redirectTo 
}: CreateProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { createProject } = useProjects();
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setLoading(true);
    
    const project = await createProject({
      name: name.trim(),
      description: description.trim() || null,
      tool_type: toolType,
      input_data: {},
      results_data: {},
      size_mb: 0,
    });

    if (project) {
      toast.success('Project created successfully!');
      setName('');
      setDescription('');
      onOpenChange(false);
      navigate(redirectTo);
    } else {
      toast.error('Failed to create project');
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project for {toolName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder="Enter project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description (Optional)</Label>
            <Textarea
              id="project-description"
              placeholder="Enter project description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}