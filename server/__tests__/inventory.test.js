jest.mock('../config/db');

const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');
const { authHeader } = require('./helpers');

beforeEach(() => {
  pool.query.mockReset();
});

describe('GET /api/inventory', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/inventory');
    expect(res.status).toBe(401);
  });

  it('returns the current user inventory scoped by user id', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, material_name: '兔毛' }]]);
    const res = await request(app).get('/api/inventory').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(pool.query.mock.calls[0][1]).toEqual([1]);
  });
});

describe('GET /api/inventory/alerts', () => {
  it('returns low-stock items', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 2, material_name: '黑色丝线', quantity: 1 }]]);
    const res = await request(app).get('/api/inventory/alerts').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    const [sql] = pool.query.mock.calls[0];
    expect(sql).toContain('i.quantity <= i.low_stock_threshold');
  });
});

describe('POST /api/inventory', () => {
  it('rejects when material_type_id or quantity is missing', async () => {
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', authHeader())
      .send({ quantity: 5 });
    expect(res.status).toBe(400);
  });

  it('accepts quantity of 0 (upsert)', async () => {
    pool.query
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // upsert
      .mockResolvedValueOnce([[{ id: 1, material_type_id: 3, quantity: 0 }]]); // reselect
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', authHeader())
      .send({ material_type_id: 3, quantity: 0 });
    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe(0);
  });

  it('upserts and returns the joined row', async () => {
    pool.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id: 1, material_name: '兔毛', quantity: 5 }]]);
    const res = await request(app)
      .post('/api/inventory')
      .set('Authorization', authHeader())
      .send({ material_type_id: 3, quantity: 5, low_stock_threshold: 1, notes: 'ok' });
    expect(res.status).toBe(200);
    expect(res.body.material_name).toBe('兔毛');
  });
});

describe('DELETE /api/inventory/:id', () => {
  it('deletes scoped to the user', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app).delete('/api/inventory/9').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[0][1]).toEqual(['9', 1]);
  });

  it('requires authentication', async () => {
    const res = await request(app).delete('/api/inventory/9');
    expect(res.status).toBe(401);
  });
});
