import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product, UnitConversion } from "@/types/gfa";
import { Package, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getAvailableUnits } from "@/utils/unitConversions";

interface ProductManagerProps {
  products: Product[];
  onProductUpdate: (productName: string, conversionFactor: number, unitConversions?: UnitConversion[], sellingPrice?: number) => void;
  targetUnit: string; // The unit that all products should convert to
}

export function ProductManager({ products, onProductUpdate, targetUnit }: ProductManagerProps) {
  const [newConversions, setNewConversions] = useState<{ [key: string]: { fromUnit: string; toUnit: string; factor: string } }>({});

  if (products.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Units, Selling Price & Conversions
            </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Add customer data to manage product units and conversions
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardContent className="pt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Define unit conversions between different units for each product
        </p>
        
        {products.map((product) => {
          const newConv = newConversions[product.name] || { fromUnit: '', toUnit: '', factor: '' };
          
          return (
            <div key={product.name} className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{product.name}</p>
                  <p className="text-xs text-muted-foreground">Base Unit: {product.baseUnit}</p>
                </div>
              </div>
              
              {/* Selling Price */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Selling Price (per {product.baseUnit})</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter selling price"
                  value={product.sellingPrice || ''}
                  onChange={(e) => {
                    const price = e.target.value ? parseFloat(e.target.value) : undefined;
                    onProductUpdate(product.name, product.conversionToStandard, product.unitConversions, price);
                  }}
                  className="h-9"
                />
              </div>
              
              {/* Unit Conversions */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Unit Conversions</Label>
                
                {product.unitConversions && product.unitConversions.length > 0 && (
                  <div className="space-y-1">
                    {product.unitConversions.map((conversion) => (
                      <div key={conversion.id} className="flex items-center gap-2 text-sm bg-background p-2 rounded">
                        <span className="text-muted-foreground">1 {conversion.fromUnit} = {conversion.factor} {conversion.toUnit}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                        const updated = product.unitConversions.filter(c => c.id !== conversion.id);
                            onProductUpdate(product.name, product.conversionToStandard, updated, product.sellingPrice);
                            toast.success("Conversion removed");
                          }}
                          className="ml-auto h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Conversion */}
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">From Unit</Label>
                    <Select
                      value={newConv.fromUnit}
                      onValueChange={(value) => setNewConversions({ 
                        ...newConversions, 
                        [product.name]: { ...newConv, fromUnit: value } 
                      })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableUnits().map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">To Unit</Label>
                    <Select
                      value={newConv.toUnit}
                      onValueChange={(value) => setNewConversions({ 
                        ...newConversions, 
                        [product.name]: { ...newConv, toUnit: value } 
                      })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableUnits().map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Factor</Label>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="e.g., 0.001"
                      value={newConv.factor}
                      onChange={(e) => setNewConversions({ 
                        ...newConversions, 
                        [product.name]: { ...newConv, factor: e.target.value } 
                      })}
                      className="h-8"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!newConv.fromUnit || !newConv.toUnit || !newConv.factor) {
                        toast.error("Please fill all conversion fields");
                        return;
                      }
                      const newConversion = {
                        id: `${product.name}-${Date.now()}`,
                        fromUnit: newConv.fromUnit,
                        toUnit: newConv.toUnit,
                        factor: parseFloat(newConv.factor)
                      };
                      const updated = [...(product.unitConversions || []), newConversion];
                      console.log('Adding conversion:', newConversion, 'Updated array:', updated);
                      onProductUpdate(product.name, product.conversionToStandard, updated, product.sellingPrice);
                      setNewConversions({ ...newConversions, [product.name]: { fromUnit: '', toUnit: '', factor: '' } });
                      toast.success("Conversion added");
                    }}
                    className="h-8"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
