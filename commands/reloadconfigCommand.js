const logger = require('../utils/logger'); 
const path = require('path');

module.exports = (client, config) => {
  client.on('messageCreate', async message => {
    try {
      if (message.author.bot) return;

      const prefix = config.prefix;

      if (message.content.startsWith(prefix + 'reloadconfig')) {
    
        if (message.author.id !== config.ownerID) {
          return;
        }

        try {
          const configPath = path.resolve(__dirname, '../config.js'); 
 
          delete require.cache[require.resolve(configPath)];

          const newConfig = require(configPath);

          Object.assign(config, newConfig);

          message.channel.send('Success.');
          logger.info('Config reloaded by ' + message.author.tag);
        } catch (error) {
          logger.error(`Can't reload config ${error.message}`);
          message.channel.send('View logs, can\'t reload');
        }
      }
    } catch (error) {
      logger.error(`Error messageCreate: ${error.message}`);
      message.channel.send('Error occured');
    }
  });

  logger.info('Reload Config Command initialized');
};
