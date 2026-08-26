jest.mock('../config/db');

const request = require('supertest');
const app = require('../app');

describe('app-level behavior', () => {
  it('GET /api/health returns ok with a timestamp', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeTruthy();
  });

  it('unknown routes return a 404 json message', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('接口不存在');
  });
});
