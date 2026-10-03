const { supabase: rawSupabase, isSupabaseConfigured } = require('../config/supabase');
const localStore = require('../data/localStore');

let cloudAvailable = false; // By default assume local first if DNS failed
let hasLoggedCloudStatus = false;

class ResilientQuery {
  constructor(table) {
    this.table = table;
    this.calls = [];
  }

  select(...args) {
    this.calls.push({ method: 'select', args });
    return this;
  }

  insert(...args) {
    this.calls.push({ method: 'insert', args });
    return this;
  }

  upsert(...args) {
    this.calls.push({ method: 'upsert', args });
    return this;
  }

  update(...args) {
    this.calls.push({ method: 'update', args });
    return this;
  }

  delete(...args) {
    this.calls.push({ method: 'delete', args });
    return this;
  }

  eq(...args) {
    this.calls.push({ method: 'eq', args });
    return this;
  }

  neq(...args) {
    this.calls.push({ method: 'neq', args });
    return this;
  }

  in(...args) {
    this.calls.push({ method: 'in', args });
    return this;
  }

  is(...args) {
    this.calls.push({ method: 'is', args });
    return this;
  }

  gt(...args) {
    this.calls.push({ method: 'gt', args });
    return this;
  }

  gte(...args) {
    this.calls.push({ method: 'gte', args });
    return this;
  }

  lt(...args) {
    this.calls.push({ method: 'lt', args });
    return this;
  }

  lte(...args) {
    this.calls.push({ method: 'lte', args });
    return this;
  }

  ilike(...args) {
    this.calls.push({ method: 'ilike', args });
    return this;
  }

  or(...args) {
    this.calls.push({ method: 'or', args });
    return this;
  }

  order(...args) {
    this.calls.push({ method: 'order', args });
    return this;
  }

  range(...args) {
    this.calls.push({ method: 'range', args });
    return this;
  }

  limit(...args) {
    this.calls.push({ method: 'limit', args });
    return this;
  }

  single(...args) {
    this.calls.push({ method: 'single', args });
    return this;
  }

  maybeSingle(...args) {
    this.calls.push({ method: 'maybeSingle', args });
    return this;
  }

  executeLocal() {
    let builder = localStore.from(this.table);
    for (const call of this.calls) {
      if (typeof builder[call.method] === 'function') {
        builder = builder[call.method](...call.args);
      }
    }
    return builder.execute();
  }

  async execute() {
    // If Supabase is not configured or cloud is known to be unavailable, execute local immediately
    if (!isSupabaseConfigured() || !rawSupabase || cloudAvailable === false) {
      return this.executeLocal();
    }

    try {
      let query = rawSupabase.from(this.table);
      for (const call of this.calls) {
        if (typeof query[call.method] === 'function') {
          query = query[call.method](...call.args);
        }
      }

      const res = await query;
      if (res.error) {
        const msg = String(res.error.message || '');
        if (msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
          cloudAvailable = false;
          if (!hasLoggedCloudStatus) {
            console.log('⚡ Supabase is paused/unreachable. Switched to high-speed persistent Local Store.');
            hasLoggedCloudStatus = true;
          }
          return this.executeLocal();
        }
      }
      return res;
    } catch (err) {
      const msg = String(err.message || '');
      if (msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
        cloudAvailable = false;
        if (!hasLoggedCloudStatus) {
          console.log('⚡ Supabase is paused/unreachable. Switched to high-speed persistent Local Store.');
          hasLoggedCloudStatus = true;
        }
      }
      return this.executeLocal();
    }
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

const supabaseProxy = {
  from(tableName) {
    return new ResilientQuery(tableName);
  },
  auth: rawSupabase ? rawSupabase.auth : {}
};

/**
 * Convert string from camelCase to snake_case
 */
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert string from snake_case to camelCase
 */
function snakeToCamel(str) {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Recursively convert object keys to snake_case
 */
function toSnakeCase(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (typeof obj !== 'object' || obj instanceof Date) return obj;

  const newObj = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '_id') {
      newObj['id'] = value;
    } else {
      const snakeKey = camelToSnake(key);
      newObj[snakeKey] = (typeof value === 'object' && value !== null && !(value instanceof Date) && !Array.isArray(value)) 
        ? toSnakeCase(value) 
        : (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' ? value.map(toSnakeCase) : value);
    }
  }
  return newObj;
}

/**
 * Recursively convert object keys to camelCase & attach _id = id for backward compatibility
 */
function toCamelCase(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (typeof obj !== 'object' || obj instanceof Date) return obj;

  const newObj = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    newObj[camelKey] = (typeof value === 'object' && value !== null && !(value instanceof Date) && !Array.isArray(value))
      ? toCamelCase(value)
      : (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' ? value.map(toCamelCase) : value);
  }

  // Ensure both id and _id exist for maximum compatibility
  if (newObj.id && !newObj._id) {
    newObj._id = newObj.id;
  }
  return newObj;
}

module.exports = {
  supabase: supabaseProxy,
  isSupabaseConfigured,
  camelToSnake,
  snakeToCamel,
  toSnakeCase,
  toCamelCase
};
