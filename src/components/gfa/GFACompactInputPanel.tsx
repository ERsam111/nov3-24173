import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Download, List, Package, DollarSign, ChevronRight, X } from "lucide-react";
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
    <div className="flex h-full">
      {/* Compact Top Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-1 p-2 bg-background/95 backdrop-blur border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowUploadDialog(true)}
          className="h-8 w-8 p-0"
          title="Import Data"
        >
          <Upload className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={exportData}
          className="h-8 w-8 p-0"
          title="Export Data"
        >
          <Download className="h-4 w-4" />
        </Button>
        <div className="ml-auto text-xs text-muted-foreground">
          {customers.length} customers · {products.length} products
        </div>
      </div>

      {/* Left Sidebar */}
      <div className="w-56 border-r bg-muted/30 pt-12 flex flex-col">
        <div className="text-xs font-semibold text-muted-foreground px-3 py-2">INPUT DATA</div>
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            <button
              onClick={() => setActiveSection(activeSection === "customers" ? null : "customers")}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                activeSection === "customers"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-2">
                <List className="h-4 w-4" />
                <span>Customer Data</span>
              </div>
              <span className="text-xs opacity-70">{customers.length}</span>
            </button>

            <button
              onClick={() => setActiveSection(activeSection === "products" ? null : "products")}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                activeSection === "products"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>Products</span>
              </div>
              <span className="text-xs opacity-70">{products.length}</span>
            </button>

            <button
              onClick={() => setActiveSection(activeSection === "costs" ? null : "costs")}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                activeSection === "costs"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>Cost Parameters</span>
              </div>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative pt-12">
        {/* Map View */}
        <div className={cn(
          "absolute inset-0 transition-all duration-300",
          activeSection ? "right-96" : "right-0"
        )}>
          {mapComponent}
        </div>

        {/* Sliding Detail Panel */}
        <div
          className={cn(
            "absolute top-0 bottom-0 right-0 w-96 bg-background border-l shadow-lg transition-transform duration-300",
            activeSection ? "translate-x-0" : "translate-x-full"
          )}
        >
          {activeSection && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-3 border-b bg-muted/50">
                <h3 className="font-semibold text-sm">
                  {activeSection === "customers" && "Customer Data"}
                  {activeSection === "products" && "Product Management"}
                  {activeSection === "costs" && "Cost Parameters"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveSection(null)}
                  className="h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {activeSection === "customers" && (
                    <CustomerDataForm
                      customers={customers}
                      onAddCustomer={handleAddCustomer}
                      onRemoveCustomer={handleRemoveCustomer}
                    />
                  )}

                  {activeSection === "products" && products.length > 0 && (
                    <ProductManager
                      products={products}
                      onProductUpdate={handleProductUpdate}
                      targetUnit={settings.capacityUnit}
                    />
                  )}

                  {activeSection === "costs" && (
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
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
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
