(() => {
  "use strict";

  const {
    api,
    toast,
    escapeHTML,
    initials,
    formatPercent,
    formatDate,
    formatLongDate,
    formatTime,
    plural,
    setButtonLoading,
  } = window.RollCall;

  const $ = (id) => document.getElementById(id);

  const state = {
    data: null,
    classes: [],
    assignments: [],
    timetable: [],
    todaySlots: [],
    today: null,
    view: "overview",
    initialized: false,
    recordsLoaded: false,
    studentsLoaded: false,
    roster: null,
    statuses: new Map(),
    selected: null,
    holiday: false,
    sessionId: null,
    isExisting: false,
    dirty: false,
    search: "",
    loadingRoster: false,
    rosterSeq: 0,
    loadingRecords: false,
    recordsSeq: 0,
    loadingStudents: false,
    studentsSeq: 0,
  };

  const setText = (id, value) => {
    const node = $(id);
    if (node) node.textContent = value;
  };

  const teacherFirstName = (name) => {
    const cleaned = String(name || "").replace(/^(prof\.?|dr\.?|mr\.?|mrs\.?|ms\.?)\s+/i, "").trim();
    return cleaned.split(/\s+/)[0] || "Professor";
  };

  /* ---------------------------------------------------------
     Timetable helpers
     --------------------------------------------------------- */
  function addDays(dateStr, delta) {
    const date = new Date(`${dateStr}T00:00:00`);
    date.setDate(date.getDate() + delta);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function weekdayIndex(dateStr) {
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return -1;
    return (date.getDay() + 6) % 7;
  }

  function dayFor(dateStr) {
    const index = weekdayIndex(dateStr);
    return state.timetable.find((day) => day.weekday === index) || null;
  }

  function slotsForDate(dateStr) {
    const day = dayFor(dateStr);
    return day ? day.slots : [];
  }

  function slotFor(dateStr, { subjectId = null, period = null } = {}) {
    return (
      slotsForDate(dateStr).find(
        (slot) =>
          (subjectId === null || slot.subject_id === Number(subjectId)) &&
          (period === null || slot.period === Number(period))
      ) || null
    );
  }

  function findMostRecentSlot(subjectId, period = null) {
    for (let offset = 0; offset < 7; offset += 1) {
      const date = addDays(state.today, -offset);
      const slot = slotFor(date, { subjectId, period });
      if (slot) return { date, slot };
    }
    return null;
  }

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
    return "";
  }

  function applyHolidayFlags() {
    const todayDay = dayFor(state.today);
    if (!todayDay) return;
    const flags = new Map(
      state.todaySlots.map((slot) => [slot.period, Boolean(slot.is_holiday)])
    );
    todayDay.slots.forEach((slot) => {
      slot.is_holiday = flags.get(slot.period) || false;
    });
  }

  /* ---------------------------------------------------------
     Dashboard data
     --------------------------------------------------------- */
  async function loadSecurityCard() {
    const card = $("securityCard");
    if (!card) return;
    try {
      const data = await api.get("/api/admin/security");
      const escape = window.RollCall.escapeHTML;
      $("securityStudentCount").textContent = data.totals.students_pending;
      $("securityTeacherCount").textContent = data.totals.teachers_pending;
      $("securityStudentList").innerHTML = data.students.length
        ? data.students.map((s) => `<li><b>${escape(s.register_no)}</b> · ${escape(s.name)}</li>`).join("")
        : '<li class="security-card__none">Every student has changed password 🎉</li>';
      $("securityTeacherList").innerHTML = data.teachers.length
        ? data.teachers.map((t) => `<li><b>${escape(t.employee_id)}</b> · ${escape(t.name)}</li>`).join("")
        : '<li class="security-card__none">All teachers have rotated 🎉</li>';
      const total = data.totals.students_pending + data.totals.teachers_pending;
      $("securitySummary").textContent = total ? `${total} account(s) pending` : "All rotated";
      card.hidden = false;
    } catch {
      card.hidden = true;
    }
  }

  async function loadDashboard({ silent = false } = {}) {
    try {
      const data = await api.get("/api/teacher/overview");
      state.data = data;
      state.classes = data.classes || [];
      state.assignments = data.assignments || [];
      state.timetable = data.timetable || [];
      state.today = data.server_date;
      state.todaySlots = data.today ? data.today.slots : [];
      applyHolidayFlags();
      renderOverview(data);
      if (data.admin_view) loadSecurityCard();
      if (!state.initialized) {
        initializeMarkControls();
        initializeRecordFilters();
        initializeStudentsControls();
        initializeStudentsExport();
        state.initialized = true;
      } else if (state.view === "mark") {
        renderMarkSlots();
      }
      $("pageError").hidden = true;
      return data;
    } catch (error) {
      if (!silent) {
        $("pageError").hidden = false;
        toast(error.message, "error");
      }
      return null;
    }
  }

  function renderOverview(data) {
    const teacher = data.teacher;
    const stats = data.stats;
    const today = data.server_date;
    const campus = data.campus || {};

    setText("teacherName", teacher.name);
    setText("teacherDepartment", teacher.email || teacher.department);
    setText("teacherAvatar", initials(teacher.name));
    setText("teacherFirstName", teacherFirstName(teacher.name));
    setText(
      "teacherClassLine",
      `${stats.classes} ${plural(stats.classes, "class", "classes")} · ${stats.students} ${plural(stats.students, "student")}${campus.short ? ` · ${campus.short}` : ""}`
    );
    setText("teacherUpdatedAt", "Status updated");

    setText("statClasses", stats.classes);
    setText(
      "statClassesNote",
      `${stats.classes} ${plural(stats.classes, "section")} assigned`
    );
    setText("statStudents", stats.students);
    setText("statSessions", stats.sessions_today);
    setText(
      "statSessionsNote",
      `${stats.sessions_today} ${plural(stats.sessions_today, "roll call")} saved today`
    );
    setText(
      "statPercentage",
      stats.percentage_today === null ? "—" : formatPercent(stats.percentage_today)
    );
    setText(
      "statPercentageNote",
      stats.marked_today
        ? `${stats.marked_today} ${plural(stats.marked_today, "mark")} recorded today`
        : "No records yet today"
    );

    setText("todayLabel", formatLongDate(today));
    const percentage = stats.percentage_today;
    $("todayRing").style.setProperty("--value", percentage === null ? 0 : percentage);
    setText(
      "todayPercentage",
      percentage === null ? "—" : formatPercent(percentage)
    );
    setText("todaySessions", stats.sessions_today);
    setText("todayMarked", stats.marked_today);

    if (percentage === null) {
      setText("todayHeadline", "A clean slate.");
      setText(
        "todayCopy",
        "No roll calls have been saved for today yet. Pick a period and take attendance."
      );
      setText("todayStartButton", "Mark today's first class");
    } else if (percentage >= 75) {
      setText("todayHeadline", "The room showed up.");
      setText(
        "todayCopy",
        `${stats.marked_today} marks saved today, with ${formatPercent(percentage)} present overall.`
      );
      setText("todayStartButton", "Take another attendance");
    } else {
      setText("todayHeadline", "A few empty seats today.");
      setText(
        "todayCopy",
        `${formatPercent(percentage)} of today's saved marks are present. You can update a record any time.`
      );
      setText("todayStartButton", "Take another attendance");
    }

    renderClasses(data.classes);
    renderTodayTimetable();
    renderSessionTable($("recentSessionsBody"), data.recent_sessions, {
      emptyMessage: "No roll calls yet. Take attendance and it will show up here.",
    });
  }

  function renderClasses(classes) {
    const container = $("classListOverview");
    if (!classes.length) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-state__icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 19.5h16M5.5 16V8.8L12 4l6.5 4.8V16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <strong>No classes assigned</strong>
          <p>Ask an administrator to assign your classes and subjects.</p>
        </div>`;
      return;
    }

    container.innerHTML = classes
      .map(
        (classItem) => `
        <div class="class-group">
          <div class="class-group__head">
            <div class="class-id">
              <span class="class-code">${escapeHTML(classItem.code)}</span>
              <div>
                <strong>${escapeHTML(classItem.name)}</strong>
                <span>${classItem.student_count} ${plural(classItem.student_count, "student")} · ${escapeHTML(classItem.semester)}</span>
              </div>
            </div>
            <span class="class-count">${classItem.subjects.length} ${plural(classItem.subjects.length, "subject")}</span>
          </div>
          <div class="class-subjects">
            ${classItem.subjects
              .map(
                (subject) => `
              <button class="subject-launch" type="button" data-open-mark data-class-id="${classItem.id}" data-subject-id="${subject.id}">
                <span class="subject-launch__code">${escapeHTML(subject.code)}</span>
                <span class="subject-launch__name">${escapeHTML(subject.name)}</span>
                <span class="subject-launch__arrow" aria-hidden="true">→</span>
              </button>`
              )
              .join("")}
          </div>
        </div>`
      )
      .join("");
  }

  function renderTodayTimetable() {
    const container = $("todayTimetable");
    if (!container) return;
    const slots = state.todaySlots;
    const dayName = state.data && state.data.today ? state.data.today.day : "";

    setText(
      "todayTimetableTitle",
      dayName ? `${dayName} · ${formatDate(state.today)}` : "No classes today"
    );
    setText(
      "todayTimetableCount",
      slots.length ? `${slots.length} ${plural(slots.length, "period")}` : "—"
    );

    if (!slots.length) {
      container.innerHTML = `
        <div class="tt-strip__empty">
          <strong>No classes scheduled for today.</strong>
          <span>Your weekly timetable resumes on the next working day.</span>
        </div>`;
      return;
    }

    container.innerHTML = slots
      .map((slot) => {
        const kind = slotKind(slot.span);
        const available = slot.can_mark || slot.can_substitute;
        return `
          <button class="tt-strip__slot ${available ? "" : "is-locked"} ${slot.can_substitute ? "is-substitute" : ""} ${slot.is_holiday ? "is-holiday" : ""}" type="button"
            data-today-slot data-subject-id="${slot.subject_id}" data-period="${slot.period}" data-can-mark="${slot.can_mark ? 1 : 0}" data-can-substitute="${slot.can_substitute ? 1 : 0}">
            <span class="tt-strip__time">${escapeHTML(slot.time_label)}</span>
            <span class="tt-strip__subject"><b>${escapeHTML(slot.subject_code)}</b> ${escapeHTML(slot.subject_name)}</span>
            <span class="tt-strip__meta">${escapeHTML(slot.period_label)} · ${escapeHTML(slot.faculty || "—")}${slot.span > 1 ? ` · ${spanWords(slot.span)}` : ""}</span>
            ${slot.is_holiday ? '<span class="holiday-chip">Holiday</span>' : ""}
            ${slot.can_substitute ? '<span class="tt-strip__sub">Substitute</span>' : ""}
            ${kind && !slot.is_holiday && !slot.can_substitute ? `<span class="tt-strip__kind">${escapeHTML(kind)}</span>` : ""}
          </button>`;
      })
      .join("");
  }

  function sessionRow(session) {
    const holiday = Boolean(session.is_holiday);
    const span = Number(session.span) || 1;
    const periodLabel = periodRange(session.period, span);
    const low = !holiday && Number(session.percentage) < 75;
    return `
      <tr class="${holiday ? "is-holiday" : ""}">
        <td>
          <span class="table-date">${escapeHTML(formatDate(session.date))}</span>
          <span class="table-sub">${session.updated_at ? "Status updated" : "—"}</span>
        </td>
        <td><span class="table-class">${escapeHTML(session.class_code)}</span></td>
        <td><span class="table-subject" title="${escapeHTML(session.subject_name)}">${escapeHTML(session.subject_name)}</span>${
          session.teacher_name
            ? `<span class="table-sub">${escapeHTML(session.teacher_name)}${session.is_substitution ? " · substitute" : ""}</span>`
            : ""
        }</td>
        <td><span class="period-chip" title="${escapeHTML(spanWords(span))}">${periodLabel}</span></td>
        <td>${
          holiday
            ? '<span class="holiday-chip">Holiday</span>'
            : `<span class="present-summary"><b>${session.present}</b> present · ${session.absent} absent</span>`
        }</td>
        <td>${
          holiday
            ? '<span class="table-attendance is-holiday">Not counted</span>'
            : `<span class="table-attendance ${low ? "is-low" : ""}">${formatPercent(session.percentage)}</span>`
        }</td>
        <td>
          <button class="table-action" type="button" data-edit-attendance
            data-class-id="${session.class_id}" data-subject-id="${session.subject_id}"
            data-date="${escapeHTML(session.date)}" data-period="${session.period}">
            ${holiday ? "View" : "Edit"}
          </button>
        </td>
      </tr>`;
  }

  function renderSessionTable(tbody, sessions, options = {}) {
    if (!tbody) return;
    if (!sessions || !sessions.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="table-empty">
            <strong>No attendance records yet</strong>
            <p>${escapeHTML(options.emptyMessage || "Saved roll calls will appear here.")}</p>
          </td>
        </tr>`;
      return;
    }
    tbody.innerHTML = sessions.map(sessionRow).join("");
  }

  function showPageError(message) {
    const error = $("pageError");
    if (error) {
      error.hidden = false;
      error.querySelector("span").textContent = message;
    }
    toast(message, "error");
  }

  /* ---------------------------------------------------------
     View switching
     --------------------------------------------------------- */
  function switchView(view, { autoLoad = true, scroll = true } = {}) {
    if (!["overview", "mark", "records", "students"].includes(view)) return;
    state.view = view;

    document.querySelectorAll(".teacher-view").forEach((section) => {
      section.hidden = section.id !== `view-${view}`;
    });

    document.querySelectorAll("#teacherTabs .app-tab").forEach((tab) => {
      const active = tab.dataset.view === view;
      tab.classList.toggle("is-active", active);
      if (active) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });

    if (view === "records" && autoLoad) loadRecords();
    if (view === "students" && autoLoad && !state.studentsLoaded) loadStudents();
    if (view === "mark" && autoLoad) {
      if (!state.selected) {
        selectFirstMarkable($("markDate").value || state.today);
      } else if (!state.roster) {
        loadRoster();
      }
    }

    if (scroll) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function openMark({
    classId = null,
    subjectId = null,
    date = null,
    period = null,
  } = {}) {
    if (!state.initialized) return;
    const targetClass = Number(classId) || (state.classes[0] && state.classes[0].id);
    if (!targetClass) {
      toast("No classes are assigned to your account yet.", "error");
      return;
    }

    let targetDate = date || state.today;
    let slot = null;
    if (subjectId) {
      slot = slotFor(targetDate, { subjectId, period });
      if (!slot) {
        const found = findMostRecentSlot(Number(subjectId), period);
        if (found) {
          targetDate = found.date;
          slot = found.slot;
        }
      }
    } else if (period) {
      slot = slotFor(targetDate, { period });
    }

    state.selected = null;
    switchView("mark", { autoLoad: false, scroll: false });
    $("markDate").value = targetDate;

    if (subjectId && !slot) {
      renderMarkSlots();
      setRosterPrompt("That subject has no scheduled class in the last week.");
      toast("No recent scheduled class found for that subject.", "error");
      return;
    }

    if (slot) {
      if (!slot.can_mark && !slot.can_substitute) {
        renderMarkSlots();
        setRosterPrompt("That period is taught by another faculty member.");
        toast("That period is not assigned to you.", "error");
        return;
      }
      state.selected = {
        ...slot,
        date: targetDate,
        classId: targetClass,
        substitute: !slot.can_mark && Boolean(slot.can_substitute),
      };
      renderMarkSlots();
      await loadRoster();
    } else {
      renderMarkSlots();
      selectFirstMarkable(targetDate, targetClass);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openDefaultMark() {
    if (!state.classes.length) {
      toast("No classes are assigned to your account yet.", "error");
      return;
    }
    openMark({ classId: state.classes[0].id });
  }

  /* ---------------------------------------------------------
     Mark controls
     --------------------------------------------------------- */
  function initializeMarkControls() {
    const dateInput = $("markDate");
    dateInput.max = state.today;
    dateInput.value = state.today;
    renderMarkSlots();
  }

  function renderMarkSlots() {
    const grid = $("markSlots");
    if (!grid) return;
    const date = $("markDate").value || state.today;
    const day = dayFor(date);
    const slots = day ? day.slots : [];

    setText(
      "slotPickerTitle",
      day ? `${day.day} · ${formatDate(date)}` : "No timetable for this day"
    );
    setText(
      "slotPickerMeta",
      slots.length
        ? `${slots.length} ${plural(slots.length, "period")} scheduled`
        : "No classes scheduled"
    );

    if (!slots.length) {
      grid.innerHTML = `
        <div class="slot-empty">
          <strong>No classes on this day.</strong>
          <span>Pick another date to see its timetable.</span>
        </div>`;
      return;
    }

    grid.innerHTML = slots
      .map((slot) => {
        const selected =
          state.selected &&
          state.selected.date === date &&
          state.selected.period === slot.period &&
          state.selected.subject_id === slot.subject_id;
        const kind = slotKind(slot.span);
        const available = slot.can_mark || slot.can_substitute;
        return `
          <button class="slot-card ${selected ? "is-selected" : ""} ${available ? "" : "is-locked"} ${slot.can_substitute ? "is-substitute" : ""} ${slot.is_holiday ? "is-holiday" : ""}" type="button"
            data-slot data-subject-id="${slot.subject_id}" data-period="${slot.period}" data-can-mark="${slot.can_mark ? 1 : 0}" data-can-substitute="${slot.can_substitute ? 1 : 0}"
            ${available ? "" : "disabled"}>
            <span class="slot-card__top">
              <span class="slot-card__period">${escapeHTML(slot.period_label)}</span>
              <span class="slot-card__time">${escapeHTML(slot.time_label)}</span>
            </span>
            <span class="slot-card__subject"><b>${escapeHTML(slot.subject_code)}</b>${escapeHTML(slot.subject_name)}</span>
            <span class="slot-card__meta">
              ${escapeHTML(slot.faculty || "—")}
              ${slot.span > 1 ? ` · <span class="slot-span">${escapeHTML(kind || spanWords(slot.span))} · ${spanWords(slot.span)}</span>` : ""}
            </span>
            ${slot.is_holiday ? '<span class="slot-card__tag">Holiday</span>' : ""}
            ${slot.can_substitute ? '<span class="slot-card__tag slot-card__tag--sub">Substitute</span>' : ""}
            ${available ? "" : '<span class="slot-card__tag slot-card__tag--muted">Not your subject</span>'}
          </button>`;
      })
      .join("");
  }

  function setRosterPrompt(message) {
    state.roster = null;
    state.holiday = false;
    state.isExisting = false;
    const card = $("rosterCard");
    card.dataset.state = "prompt";
    card.dataset.holiday = "false";
    $("holidayBanner").hidden = true;
    $("holidayButton").disabled = true;
    $("holidayButton").classList.remove("is-active");
    setText("holidayButtonText", "Mark as holiday");
    setText("rosterKicker", "SELECT A PERIOD");
    setText("rosterTitle", "Pick a period above.");
    setText("rosterSubtitle", message || "Choose a period from the timetable to load the roster.");
    $("rosterList").innerHTML = `<div class="roster-empty">${escapeHTML(
      message || "Choose a period from the timetable to load the roster."
    )}</div>`;
    const saveState = $("saveState");
    saveState.classList.remove("is-existing", "is-dirty", "is-holiday");
    setText("saveState", "Not started");
    $("saveAttendanceButton").disabled = true;
    setText("saveButtonText", "Save attendance");
    setText("saveSummary", "0 present · 0 absent");
    setText("saveHelp", "Choose a period to begin.");
    setText("presentCount", "0");
    setText("absentCount", "0");
  }

  function selectFirstMarkable(date, classId = null) {
    const targetClass = Number(classId) || (state.classes[0] && state.classes[0].id);
    if (!targetClass) {
      setRosterPrompt("No class is assigned to your account.");
      return;
    }
    const slot = slotsForDate(date).find((item) => item.can_mark);
    if (!slot) {
      state.selected = null;
      renderMarkSlots();
      setRosterPrompt("You have no scheduled classes to mark on this date.");
      return;
    }
    state.selected = { ...slot, date, classId: targetClass };
    renderMarkSlots();
    loadRoster();
  }

  function handleDateChange() {
    let date = $("markDate").value || state.today;
    if (date > state.today) {
      toast("Attendance cannot be recorded for a future date.", "error");
      date = state.today;
      $("markDate").value = date;
    }
    state.selected = null;
    renderMarkSlots();
    selectFirstMarkable(date);
  }

  function selectedMarkParams() {
    return {
      classId:
        (state.selected && state.selected.classId) ||
        (state.classes[0] && state.classes[0].id),
      subjectId: state.selected ? state.selected.subject_id : null,
      date: $("markDate").value || state.today,
      period: state.selected ? state.selected.period : null,
      substitute: Boolean(state.selected && state.selected.substitute),
    };
  }

  function holidayPanel() {
    return `
      <div class="holiday-panel">
        <span class="holiday-panel__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="5.5" width="16" height="14" rx="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 3.5v4M16 3.5v4M4 10h16M12 13l1.4 2.8 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4L12 13Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
        </span>
        <strong>No roll call needed for this period.</strong>
        <p>It is saved as a holiday, so it will not count as present, absent, or toward anyone's 75% requirement.</p>
      </div>`;
  }

  /* ---------------------------------------------------------
     Roster
     --------------------------------------------------------- */
  async function loadRoster() {
    if (!state.initialized) return;
    const params = selectedMarkParams();
    if (!params.classId || !params.subjectId || !params.period) {
      setRosterPrompt("Choose a period from the timetable.");
      return;
    }
    if (!params.date) return;
    if (params.date > state.today) {
      toast("Attendance cannot be recorded for a future date.", "error");
      $("markDate").value = state.today;
      params.date = state.today;
    }

    const seq = ++state.rosterSeq;
    state.loadingRoster = true;
    state.dirty = false;
    state.search = "";
    $("rosterSearch").value = "";
    $("rosterCard").dataset.state = "loading";
    $("saveAttendanceButton").disabled = true;
    $("holidayButton").disabled = true;
    $("holidayBanner").hidden = true;
    $("rosterList").innerHTML = `
      <div class="roster-loading">
        <div class="skeleton skeleton--row"></div>
        <div class="skeleton skeleton--row"></div>
        <div class="skeleton skeleton--row"></div>
      </div>`;
    setText("saveState", "Loading roster");
    $("saveState").classList.remove("is-existing", "is-dirty", "is-holiday");
    setText("rosterKicker", "LOADING PERIOD");
    setText("rosterTitle", "Fetching the student roster…");
    setText("rosterSubtitle", "This will only take a moment.");
    setText("saveHelp", "Loading students and any saved attendance.");

    const query = new URLSearchParams({
      class_id: params.classId,
      subject_id: params.subjectId,
      date: params.date,
      period: params.period,
      substitute: params.substitute ? 1 : 0,
    });

    try {
      const roster = await api.get(`/api/teacher/roster?${query}`);
      if (seq !== state.rosterSeq) return;
      state.roster = roster;
      state.sessionId = roster.session_id;
      state.isExisting = roster.is_existing;
      state.holiday = Boolean(roster.is_holiday);
      state.selected = {
        ...(state.selected || {}),
        classId: roster.class.id,
        subject_id: roster.subject.id,
        subject_code: roster.subject.code,
        subject_name: roster.subject.name,
        date: roster.date,
        period: roster.period,
        span: roster.span,
        period_label: roster.period_label,
        time_label: roster.time_label,
        faculty: roster.faculty,
        substitute: Boolean(roster.is_substitution),
      };
      state.statuses = new Map(
        roster.students.map((student) => [
          student.id,
          student.status === "absent" ? "absent" : "present",
        ])
      );
      renderRoster();
    } catch (error) {
      if (seq !== state.rosterSeq) return;
      state.roster = null;
      state.holiday = false;
      $("rosterCard").dataset.state = "error";
      $("rosterCard").dataset.holiday = "false";
      setText("rosterTitle", "Could not load the roster.");
      setText("rosterSubtitle", error.message);
      $("rosterList").innerHTML = `
        <div class="roster-empty">Try another period or date, then select it again.</div>`;
      setText("saveState", "Not loaded");
      setText("saveButtonText", "Save attendance");
      $("saveAttendanceButton").disabled = true;
      $("holidayButton").disabled = true;
      toast(error.message, "error");
    } finally {
      state.loadingRoster = false;
    }
  }

  function statusButtons(studentId, status) {
    return `
      <div class="status-toggle" role="group" aria-label="Attendance status">
        <button class="status-btn ${status === "present" ? "is-selected" : ""}" type="button"
          data-student-id="${studentId}" data-status="present" aria-pressed="${status === "present"}">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8.3l3 3 7-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Present
        </button>
        <button class="status-btn ${status === "absent" ? "is-selected" : ""}" type="button"
          data-student-id="${studentId}" data-status="absent" aria-pressed="${status === "absent"}">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          Absent
        </button>
      </div>`;
  }

  function renderRoster() {
    const roster = state.roster;
    if (!roster) return;
    const card = $("rosterCard");
    const kind = slotKind(roster.span);
    card.dataset.state = "ready";
    card.dataset.holiday = state.holiday ? "true" : "false";

    setText(
      "rosterKicker",
      `${roster.class.code} · ${roster.subject.code}${kind ? ` · ${kind}` : ""}${roster.is_substitution ? " · Substitute" : ""}${state.holiday ? " · Holiday" : ""}`
    );
    setText("rosterTitle", roster.subject.name);
    const coverNote =
      roster.is_substitution && roster.scheduled_teacher_name
        ? `Covering for ${roster.scheduled_teacher_name} · `
        : roster.faculty
          ? `${roster.faculty} · `
          : "";
    setText(
      "rosterSubtitle",
      `${coverNote}${formatLongDate(roster.date)} · ${roster.period_label} · ${roster.time_label}`
    );

    const saveState = $("saveState");
    saveState.classList.toggle("is-existing", !state.holiday && roster.is_existing);
    saveState.classList.remove("is-dirty");
    saveState.classList.toggle("is-holiday", state.holiday);

    $("holidayButton").disabled = false;
    $("holidayButton").classList.toggle("is-active", state.holiday);
    setText(
      "holidayButtonText",
      state.holiday ? "Take attendance instead" : "Mark as holiday"
    );
    $("holidayBanner").hidden = !state.holiday;
    $("rosterSearch").value = "";

    if (state.holiday) {
      setText("saveState", "Holiday");
      setText("presentCount", "—");
      setText("absentCount", "—");
      setText("saveButtonText", "Holiday saved");
      setText("saveSummary", "Holiday · excluded from attendance");
      setText(
        "saveHelp",
        "Switch to attendance if the class actually happened."
      );
      $("saveAttendanceButton").disabled = true;
      $("rosterList").innerHTML = holidayPanel();
      filterRoster();
      return;
    }

    setText(
      "saveState",
      roster.is_existing ? "Editing saved roll call" : "New roll call"
    );

    const list = $("rosterList");
    if (!roster.students.length) {
      list.innerHTML = `<div class="roster-empty">This class has no active students.</div>`;
      $("saveAttendanceButton").disabled = true;
      updateRosterCounts();
      return;
    }

    list.innerHTML =
      roster.students
        .map((student, index) => {
          const status = state.statuses.get(student.id) || "present";
          return `
            <div class="roster-row ${status === "absent" ? "is-absent" : ""}" data-student-row="${student.id}"
              data-search="${escapeHTML(`${student.name} ${student.register_no}`.toLowerCase())}">
              <span class="roster-index">${String(index + 1).padStart(2, "0")}</span>
              <span class="avatar" aria-hidden="true">${escapeHTML(initials(student.name))}</span>
              <div class="roster-student">
                <strong>${escapeHTML(student.name)}</strong>
                <span>${escapeHTML(student.register_no)}</span>
              </div>
              ${statusButtons(student.id, status)}
            </div>`;
        })
        .join("") +
      `<div class="roster-empty" id="rosterSearchEmpty" hidden>No student matches that search.</div>`;

    setText(
      "saveButtonText",
      roster.is_existing ? "Update attendance" : "Save attendance"
    );
    $("saveAttendanceButton").disabled = false;
    setText(
      "saveHelp",
      roster.is_existing
        ? "Attendance taken. Changes update students immediately."
        : "Everyone starts present. Tap a student to mark them absent."
    );
    updateRosterCounts();
    filterRoster();
  }

  function updateRosterCounts() {
    if (!state.roster) return;
    const total = state.roster.students.length;
    let present = 0;
    state.statuses.forEach((status) => {
      if (status === "present") present += 1;
    });
    const absent = total - present;
    setText("presentCount", present);
    setText("absentCount", absent);
    setText("saveSummary", `${present} present · ${absent} absent`);
  }

  function updateRowStatus(row, status) {
    if (!row) return;
    row.classList.toggle("is-absent", status === "absent");
    row.querySelectorAll(".status-btn").forEach((button) => {
      const active = button.dataset.status === status;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function markDirty() {
    state.dirty = true;
    setText("saveState", "Unsaved changes");
    const saveState = $("saveState");
    saveState.classList.remove("is-existing", "is-holiday");
    saveState.classList.add("is-dirty");
    setText(
      "saveHelp",
      "Unsaved changes — save to update every student's dashboard."
    );
  }

  function filterRoster() {
    const query = state.search.trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll(".roster-row").forEach((row) => {
      const matches = !query || row.dataset.search.includes(query);
      row.hidden = !matches;
      if (matches) visible += 1;
    });
    const empty = $("rosterSearchEmpty");
    if (empty) empty.hidden = visible !== 0;
  }

  /* ---------------------------------------------------------
     Save attendance / holiday
     --------------------------------------------------------- */
  async function saveAttendance() {
    if (!state.roster || state.loadingRoster || state.holiday) return;
    const params = selectedMarkParams();
    if (!params.classId || !params.subjectId || !params.period) return;
    const records = state.roster.students.map((student) => ({
      student_id: student.id,
      status: state.statuses.get(student.id) || "present",
    }));
    const button = $("saveAttendanceButton");
    setButtonLoading(button, true);

    try {
      const result = await api.post("/api/teacher/attendance", {
        class_id: params.classId,
        subject_id: params.subjectId,
        date: params.date,
        period: params.period,
        substitute: params.substitute,
        records,
      });
      state.isExisting = true;
      state.holiday = false;
      state.roster.is_holiday = false;
      state.sessionId = result.session_id;
      state.dirty = false;
      state.roster.is_existing = true;
      state.roster.updated_at = new Date().toISOString();
      renderRoster();
      setText("saveState", "Saved just now");
      $("saveState").classList.add("is-existing");
      $("saveState").classList.remove("is-dirty", "is-holiday");
      setText(
        "saveHelp",
        "Changes are live. Students see the updated percentage right away."
      );
      toast(result.message);

      loadDashboard({ silent: true });
      if (state.recordsLoaded) loadRecords({ silent: true });
      if (state.studentsLoaded) loadStudents({ silent: true });
    } catch (error) {
      toast(error.message, "error");
      setButtonLoading(button, false);
      setText(
        "saveHelp",
        "Your changes are still here. Check the details and try saving again."
      );
    } finally {
      setButtonLoading(button, false);
    }
  }

  async function saveHoliday() {
    if (!state.roster || state.loadingRoster) return;
    if (state.holiday) {
      takeAttendanceInstead();
      return;
    }
    const params = selectedMarkParams();
    if (!params.classId || !params.subjectId || !params.period) return;
    const button = $("holidayButton");
    button.disabled = true;

    try {
      const result = await api.post("/api/teacher/attendance", {
        class_id: params.classId,
        subject_id: params.subjectId,
        date: params.date,
        period: params.period,
        holiday: true,
        substitute: params.substitute,
      });
      state.holiday = true;
      state.isExisting = true;
      state.dirty = false;
      state.roster.is_holiday = true;
      state.roster.is_existing = true;
      state.roster.updated_at = new Date().toISOString();
      state.statuses = new Map(
        state.roster.students.map((student) => [student.id, "present"])
      );
      renderRoster();
      toast(result.message);
      loadDashboard({ silent: true });
      if (state.recordsLoaded) loadRecords({ silent: true });
      if (state.studentsLoaded) loadStudents({ silent: true });
    } catch (error) {
      toast(error.message, "error");
      button.disabled = false;
    }
  }

  function takeAttendanceInstead() {
    if (!state.roster) return;
    state.holiday = false;
    state.roster.is_holiday = false;
    state.statuses = new Map(
      state.roster.students.map((student) => [student.id, "present"])
    );
    renderRoster();
    markDirty();
    toast("Holiday removed. Mark absentees, then save attendance.", "info");
  }

  /* ---------------------------------------------------------
     Records
     --------------------------------------------------------- */
  function initializeRecordFilters() {
    const classFilter = $("recordsClassFilter");
    classFilter.innerHTML =
      `<option value="">All classes</option>` +
      state.classes
        .map((classItem) =>
          optionMarkup(classItem.id, `${classItem.code} · ${classItem.name}`)
        )
        .join("");

    populateRecordSubjects("");
  }

  function optionMarkup(value, label, selected = false) {
    return `<option value="${escapeHTML(value)}"${selected ? " selected" : ""}>${escapeHTML(label)}</option>`;
  }

  function populateRecordSubjects(classId, preferredSubject = "") {
    const subjectFilter = $("recordsSubjectFilter");
    const subjects = new Map();
    state.assignments
      .filter((item) => !classId || item.class_id === Number(classId))
      .forEach((item) => {
        if (!subjects.has(item.subject_id)) {
          subjects.set(item.subject_id, {
            id: item.subject_id,
            name: item.subject_name,
            code: item.subject_code,
          });
        }
      });

    subjectFilter.innerHTML =
      `<option value="">All subjects</option>` +
      Array.from(subjects.values())
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((subject) =>
          optionMarkup(subject.id, `${subject.code} · ${subject.name}`)
        )
        .join("");

    if (
      preferredSubject &&
      Array.from(subjects.values()).some(
        (subject) => subject.id === Number(preferredSubject)
      )
    ) {
      subjectFilter.value = String(preferredSubject);
    }
  }

  async function loadRecords({ silent = false } = {}) {
    const seq = ++state.recordsSeq;
    state.loadingRecords = true;
    if (!silent) {
      $("recordsBody").innerHTML = `
        <tr><td colspan="7"><div class="skeleton skeleton--row"></div></td></tr>`;
      setText("recordsCount", "Loading…");
    }

    const params = new URLSearchParams();
    if ($("recordsClassFilter").value)
      params.set("class_id", $("recordsClassFilter").value);
    if ($("recordsSubjectFilter").value)
      params.set("subject_id", $("recordsSubjectFilter").value);
    const suffix = params.toString() ? `?${params}` : "";

    try {
      const data = await api.get(`/api/teacher/sessions${suffix}`);
      if (seq !== state.recordsSeq) return;
      state.recordsLoaded = true;
      setText(
        "recordsCount",
        `${data.sessions.length} ${plural(data.sessions.length, "record")}`
      );
      renderSessionTable($("recordsBody"), data.sessions, {
        emptyMessage:
          "No saved attendance matches these filters. Try another class or subject.",
      });
    } catch (error) {
      if (seq !== state.recordsSeq) return;
      setText("recordsCount", "Could not load");
      $("recordsBody").innerHTML = `
        <tr><td colspan="7" class="table-empty">
          <strong>Could not load records</strong>
          <p>${escapeHTML(error.message)}</p>
        </td></tr>`;
      if (!silent) toast(error.message, "error");
    } finally {
      if (seq === state.recordsSeq) state.loadingRecords = false;
    }
  }

  /* ---------------------------------------------------------
     Students (live attendance monitor)
     --------------------------------------------------------- */
  function initializeStudentsControls() {
    const classFilter = $("studentsClassFilter");
    if (!classFilter) return;
    classFilter.innerHTML = state.classes
      .map((classItem) =>
        optionMarkup(classItem.id, `${classItem.code} · ${classItem.name}`)
      )
      .join("");
    populateStudentsSubjects(classFilter.value || "");
  }

  function populateStudentsSubjects(classId, preferredSubject = "") {
    const subjectFilter = $("studentsSubjectFilter");
    if (!subjectFilter) return;
    const subjects = new Map();
    state.assignments
      .filter((item) => !classId || item.class_id === Number(classId))
      .forEach((item) => {
        if (!subjects.has(item.subject_id)) {
          subjects.set(item.subject_id, {
            id: item.subject_id,
            name: item.subject_name,
            code: item.subject_code,
          });
        }
      });

    subjectFilter.innerHTML =
      `<option value="">Overall (all subjects)</option>` +
      Array.from(subjects.values())
        .sort((a, b) => a.code.localeCompare(b.code))
        .map((subject) =>
          optionMarkup(subject.id, `${subject.code} · ${subject.name}`)
        )
        .join("");

    if (preferredSubject) subjectFilter.value = String(preferredSubject);
  }

  function requirementMarkup(student) {
    if (!student.total) {
      return '<span class="req-pill req-pill--none">No data</span>';
    }
    if (student.status === "on_track") {
      const skip = Number(student.can_skip) || 0;
      return `<span class="req-pill req-pill--ok">On track${
        skip > 0 ? ` · can miss ${skip}` : ""
      }</span>`;
    }
    return `<span class="req-pill req-pill--low">Needs ${Number(
      student.must_attend
    )} more</span>`;
  }

  function renderStudents(data) {
    const tbody = $("studentsBody");
    if (!tbody) return;
    const summary = data.summary || {
      total: 0,
      on_track: 0,
      below_75: 0,
      no_data: 0,
    };
    setText(
      "studentsCount",
      `${summary.total} ${plural(summary.total, "student")} · ${
        summary.below_75
      } below 75%`
    );

    if (!data.students.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty">
        <strong>No students found</strong>
        <p>This class has no active students yet.</p>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = data.students
      .map((student, index) => {
        const low = student.total > 0 && student.status === "below";
        const pct = student.total ? formatPercent(student.percentage) : "—";
        return `<tr class="${low ? "is-low" : ""}">
          <td><span class="roster-index">${String(index + 1).padStart(2, "0")}</span></td>
          <td><span class="table-class">${escapeHTML(student.register_no)}</span></td>
          <td><span class="table-subject">${escapeHTML(student.name)}</span></td>
          <td><span class="present-summary"><b>${student.attended}</b></span></td>
          <td><span class="present-summary">${student.total}</span></td>
          <td><span class="table-attendance ${low ? "is-low" : ""}">${escapeHTML(pct)}</span></td>
          <td>${requirementMarkup(student)}</td>
        </tr>`;
      })
      .join("");
  }

  async function loadStudents({ silent = false } = {}) {
    const seq = ++state.studentsSeq;
    state.loadingStudents = true;
    if (!silent) {
      const tbody = $("studentsBody");
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="skeleton skeleton--row"></div></td></tr>`;
      }
      setText("studentsCount", "Loading…");
    }

    const params = new URLSearchParams();
    if ($("studentsClassFilter") && $("studentsClassFilter").value)
      params.set("class_id", $("studentsClassFilter").value);
    if ($("studentsSubjectFilter") && $("studentsSubjectFilter").value)
      params.set("subject_id", $("studentsSubjectFilter").value);
    const suffix = params.toString() ? `?${params}` : "";

    try {
      const data = await api.get(`/api/teacher/students${suffix}`);
      if (seq !== state.studentsSeq) return;
      state.studentsLoaded = true;
      renderStudents(data);
    } catch (error) {
      if (seq !== state.studentsSeq) return;
      state.studentsLoaded = false;
      setText("studentsCount", "Could not load");
      const tbody = $("studentsBody");
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty">
          <strong>Could not load student attendance</strong>
          <p>${escapeHTML(error.message)}</p>
        </td></tr>`;
      }
      if (!silent) toast(error.message, "error");
    } finally {
      if (seq === state.studentsSeq) state.loadingStudents = false;
    }
  }

  function initializeStudentsExport() {
    const input = $("studentsExportMonth");
    if (!input) return;
    const now = new Date();
    const value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    input.value = value;
    input.max = value;
  }

  async function downloadStudentsReport() {
    const button = $("studentsDownloadButton");
    const label = $("studentsDownloadText");
    const monthInput = $("studentsExportMonth");
    const classFilter = $("studentsClassFilter");
    const params = new URLSearchParams();
    if (monthInput && monthInput.value) params.set("month", monthInput.value);
    if (classFilter && classFilter.value) params.set("class_id", classFilter.value);

    setButtonLoading(button, true);
    if (label) label.textContent = "Building Excel…";
    try {
      const response = await fetch(
        `/api/teacher/students/export?${params.toString()}`,
        { credentials: "same-origin" }
      );
      if (!response.ok) {
        let message = "Could not build the Excel report. Please try again.";
        try {
          const detail = await response.json();
          if (detail && detail.error) message = detail.error;
        } catch {
          // keep the default message
        }
        throw new Error(message);
      }
      const blob = await response.blob();
      let filename = "RollCall-monthly-report.xlsx";
      const disposition = response.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      if (match && match[1]) filename = match[1];

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast("Excel report downloaded.");
    } catch (error) {
      toast(error.message, "error");
    } finally {
      setButtonLoading(button, false);
      if (label) label.textContent = "Download Excel";
    }
  }

  /* ---------------------------------------------------------
     Event wiring
     --------------------------------------------------------- */
  document.querySelectorAll("#teacherTabs .app-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });

  document.querySelectorAll("[data-view-go]").forEach((button) => {
    button.addEventListener("click", () =>
      switchView(button.dataset.viewGo)
    );
  });

  $("startAttendanceButton")?.addEventListener("click", openDefaultMark);
  $("heroStartButton")?.addEventListener("click", openDefaultMark);
  $("todayStartButton")?.addEventListener("click", openDefaultMark);
  $("newAttendanceButton")?.addEventListener("click", openDefaultMark);

  $("heroRecordsButton")?.addEventListener("click", () =>
    switchView("records")
  );
  $("viewAllRecordsButton")?.addEventListener("click", () =>
    switchView("records")
  );

  $("markDate")?.addEventListener("change", handleDateChange);
  $("markTodayButton")?.addEventListener("click", () => {
    $("markDate").value = state.today;
    state.selected = null;
    renderMarkSlots();
    selectFirstMarkable(state.today);
  });

  $("markSlots")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-slot]");
    if (!button) return;
    const canMark = button.dataset.canMark === "1";
    const canSubstitute = button.dataset.canSubstitute === "1";
    if (!canMark && !canSubstitute) {
      toast("That period is taught by another faculty member.", "error");
      return;
    }
    const date = $("markDate").value || state.today;
    const slot = slotFor(date, {
      subjectId: button.dataset.subjectId,
      period: button.dataset.period,
    });
    if (!slot) return;
    state.selected = {
      ...slot,
      date,
      classId: (state.classes[0] && state.classes[0].id) || null,
      substitute: !canMark && canSubstitute,
    };
    renderMarkSlots();
    loadRoster();
  });

  $("holidayButton")?.addEventListener("click", saveHoliday);

  $("todayTimetable")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-today-slot]");
    if (!button) return;
    if (
      button.dataset.canMark !== "1" &&
      button.dataset.canSubstitute !== "1"
    ) {
      toast("That period is taught by another faculty member.", "error");
      return;
    }
    openMark({
      classId: (state.classes[0] && state.classes[0].id) || null,
      subjectId: Number(button.dataset.subjectId),
      date: state.today,
      period: Number(button.dataset.period),
    });
  });

  $("rosterSearch")?.addEventListener("input", (event) => {
    state.search = event.target.value;
    filterRoster();
  });

  $("rosterList")?.addEventListener("click", (event) => {
    if (state.holiday) return;
    const button = event.target.closest(".status-btn");
    if (!button || !state.roster) return;
    const studentId = Number(button.dataset.studentId);
    const status = button.dataset.status;
    if (!studentId || !["present", "absent"].includes(status)) return;
    state.statuses.set(studentId, status);
    const row = button.closest("[data-student-row]");
    updateRowStatus(row, status);
    markDirty();
    updateRosterCounts();
  });

  document.querySelectorAll("[data-bulk]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!state.roster || state.holiday) return;
      const status = button.dataset.bulk;
      state.roster.students.forEach((student) => {
        state.statuses.set(student.id, status);
      });
      document.querySelectorAll(".roster-row").forEach((row) => {
        const studentId = Number(row.dataset.studentRow);
        updateRowStatus(row, state.statuses.get(studentId));
      });
      markDirty();
      updateRosterCounts();
    });
  });

  $("saveAttendanceButton")?.addEventListener("click", saveAttendance);

  $("recordsClassFilter")?.addEventListener("change", () => {
    populateRecordSubjects($("recordsClassFilter").value);
    loadRecords();
  });
  $("recordsSubjectFilter")?.addEventListener("change", () => loadRecords());
  $("refreshRecordsButton")?.addEventListener("click", () => loadRecords());

  $("studentsClassFilter")?.addEventListener("change", () => {
    populateStudentsSubjects($("studentsClassFilter").value);
    loadStudents();
  });
  $("studentsSubjectFilter")?.addEventListener("change", () => loadStudents());
  $("studentsRefreshButton")?.addEventListener("click", () => loadStudents());
  $("studentsDownloadButton")?.addEventListener("click", downloadStudentsReport);

  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-open-mark]");
    if (openButton) {
      openMark({
        classId: Number(openButton.dataset.classId),
        subjectId: Number(openButton.dataset.subjectId),
      });
      return;
    }

    const editButton = event.target.closest("[data-edit-attendance]");
    if (editButton) {
      openMark({
        classId: Number(editButton.dataset.classId),
        subjectId: Number(editButton.dataset.subjectId),
        date: editButton.dataset.date,
        period: Number(editButton.dataset.period),
      });
    }
  });

  $("retryButton")?.addEventListener("click", () => loadDashboard());

  window.addEventListener("beforeunload", (event) => {
    if (state.dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  /* ---------------------------------------------------------
     Start
     --------------------------------------------------------- */
  loadDashboard();
})();
