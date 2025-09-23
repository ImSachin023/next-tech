// API Configuration
export const getApiUrl = (): string => {
  const env = process.env.REACT_APP_ENV || process.env.NODE_ENV;
  
  switch (env) {
    case 'production':
      return process.env.REACT_APP_API_URL || 'https://api.nexttechfusiongadgets.com';
    case 'development':
      return process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    case 'test':
      return process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    default:
      return 'http://localhost:5001/api';
  }
};

// Environment information
export const getEnvironmentInfo = () => {
  const env = process.env.REACT_APP_ENV || process.env.NODE_ENV;
  const envName = process.env.REACT_APP_ENV_NAME || env;
  const debugMode = process.env.REACT_APP_DEBUG_MODE === 'true';
  
  return {
    env,
    envName,
    debugMode,
    isDevelopment: env === 'development',
    isTest: env === 'test',
    isProduction: env === 'production'
  };
};

export const API_URL = getApiUrl();

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
    GOOGLE: '/auth/google',
    FACEBOOK: '/auth/facebook',
    APPLE: '/auth/apple',
    PHONE: '/auth/phone',
    SEND_OTP: '/auth/send-otp'
  },
  CART: {
    GET: '/cart',
    ADD: '/cart/add',
    UPDATE: '/cart/update',
    REMOVE: '/cart/remove',
    CLEAR: '/cart/clear'
  },
  PRODUCTS: {
    GET_ALL: '/products',
    GET_BY_ID: '/products',
    CREATE: '/products',
    UPDATE: '/products',
    DELETE: '/products',
    SEARCH: '/products/search',
    CATEGORIES: '/products/categories'
  },
  ORDERS: {
    GET_ALL: '/orders',
    GET_BY_ID: '/orders',
    CREATE: '/orders',
    UPDATE: '/orders'
  },
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile'
  },
  HEALTH: '/health'
};

// Default headers
export const getDefaultHeaders = () => ({
  'Content-Type': 'application/json',
});

// Auth headers
export const getAuthHeaders = () => {
  let token = localStorage.getItem('token');
  
  if (!token) {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        token = userData.token;
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }
  
  return {
    ...getDefaultHeaders(),
    ...(token && { Authorization: `Bearer ${token}` })
  };
};