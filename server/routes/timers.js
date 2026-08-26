const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取当前用户的计时记录
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, p.name as pattern_name, p.slug as pattern_slug
       FROM tying_sessions t
       LEFT JOIN patterns p ON t.pattern_id = p.id
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC`,
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// 提交计时记录
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { pattern_id, duration_seconds, notes } = req.body;
    if (!duration_seconds || duration_seconds <= 0) {
      return res.status(400).json({ message: '绑制时间无效' });
    }

    const [result] = await pool.query(
      'INSERT INTO tying_sessions (user_id, pattern_id, duration_seconds, notes) VALUES (?, ?, ?, ?)',
      [req.user.userId, pattern_id || null, duration_seconds, notes]
    );

    // 更新毛钩平均时间
    if (pattern_id) {
      await pool.query(
        `UPDATE patterns SET
          avg_time_seconds = (SELECT AVG(duration_seconds) FROM tying_sessions WHERE pattern_id = ?),
          tie_count = (SELECT COUNT(*) FROM tying_sessions WHERE pattern_id = ?)
         WHERE id = ?`,
        [pattern_id, pattern_id, pattern_id]
      );
    }

    res.status(201).json({ id: result.insertId, message: '计时记录已保存' });
  } catch (err) {
    next(err);
  }
});

// 按月统计绑制次数与平均用时（含未关联款式的记录，未关联数量单独返回）
router.get('/stats/monthly', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        COUNT(*) AS total_sessions,
        SUM(CASE WHEN pattern_id IS NULL THEN 1 ELSE 0 END) AS no_pattern_sessions,
        ROUND(AVG(duration_seconds)) AS avg_seconds,
        SUM(duration_seconds) AS total_seconds
       FROM tying_sessions
       WHERE user_id = ?
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month`,
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// 获取有计时记录的款式列表（用于趋势选择），并返回未关联款式的记录数
router.get('/stats/patterns', authenticateToken, async (req, res, next) => {
  try {
    const [patternRows] = await pool.query(
      `SELECT p.id, p.name, p.slug,
              COUNT(t.id) AS tie_count,
              MIN(t.created_at) AS first_at,
              MAX(t.created_at) AS last_at
       FROM tying_sessions t
       JOIN patterns p ON t.pattern_id = p.id
       WHERE t.user_id = ?
       GROUP BY p.id, p.name, p.slug
       ORDER BY tie_count DESC, p.name`,
      [req.user.userId]
    );
    const [countRows] = await pool.query(
      'SELECT COUNT(*) AS no_pattern_count FROM tying_sessions WHERE user_id = ? AND pattern_id IS NULL',
      [req.user.userId]
    );
    res.json({ patterns: patternRows, no_pattern_count: Number(countRows[0].no_pattern_count) });
  } catch (err) {
    next(err);
  }
});

// 获取单个款式（patternId 传 none 时为未关联款式）的绑制用时趋势，按时间正序
router.get('/stats/trend/:patternId', authenticateToken, async (req, res, next) => {
  try {
    const { patternId } = req.params;
    const unlinked = patternId === 'none';
    if (!unlinked && !/^\d+$/.test(patternId)) {
      return res.status(400).json({ message: '款式 ID 无效' });
    }
    const [rows] = await pool.query(
      `SELECT id, duration_seconds, created_at
       FROM tying_sessions
       WHERE user_id = ? AND ${unlinked ? 'pattern_id IS NULL' : 'pattern_id = ?'}
       ORDER BY created_at ASC, id ASC`,
      unlinked ? [req.user.userId] : [req.user.userId, patternId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// 获取某款式的历史统计
router.get('/stats/:patternId', authenticateToken, async (req, res, next) => {
  try {
    const { patternId } = req.params;
    const [rows] = await pool.query(
      `SELECT
        COUNT(*) as total_sessions,
        AVG(duration_seconds) as avg_seconds,
        MIN(duration_seconds) as min_seconds,
        MAX(duration_seconds) as max_seconds
       FROM tying_sessions
       WHERE user_id = ? AND pattern_id = ?`,
      [req.user.userId, patternId]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
