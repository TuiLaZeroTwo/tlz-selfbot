const { spawn } = require('child_process');
const logger = require('../utils/logger');
const config = require('../config');

const fs = require('fs');
const path = require('path');

function startWebsite({ port = config.website.port } = {}) {
  const webDir = path.resolve(__dirname, '../web');
  const nextDir = path.join(webDir, '.next');

  function runNextStart() {
    const nextProcess = spawn('npx', ['next', 'start', '-p', port], {
      cwd: webDir,
      stdio: 'inherit',
      shell: true,
    });

    nextProcess.on('spawn', () => {
        const weblink = `http://localhost:${port}`;
        logger.success(`Website started at ${weblink}`);
    });

    nextProcess.on('error', (err) => {
      logger.error('Failed to start website:', err);
    });

    return nextProcess;
  }

  if (!fs.existsSync(nextDir)) {
    logger.info('No production build found. Running next build...');
    const buildProcess = spawn('npx', ['next', 'build'], {
      cwd: webDir,
      stdio: 'inherit',
      shell: true,
    });
    buildProcess.on('close', (code) => {
      if (code === 0) {
        runNextStart();
      } else {
        logger.error('next build failed, cannot start website.');
      }
    });
    buildProcess.on('error', (err) => {
      logger.error('Failed to run next build:', err);
    });
    return buildProcess;
  } else {
    return runNextStart();
  }
}

module.exports = { startWebsite };
