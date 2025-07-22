/**
 * Formats the duration between two timestamps into a human-readable string.
 *
 * The output format is: "{days}d {hh}:{mm}:{ss}", where:
 * - {days} is the number of full days,
 * - {hh} is the number of hours (zero-padded to 2 digits),
 * - {mm} is the number of minutes (zero-padded to 2 digits),
 * - {ss} is the number of seconds (zero-padded to 2 digits).
 *
 * @param startTimestamp - The start time in milliseconds since the Unix epoch.
 * @param endTimestamp - The end time in milliseconds since the Unix epoch.
 * @returns A formatted string representing the duration between the two timestamps.
 */
export const formatTime = (startTimestamp, endTimestamp) => {
    const duration = endTimestamp - startTimestamp;
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    const days = Math.floor(duration / (1000 * 60 * 60 * 24));
    const pad = (n) => String(n).padStart(2, "0");
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};
/**
 * Parses a time string with a unit suffix (e.g., "10s", "5m", "2h", "1d") and converts it to milliseconds.
 *
 * @param timeStr - The time string to parse. Must be in the format of a number followed by a unit ('s', 'm', 'h', or 'd').
 * @returns The equivalent time in milliseconds, or `null` if the input is invalid.
 *
 * @example
 * parseTimeString("10s"); // returns 10000
 * parseTimeString("5m");  // returns 300000
 * parseTimeString("2h");  // returns 7200000
 * parseTimeString("1d");  // returns 86400000
 * parseTimeString("invalid"); // returns null
 */
export const parseTimeString = (timeStr) => {
    const match = timeStr.match(/^(\d+)([smhd])$/i);
    if (!match)
        return null;
    const [, value, unit] = match;
    const num = parseInt(value, 10);
    switch (unit.toLowerCase()) {
        case 's': return num * 1000; // seconds
        case 'm': return num * 60 * 1000; // minutes
        case 'h': return num * 60 * 60 * 1000; // hours
        case 'd': return num * 24 * 60 * 60 * 1000; // days
        default: return null;
    }
};
