const logger = require('../utils/logger');

module.exports = (client, config) => {
    client.on('messageCreate', async message => {
        try {
            if (message.author.bot) return;

            const command = 'help';
            const prefix = config.prefix;

            if (message.content.startsWith(prefix + command)) {
                if (message.author.id !== config.ownerID) {
                    return;
                }

                const helpMessage = `**Available Commands:**\n- ${Object.keys(config).filter(cmd => config[cmd].enabled).join('\n- ')}`;
                await message.channel.send(helpMessage);
            }
        } catch (error) {
            logger.error(`Error in helpCommand: ${error.message}`);
            message.channel.send('An error occurred while processing your command.');
        }
    });

    logger.info('Help Command initialized');
}