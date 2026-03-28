'use strict';

const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const proxy = require('express-http-proxy');

const verifyJwt = require('./middleware/verifyJwt');

const app = express();

// ---------------------------------------------------------------------------
// Request logging
// ---------------------------------------------------------------------------
app.use(morgan('combined'));

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------
app.use(helmet());

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN,
    credentials: true,
  })
);

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------
app.use(express.json());

// ---------------------------------------------------------------------------
// Rate limiting — 100 requests per 15 minutes per IP
// ---------------------------------------------------------------------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,  // Return rate-limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
});

app.use(limiter);

// ---------------------------------------------------------------------------
// JWT verification (skips /auth/* and /health automatically)
// ---------------------------------------------------------------------------
app.use(verifyJwt);

// ---------------------------------------------------------------------------
// Health check (no auth required — verifyJwt skips /health)
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'gateway',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Helper: build a proxyReqOptDecorator that injects user headers when present
// The /auth route allows anonymous requests so req.user may be undefined there.
// All other routes require auth, so req.user is guaranteed to be set.
// ---------------------------------------------------------------------------
function injectUserHeaders(proxyReqOpts, srcReq) {
  if (srcReq.user) {
    proxyReqOpts.headers['X-User-Id'] = String(srcReq.user.user_id);
    proxyReqOpts.headers['X-User-Role'] = String(srcReq.user.role);
  }
  return proxyReqOpts;
}

// ---------------------------------------------------------------------------
// Proxy routes
// ---------------------------------------------------------------------------

// /auth/* → AUTH_SERVICE_URL  (JWT optional — login/register endpoints live here)
app.use(
  '/auth',
  proxy(process.env.AUTH_SERVICE_URL, {
    proxyReqPathResolver: (req) => '/auth' + req.url,
    proxyReqOptDecorator: injectUserHeaders,
  })
);

// /admin/* → AUTH_SERVICE_URL  (admin endpoints also handled by auth service)
app.use(
  '/admin',
  proxy(process.env.AUTH_SERVICE_URL, {
    proxyReqPathResolver: (req) => '/admin' + req.url,
    proxyReqOptDecorator: injectUserHeaders,
  })
);

// /orders/* → ORDERS_SERVICE_URL
app.use(
  '/orders',
  proxy(process.env.ORDERS_SERVICE_URL, {
    proxyReqPathResolver: (req) => '/orders' + req.url,
    proxyReqOptDecorator: injectUserHeaders,
  })
);

// /labels/* → LABEL_SERVICE_URL
app.use(
  '/labels',
  proxy(process.env.LABEL_SERVICE_URL, {
    proxyReqPathResolver: (req) => '/labels' + req.url,
    proxyReqOptDecorator: injectUserHeaders,
  })
);

// /walmart/* → WALMART_SERVICE_URL
app.use(
  '/walmart',
  proxy(process.env.WALMART_SERVICE_URL, {
    proxyReqPathResolver: (req) => '/walmart' + req.url,
    proxyReqOptDecorator: injectUserHeaders,
  })
);

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[gateway] Unhandled error:', err.message || err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

module.exports = app;
