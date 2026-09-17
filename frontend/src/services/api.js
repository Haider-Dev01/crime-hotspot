import axios from 'axios';

const stripSlash = (value) => String(value || '').trim().replace(/\/$/, '');

const usableUrl = (value) => {
  const url = stripSlash(value);
  if (!url) return '';
  if (/localhost|127\.0\.0\.1/i.test(url)) return '';
  return url;
};

const fromEnvApi = usableUrl(import.meta.env.VITE_API_URL);
const fromEnvCluster = usableUrl(import.meta.env.VITE_CLUSTER_API_URL);
const PROD_API = 'https://crime-hotspot-1.onrender.com';

const API_BASE = (import.meta.env.PROD && /crime-hotspot-owyh/i.test(fromEnvApi) ? '' : fromEnvApi)
  || (import.meta.env.PROD ? PROD_API : '');

const CLUSTER_BASE = fromEnvCluster
  || (import.meta.env.PROD ? PROD_API : '/cluster-api');

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: import.meta.env.PROD ? 90000 : 10000,
});

const clusterClient = axios.create({
  baseURL: CLUSTER_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 90000,
});

export const crimeService = {
  getCrimes: async (type = '') => {
    const url = type ? `/api/crimes?type=${encodeURIComponent(type)}` : '/api/crimes';
    const response = await apiClient.get(url);
    return response.data;
  },
  getCrimeTypes: async () => {
    const response = await apiClient.get('/api/crimes/types');
    return response.data;
  },
  getCrimeStats: async () => {
    const response = await apiClient.get('/api/stats/types');
    return response.data;
  },
  getMeta: async () => {
    const response = await apiClient.get('/api/meta');
    return response.data;
  },
  getDemographicsSummary: async () => {
    const response = await apiClient.get('/api/demographics/summary');
    return response.data;
  },
  getDistrictSocio: async () => {
    const response = await apiClient.get('/api/stats/districts');
    return response.data;
  },
};

export const clusterService = {
  getClusters: async (params = {}) => {
    const response = await clusterClient.get('/api/clusters', { params: buildClusterParams(params) });
    return response.data;
  },
  getClusterSummary: async (params = {}) => {
    const response = await clusterClient.get('/api/clusters/summary', { params: buildClusterParams(params) });
    return response.data;
  },
};

function buildClusterParams({ epsKm, minSamples, type, district, from, to } = {}) {
  const params = {};
  if (epsKm != null) params.eps = epsKm;
  if (minSamples != null) params.min_samples = minSamples;
  if (type) params.type = type;
  if (district) params.district = district;
  if (from) params.from = from;
  if (to) params.to = to;
  return params;
}

export { API_BASE, CLUSTER_BASE };
export default apiClient;
