import { Schematic } from "../structure/Schematic.js";
import { ranInt } from "../utils/math.js";
export default Schematic.registerFeature({
    name: "autoDaily",
    cooldown: () => {
        const now = new Date();
        const nextDay = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, ranInt(0, 5), ranInt(0, 59), ranInt(0, 59));
        return nextDay.getTime() - now.getTime();
    },
    condition: async ({ agent: { config } }) => {
        if (!config.autoDaily)
            return false;
        return true;
    },
    run: async ({ agent }) => {
        agent.send("daily");
        agent.config.autoDaily = false; // Disable autoDaily after running
    }
});
