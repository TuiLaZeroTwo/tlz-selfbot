import { Schematic } from "../structure/Schematic.js";
import { logger } from "../utils/logger.js";
export default Schematic.registerFeature({
    name: "autoClover",
    cooldown: () => {
        const date = new Date();
        return date.setDate(date.getDate() + 1) - Date.now();
    },
    condition: async ({ agent, t }) => {
        if (!agent.config.autoClover)
            return false;
        if (!agent.config.adminID) {
            logger.warn(t("features.common.errors.noAdminID", { feature: "autoClover" }));
            agent.config.autoClover = false;
            return false;
        }
        const admin = agent.client.users.cache.get(agent.config.adminID);
        if (!admin || admin.id === admin.client.user?.id) {
            logger.warn(t("features.common.errors.invalidAdminID", { feature: "autoClover" }));
            agent.config.autoClover = false;
            return false;
        }
        return true;
    },
    run: async ({ agent }) => {
        await agent.send(`clover ${agent.config.adminID}`);
        agent.config.autoClover = false; // Disable autoClover after sending the message
    },
});
