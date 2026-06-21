document.addEventListener("DOMContentLoaded", () => {
  /* ── Redirect already-logged-in users away from login/register ── */
  API.get("/auth/me").then(({ data }) => {
    if (data && data.loggedIn) window.location.href = "/dashboard.html";
  });

  /** Show a field-level error message. */
  function setFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorEl = document.getElementById(fieldId + "-error");
    if (field) field.classList.toggle("error", !!message);
    if (errorEl) errorEl.textContent = message || "";
  }

  /** Clear all field errors. */
  function clearErrors(fieldIds) {
    fieldIds.forEach((id) => setFieldError(id, ""));
  }

  /** Show/hide the page-level alert banner. */
  function setAlert(alertEl, message, type = "error") {
    if (!alertEl) return;
    alertEl.textContent = message;
    alertEl.className = `alert alert--${type}`;
    alertEl.classList.toggle("hidden", !message);
  }

  /** Get trimmed value from an input by ID. */
  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : "";
  }

  //  Password show/hide toggles

  document.querySelectorAll(".input-wrapper__toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const wrapper = btn.closest(".input-wrapper");
      const input = wrapper && wrapper.querySelector("input");
      if (!input) return;
      const isText = input.type === "text";
      input.type = isText ? "password" : "text";
      btn.setAttribute(
        "aria-label",
        isText ? "Show password" : "Hide password",
      );
      // Toggle eye icon
      const eyeOn = btn.querySelector(".icon-eye");
      const eyeOff = btn.querySelector(".icon-eye-off");
      if (eyeOn) eyeOn.style.display = isText ? "block" : "none";
      if (eyeOff) eyeOff.style.display = isText ? "none" : "block";
    });
  });

  // login
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    const alertEl = document.getElementById("login-alert");

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      setAlert(alertEl, "");

      const email = val("email");
      const password = document.getElementById("password")?.value || "";
      const rememberMe =
        document.getElementById("rememberMe")?.checked || false;

      // Basic client-side checks
      let hasError = false;
      if (!email) {
        setFieldError("email", "Email is required.");
        hasError = true;
      } else {
        setFieldError("email", "");
      }
      if (!password) {
        setFieldError("password", "Password is required.");
        hasError = true;
      } else {
        setFieldError("password", "");
      }
      if (hasError) return;

      const submitBtn = loginForm.querySelector("[type=submit]");
      submitBtn.classList.add("btn--loading");
      submitBtn.disabled = true;

      const { ok, data } = await API.post("/auth/login", {
        email,
        password,
        rememberMe,
      });

      submitBtn.classList.remove("btn--loading");
      submitBtn.disabled = false;

      if (ok && data?.success) {
        window.location.href = data.redirect || "/dashboard.html";
        return;
      }

      // Field-level errors (422) or generic error (401/500)
      if (data?.errors) {
        Object.entries(data.errors).forEach(([field, msg]) =>
          setFieldError(field, msg),
        );
      } else {
        setAlert(alertEl, data?.message || "Login failed. Please try again.");
      }
    });
  }

  //  REGISTER — Client-side validation rules
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    const alertEl = document.getElementById("register-alert");

    const REGISTER_FIELDS = [
      "fullName",
      "email",
      "phone",
      "matricNumber",
      "department",
      "level",
      "dateOfBirth",
      "password",
      "confirmPassword",
    ];

    /** Client-side validation for registration fields. Returns field→error map. */
    function validateRegisterForm() {
      const errors = {};

      const fullName = val("fullName");
      if (!fullName) errors.fullName = "Full name is required.";
      else if (!/^[A-Za-z\s\-]{2,60}$/.test(fullName))
        errors.fullName =
          "Full name must be 2–60 characters (letters, spaces, hyphens only).";

      const email = val("email");
      if (!email) errors.email = "Email is required.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        errors.email = "Enter a valid email address.";

      const phone = val("phone");
      if (!phone) errors.phone = "Phone number is required.";
      else if (!/^\+?[0-9]{10,14}$/.test(phone))
        errors.phone =
          "Enter a valid phone number (10–14 digits, optional leading +).";

      const matric = val("matricNumber");
      if (!matric) errors.matricNumber = "Matric/Student ID is required.";
      else if (!/^[0-9]{10}$/.test(matric))
        errors.matricNumber =
          "Matric number must be a 10-digit number (e.g. 2461113257).";

      const dept = val("department");
      if (!dept) errors.department = "Department is required.";

      const level = val("level");
      if (!level || level === "") errors.level = "Level is required.";

      const dob = val("dateOfBirth");
      if (!dob) {
        errors.dateOfBirth = "Date of birth is required.";
      } else {
        const dobDate = new Date(dob);
        const now = new Date();
        let age = now.getFullYear() - dobDate.getFullYear();
        const m = now.getMonth() - dobDate.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dobDate.getDate())) age--;
        if (age < 14 || age > 80)
          errors.dateOfBirth = "Age must be between 14 and 80 years.";
      }

      const password = document.getElementById("password")?.value || "";
      if (!password) errors.password = "Password is required.";
      else if (password.length < 8)
        errors.password = "Password must be at least 8 characters.";
      else if (!/[A-Z]/.test(password))
        errors.password =
          "Password must contain at least one uppercase letter.";
      else if (!/[a-z]/.test(password))
        errors.password =
          "Password must contain at least one lowercase letter.";
      else if (!/[0-9]/.test(password))
        errors.password = "Password must contain at least one number.";

      const confirmPassword =
        document.getElementById("confirmPassword")?.value || "";
      if (!confirmPassword)
        errors.confirmPassword = "Please confirm your password.";
      else if (confirmPassword !== password)
        errors.confirmPassword = "Passwords do not match.";

      return errors;
    }

    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      setAlert(alertEl, "");
      clearErrors(REGISTER_FIELDS);

      const clientErrors = validateRegisterForm();
      if (Object.keys(clientErrors).length > 0) {
        Object.entries(clientErrors).forEach(([field, msg]) =>
          setFieldError(field, msg),
        );
        // Scroll to first error
        const firstErrField = registerForm.querySelector(".error");
        firstErrField &&
          firstErrField.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const payload = {
        fullName: val("fullName"),
        email: val("email"),
        phone: val("phone"),
        matricNumber: val("matricNumber"),
        department: val("department"),
        level: val("level"),
        dateOfBirth: val("dateOfBirth"),
        gender: val("gender") || "",
        password: document.getElementById("password")?.value || "",
        confirmPassword:
          document.getElementById("confirmPassword")?.value || "",
      };

      const submitBtn = registerForm.querySelector("[type=submit]");
      submitBtn.classList.add("btn--loading");
      submitBtn.disabled = true;

      const { ok, data } = await API.post("/auth/register", payload);

      submitBtn.classList.remove("btn--loading");
      submitBtn.disabled = false;

      if (ok && data?.success) {
        setAlert(
          alertEl,
          "Registration successful! Redirecting to login…",
          "success",
        );
        setTimeout(() => {
          window.location.href = "/index.html";
        }, 1500);
        return;
      }

      if (data?.errors) {
        Object.entries(data.errors).forEach(([field, msg]) =>
          setFieldError(field, msg),
        );
        const firstErrField = registerForm.querySelector(".error");
        firstErrField &&
          firstErrField.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setAlert(
          alertEl,
          data?.message || "Registration failed. Please try again.",
        );
      }
    });

    // Live validation on blur
    REGISTER_FIELDS.forEach((fieldId) => {
      const el = document.getElementById(fieldId);
      if (el) {
        el.addEventListener("blur", () => {
          const errs = validateRegisterForm();
          setFieldError(fieldId, errs[fieldId] || "");
        });
      }
    });
  }
});
