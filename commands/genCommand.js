const logger = require('.././utils/logger');
const axios = require('axios');
const config = require('../config');

// Helper for random chars
function randomchars(length) {
  let result = '';
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

// Mailgen logic
async function genMail() {
  try {
    const preDomain = await axios.get("https://api.mail.tm/domains");
    const domain = preDomain.data['hydra:member'][0].domain;
    const mail = `${config.mailprefix || 'tlz_'}${randomchars(4)}@${domain}`;
    const pass = randomchars(8);
    const postAccountsData = { address: mail, password: pass };
    await axios.post("https://api.mail.tm/accounts", postAccountsData);
    return `Mail.tm Account Generated:\nEmail: ${mail}\nPassword: ${pass}\nLogin: https://mail.tm`;
  } catch (err) {
    return `Mailgen error: ${err?.response?.data?.detail || err.message || err}`;
  }
}

// Bin generator logic
async function genBin(type) {
  // Use Math.random for simplicity
  function int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  let binNumber;
  if (type === 'amex') {
    binNumber = '37' + String(int(0, 9999)).padStart(4, '0');
  } else if (type === 'visa') {
    binNumber = '4' + String(int(0, 99999)).padStart(5, '0');
  } else if (type === 'mastercard') {
    binNumber = '5' + int(1, 5) + String(int(0, 999)).padStart(3, '0') + String(int(0, 99)).padStart(2, '0');
  } else if (type === 'dinersclub') {
    binNumber = pick(["300", "301", "302", "303", "304", "305", "36", "38"]) + String(int(0, 999)).padStart(3, '0') + String(int(0, 999)).padStart(3, '0');
  } else if (type === 'discover') {
    binNumber = pick(["6011", "65"]) + String(int(0, 9999)).padStart(4, '0') + String(int(0, 99)).padStart(2, '0');
  } else if (type === 'jcb') {
    binNumber = '35' + String(int(0, 9999)).padStart(4, '0') + String(int(0, 99)).padStart(2, '0');
  } else {
    return 'Invalid card type. Use visa, mastercard, amex, dinersclub, discover, or jcb.';
  }
  try {
    const response = await axios.get(`https://lookup.binlist.net/${binNumber}`);
    const data = response.data;
    return `BIN: ${binNumber}\nBrand: ${data.brand || '-'}\nCountry: ${data.country?.name || '-'}\nPrepaid: ${!data.prepaid ? 'No' : 'Yes'}\nBank: ${data.bank?.name || '-'}\nType: ${data.type || '-'}`;
  } catch (error) {
    return `BIN lookup error: ${error.message}`;
  }
}

module.exports = (client, config) => {
  logger.info('Gen command initialized');
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(config.prefix)) return;
    if (message.author.id !== config.ownerID) return;

    const args = message.content.trim().split(/\s+/);
    if (args[1] === 'mail') {
      const result = await genMail();
      message.reply(result);
    } else if (args[1] === 'bin') {
      const type = (args[2] || '').toLowerCase();
      if (!type) {
        message.reply('Usage: -gen bin <visa|mastercard|amex|dinersclub|discover|jcb>');
        return;
      }
      const result = await genBin(type);
      message.reply(result);
    } else {
      message.reply('Usage: -gen mail OR -gen bin <type>');
    }
  });
};