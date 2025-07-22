import { Schematic } from "../structure/Schematic.js";
import { formatTime, parseTimeString } from "../utils/time.js";
import { logger } from "../utils/logger.js";
export default Schematic.registerCommand({
    name: "pause",
    description: "commands.pause.description",
    usage: "pause [duration] (e.g., pause 1h, pause 30m, pause 45s)",
    execute: async ({ agent, message, t, args }) => {
        if (agent.farmLoopPaused) {
            return message.reply({
                content: t("commands.pause.alreadyPaused")
            });
        }
        const timeArg = args?.[0];
        let duration = null;
        if (timeArg) {
            duration = parseTimeString(timeArg);
            if (duration === null) {
                return message.reply({
                    content: t("commands.pause.invalidDuration")
                });
            }
            // Set reasonable limits (max 24 hours)
            if (duration > 24 * 60 * 60 * 1000) {
                return message.reply({
                    content: t("commands.pause.durationTooLong")
                });
            }
        }
        agent.farmLoopPaused = true;
        logger.info(t("logging.farmLoop.paused"));
        if (duration) {
            // Auto-resume after the specified duration
            setTimeout(() => {
                if (agent.farmLoopPaused) {
                    agent.farmLoopPaused = false;
                    logger.info(t("logging.farmLoop.resumed"));
                    if (!agent.farmLoopRunning) {
                        agent.farmLoop();
                    }
                    message.channel.send({
                        content: t("commands.pause.autoResumed")
                    });
                }
            }, duration);
            message.reply({
                content: t("commands.pause.successWithTimeout", {
                    duration: formatTime(0, duration)
                })
            });
        }
        else {
            message.reply({
                content: t("commands.pause.success")
            });
        }
    }
});
