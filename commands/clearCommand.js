const logger = require('../utils/logger');
const { Permissions } = require('discord.js-selfbot-v13');

module.exports = (client, config) => {
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (message.author.id !== config.ownerID) return;

        if (message.content === config.prefix + 'clear') {
            logger.warn('WARNING: Using the "clearallrecent" command can violate Discord\'s Terms of Service and may lead to account termination. Use at your own risk.');

            const confirmationMessage = await message.channel.send(
                '**WARNING**: This command will attempt to delete the most recent message in *all* text channels across *all* servers your account is in. This action can violate Discord\'s Terms of Service and may lead to account termination. Are you sure you want to proceed? Reply with `yes` to confirm within 10 seconds.'
            );

            const filter = m => m.author.id === config.ownerID && m.content.toLowerCase() === 'yes';
            try {
                const collected = await message.channel.awaitMessages({ filter, max: 1, time: 10000, errors: ['time'] });
                const confirmation = collected.first();

                if (!confirmation) {
                    return message.channel.send('Confirmation not received. Command cancelled.').then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000)).catch(() => {});
                }
                await confirmation.delete().catch(() => {});
                await confirmationMessage.delete().catch(() => {});


                let deletedCount = 0;
                let channelsProcessed = 0;
                let errorsEncountered = 0;
                const processedChannels = []; 

                await message.channel.send('Starting to clear recent messages from all channels... This may take a while.').then(msg => setTimeout(() => msg.delete().catch(() => {}), 10000)).catch(() => {});

                for (const [guildId, guild] of client.guilds.cache) {
                    logger.info(`Processing guild: ${guild.name} (${guildId})`);

                    for (const [channelId, channel] of guild.channels.cache) {

                        if (channel.type === 'GUILD_TEXT') {
                            channelsProcessed++;
                            const selfMember = guild.members.cache.get(client.user.id);

                            if (!selfMember) {
                                logger.warn(`Could not find self member in guild ${guild.name}. Skipping channel ${channel.name}.`);
                                continue;
                            }

                            const channelPermissions = channel.permissionsFor(selfMember);

                           
                            if (!channelPermissions.has(Permissions.FLAGS.VIEW_CHANNEL) || !channelPermissions.has(Permissions.FLAGS.READ_MESSAGE_HISTORY)) {
                                logger.debug(`Missing VIEW_CHANNEL or READ_MESSAGE_HISTORY permissions in #${channel.name} (${channelId}) in guild ${guild.name}. Skipping.`);
                                continue;
                            }

                            try {

                                const messages = await channel.messages.fetch({ limit: 1 });
                                const lastMessage = messages.first();

                                if (lastMessage) {

                                    if (lastMessage.author.id === client.user.id) {
                                        await lastMessage.delete();
                                        deletedCount++;
                                        processedChannels.push(`\`#${channel.name}\` in \`${guild.name}\``);
                                        logger.info(`Deleted message in #${channel.name} (${channelId}) in guild ${guild.name} (${guildId}).`);
                                        await new Promise(resolve => setTimeout(resolve, 500));
                                    } else {
                                    }
                                }
                            } catch (error) {
                                errorsEncountered++;
                                logger.error(`Error deleting message in #${channel.name} (${channelId}) in guild ${guild.name} (${guildId}):`, error.message);
                            }
                        }
                    }
                }


                let responseMessage = `Finished clearing recent messages.\n`;
                responseMessage += `**Tổng số kênh đã xử lý**: ${channelsProcessed}\n`;
                responseMessage += `**Số tin nhắn đã xóa**: ${deletedCount}\n`;
                responseMessage += `**Số lỗi gặp phải**: ${errorsEncountered}\n`;

                if (deletedCount > 0) {
                    const maxChannelsToList = 10;
                    if (processedChannels.length > maxChannelsToList) {
                        responseMessage += `\n**Kênh đã xóa tin nhắn (${maxChannelsToList} đầu tiên):**\n${processedChannels.slice(0, maxChannelsToList).join(', ')}...\n(và ${processedChannels.length - maxChannelsToList} kênh khác)`;
                    } else {
                        responseMessage += `\n**Kênh đã xóa tin nhắn:**\n${processedChannels.join(', ')}`;
                    }
                } else {
                    responseMessage += `\nKhông có tin nhắn nào được xóa.`;
                }

                await message.channel.send(responseMessage);
                logger.success('Clear all recent command completed.');

            } catch (error) {
                if (error.name === 'CollectionTimeoutError') {
                    await message.channel.send('Confirmation timed out. Command cancelled.').then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000)).catch(() => {});
                } else {
                    logger.error('Error during clearallrecent command:', error);
                    await message.channel.send(`An unexpected error occurred during clearallrecent: ${error.message}`).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000)).catch(() => {});
                }
            }
        }
        
    });
    logger.info('Clear command initialized');
};
