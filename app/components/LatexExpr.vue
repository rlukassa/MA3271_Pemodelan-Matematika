<script setup>
import { computed } from 'vue'
import katex from 'katex'

const props = defineProps({
  expr: { type: String, required: true },
  block: { type: Boolean, default: false }
})

const rendered = computed(() => {
  try {
    return katex.renderToString(props.expr, {
      displayMode: props.block,
      throwOnError: false,
      strict: 'ignore'
    })
  } catch {
    return props.expr
  }
})
</script>

<template>
  <component :is="block ? 'div' : 'span'" class="latex-host" v-html="rendered" />
</template>

<style scoped>
.latex-host :deep(.katex) {
  color: inherit;
}

.latex-host :deep(.katex-display) {
  margin: 0.35rem 0;
  overflow-x: auto;
  overflow-y: hidden;
}
</style>
