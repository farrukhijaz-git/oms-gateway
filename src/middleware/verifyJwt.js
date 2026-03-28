'use strict';

const jwt = require('jsonwebtoken');

/**
 * JWT verification middleware.
 *
 * Skipped for:
 *   - Any path beginning with /auth/
 *   - The /health endpoint
 *
 * On success sets req.user = decoded JWT payload and calls next().
 * On failure responds immediately with a 401 JSON error.
 */
function verifyJwt(req, res, next) {
  // Public routes — skip verification entirely
  if (req.path === '/health' || req.path.startsWith('/auth/')) {
    return next();
  }

  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }
}

module.exports = verifyJwt;
