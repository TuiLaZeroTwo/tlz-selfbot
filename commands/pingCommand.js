const logger = require('../utils/logger');

module.exports = (client, config) => {
  client.on('messageCreate', async message => {
    try {
      if (message.author.bot) return;

      const command = 'ping';
      const prefix = config.prefix;

      if (message.content.startsWith(prefix + command)) {
        if (message.author.id !== config.ownerID) {
          return;
        }

        const ping = client.ws.ping;
        await message.channel.send(`🏓 Pong! WebSocket ping: ${ping}ms`);
      }
    } catch (error) {
      logger.error(`Error in pingCommand: ${error.message}`);
      message.channel.send('An error occurred while processing your command.');
    }
  });

  logger.info('Ping Command initialized');
}