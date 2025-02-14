import jwt from 'jsonwebtoken'
import  { Request, Response, NextFunction, RequestHandler } from 'express';
import dotenv from 'dotenv'

dotenv.config()


interface AuthRequest extends Request {
    userId?: number; 
    partnerId?: number;
}

export const auth:RequestHandler = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.Ecomm_token;
        if (!token) {
            res.status(401).json({ message: "Token not found" });
            return
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("JWT_SECRET is not defined in environment variables.");
            res.status(500).json({ message: "Internal server error" });
            return 
        }

        const decoded = jwt.verify(token, secret) as { userId: number; email: string };
        req.userId = decoded.userId; 

        next();
    } catch (error) {
        console.error("JWT verification failed:", error);
        res.status(401).json({ message: 'Unauthorized' });
        return
    }
};

export const authPartner:RequestHandler = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies?.Ecomm_partner_token;
        if (!token) {
            res.status(401).json({ message: "Token not found" });
            return
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error("JWT_SECRET is not defined in environment variables.");
            res.status(500).json({ message: "Internal server error" });
            return
        }

        const decoded = jwt.verify(token, secret) as { partnerId: number; email: string };
        req.partnerId = decoded.partnerId; 

        next();
    } catch (error) {
        console.error("JWT verification failed:", error);
        res.status(401).json({ message: 'Unauthorized' });
        return
    }
};


