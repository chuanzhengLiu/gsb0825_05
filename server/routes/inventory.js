const express = require('express');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取当前用户库存
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, mt.name as material_name, mt.category, mt.unit, mt.default_low_stock
       FROM inventory i
       JOIN material_types mt ON i.material_type_id = mt.id
       WHERE i.user_id = ?
       ORDER BY mt.category, mt.name`,
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// 获取低库存预警
router.get('/alerts', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, mt.name as material_name, mt.category, mt.unit
       FROM inventory i
       JOIN material_types mt ON i.material_type_id = mt.id
       WHERE i.user_id = ? AND i.quantity <= i.low_stock_threshold`,
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// 添加/更新库存
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { material_type_id, quantity, low_stock_threshold, notes } = req.body;
    if (!material_type_id || quantity === undefined) {
      return res.status(400).json({ message: '缺少材料类型或数量' });
    }

    await pool.query(
      `INSERT INTO inventory (user_id, material_type_id, quantity, low_stock_threshold, notes)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       quantity = VALUES(quantity),
       low_stock_threshold = VALUES(low_stock_threshold),
       notes = VALUES(notes)`,
      [req.user.userId, material_type_id, quantity, low_stock_threshold || 0, notes]
    );

    const [rows] = await pool.query(
      `SELECT i.*, mt.name as material_name, mt.category, mt.unit
       FROM inventory i
       JOIN material_types mt ON i.material_type_id = mt.id
       WHERE i.user_id = ? AND i.material_type_id = ?`,
      [req.user.userId, material_type_id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// 删除库存记录
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM inventory WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    res.json({ message: '库存记录已删除' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
