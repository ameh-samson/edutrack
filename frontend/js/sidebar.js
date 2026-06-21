
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.querySelector(".sidebar");
  const mainArea = document.querySelector(".main-area");
  const topbarToggle = document.querySelector(".topbar__toggle");
  const overlay = document.getElementById("sidebar-overlay");
  const userMenu = document.querySelector(".topbar__user");
  const dropdown = document.getElementById("user-dropdown");
  const logoutBtns = document.querySelectorAll("[data-logout]");

  const isMobile = () => window.innerWidth <= 768;

  /* ── Desktop collapse helpers ──────────────────────────────────── */
  function applyDesktopState(collapsed) {
    sidebar.classList.toggle("collapsed", collapsed);
    mainArea && mainArea.classList.toggle("sidebar-collapsed", collapsed);
    // body class drives chevron CSS rotation
    document.body.classList.toggle("sidebar-is-collapsed", collapsed);
    localStorage.setItem("sidebarCollapsed", collapsed ? "1" : "0");
  }

  /* ── Mobile drawer helpers ─────────────────────────────────────── */
  function openDrawer() {
    sidebar.classList.add("open");
    overlay && overlay.classList.add("visible");
  }
  function closeDrawer() {
    sidebar.classList.remove("open");
    overlay && overlay.classList.remove("visible");
  }

  /* ── Initialise on page load ───────────────────────────────────── */
  if (!isMobile()) {
    // Restore last desktop preference (default: open)
    const stored = localStorage.getItem("sidebarCollapsed") === "1";
    applyDesktopState(stored);
  }

  /* ── Topbar toggle — one button, two behaviours ────────────────── */
  topbarToggle &&
    topbarToggle.addEventListener("click", () => {
      if (isMobile()) {
        sidebar.classList.contains("open") ? closeDrawer() : openDrawer();
      } else {
        applyDesktopState(!sidebar.classList.contains("collapsed"));
      }
    });

  overlay && overlay.addEventListener("click", closeDrawer);

  // Close drawer when a nav link is tapped on mobile
  document.querySelectorAll(".nav-item[href]").forEach((link) => {
    link.addEventListener("click", () => {
      if (isMobile()) closeDrawer();
    });
  });

  // Switching viewport size — reset to correct mode
  window.addEventListener("resize", () => {
    if (!isMobile()) {
      closeDrawer();
      const stored = localStorage.getItem("sidebarCollapsed") === "1";
      applyDesktopState(stored);
    } else {
      // On mobile the sidebar is never "desktop-collapsed"
      sidebar.classList.remove("collapsed");
      mainArea && mainArea.classList.remove("sidebar-collapsed");
      document.body.classList.remove("sidebar-is-collapsed");
    }
  });

  /* ── User dropdown ─────────────────────────────────────────────── */
  if (userMenu && dropdown) {
    userMenu.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = dropdown.classList.toggle("open");
      userMenu.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", () => {
      dropdown.classList.remove("open");
      userMenu.setAttribute("aria-expanded", "false");
    });
  }

  /* ── Logout ────────────────────────────────────────────────────── */
  logoutBtns.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await API.post("/auth/logout", {});
      } catch (_) {}
      window.location.href = "/index.html";
    });
  });
});
