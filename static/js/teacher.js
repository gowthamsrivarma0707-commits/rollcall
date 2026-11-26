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

  const DEFAULT_MCA_GEN_STUDENTS = [{"id": 1, "register_no": "26PSMCA0001", "name": "Adireddi Revanth"}, {"id": 2, "register_no": "26PSMCA0002", "name": "Alabana Durga Ram"}, {"id": 3, "register_no": "26PSMCA0003", "name": "Bandaru Sai Sananda"}, {"id": 4, "register_no": "26PSMCA0004", "name": "Barli Manoharkumar"}, {"id": 5, "register_no": "26PSMCA0005", "name": "Bayana Urmila"}, {"id": 6, "register_no": "26PSMCA0006", "name": "Behara Sai Eshwar Yerram Raju"}, {"id": 7, "register_no": "26PSMCA0007", "name": "Boddu Omkar Jyothi Swaroop"}, {"id": 8, "register_no": "26PSMCA0008", "name": "Bondi Venkatesh"}, {"id": 9, "register_no": "26PSMCA0009", "name": "Chenamalla Usha Sai Kiran"}, {"id": 10, "register_no": "26PSMCA0010", "name": "Chintala Hymavathi"}, {"id": 11, "register_no": "26PSMCA0011", "name": "Dagulupilli Latha"}, {"id": 12, "register_no": "26PSMCA0012", "name": "Dendukuri Gowtham Sri Varma"}, {"id": 13, "register_no": "26PSMCA0013", "name": "Donka Chandra Sekhar"}, {"id": 14, "register_no": "26PSMCA0014", "name": "Gara Maruti Lakshmunaidu"}, {"id": 15, "register_no": "26PSMCA0015", "name": "Gavara Uma Maheswari"}, {"id": 16, "register_no": "26PSMCA0016", "name": "Gedela Chaitanya Deep"}, {"id": 17, "register_no": "26PSMCA0017", "name": "Godha Dhasaradha"}, {"id": 18, "register_no": "26PSMCA0018", "name": "Gujji Mithilesh Reddy"}, {"id": 19, "register_no": "26PSMCA0019", "name": "Indukuri Sri Swetha Bala"}, {"id": 20, "register_no": "26PSMCA0020", "name": "Jana Bhargav"}, {"id": 21, "register_no": "26PSMCA0021", "name": "Kandipilli Mahadev"}, {"id": 22, "register_no": "26PSMCA0022", "name": "Kandrapu Aarthi"}, {"id": 23, "register_no": "26PSMCA0023", "name": "Kemburu Lokesh Kumar"}, {"id": 24, "register_no": "26PSMCA0024", "name": "Kintali Pavankalyan"}, {"id": 25, "register_no": "26PSMCA0025", "name": "Korangi Rupa Sri Lakshmi"}, {"id": 26, "register_no": "26PSMCA0026", "name": "Korikina Devika"}, {"id": 27, "register_no": "26PSMCA0027", "name": "Kusalapudi Sruthi"}, {"id": 28, "register_no": "26PSMCA0028", "name": "Majji Roshini"}, {"id": 29, "register_no": "26PSMCA0029", "name": "Manuballa Trinayani"}, {"id": 30, "register_no": "26PSMCA0030", "name": "Mavuluri Manjusha"}, {"id": 31, "register_no": "26PSMCA0031", "name": "Neelapu Yashodha Reddy"}, {"id": 32, "register_no": "26PSMCA0032", "name": "Nidumoli Vasudeva Varma"}, {"id": 33, "register_no": "26PSMCA0033", "name": "Palacharla Charan Sai Pavan Kumar"}, {"id": 34, "register_no": "26PSMCA0034", "name": "Patra Eswar Govinda Sai Nayak"}, {"id": 35, "register_no": "26PSMCA0035", "name": "Pattemu Anusha"}, {"id": 36, "register_no": "26PSMCA0036", "name": "Peddaboina Bhavana"}, {"id": 37, "register_no": "26PSMCA0037", "name": "Pendyala Gnaneswari"}, {"id": 38, "register_no": "26PSMCA0038", "name": "Penmetsa Sai Keerthi"}, {"id": 39, "register_no": "26PSMCA0039", "name": "Puranam Madhu Sri"}, {"id": 40, "register_no": "26PSMCA0040", "name": "Randi Jayasri"}, {"id": 41, "register_no": "26PSMCA0041", "name": "Reddi Harsha Sri"}, {"id": 42, "register_no": "26PSMCA0042", "name": "Reddy Eswaramma"}, {"id": 43, "register_no": "26PSMCA0043", "name": "Rokkam Hemanth"}, {"id": 44, "register_no": "26PSMCA0044", "name": "Routhu Bhanu Tejaswini"}, {"id": 45, "register_no": "26PSMCA0045", "name": "Saketi Hemakshi Gowri"}, {"id": 46, "register_no": "26PSMCA0046", "name": "Siyadri Prashant"}, {"id": 47, "register_no": "26PSMCA0047", "name": "Subham Kumar"}, {"id": 48, "register_no": "26PSMCA0048", "name": "Susarapu Balarka Bhaavagna"}, {"id": 49, "register_no": "26PSMCA0049", "name": "Suvvari Balakrishna"}, {"id": 50, "register_no": "26PSMCA0050", "name": "Talluri Pavan Kumar"}, {"id": 51, "register_no": "26PSMCA0051", "name": "Vadisala Pavan V S N E Manohar"}, {"id": 52, "register_no": "26PSMCA0052", "name": "Vajji Sai Kiran"}, {"id": 53, "register_no": "26PSMCA0053", "name": "Vandila Vamsi"}, {"id": 54, "register_no": "26PSMCA0054", "name": "Varanasi Ruchita"}, {"id": 55, "register_no": "26PSMCA0055", "name": "Yandapalli Anand"}, {"id": 56, "register_no": "26PSMCA0056", "name": "Yedla Pavani"}, {"id": 57, "register_no": "26PSMCA0057", "name": "Yeruva Mary Navya"}];
  const DEFAULT_MCA_AI_STUDENTS = [{"id": 58, "register_no": "26PSMCI0001", "name": "Allada Ganesh"}, {"id": 59, "register_no": "26PSMCI0002", "name": "Bhavitesh Boddeti"}, {"id": 60, "register_no": "26PSMCI0003", "name": "Bugatha Sai Charan"}, {"id": 61, "register_no": "26PSMCI0004", "name": "Kari Raju"}, {"id": 62, "register_no": "26PSMCI0005", "name": "Katta Koushik"}, {"id": 63, "register_no": "26PSMCI0006", "name": "Koribilli Nandu Kumar"}, {"id": 64, "register_no": "26PSMCI0007", "name": "Lokireddy Harish"}, {"id": 65, "register_no": "26PSMCI0008", "name": "Nakka Dinesh Sai Pavan"}, {"id": 66, "register_no": "26PSMCI0009", "name": "Pentapalli Akhil Prasad"}, {"id": 67, "register_no": "26PSMCI0010", "name": "Potnuru Sri Valli"}, {"id": 68, "register_no": "26PSMCI0011", "name": "Rayanapati Dhanush Kumar"}, {"id": 69, "register_no": "26PSMCI0012", "name": "Rayapureddi Mohana Lakshmi"}, {"id": 70, "register_no": "26PSMCI0013", "name": "Reshma Mahanty"}, {"id": 71, "register_no": "26PSMCI0014", "name": "Sai Nikitha Putta"}, {"id": 72, "register_no": "26PSMCI0015", "name": "Siriki Vinodhini"}, {"id": 73, "register_no": "26PSMCI0016", "name": "Surapureddi Lasya Rishitha"}, {"id": 74, "register_no": "26PSMCI0017", "name": "Tippana Kalyani"}, {"id": 75, "register_no": "26PSMCI0018", "name": "Utla Rohith Kumar"}, {"id": 76, "register_no": "26PSMCI0019", "name": "Varri Tejaswini"}];

  function getDefaultStudentsForClass(classId) {
    if (Number(classId) === 2 || String(classId).includes("AI")) {
      return DEFAULT_MCA_AI_STUDENTS;
    }
    return DEFAULT_MCA_GEN_STUDENTS;
  }

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

  /* ---------------------------------------------------------
     Offline Sync & Storage Helpers
     --------------------------------------------------------- */
  const OFFLINE_QUEUE_KEY = "rollcall_offline_queue";

  function getOfflineQueue() {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveOfflineQueue(queue) {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.warn("Could not save offline queue:", err);
    }
    updateOfflineBanner();
  }

  function queueOfflineAttendance(params, records) {
    const queue = getOfflineQueue();
    const existingIndex = queue.findIndex(
      (item) =>
        item.class_id === params.classId &&
        item.date === params.date &&
        item.period === params.period
    );
    const item = {
      id: "offline_" + Date.now(),
      class_id: params.classId,
      subject_id: params.subjectId,
      date: params.date,
      period: params.period,
      substitute: Boolean(params.substitute),
      records: records,
      period_label: state.selected?.period_label || `Period ${params.period}`,
      saved_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    if (existingIndex >= 0) {
      queue[existingIndex] = item;
    } else {
      queue.push(item);
    }
    saveOfflineQueue(queue);
    return item;
  }

  function updateOfflineBanner() {
    const banner = $("offlineSyncBanner");
    const text = $("offlineSyncText");
    if (!banner || !text) return;
    const queue = getOfflineQueue();
    if (!queue.length) {
      banner.hidden = true;
    } else {
      banner.hidden = false;
      const count = queue.length;
      text.textContent = `${count} offline roll call${count > 1 ? "s" : ""} saved on this device. Waiting for internet to sync.`;
    }
  }

  let isSyncing = false;
  async function syncOfflineQueue() {
    if (isSyncing || !navigator.onLine) return;
    const queue = getOfflineQueue();
    if (!queue.length) return;

    isSyncing = true;
    const btn = $("manualSyncButton");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Syncing…";
    }

    let syncedCount = 0;
    const remaining = [];

    for (const item of queue) {
      try {
        await api.post("/api/teacher/attendance", {
          class_id: item.class_id,
          subject_id: item.subject_id,
          date: item.date,
          period: item.period,
          substitute: item.substitute,
          records: item.records,
        });
        syncedCount++;
      } catch (err) {
        console.warn("Failed to sync item:", item, err);
        remaining.push(item);
      }
    }

    saveOfflineQueue(remaining);
    isSyncing = false;
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Sync now";
    }
    updateOfflineBanner();

    if (syncedCount > 0) {
      toast(`Successfully synced ${syncedCount} offline session(s) to website! 🟢`, "success");
      loadDashboard({ silent: true });
    }
  }

  function updateNetworkStatus() {
    const pill = $("networkPill");
    const text = $("networkText");
    const isOnline = navigator.onLine;
    if (pill && text) {
      if (isOnline) {
        pill.classList.remove("is-offline");
        pill.classList.add("is-online");
        text.textContent = "Online";
      } else {
        pill.classList.remove("is-online");
        pill.classList.add("is-offline");
        text.textContent = "Offline";
      }
    }
    updateOfflineBanner();
  }

  const TEACHER_PROFILES = {
    prp: { id: 1, employee_id: "PRP", name: "Mrs. P. Ratna Pavani", email: "prp@gvpihlr.edu.in", department: "School of Science" },
    vl: { id: 2, employee_id: "VL", name: "Mrs. V. Lakshmi", email: "vl@gvpihlr.edu.in", department: "School of Science" },
    chssrp: { id: 3, employee_id: "CHSSRP", name: "Mr. Ch. S. S. Rajesh Patnaik", email: "chssrp@gvpihlr.edu.in", department: "School of Science" },
    bd: { id: 4, employee_id: "BD", name: "Mr. B. Diwakar", email: "bd@gvpihlr.edu.in", department: "School of Science" },
    psr: { id: 5, employee_id: "PSR", name: "Dr. P. Srinivas Rao", email: "psr@gvpihlr.edu.in", department: "School of Science" },
    rk: { id: 6, employee_id: "RK", name: "Dr. G. Rama Krishna", email: "rk@gvpihlr.edu.in", department: "School of Science" },
    pvrc: { id: 7, employee_id: "PVRC", name: "Mr. P. V. R. Chandrasekhar", email: "pvrc@gvpihlr.edu.in", department: "School of Science" },
    ymg: { id: 8, employee_id: "YMG", name: "Mrs. Y. Mpunika Gayatri", email: "ymg@gvpihlr.edu.in", department: "School of Science" },
    principal: { id: 1, employee_id: "PRINCIPAL", name: "Principal", email: "principal@gvpihlr.edu.in", department: "Administration", admin_view: true }
  };

  function applyActiveTeacherProfile(data) {
    if (!data) return;
    const activeKey = (localStorage.getItem("rollcall_active_teacher_id") || "").toLowerCase().trim();
    const profile = TEACHER_PROFILES[activeKey];

    // Only fallback to static mock profile if server didn't provide a teacher object
    if (!data.teacher && profile) {
      data.teacher = profile;
    }

    const isAdmin = Boolean(data.admin_view || profile?.admin_view || activeKey === "principal" || activeKey === "isp");
    if (isAdmin) {
      data.admin_view = true;
    }

    const teacherEmpId = (data.teacher?.employee_id || profile?.employee_id || "").toUpperCase();

    if (Array.isArray(data.timetable)) {
      data.timetable.forEach((day) => {
        (day.slots || []).forEach((slot) => {
          if (data.admin_view) {
            slot.can_mark = true;
            slot.can_substitute = false;
          } else if (slot.faculty && teacherEmpId && slot.faculty.toUpperCase().includes(teacherEmpId)) {
            slot.can_mark = true;
            slot.can_substitute = false;
          } else {
            slot.can_mark = false;
            slot.can_substitute = true;
          }
        });
      });
    }

    if (data.today && Array.isArray(data.today.slots)) {
      data.today.slots.forEach((slot) => {
        if (data.admin_view) {
          slot.can_mark = true;
          slot.can_substitute = false;
        } else if (slot.faculty && teacherEmpId && slot.faculty.toUpperCase().includes(teacherEmpId)) {
          slot.can_mark = true;
          slot.can_substitute = false;
        } else {
          slot.can_mark = false;
          slot.can_substitute = true;
        }
      });
    }
  }

  async function loadDashboard({ silent = false } = {}) {
    try {
      const data = await api.get("/api/teacher/overview");
      try { localStorage.setItem("rollcall_cache_overview", JSON.stringify(data)); } catch (_) {}
      applyActiveTeacherProfile(data);
      state.data = data;
      state.teachers = data.faculty || [];
      state.classes = data.classes || [];
      state.assignments = data.assignments || [];
      state.timetablesByClass = data.timetables_by_class || {};
      state.timetable = data.timetable || [];
      if (state.selectedClassId && state.timetablesByClass[state.selectedClassId]) {
        state.timetable = state.timetablesByClass[state.selectedClassId];
      }
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
        initializeAddElective();
        initializeProfileModal();
        state.initialized = true;
      } else if (state.view === "mark") {
        renderMarkSlots();
      }
      $("pageError").hidden = true;
      return data;
    } catch (error) {
      const cached = localStorage.getItem("rollcall_cache_overview");
      if (cached) {
        try {
          const data = JSON.parse(cached);
          applyActiveTeacherProfile(data);
          state.data = data;
          state.classes = data.classes || [];
          state.assignments = data.assignments || [];
          state.timetable = data.timetable || [];
          state.today = data.server_date || new Date().toISOString().slice(0, 10);
          state.todaySlots = data.today ? data.today.slots : [];
          applyHolidayFlags();
          renderOverview(data);
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
          toast("Loaded from offline memory (no connection)", "info");
          return data;
        } catch (_) {}
      }
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
    const headerAvatar = $("teacherAvatar");
    if (headerAvatar) {
      if (teacher.photo_base64) {
        headerAvatar.innerHTML = `<img src="${teacher.photo_base64}" alt="${escapeHTML(teacher.name)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;">`;
      } else {
        headerAvatar.textContent = initials(teacher.name);
      }
    }
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

    renderTodayScheduleMini();
  }

  function isTeacherSlot(slot) {
    if (!slot) return false;
    const teacher = state.data && state.data.teacher;
    if (!teacher) return true;
    if (slot.primary_teacher_id && Number(slot.primary_teacher_id) === Number(teacher.id)) {
      return true;
    }
    if (teacher.employee_id && slot.faculty) {
      const parts = slot.faculty.split("/").map((s) => s.trim().toUpperCase());
      if (parts.includes(teacher.employee_id.trim().toUpperCase())) {
        return true;
      }
    }
    if (!state.data.admin_view && slot.can_mark) {
      return true;
    }
    return false;
  }

  function renderTodayScheduleMini() {
    const container = $("todayScheduleMini");
    if (!container) return;
    const allSlots = state.todaySlots || [];
    const mySlots = allSlots.filter(isTeacherSlot);
    const slots = mySlots.length ? mySlots : (state.data && state.data.admin_view ? allSlots : []);

    if (!slots.length) {
      container.innerHTML = `
        <div class="today-sched-empty">
          <svg viewBox="0 0 20 20" fill="none" width="16" height="16" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M10 6v4l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <span>No classes scheduled for you today.</span>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="today-sched-header">
        <span>YOUR SCHEDULE TODAY</span>
        <span class="sched-count">${slots.length} ${plural(slots.length, "class", "classes")}</span>
      </div>
      <div class="today-sched-list">
        ${slots
          .map((slot) => {
            const available = slot.can_mark || slot.can_substitute;
            return `
              <button class="today-sched-item" type="button"
                data-today-slot data-subject-id="${slot.subject_id}" data-period="${slot.period}" data-can-mark="${slot.can_mark ? 1 : 0}" data-can-substitute="${slot.can_substitute ? 1 : 0}">
                <div class="sched-item__time">
                  <strong>${escapeHTML(slot.period_label)}</strong>
                  <span>${escapeHTML(slot.time_label)}</span>
                </div>
                <div class="sched-item__info">
                  <span class="sched-item__code">${escapeHTML(slot.subject_code)}</span>
                  <span class="sched-item__name">${escapeHTML(slot.subject_name)}</span>
                </div>
                <span class="sched-item__action">${available ? "Mark →" : "View"}</span>
              </button>`;
          })
          .join("")}
      </div>`;
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
    if (!["overview", "mark", "records", "students", "electives"].includes(view)) return;
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
    if (view === "electives" && autoLoad) loadElectives();
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
    state.selectedClassId = targetClass;
    if ($("markClassSelect")) {
      $("markClassSelect").value = String(targetClass);
    }
    if (state.timetablesByClass && state.timetablesByClass[targetClass]) {
      state.timetable = state.timetablesByClass[targetClass];
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
    const classSelect = $("markClassSelect");
    if (classSelect) {
      classSelect.innerHTML = state.classes
        .map((c) => `<option value="${c.id}">${escapeHTML(c.code)} · ${escapeHTML(c.name)} (${c.student_count || 0} students)</option>`)
        .join("");
      if (state.selectedClassId) {
        classSelect.value = String(state.selectedClassId);
      }
      classSelect.addEventListener("change", () => {
        state.selectedClassId = Number(classSelect.value);
        if (state.timetablesByClass && state.timetablesByClass[state.selectedClassId]) {
          state.timetable = state.timetablesByClass[state.selectedClassId];
        }
        setRosterPrompt(`Section ${classSelect.selectedOptions[0]?.text || ""}. Choose a period above.`);
        renderMarkSlots();
        if (state.selected) {
          state.selected.classId = state.selectedClassId;
          loadRoster();
        }
      });
    }
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

    renderTodayScheduleMini();
  }

  function setRosterPrompt(message) {
    state.roster = null;
    state.holiday = false;
    state.isExisting = false;
    state.isLocked = false;
    const card = $("rosterCard");
    card.dataset.state = "prompt";
    card.dataset.holiday = "false";
    card.classList.remove("is-locked-session");
    if ($("unlockAttendanceButton")) $("unlockAttendanceButton").hidden = true;
    if ($("saveAttendanceButton")) {
      $("saveAttendanceButton").hidden = false;
      $("saveAttendanceButton").disabled = true;
    }
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
    const chosenClass =
      ($("markClassSelect") && Number($("markClassSelect").value)) ||
      (state.selected && state.selected.classId) ||
      (state.classes[0] && state.classes[0].id);
    return {
      classId: chosenClass,
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
      if (!navigator.onLine) {
        throw new Error("Offline");
      }
      const roster = await api.get(`/api/teacher/roster?${query}`);
      if (seq !== state.rosterSeq) return;
      try {
        localStorage.setItem(`rollcall_cache_roster_${params.classId}_${params.period}_${params.date}`, JSON.stringify(roster));
        if (roster.students && roster.students.length) {
          localStorage.setItem(`rollcall_cache_students_${params.classId}`, JSON.stringify(roster.students));
        }
      } catch (_) {}
      state.roster = roster;
      state.sessionId = roster.session_id;
      state.isExisting = roster.is_existing;
      state.isLocked = Boolean(roster.is_existing);
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

      // Always load roster from offline device memory
      const slot = state.selected || {};
      const studentsList = getDefaultStudentsForClass(params.classId);
      const matchedClass = state.classes.find(c => c.id === params.classId) || {};
      const className = matchedClass.name || (params.classId === 2 ? "1st Year MCA (Artificial Intelligence)" : "1st Year MCA (General)");
      const classCode = matchedClass.code || (params.classId === 2 ? "MCA-AI" : "MCA-GEN");

      const fallbackRoster = {
        class: { id: params.classId, name: className, code: classCode },
        subject: { id: params.subjectId, name: slot.subject_name || "Subject", code: slot.subject_code || "SUB" },
        date: params.date,
        period: params.period,
        span: slot.span || 1,
        period_label: slot.period_label || `Period ${params.period}`,
        time_label: slot.time_label || "",
        faculty: slot.faculty || "",
        is_holiday: false,
        is_existing: false,
        session_id: null,
        students: studentsList.map((s) => ({ ...s, status: "present" })),
      };

      state.roster = fallbackRoster;
      state.sessionId = null;
      state.isExisting = false;
      state.holiday = false;
      state.statuses = new Map(
        fallbackRoster.students.map((student) => [student.id, "present"])
      );
      renderRoster();
      toast("Roster ready (Offline Mode) 📦", "info");
      return;
    } finally {
      state.loadingRoster = false;
    }
  }

  function statusButtons(studentId, status) {
    const isLocked = Boolean(state.isLocked);
    const lockedClass = isLocked ? "is-locked" : "";
    return `
      <div class="status-toggle ${lockedClass}" role="group" aria-label="Attendance status">
        <button class="status-btn ${status === "present" ? "is-selected" : ""}" type="button"
          data-student-id="${studentId}" data-status="present" aria-pressed="${status === "present"}" ${isLocked ? "tabindex='-1'" : ""}>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8.3l3 3 7-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Present
        </button>
        <button class="status-btn ${status === "absent" ? "is-selected" : ""}" type="button"
          data-student-id="${studentId}" data-status="absent" aria-pressed="${status === "absent"}" ${isLocked ? "tabindex='-1'" : ""}>
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          Absent
        </button>
      </div>`;
  }

  function rosterMiddleMarkup(student) {
    const total = student.total || 0;
    const pct = student.percentage !== undefined ? student.percentage : 0;
    const isShortage = total > 0 && pct < 75.0;
    const badgeClass = isShortage ? "roster-pill--shortage" : "roster-pill--good";
    const label = total ? `${pct}% · ${isShortage ? "Shortage" : "Regular"}` : "No data";
    return `
      <div class="roster-middle">
        <span class="roster-pill ${badgeClass}">
          <span class="pill-dot" aria-hidden="true"></span>
          ${escapeHTML(label)}
        </span>
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

    card.classList.toggle("is-locked-session", Boolean(state.isLocked));
    const unlockBtn = $("unlockAttendanceButton");
    const saveBtn = $("saveAttendanceButton");

    $("holidayButton").disabled = false;
    $("holidayButton").classList.toggle("is-active", state.holiday);
    setText(
      "holidayButtonText",
      state.holiday ? "Take attendance instead" : "Mark as holiday"
    );
    $("holidayBanner").hidden = !state.holiday;
    $("rosterSearch").value = "";

    if (state.holiday) {
      if (unlockBtn) unlockBtn.hidden = true;
      if (saveBtn) {
        saveBtn.hidden = false;
        saveBtn.disabled = true;
      }
      setText("saveState", "Holiday");
      setText("presentCount", "—");
      setText("absentCount", "—");
      setText("saveButtonText", "Holiday saved");
      setText("saveSummary", "Holiday · excluded from attendance");
      setText(
        "saveHelp",
        "Switch to attendance if the class actually happened."
      );
      $("rosterList").innerHTML = holidayPanel();
      filterRoster();
      return;
    }

    if (roster.is_existing) {
      if (state.isLocked) {
        setText("saveState", "🔒 Locked · Read-only");
        saveState.classList.add("is-existing");
        saveState.classList.remove("is-dirty");
        if (unlockBtn) {
          unlockBtn.hidden = false;
          setText("unlockButtonText", "✏️ Unlock to edit");
        }
        if (saveBtn) {
          saveBtn.hidden = true;
        }
        setText(
          "saveHelp",
          "Roll call is locked to prevent accidental changes. Tap 'Unlock to edit' to make changes."
        );
      } else {
        setText("saveState", "🔓 Editing unlocked");
        saveState.classList.add("is-existing", "is-dirty");
        if (unlockBtn) {
          unlockBtn.hidden = false;
          setText("unlockButtonText", "🔒 Cancel & Lock");
        }
        if (saveBtn) {
          saveBtn.hidden = false;
          saveBtn.disabled = false;
          setText("saveButtonText", "Update attendance");
        }
        setText(
          "saveHelp",
          "Editing unlocked! Tap Present/Absent to adjust attendance, then click 'Update attendance'."
        );
      }
    } else {
      state.isLocked = false;
      setText("saveState", "New roll call");
      saveState.classList.remove("is-existing", "is-dirty");
      if (unlockBtn) unlockBtn.hidden = true;
      if (saveBtn) {
        saveBtn.hidden = false;
        saveBtn.disabled = false;
        setText("saveButtonText", "Save attendance");
      }
      setText(
        "saveHelp",
        "Everyone starts present. Tap a student to mark them absent."
      );
    }

    const list = $("rosterList");
    if (!roster.students.length) {
      list.innerHTML = `<div class="roster-empty">This class has no active students.</div>`;
      if (saveBtn) saveBtn.disabled = true;
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
                <strong class="roster-regno">${escapeHTML(student.register_no)}</strong>
                <span class="roster-name">${escapeHTML(student.name)}</span>
              </div>
              ${rosterMiddleMarkup(student)}
              ${statusButtons(student.id, status)}
            </div>`;
        })
        .join("") +
      `<div class="roster-empty" id="rosterSearchEmpty" hidden>No student matches that search.</div>`;

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
      if (!navigator.onLine) {
        throw new Error("Offline");
      }
      const result = await api.post("/api/teacher/attendance", {
        class_id: params.classId,
        subject_id: params.subjectId,
        date: params.date,
        period: params.period,
        substitute: params.substitute,
        records,
      });
      state.isExisting = true;
      state.isLocked = true;
      state.holiday = false;
      state.roster.is_holiday = false;
      state.sessionId = result.session_id;
      state.dirty = false;
      state.roster.is_existing = true;
      state.roster.updated_at = new Date().toISOString();
      if (state.roster.students) {
        state.roster.students.forEach((s) => {
          s.status = state.statuses.get(s.id) || "present";
        });
      }
      renderRoster();
      toast(result.message || "Attendance saved and locked successfully! 🔒");

      loadDashboard({ silent: true });
      if (state.recordsLoaded) loadRecords({ silent: true });
      if (state.studentsLoaded) loadStudents({ silent: true });
    } catch (error) {
      const isOffline = !navigator.onLine || error.message === "Offline" || error.message.includes("Could not reach") || error.message.includes("connection");
      if (isOffline) {
        queueOfflineAttendance(params, records);
        state.isExisting = true;
        state.isLocked = true;
        state.dirty = false;
        if (state.roster.students) {
          state.roster.students.forEach((s) => {
            s.status = state.statuses.get(s.id) || "present";
          });
        }
        renderRoster();
        setText("saveState", "Saved locally 🕒");
        $("saveState").classList.add("is-existing", "is-offline-saved");
        $("saveState").classList.remove("is-dirty");
        setText(
          "saveHelp",
          "Saved offline in device memory! Will sync to website as soon as internet connects."
        );
        toast("Saved offline! Will sync automatically once internet connects 🕒", "info");
      } else {
        toast(error.message, "error");
        setText(
          "saveHelp",
          "Your changes are still here. Check the details and try saving again."
        );
      }
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
    state.isLocked = false;
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
    const totalStudents = state.classes.reduce((sum, c) => sum + (c.student_count || 0), 0);
    const options = [
      optionMarkup("all", `All Sections · ${totalStudents} students`),
      ...state.classes.map((classItem) =>
        optionMarkup(classItem.id, `${classItem.code} · ${classItem.name} (${classItem.student_count || 0})`)
      ),
    ];
    classFilter.innerHTML = options.join("");
    classFilter.value = "all";
    renderStudentSectionPills();
    populateStudentsSubjects(classFilter.value || "");
    initializeAdminModals();
  }

  function renderStudentSectionPills() {
    const container = $("studentSectionPills");
    if (!container) return;
    const activeVal = $("studentsClassFilter") ? $("studentsClassFilter").value : "all";
    const totalStudents = state.classes.reduce((sum, c) => sum + (c.student_count || 0), 0);
    const pills = [
      { id: "all", label: `All Sections (${totalStudents})` },
      ...state.classes.map((c) => ({ id: String(c.id), label: `${c.code} (${c.student_count || 0})` })),
    ];

    container.innerHTML = pills
      .map(
        (p) => `
        <button type="button" class="section-pill ${activeVal === p.id ? "is-active" : ""}" data-section-pill="${p.id}">
          ${escapeHTML(p.label)}
        </button>`
      )
      .join("");
  }

  function initializeAdminModals() {
    const studentClassSelect = $("newStudentClass");
    if (studentClassSelect && state.classes) {
      studentClassSelect.innerHTML = state.classes
        .map((c) => `<option value="${c.id}">${escapeHTML(c.code)} · ${escapeHTML(c.name)}</option>`)
        .join("");
    }

    $("openAddStudentModal")?.addEventListener("click", () => {
      $("modalAddStudent").hidden = false;
      $("newStudentName")?.focus();
    });

    $("openAddFacultyModal")?.addEventListener("click", () => {
      $("modalAddFaculty").hidden = false;
      $("newTeacherName")?.focus();
    });

    $("openImportModal")?.addEventListener("click", () => {
      $("modalImportStudents").hidden = false;
    });

    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".modal-backdrop").forEach((m) => (m.hidden = true));
      });
    });

    $("formAddStudent")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = $("btnSubmitAddStudent");
      setButtonLoading(submitBtn, true);
      try {
        const res = await api.post("/api/admin/student/add", {
          name: $("newStudentName").value.trim(),
          register_no: $("newStudentRegNo").value.trim(),
          class_id: $("newStudentClass").value,
          email: $("newStudentEmail").value.trim(),
          password: $("newStudentPassword").value.trim() || "student123",
        });
        toast(res.message);
        $("formAddStudent").reset();
        $("newStudentPassword").value = "student123";
        $("modalAddStudent").hidden = true;
        loadDashboard({ silent: true });
        loadStudents();
      } catch (err) {
        toast(err.message, "error");
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });

    $("formAddFaculty")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = $("btnSubmitAddFaculty");
      setButtonLoading(submitBtn, true);
      try {
        const res = await api.post("/api/admin/teacher/add", {
          name: $("newTeacherName").value.trim(),
          employee_id: $("newTeacherEmpId").value.trim(),
          email: $("newTeacherEmail").value.trim(),
          department: $("newTeacherDept").value.trim(),
          password: $("newTeacherPassword").value.trim() || "teacher123",
        });
        toast(res.message);
        $("formAddFaculty").reset();
        $("newTeacherDept").value = "Computer Applications";
        $("newTeacherPassword").value = "teacher123";
        $("modalAddFaculty").hidden = true;
        loadDashboard({ silent: true });
      } catch (err) {
        toast(err.message, "error");
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });

    const fileInput = $("importFileInput");
    const statusBox = $("importFileStatus");
    const importBtn = $("btnSubmitImport");
    let selectedFile = null;

    fileInput?.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        selectedFile = e.target.files[0];
        setText("importDropLabel", `Selected: ${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`);
        importBtn.disabled = false;
        if (statusBox) {
          statusBox.textContent = "File ready for import. Click 'Start Import' below.";
          statusBox.hidden = false;
        }
      }
    });

    importBtn?.addEventListener("click", async () => {
      if (!selectedFile) return;
      setButtonLoading(importBtn, true);
      if ($("btnImportText")) $("btnImportText").textContent = "Importing students…";

      try {
        const isCsv = selectedFile.name.toLowerCase().endsWith(".csv");
        const reader = new FileReader();

        reader.onload = async () => {
          try {
            let payload = {};
            if (isCsv) {
              payload = { csv_text: reader.result, filename: selectedFile.name };
            } else {
              const base64Str = reader.result.split(",")[1];
              payload = { file_base64: base64Str, filename: selectedFile.name };
            }

            const res = await api.post("/api/admin/students/import", payload);
            toast(res.message);
            $("modalImportStudents").hidden = true;
            selectedFile = null;
            if (fileInput) fileInput.value = "";
            setText("importDropLabel", "Click to select or drag & drop Excel / CSV file");
            importBtn.disabled = true;
            if (statusBox) statusBox.hidden = true;
            loadDashboard({ silent: true });
            loadStudents();
          } catch (err) {
            toast(err.message, "error");
          } finally {
            setButtonLoading(importBtn, false);
            if ($("btnImportText")) $("btnImportText").textContent = "Start Import";
          }
        };

        if (isCsv) {
          reader.readAsText(selectedFile);
        } else {
          reader.readAsDataURL(selectedFile);
        }
      } catch (err) {
        toast(err.message, "error");
        setButtonLoading(importBtn, false);
        if ($("btnImportText")) $("btnImportText").textContent = "Start Import";
      }
    });

    $("tabEnrolledStudents")?.addEventListener("click", () => {
      $("tabEnrolledStudents").classList.add("is-active");
      $("tabAddStudents").classList.remove("is-active");
      $("paneEnrolledStudents").hidden = false;
      $("paneAddStudents").hidden = true;
    });

    $("tabAddStudents")?.addEventListener("click", () => {
      $("tabAddStudents").classList.add("is-active");
      $("tabEnrolledStudents").classList.remove("is-active");
      $("paneAddStudents").hidden = false;
      $("paneEnrolledStudents").hidden = true;
    });

    $("rosterEnrolledSearch")?.addEventListener("input", (e) => {
      renderEnrolledRoster(e.target.value);
    });

    $("rosterAddSearch")?.addEventListener("input", (e) => {
      renderAvailableRoster(e.target.value, activeRosterSection);
    });

    $("rosterSectionPills")?.addEventListener("click", (e) => {
      const pill = e.target.closest(".section-pill");
      if (!pill) return;
      $("rosterSectionPills").querySelectorAll(".section-pill").forEach((p) => p.classList.remove("is-active"));
      pill.classList.add("is-active");
      activeRosterSection = pill.dataset.sec;
      renderAvailableRoster($("rosterAddSearch").value, activeRosterSection);
    });
  }

  function populateStudentsSubjects(classId, preferredSubject = "") {
    const subjectFilter = $("studentsSubjectFilter");
    if (!subjectFilter) return;
    const subjects = new Map();
    state.assignments
      .filter((item) => !classId || classId === "all" || item.class_id === Number(classId))
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
          <td><span class="table-class">${escapeHTML(student.register_no)}</span>${student.class_code ? ` <span class="section-tag">${escapeHTML(student.class_code)}</span>` : ""}</td>
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
     Electives (Semester 2) Management
     --------------------------------------------------------- */
  state.electives = [];
  state.currentElective = null;
  state.electiveRosterData = null;
  let activeRosterSection = "all";

  async function loadElectives() {
    const grid = $("electivesGrid");
    if (!grid) return;
    grid.innerHTML = '<div class="skeleton-card" style="height:180px"></div><div class="skeleton-card" style="height:180px"></div>';
    try {
      const response = await fetch("/api/electives");
      const data = await response.json();
      if (!data.ok) throw new Error(data.message || "Failed to load electives.");
      state.electives = data.electives || [];
      if (Array.isArray(data.faculty) && data.faculty.length) {
        state.teachers = data.faculty;
      }
      renderElectiveCards(state.electives);
    } catch (err) {
      grid.innerHTML = `<div class="empty-state"><p>${escapeHTML(err.message)}</p></div>`;
    }
  }

  function renderElectiveCards(electives) {
    const grid = $("electivesGrid");
    if (!grid) return;
    if (!electives.length) {
      grid.innerHTML = '<div class="empty-state"><p>No electives scheduled.</p></div>';
      return;
    }
    const isAdmin = Boolean(state.data?.admin_view || window.location.pathname.startsWith("/admin"));

    grid.innerHTML = electives
      .map((el) => {
        return `
        <article class="elective-card">
          <div>
            <div class="elective-card__head">
              <span class="section-tag">${escapeHTML(el.code)}</span>
              <span class="live-pill">Elective</span>
            </div>
            <h3 class="elective-card__title">${escapeHTML(el.name)}</h3>
            <div class="elective-card__faculty" style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
              <div style="display:flex; align-items:center; gap:6px; min-width:0;">
                <svg viewBox="0 0 20 20" fill="currentColor" style="flex-shrink:0;"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>
                <span style="font-size:12px;">Faculty: <strong style="${el.teacher_id ? 'color:var(--text-main);' : 'color:#b45309; font-weight:700;'}">${escapeHTML(el.teacher_name)}</strong></span>
              </div>
              ${isAdmin ? `
                <button class="btn btn--ghost btn--small" type="button" data-allocate-faculty="${el.id}" style="padding:2px 8px; font-size:11px; height:auto; border-radius:4px; font-weight:700; flex-shrink:0;">
                  ✎ Allocate
                </button>
              ` : ''}
            </div>
          </div>

          <div class="elective-card__stats">
            <div class="elective-card__count-row">
              <span>Enrolled Students</span>
              <strong style="color:var(--green-dark);">${el.enrolled_count} ${plural(el.enrolled_count, "student")}</strong>
            </div>
          </div>

          <div class="elective-card__foot" style="display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap;">
            <button class="btn btn--ghost btn--small" type="button" data-view-enrolled="${el.id}">
              Enrolled (${el.enrolled_count})
            </button>
            <button class="btn btn--lime btn--small" type="button" data-add-students="${el.id}" style="font-weight:700;">
              + Add Students
            </button>
          </div>
        </article>
      `;
      })
      .join("");

    grid.querySelectorAll("[data-add-students]").forEach((btn) => {
      btn.addEventListener("click", () => openElectiveRoster(parseInt(btn.dataset.addStudents, 10), "add"));
    });
    grid.querySelectorAll("[data-view-enrolled]").forEach((btn) => {
      btn.addEventListener("click", () => openElectiveRoster(parseInt(btn.dataset.viewEnrolled, 10), "enrolled"));
    });
    grid.querySelectorAll("[data-allocate-faculty]").forEach((btn) => {
      btn.addEventListener("click", () => openAllocateFacultyModal(parseInt(btn.dataset.allocateFaculty, 10)));
    });
  }

  async function openElectiveRoster(electiveId, initialTab = "add") {
    const modal = $("modalElectiveRoster");
    if (!modal) return;
    modal.hidden = false;

    const isAdd = initialTab === "add";
    $("tabAddStudents")?.classList.toggle("is-active", isAdd);
    $("tabEnrolledStudents")?.classList.toggle("is-active", !isAdd);
    if ($("paneAddStudents")) $("paneAddStudents").hidden = !isAdd;
    if ($("paneEnrolledStudents")) $("paneEnrolledStudents").hidden = isAdd;
    if ($("rosterEnrolledSearch")) $("rosterEnrolledSearch").value = "";
    if ($("rosterAddSearch")) $("rosterAddSearch").value = "";
    activeRosterSection = "all";

    $("rosterSectionPills")?.querySelectorAll(".section-pill").forEach((p) => {
      p.classList.toggle("is-active", p.dataset.sec === "all");
    });

    $("enrolledStudentsList").innerHTML = '<div style="padding:20px; text-align:center;">Loading roster…</div>';
    $("availableStudentsList").innerHTML = '<div style="padding:20px; text-align:center;">Loading students…</div>';

    try {
      const response = await fetch(`/api/electives/${electiveId}/students`);
      const data = await response.json();
      if (!data.ok) throw new Error(data.message || "Failed to load elective students.");
      state.currentElective = data.elective;
      state.electiveRosterData = data;

      $("modalElectiveCode").textContent = data.elective.code;
      $("modalElectiveTitle").textContent = data.elective.name;
      $("modalElectiveTeacher").textContent = `Faculty In-Charge: ${data.elective.teacher_name}`;
      $("modalEnrolledCount").textContent = data.enrolled_students.length;

      renderEnrolledRoster();
      renderAvailableRoster();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  function renderEnrolledRoster(filterText = "") {
    const container = $("enrolledStudentsList");
    if (!container || !state.electiveRosterData) return;
    const enrolled = state.electiveRosterData.enrolled_students || [];
    const query = filterText.trim().toLowerCase();
    const filtered = enrolled.filter(
      (s) => !query || s.name.toLowerCase().includes(query) || s.register_no.toLowerCase().includes(query)
    );

    if (!filtered.length) {
      container.innerHTML = `<div style="padding:24px; text-align:center; color:var(--text-muted); font-size:13px;">${
        enrolled.length ? "No enrolled students match your search." : "No students enrolled in this elective yet. Click '+ Enroll Students' to add."
      }</div>`;
      return;
    }

    container.innerHTML = filtered
      .map(
        (s) => `
      <div class="roster-student-item">
        <div class="roster-student-info">
          <span class="roster-student-avatar">${escapeHTML(s.name.slice(0, 2).toUpperCase())}</span>
          <div class="roster-student-details">
            <strong>${escapeHTML(s.name)}</strong>
            <small>
              <span>${escapeHTML(s.register_no)}</span>
              <span class="section-tag">${escapeHTML(s.class_code || "MCA")}</span>
              <span class="enrolled-here-pill">✓ Enrolled</span>
            </small>
          </div>
        </div>
        <button class="btn-remove-student" type="button" data-unenroll-student="${s.id}" data-student-name="${escapeHTML(s.name)}">
          Remove ✕
        </button>
      </div>
    `
      )
      .join("");

    container.querySelectorAll("[data-unenroll-student]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const studentId = parseInt(btn.dataset.unenrollStudent, 10);
        const studentName = btn.dataset.studentName;
        if (confirm(`Remove ${studentName} from this elective?`)) {
          unenrollStudent(state.currentElective.id, studentId);
        }
      });
    });
  }

  function renderAvailableRoster(filterText = "", secFilter = activeRosterSection) {
    const container = $("availableStudentsList");
    if (!container || !state.electiveRosterData) return;
    const available = state.electiveRosterData.available_students || [];
    const query = filterText.trim().toLowerCase();

    const filtered = available.filter((s) => {
      if (secFilter !== "all" && s.class_code !== secFilter) return false;
      if (query && !s.name.toLowerCase().includes(query) && !s.register_no.toLowerCase().includes(query)) return false;
      return true;
    });

    if (!filtered.length) {
      container.innerHTML = `<div style="padding:24px; text-align:center; color:var(--text-muted); font-size:13px;">No matching students found.</div>`;
      return;
    }

    container.innerHTML = filtered
      .map((s) => {
        let actionHtml = "";
        let badgeHtml = "";
        if (s.is_enrolled_here) {
          badgeHtml = '<span class="enrolled-here-pill">✓ Enrolled Here</span>';
          actionHtml = `<button class="btn-remove-student" type="button" data-unenroll-student="${s.id}" data-student-name="${escapeHTML(s.name)}">Remove</button>`;
        } else if (!s.can_enroll) {
          badgeHtml = `<span class="conflict-pill" title="Student is already taking another elective">Enrolled in ${escapeHTML(s.conflict_elective || "another elective")}</span>`;
          actionHtml = `<button class="btn-enroll-student" type="button" disabled title="1 student can only take 1 elective">Locked</button>`;
        } else {
          actionHtml = `<button class="btn-enroll-student" type="button" data-enroll-student="${s.id}">+ Enroll</button>`;
        }

        return `
        <div class="roster-student-item">
          <div class="roster-student-info">
            <span class="roster-student-avatar">${escapeHTML(s.name.slice(0, 2).toUpperCase())}</span>
            <div class="roster-student-details">
              <strong>${escapeHTML(s.name)}</strong>
              <small>
                <span>${escapeHTML(s.register_no)}</span>
                <span class="section-tag">${escapeHTML(s.class_code)}</span>
                ${badgeHtml}
              </small>
            </div>
          </div>
          ${actionHtml}
        </div>
      `;
      })
      .join("");

    container.querySelectorAll("[data-enroll-student]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const studentId = parseInt(btn.dataset.enrollStudent, 10);
        enrollStudent(state.currentElective.id, studentId);
      });
    });

    container.querySelectorAll("[data-unenroll-student]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const studentId = parseInt(btn.dataset.unenrollStudent, 10);
        const studentName = btn.dataset.studentName;
        if (confirm(`Remove ${studentName} from this elective?`)) {
          unenrollStudent(state.currentElective.id, studentId);
        }
      });
    });
  }

  async function enrollStudent(electiveId, studentId) {
    try {
      const response = await fetch(`/api/electives/${electiveId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId }),
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.message || "Failed to enroll student.");
      toast(data.message, "success");
      await openElectiveRoster(electiveId);
      loadElectives();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function unenrollStudent(electiveId, studentId) {
    try {
      const response = await fetch(`/api/electives/${electiveId}/unenroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId }),
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.message || "Failed to remove student.");
      toast(data.message, "success");
      await openElectiveRoster(electiveId);
      loadElectives();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  function initializeAddElective() {
    $("btnOpenAddElective")?.addEventListener("click", () => {
      const modal = $("modalAddElective");
      if (!modal) return;
      modal.hidden = false;
      const teacherSelect = $("newElectiveTeacher");
      if (teacherSelect && state.teachers) {
        teacherSelect.innerHTML = state.teachers
          .map((t) => `<option value="${t.id}">${escapeHTML(t.name)} (${escapeHTML(t.employee_id)})</option>`)
          .join("");
      }
    });

    $("formAddElective")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = $("btnSubmitAddElective");
      setButtonLoading(submitBtn, true);
      try {
        const payload = {
          code: $("newElectiveCode").value.trim(),
          name: $("newElectiveName").value.trim(),
          teacher_id: $("newElectiveTeacher").value ? parseInt($("newElectiveTeacher").value, 10) : null,
          capacity: 999,
          semester: 2,
        };
        const res = await api.post("/api/electives/add", payload);
        toast(res.message, "success");
        $("modalAddElective").hidden = true;
        $("formAddElective").reset();
        loadElectives();
      } catch (err) {
        toast(err.message, "error");
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });

    $("formAllocateFaculty")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentAllocatingElectiveId) return;
      const submitBtn = $("btnSubmitAllocateFaculty");
      const restore = setButtonLoading ? setButtonLoading(submitBtn, "Allocating…") : () => {};

      const select = $("allocateFacultySelect");
      const teacherId = select.value ? parseInt(select.value, 10) : null;

      try {
        const res = await api.post(`/api/electives/${currentAllocatingElectiveId}/assign-faculty`, {
          teacher_id: teacherId,
        });
        toast(res.message || "Faculty allocated successfully!", "success");
        $("modalAllocateFaculty").hidden = true;
        loadElectives();
      } catch (err) {
        toast(err.message || "Failed to allocate faculty.", "error");
      } finally {
        if (typeof restore === "function") restore();
      }
    });
  }

  let currentAllocatingElectiveId = null;

  function openAllocateFacultyModal(electiveId) {
    const modal = $("modalAllocateFaculty");
    if (!modal) return;
    const el = state.electives.find((item) => item.id === electiveId);
    if (!el) return;
    currentAllocatingElectiveId = electiveId;

    if ($("allocateElectiveCode")) $("allocateElectiveCode").textContent = el.code;
    if ($("allocateElectiveName")) $("allocateElectiveName").textContent = `${el.code} (${el.name})`;

    const select = $("allocateFacultySelect");
    if (select) {
      const teachers = state.teachers || [];
      select.innerHTML = `
        <option value="">-- No Faculty / Unassigned --</option>
        ${teachers
          .map(
            (t) => `
          <option value="${t.id}" ${el.teacher_id === t.id ? "selected" : ""}>
            ${escapeHTML(t.name)} (${escapeHTML(t.employee_id)})
          </option>
        `
          )
          .join("")}
      `;
    }

    modal.hidden = false;
  }

  /* ---------------------------------------------------------
     User Profile Modal & Avatar Management
     --------------------------------------------------------- */
  let currentProfilePhotoBase64 = "";

  function openProfileModal() {
    const modal = $("modalUserProfile");
    if (!modal) return;
    const teacher = state.data?.teacher || {};
    const isAdmin = Boolean(state.data?.admin_view);

    if ($("profileRoleBadge")) {
      $("profileRoleBadge").textContent = isAdmin ? "Administrator" : "Faculty Profile";
    }
    if ($("modalProfileTitle")) {
      $("modalProfileTitle").textContent = isAdmin ? "Administrator Profile" : "Faculty Profile";
    }
    if ($("profileDisplayCardName")) {
      $("profileDisplayCardName").textContent = teacher.name || (isAdmin ? "Administrator" : "Faculty");
    }

    if ($("profileFullName")) $("profileFullName").value = teacher.name || "";
    if ($("profileEmpId")) $("profileEmpId").value = teacher.employee_id || teacher.username || "";
    if ($("profileEmail")) $("profileEmail").value = teacher.email || "";
    if ($("profileDob")) $("profileDob").value = teacher.dob || "";
    if ($("profileQualification")) $("profileQualification").value = teacher.qualification || "";
    if ($("profileDepartment")) $("profileDepartment").value = teacher.department || (isAdmin ? "Administration" : "");
    if ($("profileBio")) $("profileBio").value = teacher.bio || "";

    currentProfilePhotoBase64 = teacher.photo_base64 || "";
    renderProfileModalPhoto(currentProfilePhotoBase64, teacher.name);

    modal.hidden = false;
  }

  function renderProfileModalPhoto(photoBase64, name = "") {
    const preview = $("profileAvatarLarge");
    if (!preview) return;
    if (photoBase64) {
      preview.innerHTML = `<img src="${photoBase64}" alt="${escapeHTML(name || "Profile")}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;">`;
    } else {
      preview.innerHTML = `<span id="profileAvatarInitials" style="font-size:32px; font-weight:700;">${initials(name || "Profile")}</span>`;
    }
  }

  function compressAndSetPhoto(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please upload a valid image file (PNG, JPG, WebP).", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 600;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        currentProfilePhotoBase64 = canvas.toDataURL("image/jpeg", 0.85);
        renderProfileModalPhoto(currentProfilePhotoBase64, $("profileFullName")?.value || "");
        toast("Photo loaded! Click 'Save Profile Changes' to save.", "info");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function initializeProfileModal() {
    const chip = $("headerProfileChip");
    if (chip) {
      chip.addEventListener("click", (e) => {
        if (e.target.closest("a, button, [data-logout]")) return;
        openProfileModal();
      });
    }

    $("inputProfilePhoto")?.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        compressAndSetPhoto(e.target.files[0]);
      }
    });

    $("inputProfileCamera")?.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        compressAndSetPhoto(e.target.files[0]);
      }
    });

    $("btnRemoveProfilePhoto")?.addEventListener("click", () => {
      currentProfilePhotoBase64 = "";
      renderProfileModalPhoto("", $("profileFullName")?.value || "");
      toast("Photo removed. Save to apply changes.", "info");
    });

    $("formUserProfile")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const saveBtn = $("btnSaveProfile");
      const restore = setButtonLoading ? setButtonLoading(saveBtn, "Saving…") : () => {};

      const payload = {
        name: $("profileFullName").value.trim(),
        email: $("profileEmail").value.trim(),
        dob: $("profileDob").value.trim(),
        qualification: $("profileQualification").value.trim(),
        department: $("profileDepartment").value.trim(),
        bio: $("profileBio").value.trim(),
        photo_base64: currentProfilePhotoBase64,
      };

      try {
        const response = await fetch("/api/profile/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!data.ok) throw new Error(data.message || "Failed to update profile.");

        toast("Profile updated successfully!", "success");
        $("modalUserProfile").hidden = true;

        if (state.data && state.data.teacher) {
          Object.assign(state.data.teacher, data.user || payload);
          setText("teacherName", state.data.teacher.name);
          setText("teacherDepartment", state.data.teacher.email || state.data.teacher.department);
          const avatarEl = $("teacherAvatar");
          if (avatarEl) {
            if (state.data.teacher.photo_base64) {
              avatarEl.innerHTML = `<img src="${state.data.teacher.photo_base64}" alt="${escapeHTML(state.data.teacher.name)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;">`;
            } else {
              avatarEl.textContent = initials(state.data.teacher.name);
            }
          }
        }
      } catch (err) {
        toast(err.message || "Error saving profile.", "error");
      } finally {
        if (typeof restore === "function") restore();
      }
    });
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

  $("todayScheduleMini")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-today-slot]");
    if (!button) return;
    openMark({
      classId: (state.classes[0] && state.classes[0].id) || null,
      subjectId: Number(button.dataset.subjectId),
      date: state.today,
      period: Number(button.dataset.period),
      substitute: Boolean(Number(button.dataset.canSubstitute)),
    });
  });

  $("rosterList")?.addEventListener("click", (event) => {
    if (state.holiday || state.isLocked) return;
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
      if (!state.roster || state.holiday || state.isLocked) return;
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

  $("unlockAttendanceButton")?.addEventListener("click", () => {
    if (!state.roster || state.holiday) return;
    if (state.isLocked) {
      state.isLocked = false;
      renderRoster();
      toast("Attendance unlocked for editing. Tap Present/Absent to adjust records. ✏️", "info");
    } else {
      state.isLocked = true;
      if (state.roster.students) {
        state.statuses = new Map(
          state.roster.students.map((s) => [
            s.id,
            s.status === "absent" ? "absent" : "present",
          ])
        );
      }
      state.dirty = false;
      renderRoster();
      toast("Editing cancelled. Attendance locked. 🔒", "info");
    }
  });

  $("saveAttendanceButton")?.addEventListener("click", saveAttendance);

  $("recordsClassFilter")?.addEventListener("change", () => {
    populateRecordSubjects($("recordsClassFilter").value);
    loadRecords();
  });
  $("recordsSubjectFilter")?.addEventListener("change", () => loadRecords());
  $("refreshRecordsButton")?.addEventListener("click", () => loadRecords());

  $("studentsClassFilter")?.addEventListener("change", () => {
    renderStudentSectionPills();
    populateStudentsSubjects($("studentsClassFilter").value);
    loadStudents();
  });

  $("studentSectionPills")?.addEventListener("click", (e) => {
    const pill = e.target.closest("[data-section-pill]");
    if (!pill) return;
    const val = pill.dataset.sectionPill;
    const select = $("studentsClassFilter");
    if (select) {
      select.value = val;
      renderStudentSectionPills();
      populateStudentsSubjects(val);
      loadStudents();
    }
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

    if (event.target.closest("[data-close-modal]")) {
      document.querySelectorAll(".modal-backdrop").forEach((m) => (m.hidden = true));
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
     Network & Offline Event Listeners
     --------------------------------------------------------- */
  window.addEventListener("online", () => {
    updateNetworkStatus();
    toast("Connected to internet! Checking offline queue...", "info");
    syncOfflineQueue();
  });

  window.addEventListener("offline", () => {
    updateNetworkStatus();
    toast("You are currently offline. You can still mark attendance!", "info");
  });

  $("manualSyncButton")?.addEventListener("click", () => {
    syncOfflineQueue();
  });

  // Background auto-sync check every 15 seconds
  window.setInterval(() => {
    if (navigator.onLine && getOfflineQueue().length > 0) {
      syncOfflineQueue();
    }
  }, 15000);

  // Register Service Worker for offline PWA capability
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("ServiceWorker registration note:", err);
      });
    });
  }

  /* ---------------------------------------------------------
     Start
     --------------------------------------------------------- */
  updateNetworkStatus();
  loadDashboard();
  if (navigator.onLine && getOfflineQueue().length > 0) {
    syncOfflineQueue();
  }
})();

