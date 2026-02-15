const logger = require('./logger');
const axios = require('axios');

let cachedBankCodes = null;
let lastFetch = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000;

const FALLBACK_BANK_CODES = [
    'ICB', 'VCB', 'BIDV', 'VBA', 'OCB', 'TCB', 'MB', 'VIB', 'SHB', 'EIB',
    'MSB', 'CAKE', 'Ubank', 'TIMO', 'VTB', 'TPB', 'STB', 'HDB', 'VCCB',
    'SCB', 'VPB', 'ABB', 'VAB', 'NAB', 'PGB', 'VIET', 'BVB', 'SeABank',
    'COOPBANK', 'LPB', 'KLB', 'KBank', 'UOB', 'SCVN', 'PBVN', 'Shinhan',
    'ABBANK', 'VBSP', 'NASB', 'WOO', 'VRB', 'PVCOM'
];

async function fetchBankCodes() {
    const now = Date.now();

    if (cachedBankCodes && (now - lastFetch) < CACHE_TTL) {
        return cachedBankCodes;
    }

    try {
        const response = await axios.get('https://api.vietqr.io/v2/banks', {
            timeout: 5000
        });

        if (response.data && response.data.data) {
            cachedBankCodes = response.data.data.map(bank => bank.code);
            lastFetch = now;
            logger.debug(`Fetched ${cachedBankCodes.length} bank codes from VietQR API`);
            return cachedBankCodes;
        }
    } catch (error) {
        logger.warn('Could not fetch bank codes from API, using fallback list');
    }

    cachedBankCodes = FALLBACK_BANK_CODES;
    return cachedBankCodes;
}

async function validateConfig(config) {
    const errors = [];
    const warnings = [];

    const validBankCodes = await fetchBankCodes();

    if (!config.token || config.token === 'YOUR_DISCORD_TOKEN_HERE') {
        errors.push('Discord token is missing or using default value');
    }

    if (!config.ownerID || config.ownerID === 'YOUR_USER_ID_HERE') {
        errors.push('Owner ID is missing or using default value');
    }

    if (!config.prefix || config.prefix.length === 0) {
        warnings.push('Command prefix is empty, using default "."');
        config.prefix = '.';
    }

    if (config.qr?.enabled) {
        if (!config.qr.bankid || !validBankCodes.includes(config.qr.bankid)) {
            warnings.push(`Invalid bank code: ${config.qr.bankid}. Check https://api.vietqr.io/v2/banks for valid codes`);
        }

        if (!config.qr.addrinfo || config.qr.addrinfo === '0123456789') {
            warnings.push('QR account number is using default/example value');
        }

        if (!config.qr.accountname || config.qr.accountname === 'NGUYEN VAN A') {
            warnings.push('QR account name is using default/example value');
        }

        const validStyles = ['compact', 'compact2', 'print', 'qr_only'];
        if (!validStyles.includes(config.qr.style)) {
            warnings.push(`Invalid QR style: ${config.qr.style}. Valid: ${validStyles.join(', ')}`);
        }
    }

    if (config.voice?.enabled) {
        if (!config.voice.channel_id || config.voice.channel_id === 'YOUR_VOICE_CHANNEL_ID') {
            errors.push('Voice channel ID is missing or using default value');
        }

        if (typeof config.voice.self_mute !== 'boolean') {
            warnings.push('voice.self_mute should be boolean, auto-correcting to true');
            config.voice.self_mute = true;
        }

        if (typeof config.voice.self_deaf !== 'boolean') {
            warnings.push('voice.self_deaf should be boolean, auto-correcting to true');
            config.voice.self_deaf = true;
        }
    }

    if (config.rpc?.enabled) {
        const validModes = ['rpc', 'weather', 'none'];
        if (!validModes.includes(config.rpc.mode)) {
            warnings.push(`Invalid RPC mode: ${config.rpc.mode}. Valid: ${validModes.join(', ')}`);
        }

        if (config.rpc.mode === 'rpc') {
            if (!config.rpc.application_id || config.rpc.application_id === 'YOUR_APPLICATION_ID') {
                warnings.push('RPC application ID is using default value');
            }

            const validTypes = [0, 1, 2, 3];
            if (!validTypes.includes(config.rpc.type)) {
                warnings.push(`Invalid RPC type: ${config.rpc.type}. Valid: 0=Playing, 1=Streaming, 2=Listening, 3=Watching`);
            }
        }
    }

    if (config.rotatestatus?.enabled) {
        if (!config.rotatestatus.interval || config.rotatestatus.interval < 1000) {
            warnings.push('Rotate status interval too low (< 1s), auto-correcting to 10s');
            config.rotatestatus.interval = 10000;
        }

        const messageCount = Object.keys(config.rotatestatus.message || {}).length;
        const emojiCount = Object.keys(config.rotatestatus.emoji || {}).length;

        if (messageCount === 0 && emojiCount === 0) {
            warnings.push('Rotate status enabled but no messages or emojis configured');
        }
    }

    return { errors, warnings, config };
}

module.exports = { validateConfig, fetchBankCodes };
