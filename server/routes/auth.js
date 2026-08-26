const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 注册
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, nickname } = req.body;
    if (!email || !password || !nickname) {
      return res.status(400).json({ message: '请填写邮箱、密码和昵称' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: '该邮箱已被注册' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, nickname) VALUES (?, ?, ?)',
      [email, passwordHash, nickname]
    );

    const token = jwt.sign({ userId: result.insertId, email, nickname }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: result.insertId, email, nickname }
    });
  } catch (err) {
    next(err);
  }
});

// 登录
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: '请填写邮箱和密码' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, nickname: user.nickname },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        bio: user.bio
      }
    });
  } catch (err) {
    next(err);
  }
});

// 获取当前用户
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, email, nickname, avatar_url, bio, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: '用户不存在' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// 更新个人资料
router.patch('/me', authenticateToken, async (req, res, next) => {
  try {
    const { nickname, bio, avatar_url } = req.body;
    await pool.query(
      'UPDATE users SET nickname = ?, bio = ?, avatar_url = ? WHERE id = ?',
      [nickname, bio, avatar_url, req.user.userId]
    );
    const [rows] = await pool.query(
      'SELECT id, email, nickname, avatar_url, bio FROM users WHERE id = ?',
      [req.user.userId]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
