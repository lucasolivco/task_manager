// services/authService.ts - ADICIONAR LIMPEZA DE ACESSO NO LOGOUT
import api from './api';
import type { 
  LoginForm, 
  RegisterForm, 
  LoginResponse, 
  RegisterResponse,
  VerifyEmailResponse,
  ResendEmailRequest,
  ResendEmailResponse,
  RequestPasswordResetForm,
  RequestPasswordResetResponse,
  ResetPasswordForm,
  ResetPasswordResponse,
  VerifyResetTokenResponse,
  User 
} from '../types';

// ✅ TODAS AS FUNÇÕES EXISTENTES PERMANECEM IGUAIS
export const verifyEmail = async (token: string): Promise<VerifyEmailResponse> => {
    try {
        console.log('🔍 Verificando token:', token);
        
        const response = await api.get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        
        console.log('✅ Resposta da verificação:', response.data);
        
        if (response.data && response.data.user) {
            return response.data;
        } else {
            throw new Error('Resposta inválida da API');
        }
        
    } catch (error: any) {
        console.error('❌ Erro na verificação:', error);
        
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        
        throw error;
    }
};

export const login = async (data: LoginForm): Promise<LoginResponse> => {
    try {
        const response = await api.post('/api/auth/login', data);
        return response.data;
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        throw error;
    }
};

export const register = async (data: RegisterForm): Promise<RegisterResponse> => {
    try {
        const response = await api.post('/api/auth/register', data);
        return response.data;
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        throw error;
    }
}

export const resendVerificationEmail = async (data: ResendEmailRequest): Promise<ResendEmailResponse> => {
    try {
        const response = await api.post('/api/auth/resend-verification', data);
        return response.data;
    } catch (error) {
        console.error('Erro ao reenviar email:', error);
        throw error;
    }
};

export const getUser = async (): Promise<User> => {
    try {
        const response = await api.get('/api/auth/me');
        return response.data;
    } catch (error) {
        console.error('Erro ao obter usuário:', error);
        throw error;
    }
};

export const requestPasswordReset = async (data: RequestPasswordResetForm): Promise<RequestPasswordResetResponse> => {
    try {
        const response = await api.post('/api/auth/request-password-reset', data);
        return response.data;
    } catch (error) {
        console.error('Erro ao solicitar recuperação:', error);
        throw error;
    }
};

export const resetPassword = async (data: ResetPasswordForm): Promise<ResetPasswordResponse> => {
    try {
        const response = await api.post('/api/auth/reset-password', data);
        return response.data;
    } catch (error) {
        console.error('Erro ao redefinir senha:', error);
        throw error;
    }
};

export const verifyResetToken = async (token: string): Promise<VerifyResetTokenResponse> => {
    try {
        const response = await api.get(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
        return response.data;
    } catch (error) {
        console.error('Erro ao verificar token de reset:', error);
        throw error;
    }
};

// ✅ MODIFICAR APENAS O LOGOUT PARA LIMPAR TOKEN DE ACESSO TAMBÉM
export const logout = async (): Promise<void> => {
    try {
        await api.post('/api/auth/logout');
        
        // ✅ LIMPAR TOKENS DE AUTENTICAÇÃO (EXISTENTE)
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
        
        // ✅ NOVO: LIMPAR TOKEN DE ACESSO TAMBÉM
        localStorage.removeItem('app_access_token');
        localStorage.removeItem('app_environment');
        
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        
        // Remove do localStorage mesmo se der erro na API
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('app_access_token'); // ✅ NOVO
        localStorage.removeItem('app_environment');  // ✅ NOVO
    }
};