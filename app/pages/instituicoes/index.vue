<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const inst = useInstitutionsStore();
const search = ref("");
const { getInstitutionTypeLabel } = usePlatformMeta();

if (
    !["ROLE_ADMIN", "ROLE_ADMIN_INSTITUICAO"].includes(inst.institutions.length > 0 ? useAuthStore().activeRole ?? "" : "")
) {
    // role check done via middleware + path access rules
}

const institutions = computed(() =>
    inst.institutions.filter((institution) =>
        `${institution.name} ${institution.type} ${institution.location}`
            .toLowerCase()
            .includes(search.value.toLowerCase()),
    ),
);
</script>

<template>
    <div class="space-y-6">
        <div
            class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"
        >
            <div>
                <p
                    class="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500"
                >
                    Organização
                </p>
                <h1 class="mt-2 text-3xl font-black text-slate-950">
                    Instituições
                </h1>
                <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                    Lista de instituições registadas no sistema. Administração
                    disponível para perfis autorizados.
                </p>
            </div>
        </div>

        <section class="card p-5">
            <label class="label-base">Pesquisar instituição</label>
            <input
                v-model="search"
                class="input-base"
                placeholder="Nome, tipo ou localização"
            />
        </section>

        <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <article
                v-for="institution in institutions"
                :key="institution.id"
                class="card p-6"
            >
                <div class="flex items-start justify-between gap-3">
                    <div>
                        <h2 class="text-lg font-bold text-slate-950">
                            {{ institution.name }}
                        </h2>
                        <p class="mt-1 text-sm text-slate-500">
                            {{ getInstitutionTypeLabel(institution.type) }}
                        </p>
                        <p class="mt-3 text-sm text-slate-500">
                            {{ institution.location }}
                        </p>
                    </div>
                    <Icon
                        name="heroicons:building-office-2"
                        class="h-6 w-6 text-indigo-500"
                    />
                </div>
                <div
                    class="mt-6 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600"
                >
                    Administração disponível para perfis com permissão
                    institucional.
                </div>
            </article>

            <p
                v-if="!institutions.length"
                class="card p-10 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3"
            >
                Nenhuma instituição encontrada para a pesquisa atual.
            </p>
        </section>
    </div>
</template>
