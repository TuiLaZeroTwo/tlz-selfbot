import { z } from "zod/v4";
export const ConfigSchema = z.object({
    username: z.string().optional(),
    token: z.string().refine(value => value.split(".").length === 3, {
        error: "Token must have three parts separated by dots"
    }),
    guildID: z.string(),
    channelID: z.array(z.string()).min(1, {
        error: "At least one channel ID is required"
    }),
    wayNotify: z.array(z.enum([
        "webhook",
        "dms",
        "call",
        "music",
        "popup"
    ])).default([]),
    webhookURL: z.url().optional(),
    adminID: z.string().optional(),
    musicPath: z.string().optional(),
    prefix: z.string().optional(),
    captchaAPI: z.enum(["2captcha", "yescaptcha"]).optional(),
    apiKey: z.string().optional(),
    autoHuntbot: z.boolean().default(true),
    autoTrait: z.enum([
        "efficiency",
        "duration",
        "cost",
        "gain",
        "experience",
        "radar"
    ]).optional(),
    useAdotfAPI: z.boolean().default(true).optional(),
    autoPray: z.array(z.string()).default(["pray"]),
    autoGem: z.union([z.literal(0), z.literal(-1), z.literal(1)]).default(0),
    gemTier: z.array(z.enum([
        "common",
        "uncommon",
        "rare",
        "epic",
        "mythical",
        "legendary",
        "fabled"
    ])).default([
        "common",
        "uncommon",
        "rare",
        "epic",
        "mythical",
    ]).optional(),
    useSpecialGem: z.boolean().default(false).optional(),
    autoLootbox: z.boolean().default(true).optional(),
    autoFabledLootbox: z.boolean().default(false).optional(),
    autoQuote: z.array(z.enum([
        "owo",
        "quote"
    ])).default(["owo"]),
    autoRPP: z.array(z.enum([
        "run",
        "pup",
        "piku"
    ])).default(["run", "pup", "piku"]),
    autoDaily: z.boolean().default(true),
    autoCookie: z.boolean().default(true),
    autoClover: z.boolean().default(true),
    useCustomPrefix: z.boolean().default(true),
    autoSleep: z.boolean().default(true),
    autoSell: z.boolean().default(true),
    autoReload: z.boolean().default(true),
    autoResume: z.boolean().default(true),
    showRPC: z.boolean().default(true),
}).check(({ issues, value }) => {
    if (value.wayNotify.includes("webhook") && !value.webhookURL) {
        issues.push({
            code: "custom",
            input: value.webhookURL,
            message: "Webhook URL is required when 'webhook' is selected in wayNotify"
        });
    }
    if ((value.wayNotify.includes("dms") || value.wayNotify.includes("call")) && !value.adminID) {
        issues.push({
            code: "custom",
            input: value.adminID,
            message: "Admin ID is required when 'dms' or 'call' is selected in wayNotify"
        });
    }
    if (value.wayNotify.includes("music") && !value.musicPath) {
        issues.push({
            code: "custom",
            input: value.musicPath,
            message: "Music path is required when 'music' is selected in wayNotify"
        });
    }
    if (value.captchaAPI && !value.apiKey) {
        issues.push({
            code: "custom",
            input: value.apiKey,
            message: "API key is required when captchaAPI is set"
        });
    }
    if (value.autoGem !== 0) {
        if (!value.gemTier || value.gemTier.length === 0) {
            issues.push({
                code: "custom",
                input: value.gemTier,
                message: "At least one gem tier is required when autoGem is enabled"
            });
        }
    }
});
