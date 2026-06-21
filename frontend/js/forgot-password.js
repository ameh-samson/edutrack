/**
 * forgot-password.js
 * Two-step flow:
 *  Step 1 — verify email + matric number (POST /auth/forgot-password/verify)
 *  Step 2 — set new password            (POST /auth/forgot-password/reset)
 */

document.addEventListener("DOMContentLoaded", () => {
  const stepRequest = document.getElementById("step-request");
  const stepReset = document.getElementById("step-reset");

  /* ── Utilities ──────────────────────────────────────────────── */
  function setFieldError(id, msg) {
    const el = document.getElementById(id);
    const errEl = document.getElementById(id + "-error");
    if (el) el.classList.toggle("error", !!msg);
    if (errEl) errEl.textContent = msg || "";
  }

  function setAlert(el, msg, type = "error") {
    if (!el) return;
    el.textContent = msg;
    el.className = `alert alert--${type}`;
    el.classList.toggle("hidden", !msg);
  }

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  /* ── Password show/hide toggles ─────────────────────────────── */
  document.querySelectorAll(".input-wrapper__toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.closest(".input-wrapper")?.querySelector("input");
      if (!input) return;
      const isText = input.type === "text";
      input.type = isText ? "password" : "text";
      btn.setAttribute(
        "aria-label",
        isText ? "Show password" : "Hide password",
      );
      btn.querySelector(".icon-eye").style.display = isText ? "block" : "none";
      btn.querySelector(".icon-eye-off").style.display = isText
        ? "none"
        : "block";
    });
  });

  /* ── Step 1: Verify identity ────────────────────────────────── */
  const requestForm = document.getElementById("request-form");
  const requestAlert = document.getElementById("request-alert");

  requestForm &&
    requestForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      setAlert(requestAlert, "");
      setFieldError("email", "");
      setFieldError("matricNumber", "");

      const email = val("email");
      const matricNumber = val("matricNumber");

      let hasErr = false;
      if (!email) {
        setFieldError("email", "Email is required.");
        hasErr = true;
      }
      if (!matricNumber) {
        setFieldError("matricNumber", "Matric number is required.");
        hasErr = true;
      }
      if (hasErr) return;

      const btn = requestForm.querySelector("[type=submit]");
      btn.classList.add("btn--loading");
      btn.disabled = true;

      const { ok, data } = await API.post("/auth/forgot-password/verify", {
        email,
        matricNumber,
      });

      btn.classList.remove("btn--loading");
      btn.disabled = false;

      if (ok && data?.success) {
        // Store token temporarily in memory (not localStorage for security)
        requestForm.dataset.token = data.token;
        stepRequest.style.display = "none";
        stepReset.style.display = "";
        return;
      }

      if (data?.errors) {
        Object.entries(data.errors).forEach(([f, m]) => setFieldError(f, m));
      } else {
        setAlert(
          requestAlert,
          data?.message || "Verification failed. Please check your details.",
        );
      }
    });

  /* ── Step 2: Reset password ─────────────────────────────────── */
  const resetForm = document.getElementById("reset-form");
  const resetAlert = document.getElementById("reset-alert");

  resetForm &&
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      setAlert(resetAlert, "");
      setFieldError("newPassword", "");
      setFieldError("confirmPassword", "");

      const newPassword = document.getElementById("newPassword")?.value || "";
      const confirmPassword =
        document.getElementById("confirmPassword")?.value || "";
      const token = requestForm?.dataset.token || "";

      let hasErr = false;
      if (!newPassword) {
        setFieldError("newPassword", "Password is required.");
        hasErr = true;
      } else if (newPassword.length < 8) {
        setFieldError("newPassword", "Password must be at least 8 characters.");
        hasErr = true;
      } else if (!/[A-Z]/.test(newPassword)) {
        setFieldError(
          "newPassword",
          "Must contain at least one uppercase letter.",
        );
        hasErr = true;
      } else if (!/[a-z]/.test(newPassword)) {
        setFieldError(
          "newPassword",
          "Must contain at least one lowercase letter.",
        );
        hasErr = true;
      } else if (!/[0-9]/.test(newPassword)) {
        setFieldError("newPassword", "Must contain at least one number.");
        hasErr = true;
      }
      if (!confirmPassword) {
        setFieldError("confirmPassword", "Please confirm your password.");
        hasErr = true;
      } else if (confirmPassword !== newPassword) {
        setFieldError("confirmPassword", "Passwords do not match.");
        hasErr = true;
      }
      if (hasErr) return;

      const btn = resetForm.querySelector("[type=submit]");
      btn.classList.add("btn--loading");
      btn.disabled = true;

      const { ok, data } = await API.post("/auth/forgot-password/reset", {
        token,
        password: newPassword,
        confirmPassword,
      });

      btn.classList.remove("btn--loading");
      btn.disabled = false;

      if (ok && data?.success) {
        setAlert(
          resetAlert,
          "Password reset successfully. Redirecting to login…",
          "success",
        );
        setTimeout(() => {
          window.location.href = "/index.html";
        }, 2000);
        return;
      }

      if (data?.errors) {
        Object.entries(data.errors).forEach(([f, m]) => setFieldError(f, m));
      } else {
        setAlert(
          resetAlert,
          data?.message || "Reset failed. Please try again.",
        );
      }
    });
});
