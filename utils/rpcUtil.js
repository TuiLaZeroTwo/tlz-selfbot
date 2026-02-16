const { RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');
const logger = require('./logger');

let weatherCache = {
    data: null,
    timestamp: 0,
    ttl: 15 * 60 * 1000
};

async function fetchWeatherData(location) {
    const now = Date.now();

    if (weatherCache.data && (now - weatherCache.timestamp) < weatherCache.ttl) {
        return weatherCache.data;
    }

    try {
        const weatherApiUrl = location ?
            `https://vi.wttr.in/${encodeURIComponent(location)}?format=j1` :
            'https://vi.wttr.in/HaNoi?format=j1';

        const response = await axios.get(weatherApiUrl, {
            timeout: 5000
        });

        const weather = response.data.current_condition[0];

        if (!weather) {
            logger.warn('Cannot retrieve weather data. No current condition found.');
            return weatherCache.data;
        }

        weatherCache.data = weather;
        weatherCache.timestamp = now;

        return weather;
    } catch (error) {
        logger.error('Cannot get weather data:', error.message);

        if (weatherCache.data) {
            logger.info('Using stale cached weather data as fallback');
            return weatherCache.data;
        }

        return null;
    }
}

module.exports = async (client, config) => {
    const mode = config.rpc.mode;
    let rpcPayload = null;

    if (!mode || mode === 'none') {
        logger.warn('RPC mode is "none", skip this Util');
        return null;
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

        if (config.rpc.type === 1 && config.rpc.url) {
            rpcBuilder.setURL(config.rpc.url);
        }

        if (config.rpc.buttons && config.rpc.buttons.name1 && config.rpc.buttons.url1) {
            const buttons = [{ name: config.rpc.buttons.name1, url: config.rpc.buttons.url1 }];
            if (config.rpc.buttons.name2 && config.rpc.buttons.url2) {
                buttons.push({ name: config.rpc.buttons.name2, url: config.rpc.buttons.url2 });
            }
            rpcBuilder.setButtons(buttons);
        }

        rpcPayload = rpcBuilder.toJSON();
    }
    else if (mode === 'weather') {
        const weather = await fetchWeatherData(config.rpc.weather_location);

        if (!weather) {
            return null;
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
    }

    return rpcPayload;
};
