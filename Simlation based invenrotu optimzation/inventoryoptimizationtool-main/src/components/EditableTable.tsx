import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { ParameterSetupDialog } from "./ParameterSetupDialog";
import { DistributionParameterDialog } from "./DistributionParameterDialog";
import { BOMDialog } from "./BOMDialog";

interface EditableTableProps {
  title: string;
  description?: string;
  columns: string[];
  data: any[];
  onDataChange: (newData: any[]) => void;
  dropdownOptions?: Record<string, string[]>;
  inventoryPolicyData?: any[];
}

export const EditableTable = ({
  title,
  description,
  columns,
  data,
  onDataChange,
  dropdownOptions,
  inventoryPolicyData,
}: EditableTableProps) => {
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Auto-populate Simulation Policy
  useEffect(() => {
    if (inventoryPolicyData && data.length > 0 && columns.includes("Simulation Policy")) {
      const updatedData = data.map((row) => {
        const facilityName = row["Facility Name"];
        const productName = row["Product"];

        if (facilityName && productName) {
          const policy = inventoryPolicyData.find(
            (p: any) => p["Facility Name"] === facilityName && p["Product Name"] === productName,
          );
          if (policy?.["Simulation Policy"]) {
            return { ...row, "Simulation Policy": policy["Simulation Policy"] };
          }
        }
        return row;
      });
      if (JSON.stringify(updatedData) !== JSON.stringify(data)) {
        onDataChange(updatedData);
      }
    }
  }, [data, inventoryPolicyData]);

  const handleCellClick = (rowIndex: number, column: string, value: any) => {
    setEditingCell({ row: rowIndex, col: column });
    setEditValue(value?.toString() || "");
  };

  const handleCellSave = () => {
    if (editingCell) {
      const newData = [...data];
      newData[editingCell.row][editingCell.col] = editValue;
      onDataChange(newData);
      setEditingCell(null);
      toast.success("Cell updated");
    }
  };

  const handleAddRow = () => {
    const newRow: any = {};
    columns.forEach((col) => (newRow[col] = col === "Parameter Setup" ? JSON.stringify([]) : ""));
    onDataChange([...data, newRow]);
    toast.success("Row added");
  };

  const handleDeleteRow = (rowIndex: number) => {
    const newData = data.filter((_, i) => i !== rowIndex);
    onDataChange(newData);
    toast.success("Row deleted");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCellSave();
    else if (e.key === "Escape") setEditingCell(null);
  };

  return (
    <Card className="border-border shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-foreground">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Button onClick={handleAddRow} size="sm" variant="default">
          <Plus className="h-4 w-4 mr-2" />
          Add Row
        </Button>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px] w-full overflow-x-auto">
          <div className="min-w-full w-max">
            <Table className="table-auto">
              <TableHeader>
                <TableRow className="bg-accent hover:bg-accent">
                  {columns.map((col) => (
                    <TableHead
                      key={col}
                      className="font-semibold text-accent-foreground whitespace-nowrap min-w-[75px] px-2 py-2"
                    >
                      {col}
                    </TableHead>
                  ))}
                  <TableHead className="font-semibold text-accent-foreground whitespace-nowrap w-[50px] px-2 py-2">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {data.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className="hover:bg-muted/50">
                    {columns.map((col) => (
                      <TableCell
                        key={col}
                        className="whitespace-nowrap cursor-pointer min-w-[75px] px-2 py-2"
                        onClick={() => col !== "Parameter Setup" && handleCellClick(rowIndex, col, row[col])}
                      >
                        {/* === DIALOG TYPES === */}
                        {col === "Parameter Setup" ? (
                          <ParameterSetupDialog
                            facilityName={row["Facility Name"] || ""}
                            productName={row["Product"] || ""}
                            simulationPolicy={row["Simulation Policy"] || ""}
                            parameters={row[col] ? JSON.parse(row[col]) : []}
                            onSave={(params) => {
                              const newData = [...data];
                              newData[rowIndex][col] = JSON.stringify(params);
                              onDataChange(newData);
                              toast.success("Parameters updated");
                            }}
                          />
                        ) : col === "Raw Materials" ? (
                          <BOMDialog
                            currentValue={row[col] || ""}
                            availableProducts={dropdownOptions?.["Raw Material"] || []}
                            onSave={(val) => {
                              const newData = [...data];
                              newData[rowIndex][col] = val;
                              onDataChange(newData);
                            }}
                          />
                        ) : col === "Quantity" ? (
                          <DistributionParameterDialog
                            currentValue={row[col] || ""}
                            onSave={(val) => {
                              const newData = [...data];
                              newData[rowIndex][col] = val;
                              onDataChange(newData);
                              toast.success("Quantity distribution updated");
                            }}
                          />
                        ) : col === "Transport Time Distribution" ? (
                          <DistributionParameterDialog
                            currentValue={row[col] || ""}
                            onSave={(val) => {
                              const newData = [...data];
                              newData[rowIndex][col] = val;
                              onDataChange(newData);
                              toast.success("Transport time distribution updated");
                            }}
                          />
                        ) : col === "Time Between Orders" ? (
                          <DistributionParameterDialog
                            currentValue={row[col] || ""}
                            onSave={(val) => {
                              const newData = [...data];
                              newData[rowIndex][col] = val;
                              onDataChange(newData);
                              toast.success("Time between orders distribution updated");
                            }}
                          />
                        ) : col === "Simulation Policy" && inventoryPolicyData ? (
                          <span className="text-foreground font-medium">{row[col] ?? ""}</span>
                        ) : editingCell?.row === rowIndex && editingCell?.col === col ? (
                          <div className="flex gap-1">
                            {dropdownOptions?.[col] ? (
                              <Select
                                value={editValue}
                                onValueChange={(val) => {
                                  const newData = [...data];
                                  newData[rowIndex][col] = val;
                                  onDataChange(newData);
                                  setEditingCell(null);
                                  toast.success("Cell updated");
                                }}
                              >
                                <SelectTrigger className="h-8 w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {dropdownOptions[col]
                                    .filter((opt) => opt)
                                    .map((opt) => (
                                      <SelectItem key={opt} value={opt}>
                                        {opt}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <>
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={handleKeyDown}
                                  onBlur={handleCellSave}
                                  autoFocus
                                  className="h-8"
                                />
                                <Button onClick={handleCellSave} size="sm" variant="ghost" className="h-8 px-2">
                                  <Save className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-foreground">{row[col] ?? ""}</span>
                        )}
                      </TableCell>
                    ))}

                    <TableCell className="w-[50px] px-2 py-2">
                      <Button
                        onClick={() => handleDeleteRow(rowIndex)}
                        size="sm"
                        variant="ghost"
                        className="h-8 px-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
