import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { IO } from '@fp4ts/effect';
import { sql } from '@fp4ts/sql';
import { SqliteTransactor } from '@fp4ts/sql-sqlite';
import { withServerP } from '@fp4ts/http-test-kit-node';
import { userApi } from '../api/user';
import { userTable } from '../repository/user';

describe('User API', () => {
  const trx = SqliteTransactor.make(IO.Async, 'test.db');
  const userApiIO = userApi(IO.Async, {
    compare: (data, encrypted) =>
      IO.deferPromise(() => bcrypt.compare(data, encrypted)),
    hash: (data, salt = 10) => IO.deferPromise(() => bcrypt.hash(data, salt)),
    decode: (token, secret) =>
      IO.delay(() => jwt.decode(token, secret as any) as jwt.JwtPayload),
    sign: (payload, secret) => IO.delay(() => jwt.sign(payload, secret)),
    verify: (payload, secret) =>
      IO.delay(() => jwt.verify(payload, secret) as jwt.JwtPayload),
    trx,
  });

  const email = 'test@test.com';
  const username = 'test';
  const password = '12345';

  const setup = sql`DROP TABLE IF EXISTS user`
    .update()
    .run()
    .flatMap(() => userTable.update().run())
    .transact(trx);

  it('should login after registration', () =>
    setup['>>>'](
      withServerP(userApiIO)(app =>
        request(app)
          .post('/')
          .send({ user: { username, email, password } })
          .then(res => expect(res.statusCode).toBe(200))
          .then(() =>
            request(app)
              .post('/login')
              .send({ user: { email, password } })
              .then(res => expect(res.status).toBe(200)),
          ),
      ),
    ).unsafeRunToPromise());
});
