require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Uploads directory
const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patterns', require('./routes/patterns'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/timers', require('./routes/timers'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/works', require('./routes/works'));
app.use('/api/social', require('./routes/social'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: '接口不存在' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || '服务器内部错误' });
});

module.exports = app;
