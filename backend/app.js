require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const connectDB = require("./config/db");

// routes
const authRoutes = require("./routes/auth.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const settingsRoutes = require("./routes/settings.routes");
const forgotPasswordRoutes = require("./routes/forgot-password.routes");

// Connect to MongoDB
connectDB();

const app = express();

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change_this_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      maxAge: parseInt(process.env.SESSION_MAX_AGE_MS) || 1800000,
    },
  }),
);

// API routes
app.use("/auth", authRoutes);
app.use("/auth/forgot-password", forgotPasswordRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/settings", settingsRoutes);

// Serve static frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Fallback: send index.html for any unmatched route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

//  Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`EduTrack server running on http://localhost:${PORT}`);
});
