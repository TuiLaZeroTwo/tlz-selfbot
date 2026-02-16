const { CustomStatus } = require('discord.js-selfbot-v13');
const logger = require('./logger');

let cachedStatuses = [];
let intervalId = null;
let updateCallback = null;

function init(config, callback) {
    const messages = Object.values(config.rotatestatus.message || {});
    const emojis = Object.values(config.rotatestatus.emoji || {});
    currentIndex = 0;
    updateCallback = callback;

    if (intervalId) {
        clearInterval(intervalId);
        logger.info('Stopped old rotating status interval.');
    }

    if (messages.length === 0 && emojis.length === 0) {
        logger.warn('No custom status messages or emojis configured. Rotating status will not start.');
        cachedStatuses = [];
        return;
    }

    cachedStatuses = [];
    const maxLength = Math.max(messages.length, emojis.length);

    for (let i = 0; i < maxLength; i++) {
        const message = messages[i] || messages[messages.length - 1];
        const emoji = emojis[i] || emojis[emojis.length - 1];

        cachedStatuses.push({
            message: message || null,
            emoji: emoji || null
        });
    }

    intervalId = setInterval(() => {
        currentIndex = (currentIndex + 1) % cachedStatuses.length;
        if (updateCallback) {
            updateCallback();
        }
    }, config.rotatestatus.interval);
}

function getCurrentStatus(client) {
    if (cachedStatuses.length === 0) {
        return null;
    }

    const cached = cachedStatuses[currentIndex];
    const customStatusBuilder = new CustomStatus(client);

    if (cached.emoji) {
        customStatusBuilder.setEmoji(cached.emoji);
    }
    if (cached.message) {
        customStatusBuilder.setState(cached.message);
    }

    return customStatusBuilder.toJSON();
}

function stop() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        logger.info('Rotating status interval stopped.');
    }
}

module.exports = {
    init,
    getCurrentStatus,
    stop
};