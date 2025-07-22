import { Collection } from "discord.js-selfbot-v13";
/**
 * Manages cooldowns for features and commands, allowing you to set and check cooldown periods.
 *
 * This class provides methods to set cooldowns for specific features or commands and to check if a cooldown is currently active.
 * Cooldowns are tracked using a key composed of the type ("feature" or "command") and the name.
 *
 * @example
 * const manager = new CooldownManager();
 * manager.set("command", "ping", 5000); // Set a 5-second cooldown for the "ping" command
 * const remaining = manager.onCooldown("command", "ping"); // Get remaining cooldown time in ms
 */
export class CooldownManager {
    cooldowns = new Collection();
    getKey(type, name) {
        return `${type}:${name}`;
    }
    /**
     * Checks if a feature or command is currently on cooldown.
     * @returns The remaining cooldown time in milliseconds, or 0 if not on cooldown.
     */
    onCooldown(type, name) {
        const key = this.getKey(type, name);
        const expirationTime = this.cooldowns.get(key);
        if (!expirationTime) {
            return 0;
        }
        return Math.max(expirationTime - Date.now(), 0);
    }
    /**
     * Sets a cooldown for a feature or command.
     * @param time The cooldown duration in milliseconds.
     */
    set(type, name, time) {
        const key = this.getKey(type, name);
        const expirationTime = Date.now() + time;
        this.cooldowns.set(key, expirationTime);
    }
}
