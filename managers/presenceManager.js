const logger = require('../utils/logger');
const getRpcActivity = require('../utils/rpcUtil');
const rotateStatus = require('../utils/rotatestatusUtil');
const monitor = require('../utils/monitor');

let currentRpcActivity = null;
let currentCustomStatusActivity = null;
let clientInstance = null;
let lastPresenceJSON = null;
let updateTimeout = null;
const DEBOUNCE_DELAY = 300;
const WEATHER_REFRESH_INTERVAL = 15 * 60 * 1000;

async function updateOverallPresence() {
    if (!clientInstance || !clientInstance.user) {
        logger.error('Client not ready or user not available to update presence.');
        return;
    }
    const activities = [currentRpcActivity, currentCustomStatusActivity].filter(Boolean);

    if (activities.length === 0) {
        const emptyPresenceJSON = JSON.stringify([]);

        if (lastPresenceJSON !== emptyPresenceJSON) {
            logger.warn('No activities to set. Clearing presence.');
            try {
                await clientInstance.user.setPresence({ activities: [] });
                lastPresenceJSON = emptyPresenceJSON;
                monitor.incrementPresenceUpdates();
            } catch (e) {
                logger.error('Failed to clear presence:', e);
            }
        }
        return;
    }

    const newPresenceJSON = JSON.stringify(activities);
    if (newPresenceJSON === lastPresenceJSON) {
        return;
    }

    try {
        await clientInstance.user.setPresence({ activities: activities });
        lastPresenceJSON = newPresenceJSON;
        monitor.incrementPresenceUpdates();
    } catch (error) {
        logger.error('Failed to set overall Discord presence:', error);
    }
}

function debouncedUpdatePresence() {
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }

    updateTimeout = setTimeout(() => {
        updateOverallPresence();
        updateTimeout = null;
    }, DEBOUNCE_DELAY);
}

module.exports = async (client, config) => {
    clientInstance = client;

    client.on('ready', async () => {

        if (config.rpc.enabled) {
            currentRpcActivity = await getRpcActivity(client, config);
            if (currentRpcActivity) {
                logger.info('RPC activity is ready.');
            } else {
                logger.warn('RPC is enabled but could not create RPC activity.');
            }

            if (config.rpc.mode === 'weather') {
                setInterval(async () => {
                    const newRpcActivity = await getRpcActivity(client, config);
                    if (newRpcActivity) {
                        currentRpcActivity = newRpcActivity;
                        await updateOverallPresence();
                    }
                }, WEATHER_REFRESH_INTERVAL);
            }
        }

        if (config.rotatestatus.enabled) {
            rotateStatus.init(config, () => {
                currentCustomStatusActivity = rotateStatus.getCurrentStatus(client);
                debouncedUpdatePresence();
            });
            currentCustomStatusActivity = rotateStatus.getCurrentStatus(client);
            if (currentCustomStatusActivity) {
                logger.info('Rotating status is ready.');
            } else {
                logger.warn('Rotating status is enabled but could not create custom status activity.');
            }
        } else {
            logger.info('Rotating status is not enabled in config.');
            currentCustomStatusActivity = null;
            rotateStatus.stop();
        }
        await updateOverallPresence();

        logger.success('Presence manager initialized and presence set.');
    });

    client.on('disconnect', () => {
        logger.warn('Client disconnected. Stopping rotating status interval.');
        rotateStatus.stop();

        if (updateTimeout) {
            clearTimeout(updateTimeout);
            updateTimeout = null;
        }
    });

    client.on('reconnecting', () => {
        logger.info('Client reconnecting...');
    });
};
