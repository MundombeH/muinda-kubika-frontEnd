<script setup lang="ts">
import { useToast } from "vue-toastification";
import type { UserRole } from "~/types/platform";

definePageMeta({ middleware: "auth" });

const auth = useAuthStore();
const inst = useInstitutionsStore();
const toast = useToast();
const { getRoleMeta } = usePlatformMeta();

const profileFields = computed(() => {
    const role = auth.activeRole as UserRole;
    const data = auth.profileData;
    switch (role) {
        case "ROLE_ESTUDANTE": {
            const e = data.estudante as Record<string, unknown> | undefined;
            if (!e) return null;
            const instituicao = e.instituicao as Record<string, unknown> | undefined;
            const bairro = e.bairro as Record<string, unknown> | undefined;
            return {
                title: "Dados do Estudante",
                rows: [
                    { label: "Curso", value: e.curso as string },
                    { label: "Ano", value: e.ano as number },
                    { label: "Identificação", value: e.identificacao as string },
                    { label: "Gênero", value: e.genero as string },
                    { label: "Instituição", value: instituicao?.descricao as string },
                    { label: "Bairro", value: bairro?.nome as string },
                ].filter((r) => r.value),
            };
        }
        case "ROLE_DOCENTE": {
            const d = data.docente as Record<string, unknown> | undefined;
            if (!d) return null;
            const bairro = d.bairro as Record<string, unknown> | undefined;
            const instituicoes = d.instituicoes as Record<string, unknown>[] | undefined;
            return {
                title: "Dados do Docente",
                rows: [
                    { label: "Identificação", value: d.identificacao as string },
                    { label: "Gênero", value: d.genero as string },
                    { label: "Bairro", value: bairro?.nome as string },
                    { label: "Instituições", value: instituicoes?.map((i) => i.descricao).join(", ") },
                ].filter((r) => r.value),
            };
        }
        case "ROLE_ADMIN_INSTITUICAO": {
            const a = data.adminInstituicao as Record<string, unknown> | undefined;
            if (!a) return null;
            const instituicoes = a.instituicoes as Record<string, unknown>[] | undefined;
            return {
                title: "Dados do Admin de Instituição",
                rows: [
                    { label: "Instituições", value: instituicoes?.map((i) => i.descricao).join(", ") },
                ].filter((r) => r.value),
            };
        }
        default:
            return null;
    }
});

async function handleSwitchRole(role: string) {
    try {
        await auth.switchRole(role as never);
    } catch (error) {
        toast.error("Não foi possível alterar o perfil ativo.");
    }
}
</script>

<template>
    <div class="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section class="card p-6">
            <div class="flex flex-col items-center gap-5 sm:flex-row">
                <div class="relative shrink-0">
                    <img
                        :src="auth.currentUser?.avatar"
                        :alt="auth.currentUser?.nome"
                        class="h-28 w-28 rounded-3xl border-4 border-white bg-slate-100 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-100"
                    />
                    <div
                        class="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-2 ring-white"
                    >
                        <Icon name="heroicons:camera" class="h-4 w-4 text-slate-400" />
                    </div>
                </div>
                <div class="text-center sm:text-left">
                    <h2 class="text-2xl font-bold text-slate-950">
                        {{ auth.currentUser?.nome }}
                    </h2>
                    <p class="text-sm text-slate-500">
                        {{ auth.currentUser?.email }}
                    </p>
                    <div
                        v-if="auth.activeRole"
                        class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
                    >
                        <Icon name="heroicons:user" class="h-3.5 w-3.5" />
                        {{ getRoleMeta(auth.activeRole).label }}
                    </div>
                </div>
            </div>

            <dl class="mt-8 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
                <div>
                    <dt class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <Icon name="heroicons:phone" class="h-3.5 w-3.5" />
                        Telefone
                    </dt>
                    <dd class="mt-1 text-sm font-medium text-slate-900">
                        {{ auth.currentUser?.numeroDeTelefone || "—" }}
                    </dd>
                </div>
                <div>
                    <dt class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <Icon name="heroicons:cake" class="h-3.5 w-3.5" />
                        Data de nascimento
                    </dt>
                    <dd class="mt-1 text-sm font-medium text-slate-900">
                        {{ auth.currentUser?.dataDeNascimento || "—" }}
                    </dd>
                </div>
            </dl>

            <dl v-if="profileFields" class="mt-6 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
                <template v-for="row in profileFields.rows" :key="row.label">
                    <div>
                        <dt class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            <Icon name="heroicons:identification" class="h-3.5 w-3.5" />
                            {{ row.label }}
                        </dt>
                        <dd class="mt-1 text-sm font-medium text-slate-900">
                            {{ row.value }}
                        </dd>
                    </div>
                </template>
            </dl>
        </section>

        <section class="card p-6">
            <div class="flex items-center justify-between gap-4">
                <div>
                    <p
                        class="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500"
                    >
                        Perfis
                    </p>
                    <h2 class="mt-2 text-2xl font-bold text-slate-950">
                        Perfis associados à conta
                    </h2>
                </div>
                <NuxtLink to="/perfis/solicitar" class="btn-secondary"
                    >Solicitar novo perfil</NuxtLink
                >
            </div>

            <div class="mt-6 grid gap-4 md:grid-cols-2">
                <div
                    v-for="profile in auth.availableProfiles"
                    :key="profile.role"
                    class="rounded-2xl border p-5 transition"
                    :class="
                        profile.role === auth.activeRole
                            ? 'border-indigo-200 bg-indigo-50/50 ring-1 ring-indigo-200'
                            : 'border-slate-200'
                    "
                >
                    <div class="flex items-center justify-between gap-3">
                        <div class="flex items-center gap-2">
                            <h3 class="text-lg font-semibold text-slate-900">
                                {{ profile.label }}
                            </h3>
                            <span
                                v-if="profile.role === auth.activeRole"
                                class="badge bg-indigo-100 text-indigo-700"
                            >
                                Ativo
                            </span>
                        </div>
                        <ProfileStatusBadge :status="profile.status" />
                    </div>
                    <p class="mt-3 text-sm leading-6 text-slate-500">
                        {{ profile.description }}
                    </p>

                    <div v-if="profile.institutionIds?.length" class="mt-4">
                        <p
                            class="text-xs font-semibold uppercase tracking-wide text-slate-400"
                        >
                            Instituições
                        </p>
                        <div class="mt-2 flex flex-wrap gap-2">
                            <span
                                v-for="institutionId in profile.institutionIds"
                                :key="institutionId"
                                class="badge bg-slate-100 text-slate-700"
                            >
                                {{ inst.getInstitutionName(institutionId) }}
                            </span>
                        </div>
                    </div>

                    <button
                        v-if="
                            profile.status === 'ACTIVE' &&
                            profile.role !== auth.activeRole
                        "
                        class="btn-primary mt-5 w-full"
                        @click="handleSwitchRole(profile.role)"
                    >
                        Ativar este perfil
                    </button>
                    <div
                        v-else-if="profile.role === auth.activeRole"
                        class="mt-5 w-full rounded-xl bg-slate-100 px-4 py-2.5 text-center text-sm font-medium text-slate-500"
                    >
                        Perfil atual
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>
