import { logger } from "./logger.js";
import { formatTime } from "./time.js";

export class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.startTime = Date.now();
        this.memoryBaseline = process.memoryUsage();
        this.operationCounts = new Map();
        this.operationTimes = new Map();
        this.isMonitoring = false;
        this.monitoringInterval = null;
    }

    startMonitoring(intervalMs = 60000) {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        logger.info("Performance monitoring started");
        
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, intervalMs);
    }

    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        logger.info("Performance monitoring stopped");
    }

    collectMetrics() {
        const now = Date.now();
        const memory = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        this.metrics.set('timestamp', now);
        this.metrics.set('uptime', now - this.startTime);
        this.metrics.set('memory', {
            rss: memory.rss,
            heapUsed: memory.heapUsed,
            heapTotal: memory.heapTotal,
            external: memory.external,
            arrayBuffers: memory.arrayBuffers
        });
        this.metrics.set('cpu', cpuUsage);
        
        this.checkMemoryLeaks(memory);
        this.logPerformanceStats();
    }

    checkMemoryLeaks(currentMemory) {
        const heapGrowth = currentMemory.heapUsed - this.memoryBaseline.heapUsed;
        const rssGrowth = currentMemory.rss - this.memoryBaseline.rss;
        
        if (heapGrowth > 100 * 1024 * 1024) { // 100MB growth
            logger.warn(`Potential memory leak detected: Heap grew by ${Math.round(heapGrowth / 1024 / 1024)}MB`);
        }
        
        if (rssGrowth > 200 * 1024 * 1024) { // 200MB growth
            logger.warn(`High memory usage detected: RSS grew by ${Math.round(rssGrowth / 1024 / 1024)}MB`);
        }
    }

    logPerformanceStats() {
        const memory = this.metrics.get('memory');
        const uptime = this.metrics.get('uptime');
        
        logger.debug(`Performance Stats - Uptime: ${formatTime(0, uptime)}, ` +
                    `Heap: ${Math.round(memory.heapUsed / 1024 / 1024)}MB, ` +
                    `RSS: ${Math.round(memory.rss / 1024 / 1024)}MB`);
    }

    startOperation(operationName) {
        const startTime = process.hrtime.bigint();
        return {
            name: operationName,
            startTime,
            end: () => this.endOperation(operationName, startTime)
        };
    }

    endOperation(operationName, startTime) {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        if (!this.operationTimes.has(operationName)) {
            this.operationTimes.set(operationName, []);
        }
        
        const times = this.operationTimes.get(operationName);
        times.push(duration);
        
        // Keep only last 100 measurements
        if (times.length > 100) {
            times.shift();
        }
        
        // Update operation count
        const count = this.operationCounts.get(operationName) || 0;
        this.operationCounts.set(operationName, count + 1);
        
        // Log slow operations
        if (duration > 5000) { // 5 seconds
            logger.warn(`Slow operation detected: ${operationName} took ${Math.round(duration)}ms`);
        }
        
        return duration;
    }

    getOperationStats(operationName) {
        const times = this.operationTimes.get(operationName) || [];
        const count = this.operationCounts.get(operationName) || 0;
        
        if (times.length === 0) {
            return { count: 0, avgTime: 0, minTime: 0, maxTime: 0 };
        }
        
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        
        return {
            count,
            avgTime: Math.round(avgTime),
            minTime: Math.round(minTime),
            maxTime: Math.round(maxTime),
            recentTimes: times.slice(-10)
        };
    }

    getAllStats() {
        const stats = {
            uptime: this.metrics.get('uptime') || 0,
            memory: this.metrics.get('memory') || {},
            operations: {}
        };
        
        for (const operationName of this.operationCounts.keys()) {
            stats.operations[operationName] = this.getOperationStats(operationName);
        }
        
        return stats;
    }

    getHealthScore() {
        const memory = this.metrics.get('memory') || {};
        const heapUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;
        
        let score = 100;
        
        // Deduct points for high memory usage
        if (heapUsagePercent > 80) {
            score -= 30;
        } else if (heapUsagePercent > 60) {
            score -= 15;
        }
        
        // Deduct points for slow operations
        for (const operationName of this.operationTimes.keys()) {
            const stats = this.getOperationStats(operationName);
            if (stats.avgTime > 3000) {
                score -= 10;
            } else if (stats.avgTime > 1000) {
                score -= 5;
            }
        }
        
        return Math.max(0, Math.min(100, score));
    }

    optimizePerformance() {
        const suggestions = [];
        const memory = this.metrics.get('memory') || {};
        const heapUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;
        
        if (heapUsagePercent > 70) {
            suggestions.push("High memory usage detected. Consider running garbage collection.");
            if (global.gc) {
                global.gc();
                logger.info("Garbage collection triggered");
            }
        }
        
        // Clear old operation data
        for (const [operationName, times] of this.operationTimes) {
            if (times.length > 50) {
                this.operationTimes.set(operationName, times.slice(-25));
            }
        }
        
        // Clear old metrics
        const now = Date.now();
        const oneHourAgo = now - 3600000;
        
        for (const [key, value] of this.metrics) {
            if (typeof value === 'object' && value.timestamp && value.timestamp < oneHourAgo) {
                this.metrics.delete(key);
            }
        }
        
        return suggestions;
    }

    reset() {
        this.metrics.clear();
        this.operationCounts.clear();
        this.operationTimes.clear();
        this.startTime = Date.now();
        this.memoryBaseline = process.memoryUsage();
        logger.info("Performance metrics reset");
    }

    generateReport() {
        const stats = this.getAllStats();
        const healthScore = this.getHealthScore();
        
        const report = {
            timestamp: new Date().toISOString(),
            uptime: formatTime(0, stats.uptime),
            healthScore,
            memory: {
                heapUsed: `${Math.round(stats.memory.heapUsed / 1024 / 1024)}MB`,
                heapTotal: `${Math.round(stats.memory.heapTotal / 1024 / 1024)}MB`,
                rss: `${Math.round(stats.memory.rss / 1024 / 1024)}MB`
            },
            operations: stats.operations
        };
        
        return report;
    }
}

export const performanceMonitor = new PerformanceMonitor();
