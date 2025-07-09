const { Client } = require('discord.js-selfbot-v13');
const config = require('./config');
const voiceHandler = require('./handlers/voiceHandler');
const qrCommand = require('./commands/qrCommand')
const autoReactHandler = require('./handlers/autoReactHandler');
const reloadconfigCommand = require('./commands/reloadconfigCommand')
const rpcUtil = require('./utils/rpcUtil');
const logger = require('./utils/logger');

const client = new Client({ checkUpdate: false });

if (config.voice.enabled) voiceHandler(client, config);
if (config.qr.enabled) qrCommand(client, config);
if (config.auto_react.enabled) autoReactHandler(client, config);
if (config.reloadconfig.enabled) reloadconfigCommand(client, config);
if (config.rpc.enabled) rpcUtil(client, config);

client.on('ready', () => {
  logger.success(`🟢 Logged as ${client.user.tag}`);
});

client.login(config.token).catch(err => {
  logger.error('Login failed:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  client.destroy();
  logger.info('Bot shutdown complete');
  process.exit();
});