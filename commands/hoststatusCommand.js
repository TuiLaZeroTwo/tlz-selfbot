const os = require('os');
const logger = require('../utils/logger');

let previousCpuTimes = null;

function getCpuUsagePercentage(oldTimes, newTimes) {
    if (!oldTimes || !newTimes) return 'N/A';

    let totalIdle = 0;
    let totalTick = 0;

    for (let i = 0; i < oldTimes.length; i++) {
        const idleDifference = newTimes[i].idle - oldTimes[i].idle;
        const oldTotal = oldTimes[i].user + oldTimes[i].nice + oldTimes[i].sys + oldTimes[i].idle + oldTimes[i].irq;
        const newTotal = newTimes[i].user + newTimes[i].nice + newTimes[i].sys + newTimes[i].idle + newTimes[i].irq;

        totalIdle += idleDifference;
        totalTick += (newTotal - oldTotal);
    }

    if (totalTick === 0) return '0.00';

    const cpuPercentage = ((totalTick - totalIdle) / totalTick) * 100;
    return cpuPercentage.toFixed(2);
}

module.exports = async (client, config) => {

    previousCpuTimes = os.cpus().map(cpu => cpu.times);

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        if (message.author.id !== config.ownerID) {
            return;
        }

        if (message.content.startsWith(config.prefix + 'hoststatus')) {
            const uptime = process.uptime();
            const memoryUsage = process.memoryUsage();
            const platform = os.platform();
            const arch = os.arch();

            const currentCpuTimes = os.cpus().map(cpu => cpu.times);

            const cpuPercentage = getCpuUsagePercentage(previousCpuTimes, currentCpuTimes);

            previousCpuTimes = currentCpuTimes;

            const statusMessage = `\`Uptime: ${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s | Usage: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB | CPU: ${cpuPercentage}% | Platform: ${platform} | Arch: ${arch}\``;

            message.channel.send(`${statusMessage}`);
        }
    });

    logger.info('Host status command initialized');
};