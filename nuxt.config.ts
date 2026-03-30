// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV === 'development' },
  modules: ['@nuxtjs/tailwindcss'],
  
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        // VERSI SIMPLE: Tanpa integrity check agar tidak terjadi mismatch
        { 
          rel: 'stylesheet', 
          href: 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css' 
        }
      ]
    }
  }
})