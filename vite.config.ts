import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import net from 'net'

function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    server.listen(port, '0.0.0.0')
  })
}

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const is3000Available = await checkPortAvailable(3000)
  const port = is3000Available ? 3000 : 3200
  if (!is3000Available) {
    console.warn('\n⚠️ [Vite] 端口 3000 当前被 Windows NAT/Hyper-V 保留占用 (EACCES)。已智能切换至备用端口 ' + port + '！\n若需恢复 3000 端口，请以管理员身份执行: net stop winnat && net start winnat\n')
  }

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      port,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true
        }
      }
    }
  }
})

