jest.mock('../config/db');

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../app');
const pool = require('../config/db');
const { authHeader } = require('./helpers');

beforeEach(() => {
  pool.query.mockReset();
});

describe('POST /api/auth/register', () => {
  it('rejects when required fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.c' });
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects a duplicate email', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1 }]]); // existing user
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.c', password: 'pw', nickname: 'nick' });
    expect(res.status).toBe(409);
  });

  it('creates a user and returns a token', async () => {
    pool.query
      .mockResolvedValueOnce([[]]) // no existing user
      .mockResolvedValueOnce([{ insertId: 42 }]); // insert
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.c', password: 'pw', nickname: 'nick' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toEqual({ id: 42, email: 'a@b.c', nickname: 'nick' });
  });
});

describe('POST /api/auth/login', () => {
  it('rejects when fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.c' });
    expect(res.status).toBe(400);
  });

  it('returns 401 when the user does not exist', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.c', password: 'pw' });
    expect(res.status).toBe(401);
  });

  it('returns 401 on a wrong password', async () => {
    const hash = bcrypt.hashSync('correct', 10);
    pool.query.mockResolvedValueOnce([[{ id: 1, email: 'a@b.c', password_hash: hash, nickname: 'n' }]]);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.c', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns a token on valid credentials', async () => {
    const hash = bcrypt.hashSync('secret', 10);
    pool.query.mockResolvedValueOnce([
      [{ id: 1, email: 'a@b.c', password_hash: hash, nickname: 'n', avatar_url: null, bio: null }]
    ]);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'a@b.c', password: 'secret' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.id).toBe(1);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 403 with an invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer nope');
    expect(res.status).toBe(403);
  });

  it('returns 404 when the user row is gone', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/auth/me').set('Authorization', authHeader());
    expect(res.status).toBe(404);
  });

  it('returns the current user', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, email: 'a@b.c', nickname: 'n' }]]);
    const res = await request(app).get('/api/auth/me').set('Authorization', authHeader());
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });
});

describe('PATCH /api/auth/me', () => {
  it('updates and returns the profile', async () => {
    pool.query
      .mockResolvedValueOnce([{ affectedRows: 1 }]) // update
      .mockResolvedValueOnce([[{ id: 1, nickname: 'new', bio: 'b', avatar_url: null }]]); // reselect
    const res = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', authHeader())
      .send({ nickname: 'new', bio: 'b', avatar_url: null });
    expect(res.status).toBe(200);
    expect(res.body.nickname).toBe('new');
  });

  it('requires authentication', async () => {
    const res = await request(app).patch('/api/auth/me').send({ nickname: 'x' });
    expect(res.status).toBe(401);
  });
});
