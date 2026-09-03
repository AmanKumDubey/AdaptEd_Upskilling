import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // adapted-backend's CORS_ORIGIN/FRONTEND_URL (and better-auth's
    // trustedOrigins) are already configured for :3000 - matching that here
    // avoids a second config change on the backend. strictPort so a silent
    // fallback to another port doesn't quietly break CORS again.
    port: 3000,
    strictPort: true,
  },
})
