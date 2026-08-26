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

// 按月统计绑制次数与平均用时
router.get('/stats/monthly', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        YEAR(created_at) AS year,
        MONTH(created_at) AS month,
        COUNT(*) AS total_sessions,
        ROUND(AVG(duration_seconds)) AS avg_seconds,
        SUM(CASE WHEN pattern_id IS NULL THEN 1 ELSE 0 END) AS unlinked_sessions,
        SUM(CASE WHEN pattern_id IS NOT NULL THEN 1 ELSE 0 END) AS linked_sessions
       FROM tying_sessions
       WHERE user_id = ?
       GROUP BY YEAR(created_at), MONTH(created_at)
       ORDER BY year, month`,
      [req.user.userId]
    );

    const [rangeRow] = await pool.query(
      `SELECT
        MIN(created_at) AS first_date,
        MAX(created_at) AS last_date
       FROM tying_sessions
       WHERE user_id = ?`,
      [req.user.userId]
    );

    let monthly = [];
    if (rows.length > 0 && rangeRow[0].first_date) {
      const start = new Date(rangeRow[0].first_date);
      const end = new Date(rangeRow[0].last_date || new Date());
      const map = new Map();
      rows.forEach(r => map.set(`${r.year}-${r.month}`, r));

      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      const endCursor = new Date(end.getFullYear(), end.getMonth(), 1);
      while (cursor <= endCursor) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth() + 1}`;
        const found = map.get(key);
        monthly.push({
          year: cursor.getFullYear(),
          month: cursor.getMonth() + 1,
          total_sessions: found ? found.total_sessions : 0,
          avg_seconds: found ? found.avg_seconds : null,
          unlinked_sessions: found ? found.unlinked_sessions : 0,
          linked_sessions: found ? found.linked_sessions : 0,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    const [overallRow] = await pool.query(
      `SELECT
        COUNT(*) AS total_sessions,
        ROUND(AVG(duration_seconds)) AS avg_seconds,
        MIN(duration_seconds) AS min_seconds,
        MAX(duration_seconds) AS max_seconds,
        SUM(CASE WHEN pattern_id IS NULL THEN 1 ELSE 0 END) AS unlinked_sessions
       FROM tying_sessions
       WHERE user_id = ?`,
      [req.user.userId]
    );

    res.json({
      monthly,
      overall: overallRow[0],
    });
  } catch (err) {
    next(err);
  }
});

// 获取某款式的用时变化趋势
router.get('/stats/trend/:patternId', authenticateToken, async (req, res, next) => {
  try {
    const { patternId } = req.params;
    const [rows] = await pool.query(
      `SELECT id, duration_seconds, created_at, notes
       FROM tying_sessions
       WHERE user_id = ? AND pattern_id = ?
       ORDER BY created_at ASC`,
      [req.user.userId, patternId]
    );

    let trend = rows.map(r => ({
      ...r,
      created_at: r.created_at,
    }));

    let summary = null;
    if (trend.length > 0) {
      const durations = trend.map(r => r.duration_seconds);
      const first = trend[0].duration_seconds;
      const last = trend[trend.length - 1].duration_seconds;
      summary = {
        total_sessions: trend.length,
        avg_seconds: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
        min_seconds: Math.min(...durations),
        max_seconds: Math.max(...durations),
        first_seconds: first,
        last_seconds: last,
        improvement_seconds: first - last,
      };
    }

    const [patternRows] = await pool.query(
      'SELECT id, name FROM patterns WHERE id = ?',
      [patternId]
    );

    res.json({
      pattern: patternRows[0] || null,
      trend,
      summary,
    });
  } catch (err) {
    next(err);
  }
});

// 获取用户有计时记录的款式列表（供统计页筛选）
router.get('/stats/patterns/list', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT p.id, p.name, p.slug,
        COUNT(t.id) AS session_count,
        ROUND(AVG(t.duration_seconds)) AS avg_seconds
       FROM tying_sessions t
       INNER JOIN patterns p ON t.pattern_id = p.id
       WHERE t.user_id = ? AND t.pattern_id IS NOT NULL
       GROUP BY p.id, p.name, p.slug
       ORDER BY session_count DESC, p.name ASC`,
      [req.user.userId]
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
