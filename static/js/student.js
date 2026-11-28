(() => {
  "use strict";

  const {
    api,
    toast,
    escapeHTML,
    initials,
    formatPercent,
    formatDate,
    formatTime,
    plural,
  } = window.RollCall;

  const $ = (id) => document.getElementById(id);
  const state = { loading: false, data: null, ringValue: 0, pollTimer: null };

  const PERIOD_STARTS = [
    "9:00 AM",
    "10:00 AM",
    "11:15 AM",
    "12:15 PM",
    "2:15 PM",
    "3:15 PM",
    "4:15 PM",
  ];

  function periodRange(period, span) {
    const count = Number(span) || 1;
    return count > 1 ? `P${period}–P${period + count - 1}` : `P${period}`;
  }

  function spanWords(span) {
    const count = Number(span) || 1;
    return `${count} ${plural(count, "period")}`;
  }

  function slotKind(span) {
    const count = Number(span) || 1;
    if (count >= 3) return "Interactive program";
    if (count === 2) return "Lab";
    return "Theory";
  }


  function setText(id, value) {
    const node = $(id);
    if (node) node.textContent = value;
  }

  function setRing(value) {
    const target = Math.max(0, Math.min(100, Number(value) || 0));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      state.ringValue = target;
      $("attendanceRing").style.setProperty("--value", target.toFixed(1));
      return;
    }
    const start = state.ringValue;
    const duration = 650;
    const started = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (target - start) * eased;
      state.ringValue = current;
      $("attendanceRing").style.setProperty("--value", current.toFixed(1));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function setRingPercent(percentage) {
    const value = Number(percentage);
    if (!Number.isFinite(value) || value <= 0) {
      $("percentage").textContent = "—";
      return;
    }
    const display = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
    $("percentage").innerHTML = `${display}<span>%</span>`;
  }

  function safeSolo(value, singular = "period", pluralWord = "periods") {
    return `${value} ${plural(value, singular, pluralWord)}`;
  }

  let currentOverall = null;

  function initBunkCalculator() {
    const missInput = $("calcMissCount");
    const attendInput = $("calcAttendCount");
    if (!missInput || !attendInput) return;

    $("btnMinusMiss")?.addEventListener("click", () => {
      missInput.value = Math.max(0, parseInt(missInput.value || 0, 10) - 1);
      renderBunkCalculation();
    });
    $("btnPlusMiss")?.addEventListener("click", () => {
      missInput.value = parseInt(missInput.value || 0, 10) + 1;
      renderBunkCalculation();
    });
    $("btnMinusAttend")?.addEventListener("click", () => {
      attendInput.value = Math.max(0, parseInt(attendInput.value || 0, 10) - 1);
      renderBunkCalculation();
    });
    $("btnPlusAttend")?.addEventListener("click", () => {
      attendInput.value = parseInt(attendInput.value || 0, 10) + 1;
      renderBunkCalculation();
    });

    missInput.addEventListener("input", renderBunkCalculation);
    attendInput.addEventListener("input", renderBunkCalculation);

    $("chipMissTomorrow")?.addEventListener("click", () => {
      missInput.value = parseInt(missInput.value || 0, 10) + 4;
      renderBunkCalculation();
    });
    $("chipAttendWeek")?.addEventListener("click", () => {
      attendInput.value = parseInt(attendInput.value || 0, 10) + 30;
      renderBunkCalculation();
    });
    $("chipResetCalc")?.addEventListener("click", () => {
      missInput.value = 0;
      attendInput.value = 0;
      renderBunkCalculation();
    });
  }

  function renderBunkCalculation() {
    if (!currentOverall) return;
    const baseAttended = Number(currentOverall.attended) || 0;
    const baseTotal = Number(currentOverall.total) || 0;
    const missCount = Math.max(0, parseInt($("calcMissCount")?.value || 0, 10));
    const attendCount = Math.max(0, parseInt($("calcAttendCount")?.value || 0, 10));

    const simAttended = baseAttended + attendCount;
    const simTotal = baseTotal + attendCount + missCount;
    const simPct = simTotal > 0 ? (simAttended / simTotal) * 100 : 0;
    const formattedPct = simPct.toFixed(1);

    const percentVal = $("calcPercentVal");
    const fractionVal = $("calcFractionVal");
    const progressFill = $("calcProgressFill");
    const statusTag = $("calcStatusTag");
    const diffText = $("calcDiffText");
    const verdictText = $("calcVerdictText");

    if (percentVal) percentVal.textContent = `${formattedPct}%`;
    if (fractionVal) fractionVal.textContent = `${simAttended} / ${simTotal} periods`;

    // Progress bar fill & marker
    if (progressFill) {
      const clampWidth = Math.min(100, Math.max(0, simPct));
      progressFill.style.width = `${clampWidth}%`;
      progressFill.classList.remove("fill--amber", "fill--red");
      if (simPct < 65) {
        progressFill.classList.add("fill--red");
      } else if (simPct < 75) {
        progressFill.classList.add("fill--amber");
      }
    }

    // Baseline diff
    const basePct = baseTotal > 0 ? (baseAttended / baseTotal) * 100 : 0;
    const diff = simPct - basePct;
    if (diffText) {
      if (missCount === 0 && attendCount === 0) {
        diffText.textContent = "Current baseline";
        diffText.style.color = "var(--muted)";
      } else if (diff > 0) {
        diffText.textContent = `+${diff.toFixed(1)}% improvement`;
        diffText.style.color = "var(--green)";
      } else if (diff < 0) {
        diffText.textContent = `${diff.toFixed(1)}% drop`;
        diffText.style.color = "var(--coral)";
      } else {
        diffText.textContent = "No change";
        diffText.style.color = "var(--muted)";
      }
    }

    // Status tag & verdict
    if (statusTag && verdictText) {
      statusTag.classList.remove("tag--amber", "tag--red");

      if (simPct >= 75) {
        statusTag.textContent = "75% ELIGIBLE";
        const maxCanSkip = Math.floor(simAttended / 0.75 - simTotal);
        if (maxCanSkip > 0) {
          verdictText.innerHTML = `🟢 <strong>You are in the safe zone!</strong> With this simulation, your attendance is <strong>${formattedPct}%</strong>. You can miss up to <strong>${maxCanSkip} more ${plural(maxCanSkip, "period")}</strong> before dropping below 75%.`;
        } else {
          verdictText.innerHTML = `🟡 <strong>On the edge!</strong> With this simulation, you are at <strong>${formattedPct}%</strong>. Missing even 1 more period will drop you below 75%.`;
        }
      } else if (simPct >= 65) {
        statusTag.textContent = "CONDONATION ZONE";
        statusTag.classList.add("tag--amber");
        const needed = Math.ceil(3 * simTotal - 4 * simAttended);
        verdictText.innerHTML = `⚠️ <strong>Condonation range (65%–74%)!</strong> Your simulated attendance is <strong>${formattedPct}%</strong>. You will need college medical condonation to sit for exams. Attend the next <strong>${needed} consecutive ${plural(needed, "period")}</strong> without absence to recover to 75%.`;
      } else {
        statusTag.textContent = "DETAINED WARNING";
        statusTag.classList.add("tag--red");
        const needed = Math.ceil(3 * simTotal - 4 * simAttended);
        verdictText.innerHTML = `🚨 <strong>Critical Shortage (&lt;65%)!</strong> With this simulation, your attendance falls to <strong>${formattedPct}%</strong>. You risk exam detention! You must attend the next <strong>${needed} consecutive ${plural(needed, "period")}</strong> to climb back to 75%.`;
      }
    }
  }

  function renderGuidance(data) {
    const overall = data.overall;
    currentOverall = overall;
    renderBunkCalculation();

    const skipCard = $("skipCard");
    const recoverCard = $("recoverCard");
    skipCard.classList.remove("is-active", "is-muted");
    recoverCard.classList.remove("is-active", "is-muted");

    if (overall.status === "on_track") {
      skipCard.classList.add("is-active");
      recoverCard.classList.add("is-muted");
      setText("skipState", overall.can_skip > 0 ? "Available" : "At the line");
      setText("skipCount", overall.can_skip);
      setText("skipAttended", overall.attended);
      setText("skipTotal", overall.total);

      if (overall.can_skip > 0) {
        setText(
          "skipCopy",
          `You can miss up to ${safeSolo(overall.can_skip)} and still be at 75% or above. Your attendance has a little cushion.`
        );
      } else {
        setText(
          "skipCopy",
          "You're exactly at the 75% line. Missing even one more period would drop you below the requirement."
        );
      }

      setText("recoverState", "Not needed");
      setText("recoverCount", "0");
      setText(
        "recoverCopy",
        "You're currently above the 75% requirement. No recovery periods are needed — keep attending regularly."
      );
      recoverCard.querySelector(".guide-foot span:first-child").innerHTML =
        "Currently above <b>75%</b>";
      return;
    }

    if (overall.status === "below") {
      skipCard.classList.add("is-muted");
      recoverCard.classList.add("is-active");
      setText("skipState", "Paused");
      setText("skipCount", "0");
      setText("skipAttended", overall.attended);
      setText("skipTotal", overall.total);
      setText(
        "skipCopy",
        "There's no safe-to-skip allowance yet. Reach 75% first, then this card will show how many periods you can miss."
      );
      setText("recoverState", "Action needed");
      setText("recoverCount", overall.must_attend);
      setText(
        "recoverCopy",
        `Attend the next ${safeSolo(overall.must_attend)} without missing one, and your overall attendance will reach 75%.`
      );
      recoverCard.querySelector(".guide-foot span:first-child").innerHTML =
        `Needed to reach <b>75%</b>`;
      return;
    }

    skipCard.classList.add("is-muted");
    recoverCard.classList.add("is-muted");
    setText("skipState", "No data");
    setText("skipCount", "0");
    setText("skipAttended", "0");
    setText("skipTotal", "0");
    setText(
      "skipCopy",
      "Once your first class is recorded, this card will show how many periods you can miss."
    );
    setText("recoverState", "No data");
    setText("recoverCount", "0");
    setText(
      "recoverCopy",
      "Your recovery plan will appear here if your attendance drops below 75%."
    );
  }

  function renderToday(today) {
    const list = $("todayClasses");
    if (!list) return;
    const slots = today && today.slots ? today.slots : [];
    setText(
      "todayClassesTitle",
      today && today.day
        ? `${today.day} · ${formatDate(today.date, { year: true })}`
        : "No classes today"
    );
    setText(
      "todayClassesMeta",
      slots.length ? `${slots.length} ${plural(slots.length, "period")}` : "—"
    );

    if (!slots.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-state__icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </span>
          <strong>No classes scheduled</strong>
          <p>Enjoy the break — your next working day is on the weekly timetable below.</p>
        </div>`;
      return;
    }

    list.innerHTML = slots
      .map((slot) => {
        const kind = slotKind(slot.span);
        return `
          <div class="today-class ${slot.is_holiday ? "is-holiday" : ""}">
            <span class="today-class__time">${escapeHTML(slot.time_label)}</span>
            <span class="today-class__main">
              <span class="today-class__subject">
                <span class="subject-code">${escapeHTML(slot.subject_code)}</span>
                <strong>${escapeHTML(slot.subject_name)}</strong>
              </span>
              <span class="today-class__meta">${escapeHTML(slot.period_label)} · ${escapeHTML(slot.faculty || "—")}${slot.span > 1 ? ` · ${spanWords(slot.span)}` : ""}</span>
            </span>
            <span class="today-class__tags">
              ${slot.span > 1 ? `<span class="tt-badge">${escapeHTML(kind)}</span>` : ""}
              ${slot.is_holiday ? '<span class="holiday-chip">Holiday</span>' : ""}
            </span>
          </div>`;
      })
      .join("");
  }

  function renderTimetable(timetable) {
    const table = $("weekTimetable");
    if (!table) return;
    if (!timetable || !timetable.length) {
      table.innerHTML = `
        <tbody>
          <tr><td class="table-empty">
            <strong>No timetable available</strong>
            <p>Your class timetable has not been set up yet.</p>
          </td></tr>
        </tbody>`;
      return;
    }

    const days = timetable;
    const columns = days.map((day) => {
      const byPeriod = new Map();
      day.slots.forEach((slot) => byPeriod.set(slot.period, slot));
      return { day, byPeriod, covered: new Set() };
    });

    const head = `
      <thead>
        <tr>
          <th class="tt-period-col">Period</th>
          ${days.map((day) => `<th>${escapeHTML(day.day)}</th>`).join("")}
        </tr>
      </thead>`;

    let body = "<tbody>";
    for (let period = 1; period <= 7; period += 1) {
      body += `<tr><th class="tt-period"><b>P${period}</b><span>${PERIOD_STARTS[period - 1]}</span></th>`;
      columns.forEach(({ byPeriod, covered }) => {
        if (covered.has(period)) return;
        const slot = byPeriod.get(period);
        if (!slot) {
          body += `<td class="tt-cell tt-cell--free"></td>`;
          return;
        }
        const span = Number(slot.span) || 1;
        for (let step = 1; step < span; step += 1) {
          covered.add(period + step);
        }
        const kindClass =
          span >= 3
            ? "tt-cell--program"
            : span === 2
              ? "tt-cell--lab"
              : "tt-cell--theory";
        body += `
          <td class="tt-cell ${kindClass}" rowspan="${span}">
            <span class="tt-cell__code">${escapeHTML(slot.subject_code)}</span>
            <span class="tt-cell__name">${escapeHTML(slot.subject_name)}</span>
            <span class="tt-cell__meta">${escapeHTML(slot.period_label)}${span > 1 ? ` · ${spanWords(span)}` : ""}</span>
            <span class="tt-cell__faculty">${escapeHTML(slot.faculty || "—")}</span>
          </td>`;
      });
      body += "</tr>";
      if (period === 2) {
        body += `<tr class="tt-break-row"><th>Break</th><td colspan="${days.length}">11:00 – 11:15 AM</td></tr>`;
      }
      if (period === 4) {
        body += `<tr class="tt-break-row"><th>Lunch</th><td colspan="${days.length}">1:15 – 2:15 PM</td></tr>`;
      }
    }
    body += "</tbody>";

    table.innerHTML = head + body;
  }

  function renderSubjects(subjects) {
    const list = $("subjectsList");
    if (!subjects.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-state__icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          </span>
          <strong>No subjects recorded yet</strong>
          <p>Your subject breakdown will appear after your first class.</p>
        </div>`;
      return;
    }

    list.innerHTML = subjects
      .map((subject) => {
        const low = subject.status === "below";
        const statusText = low ? "Below target" : "On track";
        let footNote = "At the 75% line";
        if (low) {
          footNote = `${safeSolo(subject.must_attend)} to reach 75%`;
        } else if (subject.can_skip > 0) {
          footNote = `${safeSolo(subject.can_skip)} safely skippable`;
        }
        const width = Math.max(0, Math.min(100, Number(subject.percentage) || 0));
        return `
          <div class="subject-item ${low ? "is-low" : "is-safe"}" style="--bar:${width}%">
            <div class="subject-top">
              <div class="subject-title">
                <span class="subject-code">${escapeHTML(subject.code)}</span>
                <div>
                  <strong>${escapeHTML(subject.name)}</strong>
                  <small>${subject.attended} of ${subject.total} periods attended</small>
                </div>
              </div>
              <div class="subject-value">
                <strong>${formatPercent(subject.percentage)}</strong>
                <span class="subject-tag">${statusText}</span>
              </div>
            </div>
            <div class="subject-progress"><span></span></div>
            <div class="subject-foot">
              <span>${subject.attended} attended · ${subject.absent} missed</span>
              <span>${escapeHTML(footNote)}</span>
            </div>
          </div>`;
      })
      .join("");
  }

  function renderRecent(recent) {
    const list = $("recentList");
    if (!recent.length) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-state__icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4.5h14v16H5zM8 8h8M8 12h8M8 16h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </span>
          <strong>No classes recorded</strong>
          <p>Recent attendance will appear here once your teacher saves a roll call.</p>
        </div>`;
      return;
    }

    list.innerHTML = recent
      .slice(0, 9)
      .map((item) => {
        const holiday = item.status === "holiday";
        const present = item.status === "present";
        const label = holiday ? "Holiday" : present ? "Present" : "Absent";
        const mood = holiday ? "is-holiday" : present ? "is-present" : "is-absent";
        const icon = holiday
          ? '<svg viewBox="0 0 20 20" fill="none"><rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 3v3M13.5 3v3M3 8h14M10 10.5l1.1 2.2 2.4.3-1.8 1.7.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.7 2.4-.3L10 10.5Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>'
          : present
            ? '<svg viewBox="0 0 20 20" fill="none"><path d="M4 10.5l3.8 3.7L16 5.7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            : '<svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
        const span = Number(item.span) || 1;
        return `
          <div class="activity-item ${holiday ? "is-holiday" : ""}">
            <span class="activity-icon ${mood}" aria-hidden="true">${icon}</span>
            <div class="activity-main">
              <strong>${escapeHTML(item.subject_name)}</strong>
              <span>${escapeHTML(formatDate(item.date))} · ${periodRange(item.period, span)}${span > 1 ? ` · ${spanWords(span)}` : ""}${item.teacher_name ? ` · ${escapeHTML(item.teacher_name)}${item.is_substitution ? " · substitute" : ""}` : ""}</span>
            </div>
            <span class="activity-status ${mood}">${label}</span>
          </div>`;
      })
      .join("");
  }

  function render(data) {
    state.data = data;
    const student = data.student;
    const overall = data.overall;
    const campus = data.campus || {};

    setText("studentName", student.name);
    setText("studentReg", student.register_no);
    setText("footerStudent", student.register_no);
    setText("studentAvatar", initials(student.name));
    setText("firstName", student.name.split(/\s+/)[0]);
    setText(
      "classLine",
      `${campus.short ? `${campus.short} · ` : ""}${student.class_name} · ${student.semester}`
    );
    setText(
      "campusLine",
      `${campus.short || "GVP IHLR"}${campus.school ? ` · ${campus.school}` : ""}`
    );
    setText("updatedAt", `Updated ${formatTime(data.updated_at)}`);
    setText("lastChecked", formatTime(new Date().toISOString()));
    setText("attendedCount", overall.attended);
    setText("totalCount", overall.total);
    setText("absentCount", overall.absent);

    const hero = $("studentHero");
    hero.dataset.state = overall.status;
    checkFirstLoginPassword(student);
    setRing(overall.percentage);
    setRingPercent(overall.percentage);

    if (overall.status === "on_track") {
      setText("statusPill", "On track · 75%+");
      if (overall.can_skip > 0) {
        setText("heroHeading", "You're above the line. Breathe easy.");
        setText(
          "heroSub",
          `You've attended ${overall.attended} of ${overall.total} periods. You can safely miss ${safeSolo(overall.can_skip)} and stay at or above 75%.`
        );
      } else {
        setText("heroHeading", "You're right at the 75% line.");
        setText(
          "heroSub",
          `You've attended ${overall.attended} of ${overall.total} periods. You're right on target, but there is no skip cushion yet.`
        );
      }
    } else if (overall.status === "below") {
      setText("statusPill", "Below 75% requirement");
      setText("heroHeading", "Let's get you back above the line.");
      setText(
        "heroSub",
        `You've attended ${overall.attended} of ${overall.total} periods. Attend the next ${safeSolo(overall.must_attend)} and your overall attendance will reach 75%.`
      );
    } else {
      setText("statusPill", "No attendance recorded");
      setText("heroHeading", "Your attendance starts with the first class.");
      setText(
        "heroSub",
        "Once your teacher saves the first roll call, your live percentage and planning guidance will appear here."
      );
    }

    renderGuidance(data);
    renderToday(data.today);
    renderTimetable(data.timetable);
    renderSubjects(data.subjects);
    renderRecent(data.recent);
    $("pageError").hidden = true;
  }

  function showError(message, silent = false) {
    if (silent) {
      setText("updatedAt", "Live update paused — retrying");
      return;
    }
    const error = $("pageError");
    error.hidden = false;
    error.querySelector("span").textContent = message;
    toast(message, "error");
  }

  async function load({ silent = false } = {}) {
    if (state.loading) return;
    state.loading = true;
    const refreshButton = $("refreshButton");
    if (!silent) refreshButton?.classList.add("is-spinning");

    try {
      const data = await api.get("/api/student/overview");
      render(data);
    } catch (error) {
      showError(error.message, silent);
    } finally {
      state.loading = false;
      refreshButton?.classList.remove("is-spinning");
    }
  }

  $("refreshButton")?.addEventListener("click", () => load());
  $("retryButton")?.addEventListener("click", () => load());
  initBunkCalculator();

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) load({ silent: true });
  });

  state.pollTimer = window.setInterval(() => {
    if (!document.hidden) load({ silent: true });
  }, 15000);

  function checkFirstLoginPassword(student) {
    const modal = $("modalFirstLoginPassword");
    if (student?.must_change_password && modal) {
      modal.style.display = "flex";
      modal.hidden = false;
    }
  }

  const formFirstLogin = $("formFirstLoginPassword");
  const firstError = $("firstLoginError");
  const btnFirstSubmit = $("btnSubmitFirstLoginPassword");

  formFirstLogin?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (firstError) {
      firstError.hidden = true;
      firstError.style.display = "none";
    }
    const p1 = $("firstNewPassword")?.value || "";
    const p2 = $("firstConfirmPassword")?.value || "";
    if (p1.length < 8) {
      if (firstError) {
        firstError.hidden = false;
        firstError.style.display = "block";
        firstError.textContent = "Password must be at least 8 characters long.";
      }
      return;
    }
    if (p1 !== p2) {
      if (firstError) {
        firstError.hidden = false;
        firstError.style.display = "block";
        firstError.textContent = "Passwords do not match. Please re-enter.";
      }
      return;
    }
    setButtonLoading(btnFirstSubmit, true);
    if (btnFirstSubmit) btnFirstSubmit.textContent = "Saving & Forwarding…";
    try {
      const res = await api.post("/api/first-login/change-password", {
        new_password: p1,
        confirm_password: p2,
      });
      const modal = $("modalFirstLoginPassword");
      if (modal) {
        modal.style.display = "none";
        modal.hidden = true;
      }
      try {
        sessionStorage.setItem(
          "rollcall_just_set_password",
          res.message || "Password updated successfully! Welcome to your dashboard."
        );
      } catch (_) {}
      // Forward directly into the student dashboard
      window.location.replace("/student");
    } catch (err) {
      if (firstError) {
        firstError.hidden = false;
        firstError.style.display = "block";
        firstError.textContent = err.message || "Failed to update password.";
      }
      setButtonLoading(btnFirstSubmit, false);
      if (btnFirstSubmit) btnFirstSubmit.textContent = "Save Password & Continue →";
    }
  });

  // Check if student just completed first-time password setup and show success toast
  try {
    const welcomeMsg = sessionStorage.getItem("rollcall_just_set_password");
    if (welcomeMsg) {
      sessionStorage.removeItem("rollcall_just_set_password");
      window.RollCall?.toast(welcomeMsg, "success");
    }
  } catch (_) {}

  load();
})();
