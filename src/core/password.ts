import { coerce, Kind, newtype, TypeOf } from '@fp4ts/core';
import { Functor } from '@fp4ts/cats';
import { Schema } from '@fp4ts/schema';
import { Bcrypt } from '../bcrypt';

export const Password = newtype<string>()('@fp4ts/realworld/password');
export type Password = TypeOf<typeof Password>;
export const PasswordSchema = Schema.string.imap(Password, Password.unapply);

export const HashedPassword = newtype<string>()(
  '@fp4ts/realworld/hashed-password',
);
export type HashedPassword = TypeOf<typeof HashedPassword>;
export const HashedPasswordSchema = Schema.string.imap(
  HashedPassword,
  HashedPassword.unapply,
);

export const hashPassword =
  <F>(F: Bcrypt<F> & Functor<F>) =>
  (p: Password): Kind<F, [HashedPassword]> =>
    F.map_(F.hash(coerce(p), 10), HashedPassword);

export const comparePassword =
  <F>(F: Bcrypt<F>) =>
  (p: Password, h: HashedPassword): Kind<F, [boolean]> =>
    F.compare(coerce(p), coerce(h));
