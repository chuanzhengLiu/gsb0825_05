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

// 按月汇总：每月绑制次数与平均用时（涵盖所有记录，无论是否关联款式）
router.get('/stats/monthly', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as total_sessions,
        AVG(duration_seconds) as avg_seconds,
        SUM(pattern_id IS NULL) as unlinked_sessions
       FROM tying_sessions
       WHERE user_id = ?
       GROUP BY month
       ORDER BY month DESC`,
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// 有计时记录的款式列表，含"未关联款式"聚合项，供趋势筛选使用
router.get('/stats/patterns', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        t.pattern_id,
        COALESCE(p.name, '未关联款式') as pattern_name,
        COUNT(*) as total_sessions
       FROM tying_sessions t
       LEFT JOIN patterns p ON t.pattern_id = p.id
       WHERE t.user_id = ?
       GROUP BY t.pattern_id, p.name
       ORDER BY total_sessions DESC`,
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// 单一款式的月度用时趋势（patternId 传 "none" 表示未关联款式的记录）
router.get('/stats/:patternId/trend', authenticateToken, async (req, res, next) => {
  try {
    const { patternId } = req.params;
    const unlinked = patternId === 'none';
    const [rows] = await pool.query(
      `SELECT
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as total_sessions,
        AVG(duration_seconds) as avg_seconds,
        MIN(duration_seconds) as min_seconds,
        MAX(duration_seconds) as max_seconds
       FROM tying_sessions
       WHERE user_id = ? AND ${unlinked ? 'pattern_id IS NULL' : 'pattern_id = ?'}
       GROUP BY month
       ORDER BY month ASC`,
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
