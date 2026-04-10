'use strict';

const jwt = require('jsonwebtoken');

/**
 * JWT verification middleware.
 *
 * Skipped for:
 *   - Any path beginning with /auth/
 *   - The /health endpoint
 *
 * Internal service-to-service calls (e.g. label service → orders service via
 * gateway) bypass JWT by presenting the X-Internal-Secret header. The secret
 * must match the INTERNAL_SERVICE_SECRET env var. On match, req.user is
 * populated from the X-User-Id and X-User-Role headers sent by the caller.
 *
 * On success sets req.user = decoded JWT payload (or internal user) and calls next().
 * On failure responds immediately with a 401 JSON error.
 */
function verifyJwt(req, res, next) {
  // Public routes — skip verification entirely
  if (req.path === '/health' || req.path.startsWith('/auth/')) {
    return next();
  }

  // Internal service-to-service auth — bypass JWT when secret matches
  const internalSecret = req.headers['x-internal-secret'];
  if (internalSecret) {
    const expectedSecret = process.env.INTERNAL_SERVICE_SECRET;
    if (!expectedSecret) {
      return res.status(500).json({
        error: { code: 'CONFIG_ERROR', message: 'INTERNAL_SERVICE_SECRET not configured' },
      });
    }
    if (internalSecret !== expectedSecret) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid internal service secret' },
      });
    }
    // Trust the X-User-Id / X-User-Role headers sent by the internal caller
    req.user = {
      user_id: req.headers['x-user-id'] || '00000000-0000-0000-0000-000000000000',
      role:    req.headers['x-user-role'] || 'admin',
    };
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
