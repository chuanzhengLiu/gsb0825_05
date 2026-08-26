jest.mock('../config/db');

const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');
const { authHeader } = require('./helpers');

beforeEach(() => {
  pool.query.mockReset();
});

describe('GET /api/patterns', () => {
  it('lists public patterns without filters', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, name: 'Adams' }]]);
    const res = await request(app).get('/api/patterns');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('WHERE p.is_public = TRUE');
    expect(params).toEqual([]);
  });

  it('appends filter clauses and params when query params are present', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    await request(app).get('/api/patterns').query({
      target_fish: '鳟鱼',
      water_type: '溪流',
      difficulty: '中等',
      search: 'ad'
    });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('p.target_fish = ?');
    expect(sql).toContain('p.water_type = ?');
    expect(sql).toContain('p.difficulty = ?');
    expect(sql).toContain('p.name LIKE ?');
    expect(params).toEqual(['鳟鱼', '溪流', '中等', '%ad%', '%ad%']);
  });
});

describe('GET /api/patterns/:slug', () => {
  it('returns 404 when the pattern is missing', async () => {
    pool.query.mockResolvedValueOnce([[]]);
    const res = await request(app).get('/api/patterns/nope');
    expect(res.status).toBe(404);
  });

  it('returns the pattern with parsed steps and materials', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 7, slug: 'adams', name: 'Adams' }]]) // pattern
      .mockResolvedValueOnce([
        [
          {
            id: 1,
            step_number: 1,
            svg_data: '{"type":"base_thread","color":"#111"}',
            materials: '黑色丝线:适量:6/0|干式钩:1 个:'
          }
        ]
      ]); // steps
    const res = await request(app).get('/api/patterns/adams');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(7);
    expect(res.body.steps).toHaveLength(1);
    expect(res.body.steps[0].svg_data).toEqual({ type: 'base_thread', color: '#111' });
    expect(res.body.steps[0].materials).toEqual([
      { name: '黑色丝线', amount: '适量', notes: '6/0' },
      { name: '干式钩', amount: '1 个', notes: '' }
    ]);
  });

  it('tolerates a step with no materials and invalid svg json', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 7, slug: 'adams' }]])
      .mockResolvedValueOnce([[{ id: 1, step_number: 1, svg_data: 'not-json', materials: null }]]);
    const res = await request(app).get('/api/patterns/adams');
    expect(res.status).toBe(200);
    expect(res.body.steps[0].materials).toEqual([]);
    expect(res.body.steps[0].svg_data).toEqual({});
  });
});

describe('POST /api/patterns', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/patterns').send({ name: 'x' });
    expect(res.status).toBe(401);
  });

  it('rejects when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/patterns')
      .set('Authorization', authHeader())
      .send({ name: 'x' });
    expect(res.status).toBe(400);
  });

  it('creates a pattern with steps and step materials', async () => {
    pool.query
      .mockResolvedValueOnce([{ insertId: 100 }]) // insert pattern
      .mockResolvedValueOnce([{ insertId: 200 }]) // insert step
      .mockResolvedValueOnce([{ insertId: 300 }]); // insert step material
    const res = await request(app)
      .post('/api/patterns')
      .set('Authorization', authHeader())
      .send({
        name: 'New',
        slug: 'new',
        target_fish: '鳟鱼',
        water_type: '溪流',
        difficulty: '简单',
        steps: [
          { step_number: 1, title: 't', instruction: 'i', svg_data: {}, materials: [{ name: 'm', amount: '1', notes: 'n' }] }
        ]
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(100);
    expect(pool.query).toHaveBeenCalledTimes(3);
  });
});

describe('GET /api/patterns/meta/filters', () => {
  it('returns distinct filter values', async () => {
    pool.query
      .mockResolvedValueOnce([[{ target_fish: '鳟鱼' }, { target_fish: '鲈鱼' }]])
      .mockResolvedValueOnce([[{ water_type: '溪流' }]])
      .mockResolvedValueOnce([[{ difficulty: '中等' }]]);
    const res = await request(app).get('/api/patterns/meta/filters');
    expect(res.status).toBe(200);
    expect(res.body.target_fish).toEqual(['鳟鱼', '鲈鱼']);
    expect(res.body.water_type).toEqual(['溪流']);
    expect(res.body.difficulty).toEqual(['中等']);
  });
});
