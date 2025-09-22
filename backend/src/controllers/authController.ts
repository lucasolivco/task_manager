// controllers/authController.ts - ADICIONAR RECUPERAÇÃO DE SENHA + VALIDAÇÃO DE NOME
import { Request, Response } from 'express'
import { 
  hashPassword, 
  comparePassword, 
  generateToken, 
  generateEmailVerificationToken, 
  generatePasswordResetToken,
  getTokenExpirationDate,
  getPasswordResetExpirationDate,
  isTokenExpired,
  validateName
} from '../utils/auth'
import { 
  sendVerificationEmail, 
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail
} from '../services/emailService'
import prisma from '../config/database'
import { userInfo } from 'os'

// ✅ REGISTRO COM VERIFICAÇÃO COMPLETA
// ✅ REGISTRO ATUALIZADO COM VALIDAÇÃO DE NOME ÚNICO
export const register = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role } = req.body

        // Validações básicas
        if (!name || !email || !password) {
            return res.status(400).json({
                error: 'Nome, email e senha são obrigatórios'
            })
        }

        // ✅ VALIDAR NOME
        const nameValidation = validateName(name);
        if (!nameValidation.isValid) {
            return res.status(400).json({
                error: nameValidation.error
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Email inválido'
            })
        }

        // ✅ VERIFICAR SE EMAIL JÁ EXISTE
        const existingEmail = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        })

        if (existingEmail) {
            return res.status(400).json({
                error: 'Email já cadastrado'
            })
        }

        // ✅ VERIFICAR SE NOME JÁ EXISTE (CASE INSENSITIVE)
        const existingName = await prisma.user.findFirst({
            where: { 
                name: {
                    equals: name.trim(),
                    mode: 'insensitive'
                }
            }
        })

        if (existingName) {
            return res.status(400).json({
                error: 'Já existe um usuário com este nome. Escolha um nome diferente.'
            })
        }

        const hashedPassword = await hashPassword(password)
        const emailVerificationToken = generateEmailVerificationToken();
        const tokenExpiresAt = getTokenExpirationDate();

        // Criar usuário
        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: email.toLowerCase(),
                password: hashedPassword,
                role: role || 'EMPLOYEE',
                emailVerified: false,
                emailVerificationToken,
                tokenExpiresAt
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                emailVerified: true,
                createdAt: true
            }
        })

        // Enviar email
        const emailSent = await sendVerificationEmail(user.email, user.name, emailVerificationToken);

        if (!emailSent) {
            await prisma.user.delete({ where: { id: user.id } });
            return res.status(500).json({
                error: 'Erro ao enviar email de verificação. Tente novamente.'
            });
        }

        res.status(201).json({
            message: 'Usuário cadastrado! Verifique seu email para ativar a conta.',
            user,
            emailSent: true,
            requiresEmailVerification: true
        })

    } catch (error) {
        console.error('Erro ao cadastrar:', error)
        res.status(500).json({
            error: 'Erro interno do servidor'
        })
    }
}

// ✅ LOGIN COMPLETO
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email e senha são obrigatórios'
            })
        }

        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            return res.status(401).json({
                error: 'Email ou senha incorretos'
            })
        }

        const isValidPassword = await comparePassword(password, user.password)
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Email ou senha incorretos'
            })
        }

        // ✅ VERIFICAR EMAIL (AGORA FUNCIONA!)
        if (!user.emailVerified) {
            return res.status(401).json({
                error: 'Email não verificado. Verifique sua caixa de entrada.',
                emailNotVerified: true
            });
        }

        const token = generateToken(user.id)
        const { password: _, emailVerificationToken: __, tokenExpiresAt: ___, ...userSafe } = user;

        res.json({
            message: 'Login realizado com sucesso',
            user: userSafe,
            token
        })

    } catch (error) {
        console.error('Erro no login:', error)
        res.status(500).json({
            error: 'Erro interno do servidor'
        })
    }
}

// ✅ VERIFICAR EMAIL
// controllers/authController.ts - VERIFICAR SE ESTÁ RETORNANDO CORRETAMENTE
export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { token } = req.query;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({
                error: 'Token de verificação é obrigatório'
            });
        }

        const user = await prisma.user.findUnique({
            where: { emailVerificationToken: token }
        });

        if (!user) {
            return res.status(400).json({
                error: 'Token de verificação inválido'
            });
        }

        if (user.emailVerified) {
            return res.status(400).json({
                error: 'Email já foi verificado'
            });
        }

        if (user.tokenExpiresAt && isTokenExpired(user.tokenExpiresAt)) {
            return res.status(400).json({
                error: 'Token expirado. Solicite um novo.',
                tokenExpired: true
            });
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerificationToken: null,
                tokenExpiresAt: null
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                emailVerified: true
            }
        });

        await sendWelcomeEmail(user.email, user.name);

        // ✅ RETORNAR RESPOSTA PADRONIZADA
        res.status(200).json({
            message: 'Email verificado com sucesso!',
            user: updatedUser
        });

    } catch (error) {
        console.error('Erro na verificação:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
};

// ✅ REENVIAR EMAIL
export const resendVerificationEmail = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                error: 'Email é obrigatório'
            });
        }

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(404).json({
                error: 'Usuário não encontrado'
            });
        }

        if (user.emailVerified) {
            return res.status(400).json({
                error: 'Email já foi verificado'
            });
        }

        const emailVerificationToken = generateEmailVerificationToken();
        const tokenExpiresAt = getTokenExpirationDate();

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerificationToken,
                tokenExpiresAt
            }
        });

        const emailSent = await sendVerificationEmail(email, user.name, emailVerificationToken);

        if (!emailSent) {
            return res.status(500).json({
                error: 'Erro ao enviar email'
            });
        }

        res.json({
            message: 'Email reenviado com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao reenviar:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
};

// ✅ GET ME ATUALIZADO
export const getMe = async (req: any, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId},
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                emailVerified: true,
                createdAt: true
            }
        })

        if (!user) {
            return res.status(404).json({
                error: 'Usuário não encontrado'
            })
        }

        res.json({ user })

    } catch (error) {
        console.error('Erro ao obter usuário:', error)
        res.status(500).json({
            error: 'Erro interno do servidor'
        })
    }
}

// ✅ NOVA: SOLICITAR RECUPERAÇÃO DE SENHA
export const requestPasswordReset = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                error: 'Email é obrigatório'
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Email inválido'
            });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        // ✅ SEMPRE RETORNAR SUCESSO (SEGURANÇA - NÃO REVELAR SE EMAIL EXISTE)
        if (!user) {
            return res.status(200).json({
                message: 'Se o email existir em nossa base, você receberá instruções para recuperação.'
            });
        }

        // ✅ VERIFICAR SE USUÁRIO TEM EMAIL CONFIRMADO
        if (!user.emailVerified) {
            return res.status(400).json({
                error: 'Email não verificado. Confirme seu email antes de recuperar a senha.'
            });
        }

        const passwordResetToken = generatePasswordResetToken();
        const passwordResetExpiresAt = getPasswordResetExpirationDate();

        // Atualizar usuário com token de reset
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken,
                passwordResetExpiresAt
            }
        });

        // Enviar email de recuperação
        const emailSent = await sendPasswordResetEmail(user.email, user.name, passwordResetToken);

        if (!emailSent) {
            return res.status(500).json({
                error: 'Erro ao enviar email de recuperação'
            });
        }

        res.status(200).json({
            message: 'Se o email existir em nossa base, você receberá instruções para recuperação.'
        });

    } catch (error) {
        console.error('Erro ao solicitar recuperação:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
};

// ✅ NOVA: REDEFINIR SENHA
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                error: 'Token e nova senha são obrigatórios'
            });
        }

        const user = await prisma.user.findUnique({
            where: { passwordResetToken: token }
        });

        if (!user) {
            return res.status(400).json({
                error: 'Token de recuperação inválido'
            });
        }

        if (!user.passwordResetExpiresAt || isTokenExpired(user.passwordResetExpiresAt)) {
            return res.status(400).json({
                error: 'Token de recuperação expirado',
                tokenExpired: true
            });
        }

        // ✅ VERIFICAR SE A NOVA SENHA É DIFERENTE DA ATUAL
        const isSamePassword = await comparePassword(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({
                error: 'A nova senha deve ser diferente da senha atual'
            });
        }

        const hashedNewPassword = await hashPassword(newPassword);

        // Atualizar senha e limpar tokens
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedNewPassword,
                passwordResetToken: null,
                passwordResetExpiresAt: null
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        });

        // Enviar email de confirmação
        await sendPasswordChangedEmail(user.email, user.name);

        res.status(200).json({
            message: 'Senha alterada com sucesso!',
            user: updatedUser
        });

    } catch (error) {
        console.error('Erro ao redefinir senha:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
};

// ✅ NOVA: VERIFICAR TOKEN DE RESET (PARA VALIDAR ANTES DE MOSTRAR FORMULÁRIO)
export const verifyResetToken = async (req: Request, res: Response) => {
    try {
        const { token } = req.query;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({
                error: 'Token é obrigatório'
            });
        }

        const user = await prisma.user.findUnique({
            where: { passwordResetToken: token },
            select: {
                id: true,
                email: true,
                passwordResetExpiresAt: true
            }
        });

        if (!user) {
            return res.status(400).json({
                error: 'Token inválido'
            });
        }

        if (!user.passwordResetExpiresAt || isTokenExpired(user.passwordResetExpiresAt)) {
            return res.status(400).json({
                error: 'Token expirado',
                tokenExpired: true
            });
        }

        res.status(200).json({
            message: 'Token válido',
            email: user.email // Para mostrar no formulário
        });

    } catch (error) {
        console.error('Erro ao verificar token:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
};

// ✅ NOVA: ROTA DE LOGIN PARA O HUB (VERSÃO CORRIGIDA)
export const hubLogin = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                autenticado: false,
                mensagem: 'Email e senha são obrigatórios'
            });
        }

        // 1. A variável 'user' é declarada aqui, buscando no banco de dados.
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            return res.status(401).json({
                autenticado: false,
                mensagem: 'Credenciais inválidas'
            });
        }

        const isValidPassword = await comparePassword(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                autenticado: false,
                mensagem: 'Credenciais inválidas'
            });
        }

        if (!user.emailVerified) {
            return res.status(401).json({
                autenticado: false,
                mensagem: 'Seu email ainda não foi verificado.'
            });
        }

        // 2. Se chegamos até aqui, 'user' existe e é válido.
        //    Agora podemos usá-lo na resposta com segurança.
        res.json({
            autenticado: true,
            mensagem: 'Login realizado com sucesso',
            userName: user.name // Agora 'user' é reconhecido corretamente.
        });

    } catch (error) {
        console.error('Erro no login do hub:', error);
        res.status(500).json({
            autenticado: false,
            mensagem: 'Erro interno no servidor'
        });
    }
};