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
const inst = useInstitutionsStore();
const approvalsStore = useApprovalsStore();
const toast = useToast();
const canManage = computed(() =>
    ["ROLE_ADMIN", "ROLE_ADMIN_INSTITUICAO"].includes(auth.activeRole ?? ""),
);
const pendingOnly = ref(true);
const rejectReason = ref("");
const selectedApprovalId = ref<string | null>(null);

const approvals = computed(() => {
    const base = approvalsStore.visibleApprovals;
    return pendingOnly.value
        ? base.filter((item) => item.status === "PENDING")
        : base;
});

function openRejectModal(approvalId: string) {
    selectedApprovalId.value = approvalId;
}

function closeModal() {
    selectedApprovalId.value = null;
    rejectReason.value = "";
}

function approve(approvalId: string) {
    try {
        approvalsStore.approveProfile(approvalId);
    } catch (error) {
        toast.error("Não foi possível aprovar a solicitação.");
    }
}

function reject() {
    if (!selectedApprovalId.value || !rejectReason.value.trim()) {
        return;
    }

    try {
        approvalsStore.rejectProfile(
            selectedApprovalId.value,
            rejectReason.value.trim(),
        );
        closeModal();
    } catch (error) {
        toast.error("Não foi possível rejeitar a solicitação.");
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
                    Backoffice
                </p>
                <h1 class="mt-2 text-3xl font-black text-slate-950">
                    Aprovações de perfis
                </h1>
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

        <div
            v-if="!canManage"
            class="card p-10 text-center text-sm text-slate-500"
        >
            O perfil ativo não possui permissão para aprovar ou rejeitar
            solicitações.
        </div>

        <div v-else class="grid gap-4">
            <article
                v-for="approval in approvals"
                :key="approval.id"
                class="card p-6"
            >
                <div
                    class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
                >
                    <div>
                        <div class="flex flex-wrap items-center gap-3">
                            <h2 class="text-lg font-bold text-slate-950">
                                {{ approval.userName }}
                            </h2>
                            <ProfileStatusBadge :status="approval.status" />
                        </div>
                        <p class="mt-2 text-sm text-slate-500">
                            {{ approval.userEmail }} ·
                            {{ approval.profileLabel }}
                        </p>
                        <div
                            v-if="approval.institutionIds?.length"
                            class="mt-4 flex flex-wrap gap-2"
                        >
                            <span
                                v-for="institutionId in approval.institutionIds"
                                :key="institutionId"
                                class="badge bg-slate-100 text-slate-700"
                            >
                                {{ inst.getInstitutionName(institutionId) }}
                            </span>
                        </div>
                        <p
                            v-if="approval.rejectionReason"
                            class="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
                        >
                            <strong>Motivo da rejeição:</strong>
                            {{ approval.rejectionReason }}
                        </p>
                    </div>

                    <div
                        v-if="approval.status === 'PENDING'"
                        class="flex flex-wrap gap-3"
                    >
                        <button
                            class="btn-primary"
                            @click="approve(approval.id)"
                        >
                            Aprovar
                        </button>
                        <button
                            class="btn-secondary"
                            @click="openRejectModal(approval.id)"
                        >
                            Rejeitar
                        </button>
                    </div>
                </div>
            </article>

            <p
                v-if="!approvals.length"
                class="card p-10 text-center text-sm text-slate-500"
            >
                Não existem solicitações para o filtro atual.
            </p>
        </div>

        <TransitionRoot :show="Boolean(selectedApprovalId)" as="template">
            <Dialog as="div" class="relative z-50" @close="closeModal">
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
                                    >Rejeitar solicitação</DialogTitle
                                >
                                <p class="mt-2 text-sm text-slate-500">
                                    Indique um motivo para a rejeição do perfil.
                                </p>
                                <textarea
                                    v-model="rejectReason"
                                    class="input-base mt-5 min-h-32"
                                    placeholder="Motivo da rejeição"
                                />
                                <div class="mt-6 flex justify-end gap-3">
                                    <button
                                        class="btn-secondary"
                                        @click="closeModal"
                                    >
                                        Cancelar
                                    </button>
                                    <button class="btn-primary" @click="reject">
                                        Confirmar rejeição
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
