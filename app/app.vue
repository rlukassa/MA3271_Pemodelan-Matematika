<script setup>
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap' }
  ]
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
html,
body,
#__nuxt {
  min-height: 100%;
}

body {
  background-color: #08110d;
  color: #e7efe9;
  background-image:
    radial-gradient(rgba(87, 148, 115, 0.2) 1px, transparent 1px),
    linear-gradient(to right, rgba(32, 56, 44, 0.45) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(32, 56, 44, 0.45) 1px, transparent 1px);
  background-size: 26px 26px, 88px 88px, 88px 88px;
}

::selection {
  background: #244433;
  color: #f3fff7;
}
</style>
