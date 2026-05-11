module.exports = {
  apps: [
    {
      name: "denokbat-test",
      cwd: "/home/denokbat0/www/azkendantza",
      script: "node",
      args: "artifacts/api-server/dist/index.cjs",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PORT: 8080,
      },
      env_file: "scripts/dinahosting-test.env.local",
      out_file: "logs/pm2-out.log",
      error_file: "logs/pm2-error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
