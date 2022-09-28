import { IO, unsafeRunMain } from '@fp4ts/effect';
import { NodeServerBuilder } from '@fp4ts/http-node-server';
import { versionApi } from './api';

const main: IO<void> = NodeServerBuilder.make(IO.Async)
  .bindLocal(8080)
  .withHttpApp(versionApi)
  .serve()
  .compileConcurrent().last.void;

unsafeRunMain(main);
