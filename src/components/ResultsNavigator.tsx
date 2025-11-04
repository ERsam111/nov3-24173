import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, Edit2, Check, X, Trash2 } from "lucide-react";
import { Result, renameResult, deleteResult } from "@/lib/data/results";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { generateNameSuggestions } from "@/lib/naming";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface ResultsNavigatorProps {
  results: Result[];
  selectedResultId: string | null;
  onResultSelect: (result: Result) => void;
  onResultRenamed?: () => void;
  scenarioId: string;
}

export function ResultsNavigator({
  results,
  selectedResultId,
  onResultSelect,
  onResultRenamed,
  scenarioId
}: ResultsNavigatorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resultToDelete, setResultToDelete] = useState<Result | null>(null);

  const selectedResult = results.find(r => r.id === selectedResultId);

  const handleRename = async (resultId: string) => {
    if (!editName.trim()) {
      toast.error("Result name cannot be empty");
      return;
    }

    const result = await renameResult(resultId, editName.trim(), scenarioId);
    
    if (result.success) {
      toast.success(`Renamed to "${editName}"`);
      setEditingId(null);
      onResultRenamed?.();
    } else {
      const suggestions = generateNameSuggestions(editName.trim(), 3);
      toast.error(result.error || "Failed to rename", {
        description: `Try: ${suggestions.join(", ")}`
      });
    }
  };

  const startEdit = (result: Result, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(result.id);
    setEditName(result.name);
    setIsOpen(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleDeleteClick = (result: Result, e: React.MouseEvent) => {
    e.stopPropagation();
    setResultToDelete(result);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!resultToDelete) return;

    const response = await deleteResult(resultToDelete.id);
    
    if (response.success) {
      toast.success(`Deleted "${resultToDelete.name}"`);
      
      // If deleted result was selected, clear selection
      if (selectedResultId === resultToDelete.id) {
        const remainingResults = results.filter(r => r.id !== resultToDelete.id);
        if (remainingResults.length > 0) {
          onResultSelect(remainingResults[0]);
        }
      }
      
      onResultRenamed?.(); // Refresh list
    } else {
      toast.error(response.error || "Failed to delete result");
    }
    
    setDeleteDialogOpen(false);
    setResultToDelete(null);
  };

  if (results.length === 0) {
    return (
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
        <div className="text-sm text-muted-foreground">
          No results yet. Run an optimization to create your first result.
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
      <span className="text-sm font-medium">Result:</span>
      
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[300px] justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              {selectedResult ? (
                <>
                  <span className="truncate">{selectedResult.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    #{selectedResult.result_number}
                  </Badge>
                </>
              ) : (
                <span>Select a result</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[400px] max-h-[400px] overflow-y-auto">
          <DropdownMenuLabel>
            <div className="flex items-center justify-between">
              <span>Results History</span>
              <span className="text-xs text-muted-foreground font-normal">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {results.map((result) => (
            <DropdownMenuItem
              key={result.id}
              className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                selectedResultId === result.id ? "bg-primary/10" : ""
              }`}
              onSelect={() => {
                if (editingId !== result.id) {
                  onResultSelect(result);
                }
              }}
            >
              {editingId === result.id ? (
                <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRename(result.id);
                      }
                      if (e.key === "Escape") {
                        cancelEdit();
                      }
                      e.stopPropagation();
                    }}
                    className="h-7 text-sm"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRename(result.id);
                    }}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelEdit();
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{result.name}</span>
                      <Badge variant="outline" className="text-xs">
                        #{result.result_number}
                      </Badge>
                      {selectedResultId === result.id && (
                        <Badge variant="default" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => startEdit(result, e)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteClick(result, e)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}
                    </span>
                    {result.metrics && Object.keys(result.metrics).length > 0 && (
                      <span className="flex gap-2">
                        {result.metrics.totalCost && (
                          <span>Cost: ${result.metrics.totalCost.toLocaleString()}</span>
                        )}
                        {result.metrics.numSites && (
                          <span>Sites: {result.metrics.numSites}</span>
                        )}
                        {result.metrics.serviceLevel && (
                          <span>SL: {result.metrics.serviceLevel}%</span>
                        )}
                      </span>
                    )}
                  </div>
                </>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedResult && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {formatDistanceToNow(new Date(selectedResult.created_at), { addSuffix: true })}
          </span>
          {selectedResult.metrics && (
            <>
              {selectedResult.metrics.totalCost && (
                <span>Cost: ${selectedResult.metrics.totalCost.toLocaleString()}</span>
              )}
              {selectedResult.metrics.numSites && (
                <span>Sites: {selectedResult.metrics.numSites}</span>
              )}
            </>
          )}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Result</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{resultToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
