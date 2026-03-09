import axios from 'axios';
import { API_BASE } from './config';

/**
 * BioEngine Silent Telemetry 2.0
 * Automates error reporting to the backend without user intervention.
 */

const remoteLog = async (level, message, data = {}) => {
    try {
        await axios.post(`${API_BASE}/log/remote`, {
            level,
            message,
            data: {
                ...data,
                url: window.location.href,
                userAgent: navigator.userAgent
            }
        });
    } catch (e) {
        // Fail silently during logging to avoid infinite loops
    }
};

// 1. Axios Interceptor for API Errors
axios.interceptors.response.use(
    response => response,
    error => {
        // Ignorar fallos del propio endpoint de logs para evitar loops infinitos
        if (error.config?.url?.includes('/log/remote')) {
            return Promise.reject(error);
        }

        const errorData = {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            statusText: error.response?.statusText,
            message: error.message,
            responseData: error.response?.data
        };

        remoteLog('error', `API Failure: ${error.config?.url || 'unknown'}`, errorData);
        return Promise.reject(error);
    }
);

// 2. Global JS Exception Handler
window.onerror = function (message, source, lineno, colno, error) {
    remoteLog('error', 'Global Runtime Error', {
        message,
        source,
        lineno,
        colno,
        stack: error?.stack
    });
    return false; // Let browser process it normally too
};

// 3. Unhandled Promise Rejections
window.onunhandledrejection = function (event) {
    remoteLog('error', 'Unhandled Promise Rejection', {
        reason: event.reason?.message || String(event.reason),
        stack: event.reason?.stack
    });
};

console.log('🚀 BioEngine Telemetry Active (Silent Reporting Mode)');

export default remoteLog;
