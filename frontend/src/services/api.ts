import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

// Adicionar este bloco para estender a tipagem do Axios
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

// ✅ CONFIGURAÇÃO SEGURA DE URL
const getBaseURL = (): string => {
  // ✅ USAR VARIÁVEL DE AMBIENTE (VITE)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }

  // ✅ FALLBACK APENAS PARA DESENVOLVIMENTO LOCAL
  if (import.meta.env.DEV) {
    return 'http://localhost:3001'
  }

  // ✅ EM PRODUÇÃO, FORÇAR CONFIGURAÇÃO EXPLÍCITA
  throw new Error('VITE_API_URL deve estar configurado em produção')
}

// ✅ WHITELIST DE DOMÍNIOS PERMITIDOS
const ALLOWED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  // ✅ ADICIONAR SEU DOMÍNIO AQUI
  '147.93.69.28',
  'seudominio.com',
  'api.seudominio.com'
]

const validateURL = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    return ALLOWED_DOMAINS.includes(urlObj.hostname)
  } catch {
    return false
  }
}

const baseURL = getBaseURL()

// ✅ VALIDAR URL ANTES DE USAR
if (!validateURL(baseURL)) {
  throw new Error(`Domínio não permitido: ${baseURL}`)
}

// ✅ FORÇAR HTTPS EM PRODUÇÃO
//if (import.meta.env.PROD && !baseURL.startsWith('https://')) {
//  throw new Error('HTTPS é obrigatório em produção')
//}

const api = axios.create({
  baseURL,
  timeout: 5000, // ✅ REDUZIDO DE 10s PARA 5s
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // ✅ PARA COOKIES HTTPONLY
})

// ✅ RATE LIMITING TRACKER
let rateLimitExceeded = false
let retryCount = 0
const MAX_RETRIES = 3

// ✅ MODIFICAR O REQUEST INTERCEPTOR EXISTENTE
api.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      console.log(`📡 ${config.method?.toUpperCase()} ${config.url}`)
    }

    // ✅ ADICIONAR TOKEN DE ACESSO (NOVA FUNCIONALIDADE)
    const accessToken = localStorage.getItem('app_access_token');
    if (accessToken) {
      config.headers['X-Access-Token'] = accessToken;
    }

    // ✅ TOKEN DE AUTENTICAÇÃO EXISTENTE (MANTER COMO ESTÁ)
    const tokenData = localStorage.getItem('access_token')
    const token = tokenData ? JSON.parse(tokenData).value : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    console.error('❌ Request Error:', error.message)
    return Promise.reject(error)
  }
)


// ✅ MODIFICAR O RESPONSE INTERCEPTOR EXISTENTE
api.interceptors.response.use(
  (response) => {
    retryCount = 0
    rateLimitExceeded = false
    return response
  },
  async (error: AxiosError) => {
    const originalRequest: InternalAxiosRequestConfig | undefined = error.config

    if (error.response) {
      const { status } = error.response;
      const responseData = error.response.data as any;

      // ✅ NOVO: TOKEN DE ACESSO INVÁLIDO (403 com requiresAccessCode)
      if (status === 403 && responseData?.requiresAccessCode) {
        console.warn('🔐 Token de acesso inválido ou expirado');
        localStorage.removeItem('app_access_token');
        localStorage.removeItem('app_environment');
        window.location.reload(); // Força reload para mostrar tela de código
        return Promise.reject(error);
      }

      // ✅ RATE LIMITING (429) - CÓDIGO EXISTENTE
      if (status === 429) {
        rateLimitExceeded = true;
        const retryAfter = error.response.headers['retry-after'];
        console.warn('🚨 Rate limit atingido:', {
          retryAfter: retryAfter ? `${retryAfter}s` : 'desconhecido',
          endpoint: originalRequest?.url,
        });

        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('rateLimitExceeded', { detail: { retryAfter } }));
        }
        return Promise.reject(error);
      }

      // ✅ TOKEN DE AUTH EXPIRADO (401) - CÓDIGO EXISTENTE
      if (status === 401) {
        console.warn('🔐 Token de autenticação expirado, fazendo logout...');
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('refresh_token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    // ✅ RETRY LOGIC - CÓDIGO EXISTENTE
    if (
      originalRequest &&
      !originalRequest._retry &&
      retryCount < MAX_RETRIES &&
      (!error.response || error.response.status >= 500)
    ) {
      originalRequest._retry = true;
      retryCount++;

      console.log(`🔄 Tentativa ${retryCount}/${MAX_RETRIES} para ${originalRequest.url}`);

      const delay = Math.pow(2, retryCount - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return api(originalRequest);
    }

    console.error('❌ API Error:', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url,
      method: error.config?.method,
    });

    return Promise.reject(error);
  }
);

// ✅ FUNÇÃO PARA VERIFICAR STATUS DA API
export const checkAPIHealth = async (): Promise<boolean> => {
  try {
    await api.get('/api/health')
    return true
  } catch {
    return false
  }
}

// ✅ FUNÇÃO PARA OBTER STATUS DE RATE LIMIT
export const isRateLimited = (): boolean => rateLimitExceeded

export default api
