// Unit utility functions for converting IDs to readable names

// Unit ID mappings (these should match the IDs from your seed script)
export const UNIT_IDS = {
  UNIT1: '507f1f77bcf86cd799439011',
  UNIT2: '507f1f77bcf86cd799439012'
};

// Convert unit ID to readable name
export const getUnitName = (unitId) => {
  if (!unitId) return 'Not assigned';
  
  switch (unitId.toString()) {
    case UNIT_IDS.UNIT1:
      return 'Unit 1';
    case UNIT_IDS.UNIT2:
      return 'Unit 2';
    default:
      return 'Unknown Unit';
  }
};

// Convert unit ID to display object with name and code
export const getUnitDisplay = (unitId) => {
  if (!unitId) return { name: 'Not assigned', code: 'N/A' };
  
  switch (unitId.toString()) {
    case UNIT_IDS.UNIT1:
      return { name: 'Unit 1', code: 'UNIT1' };
    case UNIT_IDS.UNIT2:
      return { name: 'Unit 2', code: 'UNIT2' };
    default:
      return { name: 'Unknown Unit', code: 'UNK' };
  }
};

// Get all available units for dropdowns
export const getAllUnits = () => [
  { _id: UNIT_IDS.UNIT1, name: 'Unit 1', code: 'UNIT1' },
  { _id: UNIT_IDS.UNIT2, name: 'Unit 2', code: 'UNIT2' }
];

// Check if user belongs to a specific unit
export const isUserInUnit = (user, targetUnitId) => {
  return user.unitId && user.unitId.toString() === targetUnitId.toString();
};