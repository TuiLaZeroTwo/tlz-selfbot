const { RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');
const logger = require('./logger');

module.exports = async (client, config) => {
  const mode = config.rpc.mode;
  let rpcPayload = null;

  if (!mode || mode === 'none') { 
    logger.warn('RPC mode is set to "none", skipping RPC initialization.');
    return;
  }

  if (mode === 'rpc') {
    const rpcBuilder = new RichPresence(client)
      .setApplicationId(config.rpc.application_id)
      .setType(config.rpc.type)
      .setName(config.rpc.name)
      .setDetails(config.rpc.details)
      .setState(config.rpc.state)
      .setAssetsLargeImage(config.rpc.large_image)
      .setAssetsLargeText(config.rpc.large_image_text)
      .setAssetsSmallImage(config.rpc.small_image)
      .setAssetsSmallText(config.rpc.small_image_text)
      .setStartTimestamp(Date.now());
    
    if (config.rpc.buttons && config.rpc.buttons.name1 && config.rpc.buttons.url1) {
      const buttons = [{ name: config.rpc.buttons.name1, url: config.rpc.buttons.url1 }];
      if (config.rpc.buttons.name2 && config.rpc.buttons.url2) {
          buttons.push({ name: config.rpc.buttons.name2, url: config.rpc.buttons.url2 });
       }
        rpcBuilder.setButtons(buttons);
    }
    rpcPayload = rpcBuilder.toJSON();
    logger.info(`RPC Mode: ${mode}`);
  }

  if (mode === 'weather') {
    const weatherApiUrl = config.rpc.weather_location ?
    `https://vi.wttr.in/${encodeURIComponent(config.rpc.weather_location)}?format=j1` : 
    'https://vi.wttr.in/HaNoi?format=j1';
    const response = await axios.get(weatherApiUrl);
    const weather = response.data.current_condition[0];

    if (!weather) {
    logger.warn('No weather data found. Please check your configuration.');
    return; 
    }
    const rpcBuilder = new RichPresence(client)
      .setType('3')
      .setName('Weather forecast')
      .setDetails(`Weather: ${weather.weatherDesc[0].value} | ${weather.observation_time}`)
      .setState(`Temperature: ${weather.temp_C}°C | Feels Like: ${weather.FeelsLikeC}°C`)
      .setAssetsLargeImage(config.rpc.weather_images.weathericon)
      .setAssetsLargeText(`Humidity: ${weather.humidity}% | Cloud Cover: ${weather.cloudcover}%`)
      .setAssetsSmallImage(config.rpc.small_image)
      .setAssetsSmallText(`Wind: ${weather.windspeedKmph} km/h | Direction: ${weather.winddir16Point}`)
      .setStartTimestamp(Date.now());
    rpcPayload = rpcBuilder.toJSON();
    logger.info(`RPC Mode: ${mode}`);
  }

  client.on('ready', async () => {
        if (rpcPayload) {
            try {
                await client.user.setPresence(rpcPayload);
                logger.success(`RPC is active with mode: "${mode}"`);
            } catch (error) {
                logger.error(`Failed to set RPC activity for mode "${mode}":`, error);
            }
        }
  });
}