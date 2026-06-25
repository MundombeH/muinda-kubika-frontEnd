<script setup lang="ts">
defineProps<{
  label: string
  value: string
  icon: string
  tone: string
}>()
</script>

<template>
  <div class="card p-5">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-sm text-slate-500">{{ label }}</p>
        <p class="mt-3 text-3xl font-bold text-slate-900">{{ value }}</p>
      </div>
      <div class="rounded-2xl p-3" :class="tone">
        <Icon :name="icon" class="h-6 w-6" />
      </div>
    </div>
  </div>
</template>
