import { spawn, type ChildProcess } from 'node:child_process';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

function localApiPlugin(): Plugin {
  let child: ChildProcess | undefined;

  return {
    name: 'local-api',
    apply: 'serve',
    configureServer() {
      if (child) {
        return;
      }

      child = spawn('npx', ['tsx', 'watch', 'server/index.ts'], {
        cwd: process.cwd(),
        stdio: 'inherit',
        shell: true,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
});
