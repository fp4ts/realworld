import { IO, IOF } from '@fp4ts/effect';
import { group, Raw, Route } from '@fp4ts/http-dsl';
import { toHttpAppIO } from '@fp4ts/http-dsl-server';
import { Env, userApi } from './user';
import { versionApi } from './version';

const _api = Route('api')[':>'](
  group(Route('version')[':>'](Raw), Route('user')[':>'](Raw)),
);

export const api = (R: Env<IOF>) =>
  toHttpAppIO(_api, {})(_ => [versionApi, userApi(IO.Async, R)]);
