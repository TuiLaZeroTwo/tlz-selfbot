import { Schematic } from "../structure/Schematic.js";
import { logger } from "../utils/logger.js";
import { ranInt } from "../utils/math.js";
import { CaptchaService } from "../services/CaptchaService.js";
import { t } from "../utils/locales.js";
const solvePassword = async (attachmentUrl, options) => {
    if ("provider" in options && "apiKey" in options) {
        const { provider, apiKey } = options;
        const solver = new CaptchaService({
            provider,
            apiKey
        });
        const result = await solver.solveImageCaptcha(attachmentUrl);
        const isValidResult = /^\w{5}$/.test(result);
        if (!isValidResult) {
            logger.warn(t("features.autoHuntbot.errors.invalidCaptchaResult", { result }));
            return undefined;
        }
        logger.data(t("captcha.solutionFound", { result }));
        return result;
    }
    const { agent } = options;
    const installedApps = await agent.client.authorizedApplications();
    if (!installedApps.some(app => app.application.id === agent.miraiID))
        await agent.client.installUserApps(agent.miraiID);
    const passwordMsg = await agent.awaitSlashResponse({
        bot: agent.miraiID,
        command: "solve huntbot",
        args: [undefined, attachmentUrl],
    });
    try {
        const res = JSON.parse(passwordMsg.content);
        logger.data(t("captcha.solutionFound", { result: res.result, avgConfidence: res.avgConfidence }));
        return res.result;
    }
    catch (error) {
        logger.error("Failed to parse captcha response:");
        logger.error(error);
    }
    return undefined;
};
const upgradeTrait = async ({ agent, t }, trait, fields) => {
    const essenceField = fields.find(f => f.name.includes("Animal Essence"));
    if (!essenceField) {
        logger.debug("Failed to retrieve essence field");
        return;
    }
    let essence = parseInt(essenceField.name.match(/Animal Essence - `([\d,]+)`/i)?.[1].replace(/,/g, "") || "0");
    const traitField = fields.find(f => f.name.toLowerCase().includes(trait));
    if (!traitField) {
        logger.debug(`Trait ${trait} not found in huntbot response`);
        return;
    }
    const essenceMatch = traitField.value.match(/\[(\d+)\/(\d+)]/);
    if (!essenceMatch) {
        logger.debug(`Failed to parse essence for trait ${trait}`);
        return;
    }
    const currentEssence = parseInt(essenceMatch[1] || "0");
    const requiredEssence = parseInt(essenceMatch[2] || "0");
    const missingEssence = requiredEssence - currentEssence;
    logger.data(t("features.autoTrait.essenceStatus", {
        trait,
        current: currentEssence,
        required: requiredEssence,
        available: missingEssence
    }));
    if (missingEssence > essence) {
        logger.info(t("features.autoTrait.errors.notEnoughEssence"));
        return;
    }
    else {
        await agent.send(`upgrade ${trait} level`);
    }
};
export default Schematic.registerFeature({
    name: "autoHuntbot",
    options: {
        overrideCooldown: true,
    },
    cooldown: () => ranInt(10 * 60 * 1000, 15 * 60 * 1000), // 10 to 15 minutes
    condition: ({ agent }) => {
        return agent.config.autoHuntbot;
    },
    run: async (options) => {
        const { agent, t } = options;
        const huntbotMsg = await agent.awaitResponse({
            trigger: () => agent.send("huntbot"),
            filter: m => m.author.id === agent.owoID
                && (m.content.includes("BEEP BOOP. I AM BACK")
                    || (m.embeds.length > 0
                        && m.embeds[0].author !== null
                        && m.embeds[0].author.name.includes(m.guild?.members.me?.displayName)
                        && m.embeds[0].author.name.includes("HuntBot")))
        });
        if (!huntbotMsg)
            return;
        if (huntbotMsg.embeds.length === 0) {
            const statsRegex = /BACK WITH (\d+) ANIMALS,`\n(?:.|\n)*?`(\d+) ESSENCE, AND (\d+) EXPERIENCE/;
            const statsMatch = huntbotMsg.content.match(statsRegex);
            logger.info(t("features.autoHuntbot.stats.huntbot"));
            logger.data(t("features.autoHuntbot.stats.animals", { count: statsMatch?.[1] || "unknown" }));
            logger.data(t("features.autoHuntbot.stats.essence", { amount: statsMatch?.[2] || "unknown" }));
            logger.data(t("features.autoHuntbot.stats.exp", { amount: statsMatch?.[3] || "unknown" }));
            return 30_000; // Retry in 30 seconds if no embed found
        }
        const fields = huntbotMsg.embeds[0].fields;
        if (fields[fields.length - 1].name.includes("HUNTBOT is currently hunting!")) {
            const huntingField = fields.pop();
            if (!huntingField) {
                logger.debug("Failed to retrieve hunting field (In hunting)");
                return;
            }
            const match = huntingField.value.match(/IN\s((\d+)H\s)?(\d+)M/i);
            if (match) {
                return parseInt(match[2] || "0") * 60 * 60 * 1000
                    + parseInt(match[3]) * 60 * 1000
                    + ranInt(0, 5 * 60 * 1000); // Add random upto 5 mins
            }
            return;
        }
        if (agent.config.autoTrait)
            await upgradeTrait(options, agent.config.autoTrait, fields);
        const passwordMsg = await agent.awaitResponse({
            trigger: () => agent.send("huntbot 24h"),
            filter: m => m.author.id === agent.owoID
                && m.content.includes(m.guild?.members.me?.displayName)
                && (m.content.includes("I AM STILL HUNTING")
                    || (m.content.includes("Here is your password!")
                        && m.attachments.size > 0
                        && m.attachments.first()?.name?.endsWith(".png") === true)
                    || m.content.includes("Please include your password")),
        });
        if (!passwordMsg)
            return;
        if (passwordMsg.content.includes("Please include your password")) {
            return parseInt(passwordMsg.content.match(/Password will reset in (\d+) minutes/)?.[1] || "10") * 60 * 1000; // Reset in 10 minutes
        }
        if (passwordMsg.content.includes("I AM STILL HUNTING")) {
            const matchTime = passwordMsg.content.match(/IN\s((\d+)H\s)?(\d+)M/m);
            const hours = parseInt(matchTime?.[2] || "0");
            const minutes = parseInt(matchTime?.[3] || "10");
            logger.info(t("features.autoHuntbot.inHunting", { hours, minutes }));
            return hours * 60 * 60 * 1000 + minutes * 60 * 1000 + ranInt(0, 5 * 60 * 1000); // Add random upto 5 mins
        }
        const attachmentUrl = passwordMsg.attachments.first()?.url;
        if (!attachmentUrl)
            return;
        let password;
        if (agent.config.captchaAPI && agent.config.apiKey && !agent.config.useAdotfAPI) {
            password = await solvePassword(attachmentUrl, {
                provider: agent.config.captchaAPI,
                apiKey: agent.config.apiKey
            });
        }
        else {
            if (!agent.config.useAdotfAPI) {
                logger.warn(t("features.autoHuntbot.errors.noCaptchaAPI"));
            }
            password = await solvePassword(attachmentUrl, options);
        }
        if (!password)
            return;
        const resultMsg = await agent.awaitResponse({
            trigger: () => agent.send(`huntbot 24h ${password}`),
            filter: m => m.author.id === agent.owoID
                && m.content.includes(m.guild?.members.me?.displayName)
                && m.content.includes("BEEP BOOP.")
        });
        if (!resultMsg)
            return;
        const matchTime = resultMsg.content.match(/IN\s((\d+)H)?(\d+)M/m);
        const hours = parseInt(matchTime?.[2] || "0");
        const minutes = parseInt(matchTime?.[3] || "10");
        logger.info(t("features.autoHuntbot.huntbotSent", { hours, minutes }));
        return hours * 60 * 60 * 1000
            + minutes * 60 * 1000
            + ranInt(0, 5 * 60 * 1000); // Add random upto 5 mins
    }
});
