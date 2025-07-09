const logger = require('../utils/logger'); // Assuming this path is correct

module.exports = (client, config) => {
  client.on('messageCreate', async message => {
    try {
      if (message.author.bot) return;

      const command = 'qr';
      const prefix = config.prefix;
      
      if (message.content.startsWith(prefix + command)) { 
        if (message.author.id !== config.ownerID) {
          return;
        }

        const args = message.content.slice(prefix.length + command.length).trim().split(/ +/);
        const amount = parseFloat(args[0]); 

        if (isNaN(amount) || amount <= 0) {
          return message.channel.send('Number can\'t be word or lower than 0 ');
        }

        const qrInfo = config.qr;

        if (!qrInfo || !qrInfo.bankid || !qrInfo.addrinfo || !qrInfo.style || !qrInfo.accountname) {
          logger.error('Missing info in config.json');
          return message.channel.send('Not working');
        }

 
        const qrCodeUrl = `https://img.vietqr.io/image/${qrInfo.bankid}-${qrInfo.addrinfo}-${qrInfo.style}.png?amount=${amount}&accountName=${encodeURIComponent(qrInfo.accountname)}`;

        await message.channel.send({
          content: `Đây là mã QR của bạn cho ${amount.toLocaleString('vi-VN')} VND:`,
          files: [{
            attachment: qrCodeUrl,
            name: 'qr_code.png'
          }]
        });
      } 
    } catch (error) {
      logger.error(`Error messageCreate: ${error.message}`);
      message.channel.send('Error');
    }
  });

  logger.info('QR Command initialized');
};
