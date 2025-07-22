import { checkbox, input, select, Separator } from "@inquirer/prompts";
import axios from "axios";
import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";
import { BasePrompter } from "./core/BasePrompter.js";
import { t } from "../utils/locales.js";
export class ConfigPrompter extends BasePrompter {
    client;
    getConfig;
    static instance;
    audioRegex = /\.(mp3|wav|ogg|flac|aac|wma)$/;
    webhookRegex = /https:\/\/discord.com\/api\/webhooks\/\d{17,19}\/[a-zA-Z0-9_-]{60,68}/;
    constructor({ client, getConfig }) {
        super();
        this.client = client;
        this.getConfig = getConfig;
    }
    get config() {
        return this.getConfig();
    }
    listAccounts = (accounts) => this.ask((select), {
        message: t("ui.accounts.selectAccount"),
        choices: [
            ...accounts.map(account => ({
                name: account.username,
                value: account.id
            })),
            new Separator(),
            { name: t("ui.accounts.loginNewToken"), value: "token" },
            { name: t("ui.accounts.loginQR"), value: "qr" },
        ]
    });
    getToken = () => this.ask(input, {
        message: t("ui.token.enterToken"),
        validate: (input) => input.split(".").length === 3 || t("ui.token.invalidFormat"),
        transformer: (input) => input.replace(/"|'/g, "").trim(),
    });
    listActions = (hasCache) => this.ask((select), {
        message: t("ui.actions.selectAction"),
        choices: [
            {
                name: t("ui.actions.run"),
                value: "run",
                disabled: !hasCache && t("ui.actions.noExistingConfig")
            },
            {
                name: t("ui.actions.editConfig"),
                value: "edit"
            },
            {
                name: t("ui.actions.exportConfig"),
                value: "export",
                disabled: !hasCache && t("ui.actions.noExistingConfig")
            },
            {
                name: t("ui.actions.deleteConfig"),
                value: "delete",
                disabled: !hasCache && t("ui.actions.noExistingConfig")
            },
        ],
    });
    // --- Core Config Prompts ---
    listGuilds = (guilds, cache) => this.ask((select), {
        message: t("ui.guild.selectGuild"),
        choices: guilds.map((g) => ({ name: g.name, value: g, })),
        default: cache ? guilds.get(cache) : undefined,
    });
    listChannels = (guild, cache = []) => this.ask((checkbox), {
        message: t("ui.channels.selectChannels"),
        choices: guild.channels.cache
            .filter((c) => c.isText() && c.permissionsFor(guild.client.user)?.has("SEND_MESSAGES"))
            .map((c) => ({ name: c.name, value: c.id, checked: cache.includes(c.id) })),
        validate: (choices) => choices.length > 0 || t("ui.channels.mustSelectOne"),
    });
    getWayNotify = (cache) => this.ask((checkbox), {
        message: t("ui.notifications.selectWays"),
        choices: [
            {
                name: t("ui.notifications.webhook"),
                value: "webhook",
                checked: cache?.includes("webhook"),
            },
            {
                name: t("ui.notifications.dms"),
                value: "dms",
                checked: cache?.includes("dms"),
            },
            {
                name: t("ui.notifications.call"),
                value: "call",
                checked: cache?.includes("call"),
            },
            {
                name: t("ui.notifications.music"),
                value: "music",
                checked: cache?.includes("music"),
            },
            {
                name: t("ui.notifications.popup"),
                value: "popup",
                checked: cache?.includes("popup"),
            },
        ],
    }, t("ui.notifications.description"));
    getWebhookURL = (cache) => this.ask(input, {
        message: t("ui.webhookURL.enterURL"),
        default: cache,
        validate: async (url) => {
            if (!this.webhookRegex.test(url)) {
                return t("ui.webhookURL.invalidFormat");
            }
            try {
                await axios.get(url);
                return true;
            }
            catch {
                return t("ui.webhookURL.notAccessible");
            }
        },
    });
    getAdminID = (guild, cache) => {
        const required = this.config.wayNotify?.some(w => ["call", "dms"].includes(w))
            || this.config.autoCookie
            || this.config.autoClover;
        return this.ask(input, {
            message: t("ui.adminID.enterUserID", {
                required: required === true ? t("ui.adminID.emptyToSkip") : ""
            }),
            default: cache,
            validate: async (id) => {
                if (!id && !required)
                    return true;
                if (!/^\d{17,19}$/.test(id))
                    return t("ui.adminID.invalidFormat");
                if (!required)
                    return true;
                if (id === this.client.user.id)
                    return t("ui.adminID.cannotSetSelf");
                if (!this.config.autoClover
                    && !this.config.autoCookie
                    && !this.config.wayNotify?.some(w => ["call", "dms"].includes(w))) {
                    return guild.members.cache.has(id) || t("ui.adminID.notMember");
                }
                const user = await this.client.users.fetch(id).catch(() => null);
                if (!user)
                    return t("ui.adminID.userNotFound");
                switch (user.relationship.toString()) {
                    case "NONE":
                        try {
                            await user.sendFriendRequest();
                            return t("ui.adminID.friendRequestSent");
                        }
                        catch (error) {
                            return t("ui.adminID.friendRequestFailed");
                        }
                    case "FRIEND":
                        return true;
                    case "PENDING_INCOMING":
                        return await user.sendFriendRequest().catch(() => t("ui.adminID.friendRequestAcceptFailed"));
                    case "PENDING_OUTGOING":
                        return t("ui.adminID.acceptFriendRequest");
                    default:
                        return t("ui.adminID.blocked");
                }
            },
        });
    };
    getMusicPath = (cache) => this.ask(input, {
        message: t("ui.musicPath.enterPath"),
        default: cache,
        validate: (p) => {
            if (!fs.existsSync(p)) {
                return t("ui.musicPath.fileNotExist");
            }
            return this.audioRegex.test(path.extname(p)) ? true : t("ui.musicPath.invalidFormat");
        },
    });
    getCaptchaAPI = (cache) => this.ask((select), {
        message: t("ui.captchaAPI.selectProvider"),
        choices: [
            {
                name: t("ui.captchaAPI.skip"),
                value: undefined
            },
            {
                name: `2Captcha [${chalk.underline("https://2captcha.com")}]`,
                value: "2captcha"
            },
            {
                name: `YesCaptcha [${chalk.underline("https://yescaptcha.com")}]`,
                value: "yescaptcha",
            },
            {
                name: t("ui.captchaAPI.adotfAPI"),
                description: t("ui.captchaAPI.adotfDescription"),
                value: undefined,
                disabled: t("ui.captchaAPI.notImplemented")
            }
        ],
        default: cache
    });
    getCaptchaAPIKey = (cache) => this.ask(input, {
        message: t("ui.captchaAPIKey.enterKey"),
        required: true,
        default: cache,
    });
    getPrefix = (cache) => this.ask(input, {
        message: t("ui.prefix.enterPrefix"),
        validate: (answer) => {
            if (!answer)
                return true;
            return /^[^0-9\s]{1,5}$/.test(answer) ? true : t("ui.prefix.invalidPrefix");
        },
        default: cache
    });
    getGemUsage = (cache) => this.ask((select), {
        message: t("ui.gemUsage.selectUsage"),
        choices: [
            {
                name: t("ui.gemUsage.skip"),
                value: 0
            },
            {
                name: t("ui.gemUsage.fabledToCommon"),
                value: 1
            },
            {
                name: t("ui.gemUsage.commonToFabled"),
                value: -1
            }
        ],
        default: cache
    });
    getGemTier = (cache) => this.ask((checkbox), {
        validate: choices => choices.length > 0 || t("ui.gemTier.mustSelectOne"),
        message: t("ui.gemTier.selectTiers"),
        choices: [
            {
                name: t("ui.gemTier.common"),
                value: "common",
                checked: cache?.includes("common")
            },
            {
                name: t("ui.gemTier.uncommon"),
                value: "uncommon",
                checked: cache?.includes("uncommon")
            },
            {
                name: t("ui.gemTier.rare"),
                value: "rare",
                checked: cache?.includes("rare")
            },
            {
                name: t("ui.gemTier.epic"),
                value: "epic",
                checked: cache?.includes("epic")
            },
            {
                name: t("ui.gemTier.mythical"),
                value: "mythical",
                checked: cache?.includes("mythical")
            },
            {
                name: t("ui.gemTier.legendary"),
                value: "legendary",
                checked: cache?.includes("legendary")
            },
            {
                name: t("ui.gemTier.fabled"),
                value: "fabled",
                checked: cache?.includes("fabled")
            },
        ],
    });
    getTrait = (cache) => this.ask((select), {
        message: t("ui.trait.selectTrait"),
        choices: [
            {
                name: t("ui.trait.efficiency"),
                value: "efficiency",
            },
            {
                name: t("ui.trait.duration"),
                value: "duration",
            },
            {
                name: t("ui.trait.cost"),
                value: "cost",
            },
            {
                name: t("ui.trait.gain"),
                value: "gain",
            },
            {
                name: t("ui.trait.experience"),
                value: "experience",
            },
            {
                name: t("ui.trait.radar"),
                value: "radar",
            }
        ],
        default: cache,
    });
    getHuntbotSolver = (cache) => this.ask((select), {
        message: t("ui.huntbotSolver.selectSolver"),
        choices: [
            {
                name: t("ui.huntbotSolver.providedAPI", { api: this.config.captchaAPI || t("ui.huntbotSolver.noAPI") }),
                value: false,
                disabled: !this.config.captchaAPI && t("ui.huntbotSolver.noAPIDisabled"),
            },
            {
                name: t("ui.huntbotSolver.adotfAPI"),
                value: true,
            }
        ],
        default: cache,
    });
    getPrayCurse = (cache) => this.ask((checkbox), {
        message: t("ui.prayCurse.selectOptions"),
        choices: [
            {
                name: t("ui.prayCurse.praySelf"),
                value: `pray`,
                checked: cache?.includes("pray")
            },
            {
                name: t("ui.prayCurse.curseSelf"),
                value: `curse`,
                checked: cache?.includes("curse")
            },
            ...(this.config.adminID ? [
                {
                    name: t("ui.prayCurse.prayAdmin"),
                    value: `pray ${this.config.adminID}`,
                    checked: cache?.includes(`pray ${this.config.adminID}`)
                },
                {
                    name: t("ui.prayCurse.curseAdmin"),
                    value: `curse ${this.config.adminID}`,
                    checked: cache?.includes(`curse ${this.config.adminID}`)
                }
            ] : [])
        ]
    });
    getQuoteAction = (cache) => this.ask((checkbox), {
        message: t("ui.quoteAction.selectActions"),
        choices: [
            {
                name: t("ui.quoteAction.owo"),
                value: "owo",
                checked: cache?.includes("owo")
            },
            {
                name: t("ui.quoteAction.quote"),
                value: "quote",
                checked: cache?.includes("quote")
            }
        ]
    });
    getRPPAction = (cache) => this.ask((checkbox), {
        message: t("ui.rppAction.selectActions"),
        choices: [
            {
                name: t("ui.rppAction.run"),
                value: "run",
                checked: cache?.includes("run")
            },
            {
                name: t("ui.rppAction.pup"),
                value: "pup",
                checked: cache?.includes("pup")
            },
            {
                name: t("ui.rppAction.piku"),
                value: "piku",
                checked: cache?.includes("piku")
            }
        ]
    });
}
