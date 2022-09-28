import request from 'supertest';
import { withServerP } from '@fp4ts/http-test-kit-node';
import { versionApi } from '../api';

describe('Version API', () => {
  it('should reply with the version v0.0.1', () =>
    withServerP(versionApi)(server =>
      request(server)
        .get('/version')
        .then(resp => expect(resp.text).toBe('v0.0.1')),
    ).unsafeRunToPromise());
});
