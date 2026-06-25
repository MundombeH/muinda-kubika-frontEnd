<script setup lang="ts">
import { ErrorMessage, Field, Form } from "vee-validate";
import { useToast } from "vue-toastification";

definePageMeta({ middleware: "auth" });

const auth = useAuthStore();
const docs = useDocumentsStore();
const reposStore = useRepositoriesStore();
const toast = useToast();
const { getDocumentTypeLabel } = usePlatformMeta();

const repoDocuments = computed(() =>
    docs.myDocuments.filter((d) => d.type === "REPOSITORIO").map((d) => ({
        ...d,
        urlGithub: d.urlGithub || "",
        tecnologiasUsadas: d.tecnologiasUsadas || [],
    })),
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

        <section class="grid gap-4 xl:grid-cols-2">
            <NuxtLink
                v-for="doc in repoDocuments"
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
                        <a
                            v-if="doc.urlGithub"
                            :href="doc.urlGithub"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="mt-3 inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-700"
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
                v-if="!repoDocuments.length"
                class="card p-10 text-center text-sm text-slate-500 xl:col-span-2"
            >
                Nenhum repositório encontrado.
            </p>
        </section>
    </div>
</template>