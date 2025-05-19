import ExcelJS from "exceljs";

export async function generateFullExcelReport(report1, report2, report3) {
  const workbook = new ExcelJS.Workbook();

  await generateSheet(
    workbook,
    report1,
    "Yesterday vs Last Week",
    "consumptionYesterday",
    "consumptionLastWeek",
    1,
    8
  );

  await generateSheet(
    workbook,
    report2,
    "Yesterday vs Day Before",
    "consumptionYesterday",
    "consumptionDayBefore",
    1,
    2
  );

  await generateStoreDetailsSheet(workbook, report3);

  return workbook.xlsx.writeBuffer();
}

function applyHeaderStyle(row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFB0C4DE" }, // LightSteelBlue
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
}

function applyDataRowStyle(row, index) {
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    if (index % 2 === 1) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9F9F9" }, // Very light gray
      };
    }
  });
}

async function generateStoreDetailsSheet(workbook, data) {
  const sheet = workbook.addWorksheet("Store Details");

  // Title Row
  sheet.addRow(["Store Details Report"]);
  const totalColumns = data.length > 0 ? Object.keys(data[0]).length : 3;
  sheet.mergeCells(1, 1, 1, totalColumns);
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A1").alignment = { horizontal: "center" };

  sheet.addRow([]);

  if (data.length === 0) {
    sheet.addRow(["No data available"]);
    return;
  }

  // Headers
  const headers = Object.keys(data[0]);
  const headerRow = sheet.addRow(headers);
  applyHeaderStyle(headerRow);

  // Data Rows
  data.forEach((row, index) => {
    const values = headers.map((key) => row[key]);
    const dataRow = sheet.addRow(values);
    applyDataRowStyle(dataRow, index);
  });

  // Auto-fit columns
  sheet.columns.forEach((col) => {
    let max = 15;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value?.toString().length || 0;
      max = Math.max(max, len + 2);
    });
    col.width = max;
  });
}

async function generateSheet(
  workbook,
  mergedData,
  sheetName,
  day1Key,
  day2Key,
  offset1,
  offset2
) {
  const sheet = workbook.addWorksheet(sheetName);
  const formatDate = (date) => date.toISOString().split("T")[0];

  const day1 = new Date();
  day1.setDate(day1.getDate() - offset1);
  const day2 = new Date();
  day2.setDate(day2.getDate() - offset2);

  const day1Str = formatDate(day1);
  const day2Str = formatDate(day2);

  let totalDay1 = 0;
  let totalDay2 = 0;

  for (const entry of mergedData) {
    totalDay1 += entry[day1Key] || 0;
    totalDay2 += entry[day2Key] || 0;
  }

  const percentChange =
    totalDay2 === 0
      ? totalDay1 === 0
        ? 0
        : 100
      : ((totalDay1 - totalDay2) / totalDay2) * 100;

  // Title Section
  sheet.addRow([]);
  sheet.addRow(["Energy Consumption Comparison Report"]);
  sheet.mergeCells(`A2:H2`);
  sheet.getCell("A2").font = { bold: true, size: 14 };
  sheet.getCell("A2").alignment = { horizontal: "center" };

  sheet.addRow([`Report for ${day1Str} vs ${day2Str}`]);
  sheet.mergeCells(`A3:H3`);
  sheet.getCell("A3").alignment = { horizontal: "center" };
  sheet.addRow([]);

  // Summary
  sheet.addRow(["Total Energy Consumption Summary"]);
  sheet.mergeCells("A5:D5");
  sheet.getRow(5).font = { bold: true };

  const summaryHeader = sheet.addRow([
    "Metric",
    "Value",
    "Change %",
    "Comparison",
  ]);
  applyHeaderStyle(summaryHeader);

  const summaryData = sheet.addRow([
    `${day1Str}`,
    `${totalDay1.toFixed(2)} kWh`,
    `${percentChange.toFixed(2)}%`,
    `compared to ${day2Str}`,
  ]);
  applyDataRowStyle(summaryData, 0);
  sheet.addRow([]);

  // Country Consolidation
  const countryMap = new Map();
  for (const entry of mergedData) {
    const key = entry.country || "Unknown";
    const d1 = entry[day1Key] || 0;
    const d2 = entry[day2Key] || 0;
    if (!countryMap.has(key)) countryMap.set(key, { d1: 0, d2: 0 });
    countryMap.get(key).d1 += d1;
    countryMap.get(key).d2 += d2;
  }

  sheet.addRow(["Country Consolidation"]);
  sheet.mergeCells(`A${sheet.lastRow.number + 1}:D${sheet.lastRow.number + 1}`);
  sheet.getRow(sheet.lastRow.number).font = { bold: true };

  const countryHeader = sheet.addRow([
    "Country",
    `${day1Str} (kWh)`,
    `${day2Str} (kWh)`,
    "Change %",
  ]);
  applyHeaderStyle(countryHeader);

  [...countryMap.entries()].slice(0, 5).forEach(([country, data], index) => {
    const change = data.d2 === 0 ? 0 : ((data.d1 - data.d2) / data.d2) * 100;
    const row = sheet.addRow([
      country,
      data.d1.toFixed(2),
      data.d2.toFixed(2),
      `${change.toFixed(2)}%`,
    ]);
    applyDataRowStyle(row, index);
  });

  sheet.addRow([]);

  // State Consolidation
  const stateMap = new Map();
  for (const entry of mergedData) {
    const country = entry.country || "Unknown";
    const state = entry.state || "Unknown";
    const key = `${country}|||${state}`;
    const d1 = entry[day1Key] || 0;
    const d2 = entry[day2Key] || 0;
    if (!stateMap.has(key)) stateMap.set(key, { d1: 0, d2: 0 });
    stateMap.get(key).d1 += d1;
    stateMap.get(key).d2 += d2;
  }

  sheet.addRow(["State Consolidation"]);
  sheet.mergeCells(`A${sheet.lastRow.number + 1}:E${sheet.lastRow.number + 1}`);
  sheet.getRow(sheet.lastRow.number).font = { bold: true };

  const stateHeader = sheet.addRow([
    "Country",
    "State",
    `${day1Str} (kWh)`,
    `${day2Str} (kWh)`,
    "Change %",
  ]);
  applyHeaderStyle(stateHeader);

  [...stateMap.entries()].slice(0, 5).forEach(([key, data], index) => {
    const [country, state] = key.split("|||");
    const change = data.d2 === 0 ? 0 : ((data.d1 - data.d2) / data.d2) * 100;
    const row = sheet.addRow([
      country,
      state,
      data.d1.toFixed(2),
      data.d2.toFixed(2),
      `${change.toFixed(2)}%`,
    ]);
    applyDataRowStyle(row, index);
  });

  sheet.addRow([]);

  // Top 10 Stores by Energy Intensity
  const intensityData = mergedData
    .filter((e) => e[day1Key])
    .map((e) => ({
      storeName: e.meterName,
      area: e.area || 0,
      consumption: e[day1Key],
      intensity: e.area > 0 ? e[day1Key] / e.area : 0,
    }))
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 10);

  sheet.addRow(["Top 10 Stores by Energy Intensity"]);
  sheet.mergeCells(`A${sheet.lastRow.number + 1}:D${sheet.lastRow.number + 1}`);
  sheet.getRow(sheet.lastRow.number).font = { bold: true };

  const intensityHeader = sheet.addRow([
    "Store Name",
    "Area (sqm)",
    "Consumption (kWh)",
    "Intensity (kWh/sqm)",
  ]);
  applyHeaderStyle(intensityHeader);

  intensityData.forEach((row, index) => {
    const dataRow = sheet.addRow([
      row.storeName,
      row.area,
      row.consumption.toFixed(2),
      row.intensity.toFixed(4),
    ]);
    applyDataRowStyle(dataRow, index);
  });

  sheet.addRow([]);

  // Top 10 Stores with Highest Consumption Decrease
  const dropData = mergedData
    .filter((e) => e[day2Key] > 0)
    .map((e) => {
      const drop = ((e[day1Key] - e[day2Key]) / e[day2Key]) * 100;
      return {
        storeName: e.meterName,
        d1: e[day1Key] || 0,
        d2: e[day2Key] || 0,
        drop,
      };
    })
    .sort((a, b) => a.drop - b.drop)
    .slice(0, 10);

  sheet.addRow(["Top 10 Stores with Highest Consumption Decrease"]);
  sheet.mergeCells(`A${sheet.lastRow.number + 1}:D${sheet.lastRow.number + 1}`);
  sheet.getRow(sheet.lastRow.number).font = { bold: true };

  const dropHeader = sheet.addRow([
    "Store Name",
    `${day1Str} (kWh)`,
    `${day2Str} (kWh)`,
    "Change (%)",
  ]);
  applyHeaderStyle(dropHeader);

  dropData.forEach((row, index) => {
    const dataRow = sheet.addRow([
      row.storeName,
      row.d1.toFixed(2),
      row.d2.toFixed(2),
      `${row.drop.toFixed(2)}%`,
    ]);
    applyDataRowStyle(dataRow, index);
  });

  // Auto-fit columns
  sheet.columns.forEach((col) => {
    let max = 15;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value?.toString().length || 0;
      max = Math.max(max, len + 2);
    });
    col.width = max;
  });
}
