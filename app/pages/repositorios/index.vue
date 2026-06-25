<script setup lang="ts">
import { ErrorMessage, Field, Form } from "vee-validate";
import { useToast } from "vue-toastification";

definePageMeta({ middleware: "auth" });

const auth = useAuthStore();
const docs = useDocumentsStore();
const reposStore = useRepositoriesStore();
const inst = useInstitutionsStore();
const toast = useToast();
const { getDocumentTypeLabel } = usePlatformMeta();

const repoDocuments = computed(() =>
    docs.myDocuments.filter((d) => d.type === "REPOSITORIO").map((d) => ({
        ...d,
        urlGithub: d.urlGithub || "",
        tecnologiasUsadas: d.tecnologiasUsadas || [],
    })),
);

const search = ref("");
const selectedStatus = ref("");
const selectedInstitution = ref("");
const selectedCategory = ref<string[]>([]);
const selectedTag = ref<string[]>([]);
const showOnlyMine = ref(true);

const availableCategories = computed(() => {
    const cats = new Set<string>();
    repoDocuments.value.forEach((d) => (d.categories ?? []).forEach((c) => cats.add(c)));
    return Array.from(cats).sort();
});

const availableTags = computed(() => {
    const tags = new Set<string>();
    repoDocuments.value.forEach((d) => (d.tags ?? []).forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
});

const filteredDocuments = computed(() =>
    repoDocuments.value.filter((document) => {
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

const availableDocuments = computed(() =>
    docs.myDocuments.filter(
        (d) =>
            d.type !== "REPOSITORIO" &&
            !d.urlGithub,
    ),
);

const schema = {
    documentId: (value: string) => Boolean(value) || "Selecione um documento.",
    urlGithub: (value: string) => {
        if (!value) return "Informe a URL do GitHub.";
        return (
            /^https:\/\/github\.com\/.+/i.test(value) ||
            "Informe uma URL válida do GitHub."
        );
    },
};

const onSubmit = async (values: Record<string, string | undefined>) => {
    try {
        await reposStore.createRepository({
            documentId: values.documentId ?? "",
            urlGithub: values.urlGithub ?? "",
            tecnologiasUsadas: (values.tecnologias ?? "")
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean),
        });
        await docs.loadDocuments();
        await navigateTo("/repositorios");
    } catch (error) {
        toast.error("Não foi possível associar o repositório.");
    }
};
</script>

<template>
    <div class="space-y-6">
        <div>
            <p class="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500">
                Código fonte
            </p>
            <h1 class="mt-2 text-3xl font-black text-slate-950">
                Repositórios
            </h1>
            <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                Documentos do tipo repositório com código fonte associado.
            </p>
        </div>

        <Form
            :validation-schema="schema"
            class="card grid gap-5 p-6 lg:grid-cols-[1fr_1fr_1.2fr_auto] lg:items-end"
            @submit="onSubmit"
        >
            <div>
                <label class="label-base">Documento</label>
                <Field as="select" name="documentId" class="input-base">
                    <option value="">Selecionar...</option>
                    <option
                        v-for="document in availableDocuments"
                        :key="document.id"
                        :value="document.id"
                    >
                        {{ document.title || document.id.slice(0, 8) + "..." }}
                    </option>
                </Field>
                <ErrorMessage
                    name="documentId"
                    class="mt-2 block text-sm text-rose-600"
                />
            </div>

            <div>
                <label class="label-base">URL GitHub</label>
                <Field
                    name="urlGithub"
                    class="input-base"
                    placeholder="https://github.com/organizacao/projecto"
                />
                <ErrorMessage
                    name="urlGithub"
                    class="mt-2 block text-sm text-rose-600"
                />
            </div>

            <div>
                <label class="label-base">Tecnologias</label>
                <Field
                    name="tecnologias"
                    class="input-base"
                    placeholder="Nuxt, Spring Boot"
                />
            </div>

            <button class="btn-primary h-[52px]" type="submit">Associar</button>
        </Form>

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

        <section class="grid gap-4 xl:grid-cols-2">
            <NuxtLink
                v-for="doc in filteredDocuments"
                :key="doc.id"
                :to="`/documentos/${doc.id}`"
                class="card p-6 transition hover:border-indigo-200 hover:shadow-md"
            >
                <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0">
                        <h2 class="text-lg font-bold text-slate-950 truncate">
                            {{ doc.title || "Sem título" }}
                        </h2>
                        <p class="mt-1 line-clamp-2 text-sm text-slate-500">
                            {{ doc.summary || "Nenhum resumo disponível." }}
                        </p>
                        <p class="mt-1 text-xs text-slate-400">
                            {{ inst.getInstitutionName(doc.institutionId) || "—" }}
                        </p>
                        <a
                            v-if="doc.urlGithub"
                            :href="doc.urlGithub"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="mt-3 inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                            @click.stop
                        >
                            <Icon name="heroicons:arrow-top-right-on-square" class="mr-2 h-4 w-4" />
                            {{ doc.urlGithub }}
                        </a>
                        <p v-else class="mt-2 text-xs text-slate-400">
                            Nenhuma URL GitHub associada.
                        </p>
                    </div>
                    <DocumentStatusBadge :status="doc.status" :userId="doc.userId" />
                </div>
                <div v-if="doc.tecnologiasUsadas?.length" class="mt-4 flex flex-wrap gap-2">
                    <span
                        v-for="tech in doc.tecnologiasUsadas"
                        :key="tech"
                        class="badge bg-emerald-50 text-emerald-700"
                    >
                        {{ tech }}
                    </span>
                </div>
            </NuxtLink>

            <p
                v-if="!filteredDocuments.length"
                class="card p-10 text-center text-sm text-slate-500 xl:col-span-2"
            >
                Nenhum repositório encontrado.
            </p>
        </section>
    </div>
</template>
