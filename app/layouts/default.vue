<script setup lang="ts">
const sidebarOpen = ref(false);
const route = useRoute();

function openSidebar() {
    sidebarOpen.value = true;
}

function closeSidebar() {
    sidebarOpen.value = false;
}

watch(
    () => route.fullPath,
    () => {
        sidebarOpen.value = false;
    },
);
</script>

<template>
    <div class="page-shell flex min-h-screen">
        <AppSidebar :open="sidebarOpen" @close="closeSidebar" />

        <div class="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-80">
            <AppHeader @toggle-sidebar="openSidebar" />
            <main class="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <slot />
            </main>
        </div>
    </div>
</template>
