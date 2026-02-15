const logger = require('../utils/logger');
const monitor = require('../utils/monitor');
const { fetchBankCodes } = require('../utils/configValidator');

const qrCache = new Map();
const QR_CACHE_TTL = 5 * 60 * 1000;
const rateLimitMap = new Map();
const RATE_LIMIT_DELAY = 5000;

function cleanCache() {
  const now = Date.now();
  for (const [key, data] of qrCache.entries()) {
    if (now - data.timestamp > QR_CACHE_TTL) {
      qrCache.delete(key);
    }
  }
}

setInterval(cleanCache, 60 * 1000);

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

        const lastUsed = rateLimitMap.get(message.author.id) || 0;
        const now = Date.now();
        if (now - lastUsed < RATE_LIMIT_DELAY) {
          const remaining = Math.ceil((RATE_LIMIT_DELAY - (now - lastUsed)) / 1000);
          return message.channel.send(`⏱️ Please wait ${remaining}s before generating another QR code.`);
        }

        const args = message.content.slice(prefix.length + command.length).trim().split(/ +/);
        const amount = parseFloat(args[0]);

        if (isNaN(amount) || amount <= 0) {
          return message.channel.send('❌ Amount must be a positive number.');
        }

        if (amount > 999999999) {
          return message.channel.send('❌ Amount too large (max: 999,999,999 VND).');
        }

        const qrInfo = config.qr;

        if (!qrInfo || !qrInfo.bankid || !qrInfo.addrinfo || !qrInfo.style || !qrInfo.accountname) {
          logger.error('Missing QR info in config.js');
          return message.channel.send('❌ QR configuration is incomplete.');
        }

        const validBankCodes = await fetchBankCodes();
        if (!validBankCodes.includes(qrInfo.bankid)) {
          logger.warn(`Invalid bank code: ${qrInfo.bankid}`);
          return message.channel.send('❌ Invalid bank code in configuration. Check https://api.vietqr.io/v2/banks');
        }

        if (!/^\d{6,20}$/.test(qrInfo.addrinfo)) {
          logger.warn(`Invalid account number format: ${qrInfo.addrinfo}`);
          return message.channel.send('❌ Invalid account number in configuration.');
        }

        const cacheKey = `${qrInfo.bankid}-${qrInfo.addrinfo}-${amount}`;
        const cached = qrCache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp < QR_CACHE_TTL)) {
          logger.debug('Using cached QR code');
          await message.channel.send({
            content: `💳 QR code cho ${amount.toLocaleString('vi-VN')} VND: (cached)`,
            files: [{
              attachment: cached.url,
              name: 'qr_code.png'
            }]
          });
          monitor.incrementQrGenerated();
          return;
        }

        const qrCodeUrl = `https://img.vietqr.io/image/${qrInfo.bankid}-${qrInfo.addrinfo}-${qrInfo.style}.png?amount=${amount}&accountName=${encodeURIComponent(qrInfo.accountname)}`;

        qrCache.set(cacheKey, {
          url: qrCodeUrl,
          timestamp: Date.now()
        });

        rateLimitMap.set(message.author.id, Date.now());

        await message.channel.send({
          content: `💳 QR code cho ${amount.toLocaleString('vi-VN')} VND:`,
          files: [{
            attachment: qrCodeUrl,
            name: 'qr_code.png'
          }]
        });

        monitor.incrementQrGenerated();
        logger.debug(`QR generated: ${amount} VND`);
      }
    } catch (error) {
      logger.error(`Error in QR command: ${error.message}`);
      monitor.incrementErrors();
      message.channel.send('❌ An error occurred while generating QR code.');
    }
  });

  logger.info('QR Command initialized with validation & rate limiting');
};
