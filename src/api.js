/**
 * API Configuration
 * Centralized API base URL configuration for different environments
 */

// Get API base URL from environment variable or fallback to localhost for development
const getApiBaseUrl = () => {
  // In production, use the environment variable
  if (process.env.NODE_ENV === 'production') {
    return process.env.REACT_APP_API_URL || window.location.origin;
  }
  
  // In development, use localhost or environment variable
  return process.env.REACT_APP_API_URL || 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to build full API URLs
export const buildApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: 'api/auth/login',
  FORGOT_PASSWORD: 'api/auth/forgot-password',
  RESET_PASSWORD: 'api/auth/reset-password',
  
  // Users
  USERS: 'api/users',
  SWITCH_UNIT: 'api/users/switch-unit',
  
  // Organizations
  ORGANIZATION: 'api/organization',
  ORGANIZATION_FIRST: 'api/organization/first',
  
  // System Settings
  SYSTEM_SETTINGS: 'api/system-settings',
  
  // Reservations
  RESERVATIONS: 'api/reservations',
  RESERVATIONS_BY_NUMBER: 'api/reservations/by-number',
  RESERVATIONS_OVERVIEW: 'api/reservations/overview',
  RESERVATIONS_HISTORY: 'api/reservations/history',
  RESERVATIONS_AGR_VS_RES: 'api/reservations/agr-vs-res',
  
  // Agreements
  AGREEMENTS: 'api/agreements',
  AGREEMENTS_OVERVIEW: 'api/agreements/overview',
  AGREEMENTS_HISTORY: 'api/agreements/history',
  
  // Products
  PRODUCTS: 'api/products',
  PRODUCTS_CALCULATE_CHARGES: 'api/products/calculate-charges',
  
  // Rebates
  REBATES: 'api/rebates',
  REBATES_SEARCH: 'api/rebates',
  REBATES_PREVIEW: 'api/rebates/preview',
  REBATES_ISSUE: 'api/rebates/issue',
  REBATES_AGREEMENT: 'api/rebates/agreement',
  
  // Payments
  PAYMENTS: 'api/payments',
  PAYMENTS_AGREEMENT: 'api/payments/agreement',
  PAYMENTS_PROCESS: 'api/payments/process',
  PAYMENTS_SEARCH: 'api/payments/search',
  PAYMENTS_RECEIPT: 'api/payments/receipt',
  
  // Withdrawals
  WITHDRAWALS: 'api/withdrawals',
  WITHDRAWALS_AGREEMENT: 'api/withdrawals/agreement',
  WITHDRAWALS_CREATE: 'api/withdrawals/create',
  WITHDRAWALS_HISTORY: 'api/withdrawals/history',
  
  // Expenditures
  EXPENDITURES: 'api/expenditures',
  EXPENDITURES_CREATE: 'api/expenditures/create',
  EXPENDITURES_HISTORY: 'api/expenditures/history',

  // Money Transfers
  MONEY_TRANSFERS: 'api/money-transfers',
  MONEY_TRANSFERS_CREATE: 'api/money-transfers/create',
  MONEY_TRANSFERS_HISTORY: 'api/money-transfers/history',
  
  // Dashboard
  DASHBOARD_REPORT: 'api/dashboard/report',

  // Report Emails
  REPORT_EMAILS: 'api/organization/report-emails',
  REPORT_EMAILS_SEND_NOW: 'api/organization/report-emails/send-now',

  // Storage
  STORAGE: 'api/agreements/{id}/storage',
  STORAGE_RELOCATION_START: 'api/agreements/{id}/storage/relocation/start',
  STORAGE_RELOCATION_COMPLETE: 'api/agreements/{id}/storage/relocation/complete',
  STORAGE_RELOCATION_ALLOCATE: 'api/agreements/{id}/storage/relocation/allocate',
  STORAGE_OUT_FOR_RELOCATION: 'api/agreements/{id}/storage/out-for-relocation',
  STORAGE_TRANSFERS: 'api/agreements/{id}/storage/transfers'
};

export default API_BASE_URL;