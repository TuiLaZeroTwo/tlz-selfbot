const fs = require('fs');
const path = require('path');
const logger = require('./logger');

let configPath = null;
let watcher = null;
let reloadCallback = null;
let lastModified = 0;

const DEBOUNCE_DELAY = 1000;

function init(configFilePath, callback) {
    configPath = path.resolve(configFilePath);
    reloadCallback = callback;

    try {
        watcher = fs.watch(configPath, (eventType) => {
            if (eventType === 'change') {
                handleConfigChange();
            }
        });

        logger.info('🔄 Config hot-reload enabled');
    } catch (error) {
        logger.warn('Config hot-reload not available:', error.message);
    }
}

function handleConfigChange() {
    const now = Date.now();

    if (now - lastModified < DEBOUNCE_DELAY) {
        return;
    }

    lastModified = now;

    setTimeout(() => {
        try {
            delete require.cache[require.resolve(configPath)];

            const newConfig = require(configPath);

            logger.info('🔄 Config file changed, reloading...');

            if (reloadCallback) {
                reloadCallback(newConfig);
            }

            logger.success('✅ Config reloaded successfully');
        } catch (error) {
            logger.error('Failed to reload config:', error.message);
        }
    }, 500);
}

function stop() {
    if (watcher) {
        watcher.close();
        logger.info('Config hot-reload stopped');
    }
}

module.exports = {
    init,
    stop
};
