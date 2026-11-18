(() => {
  "use strict";

  const { api, setButtonLoading } = window.RollCall;
  const isAdmin = window.location.pathname.startsWith("/admin");
  const isTeacher = window.location.pathname.startsWith("/teacher");
  const role = isAdmin ? "admin" : isTeacher ? "teacher" : "student";

  const copy = isAdmin
    ? {
        documentTitle: "Admin login · RollCall",
        asideKicker: "GVP IHLR · ADMIN ACCESS",
        asideHeading: "“Oversight,<br>without the noise.”",
        asideCopy:
          "View every MCA-1 session, correct any roll call, and review attendance across all subjects and teachers from one place.",
        badge: "Admin console",
        heading: "Welcome back, Principal.",
        subtitle:
          "Sign in with your admin username to review and update attendance across all teachers.",
        usernameLabel: "Admin username",
        usernamePlaceholder: "Admin username",
        usernameAutocomplete: "username",
        loginButton: "Open admin console",
        switchPrompt: "Are you a teacher?",
        switchHref: "/teacher/login",
        switchText: "Go to teacher login",
      }
    : isTeacher
      ? {
        documentTitle: "Teacher login · RollCall",
        asideKicker: "GVP IHLR · TEACHER ACCESS",
        asideHeading: "“Roll call,<br>minus the paperwork.”",
        asideCopy:
          "Open your period from the MCA-1 timetable, tap the absentees and save. Labs and the CTV interactive program are marked once and counted for their full span.",
        badge: "Teacher portal",
        heading: "Welcome back, Professor.",
        subtitle:
          "Sign in with your employee ID or college email to take attendance and review saved records.",
        usernameLabel: "Employee ID or email",
        usernamePlaceholder: "Employee ID or college email",
        usernameAutocomplete: "username",
        loginButton: "Open teacher dashboard",
        switchPrompt: "Are you a student?",
        switchHref: "/student/login",
        switchText: "Go to student login",
      }
    : {
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
        usernamePlaceholder: "Register number",
        usernameAutocomplete: "username",
        loginButton: "Sign in to my dashboard",
        switchPrompt: "Are you a teacher?",
        switchHref: "/teacher/login",
        switchText: "Go to teacher login",
      };

  const setText = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  };

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

  const switchLink = document.getElementById("switchLink");
  if (switchLink) {
    switchLink.href = copy.switchHref;
    switchLink.innerHTML = `${copy.switchText} <span>→</span>`;
  }

  const username = document.getElementById("username");
  if (username) {
    username.placeholder = copy.usernamePlaceholder;
    username.autocomplete = copy.usernameAutocomplete;
    username.autocapitalize = isTeacher ? "none" : "characters";
  }

  const password = document.getElementById("password");
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("formError");
  const loginButton = document.getElementById("loginButton");
  const passwordToggle = document.getElementById("passwordToggle");
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
    if (!usernameValue || !passwordValue) {
      showError(
        isTeacher
          ? "Enter your employee ID or college email and password."
          : "Enter your register number and password."
      );
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
        { role, username: usernameValue, password: passwordValue },
        { redirectOn401: false }
      );
      if (buttonText) buttonText.textContent = "Signing you in…";

      // Cache offline login credentials on this device for zero-network situations
      try {
        const passHash = await hashPassword(passwordValue);
        localStorage.setItem(
          `rollcall_offline_auth_${role}`,
          JSON.stringify({
            username: usernameValue.toLowerCase(),
            passHash: passHash,
            redirect: data.redirect || (isTeacher ? "/teacher" : "/student"),
            savedAt: Date.now(),
          })
        );
      } catch (_) {}

      window.location.assign(data.redirect || (isTeacher ? "/teacher" : "/student"));
    } catch (error) {
      const isOffline =
        !navigator.onLine ||
        error.message === "Offline" ||
        error.message.includes("Could not reach") ||
        error.message.includes("connection");

      if (isOffline) {
        // Attempt offline device authentication
        try {
          const raw = localStorage.getItem(`rollcall_offline_auth_${role}`);
          if (raw) {
            const cached = JSON.parse(raw);
            const passHash = await hashPassword(passwordValue);
            if (
              cached.username === usernameValue.toLowerCase() &&
              cached.passHash === passHash
            ) {
              if (buttonText) buttonText.textContent = "Opening offline…";
              localStorage.setItem("rollcall_offline_session", "true");
              window.location.assign(cached.redirect || (isTeacher ? "/teacher" : "/student"));
              return;
            }
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

  // Register service worker on login page as well
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }

})();
