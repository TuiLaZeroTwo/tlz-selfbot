import { logger } from "./logger.js";
import { ranInt, exponentialBackoff } from "./math.js";

export class ConnectionMonitor {
    constructor(client) {
        this.client = client;
        this.isMonitoring = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.lastPingTime = Date.now();
        this.pingInterval = null;
        this.connectionHealth = 'good';
        this.latencyHistory = [];
        this.maxLatencyHistory = 20;
    }

    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        logger.info("Starting connection monitoring...");
        
        this.client.on('ready', () => {
            logger.info("Client ready - connection established");
            this.reconnectAttempts = 0;
            this.connectionHealth = 'good';
            this.startPingMonitoring();
        });

        this.client.on('disconnect', () => {
            logger.warn("Client disconnected");
            this.connectionHealth = 'disconnected';
            this.stopPingMonitoring();
            this.handleReconnection();
        });

        this.client.on('error', (error) => {
            logger.error(`Connection error: ${error.message}`);
            this.connectionHealth = 'error';
        });

        this.client.on('warn', (warning) => {
            logger.warn(`Connection warning: ${warning}`);
        });

        this.client.on('rateLimit', (rateLimitInfo) => {
            logger.warn(`Rate limited: ${JSON.stringify(rateLimitInfo)}`);
            this.connectionHealth = 'rate_limited';
        });
    }

    stopMonitoring() {
        this.isMonitoring = false;
        this.stopPingMonitoring();
        logger.info("Connection monitoring stopped");
    }

    startPingMonitoring() {
        if (this.pingInterval) return;
        
        this.pingInterval = setInterval(() => {
            this.checkPing();
        }, 30000);
    }

    stopPingMonitoring() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    async checkPing() {
        try {
            const startTime = Date.now();
            await this.client.ws.ping();
            const latency = Date.now() - startTime;
            
            this.updateLatencyHistory(latency);
            this.assessConnectionHealth(latency);
            
            logger.debug(`Ping: ${latency}ms`);
        } catch (error) {
            logger.error(`Ping failed: ${error.message}`);
            this.connectionHealth = 'poor';
        }
    }

    updateLatencyHistory(latency) {
        this.latencyHistory.push(latency);
        if (this.latencyHistory.length > this.maxLatencyHistory) {
            this.latencyHistory.shift();
        }
    }

    assessConnectionHealth(currentLatency) {
        if (this.latencyHistory.length < 3) return;
        
        const avgLatency = this.latencyHistory.reduce((sum, lat) => sum + lat, 0) / this.latencyHistory.length;
        
        if (avgLatency < 100) {
            this.connectionHealth = 'excellent';
        } else if (avgLatency < 250) {
            this.connectionHealth = 'good';
        } else if (avgLatency < 500) {
            this.connectionHealth = 'fair';
        } else {
            this.connectionHealth = 'poor';
        }
    }

    async handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error("Max reconnection attempts reached. Manual intervention required.");
            return;
        }

        this.reconnectAttempts++;
        const delay = exponentialBackoff(this.reconnectAttempts - 1, 5000, 60000);
        
        logger.info(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.floor(delay / 1000)}s...`);
        
        setTimeout(async () => {
            try {
                await this.client.login(this.client.token);
                logger.info("Reconnection successful");
            } catch (error) {
                logger.error(`Reconnection failed: ${error.message}`);
                this.handleReconnection();
            }
        }, delay);
    }

    getConnectionStatus() {
        return {
            health: this.connectionHealth,
            reconnectAttempts: this.reconnectAttempts,
            averageLatency: this.latencyHistory.length > 0 
                ? Math.round(this.latencyHistory.reduce((sum, lat) => sum + lat, 0) / this.latencyHistory.length)
                : null,
            isConnected: this.client.readyAt !== null
        };
    }

    shouldDelayOperations() {
        return this.connectionHealth === 'poor' || 
               this.connectionHealth === 'rate_limited' || 
               this.connectionHealth === 'disconnected';
    }

    getRecommendedDelay() {
        switch (this.connectionHealth) {
            case 'poor':
                return ranInt(5000, 15000);
            case 'rate_limited':
                return ranInt(30000, 60000);
            case 'disconnected':
                return ranInt(60000, 120000);
            case 'fair':
                return ranInt(2000, 5000);
            default:
                return 0;
        }
    }

    async waitForStableConnection(maxWaitTime = 300000) {
        const startTime = Date.now();
        
        while (this.shouldDelayOperations() && (Date.now() - startTime) < maxWaitTime) {
            logger.debug(`Waiting for stable connection... Current health: ${this.connectionHealth}`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        if (this.shouldDelayOperations()) {
            throw new Error("Connection did not stabilize within the maximum wait time");
        }
    }
}

export const createConnectionMonitor = (client) => {
    return new ConnectionMonitor(client);
};
