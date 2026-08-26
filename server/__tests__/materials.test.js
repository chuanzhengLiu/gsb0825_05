jest.mock('../config/db');

const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');

beforeEach(() => {
  pool.query.mockReset();
});

describe('GET /api/materials', () => {
  it('returns material types ordered by category and name', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, name: '干式钩 #12', category: '钩子' }]]);
    const res = await request(app).get('/api/materials');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    const [sql] = pool.query.mock.calls[0];
    expect(sql).toContain('FROM material_types');
    expect(sql).toContain('ORDER BY category, name');
  });

  it('is a public endpoint (no auth required)', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/materials');
    expect(res.status).toBe(200);
  });
});
