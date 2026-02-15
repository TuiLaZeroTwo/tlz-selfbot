const logger = require('./logger');

class Monitor {
    constructor() {
        this.startTime = Date.now();
        this.stats = {
            presenceUpdates: 0,
            qrGenerated: 0,
            voiceReconnects: 0,
            statsUsed: 0,
            errors: 0
        };
    }

    start() {
        logger.info('📊 Monitor started');

        setInterval(() => {
            this.logUptime();
        }, 30 * 60 * 1000);

        setInterval(() => {
            this.logMemory();
        }, 60 * 60 * 1000);
    }

    getUptime() {
        const uptime = Date.now() - this.startTime;
        const hours = Math.floor(uptime / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    logUptime() {
        logger.info(`⏱️  Uptime: ${this.getUptime()}`);
    }

    logMemory() {
        const used = process.memoryUsage();
        const rss = (used.rss / 1024 / 1024).toFixed(2);
        const heapUsed = (used.heapUsed / 1024 / 1024).toFixed(2);
        const heapTotal = (used.heapTotal / 1024 / 1024).toFixed(2);

        logger.info(`💾 Memory: RSS=${rss}MB, Heap=${heapUsed}/${heapTotal}MB`);
    }

    logStats() {
        logger.info(`📈 Stats: Presence=${this.stats.presenceUpdates}, QR=${this.stats.qrGenerated}, Voice Reconnects=${this.stats.voiceReconnects}, Stats Used=${this.stats.statsUsed}, Errors=${this.stats.errors}`);
    }

    incrementPresenceUpdates() {
        this.stats.presenceUpdates++;
    }

    incrementQrGenerated() {
        this.stats.qrGenerated++;
    }

    incrementVoiceReconnects() {
        this.stats.voiceReconnects++;
    }

    incrementStatsUsed() {
        this.stats.statsUsed++;
    }

    incrementErrors() {
        this.stats.errors++;
    }
}

module.exports = new Monitor();
