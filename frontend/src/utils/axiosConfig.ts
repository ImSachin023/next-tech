import axios from 'axios';
import { API_URL } from '../config/api';
import { handleApiError } from './errorHandler';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from localStorage - try direct token first
    let token = localStorage.getItem('token');
    
    // If no direct token, try to get from user object
    if (!token) {
      const user = localStorage.getItem('user');
      if (user) {
        try {
          const userData = JSON.parse(user);
          token = userData.token;
          console.log('🔑 Axios: Token extracted from user object:', token ? token.substring(0, 20) + '...' : 'null');
        } catch (error) {
          console.error('❌ Axios: Error parsing user data:', error);
        }
      }
    } else {
      console.log('🔑 Axios: Token found directly in localStorage:', token.substring(0, 20) + '...');
    }
    
    // Development fallback: synthesize mock vendor token if user is a seller
    if (!token) {
      try {
        const raw = localStorage.getItem('user');
        if (raw) {
          const parsed = JSON.parse(raw);
          const userObj = parsed.user || parsed; // support wrapped or direct
          if (userObj?.role === 'seller') {
            const vendorId = userObj._id || 'vendor_1';
            token = `mock_vendor_token_${vendorId}`;
            localStorage.setItem('token', token);
            console.log('🔧 Axios: Generated mock vendor token for seller:', vendorId);
          }
        }
      } catch (e) {
        console.warn('Axios: Failed to parse user for fallback token');
      }
    }

    // Add token to headers if available
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Axios: Authorization header set for:', config.url);
    } else {
      console.warn('⚠️ Axios: No token found for API request:', config.url);
    }
    
    // Ensure content type is set
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    console.log('📤 Axios: Request config:', {
      url: config.url,
      method: config.method,
      hasAuth: !!config.headers.Authorization,
      headers: config.headers
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ API Success:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ API error details:', {
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      fullURL: error.config?.baseURL + error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.response?.data,
      networkError: !error.response,
      errorCode: error.code,
      errorMessage: error.message
    });
    
    // Do not clear auth on generic 401s; let UI handle and prompt gracefully
    // Some dev/mock endpoints may return 401 even when user is logged in
    if (error.response?.status === 401) {
      console.warn('401 Unauthorized from API: leaving stored auth intact; UI will handle re-auth if needed');
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;