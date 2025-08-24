import { defineConfig } from 'vite';

export default defineConfig({
  // Ensure JSON files are treated as static assets
  assetsInclude: ['**/*.json'],
  
  // Copy additional static files to dist
  publicDir: 'public',
  
  build: {
    // Ensure assets are properly handled
    rollupOptions: {
      input: {
        main: './index.html'
      }
    },
    // Copy JSON config file to dist root
    copyPublicDir: true
  },
  
  // For development server
  server: {
    fs: {
      // Allow serving files from project root
      allow: ['..']
    }
  }
});
