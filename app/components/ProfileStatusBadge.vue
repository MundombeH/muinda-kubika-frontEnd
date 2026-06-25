<script setup lang="ts">
import type { ProfileStatus } from '~/types/platform'

const props = defineProps<{
  status: ProfileStatus
}>()

const { getProfileStatusMeta } = usePlatformMeta()
const meta = computed(() => getProfileStatusMeta(props.status))
</script>

<template>
  <span class="badge" :class="meta.classes">{{ meta.label }}</span>
</template>
