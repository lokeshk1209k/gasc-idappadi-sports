// ============================================================================
// 🚀 HIGH-CONCURRENCY IN-MEMORY MICRO-CACHE MIDDLEWARE (10,000+ USER OPTIMIZATION)
// ============================================================================

const cacheStore = new Map();

/**
 * Middleware to cache GET API responses in memory to handle 10,000+ concurrent requests
 * @param {number} ttlSeconds Time-to-live for cache entry in seconds (default: 15s)
 */
const apiCache = (ttlSeconds = 15) => {
  return (req, res, next) => {
    // Automatically invalidate on mutations
    if (req.method !== 'GET') {
      const urlPart = (req.baseUrl || req.originalUrl || req.url || '').split('?')[0];
      invalidateCache(urlPart);
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
 * Invalidate cache matching pattern (used when competitions/sports/news/roster are updated)
 */
const invalidateCache = (urlPattern) => {
  if (!urlPattern) return;
  const pattern = urlPattern.toLowerCase();
  for (const key of cacheStore.keys()) {
    const k = key.toLowerCase();
    if (
      k.includes(pattern) ||
      (pattern.includes('roster') && k.includes('roster')) ||
      (pattern.includes('analytics') && k.includes('analytics')) ||
      (pattern.includes('player') && k.includes('player')) ||
      (pattern.includes('equipment') && k.includes('equipment')) ||
      (pattern.includes('competition') && k.includes('competition'))
    ) {
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

/**
 * Global mutation watcher to automatically invalidate cache
 */
const autoInvalidateMiddleware = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        const urlBase = (req.baseUrl || req.path || '').toLowerCase();
        invalidateCache(urlBase);
        // If anything mutates roster/players/comps/teams/equipment, also invalidate analytics
        invalidateCache('analytics');
      }
      return originalJson(data);
    };
  }
  next();
};

module.exports = {
  apiCache,
  invalidateCache,
  clearCache,
  autoInvalidateMiddleware
};

