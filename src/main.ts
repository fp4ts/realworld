import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { IO, IOF, unsafeRunMain } from '@fp4ts/effect';
import { NodeServerBuilder } from '@fp4ts/http-node-server';
import { SqliteTransactor } from '@fp4ts/sql-sqlite';

import { api } from './api';
import { Env } from './api/user';

const trx = SqliteTransactor.make(IO.Async, 'test.db');
const env: Env<IOF> = {
  compare: (data, encrypted) =>
    IO.deferPromise(() => bcrypt.compare(data, encrypted)),
  hash: (data, salt = 16) => IO.deferPromise(() => bcrypt.hash(data, salt)),
  decode: (token, secret) =>
    IO.delay(() => jwt.decode(token, secret as any) as jwt.JwtPayload),
  sign: (payload, secret) => IO.delay(() => jwt.sign(payload, secret)),
  verify: (payload, secret) =>
    IO.delay(() => jwt.verify(payload, secret) as jwt.JwtPayload),
  trx,
};

const main: IO<void> = NodeServerBuilder.make(IO.Async)
  .bindLocal(8080)
  .withHttpApp(api(env))
  .serve()
  .compileConcurrent().last.void;

unsafeRunMain(main);
