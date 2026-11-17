// PM2 process file for the Bayti API on the VPS.
// deploy.sh runs: pm2 startOrReload deploy/ecosystem.config.cjs --update-env
const path = require("path");

module.exports = {
  apps: [
    {
      name: "bayti-api",
      script: "app.js",
      // The API reads api/.env through dotenv, relative to this folder
      cwd: path.join(__dirname, "..", "api"),
      // One process: the login throttle and settings live in memory
      exec_mode: "fork",
      instances: 1,
      env: { NODE_ENV: "production" },
      max_memory_restart: "600M",
      time: true,
    },
  ],
};
