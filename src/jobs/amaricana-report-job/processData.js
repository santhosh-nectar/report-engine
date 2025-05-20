import { formatDate } from "date-fns";
import { calculatePercentageChange } from "../../utils/util.calculatePercentage.js";
import { fetchMergedEnergyData } from "../../services/reports/americana.report.service.js";

// Configuration
const SIGNIFICANT_CHANGE_THRESHOLD = 0;

// Process data for reporting
export async function processData() {
  console.log("Fetching data from API...");
  const { report1, report2, report3 } = await fetchMergedEnergyData();

  // Get date information
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dayBeforeYesterday = new Date();
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
  const lastWeekSameDay = new Date();
  lastWeekSameDay.setDate(lastWeekSameDay.getDate() - 8);

  const yesterdayStr = formatDate(yesterday, "yyyy-MM-dd");
  const dayBeforeYesterdayStr = formatDate(dayBeforeYesterday, "yyyy-MM-dd");
  const lastWeekSameDayStr = formatDate(lastWeekSameDay, "yyyy-MM-dd");

  // Process store data
  const processedStores = report1.map((store) => {
    const matchingStore = report2.find((s) => s.meterId === store.meterId);

    const yesterdayConsumption = store.consumptionYesterday || 0;
    const lastWeekConsumption = store.consumptionLastWeek || 0;
    const dayBeforeConsumption = matchingStore
      ? matchingStore.consumptionDayBefore || 0
      : 0;

    const dayOnDayChange = calculatePercentageChange(
      yesterdayConsumption,
      dayBeforeConsumption
    );
    const weekOnWeekChange = calculatePercentageChange(
      yesterdayConsumption,
      lastWeekConsumption
    );

    const hasSignificantDayChange =
      Math.abs(dayOnDayChange) >= SIGNIFICANT_CHANGE_THRESHOLD;
    const hasSignificantWeekChange =
      Math.abs(weekOnWeekChange) >= SIGNIFICANT_CHANGE_THRESHOLD;

    // Calculate energy intensity (consumption per unit area)
    const area = store.area || 0; // Avoid division by zero

    const yesterdayIntensity = yesterdayConsumption / area;

    return {
      ...store,
      yesterdayConsumption,
      dayBeforeConsumption,
      lastWeekConsumption,
      dayOnDayChange,
      weekOnWeekChange,
      hasSignificantDayChange,
      hasSignificantWeekChange,
      yesterdayIntensity,
    };
  });

  // Create consolidations by country
  const countryConsolidation = {};

  processedStores.forEach((store) => {
    const country = store.country || "Unknown";

    if (!countryConsolidation[country]) {
      countryConsolidation[country] = {
        yesterdayConsumption: 0,
        dayBeforeConsumption: 0,
        lastWeekConsumption: 0,
      };
    }

    countryConsolidation[country].yesterdayConsumption +=
      store.yesterdayConsumption;
    countryConsolidation[country].dayBeforeConsumption +=
      store.dayBeforeConsumption;
    countryConsolidation[country].lastWeekConsumption +=
      store.lastWeekConsumption;
  });

  // Calculate changes for country consolidations
  Object.keys(countryConsolidation).forEach((country) => {
    const data = countryConsolidation[country];
    data.dayOnDayChange = calculatePercentageChange(
      data.yesterdayConsumption,
      data.dayBeforeConsumption
    );
    data.weekOnWeekChange = calculatePercentageChange(
      data.yesterdayConsumption,
      data.lastWeekConsumption
    );
    data.hasSignificantDayChange =
      Math.abs(data.dayOnDayChange) >= SIGNIFICANT_CHANGE_THRESHOLD;
    data.hasSignificantWeekChange =
      Math.abs(data.weekOnWeekChange) >= SIGNIFICANT_CHANGE_THRESHOLD;
  });

  // Create consolidations by state
  const stateConsolidation = {};

  processedStores.forEach((store) => {
    const country = store.country || "Unknown";
    const state = store.state || "Unknown";
    const key = `${country}-${state}`;

    if (!stateConsolidation[key]) {
      stateConsolidation[key] = {
        country,
        state,
        yesterdayConsumption: 0,
        dayBeforeConsumption: 0,
        lastWeekConsumption: 0,
      };
    }

    stateConsolidation[key].yesterdayConsumption += store.yesterdayConsumption;
    stateConsolidation[key].dayBeforeConsumption += store.dayBeforeConsumption;
    stateConsolidation[key].lastWeekConsumption += store.lastWeekConsumption;
  });

  // Calculate changes for state consolidations
  Object.keys(stateConsolidation).forEach((key) => {
    const data = stateConsolidation[key];
    data.dayOnDayChange = calculatePercentageChange(
      data.yesterdayConsumption,
      data.dayBeforeConsumption
    );
    data.weekOnWeekChange = calculatePercentageChange(
      data.yesterdayConsumption,
      data.lastWeekConsumption
    );
    data.hasSignificantDayChange =
      Math.abs(data.dayOnDayChange) >= SIGNIFICANT_CHANGE_THRESHOLD;
    data.hasSignificantWeekChange =
      Math.abs(data.weekOnWeekChange) >= SIGNIFICANT_CHANGE_THRESHOLD;
  });

  // Calculate totals
  const totalYesterdayConsumption = processedStores.reduce(
    (sum, store) => sum + store.yesterdayConsumption,
    0
  );
  const totalDayBeforeConsumption = processedStores.reduce(
    (sum, store) => sum + store.dayBeforeConsumption,
    0
  );
  const totalLastWeekConsumption = processedStores.reduce(
    (sum, store) => sum + store.lastWeekConsumption,
    0
  );

  const totalDayOnDayChange = calculatePercentageChange(
    totalYesterdayConsumption,
    totalDayBeforeConsumption
  );
  const totalWeekOnWeekChange = calculatePercentageChange(
    totalYesterdayConsumption,
    totalLastWeekConsumption
  );

  // Get top 10 stores by energy intensity
  const topIntensityStores = processedStores
    .filter((store) => store.area > 0 && isFinite(store.yesterdayIntensity))
    .sort((a, b) => b.yesterdayIntensity - a.yesterdayIntensity)
    .slice(0, 10);

  // Get top 10 stores with highest negative day-on-day deviation (decrease)
  const topNegativeDayDeviationStores = [...processedStores]
    .filter((store) => store.dayOnDayChange < 0)
    .sort((a, b) => a.dayOnDayChange - b.dayOnDayChange)
    .slice(0, 10);

  // Get top 10 stores with highest negative week-on-week deviation (decrease)
  const topNegativeWeekDeviationStores = [...processedStores]
    .filter((store) => store.weekOnWeekChange < 0)
    .sort((a, b) => a.weekOnWeekChange - b.weekOnWeekChange)
    .slice(0, 10);

  return {
    stores: processedStores,
    storeDetails: report3,
    dates: {
      yesterday: yesterdayStr,
      dayBeforeYesterday: dayBeforeYesterdayStr,
      lastWeekSameDay: lastWeekSameDayStr,
    },
    totals: {
      yesterdayConsumption: totalYesterdayConsumption,
      dayBeforeConsumption: totalDayBeforeConsumption,
      lastWeekConsumption: totalLastWeekConsumption,
      dayOnDayChange: totalDayOnDayChange,
      weekOnWeekChange: totalWeekOnWeekChange,
    },
    countryConsolidation,
    stateConsolidation: Object.values(stateConsolidation),
    topIntensityStores,
    topNegativeDayDeviationStores,
    topNegativeWeekDeviationStores,
  };
}
