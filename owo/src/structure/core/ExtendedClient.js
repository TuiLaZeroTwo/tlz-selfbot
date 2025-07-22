import { Client } from "discord.js-selfbot-v13";
import { logger } from "../../utils/logger.js";
import { ranInt } from "../../utils/math.js";
export class ExtendedClient extends Client {
    constructor(options = {}) {
        super(options);
    }
    registerEvents = () => {
        this.on("debug", logger.debug);
        this.on("warn", logger.warn);
        this.on("error", logger.error);
    };
    sendMessage = async (message, { channel, prefix = "", typing = ranInt(500, 1000), skipLogging = false, }) => {
        await channel.sendTyping();
        await this.sleep(typing);
        const command = message.startsWith(prefix) ? message : `${prefix} ${message}`;
        channel.send(command);
        if (!skipLogging)
            logger.sent(command);
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
