import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface ResultHistoryBadgesProps {
  resultHistory: Array<{
    resultNumber: number;
    created_at: string;
  }>;
  selectedResultNumber: number | null;
  onResultSelect: (resultNumber: number) => void;
}

export function ResultHistoryBadges({ 
  resultHistory, 
  selectedResultNumber, 
  onResultSelect 
}: ResultHistoryBadgesProps) {
  if (resultHistory.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Result History</CardTitle>
          <div className="flex gap-2 flex-wrap">
            {resultHistory.map((result) => (
              <Badge
                key={result.resultNumber}
                variant={selectedResultNumber === result.resultNumber ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/90 transition-colors"
                onClick={() => onResultSelect(result.resultNumber)}
                title={`Created ${formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}`}
              >
                Result {result.resultNumber}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
