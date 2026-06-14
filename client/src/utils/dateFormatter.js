/**
 * Formats a date string or Date object to the standard UI format:
 * "Sun 14 Jun 2026 9:11 PM"
 * 
 * @param {string|Date|number} dateInput - The date to format
 * @returns {string} The formatted date string
 */
export const formatFullDateTime = (dateInput) => {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';

  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const parts = formatter.formatToParts(d);
  const partMap = {};
  parts.forEach(p => {
    partMap[p.type] = p.value;
  });

  const weekday = partMap.weekday || '';
  const day = partMap.day || '';
  const month = partMap.month || '';
  const year = partMap.year || '';
  const hour = partMap.hour || '';
  const minute = partMap.minute || '';
  const dayPeriod = (partMap.dayPeriod || '').toUpperCase();

  // Return standard format: Sun 14 Jun 2026 9:11 PM
  return `${weekday} ${day} ${month} ${year} ${hour}:${minute} ${dayPeriod}`;
};

/**
 * Formats a date string or Date object to a shorter format with time:
 * "14 Jun 2026, 9:11 PM"
 * 
 * @param {string|Date|number} dateInput - The date to format
 * @returns {string} The formatted date string
 */
export const formatShortDateTime = (dateInput) => {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';

  const formatter = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const parts = formatter.formatToParts(d);
  const partMap = {};
  parts.forEach(p => {
    partMap[p.type] = p.value;
  });

  const day = partMap.day || '';
  const month = partMap.month || '';
  const year = partMap.year || '';
  const hour = partMap.hour || '';
  const minute = partMap.minute || '';
  const dayPeriod = (partMap.dayPeriod || '').toUpperCase();

  // Return short format: 14 Jun 2026 9:11 PM
  return `${day} ${month} ${year} ${hour}:${minute} ${dayPeriod}`;
};

/**
 * Formats a date string or Date object to a short date only format:
 * "14 Jun 2026"
 * 
 * @param {string|Date|number} dateInput - The date to format
 * @returns {string} The formatted date string
 */
export const formatShortDate = (dateInput) => {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';

  const formatter = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const parts = formatter.formatToParts(d);
  const partMap = {};
  parts.forEach(p => {
    partMap[p.type] = p.value;
  });

  const day = partMap.day || '';
  const month = partMap.month || '';
  const year = partMap.year || '';

  // Return short date format: 14 Jun 2026
  return `${day} ${month} ${year}`;
};
