import ExcelJS from "exceljs";
import fs from "fs";

const SIGNIFICANT_CHANGE_THRESHOLD = 0;

// Helper function to add a chart with proper spacing
function addChartToSheet(sheet, chartId, startRow) {
  // Add the chart with fixed height
  sheet.addImage(chartId, {
    tl: { col: 0, row: startRow },
    br: { col: 8, row: startRow + 15 },
  });

  // Add empty rows after the chart to ensure proper spacing
  for (let i = 0; i < 5; i++) {
    sheet.addRow([]);
  }

  // Return the new current row (after chart + spacing)
  return startRow + 16;
}

// Helper function to add a section title
function addSectionTitle(sheet, title, rowIndex) {
  const row = sheet.addRow([title]);
  row.font = { bold: true, size: 14 };
  row.height = 24;
  sheet.mergeCells(`A${rowIndex}:H${rowIndex}`);
  const cell = sheet.getCell(`A${rowIndex}`);
  cell.alignment = { horizontal: "left", vertical: "middle" };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "D9E1F2" },
  };
  return rowIndex + 1;
}

// Helper function to add space between sections
function addSectionSeparator(sheet, rowCount = 2) {
  for (let i = 0; i < rowCount; i++) {
    sheet.addRow([]);
  }
  return sheet.rowCount + 1;
}

// Helper function to format table headers
function formatTableHeaders(sheet, row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "4472C4" },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
}

// Helper function to format table rows
function formatTableRows(sheet, startRow, endRow) {
  for (let i = startRow; i <= endRow; i++) {
    const row = sheet.getRow(i);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      // Add alternating row colors
      if (i % 2 === 0) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F2F2F2" },
        };
      }
    });
  }
}

// Create Excel report
export async function createExcelReport(data, chartPaths) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Energy Consumption Report Generator";
  workbook.created = new Date();

  // Create Day Comparison Sheet with improved heading
  const dayComparisonSheet = workbook.addWorksheet("Daily Comparison");
  dayComparisonSheet.properties.defaultRowHeight = 20;

  // Add title
  dayComparisonSheet.mergeCells("A1:H1");
  const dayTitleCell = dayComparisonSheet.getCell("A1");
  dayTitleCell.value = "Daily Energy Consumption Report";
  dayTitleCell.font = { size: 16, bold: true, color: { argb: "000000" } };
  dayTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  dayTitleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "B4C6E7" },
  };
  dayComparisonSheet.getRow(1).height = 30;

  // Add date information with clearer wording
  dayComparisonSheet.mergeCells("A2:H2");
  const dayDateCell = dayComparisonSheet.getCell("A2");
  dayDateCell.value = `Comparing ${data.dates.yesterday} with ${data.dates.dayBeforeYesterday}`;
  dayDateCell.font = { size: 12, italic: true };
  dayDateCell.alignment = { horizontal: "center", vertical: "middle" };
  dayComparisonSheet.getRow(2).height = 24;

  // Add space between sections
  let currentRow = addSectionSeparator(dayComparisonSheet);

  // Add total consumption summary with clearer title
  currentRow = addSectionTitle(
    dayComparisonSheet,
    "Daily Energy Consumption Summary",
    currentRow
  );

  // Add header row with clearer headers
  const totalHeaderRow = dayComparisonSheet.addRow([
    "Date",
    "Consumption",
    "Change",
    "Comparison Period",
  ]);
  formatTableHeaders(dayComparisonSheet, totalHeaderRow);
  currentRow++;

  // Yesterday vs Day Before with clearer labels
  const dayRow = dayComparisonSheet.addRow([
    data.dates.yesterday,
    data.totals.yesterdayConsumption.toFixed(2) + " kWh",
    data.totals.dayOnDayChange.toFixed(2) + "%",
    `compared to ${data.dates.dayBeforeYesterday}`,
  ]);

  if (Math.abs(data.totals.dayOnDayChange) >= SIGNIFICANT_CHANGE_THRESHOLD) {
    dayRow.getCell(3).font = {
      color:
        data.totals.dayOnDayChange > 0
          ? { argb: "FF0000" }
          : { argb: "008000" },
      bold: true,
    };
  }

  formatTableRows(dayComparisonSheet, currentRow, currentRow);
  currentRow++;

  // Add space between sections
  currentRow = addSectionSeparator(dayComparisonSheet);

  // Add chart for total consumption
  const dayTotalChartId = workbook.addImage({
    filename: chartPaths.dayComparisonCharts.totalConsumptionChartPath,
    extension: "png",
  });

  currentRow = addChartToSheet(dayComparisonSheet, dayTotalChartId, currentRow);
  currentRow = addSectionSeparator(dayComparisonSheet, 3); // Add extra space after chart

  // Country consolidation table with clearer title
  currentRow = addSectionTitle(
    dayComparisonSheet,
    "Country Energy Consumption",
    currentRow
  );

  const countryHeaderRow = dayComparisonSheet.addRow([
    "Country",
    `${data.dates.yesterday} (kWh)`,
    `${data.dates.dayBeforeYesterday} (kWh)`,
    "Daily Change (%)",
  ]);
  formatTableHeaders(dayComparisonSheet, countryHeaderRow);
  currentRow++;

  const countryStartRow = currentRow;
  Object.keys(data.countryConsolidation).forEach((country) => {
    const countryData = data.countryConsolidation[country];
    const countryRow = dayComparisonSheet.addRow([
      country,
      countryData.yesterdayConsumption.toFixed(2),
      countryData.dayBeforeConsumption.toFixed(2),
      countryData.dayOnDayChange.toFixed(2) + "%",
    ]);

    if (countryData.hasSignificantDayChange) {
      countryRow.getCell(4).font = {
        color:
          countryData.dayOnDayChange > 0
            ? { argb: "FF0000" }
            : { argb: "008000" },
        bold: true,
      };
    }
    currentRow++;
  });

  formatTableRows(dayComparisonSheet, countryStartRow, currentRow - 1);

  // Add space between sections
  currentRow = addSectionSeparator(dayComparisonSheet);

  // State consolidation table with clearer title
  currentRow = addSectionTitle(
    dayComparisonSheet,
    "State Energy Consumption",
    currentRow
  );

  const stateHeaderRow = dayComparisonSheet.addRow([
    "Country",
    "State",
    `${data.dates.yesterday} (kWh)`,
    `${data.dates.dayBeforeYesterday} (kWh)`,
    "Daily Change (%)",
  ]);
  formatTableHeaders(dayComparisonSheet, stateHeaderRow);
  currentRow++;

  const stateStartRow = currentRow;
  data.stateConsolidation.forEach((stateData) => {
    const stateRow = dayComparisonSheet.addRow([
      stateData.country,
      stateData.state,
      stateData.yesterdayConsumption.toFixed(2),
      stateData.dayBeforeConsumption.toFixed(2),
      stateData.dayOnDayChange.toFixed(2) + "%",
    ]);

    if (stateData.hasSignificantDayChange) {
      stateRow.getCell(5).font = {
        color:
          stateData.dayOnDayChange > 0
            ? { argb: "FF0000" }
            : { argb: "008000" },
        bold: true,
      };
    }
    currentRow++;
  });

  formatTableRows(dayComparisonSheet, stateStartRow, currentRow - 1);

  // Add space between sections
  currentRow = addSectionSeparator(dayComparisonSheet);

  // Add chart for state consumption
  const dayStateChartId = workbook.addImage({
    filename: chartPaths.dayComparisonCharts.stateConsumptionChartPath,
    extension: "png",
  });

  currentRow = addChartToSheet(dayComparisonSheet, dayStateChartId, currentRow);
  currentRow = addSectionSeparator(dayComparisonSheet, 3); // Add extra space after chart

  // Top 10 stores by energy intensity with clearer title
  currentRow = addSectionTitle(
    dayComparisonSheet,
    "Top 10 Stores by Energy Intensity",
    currentRow
  );

  const intensityHeaderRow = dayComparisonSheet.addRow([
    "Store Name",
    "Area (sqm)",
    `${data.dates.yesterday} Usage (kWh)`,
    "Energy Intensity (kWh/sqm)",
  ]);
  formatTableHeaders(dayComparisonSheet, intensityHeaderRow);
  currentRow++;

  const intensityStartRow = currentRow;
  data.topIntensityStores.forEach((store) => {
    dayComparisonSheet.addRow([
      store.siteName,
      store.area,
      store.yesterdayConsumption.toFixed(2),
      store.yesterdayIntensity.toFixed(4),
    ]);
    currentRow++;
  });

  formatTableRows(dayComparisonSheet, intensityStartRow, currentRow - 1);

  // Add space between sections
  currentRow = addSectionSeparator(dayComparisonSheet);

  // Add chart for top intensity
  const topIntensityChartId = workbook.addImage({
    filename: chartPaths.dayComparisonCharts.topIntensityChartPath,
    extension: "png",
  });

  currentRow = addChartToSheet(
    dayComparisonSheet,
    topIntensityChartId,
    currentRow
  );
  currentRow = addSectionSeparator(dayComparisonSheet, 3); // Add extra space after chart

  // Top 10 stores with highest negative deviation with clearer title
  currentRow = addSectionTitle(
    dayComparisonSheet,
    "Top 10 Stores with Highest Consumption Decrease",
    currentRow
  );

  const negDevHeaderRow = dayComparisonSheet.addRow([
    "Store Name",
    `${data.dates.yesterday} (kWh)`,
    `${data.dates.dayBeforeYesterday} (kWh)`,
    "Daily Change (%)",
  ]);
  formatTableHeaders(dayComparisonSheet, negDevHeaderRow);
  currentRow++;

  const negDevStartRow = currentRow;
  data.topNegativeDayDeviationStores.forEach((store) => {
    const storeRow = dayComparisonSheet.addRow([
      store.siteName,
      store.yesterdayConsumption.toFixed(2),
      store.dayBeforeConsumption.toFixed(2),
      store.dayOnDayChange.toFixed(2) + "%",
    ]);
    storeRow.getCell(4).font = { color: { argb: "008000" }, bold: true };
    currentRow++;
  });

  formatTableRows(dayComparisonSheet, negDevStartRow, currentRow - 1);

  // Add space between sections
  currentRow = addSectionSeparator(dayComparisonSheet);

  // Add chart for negative deviation
  const topNegativeDeviationChartId = workbook.addImage({
    filename: chartPaths.dayComparisonCharts.topNegativeDeviationChartPath,
    extension: "png",
  });

  currentRow = addChartToSheet(
    dayComparisonSheet,
    topNegativeDeviationChartId,
    currentRow
  );
  currentRow = addSectionSeparator(dayComparisonSheet, 3); // Add extra space after chart

  // Create Week Comparison Sheet with improved heading
  const weekComparisonSheet = workbook.addWorksheet("Weekly Comparison");
  weekComparisonSheet.properties.defaultRowHeight = 20;

  // Add title with clearer wording
  weekComparisonSheet.mergeCells("A1:H1");
  const weekTitleCell = weekComparisonSheet.getCell("A1");
  weekTitleCell.value = "Weekly Energy Consumption Report";
  weekTitleCell.font = { size: 16, bold: true, color: { argb: "000000" } };
  weekTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  weekTitleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "B4C6E7" },
  };
  weekComparisonSheet.getRow(1).height = 30;

  // Add date information with clearer wording
  weekComparisonSheet.mergeCells("A2:H2");
  const weekDateCell = weekComparisonSheet.getCell("A2");
  weekDateCell.value = `Comparing ${data.dates.yesterday} with ${data.dates.lastWeekSameDay}`;
  weekDateCell.font = { size: 12, italic: true };
  weekDateCell.alignment = { horizontal: "center", vertical: "middle" };
  weekComparisonSheet.getRow(2).height = 24;

  // Add space between sections
  currentRow = addSectionSeparator(weekComparisonSheet);

  // Add total consumption summary with clearer title
  currentRow = addSectionTitle(
    weekComparisonSheet,
    "Weekly Energy Consumption Summary",
    currentRow
  );

  // Add header row with clearer headers
  const weekTotalHeaderRow = weekComparisonSheet.addRow([
    "Date",
    "Consumption",
    "Change",
    "Comparison Period",
  ]);
  formatTableHeaders(weekComparisonSheet, weekTotalHeaderRow);
  currentRow++;

  // Yesterday vs Last Week with clearer labels
  const weekRow = weekComparisonSheet.addRow([
    data.dates.yesterday,
    data.totals.yesterdayConsumption.toFixed(2) + " kWh",
    data.totals.weekOnWeekChange.toFixed(2) + "%",
    `compared to ${data.dates.lastWeekSameDay}`,
  ]);

  if (Math.abs(data.totals.weekOnWeekChange) >= SIGNIFICANT_CHANGE_THRESHOLD) {
    weekRow.getCell(3).font = {
      color:
        data.totals.weekOnWeekChange > 0
          ? { argb: "FF0000" }
          : { argb: "008000" },
      bold: true,
    };
  }

  formatTableRows(weekComparisonSheet, currentRow, currentRow);
  currentRow++;

  // Add space between sections
  currentRow = addSectionSeparator(weekComparisonSheet);

  // Add chart for total consumption
  const weekTotalChartId = workbook.addImage({
    filename: chartPaths.weekComparisonCharts.totalConsumptionChartPath,
    extension: "png",
  });

  currentRow = addChartToSheet(
    weekComparisonSheet,
    weekTotalChartId,
    currentRow
  );
  currentRow = addSectionSeparator(weekComparisonSheet, 3); // Add extra space after chart

  // Country consolidation table with clearer title
  currentRow = addSectionTitle(
    weekComparisonSheet,
    "Country Energy Consumption",
    currentRow
  );

  const weekCountryHeaderRow = weekComparisonSheet.addRow([
    "Country",
    `${data.dates.yesterday} (kWh)`,
    `${data.dates.lastWeekSameDay} (kWh)`,
    "Weekly Change (%)",
  ]);
  formatTableHeaders(weekComparisonSheet, weekCountryHeaderRow);
  currentRow++;

  const weekCountryStartRow = currentRow;
  Object.keys(data.countryConsolidation).forEach((country) => {
    const countryData = data.countryConsolidation[country];
    const countryRow = weekComparisonSheet.addRow([
      country,
      countryData.yesterdayConsumption.toFixed(2),
      countryData.lastWeekConsumption.toFixed(2),
      countryData.weekOnWeekChange.toFixed(2) + "%",
    ]);

    if (countryData.hasSignificantWeekChange) {
      countryRow.getCell(4).font = {
        color:
          countryData.weekOnWeekChange > 0
            ? { argb: "FF0000" }
            : { argb: "008000" },
        bold: true,
      };
    }
    currentRow++;
  });

  formatTableRows(weekComparisonSheet, weekCountryStartRow, currentRow - 1);

  // Add space between sections
  currentRow = addSectionSeparator(weekComparisonSheet);

  // State consolidation table with clearer title
  currentRow = addSectionTitle(
    weekComparisonSheet,
    "State Energy Consumption",
    currentRow
  );

  const weekStateHeaderRow = weekComparisonSheet.addRow([
    "Country",
    "State",
    `${data.dates.yesterday} (kWh)`,
    `${data.dates.lastWeekSameDay} (kWh)`,
    "Weekly Change (%)",
  ]);
  formatTableHeaders(weekComparisonSheet, weekStateHeaderRow);
  currentRow++;

  const weekStateStartRow = currentRow;
  data.stateConsolidation.forEach((stateData) => {
    const stateRow = weekComparisonSheet.addRow([
      stateData.country,
      stateData.state,
      stateData.yesterdayConsumption.toFixed(2),
      stateData.lastWeekConsumption.toFixed(2),
      stateData.weekOnWeekChange.toFixed(2) + "%",
    ]);

    if (stateData.hasSignificantWeekChange) {
      stateRow.getCell(5).font = {
        color:
          stateData.weekOnWeekChange > 0
            ? { argb: "FF0000" }
            : { argb: "008000" },
        bold: true,
      };
    }
    currentRow++;
  });

  formatTableRows(weekComparisonSheet, weekStateStartRow, currentRow - 1);

  // Add space between sections
  currentRow = addSectionSeparator(weekComparisonSheet);

  // Add chart for state consumption
  const weekStateChartId = workbook.addImage({
    filename: chartPaths.weekComparisonCharts.stateConsumptionChartPath,
    extension: "png",
  });

  currentRow = addChartToSheet(
    weekComparisonSheet,
    weekStateChartId,
    currentRow
  );
  currentRow = addSectionSeparator(weekComparisonSheet, 3); // Add extra space after chart

  // Top 10 stores by energy intensity with clearer title
  currentRow = addSectionTitle(
    weekComparisonSheet,
    "Top 10 Stores by Energy Intensity",
    currentRow
  );

  const weekIntensityHeaderRow = weekComparisonSheet.addRow([
    "Store Name",
    "Area (sqm)",
    `${data.dates.yesterday} Usage (kWh)`,
    "Energy Intensity (kWh/sqm)",
  ]);
  formatTableHeaders(weekComparisonSheet, weekIntensityHeaderRow);
  currentRow++;

  const weekIntensityStartRow = currentRow;
  data.topIntensityStores.forEach((store) => {
    weekComparisonSheet.addRow([
      store.siteName,
      store.area,
      store.yesterdayConsumption.toFixed(2),
      store.yesterdayIntensity.toFixed(4),
    ]);
    currentRow++;
  });

  formatTableRows(weekComparisonSheet, weekIntensityStartRow, currentRow - 1);

  // Add space between sections
  currentRow = addSectionSeparator(weekComparisonSheet);

  // Add chart for top intensity
  const weekTopIntensityChartId = workbook.addImage({
    filename: chartPaths.weekComparisonCharts.topIntensityChartPath,
    extension: "png",
  });

  currentRow = addChartToSheet(
    weekComparisonSheet,
    weekTopIntensityChartId,
    currentRow
  );
  currentRow = addSectionSeparator(weekComparisonSheet, 3); // Add extra space after chart

  // Top 10 stores with highest negative week-on-week deviation with clearer title
  currentRow = addSectionTitle(
    weekComparisonSheet,
    "Top 10 Stores with Highest Consumption Decrease",
    currentRow
  );

  const weekNegDevHeaderRow = weekComparisonSheet.addRow([
    "Store Name",
    `${data.dates.yesterday} (kWh)`,
    `${data.dates.lastWeekSameDay} (kWh)`,
    "Weekly Change (%)",
  ]);
  formatTableHeaders(weekComparisonSheet, weekNegDevHeaderRow);
  currentRow++;

  const weekNegDevStartRow = currentRow;
  data.topNegativeWeekDeviationStores.forEach((store) => {
    const storeRow = weekComparisonSheet.addRow([
      store.siteName,
      store.yesterdayConsumption.toFixed(2),
      store.lastWeekConsumption.toFixed(2),
      store.weekOnWeekChange.toFixed(2) + "%",
    ]);
    storeRow.getCell(4).font = { color: { argb: "008000" }, bold: true };
    currentRow++;
  });

  formatTableRows(weekComparisonSheet, weekNegDevStartRow, currentRow - 1);

  // Add space between sections
  currentRow = addSectionSeparator(weekComparisonSheet);

  // Add chart for negative deviation
  const weekTopNegativeDeviationChartId = workbook.addImage({
    filename: chartPaths.weekComparisonCharts.topNegativeDeviationChartPath,
    extension: "png",
  });

  currentRow = addChartToSheet(
    weekComparisonSheet,
    weekTopNegativeDeviationChartId,
    currentRow
  );
  currentRow = addSectionSeparator(weekComparisonSheet, 3); // Add extra space after chart

  // Store details sheet with accurate column names
  const storeSheet = workbook.addWorksheet("Store Details");

  // Define columns with proper data types and accurate names
  storeSheet.columns = [
    { header: "Store Name", key: "storeName", width: 40 },
    { header: "Country", key: "country", width: 26 },
    { header: "State", key: "state", width: 26 },
    {
      header: "Area (sqm)",
      key: "area",
      width: 26,
      style: { numFmt: "0.00" },
    },
    {
      header: `Yesterday (${data.dates.yesterday})`,
      key: "yesterday",
      width: 26,
      style: { numFmt: "0.00" },
    },
    {
      header: `Day Before (${data.dates.dayBeforeYesterday})`,
      key: "dayBefore",
      width: 26,
      style: { numFmt: "0.00" },
    },
    {
      header: "Yesterday Intensity",
      key: "yesterdayIntensity",
      width: 26,
      style: { numFmt: "0.00" },
    },
    {
      header: "Day Before Intensity",
      key: "dayBeforeIntensity",
      width: 26,
      style: { numFmt: "0.00" },
    },
    {
      header: "Daily Change (%)",
      key: "dayChange",
      width: 26,
      style: { numFmt: "0.00" },
    },
    {
      header: `Last Week (${data.dates.lastWeekSameDay})`,
      key: "lastWeek",
      width: 26,
      style: { numFmt: "0.00" },
    },
    {
      header: "Weekly Change (%)",
      key: "weekChange",
      width: 26,
      style: { numFmt: "0.00" },
    },
  ];

  // Format the header row
  formatTableHeaders(storeSheet, storeSheet.getRow(1));

  // Sort storeDetails by Store Name alphabetically
  data.storeDetails.sort((a, b) => {
    const areaA = parseFloat(a["Area (sqm)"]) || 0;
    const areaB = parseFloat(b["Area (sqm)"]) || 0;
    return areaB - areaA;
  });

  // Add store data with proper data types for sorting
  data.storeDetails.forEach((store) => {
    const dayChange = parseFloat(store["Day Change %"]);
    const weekChange = parseFloat(store["Week Change %"]);
    const area = parseFloat(store["Area (sqm)"]);
    const yesterdayConsumption = parseFloat(store["Yesterday Consumption"]);
    const dayBeforeConsumption = parseFloat(store["Day Before Consumption"]);
    const lastWeekConsumption = parseFloat(store["Last Week Consumption"]);

    // Calculate intensities
    const yesterdayIntensity = area > 0 ? yesterdayConsumption / area : 0;
    const dayBeforeIntensity = area > 0 ? dayBeforeConsumption / area : 0;

    const row = storeSheet.addRow({
      storeName: store["Store Name"],
      country: store["Country"],
      state: store["State"],
      area: area,
      yesterday: yesterdayConsumption,
      dayBefore: dayBeforeConsumption,
      yesterdayIntensity: yesterdayIntensity,
      dayBeforeIntensity: dayBeforeIntensity,
      dayChange: dayChange,
      lastWeek: lastWeekConsumption,
      weekChange: weekChange,
    });

    // Highlight significant changes
    if (Math.abs(dayChange) >= SIGNIFICANT_CHANGE_THRESHOLD) {
      row.getCell("dayChange").font = {
        color: dayChange > 0 ? { argb: "FF0000" } : { argb: "008000" },
        bold: true,
      };
    }

    if (Math.abs(weekChange) >= SIGNIFICANT_CHANGE_THRESHOLD) {
      row.getCell("weekChange").font = {
        color: weekChange > 0 ? { argb: "FF0000" } : { argb: "008000" },
        bold: true,
      };
    }

    // Highlight high intensity values
    if (yesterdayIntensity > 0.5) {
      // Arbitrary threshold, adjust as needed
      row.getCell("yesterdayIntensity").font = {
        color: { argb: "FF0000" },
        bold: true,
      };
    }

    if (dayBeforeIntensity > 0.5) {
      // Arbitrary threshold, adjust as needed
      row.getCell("dayBeforeIntensity").font = {
        color: { argb: "FF0000" },
        bold: true,
      };
    }
  });

  // Format all data rows
  formatTableRows(storeSheet, 2, storeSheet.rowCount);

  // // Apply autoFilter to all columns - this enables Excel's built-in filtering
  // storeSheet.autoFilter = {
  //   from: { row: 1, column: 1 },
  //   to: { row: 1, column: storeSheet.columns.length },
  // };

  // Add conditional formatting to highlight high intensity values
  storeSheet.addConditionalFormatting({
    ref: `G2:H${storeSheet.rowCount}`,
    rules: [
      {
        type: "colorScale",
        cfvo: [
          { type: "min" },
          { type: "percentile", value: 50 },
          { type: "max" },
        ],
        color: [
          { argb: "63BE7B" }, // Green
          { argb: "FFEB84" }, // Yellow
          { argb: "F8696B" }, // Red
        ],
      },
    ],
  });

  // Adjust column widths
  dayComparisonSheet.columns.forEach((column, idx) => {
    if (idx == 3) {
      column.width = 40;
    } else {
      column.width = 30;
    }
  });

  weekComparisonSheet.columns.forEach((column, idx) => {
    if (idx == 3) {
      column.width = 40;
    } else {
      column.width = 30;
    }
  });

  // Generate Excel buffer instead of saving to file
  const buffer = await workbook.xlsx.writeBuffer();

  // Clean up chart files
  try {
    // Day comparison charts
    fs.unlinkSync(chartPaths.dayComparisonCharts.totalConsumptionChartPath);
    fs.unlinkSync(chartPaths.dayComparisonCharts.stateConsumptionChartPath);
    fs.unlinkSync(chartPaths.dayComparisonCharts.topIntensityChartPath);
    fs.unlinkSync(chartPaths.dayComparisonCharts.topNegativeDeviationChartPath);

    // Week comparison charts
    fs.unlinkSync(chartPaths.weekComparisonCharts.totalConsumptionChartPath);
    fs.unlinkSync(chartPaths.weekComparisonCharts.stateConsumptionChartPath);
    fs.unlinkSync(
      chartPaths.weekComparisonCharts.topNegativeDeviationChartPath
    );
  } catch (error) {
    console.error("Error cleaning up chart files:", error);
  }

  console.log("Excel buffer generated successfully");
  return buffer;
}
