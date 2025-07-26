const { WebEmbed } = require('discord.js-selfbot-v13');
const logger = require('../utils/logger');

module.exports = (client, config) => {
  client.snipes = new Map();
  client.edits = new Map();

  logger.info('Snipe command initialized');

  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild || message.author.id !== config.ownerID) {
      //logger.debug(`Message ignored: bot=${message.author.bot}, guild=${!!message.guild}, author=${message.author.id}, owner=${config.ownerID}`);
      return;
    }

    if (message.content.startsWith(`${config.prefix}snipe`)) {
      try {
        const snipe = client.snipes.get(message.channel.id);
        if (!snipe) {
          const nomsg = new WebEmbed()
            .setDescription('No message to snipe in this channel!')
            .setColor('RED');
          return message.reply({ content: `[ERROR](${nomsg})` });
        }

        const embed = new WebEmbed()
          .setDescription(snipe.content || 'No message content available')
          .setAuthor({
            name: `Message from ${snipe.author.username}`,
            url: 'https://dsc.gg/tlz',
          })
          .setColor('BLUE');

        await message.reply({ content: `[Sniped GG](${embed})` });
      } catch (error) {
        logger.error('Error in snipe command:', error.message);
        const errorEmbed = new WebEmbed()
          .setDescription('An error occurred while trying to snipe the message.')
          .setColor('RED');
        await message.reply({ content: `[ERROR](${errorEmbed})` });
      }
    }
  });

  client.on('messageDelete', (message) => {
    if (message.partial || message.author.bot) return;

    if (!message.content && message.attachments.size > 0) {
      return;
    }

    client.snipes.set(message.channel.id, {
      content: message.content,
      author: message.author,
      createdAt: message.createdAt,
      attachments: message.attachments,
      reference: message.reference,
    });

    setTimeout(() => {
      if (client.snipes.get(message.channel.id)?.createdAt === message.createdAt) {
        client.snipes.delete(message.channel.id);
      }
    }, 300000);
  });

  client.on('messageUpdate', (oldmessage, newmessage) => {
    if (oldmessage.partial || oldmessage.author.bot || oldmessage.content === newmessage.content) return;

    client.edits.set(oldmessage.channel.id, {
      content: oldmessage.content,
      author: oldmessage.author,
      createdAt: oldmessage.createdAt,
      attachments: oldmessage.attachments,
      reference: oldmessage.reference,
    });
  });
};