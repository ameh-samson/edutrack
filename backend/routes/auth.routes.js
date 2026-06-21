const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { loginLimiter, registerLimiter } = require("../middleware/rateLimiter");
const {
  registerValidation,
  loginValidation,
  handleValidationErrors,
} = require("../middleware/validate");

const router = express.Router();

// Generated once at startup — timing-safe dummy for login when email not found
const DUMMY_HASH = bcrypt.hashSync("timing-safe-dummy-password", 12);

// /auth/me 
router.get("/me", (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({ loggedIn: true });
  }
  return res.json({ loggedIn: false });
});


// auth/register
router.post(
  "/register",
  registerLimiter,
  registerValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        fullName,
        email,
        phone,
        matricNumber,
        department,
        level,
        dateOfBirth,
        gender,
        password,
      } = req.body;

      // Check for existing email or matric number
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          errors: { email: "This email address is already registered." },
        });
      }

      const existingMatric = await User.findOne({ matricNumber });
      if (existingMatric) {
        return res.status(409).json({
          success: false,
          errors: {
            matricNumber: "This matric/student ID is already registered.",
          },
        });
      }

      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const user = new User({
        fullName,
        email: email.toLowerCase(),
        phone,
        matricNumber,
        department,
        level,
        dateOfBirth: new Date(dateOfBirth),
        gender: gender || "",
        passwordHash,
      });

      await user.save();

      return res.status(201).json({
        success: true,
        message: "Registration successful. You can now log in.",
      });
    } catch (err) {
      console.error("Register error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Server error. Please try again." });
    }
  },
);

// /auth/login
router.post(
  "/login",
  loginLimiter,
  loginValidation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password, rememberMe } = req.body;

      const genericError = "Invalid email or password.";

      const user = await User.findOne({ email: email.toLowerCase() });

      // Always run bcrypt compare to prevent timing attacks
      const hashToCompare = user ? user.passwordHash : DUMMY_HASH;
      const isMatch = await bcrypt.compare(password, hashToCompare);

      if (!user || !isMatch) {
        return res.status(401).json({ success: false, message: genericError });
      }

      // Set session duration based on Remember me
      if (rememberMe) {
        req.session.cookie.maxAge =
          parseInt(process.env.REMEMBER_ME_MAX_AGE_MS) || 2592000000;
      } else {
        req.session.cookie.maxAge =
          parseInt(process.env.SESSION_MAX_AGE_MS) || 1800000;
      }

      req.session.userId = user._id.toString();

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      return res.json({
        success: true,
        message: "Login successful.",
        redirect: "/dashboard.html",
      });
    } catch (err) {
      console.error("Login error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Server error. Please try again." });
    }
  },
);

// /auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destroy error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Logout failed." });
    }
    res.clearCookie("connect.sid");
    return res.json({ success: true, redirect: "/index.html" });
  });
});

module.exports = router;
