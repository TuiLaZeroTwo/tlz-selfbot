import { TwoCaptchaSolver } from "../services/solvers/TwoCaptchaSolver.js";
import { YesCaptchaSolver } from "../services/solvers/YesCaptchaSolver.js";
import { downloadAttachment } from "../utils/download.js";
import { logger } from "../utils/logger.js";
import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import os from "node:os";
import { NORMALIZE_REGEX } from "../typings/constants.js";
import { NotificationService } from "./NotificationService.js";
/**
 * Maps Node.js os.platform() output to sec-ch-ua-platform values.
 */
const getPlatformForHeader = () => {
    switch (os.platform()) {
        case "win32":
            return "Windows";
        case "darwin":
            return "macOS";
        case "linux":
            return "Linux";
        default:
            // A sensible default for other platforms like FreeBSD, etc.
            return "Unknown";
    }
};
const createSolver = (provider, apiKey) => {
    switch (provider) {
        case "yescaptcha":
            return new YesCaptchaSolver(apiKey);
        case "2captcha":
            return new TwoCaptchaSolver(apiKey);
        default:
            logger.error(`Unknown captcha provider: ${provider}`);
            return undefined;
    }
};
export class CaptchaService {
    solver;
    axiosInstance = wrapper(axios.create({
        jar: new CookieJar(),
        timeout: 30000,
        headers: {
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            "Sec-Ch-Ua": `"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"`,
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": `"${getPlatformForHeader()}"`,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
    }));
    constructor({ provider, apiKey }) {
        if (provider && apiKey) {
            this.solver = createSolver(provider, apiKey);
        }
        else {
            logger.warn("Captcha API or API key not configured. Captcha handling will be disabled.");
        }
    }
    solveImageCaptcha = async (attachmentUrl) => {
        if (!this.solver) {
            throw new Error("Captcha solver is not configured.");
        }
        logger.debug(`Downloading captcha image from ${attachmentUrl}`);
        const imageBuffer = await downloadAttachment(attachmentUrl);
        const solution = await this.solver.solveImage(imageBuffer);
        logger.debug(`Captcha solution: ${solution}`);
        return solution;
    };
    solveHcaptcha = async (location, sitekey = "a6a1d5ce-612d-472d-8e37-7601408fbc09", siteurl = "https://owobot.com") => {
        if (!this.solver) {
            throw new Error("Captcha solver is not configured.");
        }
        logger.debug(`Starting hCaptcha solving process for: ${location}`);
        // Step 1: Follow the OAuth redirect chain (this establishes the session)
        logger.debug("Step 1: Following OAuth redirect chain...");
        const oauthResponse = await this.axiosInstance.get(location, {
            headers: {
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Referer": "https://discord.com/",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "cross-site",
                "Sec-Fetch-User": "?1",
                "Upgrade-Insecure-Requests": "1",
                "Priority": "u=0, i"
            },
            maxRedirects: 10,
            validateStatus: (status) => status < 400 // Accept redirects
        });
        logger.debug(`OAuth response status: ${oauthResponse.status}`);
        // Step 2: Visit the captcha page explicitly
        logger.debug("Step 2: Visiting captcha page...");
        try {
            await this.axiosInstance.get("https://owobot.com/captcha", {
                headers: {
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                    "Referer": "https://owobot.com/",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "same-origin",
                    "Sec-Fetch-User": "?1",
                    "Upgrade-Insecure-Requests": "1",
                    "Priority": "u=0, i"
                }
            });
        }
        catch (error) {
            logger.warn(`Captcha page visit failed: ${error}`);
        }
        // Step 3: Check authentication status
        logger.debug("Step 3: Checking authentication status...");
        const accountResponse = await this.axiosInstance.get("https://owobot.com/api/auth", {
            headers: {
                "Accept": "application/json, text/plain, */*",
                "Origin": "https://owobot.com",
                "Referer": "https://owobot.com/captcha",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "Priority": "u=1, i"
            }
        });
        logger.debug(`Auth response data: ${JSON.stringify(accountResponse.data, null, 2)}`);
        if (accountResponse.data?.banned) {
            throw new Error("Account is banned.");
        }
        if (!accountResponse.data?.captcha?.active) {
            throw new Error("Captcha is not active.");
        }
        // Step 4: Solve the hCaptcha
        logger.debug(`Step 4: Solving hCaptcha with sitekey: ${sitekey} and siteurl: ${siteurl}`);
        const solution = await this.solver.solveHcaptcha(sitekey, siteurl);
        logger.debug(`hCaptcha response token: ${solution.slice(0, 50)}...`);
        // Step 5: Submit the verification (matching your successful browser request exactly)
        logger.debug("Step 5: Submitting captcha verification...");
        const verificationResponse = await this.axiosInstance.post("https://owobot.com/api/captcha/verify", {
            token: solution // Using "code" as per your successful browser request
        }, {
            headers: {
                "Accept": "application/json, text/plain, */*",
                "Content-Type": "application/json",
                "Origin": "https://owobot.com",
                "Referer": "https://owobot.com/captcha",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "Priority": "u=1, i"
            }
        });
        if (verificationResponse.status !== 200) {
            const errorData = verificationResponse.data;
            logger.error(`Verification response: ${JSON.stringify(errorData, null, 2)}`);
            throw new Error(`Failed to verify captcha: ${verificationResponse.status} - ${verificationResponse.statusText} - ${JSON.stringify(errorData)}`);
        }
        logger.info("✅ hCaptcha verification successful!");
    };
    static async handleCaptcha(params, message, retries = 0) {
        const { agent } = params;
        const normalizedContent = message.content.normalize("NFC").replace(NORMALIZE_REGEX, "");
        const maxRetries = 1;
        const captchaService = new CaptchaService({
            provider: agent.config.captchaAPI,
            apiKey: agent.config.apiKey,
        });
        const notificationService = new NotificationService();
        // Only notify on first attempt
        if (retries === 0) {
            NotificationService.consoleNotify(params);
        }
        try {
            const attachmentUrl = message.attachments.first()?.url;
            if (attachmentUrl) {
                logger.debug(`Image captcha detected, attempting to solve... (Attempt ${retries + 1}/${maxRetries + 1})`);
                const solution = await captchaService.solveImageCaptcha(attachmentUrl);
                logger.debug(`Attempting reach OwO bot...`);
                const owo = await agent.client.users.fetch(agent.owoID);
                const dms = await owo.createDM();
                logger.debug(`DM channel created, sending captcha solution...`);
                const captchaResponse = await agent.awaitResponse({
                    channel: dms,
                    filter: (msg) => msg.author.id == agent.owoID && /verified that you are.{1,3}human!/igm.test(msg.content),
                    trigger: async () => dms.send(solution),
                    time: 30_000
                });
                if (!captchaResponse) {
                    throw new Error("No response from OwO bot after sending captcha solution.");
                }
            }
            else if (/(https?:\/\/[^\s]+)/g.test(normalizedContent)
                || (message.components.length > 0 && message.components[0].type == "ACTION_ROW"
                    && message.components[0].components[0].type == "BUTTON"
                    && /(https?:\/\/[^\s]+)/g.test(message.components[0].components[0].url || ""))) {
                logger.debug(`Link captcha detected, attempting to solve... (Attempt ${retries + 1}/${maxRetries + 1})`);
                const { location } = await agent.client.authorizeURL("https://discord.com/oauth2/authorize?response_type=code&redirect_uri=https%3A%2F%2Fowobot.com%2Fapi%2Fauth%2Fdiscord%2Fredirect&scope=identify%20guilds%20email%20guilds.members.read&client_id=408785106942164992");
                await captchaService.solveHcaptcha(location);
            }
            // If we reach here, captcha was solved successfully
            agent.totalCaptchaSolved++;
            logger.info(`Captcha solved successfully on attempt ${retries + 1}!`);
            // Only notify on successful resolution
            await notificationService.notify(params, {
                title: "CAPTCHA DETECTED",
                description: "Status: ✅ RESOLVED",
                urgency: "normal",
                content: `${agent.config.adminID ? `<@${agent.config.adminID}> ` : ""}Captcha detected in channel: <#${message.channel.id}>`,
                sourceUrl: message.url,
                imageUrl: attachmentUrl,
                fields: [
                    {
                        name: "Captcha Type",
                        value: attachmentUrl
                            ? `[Image Captcha](${attachmentUrl})`
                            : "[Link Captcha](https://owobot.com/captcha)",
                        inline: true
                    },
                    {
                        name: "Attempt",
                        value: `${retries + 1}/${maxRetries + 1}`,
                        inline: true
                    }
                ]
            });
        }
        catch (error) {
            logger.error(`Failed to solve captcha on attempt ${retries + 1}:`);
            logger.error(error);
            // Retry logic
            if (retries < maxRetries) {
                logger.warn(`Retrying captcha solving after 3 seconds... (${retries + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
                return CaptchaService.handleCaptcha(params, message, retries + 1);
            }
            // Max retries reached, give up - only notify on complete failure
            logger.alert(`All ${maxRetries + 1} attempts to solve captcha failed, waiting for manual resolution.`);
            logger.info(`WAITING FOR THE CAPTCHA TO BE RESOLVED TO ${agent.config.autoResume ? "RESTART" : "STOP"}...`);
            agent.totalCaptchaFailed++;
            await notificationService.notify(params, {
                title: "CAPTCHA DETECTED",
                description: `Status: ❌ **UNRESOLVED**`,
                urgency: "critical",
                content: `${agent.config.adminID ? `<@${agent.config.adminID}> ` : ""}Captcha detected in channel: <#${message.channel.id}>`,
                sourceUrl: message.url,
                imageUrl: message.attachments.first()?.url,
                fields: [
                    {
                        name: "Captcha Type",
                        value: message.attachments.first()
                            ? `[Image Captcha](${message.attachments.first()?.url})`
                            : "[Link Captcha](https://owobot.com/captcha)",
                        inline: true
                    },
                    {
                        name: "Failed Attempts",
                        value: `${maxRetries + 1}/${maxRetries + 1}`,
                        inline: true
                    },
                    {
                        name: "Last Error",
                        value: `\`${error instanceof Error ? error.message : String(error)}\``,
                    },
                    {
                        name: "Please resolve the captcha manually before",
                        value: `<t:${Math.floor(message.createdTimestamp / 1000 + 600)}:f>`,
                    },
                ]
            });
        }
    }
}
