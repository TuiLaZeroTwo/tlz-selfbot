export const mapInt = (number, min, max, newMin, newMax) => {
    if (min === max) {
        throw new Error("Min and max cannot be the same value.");
    }
    const ratio = (number - min) / (max - min);
    return Math.floor(newMin + ratio * (newMax - newMin));
};

export const ranInt = (min, max, abs = true) => {
    if (min === max) {
        throw new Error("Min and max cannot be the same value.");
    }
    const randomValue = Math.floor(Math.random() * (max - min) + min);
    return abs ? Math.abs(randomValue) : randomValue;
};

export const gaussianRandom = (mean = 0, stdDev = 1) => {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdDev + mean;
};

export const humanLikeDelay = (baseDelay, variance = 0.3) => {
    const gaussian = gaussianRandom(1, variance);
    const delay = Math.max(baseDelay * Math.abs(gaussian), baseDelay * 0.1);
    return Math.floor(delay);
};

export const exponentialBackoff = (attempt, baseDelay = 1000, maxDelay = 30000) => {
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = delay * 0.1 * Math.random();
    return Math.floor(delay + jitter);
};

export const weightedRandom = (weights) => {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) return i;
    }
    return weights.length - 1;
};

export const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};
