/**
 * Maps an integer from one range to another, preserving the ratio between ranges.
 *
 * @param number - The input number to map.
 * @param min - The minimum value of the input range.
 * @param max - The maximum value of the input range.
 * @param newMin - The minimum value of the output range.
 * @param newMax - The maximum value of the output range.
 * @returns The mapped integer in the new range.
 * @throws {Error} If `min` and `max` are the same value.
 */
export const mapInt = (number, min, max, newMin, newMax) => {
    if (min === max) {
        throw new Error("Min and max cannot be the same value.");
    }
    const ratio = (number - min) / (max - min);
    return Math.floor(newMin + ratio * (newMax - newMin));
};
/**
 * Generates a random integer between `min` (inclusive) and `max` (exclusive).
 *
 * @param min - The minimum value (inclusive).
 * @param max - The maximum value (exclusive).
 * @param abs - If true, returns the absolute value of the random integer. Defaults to true.
 * @returns A random integer in the specified range, optionally absolute.
 * @throws {Error} If `min` and `max` are the same value.
 */
export const ranInt = (min, max, abs = true) => {
    if (min === max) {
        throw new Error("Min and max cannot be the same value.");
    }
    const randomValue = Math.floor(Math.random() * (max - min) + min);
    return abs ? Math.abs(randomValue) : randomValue;
};
