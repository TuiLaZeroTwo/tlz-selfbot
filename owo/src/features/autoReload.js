import { Schematic } from "../structure/Schematic.js";
import { ranInt } from "../utils/math.js";
export default Schematic.registerFeature({
    name: "autoReload",
    cooldown: () => {
        // Set cooldown to tomorrow at a random time
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, ranInt(0, 30), ranInt(0, 59), 0);
        return tomorrow.getTime() - Date.now();
    },
    condition: async ({ agent }) => {
        if (!agent.config.autoReload)
            return false;
        // Calculate if it's time to reload (after midnight of the next day)
        const now = new Date();
        const nextReloadTime = new Date(agent.client.readyTimestamp);
        nextReloadTime.setDate(nextReloadTime.getDate() + 1);
        nextReloadTime.setHours(0, ranInt(0, 30), ranInt(0, 59), 0);
        return now.getTime() >= nextReloadTime.getTime();
    },
    run: ({ agent }) => {
        agent.reloadConfig();
    }
});
