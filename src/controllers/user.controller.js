function createUserController({ userService }) {
  return {
    async getByUsername(req, res) {
      res.json(await userService.getPublicProfile(req.validated.params.username));
    },
  };
}

module.exports = { createUserController };
