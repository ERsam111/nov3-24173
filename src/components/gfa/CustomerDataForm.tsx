import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, X, MapPin } from "lucide-react";
import { Customer } from "@/types/gfa";
import { toast } from "sonner";
import { getConversionFactor, getAvailableUnits } from "@/utils/unitConversions";
import { supabase } from "@/integrations/supabase/client";

interface CustomerDataFormProps {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
  onRemoveCustomer: (id: string) => void;
}

export function CustomerDataForm({
  customers,
  onAddCustomer,
  onRemoveCustomer,
}: CustomerDataFormProps) {
  const [formData, setFormData] = useState({
    product: "",
    name: "",
    postalCode: "",
    city: "",
    country: "",
    latitude: "",
    longitude: "",
    demand: "",
    unitOfMeasure: "m3",
  });

  const [isGeocoding, setIsGeocoding] = useState(false);

  const validatePostalCode = (postalCode: string, country: string): { valid: boolean; message?: string } => {
    const code = postalCode.trim().replace(/\s+/g, '');
    const countryLower = country.toLowerCase();

    // Postal code patterns by country
    const patterns: { [key: string]: { regex: RegExp; format: string } } = {
      'usa': { regex: /^\d{5}(-\d{4})?$/, format: '5 or 9 digits (e.g., 12345 or 12345-6789)' },
      'us': { regex: /^\d{5}(-\d{4})?$/, format: '5 or 9 digits (e.g., 12345 or 12345-6789)' },
      'united states': { regex: /^\d{5}(-\d{4})?$/, format: '5 or 9 digits (e.g., 12345 or 12345-6789)' },
      'canada': { regex: /^[A-Za-z]\d[A-Za-z]\d[A-Za-z]\d$/, format: '6 characters (e.g., A1A1A1)' },
      'uk': { regex: /^[A-Z]{1,2}\d{1,2}[A-Z]?\d[A-Z]{2}$/i, format: '5-7 characters (e.g., SW1A1AA)' },
      'united kingdom': { regex: /^[A-Z]{1,2}\d{1,2}[A-Z]?\d[A-Z]{2}$/i, format: '5-7 characters (e.g., SW1A1AA)' },
      'india': { regex: /^\d{6}$/, format: '6 digits (e.g., 110001)' },
      'germany': { regex: /^\d{5}$/, format: '5 digits (e.g., 12345)' },
      'france': { regex: /^\d{5}$/, format: '5 digits (e.g., 75001)' },
      'australia': { regex: /^\d{4}$/, format: '4 digits (e.g., 2000)' },
      'japan': { regex: /^\d{3}-?\d{4}$/, format: '7 digits (e.g., 100-0001)' },
      'china': { regex: /^\d{6}$/, format: '6 digits (e.g., 100000)' },
      'italy': { regex: /^\d{5}$/, format: '5 digits (e.g., 00100)' },
      'spain': { regex: /^\d{5}$/, format: '5 digits (e.g., 28001)' },
      'netherlands': { regex: /^\d{4}[A-Z]{2}$/i, format: '6 characters (e.g., 1234AB)' },
      'belgium': { regex: /^\d{4}$/, format: '4 digits (e.g., 1000)' },
      'switzerland': { regex: /^\d{4}$/, format: '4 digits (e.g., 8000)' },
      'brazil': { regex: /^\d{5}-?\d{3}$/, format: '8 digits (e.g., 01310-100)' },
      'mexico': { regex: /^\d{5}$/, format: '5 digits (e.g., 01000)' },
    };

    // If country is specified, validate against that country's pattern
    if (countryLower && patterns[countryLower]) {
      if (!patterns[countryLower].regex.test(code)) {
        return {
          valid: false,
          message: `Invalid postal code for ${country}. Expected format: ${patterns[countryLower].format}`
        };
      }
    } else if (country) {
      // Country specified but not in our patterns - just check it's 3-9 characters
      if (code.length < 3 || code.length > 9) {
        return {
          valid: false,
          message: 'Postal code should be 3-9 characters'
        };
      }
    } else {
      // No country specified - accept 3-9 characters
      if (code.length < 3 || code.length > 9) {
        return {
          valid: false,
          message: 'Postal code should be 3-9 characters. Consider specifying a country for better validation.'
        };
      }
    }

    return { valid: true };
  };

  const handleGeocodePostal = async () => {
    if (!formData.postalCode.trim()) {
      toast.error("Please enter a postal code");
      return;
    }

    // Validate postal code format
    const validation = validatePostalCode(formData.postalCode, formData.country);
    if (!validation.valid) {
      toast.error(validation.message || "Invalid postal code format");
      return;
    }

    setIsGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode-postal', {
        body: { 
          postalCode: formData.postalCode.trim(),
          country: formData.country.trim() || undefined
        }
      });

      if (error) throw error;

      if (data.found) {
        setFormData({
          ...formData,
          latitude: data.latitude.toString(),
          longitude: data.longitude.toString(),
          city: data.city || formData.city,
          country: data.country || formData.country,
        });
        toast.success(`Location found: ${data.displayName}`);
      } else {
        toast.error(data.error || "Location not found");
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast.error("Failed to geocode postal code");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.product || !formData.name || !formData.city || !formData.country) {
      toast.error("Product, customer name, city, and country are required");
      return;
    }

    const demand = parseFloat(formData.demand);

    if (isNaN(demand)) {
      toast.error("Invalid demand value");
      return;
    }

    if (demand <= 0) {
      toast.error("Demand must be greater than 0");
      return;
    }

    let lat: number;
    let lng: number;

    // If postal code is provided but no coordinates, try to geocode
    if (formData.postalCode.trim() && (!formData.latitude || !formData.longitude)) {
      const validation = validatePostalCode(formData.postalCode, formData.country);
      if (!validation.valid) {
        toast.error(validation.message || "Invalid postal code format");
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('geocode-postal', {
          body: { 
            postalCode: formData.postalCode.trim(),
            country: formData.country.trim()
          }
        });

        if (error || !data.found) {
          toast.error("Failed to geocode postal code. Please enter coordinates manually.");
          return;
        }

        lat = data.latitude;
        lng = data.longitude;
        
        // Update form with geocoded values
        setFormData({
          ...formData,
          latitude: lat.toString(),
          longitude: lng.toString(),
          city: data.city || formData.city,
        });
      } catch (error) {
        toast.error("Failed to geocode postal code. Please enter coordinates manually.");
        return;
      }
    } else {
      // Use provided coordinates
      lat = parseFloat(formData.latitude);
      lng = parseFloat(formData.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        toast.error("Please provide either a valid postal code or latitude/longitude coordinates");
        return;
      }

      if (lat < -90 || lat > 90) {
        toast.error("Latitude must be between -90 and 90");
        return;
      }

      if (lng < -180 || lng > 180) {
        toast.error("Longitude must be between -180 and 180");
        return;
      }
    }

    const customer: Customer = {
      id: `customer-${Date.now()}-${Math.random()}`,
      product: formData.product.trim(),
      name: formData.name.trim(),
      city: formData.city.trim(),
      country: formData.country.trim(),
      latitude: lat,
      longitude: lng,
      demand: demand,
      unitOfMeasure: formData.unitOfMeasure,
      conversionFactor: getConversionFactor(formData.unitOfMeasure),
    };

    onAddCustomer(customer);
    
    // Reset form
    setFormData({
      product: "",
      name: "",
      postalCode: "",
      city: "",
      country: "",
      latitude: "",
      longitude: "",
      demand: "",
      unitOfMeasure: "m3",
    });

    toast.success(`Added customer: ${customer.name}`);
  };

  return (
    <Card className="shadow-lg">
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Product</Label>
            <Input
              id="product"
              value={formData.product}
              onChange={(e) =>
                setFormData({ ...formData, product: e.target.value })
              }
              placeholder="e.g., Electronics"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Customer Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., ABC Store"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal Code (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) =>
                  setFormData({ ...formData, postalCode: e.target.value })
                }
                placeholder="e.g., 10001"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleGeocodePostal}
                disabled={isGeocoding || !formData.postalCode.trim()}
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter postal code and click the button to auto-fill coordinates
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="e.g., New York"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                placeholder="e.g., USA"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude (Optional if postal code provided)</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) =>
                  setFormData({ ...formData, latitude: e.target.value })
                }
                placeholder="e.g., 40.7128"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude (Optional if postal code provided)</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) =>
                  setFormData({ ...formData, longitude: e.target.value })
                }
                placeholder="e.g., -74.0060"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="demand">Demand (units)</Label>
            <Input
              id="demand"
              type="number"
              step="any"
              min="0"
              value={formData.demand}
              onChange={(e) =>
                setFormData({ ...formData, demand: e.target.value })
              }
              placeholder="e.g., 1000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
            <Select
              value={formData.unitOfMeasure}
              onValueChange={(value) =>
                setFormData({ ...formData, unitOfMeasure: value })
              }
            >
              <SelectTrigger id="unitOfMeasure">
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

          <Button type="submit" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </form>

        {customers.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="font-medium text-sm text-muted-foreground">
              Added Customers ({customers.length})
            </h3>
            <div className="max-h-[400px] overflow-x-auto overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Product</TableHead>
                    <TableHead className="min-w-[150px]">Customer Name</TableHead>
                    <TableHead className="min-w-[120px]">City</TableHead>
                    <TableHead className="min-w-[100px]">Country</TableHead>
                    <TableHead className="min-w-[100px]">Latitude</TableHead>
                    <TableHead className="min-w-[100px]">Longitude</TableHead>
                    <TableHead className="min-w-[80px]">Demand</TableHead>
                    <TableHead className="min-w-[80px]">Unit</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.product}</TableCell>
                      <TableCell>{customer.name}</TableCell>
                      <TableCell>{customer.city}</TableCell>
                      <TableCell>{customer.country}</TableCell>
                      <TableCell className="tabular-nums">{customer.latitude.toFixed(4)}</TableCell>
                      <TableCell className="tabular-nums">{customer.longitude.toFixed(4)}</TableCell>
                      <TableCell className="tabular-nums">{customer.demand}</TableCell>
                      <TableCell>{customer.unitOfMeasure}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveCustomer(customer.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
