const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// 获取材料类型列表
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM material_types ORDER BY category, name');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
