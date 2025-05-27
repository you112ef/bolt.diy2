/**
 * Checks if the browser reports an online status.
 *
 * @returns {boolean} True if navigator.onLine is true, false otherwise.
 */
export const isOnline = (): boolean => {
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  // Default to true if navigator.onLine is not available (e.g., in SSR or non-browser environments)
  // This ensures that functionality relying on this check doesn't incorrectly assume offline status
  // in environments where the check is not applicable.
  return true;
};
