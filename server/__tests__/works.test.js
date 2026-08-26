jest.mock('../config/db');

const fs = require('fs');
const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');
const { authHeader } = require('./helpers');

beforeEach(() => {
  pool.query.mockReset();
});

// The upload route writes real files under UPLOAD_DIR (set to a tmp dir in setup.js).
afterAll(() => {
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
});

describe('GET /api/works/my', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/works/my');
    expect(res.status).toBe(401);
  });

  it('returns the current user works', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, title: 'w' }]]);
    const res = await request(app).get('/api/works/my').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(pool.query.mock.calls[0][1]).toEqual([1]);
  });
});

describe('POST /api/works', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/works').field('title', 't');
    expect(res.status).toBe(401);
  });

  it('rejects when the image file is missing', async () => {
    const res = await request(app)
      .post('/api/works')
      .set('Authorization', authHeader())
      .field('title', 't');
    expect(res.status).toBe(400);
  });

  it('rejects a non-image upload via the file filter', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // expected 500 log
    const res = await request(app)
      .post('/api/works')
      .set('Authorization', authHeader())
      .field('title', 't')
      .attach('image', Buffer.from('hello'), { filename: 'note.txt', contentType: 'text/plain' });
    expect(res.status).toBe(500);
    expect(res.body.message).toContain('仅允许上传图片');
    errSpy.mockRestore();
  });

  it('stores an uploaded image and returns its url', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 11 }]);
    const res = await request(app)
      .post('/api/works')
      .set('Authorization', authHeader())
      .field('title', '我的作品')
      .field('description', 'desc')
      .field('is_public', 'true')
      .attach('image', Buffer.from('fakeimage'), { filename: 'shot.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(11);
    expect(res.body.image_url).toMatch(/^\/uploads\/works\/.*\.png$/);
    // is_public 'true' string should be persisted as truthy
    expect(pool.query.mock.calls[0][1][5]).toBe(true);
  });
});

describe('DELETE /api/works/:id', () => {
  it('deletes the work scoped to the user (file already absent is fine)', async () => {
    pool.query
      .mockResolvedValueOnce([[{ image_url: '/uploads/works/missing.png' }]]) // lookup
      .mockResolvedValueOnce([{ affectedRows: 1 }]); // delete
    const res = await request(app).delete('/api/works/11').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[1][1]).toEqual(['11', 1]);
  });

  it('still responds when the work does not belong to the user', async () => {
    pool.query
      .mockResolvedValueOnce([[]]) // no matching row
      .mockResolvedValueOnce([{ affectedRows: 0 }]);
    const res = await request(app).delete('/api/works/999').set('Authorization', authHeader());
    expect(res.status).toBe(200);
  });
});
