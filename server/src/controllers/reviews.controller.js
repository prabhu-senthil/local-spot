export async function createReview(req, res) {
  return res.status(501).json({
    message: "Review creation not implemented in skeleton yet.",
    input: req.body,
  });
}

export async function getReviewsByVenue(req, res) {
  return res.status(200).json([]);
}

