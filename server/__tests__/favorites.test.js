jest.mock('../config/db');

const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');
const { authHeader } = require('./helpers');

beforeEach(() => {
  pool.query.mockReset();
});

describe('GET /api/favorites', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/favorites');
    expect(res.status).toBe(401);
  });

  it('returns the user favorites', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, name: 'Adams' }]]);
    const res = await request(app).get('/api/favorites').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(pool.query.mock.calls[0][1]).toEqual([1]);
  });
});

describe('POST /api/favorites', () => {
  it('adds a favorite (idempotent upsert)', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', authHeader())
      .send({ pattern_id: 7 });
    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[0][1]).toEqual([1, 7]);
  });
});

describe('DELETE /api/favorites/:patternId', () => {
  it('removes a favorite scoped to the user', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app).delete('/api/favorites/7').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[0][1]).toEqual([1, '7']);
  });
});

describe('GET /api/favorites/check/:patternId', () => {
  it('reports true when a favorite exists', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1 }]]);
    const res = await request(app).get('/api/favorites/check/7').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body.isFavorite).toBe(true);
  });

  it('reports false when no favorite exists', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/favorites/check/7').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body.isFavorite).toBe(false);
  });
});
