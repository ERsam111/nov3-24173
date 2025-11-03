import * as XLSX from 'xlsx';
import { Customer, Product, DistributionCenter, OptimizationSettings, CostBreakdown } from '@/types/gfa';
import { haversineDistance } from './geoCalculations';

interface ExportData {
  customers: Customer[];
  products: Product[];
  dcs: DistributionCenter[];
  settings: OptimizationSettings;
  costBreakdown?: CostBreakdown;
}

export function exportReport(data: ExportData) {
  const { customers, products, dcs, settings, costBreakdown } = data;
  
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['Green Field Analysis Report'],
    ['Generated:', new Date().toLocaleString()],
    [''],
    ['Optimization Settings'],
    ['Mode:', settings.mode === 'sites' ? 'Fixed Sites' : settings.mode === 'distance' ? 'Distance Coverage' : 'Cost Optimization'],
    ['Number of Sites:', settings.numDCs],
    ['Max Radius (km):', settings.maxRadius],
    ['Demand Coverage (%):', settings.demandPercentage],
    ['Site Capacity:', `${settings.dcCapacity} ${settings.capacityUnit}`],
    [''],
    ['Results Summary'],
    ['Total Customers:', customers.length],
    ['Total Products:', products.length],
    ['Distribution Centers:', dcs.length],
  ];

  if (costBreakdown) {
    summaryData.push(
      [''],
      ['Cost Breakdown'],
      ['Total Cost:', `$${costBreakdown.totalCost.toLocaleString()}`],
      ['Transportation Cost:', `$${costBreakdown.transportationCost.toLocaleString()}`],
      ['Facility Cost:', `$${costBreakdown.facilityCost.toLocaleString()}`],
      ['Number of Sites:', costBreakdown.numSites]
    );
  }

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Customer Data Sheet
  const customerData = [
    ['Customer Name', 'Product', 'City', 'Country', 'Latitude', 'Longitude', 'Demand', 'Unit', 'Assigned DC']
  ];

  customers.forEach(customer => {
    const assignedDC = dcs.findIndex(dc => 
      dc.assignedCustomers.some(c => c.id === customer.id)
    );
    customerData.push([
      customer.name,
      customer.product,
      customer.city,
      customer.country,
      customer.latitude.toString(),
      customer.longitude.toString(),
      customer.demand.toString(),
      customer.unitOfMeasure,
      assignedDC >= 0 ? `DC ${assignedDC + 1}` : 'Not Assigned'
    ]);
  });

  const customerSheet = XLSX.utils.aoa_to_sheet(customerData);
  XLSX.utils.book_append_sheet(workbook, customerSheet, 'Customers');

  // Distribution Centers Sheet
  if (dcs.length > 0) {
    const dcData = [
      ['DC ID', 'Latitude', 'Longitude', 'Total Demand', 'Number of Customers', 'Customer Names']
    ];

    dcs.forEach((dc, index) => {
      dcData.push([
        `DC ${index + 1}`,
        dc.latitude.toString(),
        dc.longitude.toString(),
        dc.totalDemand.toString(),
        dc.assignedCustomers.length.toString(),
        dc.assignedCustomers.map(c => c.name).join(', ')
      ]);
    });

    const dcSheet = XLSX.utils.aoa_to_sheet(dcData);
    XLSX.utils.book_append_sheet(workbook, dcSheet, 'Distribution Centers');
  }

  // Distance Analysis Sheet
  if (dcs.length > 0) {
    const distanceData = [
      ['Customer', 'Assigned DC', 'Distance (km)', 'Product', 'Demand', 'Unit']
    ];

    customers.forEach(customer => {
      const dcIndex = dcs.findIndex(dc => 
        dc.assignedCustomers.some(c => c.id === customer.id)
      );
      
      if (dcIndex >= 0) {
        const dc = dcs[dcIndex];
        const distance = haversineDistance(
          customer.latitude,
          customer.longitude,
          dc.latitude,
          dc.longitude
        );
        
        distanceData.push([
          customer.name,
          `DC ${dcIndex + 1}`,
          distance.toFixed(2),
          customer.product,
          customer.demand.toString(),
          customer.unitOfMeasure
        ]);
      }
    });

    const distanceSheet = XLSX.utils.aoa_to_sheet(distanceData);
    XLSX.utils.book_append_sheet(workbook, distanceSheet, 'Distance Analysis');
  }

  // Profitability Analysis Sheet
  const hasRevenue = products.some(p => p.sellingPrice);
  if (hasRevenue && dcs.length > 0) {
    const profitData = [
      ['Customer', 'Product', 'Demand', 'Unit', 'Revenue', 'Transport Cost', 'Profit', 'Margin %']
    ];

    customers.forEach(customer => {
      const product = products.find(p => p.name === customer.product);
      const revenue = product?.sellingPrice ? customer.demand * product.sellingPrice : 0;
      
      let transportCost = 0;
      const assignedDC = dcs.find(dc => 
        dc.assignedCustomers.some(c => c.id === customer.id)
      );
      
      if (assignedDC) {
        const distance = haversineDistance(
          customer.latitude,
          customer.longitude,
          assignedDC.latitude,
          assignedDC.longitude
        );
        const distanceInMiles = settings.distanceUnit === 'km' ? distance * 0.621371 : distance;
        transportCost = distanceInMiles * customer.demand * settings.transportationCostPerMilePerUnit;
      }
      
      const profit = revenue - transportCost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      
      profitData.push([
        customer.name,
        customer.product,
        customer.demand.toString(),
        customer.unitOfMeasure,
        revenue.toFixed(2),
        transportCost.toFixed(2),
        profit.toFixed(2),
        margin.toFixed(2)
      ]);
    });

    const profitSheet = XLSX.utils.aoa_to_sheet(profitData);
    XLSX.utils.book_append_sheet(workbook, profitSheet, 'Profitability');
  }

  // Product Data Sheet
  if (products.length > 0) {
    const productData = [
      ['Product Name', 'Base Unit', 'Selling Price', 'Unit Conversions']
    ];

    products.forEach(product => {
      const conversions = product.unitConversions
        .map(c => `1 ${c.fromUnit} = ${c.factor} ${c.toUnit}`)
        .join('; ');
      
      productData.push([
        product.name,
        product.baseUnit,
        product.sellingPrice ? product.sellingPrice.toString() : 'Not set',
        conversions || 'None'
      ]);
    });

    const productSheet = XLSX.utils.aoa_to_sheet(productData);
    XLSX.utils.book_append_sheet(workbook, productSheet, 'Products');
  }

  // Generate and download file
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `GFA_Report_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
