#!/usr/bin/env node

/**
 * Restart script for SpaceX Model server
 * Kills existing server process and restarts it on the same port
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVER_FILE = path.join(__dirname, '..', 'server.js');
const PID_FILE = path.join(__dirname, '..', 'server.pid');
const DEFAULT_PORT = 3333;

// Get port from environment or use default
const PORT = process.env.PORT || DEFAULT_PORT;

function killProcess(pid) {
  return new Promise((resolve) => {
    if (!pid) {
      resolve(false);
      return;
    }

    // Check if process exists
    exec(`ps -p ${pid}`, (error) => {
      if (error) {
        console.log(`Process ${pid} not found`);
        resolve(false);
        return;
      }

      console.log(`Killing process ${pid}...`);
      exec(`kill ${pid}`, (killError) => {
        if (killError) {
          console.error(`Error killing process ${pid}:`, killError.message);
          resolve(false);
        } else {
          console.log(`Successfully killed process ${pid}`);
          resolve(true);
        }
      });
    });
  });
}

function killProcessOnPort(port) {
  return new Promise((resolve) => {
    console.log(`Checking for processes on port ${port}...`);
    exec(`lsof -ti:${port}`, (error, stdout) => {
      if (error || !stdout.trim()) {
        console.log(`No process found on port ${port}`);
        resolve(false);
        return;
      }

      const pids = stdout.trim().split('\n').filter(Boolean);
      console.log(`Found ${pids.length} process(es) on port ${port}: ${pids.join(', ')}`);

      const killPromises = pids.map(pid => killProcess(pid));
      Promise.all(killPromises).then(() => {
        resolve(true);
      });
    });
  });
}

function readPidFile() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = fs.readFileSync(PID_FILE, 'utf8').trim();
      return pid ? parseInt(pid, 10) : null;
    }
  } catch (error) {
    console.error(`Error reading PID file: ${error.message}`);
  }
  return null;
}

function writePidFile(pid) {
  try {
    fs.writeFileSync(PID_FILE, pid.toString(), 'utf8');
    console.log(`Saved PID ${pid} to ${PID_FILE}`);
  } catch (error) {
    console.error(`Error writing PID file: ${error.message}`);
  }
}

function startServer() {
  console.log(`Starting server on port ${PORT}...`);
  console.log(`Server file: ${SERVER_FILE}`);

  const serverProcess = spawn('node', [SERVER_FILE], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, PORT }
  });

  writePidFile(serverProcess.pid);
  console.log(`Server started with PID ${serverProcess.pid}`);

  serverProcess.on('error', (error) => {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  });

  serverProcess.on('exit', (code) => {
    if (code !== null && code !== 0) {
      console.error(`Server exited with code ${code}`);
    }
  });

  // Handle script termination
  process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    serverProcess.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nShutting down server...');
    serverProcess.kill();
    process.exit(0);
  });
}

async function restart() {
  console.log('=== Restarting SpaceX Model Server ===\n');

  // Read PID from file
  const savedPid = readPidFile();
  if (savedPid) {
    await killProcess(savedPid);
  }

  // Also kill any process on the port (safety measure)
  await killProcessOnPort(PORT);

  // Wait a moment for processes to fully terminate
  console.log('\nWaiting for processes to terminate...');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Start the server
  console.log('\n--- Starting Server ---');
  startServer();
}

// Run the restart
restart().catch((error) => {
  console.error('Error during restart:', error);
  process.exit(1);
});









