import { Option } from '@fp4ts/cats';
import { Codec } from '@fp4ts/schema';
import { ConnectionIO, sql } from '@fp4ts/sql';
import { Email, User } from '../core/user';

export const userTable =
  //
  sql`CREATE TABLE IF NOT EXISTS user (
    |  email TEXT NOT NULL PRIMARY KEY,
    |  username TEXT UNIQUE,
    |  password TEXT NOT NULL,
    |  bio TEXT DEFAULT "",
    |  image TEXT
    | )`.stripMargin();

const codec = User.interpret(Codec.Schemable);

export const findUserByEmail = (email: Email): ConnectionIO<Option<User>> =>
  //
  sql`SELECT * FROM user
    | WHERE email = ${email}`
    .stripMargin()
    .query<User>()
    .map(user => codec.decode(user).get)
    .toOption();

export const insertUser = ({
  username,
  password,
  email,
  bio,
  image,
}: User): ConnectionIO<User> =>
  sql`INSERT INTO user(username, password, email, bio, image)
    | VALUES (${username}, ${password}, ${email}, ${bio}, ${image.getOrNull()})
    | RETURNING *
    `
    .stripMargin()
    .update()
    .updateReturning()
    .compileConcurrent(ConnectionIO.Async)
    .last.map(user => codec.decode(user).get);

export const updateUser = ({
  username,
  password,
  email,
  bio,
  image,
}: User): ConnectionIO<void> =>
  //
  sql`UPDATE user SET 
    |  username = ${username},
    |  password = ${password},
    |  email    = ${email},
    |  bio      = ${bio},
    |  image    = ${image},
    | WHERE username = ${username}`
    .stripMargin()
    .update()
    .run()
    .map(() => {});
