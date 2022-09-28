import jwt from 'jsonwebtoken';
import { Kind } from '@fp4ts/core';

export interface JWT<F> {
  sign(token: jwt.JwtPayload, secret: string): Kind<F, [string]>;
  decode(token: string, secret: string): Kind<F, [jwt.JwtPayload]>;
  verify(token: string, secret: string): Kind<F, [jwt.JwtPayload]>;
}
