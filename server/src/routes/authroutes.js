import express from "express";
import { protect } from "../middleware/auth.js";
import { login, me, register, init, refresh, logout } from "../controllers/authcontroller.js";
import { validateRegisterInput } from "../middleware/validate.js";

const router = express.Router();

router.get("/register/init", init);
router.post("/register", validateRegisterInput, register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", protect, me);

export default router;

