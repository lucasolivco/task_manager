// services/accessService.ts - NOVO ARQUIVO
import api from './api';
import type { AccessCodeValidation, AccessCodeResponse } from '../types/access';

export const validateAccessCode = async (data: AccessCodeValidation): Promise<AccessCodeResponse> => {
    try {
        const response = await api.post('/api/access/validate-code', data);
        return response.data;
    } catch (error) {
        console.error('Erro ao validar código:', error);
        throw error;
    }
};

// ✅ HELPER PARA VERIFICAR SE TEM ACESSO VÁLIDO
export const hasValidAccess = (): boolean => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return false;
    
    try {
        const tokenData = JSON.parse(accessToken);
        const payload = JSON.parse(atob(tokenData.value.split('.')[1]));
        return payload.exp > Date.now() / 1000;
    } catch {
        return false;
    }
};

// ✅ LIMPAR ACESSO
export const clearAccess = (): void => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('access_environment');
};