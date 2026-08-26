const express = require('express');
const pool = require('../config/db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// 社区作品流
router.get('/feed', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user?.userId || 0;
    const [rows] = await pool.query(
      `SELECT w.*, u.nickname as author_name, u.avatar_url as author_avatar, p.name as pattern_name, p.slug as pattern_slug,
         EXISTS(SELECT 1 FROM work_likes wl WHERE wl.work_id = w.id AND wl.user_id = ?) as liked
       FROM works w
       JOIN users u ON w.user_id = u.id
       LEFT JOIN patterns p ON w.pattern_id = p.id
       WHERE w.is_public = TRUE
       ORDER BY w.created_at DESC
       LIMIT 100`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// 点赞
router.post('/like', authenticateToken, async (req, res, next) => {
  try {
    const { work_id } = req.body;
    await pool.query(
      'INSERT INTO work_likes (user_id, work_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP',
      [req.user.userId, work_id]
    );
    await pool.query('UPDATE works SET like_count = (SELECT COUNT(*) FROM work_likes WHERE work_id = ?) WHERE id = ?', [
      work_id,
      work_id
    ]);
    res.json({ message: '点赞成功' });
  } catch (err) {
    next(err);
  }
});

// 取消点赞
router.delete('/like/:workId', authenticateToken, async (req, res, next) => {
  try {
    const { workId } = req.params;
    await pool.query('DELETE FROM work_likes WHERE user_id = ? AND work_id = ?', [req.user.userId, workId]);
    await pool.query('UPDATE works SET like_count = (SELECT COUNT(*) FROM work_likes WHERE work_id = ?) WHERE id = ?', [
      workId,
      workId
    ]);
    res.json({ message: '已取消点赞' });
  } catch (err) {
    next(err);
  }
});

// 收藏作品
router.post('/favorite', authenticateToken, async (req, res, next) => {
  try {
    const { work_id } = req.body;
    await pool.query(
      'INSERT INTO work_favorites (user_id, work_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP',
      [req.user.userId, work_id]
    );
    await pool.query(
      'UPDATE works SET favorite_count = (SELECT COUNT(*) FROM work_favorites WHERE work_id = ?) WHERE id = ?',
      [work_id, work_id]
    );
    res.json({ message: '收藏作品成功' });
  } catch (err) {
    next(err);
  }
});

// 取消收藏作品
router.delete('/favorite/:workId', authenticateToken, async (req, res, next) => {
  try {
    const { workId } = req.params;
    await pool.query('DELETE FROM work_favorites WHERE user_id = ? AND work_id = ?', [req.user.userId, workId]);
    await pool.query(
      'UPDATE works SET favorite_count = (SELECT COUNT(*) FROM work_favorites WHERE work_id = ?) WHERE id = ?',
      [workId, workId]
    );
    res.json({ message: '已取消收藏作品' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
