const { CustomStatus } = require('discord.js-selfbot-v13');
const logger = require('./logger');

module.exports = async (client, config) => {

  const messages = Object.values(config.rotatestatus.message);
  const emojis = Object.values(config.rotatestatus.emoji);
  let index = 0;

  setInterval(() => {
    const custom = new CustomStatus(client)
      .setEmoji(emojis[index])
      .setState(messages[index])

    client.user.setActivity( custom );
    index = (index + 1) % messages.length;
  }, config.rotatestatus.interval);

  logger.info('Rotate status initialized');
}