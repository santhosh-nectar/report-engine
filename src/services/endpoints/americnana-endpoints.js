const BASE_URL = "https://assets.nectarit.com:8280";

export const AMERICANA_ENPOINTS = {
  CONSUMPTION_API: `${BASE_URL}/ems-report-pro/1.0.0/consumption/filter/data`,
  SITES_API: `${BASE_URL}/ems-site-manager/1.0.0/sites/search/pagination?extendsFlag=true&tenantExtends=true`,
  LOGIN_API: `https://assets.nectarit.com/api/towa-integration/1.0.0/token/login`,
  EMAIL_API: `${BASE_URL}/notification/1.0.0/notification/email`,
  BENCHMARK_API: `${BASE_URL}/ems-site-manager-v2/2.0.0/benchmark/list/month`,
};
