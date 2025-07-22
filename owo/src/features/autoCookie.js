import { Schematic } from "../structure/Schematic.js";
import { logger } from "../utils/logger.js";
export default Schematic.registerFeature({
    name: "autoCookie",
    cooldown: () => {
        const date = new Date();
        return date.setDate(date.getDate() + 1) - Date.now();
    },
    condition: async ({ agent, t }) => {
        if (!agent.config.autoCookie)
            return false;
        if (!agent.config.adminID) {
            logger.warn(t("features.common.errors.noAdminID", { feature: "autoCookie" }));
            agent.config.autoCookie = false; // Disable autoCookie if adminID is not set
            return false;
        }
        const admin = agent.client.users.cache.get(agent.config.adminID);
        if (!admin || admin.id === admin.client.user?.id) {
            logger.warn(t("features.common.errors.invalidAdminID", { feature: "autoCookie" }));
            agent.config.autoCookie = false;
            return false;
        }
        return true;
    },
    run: async ({ agent }) => {
        await agent.send(`cookie ${agent.config.adminID}`);
        agent.config.autoCookie = false; // Disable autoCookie after sending the message
    },
});
