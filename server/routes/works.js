const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 配置上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.env.UPLOAD_DIR || 'uploads', 'works');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('仅允许上传图片文件'));
    }
  }
});

// 获取当前用户的作品
router.get('/my', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT w.*, p.name as pattern_name
       FROM works w
       LEFT JOIN patterns p ON w.pattern_id = p.id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// 上传作品
router.post('/', authenticateToken, upload.single('image'), async (req, res, next) => {
  try {
    const { title, description, pattern_id, is_public } = req.body;
    if (!title || !req.file) {
      return res.status(400).json({ message: '标题和图片为必填项' });
    }

    const imageUrl = `/uploads/works/${req.file.filename}`;
    const [result] = await pool.query(
      'INSERT INTO works (user_id, pattern_id, title, description, image_url, is_public) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.userId, pattern_id || null, title, description, imageUrl, is_public === 'true' || is_public === true]
    );

    res.status(201).json({ id: result.insertId, image_url: imageUrl, message: '作品上传成功' });
  } catch (err) {
    next(err);
  }
});

// 删除作品
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT image_url FROM works WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.user.userId
    ]);
    if (rows.length > 0) {
      const filePath = path.join(process.env.UPLOAD_DIR || 'uploads', rows[0].image_url.replace('/uploads/', ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await pool.query('DELETE FROM works WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    res.json({ message: '作品已删除' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
