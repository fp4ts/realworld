import { coerce, pipe } from '@fp4ts/core';
import { Either, EitherT, Left, Monad, None, Option, Right } from '@fp4ts/cats';
import { Concurrent } from '@fp4ts/effect';
import { Schema, TypeOf } from '@fp4ts/schema';
import { JsonCodec } from '@fp4ts/schema-json';
import {
  Get,
  group,
  Header,
  JSON,
  Post,
  Put,
  ReqBody,
  Route,
} from '@fp4ts/http-dsl';
import {
  Authorization,
  MessageFailure,
  ParsingFailure,
  UnauthorizedFailure,
} from '@fp4ts/http';
import { toHttpApp } from '@fp4ts/http-dsl-server';
import { ConnectionIO } from '@fp4ts/sql';
import {
  comparePassword,
  hashPassword,
  PasswordSchema,
} from '../core/password';
import { UsernameSchema, EmailSchema, User } from '../core/user';
import { findUserByEmail, insertUser } from '../repository/user';
import { Bcrypt } from '../bcrypt';
import { Db } from '../db';
import { JWT } from '../jws';

const LoginRequest = Schema.struct({
  user: Schema.struct({
    email: EmailSchema,
    password: PasswordSchema,
  }),
}).as('@fp4ts/realworld/api/login-request');
type LoginRequest = TypeOf<typeof LoginRequest['schema']>;

const RegisterRequest = Schema.struct({
  user: Schema.struct({
    username: UsernameSchema,
    email: EmailSchema,
    password: PasswordSchema,
  }),
}).as('@fp4ts/realworld/api/register-request');
type RegisterRequest = TypeOf<typeof RegisterRequest['schema']>;

const UpdateRequest = Schema.struct({
  user: Schema.struct({
    username: UsernameSchema.optional,
    password: PasswordSchema.optional,
    email: EmailSchema.optional,
    token: Schema.string.optional,
    bio: Schema.string.optional,
    image: Schema.string.nullable.imap(Option, o => o.getOrNull()).optional,
  }),
}).as('@fp4ts/realworld/api/user-update-request');
type UpdateRequest = TypeOf<typeof UpdateRequest['schema']>;

const UserResponse = Schema.struct({
  user: Schema.struct({
    username: UsernameSchema,
    email: EmailSchema,
    token: Schema.string,
    bio: Schema.string,
    image: Schema.string.nullable.imap(Option, o => o.getOrNull()),
  }),
}).as('@fp4ts/realworld/api/user-response');
type UserResponse = TypeOf<typeof UserResponse['schema']>;

const HasAuth = Header(Authorization.Select);

const user = group(
  Route('login')
    [':>'](ReqBody(JSON, LoginRequest))
    [':>'](Post(JSON, UserResponse)),
  ReqBody(JSON, RegisterRequest)[':>'](Post(JSON, UserResponse)),
  HasAuth[':>'](ReqBody(JSON, UpdateRequest))[':>'](Put(JSON, UserResponse)),
  HasAuth[':>'](Get(JSON, UserResponse)),
);

export type Env<F> = Db<F> & Bcrypt<F> & JWT<F>;

const userDefaults = { bio: '', image: None };
const registerUser =
  <F>(F: Monad<F>) =>
  (R: Env<F>) =>
  ({ user }: RegisterRequest): EitherT<F, MessageFailure, UserResponse> =>
    F.do(function* (_) {
      const { email, username, password: plain } = user;
      const password = yield* _(hashPassword({ ...F, ...R })(plain));

      const newUser = { ...userDefaults, email, username, password };
      const r = findUserByEmail(email).flatMap(opt =>
        opt.fold<ConnectionIO<Either<MessageFailure, User>>>(
          () => insertUser(newUser).map(Right),
          () =>
            ConnectionIO.pure(Left(new ParsingFailure('User already exists'))),
        ),
      );

      const token = yield* _(R.sign({ jti: coerce(email) }, 'my-secret'));

      return yield* _(
        pipe(
          r.transact(R.trx),
          F.map(ea =>
            ea.map(({ password, ...user }) => ({ user: { ...user, token } })),
          ),
        ),
      );
    });

const loginUser =
  <F>(F: Monad<F>) =>
  (R: Env<F>) =>
  ({
    user: { email, password },
  }: LoginRequest): EitherT<F, MessageFailure, UserResponse> =>
    F.do(function* (_) {
      const EF = EitherT.MonadError<F, MessageFailure>(F);
      const liftF = EitherT.liftF(F);

      const maybeUser = yield* _(
        pipe(
          findUserByEmail(email).transact(R.trx),
          F.map(maybeUser =>
            maybeUser.toRight(() => new UnauthorizedFailure()),
          ),
        ),
      );

      const result = EF.do(function* (_) {
        const user = yield* _(EF.fromEither(maybeUser));
        const matches = comparePassword(R)(password, user.password);
        if (yield* _(liftF(matches))) {
          const signed = R.sign({ jti: coerce(email) }, 'my-secret');
          const token = yield* _(liftF(signed));
          const { password, ...rest } = user;
          return { user: { ...rest, token } };
        } else {
          return yield* _(EF.throwError(new UnauthorizedFailure()));
        }
      });
      return yield* _(result);
    });

export const userApi = <F>(F: Concurrent<F, Error>, env: Env<F>) =>
  toHttpApp(F)(user, {
    'application/json': {
      '@fp4ts/realworld/api/login-request': JsonCodec.fromSchema(
        LoginRequest.schema,
      ),
      '@fp4ts/realworld/api/register-request': JsonCodec.fromSchema(
        RegisterRequest.schema,
      ),
      '@fp4ts/realworld/api/user-response': JsonCodec.fromSchema(
        UserResponse.schema,
      ),
      '@fp4ts/realworld/api/user-update-request': JsonCodec.fromSchema(
        UpdateRequest.schema,
      ),
    },
  })(S => [
    loginUser(F)(env),
    registerUser(F)(env),
    auth =>
      ({ user: upd }) =>
        null as any,
    auth => null as any,
  ]);
