const { Client } = require('discord.js-selfbot-v13');
const config = require('./config');
//Handlers
const voiceHandler = require('./handlers/voiceHandler');
const autoReactHandler = require('./handlers/autoReactHandler');
//Commands
const hoststatusCommand = require('./commands/hoststatusCommand');
const clearCommand = require('./commands/clearCommand');
const qrCommand = require('./commands/qrCommand')
const reloadconfigCommand = require('./commands/reloadconfigCommand');
//Utilities
const logger = require('./utils/logger');
//Managers
const presenceManager = require('./managers/presenceManager'); 

const client = new Client({ checkUpdate: false });

//Handlers
if (config.voice.enabled) voiceHandler(client, config);
if (config.auto_react.enabled) autoReactHandler(client, config);
//Commands
if (config.qr.enabled) qrCommand(client, config);
if (config.reloadconfig.enabled) reloadconfigCommand(client, config);
if (config.hoststatus.enabled) hoststatusCommand(client, config);
if (config.clear.enabled) clearCommand(client, config);
//Utilities
//if (config.rpc.enabled) rpcUtil(client, config);
//Managers
presenceManager(client, config);

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