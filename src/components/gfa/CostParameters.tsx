import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAvailableUnits } from "@/utils/unitConversions";

interface CostParametersProps {
  transportationCostPerMilePerUnit: number;
  facilityCost: number;
  distanceUnit: 'km' | 'mile';
  costUnit: string;
  onTransportCostChange: (value: number) => void;
  onFacilityCostChange: (value: number) => void;
  onDistanceUnitChange: (value: 'km' | 'mile') => void;
  onCostUnitChange: (value: string) => void;
}

export function CostParameters({
  transportationCostPerMilePerUnit,
  facilityCost,
  distanceUnit,
  costUnit,
  onTransportCostChange,
  onFacilityCostChange,
  onDistanceUnitChange,
  onCostUnitChange,
}: CostParametersProps) {
  return (
    <Card className="shadow-lg">
      <CardContent className="pt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Define cost parameters used when optimizing by cost
        </p>

        <div className="space-y-2">
          <Label htmlFor="distanceUnit">Distance Unit</Label>
          <Select
            value={distanceUnit}
            onValueChange={(value: 'km' | 'mile') => onDistanceUnitChange(value)}
          >
            <SelectTrigger id="distanceUnit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="km">Kilometer (km)</SelectItem>
              <SelectItem value="mile">Mile</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="costUnit">Cost Unit</Label>
          <Select
            value={costUnit}
            onValueChange={onCostUnitChange}
          >
            <SelectTrigger id="costUnit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getAvailableUnits().map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Unit for cost calculation (e.g., kg, ton, m3, pallet)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="transportCost">Transportation Cost</Label>
          <div className="flex items-center gap-2">
            <Input
              id="transportCost"
              type="number"
              min="0"
              step="0.01"
              value={transportationCostPerMilePerUnit}
              onChange={(e) => onTransportCostChange(parseFloat(e.target.value) || 0)}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              per {distanceUnit} per {costUnit}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Cost per {distanceUnit} per {costUnit}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="facilityCost">Facility Opening Cost</Label>
          <Input
            id="facilityCost"
            type="number"
            min="0"
            step="1000"
            value={facilityCost}
            onChange={(e) => onFacilityCostChange(parseFloat(e.target.value) || 0)}
          />
          <p className="text-xs text-muted-foreground">
            Fixed cost to open one site
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
