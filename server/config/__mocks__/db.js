// Manual Jest mock for the MySQL pool. Route modules `require('../config/db')`
// and call `pool.query(...)`; tests drive `pool.query.mockResolvedValueOnce(...)`.
const query = jest.fn();
const end = jest.fn();

module.exports = { query, end };
