<script setup lang="ts">
import { ErrorMessage, Field, Form } from "vee-validate";
import { useToast } from "vue-toastification";
import type { UserRole } from "~/types/platform";

definePageMeta({ middleware: "auth" });

const auth = useAuthStore();
const inst = useInstitutionsStore();
const approvalsStore = useApprovalsStore();
const { getRoleMeta } = usePlatformMeta();
const toast = useToast();

const roleOptions: {
    value: Exclude<UserRole, "ROLE_USUARIO">;
    label: string;
    description: string;
    icon: string;
}[] = [
    {
        value: "ROLE_ESTUDANTE",
        label: "Estudante",
        description: "Submeta trabalhos, ficheiros e repositórios académicos.",
        icon: "heroicons:academic-cap",
    },
    {
        value: "ROLE_DOCENTE",
        label: "Docente",
        description: "Partilhe materiais e publique conteúdo científico.",
        icon: "heroicons:presentation-chart-bar",
    },
    {
        value: "ROLE_ADMIN_INSTITUICAO",
        label: "Admin da instituição",
        description: "Gira perfis e conteúdo da sua instituição.",
        icon: "heroicons:building-office-2",
    },
    {
        value: "ROLE_ADMIN",
        label: "Admin global",
        description: "Gira utilizadores, instituições e aprovações globais.",
        icon: "heroicons:shield-check",
    },
];

const selectedRole = ref("");

const needsInstitution = computed(() =>
    ["ROLE_ESTUDANTE", "ROLE_DOCENTE", "ROLE_ADMIN_INSTITUICAO"].includes(selectedRole.value),
);
const isSingleInstitution = computed(() => selectedRole.value === "ROLE_ESTUDANTE");
const needsIdentificacao = computed(() =>
    ["ROLE_ESTUDANTE", "ROLE_DOCENTE"].includes(selectedRole.value),
);
const needsGenero = computed(() =>
    ["ROLE_ESTUDANTE", "ROLE_DOCENTE"].includes(selectedRole.value),
);
const needsCurso = computed(() => selectedRole.value === "ROLE_ESTUDANTE");
const needsAno = computed(() => selectedRole.value === "ROLE_ESTUDANTE");
const needsDepartamento = computed(() => selectedRole.value === "ROLE_DOCENTE");

const schema = {
    role: (value: string) => Boolean(value) || "Selecione o perfil pretendido.",
    instituicaoId: (_value: unknown, values: Record<string, unknown>) => {
        if (values.role === "ROLE_ESTUDANTE") {
            return Boolean(values.instituicaoId) || "Selecione a instituição.";
        }
        return true;
    },
    institutionIds: (_value: unknown, values: Record<string, unknown>) => {
        if (["ROLE_DOCENTE", "ROLE_ADMIN_INSTITUICAO"].includes(String(values.role))) {
            const ids = Array.isArray(values.institutionIds)
                ? values.institutionIds
                : values.institutionIds
                    ? [values.institutionIds]
                    : [];
            return ids.length > 0 || "Selecione pelo menos uma instituição.";
        }
        return true;
    },
    identificacao: (_value: unknown, values: Record<string, unknown>) => {
        if (values.role === "ROLE_DOCENTE") {
            return Boolean(values.identificacao) || "A identificação é obrigatória.";
        }
        return true;
    },
    genero: (_value: unknown, values: Record<string, unknown>) => {
        if (["ROLE_ESTUDANTE", "ROLE_DOCENTE"].includes(String(values.role))) {
            return (Boolean(values.genero) && values.genero !== "") || "Selecione o género.";
        }
        return true;
    },
    curso: (_value: unknown, values: Record<string, unknown>) => {
        if (values.role === "ROLE_ESTUDANTE") {
            return Boolean(values.curso) || "Indique o curso.";
        }
        return true;
    },
    ano: (_value: unknown, values: Record<string, unknown>) => {
        if (values.role === "ROLE_ESTUDANTE") {
            return (Boolean(values.ano) && Number(values.ano) > 0) || "Indique o ano académico.";
        }
        return true;
    },
};

function buildBody(values: Record<string, string | string[]>) {
    const role = values.role as Exclude<UserRole, "ROLE_USUARIO">;
    const institutionIds = Array.isArray(values.institutionIds)
        ? values.institutionIds
        : values.institutionIds
            ? [values.institutionIds]
            : [];

    if (role === "ROLE_ESTUDANTE") {
        return {
            role,
            institutionIds: values.instituicaoId ? [String(values.instituicaoId)] : [],
            metadata: {
                curso: String(values.curso ?? ""),
                ano: String(values.ano ?? ""),
                genero: String(values.genero ?? ""),
                identificacao: String(values.identificacao ?? ""),
                instituicaoId: String(values.instituicaoId ?? ""),
            },
        };
    }

    if (role === "ROLE_DOCENTE") {
        return {
            role,
            institutionIds,
            metadata: {
                identificacao: String(values.identificacao ?? ""),
                genero: String(values.genero ?? ""),
                departamento: String(values.departamento ?? ""),
                institutionIds,
            },
        };
    }

    if (role === "ROLE_ADMIN_INSTITUICAO") {
        return {
            role,
            institutionIds,
            metadata: { institutionIds },
        };
    }

    return { role, institutionIds: [], metadata: {} };
}

const onSubmit = async (values: Record<string, string | string[]>) => {
    try {
        const body = buildBody(values);
        await approvalsStore.requestProfile(body);

        await navigateTo("/perfil");
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        toast.error(message || "Não foi possível enviar a solicitação.");
    }
};
</script>

<template>
    <div class="mx-auto max-w-3xl space-y-8">
        <div>
            <p class="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-500">
                Solicitação
            </p>
            <h1 class="mt-2 text-3xl font-black text-slate-950">
                Solicitar novo perfil
            </h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Escolha o tipo de perfil que pretende e preencha os dados
                específicos. O pedido será registado como pendente para aprovação
                administrativa.
            </p>
        </div>

        <Form
            :validation-schema="schema"
            class="space-y-6"
            @submit="onSubmit"
        >
            <div class="card p-6">
                <h2 class="mb-4 text-lg font-bold text-slate-900">
                    Tipo de perfil
                </h2>
                <div class="grid gap-4 sm:grid-cols-2">
                    <label
                        v-for="item in roleOptions"
                        :key="item.value"
                        class="cursor-pointer rounded-xl border-2 p-4 transition-all duration-200"
                        :class="
                            selectedRole === item.value
                                ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                        "
                    >
                        <Field
                            type="radio"
                            name="role"
                            :value="item.value"
                            class="sr-only"
                            @change="selectedRole = item.value"
                        />
                        <div class="flex items-start gap-3">
                            <div
                                class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                                :class="
                                    selectedRole === item.value
                                        ? 'bg-indigo-100 text-indigo-700'
                                        : 'bg-slate-100 text-slate-500'
                                "
                            >
                                <Icon :name="item.icon" class="h-5 w-5" />
                            </div>
                            <div>
                                <p
                                    class="font-semibold"
                                    :class="
                                        selectedRole === item.value
                                            ? 'text-indigo-900'
                                            : 'text-slate-900'
                                    "
                                >
                                    {{ item.label }}
                                </p>
                                <p class="mt-0.5 text-xs leading-5 text-slate-500">
                                    {{ item.description }}
                                </p>
                            </div>
                        </div>
                    </label>
                </div>
                <ErrorMessage
                    name="role"
                    class="mt-3 block text-sm text-rose-600"
                />
            </div>

            <div v-if="needsInstitution" class="card p-6">
                <h2 class="mb-4 text-lg font-bold text-slate-900">
                    Vinculação institucional
                </h2>

                <div v-if="isSingleInstitution">
                    <label class="label-base">Instituição de ensino</label>
                    <Field as="select" name="instituicaoId" class="input-base">
                        <option value="">Selecionar...</option>
                        <option
                            v-for="institution in inst.institutions"
                            :key="institution.id"
                            :value="institution.id"
                        >
                            {{ institution.name }}
                        </option>
                    </Field>
                    <ErrorMessage
                        name="instituicaoId"
                        class="mt-2 block text-sm text-rose-600"
                    />
                </div>

                <div v-else>
                    <label class="label-base">Instituições associadas</label>
                    <Field
                        as="select"
                        name="institutionIds"
                        class="input-base min-h-36"
                        multiple
                    >
                        <option
                            v-for="institution in inst.institutions"
                            :key="institution.id"
                            :value="institution.id"
                        >
                            {{ institution.name }}
                        </option>
                    </Field>
                    <p class="mt-2 text-xs text-slate-500">
                        Use Ctrl/Cmd para selecionar mais de uma.
                    </p>
                    <ErrorMessage
                        name="institutionIds"
                        class="mt-2 block text-sm text-rose-600"
                    />
                </div>
            </div>

            <div
                v-if="needsIdentificacao || needsGenero"
                class="card p-6"
            >
                <h2 class="mb-4 text-lg font-bold text-slate-900">
                    Dados pessoais
                </h2>
                <div class="grid gap-5 md:grid-cols-2">
                    <div v-if="needsIdentificacao">
                        <label class="label-base">Identificação</label>
                        <Field
                            name="identificacao"
                            class="input-base"
                            placeholder="BI, matrícula ou código interno"
                        />
                        <ErrorMessage
                            name="identificacao"
                            class="mt-2 block text-sm text-rose-600"
                        />
                    </div>

                    <div v-if="needsGenero">
                        <label class="label-base">Género</label>
                        <Field as="select" name="genero" class="input-base">
                            <option value="">Selecionar...</option>
                            <option value="MASCULINO">Masculino</option>
                            <option value="FEMININO">Feminino</option>
                            <option value="NAO_BINARIO">Não binário</option>
                        </Field>
                        <ErrorMessage
                            name="genero"
                            class="mt-2 block text-sm text-rose-600"
                        />
                    </div>
                </div>
            </div>

            <div v-if="needsCurso || needsAno" class="card p-6">
                <h2 class="mb-4 text-lg font-bold text-slate-900">
                    Dados académicos
                </h2>
                <div class="grid gap-5 md:grid-cols-2">
                    <div v-if="needsCurso">
                        <label class="label-base">Curso</label>
                        <Field
                            name="curso"
                            class="input-base"
                            placeholder="Ex.: Engenharia Informática"
                        />
                        <ErrorMessage
                            name="curso"
                            class="mt-2 block text-sm text-rose-600"
                        />
                    </div>

                    <div v-if="needsAno">
                        <label class="label-base">Ano académico</label>
                        <Field
                            name="ano"
                            class="input-base"
                            placeholder="Ex.: 4"
                        />
                        <ErrorMessage
                            name="ano"
                            class="mt-2 block text-sm text-rose-600"
                        />
                    </div>
                </div>
            </div>

            <div v-if="needsDepartamento" class="card p-6">
                <h2 class="mb-4 text-lg font-bold text-slate-900">
                    Dados profissionais
                </h2>
                <div>
                    <label class="label-base">Departamento</label>
                    <Field
                        name="departamento"
                        class="input-base"
                        placeholder="Ex.: Departamento de Sistemas de Informação"
                    />
                </div>
            </div>

            <div class="flex justify-end gap-3">
                <NuxtLink to="/perfil" class="btn-secondary">Cancelar</NuxtLink>
                <button
                    class="btn-primary"
                    type="submit"
                    :disabled="!selectedRole"
                >
                    Enviar solicitação
                </button>
            </div>
        </Form>
    </div>
</template>
