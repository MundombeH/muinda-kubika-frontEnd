<script setup lang="ts">
import { ErrorMessage, Field, Form } from "vee-validate";
import { useToast } from "vue-toastification";
import type { LoginPayload } from "~/types/platform";
import { toFriendlyApiErrorMessage } from "~/utils/api";

definePageMeta({
    layout: "auth",
    middleware: "guest",
});

const auth = useAuthStore();
const toast = useToast();

const schema = {
    identificador: (value: string) => {
        if (!value) return "Informe e-mail ou telefone.";
        return true;
    },
    password: (value: string) => {
        if (!value) return "Informe a palavra-passe.";
        return (
            value.length >= 6 ||
            "A palavra-passe precisa de pelo menos 6 caracteres."
        );
    },
};

const onSubmit = async (values: Record<string, string>) => {
    try {
        await auth.login(values as unknown as LoginPayload);
        await navigateTo("/dashboard");
    } catch (error) {
        toast.error(
            toFriendlyApiErrorMessage(
                error,
                "Não foi possível iniciar sessão.",
            ),
        );
    }
};
</script>

<template>
    <div
        class="card mx-auto max-w-xl p-8 text-slate-900 shadow-2xl shadow-slate-950/20"
    >
        <div class="mb-8">
            <p
                class="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600"
            >
                Entrar
            </p>
            <h1 class="mt-2 text-3xl font-black text-slate-950">
                Aceda ao painel da instituição
            </h1>
            <p class="mt-3 text-sm leading-6 text-slate-500">
                Faça login para gerir documentos, perfis e repositórios.
            </p>
        </div>

        <Form :validation-schema="schema" class="space-y-5" @submit="onSubmit">
            <div>
                <label class="label-base">E-mail ou telefone</label>
                <Field
                    name="identificador"
                    type="text"
                    class="input-base"
                    placeholder="nome@instituicao.ao ou 999999999"
                />
                <ErrorMessage
                    name="identificador"
                    class="mt-2 block text-sm text-rose-600"
                />
            </div>

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

            <button class="btn-primary w-full" type="submit">
                <Icon name="heroicons:lock-open" class="mr-2 h-5 w-5" />
                Entrar na plataforma
            </button>
        </Form>

        <p class="mt-8 text-center text-sm text-slate-500">
            Ainda não tem conta?
            <NuxtLink
                to="/cadastro"
                class="font-semibold text-indigo-600 hover:text-indigo-700"
                >Criar conta</NuxtLink
            >
        </p>
    </div>
</template>
