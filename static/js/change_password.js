(() => {
  "use strict";

  const { api, setButtonLoading } = window.RollCall;
  const form = document.getElementById("passwordForm");
  if (!form) return;

  const roleField = document.getElementById("roleField");
  const usernameField = document.getElementById("usernameField");
  const currentPasswordField = document.getElementById("currentPasswordField");
  const roleSelect = document.getElementById("role");
  const usernameInput = document.getElementById("username");
  const currentPasswordInput = document.getElementById("currentPassword");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const newPasswordToggle = document.getElementById("newPasswordToggle");
  const errorBox = document.getElementById("formError");
  const successBox = document.getElementById("formSuccess");
  const submitButton = document.getElementById("submitButton");
  const submitButtonText = document.getElementById("submitButtonText");
  const modeBadge = document.getElementById("modeBadge");
  const modeBadgeText = document.getElementById("modeBadgeText");
  const formHeading = document.getElementById("formHeading");
  const formSubtitle = document.getElementById("formSubtitle");
  const backLink = document.getElementById("backLink");

  const usernameForm = document.getElementById("usernameForm");
  const employeeIdField = document.getElementById("employeeIdField");
  const staffEmailField = document.getElementById("staffEmailField");
  const newEmployeeId = document.getElementById("newEmployeeId");
  const newStaffEmail = document.getElementById("newStaffEmail");
  const usernameCurrentPassword = document.getElementById("usernameCurrentPassword");
  const usernameFormError = document.getElementById("usernameFormError");
  const usernameFormSuccess = document.getElementById("usernameFormSuccess");
  const usernameSubmitButton = document.getElementById("usernameSubmitButton");
  const usernameSubmitButtonText = document.getElementById("usernameSubmitButtonText");
  const resetUsernameRows = document.getElementById("resetUsernameRows");
  const resetEmployeeField = document.getElementById("resetEmployeeField");
  const resetEmailField = document.getElementById("resetEmailField");
  const resetEmployeeId = document.getElementById("resetEmployeeId");
  const resetStaffEmail = document.getElementById("resetStaffEmail");

  const state = {
    changeMode: false,
    role: "student",
    profile: null,
  };

  const setText = (node, value) => {
    if (node) node.textContent = value;
  };

  const clearMessages = () => {
    if (errorBox) {
      errorBox.hidden = true;
      errorBox.textContent = "";
    }
    if (successBox) {
      successBox.hidden = true;
      successBox.textContent = "";
    }
  };

  const showError = (message) => {
    if (!errorBox) return;
    errorBox.hidden = false;
    errorBox.textContent = message;
    if (successBox) successBox.hidden = true;
  };

  const showSuccess = (message) => {
    if (!successBox) return;
    successBox.hidden = false;
    successBox.textContent = message;
    if (errorBox) errorBox.hidden = true;
  };

  const applyResetRole = (role) => {
    if (resetUsernameRows) resetUsernameRows.hidden = role !== "teacher";
  };

  const applyMode = (changeMode, role = "student") => {
    state.changeMode = changeMode;
    state.role = role;

    if (roleField) roleField.hidden = changeMode;
    if (usernameField) usernameField.hidden = changeMode;
    if (currentPasswordField) currentPasswordField.hidden = !changeMode;
    if (resetUsernameRows) resetUsernameRows.hidden = changeMode;
    if (usernameForm) usernameForm.hidden = true;
    if (!changeMode) applyResetRole(roleSelect?.value || "student");

    if (changeMode) {
      setText(modeBadgeText, "Change password");
      setText(formHeading, "Change your password.");
      setText(formSubtitle, "Enter your current password, then choose a new one. You will be signed out on every device except this one.");
      setText(submitButtonText, "Update password");
      if (backLink) backLink.href = `/${role}`;
      if (backLink) backLink.textContent = "Back to my dashboard →";
    } else {
      setText(modeBadgeText, "Reset password");
      setText(formHeading, "Forgot your password?");
      setText(formSubtitle, "Enter your register number, employee ID or e-mail and choose a new password. It works right away.");
      setText(submitButtonText, "Reset password");
      if (backLink) backLink.href = "/student/login";
      if (backLink) backLink.textContent = "Back to sign in →";
    }
  };

  const clearUsernameMessages = () => {
    if (usernameFormError) {
      usernameFormError.hidden = true;
      usernameFormError.textContent = "";
    }
    if (usernameFormSuccess) {
      usernameFormSuccess.hidden = true;
      usernameFormSuccess.textContent = "";
    }
  };

  const showUsernameError = (message) => {
    if (!usernameFormError) return;
    usernameFormError.hidden = false;
    usernameFormError.textContent = message;
    if (usernameFormSuccess) usernameFormSuccess.hidden = true;
  };

  const showUsernameSuccess = (message) => {
    if (!usernameFormSuccess) return;
    usernameFormSuccess.hidden = false;
    usernameFormSuccess.textContent = message;
    if (usernameFormError) usernameFormError.hidden = true;
  };

  const applyUsernameForm = (profile) => {
    if (!usernameForm) return;
    state.profile = profile || null;
    if (!profile || profile.role !== "teacher") {
      usernameForm.hidden = true;
      return;
    }
    usernameForm.hidden = false;
    if (newEmployeeId) newEmployeeId.value = profile.employee_id || "";
    if (newStaffEmail) newStaffEmail.value = profile.email || "";
  };

  const session = async () => {
    try {
      const data = await api.get("/api/session", { redirectOn401: false });
      if (data && data.ok && data.user) {
        applyMode(true, data.user.role || "student");
        applyUsernameForm(data.user);
        return true;
      }
    } catch {
      // not signed in — reset mode
    }
    applyMode(false, "student");
    applyUsernameForm(null);
    return false;
  };

  roleSelect?.addEventListener("change", () => {
    if (state.changeMode) return;
    const role = roleSelect.value;
    applyResetRole(role);
    if (role === "teacher") {
      usernameInput.placeholder = "Employee ID or college e-mail";
    } else if (role === "admin") {
      usernameInput.placeholder = "Admin username";
    } else {
      usernameInput.placeholder = "Register number";
    }
  });

  newPasswordInput?.addEventListener("input", clearMessages);
  confirmPasswordInput?.addEventListener("input", clearMessages);
  currentPasswordInput?.addEventListener("input", clearMessages);
  usernameInput?.addEventListener("input", clearMessages);
  resetEmployeeId?.addEventListener("input", clearMessages);
  resetStaffEmail?.addEventListener("input", clearMessages);

  newPasswordToggle?.addEventListener("click", () => {
    const visible = newPasswordInput.type === "text";
    newPasswordInput.type = visible ? "password" : "text";
    newPasswordToggle.classList.toggle("is-visible", !visible);
    newPasswordToggle.setAttribute("aria-pressed", String(!visible));
    newPasswordToggle.setAttribute(
      "aria-label",
      visible ? "Show new password" : "Hide new password"
    );
    newPasswordInput.focus({ preventScroll: true });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    if (newPassword.length < 8) {
      showError("Choose a new password with at least 8 characters.");
      newPasswordInput.focus();
      return;
    }
    if (newPassword.length > 200) {
      showError("The new password is too long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("The new password and confirmation do not match.");
      confirmPasswordInput.focus();
      return;
    }

    setButtonLoading(submitButton, true);
    const originalLabel = submitButtonText ? submitButtonText.textContent : "";

    try {
      if (state.changeMode) {
        const currentPassword = currentPasswordInput.value;
        if (!currentPassword) {
          showError("Enter your current password.");
          currentPasswordInput.focus();
          setButtonLoading(submitButton, false);
          return;
        }
        setText(submitButtonText, "Updating…");
        const data = await api.post(
          "/api/password/change",
          {
            current_password: currentPassword,
            new_password: newPassword,
            confirm_password: confirmPassword,
          },
          { redirectOn401: false }
        );
        showSuccess(data.message || "Password updated.");
        setTimeout(() => {
          window.location.assign(data.redirect || `/${state.role}`);
        }, 1200);
      } else {
        const role = roleSelect.value;
        const username = usernameInput.value.trim();
        if (!username) {
          showError("Enter your register number, employee ID or e-mail.");
          usernameInput.focus();
          setButtonLoading(submitButton, false);
          return;
        }
        setText(submitButtonText, "Resetting…");
        const body = {
          role,
          username,
          new_password: newPassword,
          confirm_password: confirmPassword,
        };
        if (role === "teacher") {
          const employeeId = resetEmployeeId?.value.trim().toUpperCase() || "";
          const email = resetStaffEmail?.value.trim().toLowerCase() || "";
          if (employeeId) body.new_employee_id = employeeId;
          if (email) body.new_email = email;
        }
        const data = await api.post(
          "/api/password/reset",
          body,
          { redirectOn401: false }
        );
        showSuccess(data.message || "Password updated.");
        setTimeout(() => {
          window.location.assign(data.redirect || `/${role}/login`);
        }, 1200);
      }
    } catch (error) {
      showError(error.message || "Could not update the password. Please try again.");
      setButtonLoading(submitButton, false);
      if (submitButtonText) submitButtonText.textContent = originalLabel;
      if (state.changeMode) {
        currentPasswordInput.focus();
        currentPasswordInput.select();
      } else {
        usernameInput.focus();
      }
    }
  });

  usernameCurrentPassword?.addEventListener("input", clearUsernameMessages);
  newEmployeeId?.addEventListener("input", clearUsernameMessages);
  newStaffEmail?.addEventListener("input", clearUsernameMessages);

  usernameForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearUsernameMessages();

    const currentPassword = usernameCurrentPassword.value;
    if (!currentPassword) {
      showUsernameError("Enter your current password.");
      usernameCurrentPassword.focus();
      return;
    }

    const employeeId = newEmployeeId.value.trim().toUpperCase();
    const email = newStaffEmail.value.trim().toLowerCase();
    if (!employeeId || !email) {
      showUsernameError("Enter both an employee ID and an e-mail.");
      return;
    }
    if (
      employeeId === String(state.profile?.employee_id || "").toUpperCase() &&
      email === String(state.profile?.email || "").toLowerCase()
    ) {
      showUsernameError("Nothing to update.");
      return;
    }

    setButtonLoading(usernameSubmitButton, true);
    const originalLabel = usernameSubmitButtonText ? usernameSubmitButtonText.textContent : "";
    try {
      if (usernameSubmitButtonText) usernameSubmitButtonText.textContent = "Updating…";
      const data = await api.post(
        "/api/username/change",
        { current_password: currentPassword, employee_id: employeeId, email },
        { redirectOn401: false }
      );
      showUsernameSuccess(data.message || "Your sign-in details were updated.");
      usernameCurrentPassword.value = "";
      if (state.profile) {
        state.profile.employee_id = employeeId;
        state.profile.email = email;
      }
    } catch (error) {
      showUsernameError(error.message || "Could not update your username. Please try again.");
    } finally {
      setButtonLoading(usernameSubmitButton, false);
      if (usernameSubmitButtonText) usernameSubmitButtonText.textContent = originalLabel;
    }
  });

  session();
})();
