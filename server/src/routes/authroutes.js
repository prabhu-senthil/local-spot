import express from "express";
import { protect } from "../middleware/auth.js";
import { login, me, register } from "../controllers/authcontroller.js";

const router = express.Router();

router.post("/register", register);
// router.post("/register", (req, res) => {
//   res.json({ message: 'User created' });
// });
router.post("/login", login);
router.get("/me", protect, me);

export default router;

