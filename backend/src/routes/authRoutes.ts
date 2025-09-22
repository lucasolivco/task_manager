// "Menu" de funcionalidades relacionadas à autenticação
import { Router } from 'express';
import { 
  register, 
  login, 
  getMe, 
  verifyEmail, 
  resendVerificationEmail,
  requestPasswordReset,     // ✅ NOVA
  resetPassword,           // ✅ NOVA  
  verifyResetToken,        // ✅ NOVA
  hubLogin        // ✅ NOVA
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

// Cria um "cardápio" de rotas
const router = Router()

// ✅ ROTAS PÚBLICAS (não precisam de autenticação)
router.post('/register', register)
router.post('/login', login)
router.post('/hub-login', hubLogin) // login hub
router.get('/verify-email', verifyEmail)
router.post('/resend-verification', resendVerificationEmail)

// ✅ ROTAS PROTEGIDAS (precisam de autenticação)
router.get('/me', authenticateToken, getMe)

// ✅ NOVAS ROTAS DE RESET DE SENHA
router.post('/request-password-reset', requestPasswordReset)
router.post('/reset-password', resetPassword)
router.get('/verify-reset-token', verifyResetToken)

export default router