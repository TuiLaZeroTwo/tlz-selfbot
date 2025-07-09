const logger = require('../utils/logger'); 
const getRpcActivity = require('../utils/rpcUtil'); 
const rotateStatus = require('../utils/rotatestatusUtil'); 

let currentRpcActivity = null;
let currentCustomStatusActivity = null;
let clientInstance = null; 

async function updateOverallPresence() {
    if (!clientInstance || !clientInstance.user) { 
        logger.error('Client not ready or user not available to update presence.');
        return;
    }
    const activities = [currentRpcActivity, currentCustomStatusActivity].filter(Boolean); // Filter out null activities

    if (activities.length === 0) { 
        logger.warn('No activities to set. Clearing presence.');
        try {

            await clientInstance.user.setPresence({ activities: [] }); 
        } catch (e) {
            logger.error('Failed to clear presence:', e);
        }
        return;
    }

    try {
        await clientInstance.user.setPresence({ activities: activities }); 
    } catch (error) {
        logger.error('Failed to set overall Discord presence:', error);
    }
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
        }

        if (config.rotatestatus.enabled) { 
            rotateStatus.init(config, () => {
                currentCustomStatusActivity = rotateStatus.getCurrentStatus(client);
                updateOverallPresence(); 
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
    });

    client.on('reconnecting', () => {
        logger.info('Client reconnecting...');
    });
};
