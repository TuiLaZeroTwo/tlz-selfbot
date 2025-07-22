import { Schematic } from "../structure/Schematic.js";
import { formatTime } from "../utils/time.js";
import { logger } from "../utils/logger.js";
import { mapInt, ranInt, humanLikeDelay, gaussianRandom } from "../utils/math.js";
import { stealthManager } from "../utils/stealth.js";
export default Schematic.registerFeature({
    name: "autoSleep",
    cooldown: () => 60 * 1000,
    condition: async ({ agent }) => {
        if (!agent.config.autoSleep)
            return false;
        return agent.config.autoSleep && agent.totalCommands - agent.lastSleepAt >= agent.autoSleepThreshold;
    },
    run: ({ agent, t }) => {
        const commandsSinceLastSleep = agent.totalCommands - agent.lastSleepAt;
        const sessionDuration = Date.now() - stealthManager.sessionStartTime;
        const hoursActive = sessionDuration / (1000 * 60 * 60);

        let baseSleepTime = mapInt(commandsSinceLastSleep, 32, 600, 5 * 60 * 1000, 45 * 60 * 1000);

        const timeOfDay = new Date().getHours();
        let timeMultiplier = 1;
        if (timeOfDay >= 22 || timeOfDay <= 6) {
            timeMultiplier = ranInt(150, 250) / 100;
        } else if (timeOfDay >= 12 && timeOfDay <= 14) {
            timeMultiplier = ranInt(120, 180) / 100;
        }

        const fatigueMultiplier = Math.min(1 + (hoursActive * 0.15), 3);
        const humanVariation = Math.abs(gaussianRandom(1, 0.3));

        let sleepTime = baseSleepTime * timeMultiplier * fatigueMultiplier * humanVariation;
        sleepTime = Math.max(sleepTime, 2 * 60 * 1000);
        sleepTime = Math.min(sleepTime, 2 * 60 * 60 * 1000);

        const nextThreshold = ranInt(32, 600);
        const thresholdVariation = Math.abs(gaussianRandom(1, 0.2));
        const adjustedThreshold = Math.floor(nextThreshold * thresholdVariation);

        agent.lastSleepAt = agent.totalCommands;
        agent.autoSleepThreshold = adjustedThreshold;

        logger.info(t("features.autoSleep.sleeping", {
            duration: formatTime(0, sleepTime),
            commands: commandsSinceLastSleep
        }));

        logger.info(t("features.autoSleep.nextSleep", {
            commands: adjustedThreshold,
            sleepTime: formatTime(0, mapInt(adjustedThreshold, 52, 600, 5 * 60 * 1000, 40 * 60 * 1000))
        }));

        return agent.client.sleep(sleepTime);
    }
});
