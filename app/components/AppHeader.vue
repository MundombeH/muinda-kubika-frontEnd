<script setup lang="ts">
const emit = defineEmits<{
    (e: "toggle-sidebar"): void;
}>();

const auth = useAuthStore();
const route = useRoute();

const pageTitle = computed(() => {
    const map: Record<string, string> = {
        "/dashboard": "Dashboard",
        "/documentos": "Documentos",
        "/documentos/revisao": "Revisão documentos",
        "/repositorios": "Repositórios",
        "/zip": "ZIP",
        "/perfil": "Meu perfil",
        "/perfis/solicitar": "Solicitar perfil",
        "/aprovacoes": "Aprovações",
        "/instituicoes": "Instituições",
        "/usuarios": "Utilizadores",
    };

    return map[route.path] ?? "Muinda Kubika";
});

async function logout() {
    await auth.logout();
    await navigateTo("/login");
}
</script>

<template>
    <header
        class="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur"
    >
        <div
            class="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"
        >
            <div class="flex items-start gap-3">
                <button
                    type="button"
                    class="btn-ghost mt-1 lg:hidden"
                    aria-label="Abrir menu"
                    @click="emit('toggle-sidebar')"
                >
                    <Icon name="heroicons:bars-3" class="h-5 w-5" />
                </button>

                <div>
                    <p
                        class="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-600"
                    >
                        Plataforma institucional
                    </p>
                    <h1 class="mt-1 text-2xl font-bold text-slate-900">
                        {{ pageTitle }}
                    </h1>
                </div>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                <ProfileSwitcher />

                <div
                    class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                >
                    <img
                        v-if="auth.currentUser?.avatar"
                        :src="auth.currentUser.avatar"
                        :alt="auth.currentUser.nome"
                        class="h-11 w-11 rounded-2xl border border-slate-200 bg-slate-100"
                    />
                    <div class="min-w-0">
                        <p
                            class="truncate text-sm font-semibold text-slate-900"
                        >
                            {{ auth.currentUser?.nome }}
                        </p>
                        <p class="truncate text-xs text-slate-500">
                            {{ auth.currentUser?.email }}
                        </p>
                    </div>
                </div>

                <button class="btn-secondary" @click="logout">
                    <Icon
                        name="heroicons:arrow-right-on-rectangle"
                        class="mr-2 h-5 w-5"
                    />
                    Sair
                </button>
            </div>
        </div>
    </header>
</template>
