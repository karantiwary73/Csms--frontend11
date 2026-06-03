/**
 * Utility functions for input handling
 */

/**
 * Prevents number input value from changing on mouse wheel scroll
 * Usage: <input type="number" onWheel={preventScrollChange} />
 * 
 * @param {WheelEvent} e - The wheel event
 */
export const preventScrollChange = (e) => {
  // Blur the input to prevent value change
  e.target.blur();
  
  // Prevent the default scroll behavior
  e.preventDefault();
  e.stopPropagation();
};

/**
 * Prevents number input value from changing on mouse wheel scroll (alternative approach)
 * This version keeps focus but prevents the value change
 * 
 * @param {WheelEvent} e - The wheel event
 */
export const preventScrollChangeKeepFocus = (e) => {
  e.preventDefault();
  e.stopPropagation();
};
