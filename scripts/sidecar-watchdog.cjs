// Preloaded into the sidecar server (`node -r watchdog.cjs server.js`) by
// the desktop shell. The shell kills the sidecar on a normal quit, but a
// crash or SIGKILL of the shell would orphan it — so the sidecar also
// watches its parent and exits when the shell's PID disappears.
const shellPid = Number(process.env.CAREEROS_SHELL_PID || 0);
if (shellPid > 0) {
  setInterval(() => {
    try {
      process.kill(shellPid, 0); // signal 0 = existence check only
    } catch {
      process.exit(0);
    }
  }, 3000).unref();
}
