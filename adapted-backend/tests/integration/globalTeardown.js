// spawn(..., { shell: true }) on Windows wraps the command in cmd.exe -
// child.kill() only kills that shell, leaving the actual tsx/node process (and
// the port it's bound to) running orphaned. taskkill's /t kills the whole
// process tree.
const { execSync } = require('child_process');

module.exports = async () => {
  const child = global.__INTEGRATION_SERVER__;
  if (!child || child.killed || !child.pid) return;

  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${child.pid} /t /f`, { stdio: 'ignore' });
    } catch (error) {
      // Already gone - fine.
    }
  } else {
    child.kill();
  }
};
