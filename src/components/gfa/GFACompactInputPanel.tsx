import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Download, Trash2, Plus, X } from "lucide-react";
import { Customer, Product, OptimizationSettings } from "@/types/gfa";
import { ExcelUpload } from "./ExcelUpload";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export function GFACompactInputPanel({
  customers,
  products,
  settings,
  onCustomersChange,
  onProductsChange,
  onSettingsChange,
  mapComponent,
}: GFACompactInputPanelProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    latitude: "",
    longitude: "",
    demand: "",
    product: "",
    city: "",
  });

  const handleAddCustomer = () => {
    if (!newCustomer.name || !newCustomer.latitude || !newCustomer.longitude || !newCustomer.demand) {
      toast.error("Please fill all customer fields");
      return;
    }
    
    const customer: Customer = {
      id: `customer-${Date.now()}`,
      name: newCustomer.name,
      latitude: parseFloat(newCustomer.latitude),
      longitude: parseFloat(newCustomer.longitude),
      demand: parseFloat(newCustomer.demand),
      product: newCustomer.product || products[0]?.name || "",
      city: newCustomer.city || "Unknown",
      country: "Unknown",
      unitOfMeasure: products[0]?.baseUnit || "units",
      conversionFactor: 1,
    };
    
    onCustomersChange([...customers, customer]);
    setNewCustomer({ name: "", latitude: "", longitude: "", demand: "", product: "", city: "" });
    toast.success("Customer added");
  };

  const handleRemoveCustomer = (id: string) => {
    onCustomersChange(customers.filter((c) => c.id !== id));
    toast.success("Customer removed");
  };

  const handleUpdateCustomer = (id: string, field: string, value: any) => {
    onCustomersChange(
      customers.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      )
    );
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

  const handleUpdateProduct = (name: string, field: string, value: any) => {
    onProductsChange(
      products.map((p) =>
        p.name === name ? { ...p, [field]: value } : p
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
      <div className="flex-1 flex flex-col gap-3 overflow-auto pr-2">
        {/* Compact Top Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 bg-muted/50 rounded-md border">
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
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Customer Data ({customers.length})</h3>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Latitude</TableHead>
                  <TableHead>Longitude</TableHead>
                  <TableHead>Demand</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer, index) => (
                  <TableRow key={customer.id}>
                    <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <Input
                        value={customer.name}
                        onChange={(e) => handleUpdateCustomer(customer.id, "name", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={customer.city}
                        onChange={(e) => handleUpdateCustomer(customer.id, "city", e.target.value)}
                        className="h-8 text-xs w-28"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={customer.latitude}
                        onChange={(e) => handleUpdateCustomer(customer.id, "latitude", parseFloat(e.target.value))}
                        className="h-8 text-xs w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={customer.longitude}
                        onChange={(e) => handleUpdateCustomer(customer.id, "longitude", parseFloat(e.target.value))}
                        className="h-8 text-xs w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={customer.demand}
                        onChange={(e) => handleUpdateCustomer(customer.id, "demand", parseFloat(e.target.value))}
                        className="h-8 text-xs w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={customer.product}
                        onChange={(e) => handleUpdateCustomer(customer.id, "product", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCustomer(customer.id)}
                        className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Add New Row */}
                <TableRow className="bg-muted/30">
                  <TableCell className="text-xs text-muted-foreground">+</TableCell>
                  <TableCell>
                    <Input
                      placeholder="Name"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="City"
                      value={newCustomer.city}
                      onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                      className="h-8 text-xs w-28"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="Lat"
                      value={newCustomer.latitude}
                      onChange={(e) => setNewCustomer({ ...newCustomer, latitude: e.target.value })}
                      className="h-8 text-xs w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="Lng"
                      value={newCustomer.longitude}
                      onChange={(e) => setNewCustomer({ ...newCustomer, longitude: e.target.value })}
                      className="h-8 text-xs w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="Demand"
                      value={newCustomer.demand}
                      onChange={(e) => setNewCustomer({ ...newCustomer, demand: e.target.value })}
                      className="h-8 text-xs w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Product"
                      value={newCustomer.product}
                      onChange={(e) => setNewCustomer({ ...newCustomer, product: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddCustomer}
                      className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Product Data Table */}
        {products.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Products ({products.length})</h3>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Base Unit</TableHead>
                    <TableHead>Selling Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product, index) => (
                    <TableRow key={product.name}>
                      <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.baseUnit}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={product.sellingPrice || 0}
                          onChange={(e) => handleUpdateProduct(product.name, "sellingPrice", parseFloat(e.target.value))}
                          className="h-8 text-xs w-24"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Cost Parameters Table */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Cost Parameters</h3>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Transportation Cost</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={settings.transportationCostPerMilePerUnit}
                      onChange={(e) =>
                        onSettingsChange({ ...settings, transportationCostPerMilePerUnit: parseFloat(e.target.value) })
                      }
                      className="h-8 text-xs w-24"
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {settings.costUnit}/{settings.distanceUnit}/unit
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Facility Cost</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={settings.facilityCost}
                      onChange={(e) => onSettingsChange({ ...settings, facilityCost: parseFloat(e.target.value) })}
                      className="h-8 text-xs w-24"
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{settings.costUnit}/facility</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Right Corner - Map */}
      <div className="w-[500px] h-full rounded-lg overflow-hidden border shadow-lg flex-shrink-0">
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
