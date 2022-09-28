import { Kind } from '@fp4ts/core';

export interface Bcrypt<F> {
  compare(data: string, encrypted: string): Kind<F, [boolean]>;
  hash(data: string, rounds?: number): Kind<F, [string]>;
}
