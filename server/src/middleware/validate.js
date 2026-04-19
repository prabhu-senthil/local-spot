export function validateRegisterInput(req, res, next) {
  const { name, email, password, role } = req.body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ message: "Valid name is required." });
  }

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ message: "Valid email is required." });
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long." });
  }

  // We don't strictly require a role since it defaults to 'user' in the DB schema,
  // but if provided, we should ensure it's a string.
  if (role && typeof role !== "string") {
    return res.status(400).json({ message: "Role must be a string." });
  }

  next();
}

export function validateReviewInput(req, res, next) {
  const { rating, reviewText, crowdLevel } = req.body;

  if (rating === undefined || typeof rating !== "number" || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be a number between 1 and 5." });
  }

  if (reviewText !== undefined && typeof reviewText !== "string") {
    return res.status(400).json({ message: "Review text must be a string." });
  }

  const validCrowdLevels = ["quiet", "moderate", "busy"];
  if (!crowdLevel || !validCrowdLevels.includes(crowdLevel)) {
    return res.status(400).json({ message: "Crowd level must be one of: quiet, moderate, busy." });
  }

  next();
}

export function validateCrowdReportInput(req, res, next) {
  const { venueId, status } = req.body;

  if (!venueId || typeof venueId !== "string") {
    return res.status(400).json({ message: "Valid venueId is required." });
  }

  const validStatuses = ["busy", "quiet"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Status must be either "busy" or "quiet".' });
  }

  next();
}
