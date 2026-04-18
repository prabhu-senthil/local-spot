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
