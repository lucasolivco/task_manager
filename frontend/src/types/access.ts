// types/access.ts - NOVO ARQUIVO
export interface AccessCodeValidation {
    code: string;
}

export interface AccessCodeResponse {
    message: string;
    accessToken: string;
    environment: string;
}

export interface AccessState {
    hasAccess: boolean;
    accessToken: string | null;
    environment: string | null;
    isValidating: boolean;
    error: string | null;
}