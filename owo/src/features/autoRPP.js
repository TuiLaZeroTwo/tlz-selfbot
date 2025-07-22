import { Schematic } from "../structure/Schematic.js";
import { ranInt } from "../utils/math.js";
export default Schematic.registerFeature({
    name: "autoRPP",
    cooldown: () => ranInt(60, 120) * 1000,
    condition: async ({ agent: { config } }) => {
        if (!config.autoRPP || config.autoRPP.length <= 0)
            return false;
        return true;
    },
    run: async ({ agent }) => {
        const command = agent.config.autoRPP[ranInt(0, agent.config.autoRPP.length)];
        const limited = await agent.awaitResponse({
            trigger: () => agent.send(command),
            filter: (m) => m.author.id == agent.owoID
                && (m.content.startsWith("🚫 **|** ")
                    || m.content.startsWith(":no_entry_sign: **|** ")),
        });
        if (limited) {
            agent.config.autoRPP = agent.config.autoRPP.filter(c => c !== command);
            return;
        }
    }
});
