// middleware/accessControl.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AccessRequest extends Request {
    accessInfo?: any;
}

export const requireAccessToken = (req: AccessRequest, res: Response, next: NextFunction) => {
    try {
        // ✅ BUSCAR TOKEN NO HEADER
        const authHeader = req.headers['x-access-token'] || req.headers.authorization;
        let accessToken = null;

        if (typeof authHeader === 'string') {
            if (authHeader.startsWith('Bearer ')) {
                accessToken = authHeader.split(' ')[1];
            } else {
                accessToken = authHeader;
            }
        }

        if (!accessToken) {
            return res.status(403).json({
                error: 'Token de acesso requerido',
                requiresAccessCode: true
            });
        }

        // ✅ VERIFICAR TOKEN
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as any;
        
        if (decoded.type !== 'access_grant') {
            return res.status(403).json({
                error: 'Token de acesso inválido',
                requiresAccessCode: true
            });
        }

        // ✅ VERIFICAÇÃO DE IP OPCIONAL (pode desabilitar se não quiser)
        // if (decoded.ip !== req.ip) {
        //     console.warn(`IP diferente detectado: Token: ${decoded.ip}, Request: ${req.ip}`);
        // }

        req.accessInfo = decoded;
        next();

    } catch (error) {
        return res.status(403).json({
            error: 'Token de acesso inválido',
            requiresAccessCode: true
        });
    }
};