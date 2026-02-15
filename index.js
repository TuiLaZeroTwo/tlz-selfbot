const { Client } = require('discord.js-selfbot-v13');
let config = require('./config');
const { validateConfig } = require('./utils/configValidator');
const monitor = require('./utils/monitor');
const configWatcher = require('./utils/configWatcher');
const voiceHandler = require('./handlers/voiceHandler');
const qrCommand = require('./commands/qrCommand');
const statsCommand = require('./commands/statsCommand');
const logger = require('./utils/logger');
const presenceManager = require('./managers/presenceManager');

logger.info('🔍 Validating configuration...');
const validation = validateConfig(config);

if (validation.errors.length > 0) {
  logger.error('❌ Configuration errors found:');
  validation.errors.forEach(err => logger.error(`  - ${err}`));
  logger.error('Please fix these errors in config.js and restart.');
  process.exit(1);
}

if (validation.warnings.length > 0) {
  logger.warn('⚠️  Configuration warnings:');
  validation.warnings.forEach(warn => logger.warn(`  - ${warn}`));
}

config = validation.config;
logger.success('✅ Configuration validated');

const client = new Client({ checkUpdate: false });

if (config.voice.enabled) voiceHandler(client, config);
if (config.qr.enabled) qrCommand(client, config);
statsCommand(client, config);
presenceManager(client, config);

client.on('ready', () => {
  logger.warn('This is a selfbot, use at your own risk!');
  logger.success(`🟢 Logged as ${client.user.tag}`);

  monitor.start();
  monitor.logMemory();

  configWatcher.init('./config.js', (newConfig) => {
    const revalidation = validateConfig(newConfig);

    if (revalidation.errors.length > 0) {
      logger.error('Config reload failed due to errors:');
      revalidation.errors.forEach(err => logger.error(`  - ${err}`));
      return;
    }

    if (revalidation.warnings.length > 0) {
      revalidation.warnings.forEach(warn => logger.warn(`  - ${warn}`));
    }

    config = revalidation.config;
    logger.info('Note: Some changes require restart to take effect (voice, QR, RPC app ID)');
  });

  logger.success('🚀 All systems operational');
});

let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`\n📊 Final stats before shutdown:`);
  monitor.logStats();
  monitor.logUptime();

  logger.info(`🛑 Received ${signal}, shutting down gracefully...`);

  try {
    configWatcher.stop();

    if (client.voice?.connections?.size > 0) {
      logger.info('Disconnecting from voice channels...');
      client.voice.connections.forEach(conn => {
        try {
          conn.destroy();
        } catch (e) { }
      });
    }

    logger.info('Closing Discord connection...');
    await client.destroy();

    logger.success('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error.message);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

client.login(config.token).catch(err => {
  logger.error('Login failed:', err);
  process.exit(1);
});