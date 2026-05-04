export function blockReviewers(req, res, next) {
  if (req.user && req.user.status === "blocked") {
    return res.status(403).json({
      message:
        "Your account has been blocked due to a low reviewer trust score. " +
        "You cannot submit new reviews. Please contact support.",
    });
  }
  next();
}
