/* Shared browser helpers for RollCall. */
(() => {
  "use strict";

  let toastHost = null;

  function ensureToastHost() {
    if (!toastHost) {
      toastHost = document.createElement("div");
      toastHost.className = "toast-host";
      toastHost.setAttribute("aria-live", "polite");
      toastHost.setAttribute("aria-atomic", "false");
      document.body.appendChild(toastHost);
    }
    return toastHost;
  }

  function toast(message, type = "success") {
    const host = ensureToastHost();
    const node = document.createElement("div");
    node.className = `toast${type === "error" ? " toast--error" : type === "info" ? " toast--info" : ""}`;
    node.textContent = message;
    host.appendChild(node);
    const remove = () => {
      node.classList.add("is-leaving");
      window.setTimeout(() => node.remove(), 240);
    };
    window.setTimeout(remove, type === "error" ? 6500 : 4200);
  }

  async function request(path, options = {}) {
    const {
      method = "GET",
      body,
      redirectOn401 = true,
      timeout = 15000,
    } = options;
    const headers = { Accept: "application/json" };
    const init = { method, headers, credentials: "same-origin" };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeout);
    init.signal = controller.signal;

    let response;
    try {
      response = await fetch(path, init);
    } catch (error) {
      clearTimeout(timer);
      if (error.name === "AbortError") {
        throw new Error("The server took too long to respond. Please try again.");
      }
      throw new Error("Could not reach the server. Check your connection and try again.");
    }
    clearTimeout(timer);

    const contentType = response.headers.get("content-type") || "";
    let payload = null;
    if (contentType.includes("application/json")) {
      payload = await response.json().catch(() => null);
    }

    if (!response.ok) {
      if (response.status === 401 && redirectOn401) {
        window.location.href = window.location.pathname.startsWith("/teacher")
          ? "/teacher/login"
          : window.location.pathname.startsWith("/admin")
            ? "/admin/login"
            : "/student/login";
      }
      throw new Error(payload?.error || `Something went wrong (${response.status}).`);
    }

    return payload;
  }

  const api = {
    get(path, options = {}) {
      return request(path, { ...options, method: "GET" });
    },
    post(path, body, options = {}) {
      return request(path, { ...options, method: "POST", body });
    },
  };

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function initials(name) {
    const cleaned = String(name || "")
      .replace(/^(prof\.?|dr\.?|mr\.?|ms\.?|mrs\.?)\s+/i, "")
      .trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (!parts.length) return "—";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  function formatPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    const rounded = number.toFixed(1).replace(/\.0$/, "");
    return `${rounded}%`;
  }

  function parseDateOnly(value) {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value, options = {}) {
    const date = parseDateOnly(value);
    if (!date) return value || "—";
    return new Intl.DateTimeFormat("en-IN", {
      weekday: options.shortWeekday === false ? undefined : "short",
      day: "numeric",
      month: "short",
      year: options.year ? "numeric" : undefined,
    }).format(date);
  }

  function formatLongDate(value) {
    const date = parseDateOnly(value);
    if (!date) return value || "—";
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }

  function formatTime(value, withSeconds = false) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      second: withSeconds ? "2-digit" : undefined,
      hour12: true,
    }).format(date);
  }

  function plural(count, singular, pluralWord) {
    return Number(count) === 1 ? singular : pluralWord || `${singular}s`;
  }

  function setButtonLoading(button, isLoading) {
    if (!button) return;
    button.classList.toggle("btn--loading", isLoading);
    button.disabled = isLoading;
  }

  async function logout() {
    const path = window.location.pathname;
    const role = path.startsWith("/teacher")
      ? "teacher"
      : path.startsWith("/admin")
        ? "admin"
        : "student";
    try {
      if (navigator.onLine) {
        await api.post("/api/logout", { role }, { redirectOn401: false });
      }
    } catch {
      // The local session is still cleared on the server; continue home.
    }
    try {
      localStorage.removeItem("rollcall_offline_session");
      localStorage.removeItem("rollcall_active_teacher_id");
    } catch (_) {}
    window.location.assign(role === "teacher" ? "/teacher/login" : role === "admin" ? "/admin/login" : "/student/login");
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-logout]");
    if (trigger) {
      event.preventDefault();
      trigger.disabled = true;
      logout();
    }
  });

  // First-login reminder: everyone seeded with a college-issued password
  // must rotate it before accounts mean anything. Dismissal resets per day.
  async function maybeShowMustChangeBanner() {
    const banner = document.getElementById("mustChangeBanner");
    if (!banner) return;
    let dismissedOn = null;
    try {
      dismissedOn = window.sessionStorage.getItem("mustChangeDismissedOn");
    } catch {
      dismissedOn = null;
    }
    if (dismissedOn === new Date().toDateString()) return;
    try {
      const data = await api.get("/api/session", { redirectOn401: false });
      const must = Boolean(
        data && data.ok && data.user && data.user.must_change_password
      );
      if (!must) return;
      banner.hidden = false;
      document.getElementById("mustChangeLater")?.addEventListener("click", () => {
        try {
          window.sessionStorage.setItem(
            "mustChangeDismissedOn",
            new Date().toDateString()
          );
        } catch {
          /* private mode */
        }
        banner.hidden = true;
      });
    } catch {
      banner.hidden = true;
    }
  }

  maybeShowMustChangeBanner();

  // Auto-hide top header / RollCall headline when scrolling down
  let lastScrollY = window.scrollY || 0;
  window.addEventListener(
    "scroll",
    () => {
      const currentScrollY = window.scrollY || 0;
      const header = document.querySelector(".app-header, .site-header");
      if (!header) return;
      if (currentScrollY > 40 && currentScrollY > lastScrollY) {
        header.classList.add("header--hidden");
      } else {
        header.classList.remove("header--hidden");
      }
      lastScrollY = Math.max(0, currentScrollY);
    },
    { passive: true }
  );

  window.RollCall = {
    api,
    toast,
    escapeHTML,
    initials,
    formatPercent,
    formatDate,
    formatLongDate,
    formatTime,
    parseDateOnly,
    plural,
    setButtonLoading,
    logout,
  };
})();
