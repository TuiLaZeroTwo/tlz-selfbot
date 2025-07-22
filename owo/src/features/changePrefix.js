import { Schematic } from "../structure/Schematic.js";
import { logger } from "../utils/logger.js";
export default Schematic.registerFeature({
    name: "changePrefix",
    cooldown: () => 5 * 60 * 1000,
    condition: async ({ agent }) => {
        if (!agent.config.useCustomPrefix)
            return false;
        return true;
    },
    run: async ({ agent, t }) => {
        // **⚙️ | Konbanwa**, the current prefix is set to **`o`**!
        const response = await agent.awaitResponse({
            trigger: () => agent.send("prefix"),
            filter: (m) => m.author.id === agent.owoID
                && m.content.includes(m.guild?.members.me?.displayName)
                && m.content.includes("the current prefix is set to"),
            expectResponse: true,
        });
        if (!response)
            return;
        const newPrefix = response.content.match(/the current prefix is set to\s*\*\*`([^`]+)`\*\*/i)?.[1];
        if (!newPrefix) {
            logger.warn(t("features.changePrefix.noPrefixFound"));
            return;
        }
        agent.prefix = newPrefix;
        agent.config.useCustomPrefix = false;
        logger.info(t("features.changePrefix.prefixChanged", { prefix: newPrefix }));
    }
});
