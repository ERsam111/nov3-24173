import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Download, List, Package, DollarSign, ChevronRight, X, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Customer, Product, OptimizationSettings } from "@/types/gfa";
import { ExcelUpload } from "./ExcelUpload";
import { CustomerDataForm } from "./CustomerDataForm";
import { ProductManager } from "./ProductManager";
import { CostParameters } from "./CostParameters";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface GFACompactInputPanelProps {
  customers: Customer[];
  products: Product[];
  settings: OptimizationSettings;
  onCustomersChange: (customers: Customer[]) => void;
  onProductsChange: (products: Product[]) => void;
  onSettingsChange: (settings: OptimizationSettings) => void;
  mapComponent: React.ReactNode;
}

type PanelSection = "customers" | "products" | "costs" | null;

export function GFACompactInputPanel({
  customers,
  products,
  settings,
  onCustomersChange,
  onProductsChange,
  onSettingsChange,
  mapComponent,
}: GFACompactInputPanelProps) {
  const [activeSection, setActiveSection] = useState<PanelSection>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isCustomersOpen, setIsCustomersOpen] = useState(true);
  const [isProductsOpen, setIsProductsOpen] = useState(true);
  const [isCostsOpen, setIsCostsOpen] = useState(true);

  const handleAddCustomer = (customer: Customer) => {
    onCustomersChange([...customers, customer]);
  };

  const handleRemoveCustomer = (id: string) => {
    onCustomersChange(customers.filter((c) => c.id !== id));
  };

  const handleBulkUpload = (newCustomers: Customer[], mode: "append" | "overwrite") => {
    if (mode === "overwrite") {
      onCustomersChange(newCustomers);
    } else {
      onCustomersChange([...customers, ...newCustomers]);
    }
    setShowUploadDialog(false);
    toast.success(`${newCustomers.length} customers uploaded`);
  };

  const handleProductUpdate = (
    productName: string,
    conversionFactor: number,
    unitConversions?: any[],
    sellingPrice?: number
  ) => {
    onProductsChange(
      products.map((p) =>
        p.name === productName
          ? {
              name: p.name,
              baseUnit: p.baseUnit,
              conversionToStandard: conversionFactor,
              unitConversions: unitConversions || [],
              sellingPrice,
            }
          : p
      )
    );

    onCustomersChange(
      customers.map((c) =>
        c.product === productName ? { ...c, conversionFactor } : c
      )
    );
  };

  const exportData = () => {
    const data = {
      customers,
      products,
      settings,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gfa-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully");
  };

  return (
    <div className="flex h-full gap-2 p-2">
      {/* Left Panel - Tables */}
      <div className="flex-1 flex flex-col gap-2 overflow-auto">
        {/* Compact Top Toolbar */}
        <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-md border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUploadDialog(true)}
            className="h-7 px-2"
          >
            <Upload className="h-3.5 w-3.5 mr-1" />
            Import
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exportData}
            className="h-7 px-2"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Export
          </Button>
          <div className="ml-auto text-xs text-muted-foreground">
            {customers.length} customers · {products.length} products
          </div>
        </div>

        {/* Customer Data Table */}
        <Collapsible open={isCustomersOpen} onOpenChange={setIsCustomersOpen}>
          <Card className="p-3">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center gap-2 mb-2">
                <List className="h-4 w-4" />
                <h3 className="font-semibold text-sm">Customer Data</h3>
                <span className="text-xs text-muted-foreground ml-auto">{customers.length}</span>
                {isCustomersOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CustomerDataForm
                customers={customers}
                onAddCustomer={handleAddCustomer}
                onRemoveCustomer={handleRemoveCustomer}
              />
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Product Management Table */}
        {products.length > 0 && (
          <Collapsible open={isProductsOpen} onOpenChange={setIsProductsOpen}>
            <Card className="p-3">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4" />
                  <h3 className="font-semibold text-sm">Products</h3>
                  <span className="text-xs text-muted-foreground ml-auto">{products.length}</span>
                  {isProductsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ProductManager
                  products={products}
                  onProductUpdate={handleProductUpdate}
                  targetUnit={settings.capacityUnit}
                />
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Cost Parameters Table */}
        <Collapsible open={isCostsOpen} onOpenChange={setIsCostsOpen}>
          <Card className="p-3">
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4" />
                <h3 className="font-semibold text-sm">Cost Parameters</h3>
                {isCostsOpen ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CostParameters
                transportationCostPerMilePerUnit={settings.transportationCostPerMilePerUnit}
                facilityCost={settings.facilityCost}
                distanceUnit={settings.distanceUnit}
                costUnit={settings.costUnit}
                onTransportCostChange={(value) =>
                  onSettingsChange({ ...settings, transportationCostPerMilePerUnit: value })
                }
                onFacilityCostChange={(value) => onSettingsChange({ ...settings, facilityCost: value })}
                onDistanceUnitChange={(value) => onSettingsChange({ ...settings, distanceUnit: value })}
                onCostUnitChange={(value) => onSettingsChange({ ...settings, costUnit: value })}
              />
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Right Corner - Map */}
      <div className="w-96 h-full rounded-lg overflow-hidden border shadow-lg">
        {mapComponent}
      </div>

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Upload Customer Data</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUploadDialog(false)}
                className="h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ExcelUpload onBulkUpload={handleBulkUpload} />
          </Card>
        </div>
      )}
    </div>
  );
}
