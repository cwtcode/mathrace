const { spawn } = require('child_process');
const path = require('path');

const backend = spawn('node', ['dist/index.js'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit'
});

const frontend = spawn('npx', ['vite', '--port', '3000'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit'
});

backend.on('exit', (code) => console.log('Backend exited with code', code));
frontend.on('exit', (code) => console.log('Frontend exited with code', code));
