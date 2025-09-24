// components/AccessCodeForm.tsx - NOVO ARQUIVO
import React, { useState } from 'react';
import api from '../services/api';

interface AccessCodeFormProps {
    onAccessGranted: (accessToken: string, environment: string) => void;
}

const AccessCodeForm: React.FC<AccessCodeFormProps> = ({ onAccessGranted }) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!code.trim()) {
            setError('Código de acesso é obrigatório');
            return;
        }

        setLoading(true);
        setError('');
        
        try {
            const response = await api.post('/api/access/validate-code', { code });
            const { accessToken, environment } = response.data;
            onAccessGranted(accessToken, environment);
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || 'Erro ao validar código';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">🔐</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Código de Acesso
                    </h1>
                    <p className="text-gray-600">
                        Digite o código para acessar a aplicação
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                            Código
                        </label>
                        <input
                            type="text"
                            id="code"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="Digite o código"
                            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-center tracking-wider font-mono text-lg"
                            required
                            disabled={loading}
                            maxLength={20}
                        />
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !code.trim()}
                        className="w-full bg-rose-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                Validando...
                            </div>
                        ) : (
                            'Acessar Aplicação'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500">
                        Entre em contato com o administrador para obter o código de acesso
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AccessCodeForm;