const { notFound } = require('../lib/errors');

function createUserService({ userRepository }) {
  return {
    async getPublicProfile(username) {
      const user = await userRepository.findByUsername(username);
      if (!user) {
        throw notFound('User not found', 'USER_NOT_FOUND');
      }
      return { id: user.id, username: user.username, fullName: user.fullName };
    },
  };
}

module.exports = { createUserService };
