import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import fs from "fs";

// Generate charts
export async function generateCharts(data) {
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 800, height: 250 });

  // Day comparison charts
  const dayComparisonCharts = {};

  // Total consumption comparison chart (day)
  const totalConsumptionDayChartConfig = {
    type: "bar",
    data: {
      labels: ["Yesterday", "Day Before Yesterday"],
      datasets: [
        {
          label: "Total Energy Consumption (kWh)",
          data: [
            data.totals.yesterdayConsumption,
            data.totals.dayBeforeConsumption,
          ],
          backgroundColor: [
            "rgba(54, 162, 235, 0.6)",
            "rgba(255, 206, 86, 0.6)",
          ],
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Total Energy Consumption Comparison",
          font: {
            size: 16,
            weight: "bold",
          },
        },
        legend: {
          display: true,
          position: "top",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Energy Consumption (kWh)",
          },
        },
        x: {
          title: {
            display: true,
            text: "Date",
          },
        },
      },
    },
  };

  // State consumption chart (day)
  const stateLabels = data.stateConsolidation.map((item) => item.state);
  const stateYesterdayData = data.stateConsolidation.map(
    (item) => item.yesterdayConsumption
  );
  const stateDayBeforeData = data.stateConsolidation.map(
    (item) => item.dayBeforeConsumption
  );

  const stateConsumptionDayChartConfig = {
    type: "bar",
    data: {
      labels: stateLabels,
      datasets: [
        {
          label: "Yesterday",
          data: stateYesterdayData,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
        },
        {
          label: "Day Before Yesterday",
          data: stateDayBeforeData,
          backgroundColor: "rgba(255, 206, 86, 0.6)",
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Energy Consumption by State",
          font: {
            size: 16,
            weight: "bold",
          },
        },
        legend: {
          display: true,
          position: "top",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Energy Consumption (kWh)",
          },
        },
        x: {
          title: {
            display: true,
            text: "State",
          },
        },
      },
    },
  };

  // Top 10 stores by energy intensity chart
  const topIntensityChartConfig = {
    type: "bar",
    data: {
      labels: data.topIntensityStores.map(
        (store) => store.siteName.substring(0, 15) + "..."
      ),
      datasets: [
        {
          label: "Energy Intensity (kWh/sqm)",
          data: data.topIntensityStores.map((store) =>
            store.yesterdayIntensity.toFixed(4)
          ),
          backgroundColor: "rgba(153, 102, 255, 0.6)",
        },
      ],
    },
    options: {
      indexAxis: "y",
      plugins: {
        title: {
          display: true,
          text: "Top 10 Stores by Energy Intensity",
          font: {
            size: 16,
            weight: "bold",
          },
        },
        legend: {
          display: true,
          position: "top",
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Energy Intensity (kWh/sqm)",
          },
        },
        y: {
          title: {
            display: true,
            text: "Store",
          },
        },
      },
    },
  };

  // Top 10 stores with highest negative day-on-day deviation
  const topNegativeDayDeviationChartConfig = {
    type: "bar",
    data: {
      labels: data.topNegativeDayDeviationStores.map(
        (store) => store.siteName.substring(0, 15) + "..."
      ),
      datasets: [
        {
          label: "Decrease (%)",
          data: data.topNegativeDayDeviationStores.map((store) =>
            Math.abs(store.dayOnDayChange).toFixed(2)
          ),
          backgroundColor: "rgba(75, 192, 192, 0.6)",
        },
      ],
    },
    options: {
      indexAxis: "y",
      plugins: {
        title: {
          display: true,
          text: "Top 10 Stores with Highest Consumption Decrease",
          font: {
            size: 16,
            weight: "bold",
          },
        },
        legend: {
          display: true,
          position: "top",
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Decrease (%)",
          },
        },
        y: {
          title: {
            display: true,
            text: "Store",
          },
        },
      },
    },
  };

  // Week comparison charts
  const weekComparisonCharts = {};

  // Total consumption comparison chart (week)
  const totalConsumptionWeekChartConfig = {
    type: "bar",
    data: {
      labels: ["Yesterday", "Same Day Last Week"],
      datasets: [
        {
          label: "Total Energy Consumption (kWh)",
          data: [
            data.totals.yesterdayConsumption,
            data.totals.lastWeekConsumption,
          ],
          backgroundColor: [
            "rgba(54, 162, 235, 0.6)",
            "rgba(75, 192, 192, 0.6)",
          ],
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Total Energy Consumption Comparison",
          font: {
            size: 16,
            weight: "bold",
          },
        },
        legend: {
          display: true,
          position: "top",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Energy Consumption (kWh)",
          },
        },
        x: {
          title: {
            display: true,
            text: "Date",
          },
        },
      },
    },
  };

  // State consumption chart (week)
  const stateLastWeekData = data.stateConsolidation.map(
    (item) => item.lastWeekConsumption
  );

  const stateConsumptionWeekChartConfig = {
    type: "bar",
    data: {
      labels: stateLabels,
      datasets: [
        {
          label: "Yesterday",
          data: stateYesterdayData,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
        },
        {
          label: "Same Day Last Week",
          data: stateLastWeekData,
          backgroundColor: "rgba(75, 192, 192, 0.6)",
        },
      ],
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: "Energy Consumption by State",
          font: {
            size: 16,
            weight: "bold",
          },
        },
        legend: {
          display: true,
          position: "top",
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Energy Consumption (kWh)",
          },
        },
        x: {
          title: {
            display: true,
            text: "State",
          },
        },
      },
    },
  };

  // Top 10 stores with highest negative week-on-week deviation
  const topNegativeWeekDeviationChartConfig = {
    type: "bar",
    data: {
      labels: data.topNegativeWeekDeviationStores.map(
        (store) => store.siteName.substring(0, 15) + "..."
      ),
      datasets: [
        {
          label: "Decrease (%)",
          data: data.topNegativeWeekDeviationStores.map((store) =>
            Math.abs(store.weekOnWeekChange).toFixed(2)
          ),
          backgroundColor: "rgba(75, 192, 192, 0.6)",
        },
      ],
    },
    options: {
      indexAxis: "y",
      plugins: {
        title: {
          display: true,
          text: "Top 10 Stores with Highest Consumption Decrease",
          font: {
            size: 16,
            weight: "bold",
          },
        },
        legend: {
          display: true,
          position: "top",
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Decrease (%)",
          },
        },
        y: {
          title: {
            display: true,
            text: "Store",
          },
        },
      },
    },
  };

  // Generate chart images for day comparison
  dayComparisonCharts.totalConsumption = await chartJSNodeCanvas.renderToBuffer(
    totalConsumptionDayChartConfig
  );
  dayComparisonCharts.stateConsumption = await chartJSNodeCanvas.renderToBuffer(
    stateConsumptionDayChartConfig
  );
  dayComparisonCharts.topIntensity = await chartJSNodeCanvas.renderToBuffer(
    topIntensityChartConfig
  );
  dayComparisonCharts.topNegativeDeviation =
    await chartJSNodeCanvas.renderToBuffer(topNegativeDayDeviationChartConfig);

  // Generate chart images for week comparison
  weekComparisonCharts.totalConsumption =
    await chartJSNodeCanvas.renderToBuffer(totalConsumptionWeekChartConfig);
  weekComparisonCharts.stateConsumption =
    await chartJSNodeCanvas.renderToBuffer(stateConsumptionWeekChartConfig);
  weekComparisonCharts.topIntensity = await chartJSNodeCanvas.renderToBuffer(
    topIntensityChartConfig
  ); // Same intensity chart for both tabs
  weekComparisonCharts.topNegativeDeviation =
    await chartJSNodeCanvas.renderToBuffer(topNegativeWeekDeviationChartConfig);

  // Save chart images
  // Day comparison charts
  fs.writeFileSync(
    "day-total-consumption-chart.png",
    dayComparisonCharts.totalConsumption
  );
  fs.writeFileSync(
    "day-state-consumption-chart.png",
    dayComparisonCharts.stateConsumption
  );
  fs.writeFileSync("top-intensity-chart.png", dayComparisonCharts.topIntensity);
  fs.writeFileSync(
    "day-top-negative-deviation-chart.png",
    dayComparisonCharts.topNegativeDeviation
  );

  // Week comparison charts
  fs.writeFileSync(
    "week-total-consumption-chart.png",
    weekComparisonCharts.totalConsumption
  );
  fs.writeFileSync(
    "week-state-consumption-chart.png",
    weekComparisonCharts.stateConsumption
  );
  fs.writeFileSync(
    "week-top-negative-deviation-chart.png",
    weekComparisonCharts.topNegativeDeviation
  );

  return {
    dayComparisonCharts: {
      totalConsumptionChartPath: "day-total-consumption-chart.png",
      stateConsumptionChartPath: "day-state-consumption-chart.png",
      topIntensityChartPath: "top-intensity-chart.png",
      topNegativeDeviationChartPath: "day-top-negative-deviation-chart.png",
    },
    weekComparisonCharts: {
      totalConsumptionChartPath: "week-total-consumption-chart.png",
      stateConsumptionChartPath: "week-state-consumption-chart.png",
      topIntensityChartPath: "top-intensity-chart.png",
      topNegativeDeviationChartPath: "week-top-negative-deviation-chart.png",
    },
  };
}
