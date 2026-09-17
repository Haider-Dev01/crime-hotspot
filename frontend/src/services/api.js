import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';
const CLUSTER_API_URL = import.meta.env.VITE_CLUSTER_API_URL ?? '/cluster-api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

const clusterClient = axios.create({
  baseURL: CLUSTER_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
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

export default apiClient;
