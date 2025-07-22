import { Schematic } from "../structure/Schematic.js";
import { formatTime } from "../utils/time.js";
import { logger } from "../utils/logger.js";
import { performanceMonitor } from "../utils/performance.js";
import { errorRecoveryManager } from "../utils/recovery.js";
import { inventoryCache, responseCache } from "../utils/cache.js";
export default Schematic.registerCommand({
    name: "status",
    description: "commands.status.description",
    usage: "status",
    execute: async ({ agent, message, args, t, locale }) => {
        try {
            const detailed = args.includes("detailed") || args.includes("full");
            const uptime = formatTime(agent.client.readyTimestamp, Date.now());
            const connectionStatus = agent.client.connectionMonitor?.getConnectionStatus() || {};
            const performanceReport = performanceMonitor.generateReport();
            const errorStats = errorRecoveryManager.getErrorStats();
            const isHealthy = errorRecoveryManager.isHealthy();

            if (detailed) {
                const statusEmbed = {
                    title: "Status Report",
                    color: isHealthy ? 0x00FF00 : agent.captchaDetected ? 0xFF0000 : 0xFFFF00,
                    fields: [
                        {
                            name: "⏱️ Uptime",
                            value: uptime,
                            inline: true
                        },
                        {
                            name: "🔗 Connection",
                            value: `${connectionStatus.health || 'unknown'} (${connectionStatus.averageLatency || 'N/A'}ms)`,
                            inline: true
                        },
                        {
                            name: "🎯 Health Score",
                            value: `${performanceReport.healthScore}/100`,
                            inline: true
                        },
                        {
                            name: "📊 Activity Stats",
                            value: `Commands: ${agent.totalCommands}\nTexts: ${agent.totalTexts}\nCaptchas: ${agent.totalCaptchaSolved}/${agent.totalCaptchaFailed}`,
                            inline: true
                        },
                        {
                            name: "🧠 Memory Usage",
                            value: `Heap: ${performanceReport.memory.heapUsed}\nRSS: ${performanceReport.memory.rss}`,
                            inline: true
                        },
                        {
                            name: "🎮 Farm Status",
                            value: agent.farmLoopRunning ? "Running" :
                                   agent.farmLoopPaused ? "Paused" :
                                   agent.captchaDetected ? "Captcha Detected" : "Stopped",
                            inline: true
                        },
                        {
                            name: "💾 Cache Status",
                            value: `Inventory: ${inventoryCache.size()}\nResponse: ${responseCache.size()}`,
                            inline: true
                        }
                    ],
                    timestamp: new Date().toISOString()
                };

                if (Object.keys(errorStats).length > 0) {
                    const errorSummary = Object.entries(errorStats)
                        .slice(0, 3)
                        .map(([error, stats]) => `${error}: ${stats.count}`)
                        .join("\n");

                    statusEmbed.fields.push({
                        name: "⚠️ Recent Errors",
                        value: errorSummary || "None",
                        inline: false
                    });
                }

                await message.reply({ embeds: [statusEmbed] });
            } else {
                await message.reply(t("commands.status.status", {
                    status: agent.captchaDetected ? "Captcha Detected"
                        : agent.farmLoopPaused ? "Paused" : "Running",
                    uptime,
                    texts: agent.totalTexts,
                    commands: agent.totalCommands,
                    captchasSolved: agent.totalCaptchaSolved,
                    captchasFailed: agent.totalCaptchaFailed
                }));
            }
        }
        catch (error) {
            logger.error("Error during status command execution:");
            logger.error(error);
        }
    }
});
