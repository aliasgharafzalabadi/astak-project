const toUser = (row) =>
  row && {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };

function createUserRepository(db) {
  return {
    async create({ username, passwordHash, fullName, role = 'USER' }, executor = db) {
      const { rows } = await executor.query(
        `INSERT INTO users (username, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, full_name, role, password_hash, created_at`,
        [username, passwordHash, fullName, role],
      );
      return toUser(rows[0]);
    },

    async findByUsername(username, executor = db) {
      const { rows } = await executor.query(
        `SELECT id, username, full_name, role, password_hash, created_at
         FROM users
         WHERE username = $1`,
        [username],
      );
      return toUser(rows[0]) || null;
    },

    async findById(id, executor = db) {
      const { rows } = await executor.query(
        `SELECT id, username, full_name, role, password_hash, created_at
         FROM users
         WHERE id = $1`,
        [id],
      );
      return toUser(rows[0]) || null;
    },
  };
}

module.exports = { createUserRepository };
