const logger = require('../utils/logger');
const monitor = require('../utils/monitor');

module.exports = (client, config) => {
    client.on('messageCreate', async message => {
        try {
            if (message.author.bot) return;

            const command = 'stats';
            const prefix = config.prefix;

            if (message.content.startsWith(prefix + command)) {
                if (message.author.id !== config.ownerID) {
                    return;
                }

                const uptime = monitor.getUptime();
                const used = process.memoryUsage();
                const rss = (used.rss / 1024 / 1024).toFixed(2);
                const heapUsed = (used.heapUsed / 1024 / 1024).toFixed(2);
                const heapTotal = (used.heapTotal / 1024 / 1024).toFixed(2);

                const stats = monitor.stats;

                const statsMessage = `
📊 **Bot Statistics**
⏱️  Uptime: \`${uptime}\`
💾 Memory: \`${rss}MB\` (Heap: \`${heapUsed}/${heapTotal}MB\`)
📈 Commands: QR=\`${stats.qrGenerated}\`, Stats=\`${stats.statsUsed}\`
🔄 Presence Updates: \`${stats.presenceUpdates}\`
🎙️  Voice Reconnects: \`${stats.voiceReconnects}\`
❌ Errors: \`${stats.errors}\`
`.trim();

                monitor.incrementStatsUsed();
                await message.channel.send(statsMessage);
            }
        } catch (error) {
            logger.error(`Error in stats command: ${error.message}`);
            monitor.incrementErrors();
            message.channel.send('❌ An error occurred while fetching stats.');
        }
    });

    logger.info('Stats Command initialized');
};
