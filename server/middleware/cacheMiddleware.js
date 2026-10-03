// ============================================================================
// 🚀 HIGH-CONCURRENCY IN-MEMORY MICRO-CACHE MIDDLEWARE (10,000+ USER OPTIMIZATION)
// ============================================================================

const cacheStore = new Map();

/**
 * Middleware to cache GET API responses in memory to handle 10,000+ concurrent requests
 * @param {number} ttlSeconds Time-to-live for cache entry in seconds (default: 20s)
 */
const apiCache = (ttlSeconds = 20) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Include auth token or user id if available in key
    const authHeader = req.headers.authorization || '';
    const cacheKey = `${req.originalUrl || req.url}_${authHeader.slice(-15)}`;

    const cachedEntry = cacheStore.get(cacheKey);
    const now = Date.now();

    if (cachedEntry && now < cachedEntry.expiresAt) {
      res.setHeader('X-Cache', 'HIT-MICROCACHE');
      res.setHeader('Content-Type', 'application/json');
      return res.send(cachedEntry.body);
    }

    // Intercept res.send / res.json to store in cache
    const originalSend = res.send.bind(res);
    res.send = (body) => {
      if (res.statusCode === 200 && body) {
        cacheStore.set(cacheKey, {
          body,
          expiresAt: now + ttlSeconds * 1000
        });
      }
      return originalSend(body);
    };

    res.setHeader('X-Cache', 'MISS');
    next();
  };
};

/**
 * Invalidate cache matching pattern (used when competitions/sports/news are updated)
 */
const invalidateCache = (urlPattern) => {
  for (const key of cacheStore.keys()) {
    if (key.includes(urlPattern)) {
      cacheStore.delete(key);
    }
  }
};

/**
 * Clear full cache
 */
const clearCache = () => {
  cacheStore.clear();
};

module.exports = {
  apiCache,
  invalidateCache,
  clearCache
};
