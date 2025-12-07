/**
 * Get the user's selected units from localStorage
 */
export const getUnits = () => {
  return localStorage.getItem('units') || 'imperial';
};

/**
 * Convert altitude from feet to the user's selected units
 * Backend stores everything in feet
 */
export const convertAltitude = (feet) => {
  const units = getUnits();
  if (units === 'metric') {
    return feet * 0.3048; // feet to meters
  }
  return feet;
};

/**
 * Format altitude with appropriate unit label
 */
export const formatAltitude = (feet, decimals = 0) => {
  const units = getUnits();
  const value = convertAltitude(feet);
  const unit = units === 'metric' ? 'm' : 'ft';
  return `${Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)} ${unit}`;
};

/**
 * Get the unit label
 */
export const getUnitLabel = () => {
  const units = getUnits();
  return units === 'metric' ? 'm' : 'ft';
};

/**
 * Format altitude value without unit label (for charts)
 */
export const formatAltitudeValue = (feet, decimals = 0) => {
  const value = convertAltitude(feet);
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};
