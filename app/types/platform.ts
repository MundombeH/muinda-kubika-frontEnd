export type UserRole =
  | "ROLE_USUARIO"
  | "ROLE_ESTUDANTE"
  | "ROLE_DOCENTE"
  | "ROLE_ADMIN_INSTITUICAO"
  | "ROLE_ADMIN";

export type ProfileStatus = "ACTIVE" | "PENDING" | "REJECTED";

export type DocumentStatus =
  | "DRAFT"
  | "PROCESSANDO_IA"
  | "AGUARDANDO_CONFIRMACAO_USUARIO"
  | "PENDENTE_REVISAO_ADMIN"
  | "APROVADO"
  | "REJEITADO"
  | "PUBLICADO";

export type DocumentType =
  | "MONOGRAFIA"
  | "RELATORIO"
  | "ARTIGO"
  | "REPOSITORIO"
  | "ZIP"
  | "LIVRO"
  | "SEMINARIO"
  | "INDEFINIDO";

export interface Institution {
  id: string;
  name: string;
  type: string;
  location: string;
}

export interface AppUser {
  id: string;
  nome: string;
  email: string;
  numeroDeTelefone: string;
  dataDeNascimento: string;
  avatar: string;
}

export interface UserProfile {
  role: UserRole;
  label: string;
  description: string;
  status: ProfileStatus;
  permissions: string[];
  institutionIds?: string[];
  metadata?: Record<string, string | number | string[]>;
}

export interface AccountRecord {
  user: AppUser;
  profiles: UserProfile[];
}

export interface ProfileApproval {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  profileRole: UserRole;
  profileLabel: string;
  institutionIds?: string[];
  requestedAt: string;
  status: ProfileStatus;
  rejectionReason?: string;
}

export interface DocumentReviewEntry {
  id: string;
  action: "APROVADO" | "REJEITADO" | "PUBLICADO";
  reviewerId: string;
  reviewerName: string;
  reviewerRole: UserRole;
  reason?: string;
  decidedAt: string;
}

export interface SugestaoConfianca {
  valor: string;
  confianca: number;
}

export interface AISuggestion {
  id: string;
  documentoId: string;
  origemAnalise: string;
  pendenteConfirmacao: boolean;
  versaoAnalise: number;
  resumoGeradoIA: string;
  tituloSugerido: string;
  tituloConfianca: number;
  categoriaSugerida: string;
  categoriaConfianca: number;
  subcategoriaSugerida: string;
  subcategoriaConfianca: number;
  palavrasChaveIA: SugestaoConfianca[];
  tagsSugeridas: SugestaoConfianca[];
  tecnologiasSugeridas: SugestaoConfianca[];
  frameworksSugeridos: SugestaoConfianca[];
  conflitosDetectados: string[];
  motivoRejeicao: string;
  observacaoAdmin: string;
  dataProcessamento: string;
  versao: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface AppFile {
  nome: string;
  url: string;
  formato?: string;
}

export interface AppDocument {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  userId: string;
  userName?: string;
  institutionId: string;
  type: DocumentType;
  status: DocumentStatus;
  categories: string[];
  tags: string[];
  files: AppFile[];
  updatedAt: string;
  coverUrl: string;
  version?: number;
  approvedByName?: string;
  urlGithub: string;
  tecnologiasUsadas: string[];
  tecnologiasSugeridas: string[];
  frameworksSugeridos: string[];
  palavrasChaveIA: string[];
  aiAutoFill?: boolean;
  reviewHistory: DocumentReviewEntry[];
  aiSuggestions?: AISuggestion;
}

export interface AppRepository {
  id: string;
  documentId: string;
  ownerUserId: string;
  urlGithub: string;
  tecnologiasUsadas: string[];
  updatedAt: string;
}

export interface SessionState {
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresAt: number | null;
  refreshTokenExpiresAt: number | null;
  activeRole: UserRole | null;
  roles: UserRole[];
  permissions: string[];
  user: AppUser | null;
}

export interface RegisterPayload {
  nome: string;
  email: string;
  numeroDeTelefone: string;
  dataDeNascimento: string;
  password: string;
}

export interface LoginPayload {
  identificador: string;
  password: string;
}

export interface ProfileRequestPayload {
  role: Exclude<UserRole, "ROLE_USUARIO">;
  institutionIds: string[];
  metadata: Record<string, string | number | string[]>;
}

export interface DocumentPayload {
  title: string;
  summary: string;
  authors: string[];
  institutionId: string;
  type: DocumentType;
  categories: string[];
  tags: string[];
  files: string[];
  coverUrl: string;
  submitForReview: boolean;
  aiAutoFill?: boolean;
}

export interface RepositoryPayload {
  documentId: string;
  urlGithub: string;
  tecnologiasUsadas: string[];
}

export interface JwtClaims {
  sub: string;
  userId?: string;
  email?: string;
  name?: string;
  activeRole?: UserRole;
  roles?: UserRole[];
  permissions?: string[];
  exp: number;
}

export interface NavItem {
  label: string;
  to: string;
  icon: string;
  roles?: UserRole[];
}
