export async function getNotificationsByUser(req, res) {
  return res.status(200).json([]);
}

export async function markNotificationRead(req, res) {
  return res.status(200).json({
    message: "Notification read not implemented in skeleton yet.",
    id: req.params.id,
  });
}

