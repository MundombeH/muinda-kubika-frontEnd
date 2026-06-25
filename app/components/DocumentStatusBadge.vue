<script setup lang="ts">
import type { DocumentStatus } from '~/types/platform'

const props = defineProps<{
  status: DocumentStatus
  userId?: string
}>()

const auth = useAuthStore()
const { getDocumentStatusMeta } = usePlatformMeta()

const meta = computed(() => {
  const base = getDocumentStatusMeta(props.status)
  if (
    props.status === "AGUARDANDO_CONFIRMACAO_USUARIO" &&
    props.userId &&
    auth.currentUser?.id !== props.userId
  ) {
    return { ...base, label: "Aguarda confirmação do utilizador" }
  }
  return base
})
</script>

<template>
  <span class="badge" :class="meta.classes">{{ meta.label }}</span>
</template>
