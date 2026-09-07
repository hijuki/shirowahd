const userCache = new Map();
const groupCache = new Map();
const settingCache = new Map();
const messageDebounce = new Map();
const DEBOUNCE_MS = 100;
let _lastDebounceClean = 0;

function debounceMessage(key) {
  const now = Date.now();
  const last = messageDebounce.get(key);
  if (last && (now - last) < DEBOUNCE_MS) return true;
  messageDebounce.set(key, now);
  if (messageDebounce.size > 1000 && (now - _lastDebounceClean) > 5000) {
    _lastDebounceClean = now;
    const cutoff = now - DEBOUNCE_MS * 2;
    for (const [k, v] of messageDebounce) {
      if (v < cutoff) messageDebounce.delete(k);
    }
  }
  return false;
}

function getCachedUser(jid, db, ttl = 300000) {
  const cached = userCache.get(jid);
  if (cached && (Date.now() - cached.time) < ttl) return cached.data;
  const data = db.getUser(jid);
  userCache.set(jid, { data, time: Date.now() });
  return data;
}

function getCachedGroup(jid, db, ttl = 300000) {
  const cached = groupCache.get(jid);
  if (cached && (Date.now() - cached.time) < ttl) return cached.data;
  const data = db.getGroup(jid);
  groupCache.set(jid, { data, time: Date.now() });
  return data;
}

function getCachedSetting(key, getter, ttl = 60000) {
  const cached = settingCache.get(key);
  if (cached && (Date.now() - cached.time) < ttl) return cached.data;
  const data = typeof getter === 'function' ? getter() : getter;
  settingCache.set(key, { data, time: Date.now() });
  return data;
}

export { debounceMessage, getCachedUser, getCachedGroup, getCachedSetting };
