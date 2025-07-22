/**
 * Creates a proxy around a configuration object to watch for property changes.
 *
 * @template T - The type of the configuration object.
 * @template U - The return type of the callback function.
 * @param config - The configuration object to be watched.
 * @param callback - A function that is called whenever a property on the config object is set to a new value.
 * The callback receives the property key, the old value, and the new value as arguments.
 * @returns A proxied version of the configuration object that triggers the callback on property changes.
 */
export const watchConfig = (config, callback) => {
    return new Proxy(config, {
        set(target, property, value) {
            if (typeof property === "string" && property in target) {
                const key = property;
                if (target[key] !== value)
                    callback(key, target[key], value);
                target[key] = value;
                return true;
            }
            return false;
        },
        get(target, property) {
            if (typeof property === "string" && property in target) {
                const key = property;
                return target[key];
            }
            return undefined;
        }
    });
};
