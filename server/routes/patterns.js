const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取毛钩列表（支持筛选）
router.get('/', async (req, res, next) => {
  try {
    const { target_fish, water_type, difficulty, search } = req.query;
    let sql = `
      SELECT p.*, u.nickname as author_name,
        (SELECT COUNT(*) FROM favorites f WHERE f.pattern_id = p.id) as favorite_count
      FROM patterns p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.is_public = TRUE
    `;
    const params = [];

    if (target_fish) {
      sql += ' AND p.target_fish = ?';
      params.push(target_fish);
    }
    if (water_type) {
      sql += ' AND p.water_type = ?';
      params.push(water_type);
    }
    if (difficulty) {
      sql += ' AND p.difficulty = ?';
      params.push(difficulty);
    }
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY p.created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// 获取单个毛钩详情（含步骤与材料）
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const [patterns] = await pool.query(
      `SELECT p.*, u.nickname as author_name,
        (SELECT COUNT(*) FROM favorites f WHERE f.pattern_id = p.id) as favorite_count
       FROM patterns p
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.slug = ?`,
      [slug]
    );

    if (patterns.length === 0) {
      return res.status(404).json({ message: '毛钩不存在' });
    }

    const pattern = patterns[0];
    const [steps] = await pool.query(
      `SELECT s.*, GROUP_CONCAT(CONCAT(sm.material_name, ':', IFNULL(sm.amount, ''), ':', IFNULL(sm.notes, '')) SEPARATOR '|') as materials
       FROM pattern_steps s
       LEFT JOIN step_materials sm ON sm.step_id = s.id
       WHERE s.pattern_id = ?
       GROUP BY s.id
       ORDER BY s.step_number`,
      [pattern.id]
    );

    pattern.steps = steps.map((step) => {
      const materials = step.materials
        ? step.materials.split('|').map((m) => {
            const [name, amount, notes] = m.split(':');
            return { name, amount, notes };
          })
        : [];
      let svgData = {};
      try {
        svgData = step.svg_data ? JSON.parse(step.svg_data) : {};
      } catch {
        svgData = {};
      }
      return { ...step, materials, svg_data: svgData };
    });

    res.json(pattern);
  } catch (err) {
    next(err);
  }
});

// 创建毛钩（需登录）
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { name, slug, description, target_fish, water_type, difficulty, steps } = req.body;
    if (!name || !slug || !target_fish || !water_type) {
      return res.status(400).json({ message: '缺少必要字段' });
    }

    const [result] = await pool.query(
      `INSERT INTO patterns (name, slug, description, target_fish, water_type, difficulty, created_by, is_public)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, slug, description, target_fish, water_type, difficulty, req.user.userId, true]
    );

    if (steps && steps.length > 0) {
      for (const step of steps) {
        const [stepResult] = await pool.query(
          'INSERT INTO pattern_steps (pattern_id, step_number, title, instruction, svg_data) VALUES (?, ?, ?, ?, ?)',
          [result.insertId, step.step_number, step.title, step.instruction, JSON.stringify(step.svg_data || {})]
        );
        if (step.materials) {
          for (const m of step.materials) {
            await pool.query(
              'INSERT INTO step_materials (step_id, material_name, amount, notes) VALUES (?, ?, ?, ?)',
              [stepResult.insertId, m.name, m.amount, m.notes]
            );
          }
        }
      }
    }

    res.status(201).json({ id: result.insertId, message: '毛钩创建成功' });
  } catch (err) {
    next(err);
  }
});

// 获取筛选选项
router.get('/meta/filters', async (req, res, next) => {
  try {
    const [fish] = await pool.query('SELECT DISTINCT target_fish FROM patterns WHERE is_public = TRUE');
    const [water] = await pool.query('SELECT DISTINCT water_type FROM patterns WHERE is_public = TRUE');
    const [diff] = await pool.query('SELECT DISTINCT difficulty FROM patterns WHERE is_public = TRUE AND difficulty IS NOT NULL');
    res.json({
      target_fish: fish.map((r) => r.target_fish),
      water_type: water.map((r) => r.water_type),
      difficulty: diff.map((r) => r.difficulty)
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
