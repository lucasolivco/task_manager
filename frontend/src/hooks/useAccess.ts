// hooks/useAccess.ts - NOVO ARQUIVO
import { useState, useEffect } from 'react';

interface AccessState {
    hasAccess: boolean;
    accessToken: string | null;
    environment: string | null;
    isValidating: boolean;
    error: string | null;
}

export const useAccess = () => {
    const [accessState, setAccessState] = useState<AccessState>({
        hasAccess: false,
        accessToken: null,
        environment: null,
        isValidating: true,
        error: null
    });

    useEffect(() => {
        checkAccess();
    }, []);

    const checkAccess = () => {
        try {
            const accessToken = localStorage.getItem('app_access_token');
            const environment = localStorage.getItem('app_environment');

            if (accessToken && environment) {
                // Verificar se token não expirou
                const payload = JSON.parse(atob(accessToken.split('.')[1]));
                const isValid = payload.exp > Date.now() / 1000;

                if (isValid) {
                    setAccessState({
                        hasAccess: true,
                        accessToken,
                        environment,
                        isValidating: false,
                        error: null
                    });
                    return;
                }
            }

            // Se chegou aqui, não tem acesso válido
            clearAccess();
            setAccessState({
                hasAccess: false,
                accessToken: null,
                environment: null,
                isValidating: false,
                error: null
            });

        } catch (error) {
            console.warn('Erro ao verificar acesso:', error);
            clearAccess();
            setAccessState({
                hasAccess: false,
                accessToken: null,
                environment: null,
                isValidating: false,
                error: 'Erro ao verificar acesso'
            });
        }
    };

    const grantAccess = (accessToken: string, environment: string) => {
        localStorage.setItem('app_access_token', accessToken);
        localStorage.setItem('app_environment', environment);
        
        setAccessState({
            hasAccess: true,
            accessToken,
            environment,
            isValidating: false,
            error: null
        });
    };

    const clearAccess = () => {
        localStorage.removeItem('app_access_token');
        localStorage.removeItem('app_environment');
    };

    const revokeAccess = () => {
        clearAccess();
        setAccessState({
            hasAccess: false,
            accessToken: null,
            environment: null,
            isValidating: false,
            error: null
        });
    };

    return {
        ...accessState,
        grantAccess,
        revokeAccess,
        checkAccess
    };
};