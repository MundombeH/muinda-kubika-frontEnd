<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const auth = useAuthStore();
const docs = useDocumentsStore();
const approvals = useApprovalsStore();
const { getRoleMeta } = usePlatformMeta();

const greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
});

const today = new Date().toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
});

const canViewApprovals = computed(() =>
    ["ROLE_ADMIN", "ROLE_ADMIN_INSTITUICAO"].includes(auth.activeRole ?? ""),
);

const publishedDocs = computed(() =>
    docs.myDocuments.filter((d) => d.status === "PUBLICADO"),
);
const activeDocs = computed(() => docs.myDocuments.slice(0, 5));
const pendingApprovals = computed(() =>
    approvals.visibleApprovals
        .filter((item) => item.status === "PENDING")
        .slice(0, 5),
);

const ownPendingRequests = computed(() =>
    approvals.approvals.filter(
        (item) => item.userId === auth.currentUser?.id && item.status === "PENDING",
    ),
);

const dashboardStats = computed(() => [
    {
        label: "Documentos",
        value: `${docs.myDocuments.length}`,
        icon: "heroicons:document-text",
        tone: "bg-indigo-50 text-indigo-700",
    },
    {
        label: "Publicados",
        value: `${publishedDocs.value.length}`,
        icon: "heroicons:check-circle",
        tone: "bg-emerald-50 text-emerald-700",
    },
    {
        label: "Repositórios",
        value: `${docs.myDocuments.filter((d) => d.type === "REPOSITORIO").length}`,
        icon: "heroicons:code-bracket-square",
        tone: "bg-amber-50 text-amber-700",
    },
    {
        label: "Perfis ativos",
        value: `${auth.availableProfiles.filter((p) => p.status === "ACTIVE").length}`,
        icon: "heroicons:users",
        tone: "bg-sky-50 text-sky-700",
    },
    ...(canViewApprovals.value
        ? [
              {
                  label: "Aprovações pendentes",
                  value: `${pendingApprovals.value.length}`,
                  icon: "heroicons:shield-check",
                  tone: "bg-rose-50 text-rose-700",
              },
          ]
        : []),
]);

const roleIcons: Record<string, string> = {
    ROLE_ESTUDANTE: "heroicons:book-open",
    ROLE_DOCENTE: "heroicons:users",
    ROLE_ADMIN_INSTITUICAO: "heroicons:building-library",
    ROLE_ADMIN: "heroicons:shield-check",
};
</script>

<template>
    <div class="space-y-8">
        <div>
            <h1 class="text-3xl font-black text-slate-950">
                {{ greeting }}, {{ auth.currentUser?.nome?.split(" ")[0] ?? "utilizador" }}
            </h1>
            <p class="mt-1 text-sm text-slate-500">{{ today }}</p>
        </div>

        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
                v-for="item in dashboardStats"
                :key="item.label"
                :label="item.label"
                :value="item.value"
                :icon="item.icon"
                :tone="item.tone"
            />
        </section>

        <section class="card p-6">
            <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div class="flex items-start gap-4">
                    <div
                        class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md"
                    >
                        <Icon
                            :name="roleIcons[auth.activeRole ?? ''] ?? 'heroicons:user'"
                            class="h-8 w-8"
                        />
                    </div>
                    <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Perfil ativo
                        </p>
                        <h2 class="text-2xl font-bold text-slate-950">
                            {{
                                auth.activeRole
                                    ? getRoleMeta(auth.activeRole).label
                                    : "Sem perfil"
                            }}
                        </h2>
                        <p class="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                            {{
                                auth.activeRole
                                    ? getRoleMeta(auth.activeRole).description
                                    : "Selecione um perfil para começar."
                            }}
                        </p>
                        <div class="mt-4 flex items-center gap-3">
                            <NuxtLink
                                to="/perfil"
                                class="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                            >
                                <Icon name="heroicons:user-circle" class="h-4 w-4" />
                                Ver perfil completo
                            </NuxtLink>
                            <span class="text-slate-300">|</span>
                            <NuxtLink
                                v-if="auth.activeRole === 'ROLE_USUARIO'"
                                to="/perfis/solicitar"
                                class="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                            >
                                <Icon name="heroicons:user-plus" class="h-4 w-4" />
                                Solicitar perfil
                            </NuxtLink>
                        </div>
                    </div>
                </div>

                <div class="flex shrink-0 items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                    <img
                        :src="auth.currentUser?.avatar"
                        :alt="auth.currentUser?.nome"
                        class="h-12 w-12 rounded-2xl border border-slate-200 bg-white"
                    />
                    <div class="min-w-0">
                        <p class="truncate text-sm font-semibold text-slate-900">
                            {{ auth.currentUser?.nome }}
                        </p>
                        <p class="truncate text-xs text-slate-500">
                            {{ auth.currentUser?.email }}
                        </p>
                        <p class="mt-0.5 text-xs text-slate-400">
                            {{ auth.currentUser?.numeroDeTelefone || "—" }}
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <section class="grid gap-6 xl:grid-cols-2">
            <div class="card p-6">
                <div class="flex items-center justify-between gap-4">
                    <h2 class="text-lg font-bold text-slate-950">
                        Documentos recentes
                    </h2>
                    <NuxtLink
                        to="/documentos"
                        class="text-sm font-semibold text-indigo-600"
                    >
                        Ver todos
                    </NuxtLink>
                </div>

                <div class="mt-5 space-y-3">
                    <NuxtLink
                        v-for="document in activeDocs"
                        :key="document.id"
                        :to="`/documentos/${document.id}`"
                        class="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:shadow-sm"
                    >
                        <div class="min-w-0">
                            <p class="truncate font-semibold text-slate-900">
                                {{ document.title }}
                            </p>
                            <p class="mt-1 line-clamp-1 text-sm text-slate-500">
                                {{ document.summary }}
                            </p>
                            <p class="mt-1 text-xs text-slate-400">
                                {{ new Date(document.updatedAt).toLocaleDateString("pt-PT") }}
                            </p>
                        </div>
                        <DocumentStatusBadge :status="document.status" :userId="document.userId" />
                    </NuxtLink>
                    <p v-if="!activeDocs.length" class="py-4 text-center text-sm text-slate-500">
                        Ainda não existem documentos associados a este perfil.
                    </p>
                </div>
            </div>

            <div v-if="canViewApprovals" class="card p-6">
                <div class="flex items-center justify-between gap-4">
                    <h2 class="text-lg font-bold text-slate-950">
                        Aprovações pendentes
                    </h2>
                    <NuxtLink
                        to="/aprovacoes"
                        class="text-sm font-semibold text-indigo-600"
                    >
                        Gerir aprovações
                    </NuxtLink>
                </div>

                <div class="mt-5 space-y-3">
                    <div
                        v-for="approval in pendingApprovals"
                        :key="approval.id"
                        class="rounded-2xl border border-slate-200 p-4"
                    >
                        <div class="flex items-center justify-between gap-4">
                            <div>
                                <p class="font-semibold text-slate-900">
                                    {{ approval.userName }}
                                </p>
                                <p class="mt-1 text-sm text-slate-500">
                                    {{ approval.profileLabel }} ·
                                    {{ approval.userEmail }}
                                </p>
                                <p class="mt-1 text-xs text-slate-400">
                                    {{ new Date(approval.requestedAt).toLocaleDateString("pt-PT") }}
                                </p>
                            </div>
                            <ProfileStatusBadge :status="approval.status" />
                        </div>
                    </div>
                    <p
                        v-if="!pendingApprovals.length"
                        class="py-4 text-center text-sm text-slate-500"
                    >
                        Sem aprovações pendentes para o perfil ativo.
                    </p>
                </div>
            </div>

            <div v-else-if="ownPendingRequests.length" class="card p-6">
                <div class="flex items-center justify-between gap-4">
                    <h2 class="text-lg font-bold text-slate-950">
                        As minhas solicitações
                    </h2>
                    <NuxtLink
                        to="/perfil"
                        class="text-sm font-semibold text-indigo-600"
                    >
                        Ver tudo
                    </NuxtLink>
                </div>

                <div class="mt-5 space-y-3">
                    <div
                        v-for="request in ownPendingRequests"
                        :key="request.id"
                        class="rounded-2xl border border-slate-200 p-4"
                    >
                        <div class="flex items-center justify-between gap-4">
                            <div>
                                <p class="font-semibold text-slate-900">
                                    {{ request.profileLabel }}
                                </p>
                                <p class="mt-1 text-sm text-slate-500">
                                    Solicitação enviada a
                                    {{ new Date(request.requestedAt).toLocaleDateString("pt-PT") }}
                                </p>
                            </div>
                            <ProfileStatusBadge :status="request.status" />
                        </div>
                    </div>
                </div>
            </div>

            <div v-else class="card p-6">
                <h2 class="text-lg font-bold text-slate-950">
                    {{ auth.activeRole === "ROLE_USUARIO" ? "Solicitar perfil" : "Próximos passos" }}
                </h2>
                <div class="mt-5 space-y-4">
                    <div
                        class="rounded-2xl border border-dashed border-slate-300 p-5 text-center"
                    >
                        <Icon
                            :name="auth.activeRole === 'ROLE_USUARIO' ? 'heroicons:user-plus' : 'heroicons:sparkles'"
                            class="mx-auto h-10 w-10 text-slate-400"
                        />
                        <p class="mt-3 text-sm text-slate-500">
                            <template v-if="auth.activeRole === 'ROLE_USUARIO'">
                                Solicite um perfil (estudante, docente ou admin) para
                                começar a submeter conteúdos na plataforma.
                            </template>
                            <template v-else>
                                Publique documentos, associe repositórios e
                                contribua para a produção académica da sua instituição.
                            </template>
                        </p>
                        <NuxtLink
                            v-if="auth.activeRole === 'ROLE_USUARIO'"
                            to="/perfis/solicitar"
                            class="btn-primary mt-4 inline-flex"
                        >
                            Solicitar perfil
                        </NuxtLink>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>
