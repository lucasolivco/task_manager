// App.tsx - ADICIONAR VERIFICAÇÃO DE ACESSO
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useAccess } from './hooks/useAccess' // ✅ NOVO IMPORT
import AccessCodeForm from './pages/AccessCodeForm' // ✅ NOVO IMPORT

import DashboardLayout from './layouts/DashboardLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import CreateTask from './pages/CreateTask'
import Employees from './pages/Employees'
import Notifications from './pages/Notifications'
import EditTask from './pages/EditTask'

import VerifyEmailSent from './pages/VerifyEmailSent'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Calendar from './pages/Calendar'

// ✅ QUERYCLIENT EXISTENTE (NÃO MODIFICAR)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchInterval: false,
    },
    mutations: {
      retry: 1,
    }
  },
})

// ✅ LOADING COMPONENT EXISTENTE (NÃO MODIFICAR)
const LoadingScreen: React.FC<{ message?: string }> = ({ message = "Carregando..." }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto"></div>
      <p className="mt-4 text-rose-600 font-medium">{message}</p>
    </div>
  </div>
)

// ✅ TODOS OS COMPONENTES DE ROTA EXISTENTES (NÃO MODIFICAR)
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen message="Verificando autenticação..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.emailVerified === false) {
    return <Navigate to="/verify-email-sent" state={{ email: user.email, name: user.name }} replace />
  }

  return <>{children}</>
}

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen message="Carregando aplicação..." />
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

const SemiProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  return <>{children}</>
}

const NotFoundPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">
    <div className="text-center space-y-6">
      <div className="text-9xl">🔍</div>
      <div>
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-rose-600 mb-4">Página não encontrada</h2>
        <p className="text-gray-600 mb-8">A página que você está procurando não existe.</p>
      </div>
      <div className="space-x-4">
        <button
          onClick={() => window.history.back()}
          className="px-6 py-3 bg-rose-100 text-rose-700 rounded-lg font-medium hover:bg-rose-200 transition-colors"
        >
          ← Voltar
        </button>
        <a
          href="/dashboard"
          className="px-6 py-3 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition-colors"
        >
          🏠 Ir ao Dashboard
        </a>
      </div>
    </div>
  </div>
)

// ✅ NOVO: COMPONENTE COM CONTROLE DE ACESSO
const AppWithAccessControl: React.FC = () => {
  const { hasAccess, isValidating, grantAccess, environment } = useAccess();

  // ✅ LOADING ENQUANTO VERIFICA ACESSO
  if (isValidating) {
    return <LoadingScreen message="Verificando permissões de acesso..." />;
  }

  // ✅ SE NÃO TEM ACESSO, MOSTRAR TELA DE CÓDIGO
  if (!hasAccess) {
    return <AccessCodeForm onAccessGranted={grantAccess} />;
  }

  // ✅ SE TEM ACESSO, MOSTRAR APP NORMAL COM INDICADOR DE AMBIENTE
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* ✅ INDICADOR DE AMBIENTE (OPCIONAL) */}
        {environment && (
          <div className="fixed top-2 right-2 z-50 bg-rose-100 text-rose-800 px-2 py-1 rounded text-xs font-medium shadow-sm">
            {environment}
          </div>
        )}
        
        {/* ✅ TOASTER EXISTENTE (NÃO MODIFICAR) */}
        <Toaster 
          position="top-right" 
          richColors 
          closeButton
          theme="light"
          duration={4000}
          toastOptions={{
            style: {
              background: '#fdf2f8',
              color: '#be185d',
              border: '1px solid #fce7f3'
            }
          }}
        />
        
        {/* ✅ TODAS AS ROTAS EXISTENTES (NÃO MODIFICAR) */}
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />
          
          <Route 
            path="/verify-email-sent" 
            element={
              <SemiProtectedRoute>
                <VerifyEmailSent />
              </SemiProtectedRoute>
            } 
          />
          <Route 
            path="/verify-email" 
            element={
              <SemiProtectedRoute>
                <VerifyEmail />
              </SemiProtectedRoute>
            } 
          />
          <Route 
            path="/forgot-password" 
            element={
              <SemiProtectedRoute>
                <ForgotPassword />
              </SemiProtectedRoute>
            }
          />
          <Route 
            path="/reset-password" 
            element={
              <SemiProtectedRoute>
                <ResetPassword />
              </SemiProtectedRoute>
            }
          />
          
          <Route 
            path="/tasks/:id/edit" 
            element={
              <ProtectedRoute>
                <EditTask />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="tasks/create" element={<CreateTask />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="employees" element={<Employees />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

// ✅ FUNÇÃO PRINCIPAL MODIFICADA
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppWithAccessControl />
    </QueryClientProvider>
  )
}

export default App