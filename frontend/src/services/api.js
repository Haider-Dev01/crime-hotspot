import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';
const CLUSTER_API_URL = 'http://localhost:5001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

const clusterClient = axios.create({
  baseURL: CLUSTER_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
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
};

export const clusterService = {
  getClusters: async () => {
    const response = await clusterClient.get('/api/clusters');
    return response.data;
  },
  getClusterSummary: async () => {
    const response = await clusterClient.get('/api/clusters/summary');
    return response.data;
  },
};

export default apiClient;
