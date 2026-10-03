// PM2 process for the Next.js app. cwd goes through the `current` symlink, so
// a reload after deploy.sh flips the link starts the new release.
module.exports = {
  apps: [
    {
      name: "nxtsft-web",
      cwd: "/var/www/nxtsft/current/apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      env: { NODE_ENV: "production" },
      max_memory_restart: "1500M",
      kill_timeout: 10000,
    },
  ],
};
