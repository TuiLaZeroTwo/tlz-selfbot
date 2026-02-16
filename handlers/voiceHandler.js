const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const logger = require('../utils/logger');
const monitor = require('../utils/monitor');

module.exports = (client, config) => {
  let connection = null;
  let isConnecting = false;
  let reconnectAttempts = 0;
  let rejoinInterval = null;
  const MAX_BACKOFF = 60000;
  const BASE_DELAY = 2000;
  const REJOIN_INTERVAL = 8 * 60 * 60 * 1000;

  const getBackoffDelay = () => {
    const delay = Math.min(BASE_DELAY * Math.pow(2, reconnectAttempts), MAX_BACKOFF);
    reconnectAttempts++;
    return delay;
  };

  const cleanup = () => {
    if (rejoinInterval) {
      clearInterval(rejoinInterval);
      rejoinInterval = null;
    }

    if (connection) {
      try {
        connection.removeAllListeners();
        connection.destroy();
      } catch (e) { }
      connection = null;
    }
  };

  const setupRejoinInterval = () => {
    if (rejoinInterval) {
      clearInterval(rejoinInterval);
    }

    rejoinInterval = setInterval(() => {
      logger.info('8-hour rejoin triggered');
      connect();
    }, REJOIN_INTERVAL);
  };

  const connect = async () => {
    if (isConnecting) {
      return;
    }

    isConnecting = true;

    try {
      const guild = client.guilds.cache.get(config.voice.guild_id || client.guilds.cache.first()?.id);
      if (!guild) {
        throw new Error('Guild not found');
      }

      const channel = guild.channels.cache.get(config.voice.channel_id);
      if (!channel || channel.type !== 'GUILD_VOICE') {
        throw new Error('Invalid voice channel');
      }

      cleanup();

      connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfDeaf: config.voice.self_deaf,
        selfMute: config.voice.self_mute
      });

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5000),
          ]);
        } catch {
          logger.warn('Disconnected from voice, reconnecting...');
          isConnecting = false;
          monitor.incrementVoiceReconnects();
          const delay = getBackoffDelay();
          setTimeout(connect, delay);
        }
      });

      connection.on(VoiceConnectionStatus.Destroyed, () => {
        logger.warn('Voice connection destroyed, reconnecting...');
        cleanup();
        isConnecting = false;
        setTimeout(connect, 5000);
      });

      connection.on(VoiceConnectionStatus.Ready, () => {
        reconnectAttempts = 0;
        setupRejoinInterval();
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 30000);
      logger.success(`Connected to voice channel: ${channel.name}`);
    } catch (error) {
      logger.error('Voice connection failed:', error.message);
      const delay = getBackoffDelay();
      setTimeout(connect, delay);
    } finally {
      isConnecting = false;
    }
  };

  client.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState.member.id !== client.user.id) return;

    const oldChannel = oldState.channelId;
    const newChannel = newState.channelId;

    if (oldChannel !== newChannel) {
      if (!newChannel) {
        logger.warn('Kicked/disconnected from voice, rejoining...');
        monitor.incrementVoiceReconnects();
        setTimeout(connect, 2000);
      } else if (newChannel !== config.voice.channel_id) {
        logger.warn('Moved to different channel, rejoining target channel...');
        setTimeout(connect, 2000);
      }
    }
  });

  client.on('ready', connect);
  client.on('destroy', cleanup);
};