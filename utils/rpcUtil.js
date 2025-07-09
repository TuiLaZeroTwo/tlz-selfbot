const { RichPresence } = require('discord.js-selfbot-v13');
const logger = require('./logger');

module.exports = (client, config) => {

  const rpc = new RichPresence(client)  
    .setApplicationId(config.rpc.application_id)
    .setType(config.rpc.type)
    .setName(config.rpc.name)
    .setDetails(config.rpc.details)
    .setState(config.rpc.state)
    .setAssetsLargeImage(config.rpc.large_image)
    .setAssetsLargeText(config.rpc.large_image_text)
    .setAssetsSmallImage(config.rpc.small_image)
    .setAssetsSmallText(config.rpc.small_image_text)
    .setStartTimestamp(Date.now())
    .setButtons([
      {
        name: config.rpc.buttons.name1,
        url: config.rpc.buttons.url1
      },
      {
        name: config.rpc.buttons.name2,
        url: config.rpc.buttons.url2
      }
    ]);

  logger.info('RPC initialized with state');
  
  client.on('ready', () => {
    logger.success(`RPC is active`);
    client.user.setActivity(rpc.toJSON());
  });
}