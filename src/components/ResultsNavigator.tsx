import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronUp, Edit2, Eye } from "lucide-react";
import { Result, renameResult } from "@/lib/data/results";
import { toast } from "sonner";
import { generateNameSuggestions } from "@/lib/naming";

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
  const [showAll, setShowAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const displayedResults = showAll ? results : results.slice(0, 10);

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

  const startEdit = (result: Result) => {
    setEditingId(result.id);
    setEditName(result.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No results yet. Run an optimization to create your first result.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Results History</CardTitle>
          {results.length > 10 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="gap-2"
            >
              {showAll ? (
                <>
                  Show Less <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  View All ({results.length}) <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayedResults.map((result) => (
            <div
              key={result.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                selectedResultId === result.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex-1 min-w-0">
                {editingId === result.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(result.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="h-8"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => handleRename(result.id)}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{result.name}</span>
                      <Badge variant="outline" className="text-xs">
                        #{result.result_number}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}
                      </span>
                      {result.metrics && Object.keys(result.metrics).length > 0 && (
                        <span className="flex gap-2">
                          {result.metrics.totalCost && (
                            <span>Cost: ${result.metrics.totalCost.toLocaleString()}</span>
                          )}
                          {result.metrics.serviceLevel && (
                            <span>SL: {result.metrics.serviceLevel}%</span>
                          )}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => startEdit(result)}
                  title="Rename result"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={selectedResultId === result.id ? "default" : "outline"}
                  onClick={() => onResultSelect(result)}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {selectedResultId === result.id ? "Viewing" : "Open"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
