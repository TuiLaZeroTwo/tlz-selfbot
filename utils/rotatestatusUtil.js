const { CustomStatus } = require('discord.js-selfbot-v13');
const logger = require('./logger');

let messages = [];
let emojis = [];
let currentIndex = 0;
let intervalId = null; 
let updateCallback = null;

function init(config, callback) {

    messages = Object.values(config.rotatestatus.message || {});
    emojis = Object.values(config.rotatestatus.emoji || {});
    currentIndex = 0; 
    updateCallback = callback;

    if (intervalId) {
        clearInterval(intervalId);
        logger.info('Stopped old rotating status interval.');
    }

    if (messages.length === 0 && emojis.length === 0) {
        logger.warn('No custom status messages or emojis configured. Rotating status will not start.');
        return;
    }


    intervalId = setInterval(() => {
        currentIndex = (currentIndex + 1) % messages.length;
        if (updateCallback) {
            updateCallback(); 
        }
    }, config.rotatestatus.interval); 
}

function getCurrentStatus(client) {
    if (messages.length === 0 && emojis.length === 0) {
        return null;
    }

    const currentMessage = messages[currentIndex];
    const currentEmoji = emojis[currentIndex];

    const customStatusBuilder = new CustomStatus(client);

    if (currentEmoji) {
        customStatusBuilder.setEmoji(currentEmoji);
    }
    if (currentMessage) {
        customStatusBuilder.setState(currentMessage);
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