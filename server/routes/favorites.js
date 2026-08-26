const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取收藏列表
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, u.nickname as author_name
       FROM favorites f
       JOIN patterns p ON f.pattern_id = p.id
       LEFT JOIN users u ON p.created_by = u.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// 添加收藏
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { pattern_id } = req.body;
    await pool.query(
      'INSERT INTO favorites (user_id, pattern_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP',
      [req.user.userId, pattern_id]
    );
    res.json({ message: '收藏成功' });
  } catch (err) {
    next(err);
  }
});

// 取消收藏
router.delete('/:patternId', authenticateToken, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM favorites WHERE user_id = ? AND pattern_id = ?', [
      req.user.userId,
      req.params.patternId
    ]);
    res.json({ message: '已取消收藏' });
  } catch (err) {
    next(err);
  }
});

// 检查是否收藏
router.get('/check/:patternId', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id FROM favorites WHERE user_id = ? AND pattern_id = ?', [
      req.user.userId,
      req.params.patternId
    ]);
    res.json({ isFavorite: rows.length > 0 });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
