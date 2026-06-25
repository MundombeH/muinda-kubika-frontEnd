<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const auth = useAuthStore();
const docs = useDocumentsStore();
const { getDocumentTypeLabel } = usePlatformMeta();

const zipDocuments = computed(() =>
    docs.myDocuments.filter((d) => d.type === "ZIP"),
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

        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <NuxtLink
                v-for="doc in zipDocuments"
                :key="doc.id"
                :to="`/documentos/${doc.id}`"
                class="card cursor-pointer overflow-hidden transition hover:border-indigo-200 hover:shadow-md"
            >
                <div class="relative h-52 bg-gradient-to-br from-indigo-100 to-slate-200">
                    <img
                        v-if="doc.coverUrl"
                        :src="doc.coverUrl"
                        alt=""
                        class="h-full w-full object-cover"
                    />
                    <div
                        v-else
                        class="flex h-full items-center justify-center"
                    >
                        <Icon name="heroicons:archive-box" class="h-16 w-16 text-slate-400" />
                    </div>
                    <div
                        class="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-slate-700 shadow-sm"
                    >
                        {{ getDocumentTypeLabel(doc.type) }}
                    </div>
                </div>
                <div class="p-4">
                    <DocumentStatusBadge :status="doc.status" :userId="doc.userId" class="mb-2" />
                    <h3 class="truncate font-bold text-slate-900">
                        {{ doc.title || "Sem título" }}
                    </h3>
                    <p class="mt-1 line-clamp-2 text-sm text-slate-500">
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
                v-if="!zipDocuments.length"
                class="card p-10 text-center text-sm text-slate-500 xl:col-span-3"
            >
                Nenhum documento ZIP encontrado.
            </p>
        </section>
    </div>
</template>