import { ranInt, gaussianRandom, humanLikeDelay, weightedRandom } from "./math.js";

export class StealthManager {
    constructor() {
        this.activityPatterns = new Map();
        this.lastActivityTime = Date.now();
        this.sessionStartTime = Date.now();
        this.commandHistory = [];
        this.maxHistorySize = 100;
    }

    recordActivity(command) {
        const now = Date.now();
        this.commandHistory.push({
            command,
            timestamp: now,
            timeSinceLastCommand: now - this.lastActivityTime
        });

        if (this.commandHistory.length > this.maxHistorySize) {
            this.commandHistory.shift();
        }

        this.lastActivityTime = now;
    }

    getTypingDelay(messageLength = 10) {
        const baseWPM = ranInt(35, 65);
        const charactersPerSecond = (baseWPM * 5) / 60;
        const baseDelay = (messageLength / charactersPerSecond) * 1000;
        
        const humanVariation = gaussianRandom(1, 0.2);
        const finalDelay = Math.max(baseDelay * Math.abs(humanVariation), 200);
        
        return Math.floor(finalDelay);
    }

    getCommandDelay(command) {
        const sessionDuration = Date.now() - this.sessionStartTime;
        const hoursSinceStart = sessionDuration / (1000 * 60 * 60);
        
        let baseDelay;
        switch (command) {
            case 'hunt':
                baseDelay = ranInt(15000, 22000);
                break;
            case 'battle':
                baseDelay = ranInt(15000, 22000);
                break;
            case 'pray':
                baseDelay = ranInt(300000, 480000);
                break;
            case 'daily':
                baseDelay = 24 * 60 * 60 * 1000;
                break;
            case 'huntbot':
                baseDelay = ranInt(600000, 900000);
                break;
            default:
                baseDelay = ranInt(60000, 120000);
        }

        const fatigueMultiplier = Math.min(1 + (hoursSinceStart * 0.1), 2.5);
        const adjustedDelay = baseDelay * fatigueMultiplier;
        
        return humanLikeDelay(adjustedDelay, 0.25);
    }

    shouldTakeBreak() {
        const sessionDuration = Date.now() - this.sessionStartTime;
        const hoursActive = sessionDuration / (1000 * 60 * 60);
        
        if (hoursActive > 2) {
            const breakChance = Math.min((hoursActive - 2) * 0.15, 0.8);
            return Math.random() < breakChance;
        }
        
        return false;
    }

    getBreakDuration() {
        const weights = [0.4, 0.3, 0.2, 0.1];
        const breakType = weightedRandom(weights);
        
        switch (breakType) {
            case 0:
                return ranInt(30000, 120000);
            case 1:
                return ranInt(120000, 300000);
            case 2:
                return ranInt(300000, 900000);
            case 3:
                return ranInt(900000, 3600000);
            default:
                return ranInt(60000, 180000);
        }
    }

    getReactionDelay() {
        const humanReactionTime = gaussianRandom(250, 100);
        const processingTime = ranInt(100, 500);
        return Math.max(Math.floor(humanReactionTime + processingTime), 50);
    }

    shouldVaryBehavior() {
        const recentCommands = this.commandHistory.slice(-10);
        if (recentCommands.length < 5) return false;
        
        const avgInterval = recentCommands.reduce((sum, cmd, index) => {
            if (index === 0) return sum;
            return sum + cmd.timeSinceLastCommand;
        }, 0) / (recentCommands.length - 1);
        
        const variance = recentCommands.reduce((sum, cmd, index) => {
            if (index === 0) return sum;
            const diff = cmd.timeSinceLastCommand - avgInterval;
            return sum + (diff * diff);
        }, 0) / (recentCommands.length - 1);
        
        const standardDeviation = Math.sqrt(variance);
        const coefficientOfVariation = standardDeviation / avgInterval;
        
        return coefficientOfVariation < 0.3;
    }

    getSmartDelay(baseDelay, context = {}) {
        let adjustedDelay = baseDelay;
        
        if (this.shouldVaryBehavior()) {
            const variationFactor = gaussianRandom(1, 0.4);
            adjustedDelay *= Math.abs(variationFactor);
        }
        
        if (context.isRetry) {
            adjustedDelay *= ranInt(150, 300) / 100;
        }
        
        if (context.isUrgent) {
            adjustedDelay *= ranInt(50, 80) / 100;
        }
        
        const timeOfDay = new Date().getHours();
        if (timeOfDay >= 23 || timeOfDay <= 6) {
            adjustedDelay *= ranInt(120, 180) / 100;
        }
        
        return Math.floor(Math.max(adjustedDelay, 1000));
    }

    generateRandomMessage() {
        const messages = [
            "owo", "uwu", "nice", "cool", "awesome", "great", "amazing",
            "wow", "omg", "lol", "haha", "xd", "poggers", "pog"
        ];
        
        if (Math.random() < 0.1) {
            return messages[ranInt(0, messages.length)];
        }
        
        return null;
    }

    reset() {
        this.sessionStartTime = Date.now();
        this.commandHistory = [];
        this.activityPatterns.clear();
    }
}

export const stealthManager = new StealthManager();
