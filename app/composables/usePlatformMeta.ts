import type {
  DocumentStatus,
  DocumentType,
  NavItem,
  ProfileStatus,
  UserRole,
} from "~/types/platform";

const roleMeta = {
  ROLE_USUARIO: {
    label: "Utilizador base",
    description: "Acede à plataforma, acompanha perfis e gere a conta base.",
    permissions: [],
  },
  ROLE_ESTUDANTE: {
    label: "Estudante",
    description: "Submete trabalhos, ficheiros e repositórios académicos.",
    permissions: ["DOCUMENTO_CRIAR", "DOCUMENTO_EDITAR"],
  },
  ROLE_DOCENTE: {
    label: "Docente",
    description:
      "Partilha materiais, acompanha produção científica e publica conteúdo.",
    permissions: ["DOCUMENTO_CRIAR", "DOCUMENTO_EDITAR", "DOCUMENTO_PUBLICAR"],
  },
  ROLE_ADMIN_INSTITUICAO: {
    label: "Admin da instituição",
    description: "Gere perfis da instituição e acompanha conteúdo pendente.",
    permissions: ["INSTITUICAO_GERIR", "PERFIL_APROVAR", "PERFIL_REJEITAR"],
  },
  ROLE_ADMIN: {
    label: "Admin global",
    description: "Gere utilizadores, instituições e aprovações globais.",
    permissions: [
      "USUARIO_GERIR",
      "INSTITUICAO_GERIR",
      "PERFIL_APROVAR",
      "PERFIL_REJEITAR",
    ],
  },
} satisfies Record<
  UserRole,
  { label: string; description: string; permissions: string[] }
>;

const navigation: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: "heroicons:squares-2x2" },
  { label: "Documentos", to: "/documentos", icon: "heroicons:document-text" },

  {
    label: "Repositórios",
    to: "/repositorios",
    icon: "heroicons:code-bracket-square",
  },
  { label: "ZIP", to: "/zip", icon: "heroicons:archive-box" },
  {
    label: "Revisão documentos",
    to: "/documentos/revisao",
    icon: "heroicons:clipboard-document-check",
    roles: ["ROLE_ADMIN", "ROLE_ADMIN_INSTITUICAO"],
  },
  {
    label: "Instituições",
    to: "/instituicoes",
    icon: "heroicons:building-library",
    roles: ["ROLE_ADMIN", "ROLE_ADMIN_INSTITUICAO"],
  },
  {
    label: "Utilizadores",
    to: "/usuarios",
    icon: "heroicons:users",
    roles: ["ROLE_ADMIN"],
  },
  { label: "Meu perfil", to: "/perfil", icon: "heroicons:user-circle" },
  {
    label: "Solicitar perfil",
    to: "/perfis/solicitar",
    icon: "heroicons:user-plus",
  },
  {
    label: "Aprovações",
    to: "/aprovacoes",
    icon: "heroicons:shield-check",
    roles: ["ROLE_ADMIN", "ROLE_ADMIN_INSTITUICAO"],
  },
];

const documentStatusMeta: Record<
  DocumentStatus,
  { label: string; classes: string }
> = {
  DRAFT: { label: "Rascunho", classes: "bg-slate-100 text-slate-700" },
  PROCESSANDO_IA: {
    label: "Em processamento",
    classes: "bg-blue-100 text-blue-700",
  },
  AGUARDANDO_CONFIRMACAO_USUARIO: {
    label: "Aguarda a sua confirmação",
    classes: "bg-amber-100 text-amber-700",
  },
  PENDENTE_REVISAO_ADMIN: {
    label: "Aguardando revisão",
    classes: "bg-violet-100 text-violet-700",
  },
  APROVADO: { label: "Aprovado", classes: "bg-emerald-100 text-emerald-700" },
  REJEITADO: { label: "Rejeitado", classes: "bg-rose-100 text-rose-700" },
  PUBLICADO: { label: "Publicado", classes: "bg-indigo-100 text-indigo-700" },
};

const profileStatusMeta: Record<
  ProfileStatus,
  { label: string; classes: string }
> = {
  ACTIVE: { label: "Ativo", classes: "bg-emerald-100 text-emerald-700" },
  PENDING: { label: "Pendente", classes: "bg-amber-100 text-amber-700" },
  REJECTED: { label: "Rejeitado", classes: "bg-rose-100 text-rose-700" },
};

export const documentTypeOptions: { value: DocumentType; label: string }[] = [
  { value: "MONOGRAFIA", label: "Monografia" },
  { value: "RELATORIO", label: "Relatório" },
  { value: "ARTIGO", label: "Artigo" },
  { value: "REPOSITORIO", label: "Repositório" },
  { value: "ZIP", label: "ZIP" },
  { value: "LIVRO", label: "Livro" },
  { value: "SEMINARIO", label: "Seminário" },
];

const documentTypeLabels: Record<DocumentType, string> = {
  MONOGRAFIA: "Monografia",
  RELATORIO: "Relatório",
  ARTIGO: "Artigo",
  REPOSITORIO: "Repositório",
  ZIP: "ZIP",
  LIVRO: "Livro",
  SEMINARIO: "Seminário",
  INDEFINIDO: "Indefinido",
};

const institutionTypeLabels: Record<string, string> = {
  SUPERIOR: "Superior",
  ICICLO: "I ciclo",
  IICICLO: "II ciclo",
  MEDIO: "Médio",
};

export function usePlatformMeta() {
  const getRoleMeta = (role: UserRole) => roleMeta[role];

  const getProfileStatusMeta = (status: ProfileStatus) =>
    profileStatusMeta[status];

  const getDocumentStatusMeta = (status: DocumentStatus) =>
    documentStatusMeta[status];

  const getNavigationForRole = (role: UserRole | null) => {
    if (!role) {
      return [];
    }

    return navigation.filter(
      (item) => !item.roles || item.roles.includes(role),
    );
  };

  const getDocumentTypeLabel = (type: DocumentType) =>
    documentTypeLabels[type] ?? type;

  const getInstitutionTypeLabel = (type: string) =>
    institutionTypeLabels[type] ?? type;

  return {
    roleMeta,
    navigation,
    getRoleMeta,
    getProfileStatusMeta,
    getDocumentStatusMeta,
    getNavigationForRole,
    documentTypeOptions,
    getDocumentTypeLabel,
    getInstitutionTypeLabel,
  };
}
