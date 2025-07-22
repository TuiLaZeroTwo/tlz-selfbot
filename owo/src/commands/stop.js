import { NotificationService } from "../services/NotificationService.js";
import { Schematic } from "../structure/Schematic.js";
import { logger } from "../utils/logger.js";
export default Schematic.registerCommand({
    name: "stop",
    description: "commands.stop.description",
    usage: "stop",
    execute: async ({ agent, message, t, locale }) => {
        try {
            // Send stopping message
            const msg = await message.reply({
                content: t("commands.stop.stopping")
            });
            // Log the termination
            NotificationService.consoleNotify({
                agent,
                t,
                locale
            });
            logger.info(t("status.states.terminated"));
            // Small delay to ensure message is sent
            setTimeout(() => {
                // Send final message
                msg.edit({
                    content: t("commands.stop.terminated")
                }).finally(() => {
                    // Terminate the process
                    process.exit(0);
                });
            }, 1000);
        }
        catch (error) {
            logger.error("Error during stop command execution:");
            logger.error(error);
            // Force exit even if there's an error
            process.exit(1);
        }
    }
});
