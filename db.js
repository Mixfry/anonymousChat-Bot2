import Database from 'better-sqlite3';

const db = new Database('all.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    user_id TEXT,
    guild_id TEXT,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    message_count INTEGER DEFAULT 0,
    image_count INTEGER DEFAULT 0,
    last_daily_timestamp INTEGER DEFAULT 0,
    daily_count INTEGER DEFAULT 0,
    last_hourly_timestamp INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, guild_id)
  )
`).run();

export function getUser(userId, guildId) {
  let user = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  if (!user) {
    db.prepare('INSERT INTO users (user_id, guild_id) VALUES (?, ?)').run(userId, guildId);
    user = db.prepare('SELECT * FROM users WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
  }
  return user;
}

export function updateUser(user) {
  db.prepare(`
    UPDATE users 
    SET xp = ?, level = ?, message_count = ?, image_count = ?, 
        last_daily_timestamp = ?, daily_count = ?, last_hourly_timestamp = ?
    WHERE user_id = ? AND guild_id = ?
  `).run(
    user.xp, user.level, user.message_count, user.image_count,
    user.last_daily_timestamp, user.daily_count, user.last_hourly_timestamp,
    user.user_id, user.guild_id
  );
}

export function getTopUsers(guildId, limit = 3) {
  return db.prepare('SELECT xp, level FROM users WHERE guild_id = ? ORDER BY xp DESC LIMIT ?').all(guildId, limit);
}

export function getUserRank(userId, guildId) {
  const allUsers = db.prepare('SELECT user_id, xp FROM users WHERE guild_id = ? ORDER BY xp DESC').all(guildId);
  const rank = allUsers.findIndex(user => user.user_id === userId);
  return rank !== -1 ? rank + 1 : -1;
}

//レベルはポンポン上がる方が楽しいよね
export function getXpForLevel(level) {
  return 5 * (level ** 2) + 50 * level + 100;
}