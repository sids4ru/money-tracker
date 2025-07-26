/**
 * Date utilities for consistent date handling throughout the application
 */

// Standard date format to use across the application
export const DATE_FORMAT = 'YYYY-MM-DD';

/**
 * Convert any date string to our standard YYYY-MM-DD format
 * Handles various input formats: 
 * - DD/MM/YYYY
 * - MM/DD/YYYY
 * - YYYY-MM-DD HH:MM:SS
 * - etc.
 * 
 * @param dateString The date string to standardize
 * @returns Standardized date in YYYY-MM-DD format
 */
export function standardizeDate(dateString: string): string {
  if (!dateString) return '';

  // Remove any time component
  const dateOnly = dateString.split(' ')[0];
  
  // Try to determine the format and parse accordingly
  let date: Date;
  
  if (dateOnly.includes('/')) {
    // Handle DD/MM/YYYY or MM/DD/YYYY
    const parts = dateOnly.split('/');
    if (parts.length !== 3) return dateOnly; // Return as is if not in expected format
    
    // Determine if day or month comes first based on values
    const first = parseInt(parts[0], 10);
    const second = parseInt(parts[1], 10);
    
    if (first > 12) {
      // First part is day (European format DD/MM/YYYY)
      date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
    } else {
      // Assume first part is month (US format MM/DD/YYYY) or European (DD/MM/YYYY) if both < 12
      // Since our app appears to use European format by default, we'll assume DD/MM/YYYY
      date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
    }
  } else if (dateOnly.includes('-')) {
    // Handle YYYY-MM-DD or DD-MM-YYYY
    const parts = dateOnly.split('-');
    if (parts.length !== 3) return dateOnly; // Return as is if not in expected format
    
    // If first part is 4 digits, assume YYYY-MM-DD
    if (parts[0].length === 4) {
      date = new Date(dateOnly);
    } else {
      // Otherwise assume DD-MM-YYYY
      date = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
    }
  } else {
    // If format cannot be determined, try standard Date parsing
    date = new Date(dateOnly);
  }
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return dateOnly; // Return as is if date is invalid
  }
  
  // Format date as YYYY-MM-DD
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

/**
 * Format a standard YYYY-MM-DD date for display
 * @param dateString The date string in YYYY-MM-DD format
 * @param displayFormat The display format ('iso' for YYYY-MM-DD, 'eu' for DD/MM/YYYY)
 * @returns Formatted date string for display
 */
export function formatDateForDisplay(dateString: string, displayFormat: 'iso' | 'eu' = 'iso'): string {
  if (!dateString) return '';

  // Ensure the input is in YYYY-MM-DD format
  const standardizedDate = standardizeDate(dateString);
  
  if (!standardizedDate) return dateString; // Return original if standardization failed
  
  const parts = standardizedDate.split('-');
  if (parts.length !== 3) return dateString; // Return original if not in expected format
  
  if (displayFormat === 'eu') {
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
  }
  
  return standardizedDate; // YYYY-MM-DD
}

/**
 * Parse a date string to Date object
 * @param dateString The date string to parse
 * @returns Date object
 */
export function parseDate(dateString: string): Date {
  // First standardize the date format
  const standardizedDate = standardizeDate(dateString);
  // Then create a Date object from it
  return new Date(standardizedDate);
}
