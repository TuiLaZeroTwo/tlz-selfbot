import fs from "node:fs";
import path from "node:path";
import { logger } from "../utils/logger.js";
import { t } from "../utils/locales.js";
export const command = "generate [filename]";
export const desc = "Generate a new config file";
export const builder = {
    filename: {
        type: "string",
        default: "config-sample.json",
        description: "The name of the config file to generate",
    },
};
export const handler = async (argv) => {
    const configTemplate = {
        token: "<your-token>",
        guildID: "<your-guild-id>",
        channelID: ["<your-channel-id-1>", "<your-channel-id-2>", "<your-channel-id-3>"],
        wayNotify: ["webhook", "dms", "call", "music", "popup"],
        webhookURL: "https://your-webhook-url.com",
        adminID: "<your-admin-id>",
        musicPath: "./path/to/music.mp3",
        prefix: "!",
        captchaAPI: "2captcha",
        apiKey: "<your-captcha-api-key>",
        autoHuntbot: true,
        autoTrait: "efficiency",
        useAdotfAPI: true,
        autoPray: ["pray", "pray some-ID-here"],
        autoGem: 1,
        gemTier: ["common", "uncommon", "rare", "epic", "mythical"],
        useSpecialGem: false,
        autoLootbox: true,
        autoFabledLootbox: false,
        autoQuote: ["owo", "quote"],
        autoRPP: ["run", "pup", "piku"],
        autoDaily: true,
        autoCookie: true,
        autoClover: true,
        useCustomPrefix: false,
        autoSell: true,
        autoSleep: true,
        autoReload: true,
        autoResume: true,
        showRPC: true
    };
    const filePath = path.resolve(process.cwd(), argv.filename);
    if (fs.existsSync(filePath)) {
        logger.error(t("cli.generate.fileExists", { filePath }));
        return;
    }
    fs.writeFileSync(filePath, JSON.stringify(configTemplate, null, 4));
    logger.info(t("cli.generate.configGenerated", { filePath }));
};
