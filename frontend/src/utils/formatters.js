/**
 * Format address strings into short labels (first two comma-separated parts).
 * Example: "Indiranagar, Bengaluru, Karnataka 560038, India" -> "Indiranagar, Bengaluru"
 * Example: "Bengaluru, Karnataka" -> "Bengaluru, Karnataka"
 */
export const formatLocationLabel = (location) => {
  if (!location || typeof location !== 'string') return '';
  const parts = location
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 2) return location.trim();
  return `${parts[0]}, ${parts[1]}`;
};

/**
 * Format remaining minutes into human readable "Xh Ym left" when >= 60 minutes.
 * Example: 1408 -> "23h 28m left"
 * Example: 45 -> "45m left"
 */
export const formatTimeRemaining = (minutes) => {
  const mins = Math.max(0, parseInt(minutes, 10) || 0);
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m left`;
  }
  return `${mins}m left`;
};
