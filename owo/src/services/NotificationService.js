import { logger } from "../utils/logger.js";
import { WebhookNotifier } from "./notifiers/WebhookNotifier.js";
import { MessageNotifier } from "./notifiers/MessageNotifier.js";
import { CallNotifier } from "./notifiers/CallNotifier.js";
import { SoundNotifier } from "./notifiers/SoundNotifier.js";
import { PopupNotifier } from "./notifiers/PopupNotifier.js";
import { formatTime } from "../utils/time.js";
export class NotificationService {
    strategies;
    constructor() {
        this.strategies = new Map([
            ["webhook", new WebhookNotifier()],
            ["dms", new MessageNotifier()],
            ["call", new CallNotifier()],
            ["music", new SoundNotifier()],
            ["popup", new PopupNotifier()],
        ]);
    }
    async notify(params, payload) {
        const enabledNotifiers = params.agent.config.wayNotify;
        logger.debug(`Sending notification to: ${enabledNotifiers.join(", ")}`);
        const notificationPromises = enabledNotifiers.map(async (notifierName) => {
            const strategy = this.strategies.get(notifierName);
            if (strategy) {
                // Wrap in a promise to catch any synchronous errors in execute
                try {
                    return await Promise.resolve(strategy.execute(params, payload));
                }
                catch (err) {
                    logger.error(`Unhandled error in ${notifierName} notifier:`);
                    logger.error(err);
                }
            }
            logger.warn(`Unknown notifier specified in config: ${notifierName}`);
            return Promise.resolve();
        });
        await Promise.all(notificationPromises);
    }
    static consoleNotify({ agent, t }) {
        logger.data(t("status.total.texts", { count: agent.totalTexts }));
        logger.data(t("status.total.commands", { count: agent.totalCommands }));
        logger.data(t("status.total.captchaSolved", { count: agent.totalCaptchaSolved }));
        logger.data(t("status.total.captchaFailed", { count: agent.totalCaptchaFailed }));
        logger.data(t("status.total.uptime", { duration: formatTime(agent.client.readyTimestamp, Date.now()) }));
    }
}
