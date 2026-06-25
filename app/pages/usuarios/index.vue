<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const auth = useAuthStore();
const search = ref("");
const { getProfileStatusMeta } = usePlatformMeta();

if (auth.activeRole !== "ROLE_ADMIN") {
    await navigateTo("/dashboard");
}

const users = computed(() =>
    auth.accounts.filter((account) =>
        `${account.user.nome} ${account.user.email}`
            .toLowerCase()
            .includes(search.value.toLowerCase()),
    ),
);
</script>

<template>
    <div class="space-y-6">
        <div>
            <p
                class="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500"
            >
                Administração
            </p>
            <h1 class="mt-2 text-3xl font-black text-slate-950">
                Gestão de utilizadores
            </h1>
            <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                Visualize contas criadas, perfis associados e estados de
                aprovação.
            </p>
        </div>

        <section class="card p-5">
            <label class="label-base">Pesquisar utilizador</label>
            <input
                v-model="search"
                class="input-base"
                placeholder="Nome ou e-mail"
            />
        </section>

        <section class="grid gap-4">
            <article
                v-for="account in users"
                :key="account.user.id"
                class="card p-6"
            >
                <div
                    class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
                >
                    <div class="flex items-center gap-4">
                        <img
                            :src="account.user.avatar"
                            :alt="account.user.nome"
                            class="h-14 w-14 rounded-2xl border border-slate-200 bg-slate-100"
                        />
                        <div>
                            <h2 class="text-lg font-bold text-slate-950">
                                {{ account.user.nome }}
                            </h2>
                            <p class="text-sm text-slate-500">
                                {{ account.user.email }}
                            </p>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <span
                            v-for="profile in account.profiles"
                            :key="profile.role"
                            class="badge"
                            :class="getProfileStatusMeta(profile.status).classes"
                        >
                            {{ profile.label }} · {{ getProfileStatusMeta(profile.status).label }}
                        </span>
                    </div>
                </div>
                <div class="mt-4 text-sm text-slate-600">
                    <p>
                        <strong>Telefone:</strong>
                        {{ account.user.numeroDeTelefone }}
                    </p>
                    <p>
                        <strong>Data de nascimento:</strong>
                        {{ account.user.dataDeNascimento }}
                    </p>
                </div>
            </article>

            <p
                v-if="!users.length"
                class="card p-10 text-center text-sm text-slate-500"
            >
                Nenhum utilizador encontrado.
            </p>
        </section>
    </div>
</template>
