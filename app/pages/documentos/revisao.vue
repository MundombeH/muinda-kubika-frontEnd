<script setup lang="ts">
import {
    Dialog,
    DialogPanel,
    DialogTitle,
    TransitionChild,
    TransitionRoot,
} from "@headlessui/vue";
import { useToast } from "vue-toastification";

definePageMeta({ middleware: "auth" });

const auth = useAuthStore();
const docs = useDocumentsStore();
const inst = useInstitutionsStore();
const toast = useToast();
const { getDocumentStatusMeta, getRoleMeta } = usePlatformMeta();
const pendingOnly = ref(true);
const selectedDocumentId = ref<string | null>(null);
const decisionReason = ref("");

if (
    !["ROLE_ADMIN", "ROLE_ADMIN_INSTITUICAO"].includes(auth.activeRole ?? "")
) {
    await navigateTo("/dashboard");
}

const documents = computed(() =>
    pendingOnly.value
        ? docs.documents.filter(
              (doc) => doc.status === "PENDENTE_REVISAO_ADMIN",
          )
        : docs.documents,
);

function openDecision(documentId: string) {
    selectedDocumentId.value = documentId;
}

function closeDecision() {
    selectedDocumentId.value = null;
    decisionReason.value = "";
}

function approve(documentId: string) {
    try {
        docs.approveDocument(
            documentId,
            decisionReason.value.trim() || undefined,
        );
        closeDecision();
    } catch (error) {
        toast.error("Não foi possível aprovar o documento.");
    }
}

function reject(documentId: string) {
    try {
        docs.rejectDocument(
            documentId,
            decisionReason.value.trim() || undefined,
        );
        closeDecision();
    } catch (error) {
        toast.error("Não foi possível rejeitar o documento.");
    }
}
</script>

<template>
    <div class="space-y-6">
        <div
            class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
            <div>
                <p
                    class="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500"
                >
                    Revisão
                </p>
                <h1 class="mt-2 text-3xl font-black text-slate-950">
                    Revisão administrativa
                </h1>
                <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                    Avalie documentos pendentes e registe as decisões com
                    histórico.
                </p>
            </div>
            <label
                class="inline-flex items-center gap-3 text-sm text-slate-600"
            >
                <input
                    v-model="pendingOnly"
                    type="checkbox"
                    class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Mostrar apenas pendentes
            </label>
        </div>

        <section class="grid gap-4">
            <article v-for="doc in documents" :key="doc.id" class="card p-6">
                <div
                    class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
                >
                    <div>
                        <div class="flex items-center gap-3">
                            <NuxtLink
                                :to="`/documentos/${doc.id}`"
                                class="text-lg font-bold text-slate-950 hover:text-indigo-600"
                            >
                                {{ doc.title }}
                            </NuxtLink>
                            <DocumentStatusBadge :status="doc.status" />
                        </div>
                        <p class="mt-2 text-sm text-slate-500">
                            {{ doc.summary }}
                        </p>
                        <p class="mt-3 text-sm text-slate-500">
                            <strong>Instituição:</strong>
                            {{ inst.getInstitutionName(doc.institutionId) }}
                        </p>
                    </div>
                    <button
                        v-if="doc.status === 'PENDENTE_REVISAO_ADMIN'"
                        class="btn-primary"
                        @click="openDecision(doc.id)"
                    >
                        Decidir
                    </button>
                </div>

                <div
                    v-if="doc.reviewHistory.length"
                    class="mt-4 rounded-2xl border border-slate-200 p-4"
                >
                    <p class="text-sm font-semibold text-slate-900">
                        Histórico de decisões
                    </p>
                    <ul class="mt-3 space-y-3 text-sm text-slate-600">
                        <li
                            v-for="entry in doc.reviewHistory"
                            :key="entry.id"
                            class="flex flex-col gap-1"
                        >
                            <span class="font-semibold text-slate-900">{{
                                getDocumentStatusMeta(entry.action).label
                            }}</span>
                            <span
                                >{{ entry.reviewerName }} ·
                                {{ getRoleMeta(entry.reviewerRole).label }} ·
                                {{
                                    new Date(entry.decidedAt).toLocaleString()
                                }}</span
                            >
                            <span v-if="entry.reason" class="text-slate-500"
                                >Motivo: {{ entry.reason }}</span
                            >
                        </li>
                    </ul>
                </div>
            </article>

            <p
                v-if="!documents.length"
                class="card p-10 text-center text-sm text-slate-500"
            >
                Nenhum documento encontrado.
            </p>
        </section>

        <TransitionRoot :show="Boolean(selectedDocumentId)" as="template">
            <Dialog as="div" class="relative z-50" @close="closeDecision">
                <TransitionChild
                    as="template"
                    enter="ease-out duration-200"
                    enter-from="opacity-0"
                    enter-to="opacity-100"
                    leave="ease-in duration-150"
                    leave-from="opacity-100"
                    leave-to="opacity-0"
                >
                    <div class="fixed inset-0 bg-slate-950/60" />
                </TransitionChild>

                <div class="fixed inset-0 overflow-y-auto p-4">
                    <div class="flex min-h-full items-center justify-center">
                        <TransitionChild
                            as="template"
                            enter="ease-out duration-200"
                            enter-from="opacity-0 translate-y-4"
                            enter-to="opacity-100 translate-y-0"
                            leave="ease-in duration-150"
                            leave-from="opacity-100 translate-y-0"
                            leave-to="opacity-0 translate-y-4"
                        >
                            <DialogPanel
                                class="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
                            >
                                <DialogTitle
                                    class="text-xl font-bold text-slate-950"
                                    >Decisão administrativa</DialogTitle
                                >
                                <p class="mt-2 text-sm text-slate-500">
                                    Registe o motivo da decisão (opcional).
                                </p>
                                <textarea
                                    v-model="decisionReason"
                                    class="input-base mt-4 min-h-28"
                                    placeholder="Motivo"
                                />
                                <div class="mt-6 flex justify-end gap-3">
                                    <button
                                        class="btn-secondary"
                                        @click="closeDecision"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        class="btn-secondary"
                                        @click="reject(selectedDocumentId!)"
                                    >
                                        Rejeitar
                                    </button>
                                    <button
                                        class="btn-primary"
                                        @click="approve(selectedDocumentId!)"
                                    >
                                        Aprovar
                                    </button>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </TransitionRoot>
    </div>
</template>
