const logger = require('../utils/logger');
const { spawn } = require('child_process');

module.exports = {
    init: () => {
        logger.info('owoHandler loaded');
        const child = spawn('node', ['owo/index.js', 'import', 'owoconfig.json'], {
            stdio: 'inherit',
            shell: true
        });
        child.on('exit', (code) => {
            logger.info(`owo subprocess exited with code ${code}`);
        });
        child.on('error', (err) => {
            logger.error('owo subprocess error:', err);
        });
    }
}