const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');
const logger = require('../utils/logger');
const monitor = require('../utils/monitor');

module.exports = (client, config) => {
  let connection = null;
  let isConnecting = false;
  let reconnectAttempts = 0;
  const MAX_BACKOFF = 60000;
  const BASE_DELAY = 2000;

  const getBackoffDelay = () => {
    const delay = Math.min(BASE_DELAY * Math.pow(2, reconnectAttempts), MAX_BACKOFF);
    reconnectAttempts++;
    return delay;
  };

  const cleanup = () => {
    if (connection) {
      try {
        connection.removeAllListeners();
        connection.destroy();
      } catch (e) {
      }
      connection = null;
    }
  };

  const connect = async () => {
    if (isConnecting) {
      logger.debug('Connection attempt already in progress, skipping...');
      return;
    }

    isConnecting = true;

    try {
      const channel = client.channels.cache.get(config.voice.channel_id);
      if (!channel || channel.type !== 'GUILD_VOICE') {
        throw new Error('Invalid voice channel');
      }

      cleanup();

      connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: config.voice.self_deaf,
        selfMute: config.voice.self_mute
      });

      connection.on(VoiceConnectionStatus.Disconnected, () => {
        logger.warn('Disconnected from voice, reconnecting...');
        isConnecting = false;
        monitor.incrementVoiceReconnects();
        const delay = getBackoffDelay();
        logger.debug(`Reconnect attempt ${reconnectAttempts}, waiting ${delay}ms`);
        setTimeout(connect, delay);
      });

      connection.on(VoiceConnectionStatus.Ready, () => {
        reconnectAttempts = 0;
      });

      logger.success(`Connected to voice channel: ${channel.name}`);
    } catch (error) {
      logger.error('Voice connection failed:', error.message);
      const delay = getBackoffDelay();
      logger.debug(`Retry in ${delay}ms (attempt ${reconnectAttempts})`);
      setTimeout(connect, delay);
    } finally {
      isConnecting = false;
    }
  };

  client.on('ready', connect);

  client.on('destroy', cleanup);
};