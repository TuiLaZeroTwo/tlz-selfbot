import { logger } from "./logger.js";
import { ranInt, exponentialBackoff, humanLikeDelay } from "./math.js";

export class ErrorRecoveryManager {
    constructor() {
        this.errorHistory = new Map();
        this.recoveryStrategies = new Map();
        this.maxErrorCount = 10;
        this.errorTimeWindow = 300000;
        this.setupDefaultStrategies();
    }

    setupDefaultStrategies() {
        this.recoveryStrategies.set('CAPTCHA_DETECTED', {
            action: 'pause',
            duration: () => ranInt(60000, 180000),
            maxRetries: 3
        });

        this.recoveryStrategies.set('RATE_LIMITED', {
            action: 'delay',
            duration: () => exponentialBackoff(1, 30000, 300000),
            maxRetries: 5
        });

        this.recoveryStrategies.set('CONNECTION_ERROR', {
            action: 'reconnect',
            duration: () => exponentialBackoff(2, 5000, 60000),
            maxRetries: 5
        });

        this.recoveryStrategies.set('INVALID_RESPONSE', {
            action: 'retry',
            duration: () => humanLikeDelay(ranInt(3000, 8000), 0.3),
            maxRetries: 3
        });

        this.recoveryStrategies.set('COMMAND_FAILED', {
            action: 'skip',
            duration: () => humanLikeDelay(ranInt(10000, 30000), 0.4),
            maxRetries: 2
        });

        this.recoveryStrategies.set('NETWORK_ERROR', {
            action: 'retry',
            duration: () => exponentialBackoff(1, 2000, 30000),
            maxRetries: 4
        });
    }

    recordError(errorType, context = {}) {
        const now = Date.now();
        const errorKey = `${errorType}_${context.feature || 'unknown'}`;
        
        if (!this.errorHistory.has(errorKey)) {
            this.errorHistory.set(errorKey, []);
        }

        const errors = this.errorHistory.get(errorKey);
        errors.push({ timestamp: now, context });

        const recentErrors = errors.filter(error => 
            now - error.timestamp < this.errorTimeWindow
        );
        
        this.errorHistory.set(errorKey, recentErrors);

        if (recentErrors.length > this.maxErrorCount) {
            logger.error(`Error threshold exceeded for ${errorKey}. Implementing emergency recovery.`);
            return this.implementEmergencyRecovery(errorType, context);
        }

        return this.getRecoveryAction(errorType, recentErrors.length, context);
    }

    getRecoveryAction(errorType, errorCount, context) {
        const strategy = this.recoveryStrategies.get(errorType);
        
        if (!strategy) {
            logger.warn(`No recovery strategy found for error type: ${errorType}`);
            return {
                action: 'delay',
                duration: humanLikeDelay(ranInt(5000, 15000), 0.3),
                shouldContinue: true
            };
        }

        if (errorCount > strategy.maxRetries) {
            logger.warn(`Max retries exceeded for ${errorType}. Escalating recovery.`);
            return this.escalateRecovery(errorType, context);
        }

        return {
            action: strategy.action,
            duration: strategy.duration(),
            shouldContinue: true,
            attempt: errorCount
        };
    }

    escalateRecovery(errorType, context) {
        const escalationMap = {
            'CAPTCHA_DETECTED': { action: 'pause', duration: 600000 },
            'RATE_LIMITED': { action: 'pause', duration: 900000 },
            'CONNECTION_ERROR': { action: 'restart', duration: 0 },
            'INVALID_RESPONSE': { action: 'skip_feature', duration: 3600000 },
            'COMMAND_FAILED': { action: 'skip_feature', duration: 1800000 },
            'NETWORK_ERROR': { action: 'pause', duration: 300000 }
        };

        const escalation = escalationMap[errorType] || { 
            action: 'pause', 
            duration: 300000 
        };

        logger.warn(`Escalating recovery for ${errorType}: ${escalation.action}`);
        
        return {
            action: escalation.action,
            duration: escalation.duration,
            shouldContinue: escalation.action !== 'restart',
            escalated: true
        };
    }

    implementEmergencyRecovery(errorType, context) {
        logger.error(`Implementing emergency recovery for ${errorType}`);
        
        return {
            action: 'emergency_pause',
            duration: ranInt(1800000, 3600000),
            shouldContinue: false,
            emergency: true
        };
    }

    async executeRecovery(recoveryAction, agent) {
        const { action, duration, shouldContinue, escalated, emergency } = recoveryAction;

        switch (action) {
            case 'pause':
                logger.info(`Pausing operations for ${Math.floor(duration / 60000)} minutes`);
                agent.farmLoopPaused = true;
                setTimeout(() => {
                    agent.farmLoopPaused = false;
                    if (shouldContinue) {
                        agent.farmLoop();
                    }
                }, duration);
                break;

            case 'delay':
                logger.info(`Delaying next operation by ${Math.floor(duration / 1000)} seconds`);
                await agent.client.sleep(duration);
                break;

            case 'retry':
                logger.info(`Retrying operation after ${Math.floor(duration / 1000)} seconds`);
                await agent.client.sleep(duration);
                break;

            case 'skip':
            case 'skip_feature':
                logger.info(`Skipping current operation for ${Math.floor(duration / 60000)} minutes`);
                return duration;

            case 'reconnect':
                logger.info("Attempting to reconnect...");
                try {
                    await agent.client.destroy();
                    await agent.client.sleep(duration);
                    await agent.client.login(agent.client.token);
                } catch (error) {
                    logger.error(`Reconnection failed: ${error.message}`);
                }
                break;

            case 'restart':
                logger.error("Restarting application due to critical errors");
                process.exit(1);
                break;

            case 'emergency_pause':
                logger.error(`Emergency pause activated for ${Math.floor(duration / 60000)} minutes`);
                agent.farmLoopPaused = true;
                setTimeout(() => {
                    agent.farmLoopPaused = false;
                    this.clearErrorHistory();
                    agent.farmLoop();
                }, duration);
                break;

            default:
                logger.warn(`Unknown recovery action: ${action}`);
        }

        return 0;
    }

    clearErrorHistory(errorType = null) {
        if (errorType) {
            this.errorHistory.delete(errorType);
        } else {
            this.errorHistory.clear();
        }
        logger.info("Error history cleared");
    }

    getErrorStats() {
        const stats = {};
        for (const [errorKey, errors] of this.errorHistory) {
            stats[errorKey] = {
                count: errors.length,
                lastOccurrence: Math.max(...errors.map(e => e.timestamp)),
                frequency: errors.length / (this.errorTimeWindow / 60000)
            };
        }
        return stats;
    }

    isHealthy() {
        const totalErrors = Array.from(this.errorHistory.values())
            .reduce((sum, errors) => sum + errors.length, 0);
        
        return totalErrors < this.maxErrorCount * 0.7;
    }
}

export const errorRecoveryManager = new ErrorRecoveryManager();
