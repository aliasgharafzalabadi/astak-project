function toOffset({ page, limit }) {
  return { limit, offset: (page - 1) * limit };
}

function toPaginatedResponse({ items, total }, { page, limit }) {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

module.exports = { toOffset, toPaginatedResponse };
