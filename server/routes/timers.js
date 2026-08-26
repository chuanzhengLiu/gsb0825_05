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

// 按月统计（可用 ?pattern_id= 筛选单款式）
// 注意：必须注册在 /stats/:patternId 之前，否则 "monthly" 会被当作 patternId
router.get('/stats/monthly', authenticateToken, async (req, res, next) => {
  try {
    const { pattern_id } = req.query;
    const params = [req.user.userId];
    let where = 'WHERE user_id = ?';
    if (pattern_id) {
      where += ' AND pattern_id = ?';
      params.push(pattern_id);
    }
    const [rows] = await pool.query(
      `SELECT
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as total_sessions,
        SUM(CASE WHEN pattern_id IS NULL THEN 1 ELSE 0 END) as unlinked_sessions,
        AVG(duration_seconds) as avg_seconds
       FROM tying_sessions
       ${where}
       GROUP BY month
       ORDER BY month ASC`,
      params
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
