import { Client } from "discord.js-selfbot-v13";
import { logger } from "../../utils/logger.js";
import { ranInt, humanLikeDelay } from "../../utils/math.js";
import { createConnectionMonitor } from "../../utils/connection.js";
export class ExtendedClient extends Client {
    constructor(options = {}) {
        super(options);
        this.connectionMonitor = createConnectionMonitor(this);
        this.messageQueue = [];
        this.isProcessingQueue = false;
    }

    registerEvents = () => {
        this.on("debug", logger.debug);
        this.on("warn", logger.warn);
        this.on("error", logger.error);
        this.connectionMonitor.startMonitoring();
    };

    sendMessage = async (message, { channel, prefix = "", typing = humanLikeDelay(ranInt(500, 1000), 0.3), skipLogging = false, priority = false }) => {
        const messageData = { message, channel, prefix, typing, skipLogging };

        if (priority) {
            this.messageQueue.unshift(messageData);
        } else {
            this.messageQueue.push(messageData);
        }

        if (!this.isProcessingQueue) {
            this.processMessageQueue();
        }
    };

    processMessageQueue = async () => {
        if (this.isProcessingQueue || this.messageQueue.length === 0) return;

        this.isProcessingQueue = true;

        while (this.messageQueue.length > 0) {
            const { message, channel, prefix, typing, skipLogging } = this.messageQueue.shift();

            try {
                if (this.connectionMonitor.shouldDelayOperations()) {
                    const delay = this.connectionMonitor.getRecommendedDelay();
                    logger.debug(`Delaying message due to connection health: ${delay}ms`);
                    await this.sleep(delay);
                }

                await channel.sendTyping();
                await this.sleep(typing);

                const command = message.startsWith(prefix) ? message : `${prefix} ${message}`;
                await channel.send(command);

                if (!skipLogging) {
                    logger.sent(command);
                }

                const interMessageDelay = humanLikeDelay(ranInt(800, 2000), 0.4);
                await this.sleep(interMessageDelay);

            } catch (error) {
                logger.error(`Failed to send message: ${error.message}`);

                if (error.code === 50007 || error.code === 50013) {
                    logger.warn("Cannot send messages to this channel, removing from queue");
                    continue;
                }

                this.messageQueue.unshift({ message, channel, prefix, typing, skipLogging });
                await this.sleep(humanLikeDelay(5000, 0.5));
                break;
            }
        }

        this.isProcessingQueue = false;
    };
    checkAccount = (token) => {
        return new Promise((resolve, reject) => {
            this.once("ready", () => resolve(this.user?.id));
            try {
                if (token) {
                    this.login(token);
                }
                else {
                    this.QRLogin();
                }
            }
            catch (error) {
                reject(error);
            }
        });
    };
}
