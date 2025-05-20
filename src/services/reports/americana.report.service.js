import axios from "axios";
import { formatDate } from "date-fns";
import { calculatePercentageChange } from "../../utils/util.calculatePercentage.js";
import { AMERICANA_ENPOINTS } from "../endpoints/americnana-endpoints.js";
import { getAuthHeaders } from "../auth/auth.service.js";

function getDateRange(offsetDays) {
  const start = new Date();
  start.setDate(start.getDate() - offsetDays);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { startDate: start.getTime(), endDate: end.getTime() };
}

export async function fetchMergedEnergyData(period, domain, groupBy, type) {
  try {
    if (!period || !domain || !groupBy || !type) {
      throw new Error("Missing required parameters");
    }

    const headers = await getAuthHeaders();
    const { startDate: yStart, endDate: yEnd } = getDateRange(1); // Yesterday
    const { startDate: lwStart, endDate: lwEnd } = getDateRange(8); // Last Week
    const { startDate: dbStart, endDate: dbEnd } = getDateRange(2); // Day Before Yesterday

    const [yesterdayRes, lastWeekRes, dayBeforeRes, siteRes] =
      await Promise.all([
        axios.post(
          AMERICANA_ENPOINTS.CONSUMPTION_API,
          {
            period,
            domain,
            startDate: yStart,
            endDate: yEnd,
            groupBy,
            type,
            includeRaw: true,
          },
          { headers }
        ),

        axios.post(
          AMERICANA_ENPOINTS.CONSUMPTION_API,
          {
            period,
            domain,
            startDate: lwStart,
            endDate: lwEnd,
            groupBy,
            type,
            includeRaw: true,
          },
          { headers }
        ),

        axios.post(
          AMERICANA_ENPOINTS.CONSUMPTION_API,
          {
            period,
            domain,
            startDate: dbStart,
            endDate: dbEnd,
            groupBy,
            type,
            includeRaw: true,
          },
          { headers }
        ),

        axios.post(
          AMERICANA_ENPOINTS.SITES_API,
          {
            domain,
            type: "Site",
            order: "asc",
            sortField: "name",
          },
          { headers }
        ),
      ]);

    //Bench Mark API
    // axios.post(AMERICANA_ENPOINTS.BENCHMARK_API, {
    //   domain: "americana",
    //   sites: ["sdfse23r2n3rdfsdfoij23ef"],
    //   types: "LVPMeter",
    //   points: ["Energy Consumption Daily"],
    //   months: [1, 2, 3],
    // });

    const yData = yesterdayRes.data || [];
    const lwData = lastWeekRes.data || [];
    const dbData = dayBeforeRes.data || [];
    const siteData = siteRes.data?.data || [];

    const yMap = new Map(yData.map((e) => [e.entity.identifier, e]));
    const lwMap = new Map(lwData.map((e) => [e.entity.identifier, e]));
    const dbMap = new Map(dbData.map((e) => [e.entity.identifier, e]));
    const siteMap = new Map(
      siteData.map((site) => [site.identifier, site.data])
    );

    const allMeterIds = new Set([
      ...yMap.keys(),
      ...lwMap.keys(),
      ...dbMap.keys(),
    ]);

    const report1 = [];
    const report2 = [];
    const report3 = [];

    for (const meterId of allMeterIds) {
      const yEntry = yMap.get(meterId);
      const lwEntry = lwMap.get(meterId);
      const dbEntry = dbMap.get(meterId);
      const baseEntry = yEntry || lwEntry || dbEntry;

      const sourceTagPath = baseEntry?.entity?.data?.sourceTagPath || "";
      const siteId = getSiteIdentifierFromTagPath(sourceTagPath);
      const siteMeta = siteMap.get(siteId) || {};
      const { countryName, stateName } =
        extractCountryAndStateFromTagPath(sourceTagPath);
      const siteName =
        getStoreNameFromTagPath(sourceTagPath) ||
        siteMeta.name ||
        siteMeta.displayName ||
        "Unknown";
      const area = siteMeta.area ?? 0;
      const common = {
        meterId,
        meterName: baseEntry?.entity?.data?.displayName || "Unknown",
        domain: baseEntry?.entity?.domain || "",
        ownerName: baseEntry?.entity?.data?.ownerName || "",
        siteId,
        siteName,
        country: countryName,
        state: stateName,
        area,
        siteMeta,
      };

      report1.push({
        ...common,
        consumptionYesterday: yEntry?.consumptions?.[0]?.consumption || 0,
        consumptionLastWeek: lwEntry?.consumptions?.[0]?.consumption || 0,
      });

      report2.push({
        ...common,
        consumptionYesterday: yEntry?.consumptions?.[0]?.consumption || 0,
        consumptionDayBefore: dbEntry?.consumptions?.[0]?.consumption || 0,
      });
    }

    if (report1.length === 0) {
      throw new Error("No data found for the specified date range.");
    }

    const mergedReport = report1.map((item1) => {
      const item2 = report2.find((r2) => r2.meterId === item1.meterId);

      return {
        ...item1,
        consumptionDayBefore: item2?.consumptionDayBefore || 0,
      };
    });

    const data = generateStoreDetailsData(
      mergedReport,
      formatDate(yStart, "yyyy-MM-dd"),
      formatDate(dbStart, "yyyy-MM-dd"),
      formatDate(lwStart, "yyyy-MM-dd")
    );

    report3.push(...data);

    return {
      siteMetadata: siteData,
      report1,
      report2,
      report3,
    };
  } catch (err) {
    console.error("Error fetching energy data:", err.message);
    throw err;
  }
}

function getSiteIdentifierFromTagPath(sourceTagPathString) {
  try {
    const path = JSON.parse(sourceTagPathString);
    const siteTag = path.find((tag) => tag.type === "CommercialTower");
    return siteTag?.topic || null;
  } catch (e) {
    return null;
  }
}

function getStoreNameFromTagPath(sourceTagPathString) {
  try {
    const path = JSON.parse(sourceTagPathString);
    const tower = path.find((tag) => tag.type === "CommercialTower");
    return tower?.name || "Unknown Store";
  } catch (e) {
    return "Unknown Store";
  }
}

function extractCountryAndStateFromTagPath(tagPathStr) {
  let countryName = "Unknown";
  let stateName = "Unknown";

  try {
    const tagPath = JSON.parse(tagPathStr);

    for (const tag of tagPath) {
      if (tag.parentType === "Community" && tag.name) {
        countryName = tag.name;
      }
      if (tag.parentType === "SiteGroup" && tag.name) {
        stateName = tag.name;
      }
    }
  } catch (e) {
    // fallback already set to Unknown
  }

  return { countryName, stateName };
}

function generateStoreDetailsData(report) {
  return report.map((store) => {
    const area = store.area || 0;
    const cy = store.consumptionYesterday || 0;
    const cd = store.consumptionDayBefore || 0;
    const cw = store.consumptionLastWeek || 0;

    const dayChange = calculatePercentageChange(cy, cd);
    const weekChange = calculatePercentageChange(cy, cw);
    const energyIntensity = area > 0 ? cy / area : 0;

    return {
      "Store Name": store.siteName || "Unknown",
      Country: store.country || "Unknown",
      State: store.state || "Unknown",
      "Area (sqm)": area,
      "Yesterday Consumption": cy,
      "Day Before Consumption": cd,
      "Day Change %": dayChange,
      "Last Week Consumption": cw,
      "Week Change %": weekChange,
      "Energy Intensity (kWh/sqm)": energyIntensity.toFixed(2),
    };
  });
}
