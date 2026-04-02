import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

function generateToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
}

export async function register(req, res, _next) {
  console.log("Registering user with data:", req.body);
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide name, email, and password." });
    }

    const emailLower = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: emailLower });
    if (existing) return res.status(400).json({ message: "User already exists." });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: String(name).trim(),
      email: emailLower,
      passwordHash,
      role: "user",
      reviewsCount: 0,
    });

    const token = generateToken(user);
    return res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function login(req, res, _next) {
  console.log("Registering user with data:", req.body);
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password." });
    }

    const emailLower = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: emailLower });
    if (!user) return res.status(401).json({ message: "Invalid email or password." });

    const ok = await user.matchPassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid email or password." });

    const token = generateToken(user);
    return res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function me(req, res) {
  return res.status(200).json(req.user);
}

