import { Collection, Message, RichPresence } from "discord.js-selfbot-v13";
import path from "node:path";
import { ranInt, humanLikeDelay, gaussianRandom } from "../utils/math.js";
import { logger } from "../utils/logger.js";
import { watchConfig } from "../utils/watcher.js";
import featuresHandler from "../handlers/featuresHandler.js";
import { t, getCurrentLocale } from "../utils/locales.js";
import { shuffleArray } from "../utils/array.js";
import commandsHandler from "../handlers/commandsHandler.js";
import eventsHandler from "../handlers/eventsHandler.js";
import { CooldownManager } from "./core/CooldownManager.js";
import { fileURLToPath } from "node:url";
import { CriticalEventHandler } from "../handlers/CriticalEventHandler.js";
import { stealthManager } from "../utils/stealth.js";
import { inventoryCache, responseCache } from "../utils/cache.js";
import { defaultRetryManager } from "../utils/retry.js";
import { errorRecoveryManager } from "../utils/recovery.js";
export class BaseAgent {
    rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    miraiID = "1205422490969579530";
    client;
    config;
    cache;
    authorizedUserIDs = [];
    commands = new Collection();
    cooldownManager = new CooldownManager();
    features = new Collection();
    owoID = "408785106942164992";
    prefix = "k";
    activeChannel;
    totalCaptchaSolved = 0;
    totalCaptchaFailed = 0;
    totalCommands = 0;
    totalTexts = 0;
    invalidResponseCount = 0;
    invalidResponseThreshold = 5;
    gem1Cache;
    gem2Cache;
    gem3Cache;
    starCache;
    channelChangeThreshold = ranInt(17, 56);
    autoSleepThreshold = ranInt(32, 600);
    lastSleepAt = 0;
    captchaDetected = false;
    farmLoopRunning = false;
    farmLoopPaused = false;
    expectResponseOnAllAwaits = false;
    constructor(client, config) {
        this.client = client;
        this.cache = structuredClone(config);
        this.config = watchConfig(config, (key, oldValue, newValue) => {
            logger.debug(`Configuration updated: ${key} changed from ${oldValue} to ${newValue}`);
        });
        this.authorizedUserIDs.push(this.client.user.id, ...(this.config.adminID ? [this.config.adminID] : []));
        this.client.options.sweepers = {
            messages: {
                interval: 60 * 60,
                lifetime: 60 * 60 * 24,
            },
            users: {
                interval: 60 * 60,
                filter: () => (user) => this.authorizedUserIDs.includes(user.id),
            },
        };
    }
    setActiveChannel = (id) => {
        const channelIDs = this.config.channelID;
        if (!channelIDs || channelIDs.length === 0) {
            throw new Error("No channel IDs provided in the configuration.");
        }
        const channelID = id || channelIDs[ranInt(0, channelIDs.length)];
        try {
            const channel = this.client.channels.cache.get(channelID);
            if (channel && channel.isText()) {
                this.activeChannel = channel;
                logger.info(t("agent.messages.activeChannelSet", { channelName: this.activeChannel.name }));
                return this.activeChannel;
            }
            else {
                logger.warn(t("agent.messages.invalidChannel", { channelID }));
                this.config.channelID = this.config.channelID.filter(id => id !== channelID);
                logger.info(t("agent.messages.removedInvalidChannel", { channelID }));
            }
        }
        catch (error) {
            logger.error(`Failed to fetch channel with ID ${channelID}:`);
            logger.error(error);
        }
        return;
    };
    reloadConfig = () => {
        for (const key of Object.keys(this.cache)) {
            this.config[key] = this.cache[key];
        }
        logger.info(t("agent.messages.configReloaded"));
    };
    send = async (content, options = {
        channel: this.activeChannel,
        prefix: this.prefix,
    }) => {
        if (!this.activeChannel) {
            logger.warn(t("agent.messages.noActiveChannel"));
            return;
        }

        const typingDelay = stealthManager.getTypingDelay(content.length);
        const enhancedOptions = {
            ...options,
            typing: typingDelay
        };

        stealthManager.recordActivity(content);

        this.client.sendMessage(content, enhancedOptions);
        if (!!options.prefix)
            this.totalCommands++;
        else
            this.totalTexts++;

        const randomMessage = stealthManager.generateRandomMessage();
        if (randomMessage && Math.random() < 0.05) {
            await this.client.sleep(ranInt(2000, 8000));
            this.client.sendMessage(randomMessage, {
                channel: options.channel || this.activeChannel,
                prefix: "",
                skipLogging: true
            });
        }
    };
    isBotOnline = async () => {
        try {
            const owo = await this.activeChannel.guild.members.fetch(this.owoID);
            return !!owo && owo.presence?.status !== "offline";
        }
        catch (error) {
            logger.warn(t("agent.messages.owoStatusCheckFailed"));
            return false;
        }
    };
    awaitResponse = (options) => {
        return new Promise((resolve, reject) => {
            const {
                channel = this.activeChannel,
                filter,
                time = 30_000,
                max = 1,
                trigger,
                expectResponse = false,
                cacheKey = null,
                cacheTTL = 180000
            } = options;

            if (!channel) {
                const error = new Error("awaitResponse requires a channel, but none was provided or set as active.");
                logger.error(error.message);
                return reject(error);
            }

            if (cacheKey) {
                const cachedResponse = responseCache.get(cacheKey);
                if (cachedResponse) {
                    logger.debug(`Using cached response for ${cacheKey}`);
                    return resolve(cachedResponse);
                }
            }

            const collector = channel.createMessageCollector({
                filter,
                time,
                max,
            });

            collector.once("collect", (message) => {
                if (cacheKey) {
                    responseCache.set(cacheKey, message, cacheTTL);
                }
                this.invalidResponseCount = 0;
                resolve(message);
            });

            collector.once("end", (collected) => {
                if (collected.size === 0) {
                    if (expectResponse || this.expectResponseOnAllAwaits) {
                        this.invalidResponseCount++;
                        logger.debug(`No response received within the specified time (${this.invalidResponseCount}/${this.invalidResponseThreshold}).`);
                    }
                    if (this.invalidResponseCount >= this.invalidResponseThreshold) {
                        reject(new Error("Invalid response count exceeded threshold."));
                    }
                    resolve(undefined);
                }
            });

            const executeWithDelay = async () => {
                const reactionDelay = stealthManager.getReactionDelay();
                await this.client.sleep(reactionDelay);
                trigger();
            };

            executeWithDelay();
        });
    };
    awaitSlashResponse = async (options) => {
        const { channel = this.activeChannel, bot = this.owoID, command, args = [], time = 30_000, } = options;
        if (!channel) {
            throw new Error("awaitSlashResponse requires a channel, but none was provided or set as active.");
        }
        const message = await channel.sendSlash(bot, command, ...args);
        if (!(message instanceof Message)) {
            throw new Error("Unsupported message type returned from sendSlash.");
        }
        if (message.flags.has("LOADING"))
            return new Promise((resolve, reject) => {
                let timeout;
                const listener = async (...args) => {
                    const [_, m] = args;
                    if (_.id !== message.id)
                        return;
                    cleanup();
                    if (m.partial) {
                        try {
                            const fetchedMessage = await m.fetch();
                            return resolve(fetchedMessage);
                        }
                        catch (error) {
                            logger.error("Failed to fetch partial message");
                            reject(error);
                        }
                    }
                    else {
                        resolve(m);
                    }
                };
                const cleanup = () => {
                    message.client.off("messageUpdate", listener);
                    clearTimeout(timeout);
                };
                message.client.on("messageUpdate", listener);
                timeout = setTimeout(() => {
                    cleanup();
                    reject(new Error("AwaitSlashResponse timed out"));
                }, time);
            });
        return Promise.resolve(message);
    };
    loadPresence = () => {
        const rpc = new RichPresence(this.client)
            .setApplicationId(this.miraiID)
            .setType("PLAYING")
            .setName("Mirai Kuriyama")
            .setDetails("The day the emperor returns!")
            .setStartTimestamp(this.client.readyTimestamp)
            .setAssetsLargeImage("1312264004382621706")
            .setAssetsLargeText("Advanced Discord OwO Tool Farm")
            .setAssetsSmallImage("1306938859552247848")
            .setAssetsSmallText("Copyright © Kyou-Izumi 2025")
            .addButton("GitHub", "https://github.com/Kyou-Izumi/advanced-discord-owo-tool-farm")
            .addButton("YouTube", "https://www.youtube.com/@daongotau");
        this.client.user.setPresence({ activities: [rpc] });
    };
    farmLoop = async () => {
        if (this.farmLoopRunning) {
            logger.debug("Double farm loop detected, skipping this iteration.");
            return;
        }
        if (this.farmLoopPaused) {
            logger.debug("Farm loop is paused, skipping this iteration.");
            return;
        }

        if (stealthManager.shouldTakeBreak()) {
            const breakDuration = stealthManager.getBreakDuration();
            logger.info(`Taking a break for ${Math.floor(breakDuration / 60000)} minutes to maintain human-like behavior`);
            setTimeout(() => this.farmLoop(), breakDuration);
            return;
        }

        this.farmLoopRunning = true;
        try {
            responseCache.cleanup();

            const featureKeys = Array.from(this.features.keys());
            if (featureKeys.length === 0) {
                logger.warn(t("agent.messages.noFeaturesAvailable"));
                return;
            }

            const shuffledFeatures = shuffleArray([...featureKeys]);

            for (const featureKey of shuffledFeatures) {
                if (this.captchaDetected) {
                    logger.debug("Captcha detected, skipping feature execution.");
                    return;
                }

                const botStatus = await this.isBotOnline();
                if (!botStatus) {
                    logger.warn(t("agent.messages.owoOfflineDetected"));
                    this.expectResponseOnAllAwaits = true;
                }
                else {
                    this.expectResponseOnAllAwaits = false;
                }

                const feature = this.features.get(featureKey);
                if (!feature) {
                    logger.warn(t("agent.messages.featureNotFound", { featureKey }));
                    continue;
                }

                try {
                    const shouldRun = await feature.condition({ agent: this, t, locale: getCurrentLocale() })
                        && this.cooldownManager.onCooldown("feature", feature.name) === 0;

                    if (!shouldRun) continue;

                    const smartDelay = stealthManager.getSmartDelay(
                        stealthManager.getCommandDelay(feature.name),
                        { feature: feature.name }
                    );

                    const res = await feature.run({ agent: this, t, locale: getCurrentLocale() });

                    const cooldownTime = typeof res === "number" && !isNaN(res) ? res : feature.cooldown() || 30_000;
                    const adjustedCooldown = stealthManager.getSmartDelay(cooldownTime);

                    this.cooldownManager.set("feature", feature.name, adjustedCooldown);

                    const interFeatureDelay = humanLikeDelay(ranInt(500, 4600), 0.3);
                    await this.client.sleep(interFeatureDelay);
                }
                catch (error) {
                    logger.error(`Error running feature ${feature.name}:`);
                    logger.error(error);

                    const errorCooldown = stealthManager.getSmartDelay(60000, { isRetry: true });
                    this.cooldownManager.set("feature", feature.name, errorCooldown);
                }
            }

            if (!this.captchaDetected && !this.farmLoopPaused) {
                const nextLoopDelay = stealthManager.getSmartDelay(ranInt(1000, 7500));
                setTimeout(() => {
                    this.farmLoop();
                }, nextLoopDelay);
            }
        }
        catch (error) {
            logger.error("Error occurred during farm loop execution:");
            logger.error(error);
        }
        finally {
            this.farmLoopRunning = false;
        }
    };
    registerEvents = async () => {
        CriticalEventHandler.handleRejection({
            agent: this,
            t,
            locale: getCurrentLocale(),
        });
        await featuresHandler.run({
            agent: this,
            t,
            locale: getCurrentLocale(),
        });
        logger.info(t("agent.messages.featuresRegistered", { count: this.features.size }));
        await commandsHandler.run({
            agent: this,
            t,
            locale: getCurrentLocale(),
        });
        logger.info(t("agent.messages.commandsRegistered", { count: this.commands.size }));
        await eventsHandler.run({
            agent: this,
            t,
            locale: getCurrentLocale(),
        });
        if (this.config.showRPC)
            this.loadPresence();
    };
    static initialize = async (client, config) => {
        logger.debug("Initializing BaseAgent...");
        if (!client.isReady()) {
            throw new Error("Client is not ready. Ensure the client is logged in before initializing the agent.");
        }
        const agent = new BaseAgent(client, config);
        agent.setActiveChannel();
        await agent.registerEvents();
        logger.debug("BaseAgent initialized successfully.");
        logger.info(t("agent.messages.loggedIn", { username: client.user.username }));
        agent.farmLoop();
    };
}
