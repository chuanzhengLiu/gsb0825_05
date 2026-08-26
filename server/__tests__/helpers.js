const jwt = require('jsonwebtoken');

// Build a Bearer auth header for a given user id (JWT_SECRET set in setup.js).
function authHeader(user = { userId: 1, email: 'demo@flytie.atlas', nickname: '飞钓达人' }) {
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
  return `Bearer ${token}`;
}

module.exports = { authHeader };
