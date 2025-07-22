import commandsHandler from "../handlers/commandsHandler.js";
import featuresHandler from "../handlers/featuresHandler.js";
import { Schematic } from "../structure/Schematic.js";
import { logger } from "../utils/logger.js";
const VALID_TARGETS = ["config", "commands", "features", "all"];
export default Schematic.registerCommand({
    name: "reload",
    description: "commands.reload.description",
    usage: "reload <config | commands | features | all>",
    execute: async ({ agent, message, t, locale, args }) => {
        const target = args?.[0]?.toLowerCase();
        const params = { agent, t, locale };
        if (!target || !VALID_TARGETS.includes(target)) {
            return message.reply({
                content: t("commands.reload.noTarget")
            });
        }
        try {
            const result = await executeReload(target, agent, params, t);
            message.reply({ content: result });
        }
        catch (error) {
            logger.error(`Reload failed for ${target}:`);
            logger.error(error);
            message.reply({
                content: t("commands.reload.error", { target, error: String(error).slice(0, 500) })
            });
        }
    }
});
async function executeReload(target, agent, params, t) {
    switch (target) {
        case "config":
            agent.reloadConfig();
            return t("commands.reload.success.config");
        case "commands":
            await commandsHandler.run(params);
            return t("commands.reload.success.commands", { count: agent.commands.size });
        case "features":
            await featuresHandler.run(params);
            return t("commands.reload.success.features", { count: agent.features.size });
        case "all":
            await Promise.all([
                commandsHandler.run(params),
                featuresHandler.run(params),
                Promise.resolve(agent.reloadConfig())
            ]);
            return t("commands.reload.success.all", {
                commandCount: agent.commands.size,
                featureCount: agent.features.size
            });
        default:
            throw new Error(`Unknown target: ${target}`);
    }
}
