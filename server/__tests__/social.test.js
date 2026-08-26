jest.mock('../config/db');

const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');
const { authHeader } = require('./helpers');

beforeEach(() => {
  pool.query.mockReset();
});

describe('GET /api/social/feed', () => {
  it('is public and reports liked=0 for anonymous viewers', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, title: 'w', liked: 0 }]]);
    const res = await request(app).get('/api/social/feed');
    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[0][1]).toEqual([0]); // userId falls back to 0
  });

  it('passes the authenticated user id into the liked subquery', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, title: 'w', liked: 1 }]]);
    const res = await request(app).get('/api/social/feed').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[0][1]).toEqual([1]);
    expect(pool.query.mock.calls[0][0]).toContain('EXISTS(SELECT 1 FROM work_likes');
  });

  it('ignores an invalid token and still serves the feed', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/social/feed').set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[0][1]).toEqual([0]);
  });
});

describe('POST /api/social/like', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/social/like').send({ work_id: 1 });
    expect(res.status).toBe(401);
  });

  it('inserts a like and recomputes the count', async () => {
    pool.query
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // insert like
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // update count
    const res = await request(app)
      .post('/api/social/like')
      .set('Authorization', authHeader())
      .send({ work_id: 5 });
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(2);
  });
});

describe('DELETE /api/social/like/:workId', () => {
  it('deletes a like and recomputes the count', async () => {
    pool.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app).delete('/api/social/like/5').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[0][1]).toEqual([1, '5']);
  });
});

describe('POST /api/social/favorite', () => {
  it('inserts a work favorite and recomputes the count', async () => {
    pool.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app)
      .post('/api/social/favorite')
      .set('Authorization', authHeader())
      .send({ work_id: 5 });
    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(2);
  });
});

describe('DELETE /api/social/favorite/:workId', () => {
  it('deletes a work favorite and recomputes the count', async () => {
    pool.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);
    const res = await request(app).delete('/api/social/favorite/5').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[0][1]).toEqual([1, '5']);
  });
});
