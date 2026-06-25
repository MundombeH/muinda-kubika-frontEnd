<script setup lang="ts">
import { ErrorMessage, Field, Form } from "vee-validate";
import { useToast } from "vue-toastification";
import { toFriendlyApiErrorMessage } from "~/utils/api";

definePageMeta({
    layout: "auth",
    middleware: "guest",
});

const auth = useAuthStore();
const toast = useToast();

const schema = {
    nome: (value: string) => Boolean(value) || "Informe o nome completo.",
    email: (value: string) => {
        if (!value) return "Informe o e-mail.";
        return /.+@.+\..+/.test(value) || "Formato de e-mail inválido.";
    },
    numeroDeTelefone: (value: string) =>
        Boolean(value) || "Informe o número de telefone.",
    dataDeNascimento: (value: string) =>
        Boolean(value) || "Informe a data de nascimento.",
    password: (value: string) => {
        if (!value) return "Informe a palavra-passe.";
        return (
            value.length >= 6 ||
            "A palavra-passe precisa de pelo menos 6 caracteres."
        );
    },
    confirmarPassword: (
        value: string,
        ctx: { form?: Record<string, string> },
    ) => {
        if (!value) return "Confirme a palavra-passe.";
        return (
            value === ctx.form?.password || "As palavras-passe não coincidem."
        );
    },
};

const onSubmit = async (values: Record<string, string>) => {
    try {
        await auth.register({
            nome: values.nome,
            email: values.email,
            numeroDeTelefone: values.numeroDeTelefone,
            dataDeNascimento: values.dataDeNascimento,
            password: values.password,
        });
        await navigateTo("/dashboard");
    } catch (error) {
        toast.error(
            toFriendlyApiErrorMessage(
                error,
                "Não foi possível criar a conta.",
            ),
        );
    }
};
</script>

<template>
    <div
        class="card mx-auto max-w-2xl p-8 text-slate-900 shadow-2xl shadow-slate-950/20"
    >
        <div class="mb-8">
            <p
                class="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600"
            >
                Cadastro
            </p>
            <h1 class="mt-2 text-3xl font-black text-slate-950">
                Criar utilizador base
            </h1>
            <p class="mt-3 text-sm leading-6 text-slate-500">
                Depois de criar a conta, poderá solicitar perfis como estudante,
                docente ou administrador institucional.
            </p>
        </div>

        <Form
            :validation-schema="schema"
            class="grid gap-5 md:grid-cols-2"
            @submit="onSubmit"
        >
            <div class="md:col-span-2">
                <label class="label-base">Nome completo</label>
                <Field
                    name="nome"
                    class="input-base"
                    placeholder="Nome e apelido"
                />
                <ErrorMessage
                    name="nome"
                    class="mt-2 block text-sm text-rose-600"
                />
            </div>

            <div>
                <label class="label-base">E-mail</label>
                <Field
                    name="email"
                    type="email"
                    class="input-base"
                    placeholder="nome@instituicao.ao"
                />
                <ErrorMessage
                    name="email"
                    class="mt-2 block text-sm text-rose-600"
                />
            </div>

            <div>
                <label class="label-base">Número de telefone</label>
                <Field
                    name="numeroDeTelefone"
                    class="input-base"
                    placeholder="+244 900 000 000"
                />
                <ErrorMessage
                    name="numeroDeTelefone"
                    class="mt-2 block text-sm text-rose-600"
                />
            </div>

            <div>
                <label class="label-base">Data de nascimento</label>
                <Field name="dataDeNascimento" type="date" class="input-base" />
                <ErrorMessage
                    name="dataDeNascimento"
                    class="mt-2 block text-sm text-rose-600"
                />
            </div>

            <div />

            <div>
                <label class="label-base">Palavra-passe</label>
                <Field
                    name="password"
                    type="password"
                    class="input-base"
                    placeholder="••••••••"
                />
                <ErrorMessage
                    name="password"
                    class="mt-2 block text-sm text-rose-600"
                />
            </div>

            <div>
                <label class="label-base">Confirmar palavra-passe</label>
                <Field
                    name="confirmarPassword"
                    type="password"
                    class="input-base"
                    placeholder="••••••••"
                />
                <ErrorMessage
                    name="confirmarPassword"
                    class="mt-2 block text-sm text-rose-600"
                />
            </div>

            <div class="md:col-span-2">
                <button class="btn-primary w-full" type="submit">
                    <Icon name="heroicons:user-plus" class="mr-2 h-5 w-5" />
                    Criar conta
                </button>
            </div>
        </Form>

        <p class="mt-8 text-center text-sm text-slate-500">
            Já tem conta?
            <NuxtLink
                to="/login"
                class="font-semibold text-indigo-600 hover:text-indigo-700"
                >Entrar</NuxtLink
            >
        </p>
    </div>
</template>
