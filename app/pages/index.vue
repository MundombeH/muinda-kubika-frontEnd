<script setup lang="ts">
const auth = useAuthStore()
await navigateTo(auth.isAuthenticated ? '/dashboard' : '/login')
</script>

<template>
  <div />
</template>
