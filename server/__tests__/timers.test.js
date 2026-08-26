jest.mock('../config/db');

const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');
const { authHeader } = require('./helpers');

beforeEach(() => {
  pool.query.mockReset();
});

describe('GET /api/timers', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/timers');
    expect(res.status).toBe(401);
  });

  it('returns the user sessions', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, duration_seconds: 300 }]]);
    const res = await request(app).get('/api/timers').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('POST /api/timers', () => {
  it('rejects a non-positive duration', async () => {
    const res = await request(app)
      .post('/api/timers')
      .set('Authorization', authHeader())
      .send({ duration_seconds: 0 });
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('saves a session without a pattern and skips the avg update', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 5 }]);
    const res = await request(app)
      .post('/api/timers')
      .set('Authorization', authHeader())
      .send({ duration_seconds: 120, notes: 'ok' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(5);
    expect(pool.query).toHaveBeenCalledTimes(1); // no pattern → no avg recompute
  });

  it('saves a session and recomputes the pattern average when a pattern is linked', async () => {
    pool.query
      .mockResolvedValueOnce([{ insertId: 6 }]) // insert session
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // update pattern avg
    const res = await request(app)
      .post('/api/timers')
      .set('Authorization', authHeader())
      .send({ pattern_id: 7, duration_seconds: 200 });
    expect(res.status).toBe(201);
    expect(pool.query).toHaveBeenCalledTimes(2);
    const [sql, params] = pool.query.mock.calls[1];
    expect(sql).toContain('UPDATE patterns SET');
    expect(params).toEqual([7, 7, 7]);
  });
});

describe('GET /api/timers/stats/:patternId', () => {
  it('returns aggregate stats for the user + pattern', async () => {
    pool.query.mockResolvedValueOnce([
      [{ total_sessions: 3, avg_seconds: 385, min_seconds: 350, max_seconds: 420 }]
    ]);
    const res = await request(app).get('/api/timers/stats/7').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body.total_sessions).toBe(3);
    expect(pool.query.mock.calls[0][1]).toEqual([1, '7']);
  });
});

describe('GET /api/timers/stats/monthly', () => {
  it('returns monthly aggregates as an array (not captured by the :patternId route)', async () => {
    pool.query.mockResolvedValueOnce([[
      { month: '2025-12', total_sessions: 4, no_pattern_sessions: 1, avg_seconds: 600, total_seconds: 2400 },
      { month: '2026-01', total_sessions: 0, no_pattern_sessions: 0, avg_seconds: null, total_seconds: 0 }
    ]]);
    const res = await request(app).get('/api/timers/stats/monthly').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].month).toBe('2025-12');
    expect(pool.query.mock.calls[0][1]).toEqual([1]);
  });
});

describe('GET /api/timers/stats/patterns', () => {
  it('returns tied patterns together with the unlinked session count', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 7, name: 'Woolly Bugger', slug: 'woolly-bugger', tie_count: 3 }]])
      .mockResolvedValueOnce([[{ no_pattern_count: 2 }]]);
    const res = await request(app).get('/api/timers/stats/patterns').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body.patterns).toHaveLength(1);
    expect(res.body.no_pattern_count).toBe(2);
  });
});

describe('GET /api/timers/stats/trend/:patternId', () => {
  it('rejects a non-numeric pattern id', async () => {
    const res = await request(app).get('/api/timers/stats/trend/abc').set('Authorization', authHeader());
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('returns sessions for a pattern in ascending order', async () => {
    pool.query.mockResolvedValueOnce([[
      { id: 1, duration_seconds: 1800, created_at: '2025-11-01 10:00:00' },
      { id: 2, duration_seconds: 900, created_at: '2026-01-02 10:00:00' }
    ]]);
    const res = await request(app).get('/api/timers/stats/trend/7').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(pool.query.mock.calls[0][1]).toEqual([1, '7']);
  });

  it('queries unlinked sessions for the none pseudo-id', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 3, duration_seconds: 600, created_at: '2026-01-03 10:00:00' }]]);
    const res = await request(app).get('/api/timers/stats/trend/none').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[0][0]).toContain('pattern_id IS NULL');
    expect(pool.query.mock.calls[0][1]).toEqual([1]);
  });
});
