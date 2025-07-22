import { NotificationService } from "../services/NotificationService.js";
import { t } from "../utils/locales.js";
import { logger } from "../utils/logger.js";
export class CriticalEventHandler {
    static handleRejection(params) {
        process.on("unhandledRejection", (reason, promise) => {
            logger.runtime("Unhandled Rejection at:");
            logger.runtime(`Promise: ${promise}`);
            logger.runtime(`Reason: ${reason}`);
        });
        process.on("uncaughtException", (error) => {
            logger.error("Uncaught Exception:");
            logger.error(error);
            // Optionally, you can notify the user or log to a file
            // consoleNotify("Uncaught Exception", `Error: ${error.message}\nStack: ${error.stack}`);
        });
        process.on("SIGINT", () => {
            logger.info(t("events.sigint"));
            NotificationService.consoleNotify(params);
            // Optionally, you can notify the user or log to a file
            // consoleNotify("Stopping Selfbot", "Received SIGINT. Stopping selfbot...");
            process.exit(0);
        });
        process.on("SIGTERM", () => {
            logger.info(t("events.sigterm"));
            NotificationService.consoleNotify(params);
            process.exit(0);
        });
    }
    static handleBan({ t }) {
        logger.alert(`${t("status.states.banned")}, ${t("status.states.stop")}`);
        // consoleNotify(...)
        process.exit(-1);
    }
    static async handleNoMoney(params) {
        const { agent, t } = params;
        if (agent.config.autoSell) {
            logger.warn(t("handlers.criticalEvent.noMoney.attemptingSell"));
            const sellResponse = await agent.awaitResponse({
                trigger: () => agent.send("sell all"),
                filter: (msg) => msg.author.id === agent.owoID && msg.content.includes(msg.guild?.members.me?.displayName)
                    && (/sold.*for a total of/.test(msg.content) || msg.content.includes("You don't have enough animals!")),
            });
            if (!sellResponse) {
                logger.error("Failed to sell items. No response received.");
                return;
            }
            if (/sold.*for a total of/.test(sellResponse.content)) {
                logger.data(sellResponse.content.replace(/<a?:(\w+):\d+>/g, '$1').replace("**", "")); // Replace emojis with their names
            }
            else {
                logger.warn(t("handlers.criticalEvent.noMoney.noItems"));
                NotificationService.consoleNotify(params);
                process.exit(-1);
            }
        }
        else {
            logger.warn(t("handlers.criticalEvent.noMoney.autoSellDisabled"));
            NotificationService.consoleNotify(params);
            process.exit(-1);
        }
    }
}
