/**
 * Utility functions for handling error messages
 */

/**
 * Extract a string error message from various error formats
 * @param {any} error - The error object or string
 * @param {string} fallback - Fallback message if no valid error found
 * @returns {string} A string error message
 */
export const getErrorMessage = (error, fallback = 'An error occurred') => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object') {
    // Try different common error message properties
    return error.message || error.error || error.msg || fallback;
  }
  
  return fallback;
};

/**
 * Extract error message from API response data
 * @param {any} data - The response data from API
 * @param {string} fallback - Fallback message if no valid error found
 * @returns {string} A string error message
 */
export const getApiErrorMessage = (data, fallback = 'Request failed') => {
  if (!data) return fallback;
  
  // Handle nested error objects
  if (data.error) {
    return getErrorMessage(data.error, fallback);
  }
  
  // Handle direct message
  if (data.message) {
    return getErrorMessage(data.message, fallback);
  }
  
  return fallback;
};