const os = require('os');
const logger = require('../utils/logger');

module.exports = async (client, config) => {

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.author.id !== config.ownerID) {
        return;
    }

    if (message.content.startsWith(config.prefix + 'hoststatus')) {
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();
        const cpuUsage = os.cpus().map(cpu => cpu.times);
        const platform = os.platform();
        const arch = os.arch();

        const statusMessage = `\`Uptime: ${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s | Usage: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB | CPU: ${cpuUsage.core}% | Platform: ${platform} | Arch: ${arch}\``;

        message.channel.send(`${statusMessage}`)
    }



})
  logger.info('Host status command initialized');
}