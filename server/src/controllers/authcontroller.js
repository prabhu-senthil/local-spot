import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Role from "../models/roles.js";

function generateAccessToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user._id.toString() },
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function register(req, res, _next) {
  console.log("Registering user with data:", req.body);
  const { name, email, password, role } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide name, email, and password." });
    }

    const emailLower = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: emailLower });
    if (existing) return res.status(400).json({ message: "User already exists." });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const validRoles = ["user", "reviewer", "admin", "owner"];
    const assignedRole = validRoles.includes(role) ? role : "user";

    const user = await User.create({
      name: String(name).trim(),
      email: emailLower,
      passwordHash,
      role: assignedRole,
      reviewsCount: 0,
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refreshToken", refreshToken, cookieOptions);

    return res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: accessToken,
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

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refreshToken", refreshToken, cookieOptions);

    return res.status(200).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: accessToken,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function me(req, res) {
  // req.user is already populated by the protect middleware (excluding passwordHash)
  // Return a clean shape that includes trust fields for the frontend
  return res.status(200).json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    reviewerTrustScore: req.user.reviewerTrustScore ?? 0,
    status: req.user.status ?? "active",
    reviewsCount: req.user.reviewsCount ?? 0,
  });
}

export async function init(req, res) {
  try {
    const roleDoc = await Role.findOne();
    if (!roleDoc || !roleDoc.roles) {
      return res.status(200).json({ roles: ["user", "reviewer", "admin", "owner"] });
    }
    let rawRoles = roleDoc.roles;
    // Inject 'Reviewer' if missing from database
    if (!rawRoles.some(r => r.toLowerCase() === 'reviewer')) {
      rawRoles.push('Reviewer');
    }

    const mappedRoles = rawRoles.map(r => {
      const lower = r.toLowerCase();
      if (lower === "restaurant-owner" || lower === "restaurant_owner") return "owner";
      return lower.replace("-", "_");
    });
    return res.status(200).json({ roles: mappedRoles, displayRoles: rawRoles });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return res.status(500).json({ message: "Server error fetching roles" });
  }
}

export async function refresh(req, res) {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found" });

    const newAccessToken = generateAccessToken(user);
    return res.json({ token: newAccessToken });
  } catch (err) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
}

export async function logout(req, res) {
  res.clearCookie("refreshToken", cookieOptions);
  return res.status(200).json({ message: "Logged out successfully" });
}


