(() => {
  "use strict";

  const { api, setButtonLoading } = window.RollCall;

  const ROLE_CONFIG = {
    student: {
      documentTitle: "Student login · RollCall",
      asideKicker: "GVP IHLR · STUDENT ACCESS",
      asideHeading: "“The number<br>speaks for itself.”",
      asideCopy:
        "Every class, every period, always up to date. See your MCA-1 timetable, your live attendance, and every holiday that is excluded from the count.",
      badge: "Student portal",
      heading: "Welcome back.",
      subtitle:
        "Sign in with your register number to see your live attendance, safe-to-skip allowance and recovery plan.",
      usernameLabel: "Register number",
      usernamePlaceholder: "Enter register number",
      usernameAutocomplete: "username",
      autocapitalize: "characters",
      loginButton: "Sign in to my dashboard",
      emptyError: "Enter your register number and password.",
      switchPrompt: "Are you a teacher?",
      switchRole: "teacher",
      switchText: "Switch to faculty login",
      defaultPath: "/student",
    },
    teacher: {
      documentTitle: "Faculty login · RollCall",
      asideKicker: "GVP IHLR · FACULTY ACCESS",
      asideHeading: "“Roll call,<br>minus the paperwork.”",
      asideCopy:
        "Open your period from the MCA-1 timetable, tap the absentees and save. Labs and the CTV interactive program are marked once and counted for their full span.",
      badge: "Faculty portal",
      heading: "Welcome back, Professor.",
      subtitle:
        "Sign in with your employee ID or college email to take attendance and review saved records.",
      usernameLabel: "Employee ID or email",
      usernamePlaceholder: "Enter employee ID or email",
      usernameAutocomplete: "username",
      autocapitalize: "none",
      loginButton: "Open faculty dashboard",
      emptyError: "Enter your employee ID or college email and password.",
      switchPrompt: "Are you an administrator?",
      switchRole: "admin",
      switchText: "Switch to admin console",
      defaultPath: "/teacher",
    },
    admin: {
      documentTitle: "Admin login · RollCall",
      asideKicker: "GVP IHLR · ADMIN ACCESS",
      asideHeading: "“Oversight,<br>without the noise.”",
      asideCopy:
        "View every session, correct any roll call, and manage timetable, faculty, and student allocations from one centralized place.",
      badge: "Admin console",
      heading: "Welcome back, Administrator.",
      subtitle:
        "Sign in with your authorized admin credentials to manage the attendance portal.",
      usernameLabel: "Admin username",
      usernamePlaceholder: "Enter admin username",
      usernameAutocomplete: "username",
      autocapitalize: "none",
      loginButton: "Open admin console",
      emptyError: "Enter your admin username and password.",
      switchPrompt: "Are you a student?",
      switchRole: "student",
      switchText: "Switch to student login",
      defaultPath: "/admin",
    },
  };

  const urlParams = new URLSearchParams(window.location.search);
  const paramRole = urlParams.get("role");
  let currentRole = "student";

  if (window.location.pathname.startsWith("/admin") || paramRole === "admin") {
    currentRole = "admin";
  } else if (window.location.pathname.startsWith("/teacher") || paramRole === "teacher") {
    currentRole = "teacher";
  } else if (paramRole === "student" || window.location.pathname.startsWith("/student")) {
    currentRole = "student";
  }

  const setText = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  };

  const username = document.getElementById("username");
  const password = document.getElementById("password");
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("formError");
  const loginButton = document.getElementById("loginButton");
  const passwordToggle = document.getElementById("passwordToggle");
  const switchLink = document.getElementById("switchLink");
  const roleTabs = document.querySelectorAll(".auth-role-tab");

  function showError(message) {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearError() {
    if (!errorBox) return;
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  function setRole(role, updateHistory = true) {
    if (!ROLE_CONFIG[role]) role = "student";
    currentRole = role;
    const copy = ROLE_CONFIG[role];

    document.title = copy.documentTitle;
    document.body.dataset.role = role;
    setText("asideKicker", copy.asideKicker);
    const asideHeading = document.getElementById("asideHeading");
    if (asideHeading) asideHeading.innerHTML = copy.asideHeading;
    setText("asideCopy", copy.asideCopy);
    setText("roleBadgeText", copy.badge);
    setText("formHeading", copy.heading);
    setText("formSubtitle", copy.subtitle);
    setText("usernameLabel", copy.usernameLabel);
    setText("loginButtonText", copy.loginButton);
    setText("switchPrompt", copy.switchPrompt);
    setText("year", String(new Date().getFullYear()));

    if (switchLink) {
      switchLink.href = `/${copy.switchRole}/login`;
      switchLink.dataset.targetRole = copy.switchRole;
      switchLink.innerHTML = `${copy.switchText} <span>→</span>`;
    }

    if (username) {
      username.placeholder = copy.usernamePlaceholder;
      username.autocomplete = copy.usernameAutocomplete;
      username.autocapitalize = copy.autocapitalize;
    }

    roleTabs.forEach((tab) => {
      const active = tab.dataset.role === role;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    clearError();

    if (updateHistory) {
      try {
        const newPath = `/${role}/login`;
        if (window.location.pathname !== newPath) {
          window.history.replaceState({ role }, "", newPath);
        }
      } catch (_) {}
    }
  }

  // Bind role tabs click
  roleTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const selected = tab.dataset.role;
      if (selected && selected !== currentRole) {
        setRole(selected, true);
        username?.focus();
      }
    });
  });

  // Switch link click (fast switch without full reload)
  switchLink?.addEventListener("click", (e) => {
    e.preventDefault();
    const targetRole = switchLink.dataset.targetRole || "teacher";
    setRole(targetRole, true);
    username?.focus();
  });

  username?.addEventListener("input", clearError);
  password?.addEventListener("input", clearError);

  passwordToggle?.addEventListener("click", () => {
    const visible = password.type === "text";
    password.type = visible ? "password" : "text";
    passwordToggle.classList.toggle("is-visible", !visible);
    passwordToggle.setAttribute("aria-pressed", String(!visible));
    passwordToggle.setAttribute("aria-label", visible ? "Show password" : "Hide password");
    password.focus({ preventScroll: true });
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();

    const usernameValue = username.value.trim();
    const passwordValue = password.value;
    const config = ROLE_CONFIG[currentRole];

    if (!usernameValue || !passwordValue) {
      showError(config.emptyError);
      (usernameValue ? password : username).focus();
      return;
    }

    setButtonLoading(loginButton, true);
    const originalLabel = document.getElementById("loginButtonText").textContent;
    const buttonText = document.getElementById("loginButtonText");

    async function hashPassword(str) {
      const buffer = new TextEncoder().encode(str);
      const digest = await crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    try {
      if (!navigator.onLine) {
        throw new Error("Offline");
      }
      const data = await api.post(
        "/api/login",
        { role: currentRole, username: usernameValue, password: passwordValue },
        { redirectOn401: false }
      );
      if (buttonText) buttonText.textContent = "Signing you in…";

      // Cache offline login credentials on this device
      try {
        const passHash = await hashPassword(passwordValue);
        localStorage.setItem(
          `rollcall_offline_auth_${currentRole}`,
          JSON.stringify({
            username: usernameValue.toLowerCase(),
            passHash: passHash,
            redirect: data.redirect || config.defaultPath,
            savedAt: Date.now(),
          })
        );
      } catch (_) {}

      localStorage.setItem("rollcall_active_teacher_id", usernameValue.toLowerCase().trim());
      window.location.assign(data.redirect || config.defaultPath);
    } catch (error) {
      const isOffline =
        !navigator.onLine ||
        error.message === "Offline" ||
        error.message.includes("Could not reach") ||
        error.message.includes("connection");

      if (isOffline) {
        try {
          const passHash = await hashPassword(passwordValue);
          const userLower = usernameValue.toLowerCase();
          let matched = false;

          // 1. Check if user logged in previously on this device
          const raw = localStorage.getItem(`rollcall_offline_auth_${currentRole}`);
          if (raw) {
            const cached = JSON.parse(raw);
            if (cached.username === userLower && cached.passHash === passHash) {
              matched = true;
            }
          }

          // 2. Built-in offline support for faculty & staff
          const DEMO_TEACHERS = new Set(["principal", "isp", "vl", "prp", "chssrp", "bd", "psr", "rk", "pvrc", "ymg"]);
          const TEACHER_DEFAULT_HASH = "cde383eee8ee7a4400adf7a15f716f179a2eb97646b37e089eb8d6d04e663416"; // teacher123

          if (!matched && (currentRole === "teacher" || currentRole === "admin") && DEMO_TEACHERS.has(userLower) && passHash === TEACHER_DEFAULT_HASH) {
            matched = true;
          }

          if (matched) {
            if (buttonText) buttonText.textContent = "Opening offline…";
            localStorage.setItem("rollcall_offline_session", "true");
            localStorage.setItem("rollcall_active_teacher_id", userLower);
            window.location.assign(config.defaultPath);
            return;
          }
        } catch (_) {}

        showError("Device is offline. If you signed in here previously, check your password, or reconnect to internet.");
      } else {
        showError(error.message || "Sign-in failed. Please try again.");
      }

      setButtonLoading(loginButton, false);
      if (buttonText) buttonText.textContent = originalLabel;
      password.focus();
      password.select();
    }
  });

  // Initialize role
  setRole(currentRole, false);

  // Forgot password info popup for student/teacher
  const forgotLink = document.getElementById("forgotPasswordLink");
  const modalForgotInfo = document.getElementById("modalForgotInfo");
  const forgotInfoBody = document.getElementById("forgotInfoBody");
  const btnCloseForgotInfo = document.getElementById("btnCloseForgotInfo");

  forgotLink?.addEventListener("click", (e) => {
    if (currentRole === "student") {
      e.preventDefault();
      if (forgotInfoBody) {
        forgotInfoBody.innerHTML = `
          <p style="margin:0 0 10px;">Self-service password reset is disabled for student accounts.</p>
          <p style="margin:0 0 12px;">Please contact your <strong>College Administrator</strong> or <strong>Department Office</strong> to reset your password.</p>
          <div style="background:#f3f4f6; padding:12px; border-radius:8px; font-size:13px; color:#374151; line-height:1.5;">
            📌 <strong>After Admin Reset:</strong><br>
            Your temporary password will be your <strong>Register Number</strong>. You will be prompted to create your new password immediately upon sign-in.
          </div>
        `;
      }
      if (modalForgotInfo) {
        modalForgotInfo.style.display = "flex";
        modalForgotInfo.hidden = false;
      }
    } else if (currentRole === "teacher") {
      e.preventDefault();
      if (forgotInfoBody) {
        forgotInfoBody.innerHTML = `
          <p style="margin:0 0 10px;">Please contact the <strong>Administrator</strong> to reset your faculty account.</p>
          <div style="background:#f3f4f6; padding:12px; border-radius:8px; font-size:13px; color:#374151; line-height:1.5;">
            📌 <strong>After Reset:</strong><br>
            Your temporary password will be <code>teacher123</code>.
          </div>
        `;
      }
      if (modalForgotInfo) {
        modalForgotInfo.style.display = "flex";
        modalForgotInfo.hidden = false;
      }
    }
  });

  btnCloseForgotInfo?.addEventListener("click", () => {
    if (modalForgotInfo) {
      modalForgotInfo.style.display = "none";
      modalForgotInfo.hidden = true;
    }
  });

  const btnXCloseForgotInfo = document.getElementById("btnXCloseForgotInfo");
  btnXCloseForgotInfo?.addEventListener("click", () => {
    if (modalForgotInfo) {
      modalForgotInfo.style.display = "none";
      modalForgotInfo.hidden = true;
    }
  });

  modalForgotInfo?.addEventListener("click", (e) => {
    if (e.target === modalForgotInfo) {
      modalForgotInfo.style.display = "none";
      modalForgotInfo.hidden = true;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalForgotInfo && modalForgotInfo.style.display !== "none") {
      modalForgotInfo.style.display = "none";
      modalForgotInfo.hidden = true;
    }
  });

  // Register service worker on login page as well
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
})();
