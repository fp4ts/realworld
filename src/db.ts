import { Transactor } from '@fp4ts/sql';

export interface Db<F> {
  readonly trx: Transactor<F>;
}
