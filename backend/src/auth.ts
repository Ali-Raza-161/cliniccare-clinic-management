import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db';

const SECRET = process.env.JWT_SECRET || 'cliniccare-demo-secret-change-me';
export interface AuthUser { id: number; name: string; email: string; role: string; }
export function signToken(u: AuthUser) { return jwt.sign(u, SECRET, { expiresIn: '12h' }); }
export function verifyPassword(pw: string, hash: string) { return bcrypt.compareSync(pw, hash); }
export function hashPassword(pw: string) { return bcrypt.hashSync(pw, 10); }
export function requireAuth(req: Request & { user?: AuthUser }, res: Response, next: NextFunction) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  try { req.user = jwt.verify(token, SECRET) as AuthUser; next(); } catch { return res.status(401).json({ error: 'Session expired. Please sign in again.' }); }
}
export function requireRole(...roles: string[]) {
  return (req: Request & { user?: AuthUser }, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission for this action.' });
    next();
  };
}
export function findUserByEmail(email: string) {
  return db.prepare('SELECT * FROM users WHERE email=?').get(email) as any;
}
