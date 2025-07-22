import { CriticalEventHandler } from "../handlers/CriticalEventHandler.js";
import { CaptchaService } from "../services/CaptchaService.js";
import { Schematic } from "../structure/Schematic.js";
import { NORMALIZE_REGEX } from "../typings/constants.js";
import { logger } from "../utils/logger.js";
export default Schematic.registerEvent({
    name: "owoMessageEvent",
    event: "messageCreate",
    handler: async (params, message) => {
        const { agent, t, locale } = params;
        if (message.author.id !== agent.owoID)
            return;
        const normalizedContent = message.content.normalize("NFC").replace(NORMALIZE_REGEX, "");
        const isForThisUser = message.channel.type === "DM" ||
            normalizedContent.includes(message.client.user?.id) ||
            normalizedContent.includes(message.client.user?.username) ||
            normalizedContent.includes(message.client.user?.displayName) ||
            normalizedContent.includes(message.guild?.members.me?.displayName);
        if (!isForThisUser)
            return;
        // 1. Check for Captcha
        if (/are you a real human|(check|verify) that you are.{1,3}human!/img.test(normalizedContent)) {
            logger.alert(`Captcha detected in channel: ${message.channel.type === "DM"
                ? message.channel.recipient.displayName
                : message.channel.name}!`);
            agent.captchaDetected = true;
            return CaptchaService.handleCaptcha({ agent, t, locale }, message);
        }
        // 2. Check for Captcha Success
        if (/verified that you are.{1,3}human!/igm.test(normalizedContent)) {
            logger.info(`CAPTCHA HAS BEEN RESOLVED, ${agent.config.autoResume ? "RESTARTING SELFBOT" : "STOPPING SELFBOT"}...`);
            if (!agent.config.autoResume)
                process.exit(0);
            agent.captchaDetected = false;
            agent.farmLoop();
        }
        // 3. Check for Ban
        if (/have been banned/.test(normalizedContent)) {
            return CriticalEventHandler.handleBan(params);
        }
        // 4. Check for No Money
        if (normalizedContent.includes("You don't have enough cowoncy!")) {
            return CriticalEventHandler.handleNoMoney(params);
        }
    }
});
