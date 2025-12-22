// API Configuration
// In development: uses localhost:4000
// In production (Vercel): uses your ngrok URL from environment variable

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// API endpoints
export const API = {
    jenkins: {
        lastBuildStatus: `${API_BASE_URL}/api/jenkins/last-build-status`,
        triggerBuild: `${API_BASE_URL}/api/trigger-build`,
    },
    docker: {
        status: `${API_BASE_URL}/api/docker-status`,
    },
    kubernetes: {
        status: `${API_BASE_URL}/api/kubernetes-status`,
    },
    metrics: {
        application: `${API_BASE_URL}/api/metrics/application`,
        kubernetes: `${API_BASE_URL}/api/metrics/kubernetes`,
        pipelineStats: `${API_BASE_URL}/api/metrics/pipeline-stats`,
    },
    health: `${API_BASE_URL}/api/health`,
};

export default API;
