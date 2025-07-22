import { logger } from "../../utils/logger.js";
import { t } from "../../utils/locales.js";
export class CallNotifier {
    async execute(params, payload) {
        const { agent } = params;
        const { urgency } = payload;
        if (!agent.config.adminID) {
            logger.warn(t("error.adminID.notconfigured"));
            return;
        }
        if (urgency !== "critical") {
            logger.debug("Skipping Call Notifier execution due to non-critical urgency.");
            return;
        }
        try {
            const admin = await agent.client.users.fetch(agent.config.adminID);
            const dms = await admin.createDM();
            await dms.ring();
            const connection = await agent.client.voice.joinChannel(dms, {
                selfDeaf: false,
                selfMute: true,
                selfVideo: false,
            });
            setTimeout(() => {
                connection.disconnect();
                logger.debug("Disconnected from voice channel after 60 seconds.");
            }, 60_000);
        }
        catch (error) {
            logger.error(`Error in CallNotifier: ${error instanceof Error ? error.message : String(error)}`);
            logger.error(error instanceof Error ? error.stack || "No stack trace available" : "Unknown error occurred during Call Notifier execution.");
            return Promise.reject(error);
        }
    }
}
