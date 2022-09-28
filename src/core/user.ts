import { Option } from '@fp4ts/cats';
import { newtype, TypeOf } from '@fp4ts/core';
import { Schema, TypeOf as SchemaTypeOf } from '@fp4ts/schema';
import { HashedPasswordSchema } from './password';

export const Email = newtype<string>()('@fp4ts/realworld/email');
export type Email = TypeOf<typeof Email>;
export const EmailSchema = Schema.string.imap(Email, Email.unapply);

export const Username = newtype<string>()('@fp4ts/realworld/username');
export type Username = TypeOf<typeof Username>;
export const UsernameSchema = Schema.string.imap(Email, Email.unapply);

export const User = Schema.struct({
  email: EmailSchema,
  username: UsernameSchema,
  password: HashedPasswordSchema,
  bio: Schema.string,
  image: Schema.string.nullable.imap(Option, o => o.getOrNull()),
});

export type User = SchemaTypeOf<typeof User>;
