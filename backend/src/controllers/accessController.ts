// controllers/accessController.ts
import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'

// ✅ CÓDIGOS SEGUROS (mover para .env em produção)
const ACCESS_CODES = new Map([
    ['ACESSO2024', { name: 'Acesso Principal', active: true }],
    ['DEMO123', { name: 'Acesso Demo', active: true, expiresAt: '2024-12-31' }]
]);

export const validateAccessCode = async (req: Request, res: Response) => {
    try {
        const { code } = req.body;
        const ip = req.ip;
        const userAgent = req.headers['user-agent'];

        if (!code) {
            return res.status(400).json({
                error: 'Código de acesso é obrigatório'
            });
        }

        const codeInfo = ACCESS_CODES.get(code.toUpperCase());
        
        if (!codeInfo || !codeInfo.active) {
            console.warn(`Tentativa de acesso inválida: ${code} - IP: ${ip}`);
            return res.status(401).json({
                error: 'Código de acesso inválido'
            });
        }

        // Verificar expiração se definida
        if (codeInfo.expiresAt && new Date() > new Date(codeInfo.expiresAt)) {
            return res.status(401).json({
                error: 'Código de acesso expirado'
            });
        }

        // ✅ GERAR TOKEN JWT PARA ACESSO (24h)
        const accessToken = jwt.sign(
            { 
                type: 'access_grant',
                code: code.toUpperCase(),
                ip,
                timestamp: Date.now()
            },
            process.env.JWT_SECRET!,
            { expiresIn: '24h' }
        );

        console.log(`Acesso liberado: ${codeInfo.name} - IP: ${ip} - ${new Date().toISOString()}`);

        res.json({
            message: 'Código válido! Acesso liberado.',
            accessToken,
            environment: codeInfo.name
        });

    } catch (error) {
        console.error('Erro ao validar código:', error);
        res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
};