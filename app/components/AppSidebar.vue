<script setup lang="ts">
const props = defineProps<{
    open?: boolean;
}>();

const emit = defineEmits<{
    (e: "close"): void;
}>();

const route = useRoute();
const auth = useAuthStore();
const { getNavigationForRole } = usePlatformMeta();

const items = computed(() => getNavigationForRole(auth.activeRole));

function closeSidebar() {
    emit("close");
}
</script>

<template>
    <aside
        class="fixed inset-y-0 left-0 z-30 hidden w-80 overflow-y-auto border-r border-slate-200 bg-slate-950 text-slate-100 lg:flex lg:flex-col"
    >
        <div class="border-b border-white/10 px-6 py-6">
            <AppLogo dark />
        </div>

        <div class="px-4 py-6">
            <p
                class="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
            >
                Navegação
            </p>
            <nav class="mt-3 space-y-1">
                <NuxtLink
                    v-for="item in items"
                    :key="item.to"
                    :to="item.to"
                    class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition"
                    :class="
                        route.path === item.to
                            ? 'bg-white text-slate-950 shadow-lg'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    "
                >
                    <Icon :name="item.icon" class="h-5 w-5" />
                    <span>{{ item.label }}</span>
                </NuxtLink>
            </nav>
        </div>
    </aside>

    <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
    >
        <div
            v-if="props.open"
            class="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[1px] lg:hidden"
            @click="closeSidebar"
        />
    </transition>

    <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="-translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-x-0"
        leave-to-class="-translate-x-full"
    >
        <aside
            v-if="props.open"
            class="fixed inset-y-0 left-0 z-50 w-80 border-r border-slate-200 bg-slate-950 text-slate-100 lg:hidden"
        >
            <div
                class="flex items-center justify-between border-b border-white/10 px-6 py-5"
            >
                <AppLogo dark />
                <button
                    type="button"
                    class="btn-ghost text-white"
                    @click="closeSidebar"
                >
                    <Icon name="heroicons:x-mark" class="h-5 w-5" />
                </button>
            </div>

            <div class="px-4 py-6">
                <p
                    class="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500"
                >
                    Navegação
                </p>
                <nav class="mt-3 space-y-1">
                    <NuxtLink
                        v-for="item in items"
                        :key="item.to"
                        :to="item.to"
                        class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition"
                        :class="
                            route.path === item.to
                                ? 'bg-white text-slate-950 shadow-lg'
                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        "
                        @click="closeSidebar"
                    >
                        <Icon :name="item.icon" class="h-5 w-5" />
                        <span>{{ item.label }}</span>
                    </NuxtLink>
                </nav>
            </div>
        </aside>
    </transition>
</template>
