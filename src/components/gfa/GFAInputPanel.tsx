import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Plus } from "lucide-react";
import { Customer, Product, OptimizationSettings } from "@/types/gfa";
import { ExcelUpload } from "./ExcelUpload";
import { CustomerDataForm } from "./CustomerDataForm";
import { ProductManager } from "./ProductManager";
import { CostParameters } from "./CostParameters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface GFAInputPanelProps {
  customers: Customer[];
  products: Product[];
  settings: OptimizationSettings;
  onCustomersChange: (customers: Customer[]) => void;
  onProductsChange: (products: Product[]) => void;
  onSettingsChange: (settings: OptimizationSettings) => void;
}

export function GFAInputPanel({
  customers,
  products,
  settings,
  onCustomersChange,
  onProductsChange,
  onSettingsChange,
}: GFAInputPanelProps) {
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
  };

  const handleClearData = () => {
    onCustomersChange([]);
    onProductsChange([]);
    toast.success("All data cleared successfully");
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

    // Update customers
    onCustomersChange(
      customers.map((c) =>
        c.product === productName ? { ...c, conversionFactor } : c
      )
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Data Upload */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            Data Upload
          </CardTitle>
          <CardDescription className="text-xs">Upload customer data via Excel file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <ExcelUpload onBulkUpload={handleBulkUpload} />
          {customers.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full gap-2 h-8 text-xs">
                  <Trash2 className="h-3 w-3" />
                  Clear All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all customer data, products, and optimization results.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearData}>Clear All</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>

      {/* Customer Data */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            Customer Data {customers.length > 0 && `(${customers.length})`}
          </CardTitle>
          <CardDescription className="text-xs">Add customers manually</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <CustomerDataForm
            customers={customers}
            onAddCustomer={handleAddCustomer}
            onRemoveCustomer={handleRemoveCustomer}
          />
        </CardContent>
      </Card>

      {/* Products */}
      {products.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Products ({products.length})</CardTitle>
            <CardDescription className="text-xs">Configure product units and pricing</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ProductManager
              products={products}
              onProductUpdate={handleProductUpdate}
              targetUnit={settings.capacityUnit}
            />
          </CardContent>
        </Card>
      )}

      {/* Cost Parameters */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cost Parameters</CardTitle>
          <CardDescription className="text-xs">Set transportation and facility costs</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
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
        </CardContent>
      </Card>
    </div>
  );
}
