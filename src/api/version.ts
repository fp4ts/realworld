import { stringType } from '@fp4ts/core';
import { Get, PlainText, Route } from '@fp4ts/http-dsl';
import { builtins, toHttpAppIO } from '@fp4ts/http-dsl-server';

export const version = Route('version')[':>'](Get(PlainText, stringType));

export const versionApi = toHttpAppIO(
  version,
  builtins,
)(S => S.return('v0.0.1'));
