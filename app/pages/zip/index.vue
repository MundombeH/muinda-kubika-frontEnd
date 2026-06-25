<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const auth = useAuthStore();
const docs = useDocumentsStore();
const inst = useInstitutionsStore();
const { getDocumentTypeLabel } = usePlatformMeta();

const zipDocuments = computed(() =>
    docs.myDocuments.filter((d) => d.type === "ZIP"),
);

const search = ref("");
const selectedStatus = ref("");
const selectedInstitution = ref("");
const selectedCategory = ref<string[]>([]);
const selectedTag = ref<string[]>([]);
const showOnlyMine = ref(true);

const availableCategories = computed(() => {
    const cats = new Set<string>();
    zipDocuments.value.forEach((d) => (d.categories ?? []).forEach((c) => cats.add(c)));
    return Array.from(cats).sort();
});

const availableTags = computed(() => {
    const tags = new Set<string>();
    zipDocuments.value.forEach((d) => (d.tags ?? []).forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
});

const filteredDocuments = computed(() =>
    zipDocuments.value.filter((document) => {
        const matchesSearch =
            !search.value ||
            `${document.title} ${(document.authors ?? []).join(" ")} ${document.userName ?? ""} ${(document.categories ?? []).join(" ")} ${(document.tags ?? []).join(" ")}`
                .toLowerCase()
                .includes(search.value.toLowerCase());
        const matchesStatus =
            !selectedStatus.value || document.status === selectedStatus.value;
        const matchesInstitution =
            !selectedInstitution.value || document.institutionId === selectedInstitution.value;
        const matchesCategory =
            !selectedCategory.value.length ||
            (document.categories ?? []).some((c) => selectedCategory.value.includes(c));
        const matchesTag =
            !selectedTag.value.length ||
            (document.tags ?? []).some((t) => selectedTag.value.includes(t));
        const matchesOwner =
            !showOnlyMine.value ||
            document.userId === auth.currentUser?.id;
        return matchesSearch && matchesStatus && matchesInstitution && matchesCategory && matchesTag && matchesOwner;
    }),
);
</script>

<template>
    <div class="space-y-6">
        <div>
            <p class="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500">
                Conteúdo
            </p>
            <h1 class="mt-2 text-3xl font-black text-slate-950">
                ZIP
            </h1>
            <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                Documentos compactados em formato ZIP.
            </p>
        </div>

        <section class="card grid gap-4 p-5 md:grid-cols-4">
            <div>
                <label class="label-base">Pesquisar</label>
                <input
                    v-model="search"
                    class="input-base"
                    placeholder="Título, autor, instituição..."
                />
            </div>
            <div>
                <label class="label-base">Estado</label>
                <select v-model="selectedStatus" class="input-base">
                    <option value="">Todos</option>
                    <option value="DRAFT">Rascunho</option>
                    <option value="PENDENTE_REVISAO_ADMIN">Pendente revisão</option>
                    <option value="PUBLICADO">Publicado</option>
                    <option value="APROVADO">Aprovado</option>
                    <option value="REJEITADO">Rejeitado</option>
                </select>
            </div>
            <div>
                <SearchSelect
                    :model-value="selectedInstitution"
                    :options="inst.institutions.map(i => ({ value: i.id, label: i.name }))"
                    placeholder="Todas"
                    label="Instituição"
                    @update:model-value="(v: any) => selectedInstitution = v"
                />
            </div>
            <div>
                <SearchSelect
                    :model-value="selectedCategory"
                    :options="availableCategories.map(c => ({ value: c, label: c }))"
                    placeholder="Todas"
                    label="Categoria"
                    multiple
                    @update:model-value="(v: any) => selectedCategory = v"
                />
            </div>
            <div>
                <SearchSelect
                    :model-value="selectedTag"
                    :options="availableTags.map(t => ({ value: t, label: t }))"
                    placeholder="Todas"
                    label="Tag"
                    multiple
                    @update:model-value="(v: any) => selectedTag = v"
                />
            </div>
            <div class="flex items-end">
                <label class="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-600 cursor-pointer hover:border-indigo-200 w-full">
                    <input v-model="showOnlyMine" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    Os meus documentos
                </label>
            </div>
        </section>

        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <NuxtLink
                v-for="doc in filteredDocuments"
                :key="doc.id"
                :to="`/documentos/${doc.id}`"
                class="card cursor-pointer overflow-hidden transition hover:border-indigo-200 hover:shadow-md"
            >
                <div class="relative h-48 bg-gradient-to-br from-indigo-100 to-slate-200">
                    <img
                        v-if="doc.coverUrl"
                        :src="doc.coverUrl"
                        alt=""
                        class="h-full w-full object-cover"
                    />
                    <div
                        v-else
                        class="flex flex-col items-center justify-center gap-2"
                    >
                        <Icon name="heroicons:archive-box" class="h-12 w-12 text-slate-400" />
                        <span class="text-xs font-medium text-slate-500">
                            {{ getDocumentTypeLabel(doc.type) }}
                        </span>
                    </div>
                    <div class="absolute right-2 top-2">
                        <DocumentStatusBadge :status="doc.status" :userId="doc.userId" />
                    </div>
                </div>
                <div class="p-4">
                    <h3 class="line-clamp-2 text-sm font-bold text-slate-950 leading-snug min-h-[2.5rem]">
                        {{ doc.title || "Sem título" }}
                    </h3>
                    <p class="mt-1.5 text-xs text-slate-500">
                        {{ doc.authors.slice(0, 2).join(", ") }}
                        <template v-if="doc.authors.length > 2"> et al.</template>
                    </p>
                    <p class="mt-1 line-clamp-1 text-xs text-slate-400">
                        {{ inst.getInstitutionName(doc.institutionId) || "—" }}
                    </p>
                    <p class="mt-1.5 line-clamp-2 text-sm text-slate-500">
                        {{ doc.summary || "Nenhum resumo disponível." }}
                    </p>
                    <div v-if="doc.files?.length" class="mt-3 flex flex-wrap gap-1">
                        <span v-for="file in doc.files" :key="file.nome" class="text-xs text-slate-400">
                            {{ file.nome }}
                        </span>
                    </div>
                </div>
            </NuxtLink>

            <p
                v-if="!filteredDocuments.length"
                class="card p-10 text-center text-sm text-slate-500 xl:col-span-4"
            >
                Nenhum documento ZIP encontrado.
            </p>
        </section>
    </div>
</template>
