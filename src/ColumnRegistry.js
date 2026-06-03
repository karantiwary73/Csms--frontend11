/**
 * Centralized Column Definition Registry
 * 
 * This registry defines columns that match the actual database model schemas.
 * Only includes fields that exist in the models to prevent data fetching issues.
 */

// Column Registry - Only columns that exist in actual model schemas
export const COLUMN_REGISTRY = {
  // Core ID columns (from models)
  reservationNumber: {
    label: 'Reservation No',
    width: '140px',
    sticky: 'left',
    type: 'custom',
    source: 'reservation'
  },
  agreementId: {
    label: 'Agreement No',
    width: '140px',
    sticky: 'left',
    type: 'custom',
    source: 'agreement'
  },
  
  // Customer model fields (populated from customerId)
  customerName: {
    label: 'Customer Name',
    width: '160px',
    sticky: 'left',
    type: 'text',
    source: 'customer'
  },
  fatherName: {
    label: "Father's Name",
    width: '140px',
    sticky: 'none',
    type: 'text',
    source: 'customer'
  },
  mobile: {
    label: 'Mobile',
    width: '120px',
    sticky: 'none',
    type: 'contact',
    source: 'customer'
  },
  altMobile: {
    label: 'Alt Mobile',
    width: '120px',
    sticky: 'none',
    hidden: true,
    type: 'text',
    source: 'customer'
  },
  email: {
    label: 'Email',
    width: '180px',
    sticky: 'none',
    hidden: true,
    type: 'text',
    source: 'customer'
  },
  
  // Customer address fields
  addressLine1: {
    label: 'Village',
    width: '150px',
    sticky: 'none',
    type: 'text',
    source: 'customer'
  },
  addressLine2: {
    label: 'Address Line 2',
    width: '150px',
    sticky: 'none',
    hidden: true,
    type: 'text',
    source: 'customer'
  },
  city: {
    label: 'City',
    width: '120px',
    sticky: 'none',
    hidden: true,
    type: 'text',
    source: 'customer'
  },
  district: {
    label: 'District',
    width: '120px',
    sticky: 'none',
    hidden: true,
    type: 'text',
    source: 'customer'
  },
  state: {
    label: 'State',
    width: '120px',
    sticky: 'none',
    hidden: true,
    type: 'text',
    source: 'customer'
  },
  pinCode: {
    label: 'Pin Code',
    width: '100px',
    sticky: 'none',
    hidden: true,
    type: 'text',
    source: 'customer'
  },
  
  // Customer quantity/rate fields
  reservedQuintal: {
    label: 'Reserved Quintal',
    width: '130px',
    sticky: 'none',
    type: 'number',
    source: 'customer'
  },
  arrivedQuintal: {
    label: 'Arrived Quintal',
    width: '130px',
    sticky: 'none',
    type: 'number',
    source: 'calculated'
  },
  numberOfBags: {
    label: 'Number of Bags',
    width: '120px',
    sticky: 'none',
    type: 'number',
    source: 'customer'
  },
  arrivedBags: {
    label: 'Number of Bags',
    width: '120px',
    sticky: 'none',
    type: 'number',
    source: 'calculated'
  },
  reservationFee: {
    label: 'Reservation Fee',
    width: '130px',
    sticky: 'none',
    type: 'currency',
    source: 'customer'
  },
  reservationRate: {
    label: 'Rate',
    width: '100px',
    sticky: 'none',
    hidden: true,
    type: 'currency',
    source: 'customer'
  },
  
  // Agreement model fields
  weightInQuintal: {
    label: 'Weight (Quintal)',
    width: '130px',
    sticky: 'none',
    type: 'number',
    source: 'agreement'
  },
  ratePerQuintal: {
    label: 'Rate per Quintal',
    width: '130px',
    sticky: 'none',
    type: 'currency',
    source: 'agreement'
  },
  product: {
    label: 'Product',
    width: '120px',
    sticky: 'none',
    type: 'text',
    source: 'agreement'
  },
  lotNumber: {
    label: 'Lot Number',
    width: '120px',
    sticky: 'none',
    type: 'text',
    source: 'agreement'
  },
  
  // Date columns (from models)
  date: {
    label: 'Date',
    width: '120px',
    sticky: 'none',
    type: 'date',
    source: 'reservation'
  },
  agreementDate: {
    label: 'Date',
    width: '120px',
    sticky: 'none',
    type: 'date',
    source: 'agreement'
  },
  expectedArrivalDate: {
    label: 'Expected Arrival',
    width: '130px',
    sticky: 'none',
    type: 'date',
    source: 'reservation'
  },
  createdOn: {
    label: 'Created On',
    width: '130px',
    sticky: 'none',
    hidden: true,
    type: 'datetime',
    source: 'reservation'
  },
  
  // Meta columns (from models)
  createdBy: {
    label: 'Created By',
    width: '120px',
    sticky: 'none',
    type: 'user',
    source: 'reservation'
  },
  
  // Additional reservation model fields
  reservationId: {
    label: 'Reservation ID',
    width: '140px',
    sticky: 'none',
    hidden: true,
    type: 'text',
    source: 'reservation'
  },
  unitId: {
    label: 'Unit ID',
    width: '120px',
    sticky: 'none',
    hidden: true,
    type: 'text',
    source: 'reservation'
  },
  
  // Additional agreement model fields
  notes: {
    label: 'Notes',
    width: '150px',
    sticky: 'none',
    hidden: true,
    type: 'text',
    source: 'agreement'
  },
  updatedBy: {
    label: 'Updated By',
    width: '120px',
    sticky: 'none',
    hidden: true,
    type: 'user',
    source: 'agreement'
  },
  updatedDate: {
    label: 'Updated Date',
    width: '130px',
    sticky: 'none',
    hidden: true,
    type: 'datetime',
    source: 'agreement'
  },
  
  // Charge-related fields (from agreement charges)
  totalStorageCharge: {
    label: 'Storage Charge',
    width: '130px',
    sticky: 'none',
    hidden: true,
    type: 'currency',
    source: 'agreement'
  },
  advanceStorageChargesPaid: {
    label: 'Advance Paid',
    width: '130px',
    sticky: 'none',
    type: 'currency',
    source: 'agreement'
  },
  handlingChargeTotal: {
    label: 'Paldari Total',
    width: '130px',
    sticky: 'none',
    type: 'currency',
    source: 'agreement'
  },
  paldariTotal: {
    label: 'Paldari Total',
    width: '130px',
    sticky: 'none',
    type: 'currency',
    source: 'agreement'
  },
  handlingChargePaid: {
    label: 'Paldari Paid',
    width: '130px',
    sticky: 'none',
    type: 'currency',
    source: 'agreement'
  },
  paldariPaid: {
    label: 'Paldari Paid',
    width: '130px',
    sticky: 'none',
    type: 'currency',
    source: 'agreement'
  },
  handlingChargeDue: {
    label: 'Paldari Dues',
    width: '130px',
    sticky: 'none',
    type: 'currency',
    source: 'agreement'
  },
  paldariDues: {
    label: 'Paldari Dues',
    width: '130px',
    sticky: 'none',
    type: 'currency',
    source: 'agreement'
  },
  totalPayable: {
    label: 'Net Amount',
    width: '130px',
    sticky: 'none',
    type: 'currency',
    source: 'agreement'
  },
  
  // Calculated/Virtual columns (computed in frontend)
  totalAmount: {
    label: 'Total Amount',
    width: '130px',
    sticky: 'none',
    type: 'currency',
    source: 'calculated'
  },
  status: {
    label: 'Status',
    width: '100px',
    sticky: 'none',
    type: 'custom',
    source: 'calculated'
  },
  
  // Action columns (UI only)
  action: {
    label: 'Action',
    width: '200px',
    sticky: 'right',
    type: 'custom',
    source: 'ui'
  }
};

// System Default Column Configurations per View
export const SYSTEM_DEFAULTS = {
  'reservation-history': [
    'reservationNumber',
    'customerName',
    'mobile',
    'addressLine1',
    'reservedQuintal',
    'expectedArrivalDate',
    'action'
  ],
  
  'reservation-comparison': [
    'reservationNumber',
    'customerName',
    'mobile',
    'addressLine1',
    'reservedQuintal',
    'arrivedQuintal',
    'arrivedBags'
  ],
  
  'agreement-history': [
    'agreementId',
    'lotNumber',
    'customerName',
    'mobile',
    'addressLine1',
    'weightInQuintal',
    'paldariDues',
    'action'
  ],
  
  'agreement-overview': [
    'agreementDate',
    'lotNumber',
    'weightInQuintal',
    'numberOfBags',
    'paldariTotal',
    'paldariPaid',
    'paldariDues'
  ],
  
  'reservation-overview': [
    'reservationNumber',
    'customerName',
    'reservedQuintal',
    'reservationFee'
  ]
};

/**
 * Get column definition by key
 */
export const getColumnDefinition = (columnKey) => {
  return COLUMN_REGISTRY[columnKey] || null;
};

/**
 * Get system default columns for a view
 */
export const getSystemDefaults = (viewKey) => {
  return SYSTEM_DEFAULTS[viewKey] || [];
};

/**
 * Get all available columns for a view (based on system defaults + hidden columns)
 */
export const getAvailableColumns = (viewKey) => {
  const systemDefaults = getSystemDefaults(viewKey);
  const allColumns = Object.keys(COLUMN_REGISTRY);
  
  // Include system defaults + any hidden columns that might be relevant
  const availableColumns = new Set(systemDefaults);
  
  // Add other relevant columns based on view type
  allColumns.forEach(columnKey => {
    const column = COLUMN_REGISTRY[columnKey];
    if (column && isColumnRelevantForView(columnKey, viewKey)) {
      availableColumns.add(columnKey);
    }
  });
  
  return Array.from(availableColumns);
};

/**
 * Check if a column is relevant for a specific view
 */
const isColumnRelevantForView = (columnKey, viewKey) => {
  // Define column relevance rules based on actual model fields
  const viewColumnMap = {
    'reservation-history': [
      'reservationNumber', 'customerName', 'fatherName', 'mobile', 'altMobile', 'email',
      'addressLine1', 'addressLine2', 'city', 'district', 'state', 'pinCode',
      'reservedQuintal', 'numberOfBags', 'reservationFee', 'reservationRate',
      'date', 'expectedArrivalDate', 'createdOn', 'createdBy', 'action'
    ],
    'reservation-comparison': [
      'reservationNumber', 'customerName', 'fatherName', 'mobile', 'altMobile',
      'addressLine1', 'addressLine2', 'city', 'district', 'state',
      'reservedQuintal', 'arrivedQuintal', 'arrivedBags', 'reservationFee', 'expectedArrivalDate', 'status'
    ],
    'agreement-history': [
      'agreementId', 'customerName', 'fatherName', 'mobile', 'altMobile', 'email',
      'addressLine1', 'addressLine2', 'city', 'district', 'state', 'pinCode',
      'weightInQuintal', 'numberOfBags', 'ratePerQuintal', 'product', 'lotNumber',
      'agreementDate', 'createdOn', 'createdBy', 'paldariTotal', 'paldariPaid', 'paldariDues',
      'totalAmount', 'status', 'action'
    ],
    'agreement-overview': [
      'agreementDate', 'lotNumber', 'weightInQuintal', 'numberOfBags', 
      'paldariTotal', 'paldariPaid', 'paldariDues'
    ],
    'reservation-overview': [
      'reservationNumber', 'customerName', 'reservedQuintal', 'reservationFee'
    ]
  };
  
  return viewColumnMap[viewKey]?.includes(columnKey) || false;
};

/**
 * Column Manager Service - Handles user preferences
 */
export class ColumnManagerService {
  static USER_PREFS_KEY = 'column-preferences';
  
  /**
   * Get user preferences for a specific view
   */
  static getUserPreferences(userId, viewKey) {
    try {
      const prefs = localStorage.getItem(this.USER_PREFS_KEY);
      if (!prefs) return null;
      
      const parsed = JSON.parse(prefs);
      return parsed[userId]?.[viewKey] || null;
    } catch (error) {
      console.warn('Failed to load user column preferences:', error);
      return null;
    }
  }
  
  /**
   * Save user preferences for a specific view
   */
  static saveUserPreferences(userId, viewKey, visibleColumns) {
    try {
      const prefs = localStorage.getItem(this.USER_PREFS_KEY);
      const parsed = prefs ? JSON.parse(prefs) : {};
      
      if (!parsed[userId]) {
        parsed[userId] = {};
      }
      
      parsed[userId][viewKey] = visibleColumns;
      localStorage.setItem(this.USER_PREFS_KEY, JSON.stringify(parsed));
      
      return true;
    } catch (error) {
      console.error('Failed to save user column preferences:', error);
      return false;
    }
  }
  
  /**
   * Clear user preferences for a specific view
   */
  static clearUserPreferences(userId, viewKey) {
    try {
      const prefs = localStorage.getItem(this.USER_PREFS_KEY);
      if (!prefs) return true;
      
      const parsed = JSON.parse(prefs);
      if (parsed[userId]?.[viewKey]) {
        delete parsed[userId][viewKey];
        localStorage.setItem(this.USER_PREFS_KEY, JSON.stringify(parsed));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to clear user column preferences:', error);
      return false;
    }
  }
  
  /**
   * Resolve column visibility with priority:
   * 1) User saved preference (if exists)
   * 2) System default column visibility
   * 3) Column registry fallback
   */
  static resolveColumnVisibility(userId, viewKey) {
    // 1. Try user preferences first
    const userPrefs = this.getUserPreferences(userId, viewKey);
    if (userPrefs && Array.isArray(userPrefs)) {
      return userPrefs;
    }
    
    // 2. Fall back to system defaults
    const systemDefaults = getSystemDefaults(viewKey);
    if (systemDefaults.length > 0) {
      return systemDefaults;
    }
    
    // 3. Final fallback - all available columns (no required columns anymore)
    const availableColumns = getAvailableColumns(viewKey);
    return availableColumns;
  }
}