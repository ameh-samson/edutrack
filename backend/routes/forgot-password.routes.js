const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");

const router = express.Router();

// In-memory token store: { token -> { userId, expiresAt } }
// Fine for a prototype; a production system would use a DB collection.
const resetTokens = new Map();

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

// /auth/forgot-password/verify
// Verifies email + matric number. Returns a short-lived reset token.
router.post("/verify", async (req, res) => {
  try {
    const { email, matricNumber } = req.body;

    if (!email || !matricNumber) {
      return res.status(422).json({
        success: false,
        errors: {
          ...(!email && { email: "Email is required." }),
          ...(!matricNumber && { matricNumber: "Matric number is required." }),
        },
      });
    }

    // Look up by both email AND matric — both must match the same document
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      matricNumber: matricNumber.trim(),
    });

    // Generic response — don't reveal whether email or matric was wrong
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found matching those details.",
      });
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");
    resetTokens.set(token, {
      userId: user._id.toString(),
      expiresAt: Date.now() + TOKEN_TTL_MS,
    });

    return res.json({
      success: true,
      token,
      message: "Identity verified. You may now set a new password.",
    });
  } catch (err) {
    console.error("Forgot password verify error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─── POST /auth/forgot-password/reset ────────────────────────────
// Accepts the token + new password, updates the hash.
router.post("/reset", async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing reset token.",
      });
    }

    const record = resetTokens.get(token);

    if (!record || Date.now() > record.expiresAt) {
      resetTokens.delete(token);
      return res.status(400).json({
        success: false,
        message: "Reset token has expired. Please start over.",
      });
    }

    // Validate password
    const errors = {};
    if (!password) {
      errors.newPassword = "Password is required.";
    } else if (password.length < 8) {
      errors.newPassword = "Password must be at least 8 characters.";
    } else if (!/[A-Z]/.test(password)) {
      errors.newPassword = "Must contain at least one uppercase letter.";
    } else if (!/[a-z]/.test(password)) {
      errors.newPassword = "Must contain at least one lowercase letter.";
    } else if (!/[0-9]/.test(password)) {
      errors.newPassword = "Must contain at least one number.";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ success: false, errors });
    }

    const user = await User.findById(record.userId);
    if (!user) {
      resetTokens.delete(token);
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();

    // Invalidate the token immediately after use
    resetTokens.delete(token);

    return res.json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (err) {
    console.error("Forgot password reset error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
