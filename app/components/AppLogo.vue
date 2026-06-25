<script setup lang="ts">
defineProps<{
    dark?: boolean;
}>();
</script>

<template>
    <div class="flex items-center gap-3">
        <div
            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
        >
            <Icon name="heroicons:building-library" class="h-6 w-6" />
        </div>
        <div>
            <p
                class="text-sm font-semibold uppercase tracking-[0.2em]"
                :class="dark ? 'text-indigo-300' : 'text-indigo-600'"
            >
                Muinda Kubika
            </p>
            <p
                :class="dark ? 'text-slate-300' : 'text-slate-500'"
                class="text-sm"
            >
                Gestão de documentos e repositórios
            </p>
        </div>
    </div>
</template>
