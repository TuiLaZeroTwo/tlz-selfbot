import { Schematic } from "../structure/Schematic.js";
import { logger } from "../utils/logger.js";
import { ranInt } from "../utils/math.js";
export default Schematic.registerFeature({
    name: "autoPray",
    cooldown: () => ranInt(5 * 60 * 1000, 8 * 60 * 1000),
    condition: async ({ agent: { config } }) => {
        if (!config.autoPray || config.autoPray.length <= 0)
            return false;
        return true;
    },
    run: async ({ agent, t }) => {
        const command = agent.config.autoPray[Math.floor(Math.random() * agent.config.autoPray.length)];
        const check = await agent.awaitResponse({
            trigger: () => agent.send(command),
            filter: (m) => m.author.id == agent.owoID
                && m.content.includes(m.guild?.members.me?.displayName)
                && m.content.includes("I could not find that user!"),
        });
        if (check) {
            logger.warn(t("features.autoPray.adminNotFound"));
            agent.config.autoPray = agent.config.autoPray.filter(c => c !== command);
        }
    }
});
