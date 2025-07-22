import { exponentialBackoff, ranInt } from "./math.js";
import { logger } from "./logger.js";

export class RetryManager {
    constructor(maxRetries = 3, baseDelay = 1000) {
        this.maxRetries = maxRetries;
        this.baseDelay = baseDelay;
        this.retryHistory = new Map();
    }

    async executeWithRetry(operation, context = {}) {
        const { 
            maxRetries = this.maxRetries, 
            baseDelay = this.baseDelay,
            retryCondition = () => true,
            onRetry = () => {},
            operationId = 'unknown'
        } = context;

        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = exponentialBackoff(attempt - 1, baseDelay);
                    logger.debug(`Retrying ${operationId} (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms`);
                    await this.sleep(delay);
                    onRetry(attempt, lastError);
                }

                const result = await operation(attempt);
                
                if (attempt > 0) {
                    logger.info(`${operationId} succeeded on attempt ${attempt + 1}`);
                }
                
                this.recordSuccess(operationId);
                return result;
                
            } catch (error) {
                lastError = error;
                this.recordFailure(operationId, error);
                
                if (attempt === maxRetries || !retryCondition(error, attempt)) {
                    logger.error(`${operationId} failed after ${attempt + 1} attempts: ${error.message}`);
                    throw error;
                }
                
                logger.warn(`${operationId} failed on attempt ${attempt + 1}: ${error.message}`);
            }
        }
        
        throw lastError;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    recordSuccess(operationId) {
        if (!this.retryHistory.has(operationId)) {
            this.retryHistory.set(operationId, { successes: 0, failures: 0, lastFailure: null });
        }
        this.retryHistory.get(operationId).successes++;
    }

    recordFailure(operationId, error) {
        if (!this.retryHistory.has(operationId)) {
            this.retryHistory.set(operationId, { successes: 0, failures: 0, lastFailure: null });
        }
        const history = this.retryHistory.get(operationId);
        history.failures++;
        history.lastFailure = {
            error: error.message,
            timestamp: Date.now()
        };
    }

    getSuccessRate(operationId) {
        const history = this.retryHistory.get(operationId);
        if (!history) return 0;
        
        const total = history.successes + history.failures;
        return total > 0 ? history.successes / total : 0;
    }

    shouldSkipOperation(operationId, threshold = 0.1) {
        const successRate = this.getSuccessRate(operationId);
        const history = this.retryHistory.get(operationId);
        
        if (!history || (history.successes + history.failures) < 5) {
            return false;
        }
        
        return successRate < threshold;
    }

    reset(operationId) {
        if (operationId) {
            this.retryHistory.delete(operationId);
        } else {
            this.retryHistory.clear();
        }
    }
}

export const createRetryableOperation = (operation, context = {}) => {
    const retryManager = new RetryManager();
    return () => retryManager.executeWithRetry(operation, context);
};

export const isRetryableError = (error) => {
    const retryablePatterns = [
        /timeout/i,
        /network/i,
        /connection/i,
        /rate limit/i,
        /temporary/i,
        /unavailable/i,
        /502/,
        /503/,
        /504/
    ];
    
    return retryablePatterns.some(pattern => pattern.test(error.message));
};

export const createSmartRetryCondition = (customConditions = []) => {
    return (error, attempt) => {
        if (!isRetryableError(error)) {
            return false;
        }
        
        for (const condition of customConditions) {
            if (!condition(error, attempt)) {
                return false;
            }
        }
        
        return true;
    };
};

export const defaultRetryManager = new RetryManager();
