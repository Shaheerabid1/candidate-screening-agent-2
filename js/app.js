/* =========================================================
   TALENT BENCH — HR Candidate Screening Agent
   Vanilla JS application logic. No backend, no build step.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. SKILL POOLS + SCORING SIMULATION
     --------------------------------------------------------- */

  const ALL_SKILLS = [
    "JavaScript", "HTML", "CSS", "Python", "React", "Node.js",
    "SQL", "Communication", "Leadership", "Problem Solving"
  ];

  // Skills most relevant to each open position — used to simulate
  // "CV parsing" when a candidate is uploaded without manual skill entry.
  const POSITION_SKILL_POOL = {
    "Frontend Developer": ["HTML", "CSS", "JavaScript", "React", "Problem Solving", "Communication"],
    "Backend Developer": ["Node.js", "SQL", "JavaScript", "Python", "Problem Solving"],
    "Full Stack Developer": ["HTML", "CSS", "JavaScript", "React", "Node.js", "SQL"],
    "UI/UX Designer": ["CSS", "Communication", "Leadership", "Problem Solving"],
    "Data Analyst": ["SQL", "Python", "Communication", "Problem Solving"],
    "Software Developer": ["JavaScript", "Python", "SQL", "Problem Solving", "Leadership"],
    "QA Engineer": ["JavaScript", "SQL", "Problem Solving", "Communication"],
    "Project Manager": ["Leadership", "Communication", "Problem Solving"]
  };

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  // Deterministic-ish pseudo random from a seed string, so results
  // feel stable per candidate name rather than reshuffling on re-render.
  function seededRandom(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) { h = (h * 31 + seed.charCodeAt(i)) >>> 0; }
    return function () {
      h = (h * 1664525 + 1013904223) >>> 0;
      return h / 4294967296;
    };
  }

  // Simulates "AI" CV parsing: picks a realistic skill subset for the
  // applied position, then scores skills-match, experience and an
  // overall weighted score, and maps that to a recommendation tier.
  function simulateScreening({ name, position, experience, skillsOverride }) {
    const rand = seededRandom(name + position + experience);
    const pool = POSITION_SKILL_POOL[position] || ALL_SKILLS.slice(0, 5);

    let detectedSkills = skillsOverride;
    if (!detectedSkills) {
      detectedSkills = pool.filter(() => rand() < 0.72);
      if (detectedSkills.length === 0) detectedSkills = [pool[0]];
      // small chance of one bonus general skill outside the core pool
      const bonus = ALL_SKILLS.filter(s => !detectedSkills.includes(s));
      if (rand() < 0.4 && bonus.length) {
        detectedSkills.push(bonus[Math.floor(rand() * bonus.length)]);
      }
    }

    const skillsMatch = clamp(Math.round((detectedSkills.filter(s => pool.includes(s)).length / pool.length) * 100), 20, 100);
    const expYears = Number(experience) || 0;
    const experienceScore = clamp(Math.round(40 + expYears * 9 + rand() * 6), 30, 100);
    const overall = clamp(Math.round(skillsMatch * 0.6 + experienceScore * 0.4), 0, 100);

    return {
      skills: detectedSkills,
      skillsMatch,
      experienceScore,
      overall,
      recommendation: recommendationFor(overall)
    };
  }

  function recommendationFor(score) {
    if (score >= 90) return "Highly Recommended";
    if (score >= 75) return "Recommended";
    if (score >= 60) return "Consider";
    return "Not Recommended";
  }

  function badgeClassFor(rec) {
    switch (rec) {
      case "Highly Recommended": return "badge-high";
      case "Recommended": return "badge-rec";
      case "Consider": return "badge-consider";
      default: return "badge-low";
    }
  }

  function scoreColorFor(rec) {
    switch (rec) {
      case "Highly Recommended": return "var(--teal)";
      case "Recommended": return "var(--blue)";
      case "Consider": return "var(--amber)";
      default: return "var(--red)";
    }
  }

  function initials(name) {
    return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
  }

  /* ---------------------------------------------------------
     2. STATE
     --------------------------------------------------------- */

  let nextCandidateId = 1;
  let nextInterviewId = 1;
  let nextNotifId = 1;

  const state = {
    candidates: [],
    interviews: [],
    notifications: [],
    rankFilter: "all",
    rankSearch: "",
    candidatesSearch: "",
    lastUploadedFile: null
  };

  function makeCandidate(data) {
    const result = simulateScreening(data);
    return {
      id: nextCandidateId++,
      name: data.name,
      email: data.email,
      phone: data.phone,
      position: data.position,
      experience: Number(data.experience) || 0,
      cvFileName: data.cvFileName || "resume.pdf",
      skills: result.skills,
      skillsMatch: result.skillsMatch,
      experienceScore: result.experienceScore,
      score: result.overall,
      recommendation: result.recommendation,
      status: "pending",          // pending | qualified | rejected
      interviewStatus: "none",    // none | scheduled | completed
      addedAt: Date.now()
    };
  }

  function seedSampleData() {
    const samples = [
      { name: "Ali Khan", email: "ali.khan@mail.com", phone: "+92 300 1112223", position: "Frontend Developer", experience: 4, skillsOverride: ["HTML", "CSS", "JavaScript", "React"] },
      { name: "Sarah Ahmed", email: "sarah.ahmed@mail.com", phone: "+92 301 2223334", position: "Backend Developer", experience: 3, skillsOverride: ["Node.js", "SQL", "JavaScript"] },
      { name: "Ahmed Raza", email: "ahmed.raza@mail.com", phone: "+92 302 3334445", position: "UI/UX Designer", experience: 2, skillsOverride: ["CSS", "Communication"] },
      { name: "John Smith", email: "john.smith@mail.com", phone: "+1 415 555 0182", position: "Full Stack Developer", experience: 5, skillsOverride: ["HTML", "CSS", "JavaScript", "React", "Node.js", "SQL"] },
      { name: "Maria Khan", email: "maria.khan@mail.com", phone: "+92 303 4445556", position: "Data Analyst", experience: 3, skillsOverride: ["SQL", "Python", "Communication"] },
      { name: "Hamza Ali", email: "hamza.ali@mail.com", phone: "+92 304 5556667", position: "Software Developer", experience: 1, skillsOverride: ["JavaScript", "Problem Solving"] }
    ];

    samples.forEach(s => {
      const result = simulateScreening(s);
      state.candidates.push({
        id: nextCandidateId++,
        name: s.name,
        email: s.email,
        phone: s.phone,
        position: s.position,
        experience: s.experience,
        cvFileName: s.name.toLowerCase().replace(/\s+/g, "_") + "_cv.pdf",
        skills: result.skills,
        skillsMatch: result.skillsMatch,
        experienceScore: result.experienceScore,
        score: result.overall,
        recommendation: result.recommendation,
        status: "pending",
        interviewStatus: "none",
        addedAt: Date.now() - Math.floor(Math.random() * 5) * 86400000
      });
    });

    // Mark a couple as already qualified for a realistic starting state
    state.candidates[0].status = "qualified";
    state.candidates[3].status = "qualified";

    // Pre-seed one scheduled interview
    const c = state.candidates[1];
    c.interviewStatus = "scheduled";
    state.interviews.push({
      id: nextInterviewId++,
      candidateId: c.id,
      date: nextWeekday(),
      time: "11:30",
      type: "Online Interview",
      status: "Scheduled"
    });
  }

  function nextWeekday() {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  }

  /* ---------------------------------------------------------
     3. NAVIGATION
     --------------------------------------------------------- */

  const PAGE_META = {
    dashboard: ["Dashboard", "Screening overview across every open role"],
    candidates: ["Candidates", "Every candidate currently in your pipeline"],
    upload: ["Upload Candidate", "Add a new applicant and run AI screening"],
    rankings: ["Rankings", "Candidates ranked by overall match score"],
    interviews: ["Interviews", "Schedule and track candidate interviews"],
    notifications: ["Notifications", "Email and Slack alerts sent by the system"],
    assistant: ["HR Assistant", "Ask questions about your candidate pool"]
  };

  function goToPage(page) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    const target = document.getElementById("page-" + page);
    if (!target) return;
    target.classList.add("active");
    document.querySelectorAll(`.nav-item[data-page="${page}"]`).forEach(n => n.classList.add("active"));

    const meta = PAGE_META[page];
    if (meta) {
      document.getElementById("page-title").textContent = meta[0];
      document.getElementById("page-subtitle").textContent = meta[1];
    }
    closeSidebarMobile();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeSidebarMobile() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("scrim").classList.remove("open");
  }

  /* ---------------------------------------------------------
     4. RENDERING
     --------------------------------------------------------- */

  function render() {
    renderDashboard();
    renderCandidatesTable();
    renderRankingsTable();
    renderInterviewSelect();
    renderInterviewsTable();
    renderNotifications();
  }

  function renderDashboard() {
    const total = state.candidates.length;
    const qualified = state.candidates.filter(c => c.status === "qualified").length;
    const interviews = state.interviews.length;
    const avg = total ? Math.round(state.candidates.reduce((s, c) => s + c.score, 0) / total) : 0;

    document.getElementById("stat-total").textContent = total;
    document.getElementById("stat-qualified").textContent = qualified;
    document.getElementById("stat-interviews").textContent = interviews;
    document.getElementById("stat-avgscore").textContent = avg + "%";

    // Recent candidates (last 5 added)
    const recent = [...state.candidates].sort((a, b) => b.addedAt - a.addedAt).slice(0, 5);
    const recentBody = document.querySelector("#recent-table tbody");
    recentBody.innerHTML = recent.map(c => `
      <tr>
        <td>${candidateCellHTML(c)}</td>
        <td>${c.position}</td>
        <td>${scoreCellHTML(c)}</td>
        <td>${statusBadgeHTML(c)}</td>
      </tr>
    `).join("") || emptyRow(4);

    // Top ranked
    const top = [...state.candidates].sort((a, b) => b.score - a.score).slice(0, 5);
    document.getElementById("top-ranked-list").innerHTML = top.map((c, i) => `
      <li>
        <span class="rank-no">${i + 1}</span>
        <div class="ti-main">
          <span class="ti-name">${c.name}</span>
          <span class="ti-sub">${c.position}</span>
        </div>
        <span class="ti-score">${c.score}%</span>
      </li>
    `).join("") || `<li class="empty-hint">No candidates yet.</li>`;

    // Quick statistics
    const byRec = {
      "Highly Recommended": 0, "Recommended": 0, "Consider": 0, "Not Recommended": 0
    };
    state.candidates.forEach(c => byRec[c.recommendation]++);
    document.getElementById("quickstats").innerHTML = Object.keys(byRec).map(k => {
      const count = byRec[k];
      const pct = total ? Math.round((count / total) * 100) : 0;
      return `
        <div class="qs-row-wrap">
          <div class="qs-row"><span class="qs-label">${k}</span><span class="qs-value">${count}</span></div>
          <div class="qs-bar"><div class="qs-bar-fill" style="width:${pct}%; background:${scoreColorFor(k)}"></div></div>
        </div>`;
    }).join("");

    // Upcoming interviews
    const upcoming = [...state.interviews].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 5);
    document.getElementById("upcoming-interviews-list").innerHTML = upcoming.map(iv => {
      const c = findCandidate(iv.candidateId);
      return `
        <li>
          <div class="ti-main">
            <span class="ti-name">${c ? c.name : "Unknown"}</span>
            <span class="ti-sub">${iv.date} · ${formatTime(iv.time)} · ${iv.type}</span>
          </div>
        </li>`;
    }).join("") || `<li class="empty-hint">No interviews scheduled yet.</li>`;
  }

  function candidateCellHTML(c) {
    return `
      <div class="cand-cell">
        <div class="cand-avatar">${initials(c.name)}</div>
        <div>
          <span class="cand-name">${c.name}</span>
          <span class="cand-email">${c.email}</span>
        </div>
      </div>`;
  }

  function scoreCellHTML(c) {
    return `
      <div class="score-cell">
        <span class="score-num">${c.score}%</span>
        <div class="mini-bar"><div class="mini-bar-fill" style="width:${c.score}%; background:${scoreColorFor(c.recommendation)}"></div></div>
      </div>`;
  }

  function statusBadgeHTML(c) {
    return `<span class="badge ${badgeClassFor(c.recommendation)}"><span class="badge-dot"></span>${c.recommendation}</span>`;
  }

  function skillTagsHTML(skills) {
    return `<div class="skill-tags">${skills.slice(0, 4).map(s => `<span class="skill-tag">${s}</span>`).join("")}${skills.length > 4 ? `<span class="skill-tag">+${skills.length - 4}</span>` : ""}</div>`;
  }

  function emptyRow(cols) {
    return `<tr><td colspan="${cols}" class="empty-hint">No candidates match this view.</td></tr>`;
  }

  function findCandidate(id) { return state.candidates.find(c => c.id === id); }

  function filteredCandidates(list) {
    const q = state.candidatesSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.position.toLowerCase().includes(q) ||
      c.skills.some(s => s.toLowerCase().includes(q))
    );
  }

  function renderCandidatesTable() {
    const body = document.querySelector("#candidates-table tbody");
    const list = filteredCandidates([...state.candidates].sort((a, b) => b.addedAt - a.addedAt));
    body.innerHTML = list.map(c => `
      <tr>
        <td>${candidateCellHTML(c)}</td>
        <td>${c.position}</td>
        <td>${skillTagsHTML(c.skills)}</td>
        <td>${scoreCellHTML(c)}</td>
        <td>${statusBadgeHTML(c)}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-outline btn-sm" data-action="view" data-id="${c.id}"><i class="bi bi-eye"></i></button>
          </div>
        </td>
      </tr>
    `).join("") || emptyRow(6);

    body.querySelectorAll('[data-action="view"]').forEach(btn => {
      btn.addEventListener("click", () => openCandidateModal(Number(btn.dataset.id)));
    });
  }

  function renderRankingsTable() {
    const body = document.querySelector("#rankings-table tbody");
    let list = [...state.candidates].sort((a, b) => b.score - a.score);

    if (state.rankFilter !== "all") {
      list = list.filter(c => c.recommendation === state.rankFilter);
    }
    const q = state.rankSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.position.toLowerCase().includes(q) ||
        c.skills.some(s => s.toLowerCase().includes(q))
      );
    }

    body.innerHTML = list.map((c, i) => `
      <tr>
        <td><span class="rank-no">${i + 1}</span></td>
        <td>${candidateCellHTML(c)}</td>
        <td>${c.position}</td>
        <td>${skillTagsHTML(c.skills)}</td>
        <td>${scoreCellHTML(c)}</td>
        <td>${statusBadgeHTML(c)}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-outline btn-sm" data-action="view" data-id="${c.id}"><i class="bi bi-eye"></i></button>
          </div>
        </td>
      </tr>
    `).join("") || emptyRow(7);

    body.querySelectorAll('[data-action="view"]').forEach(btn => {
      btn.addEventListener("click", () => openCandidateModal(Number(btn.dataset.id)));
    });
  }

  function renderInterviewSelect() {
    const select = document.getElementById("i-candidate");
    const current = select.value;
    select.innerHTML = `<option value="">Choose a candidate</option>` +
      state.candidates.map(c => `<option value="${c.id}">${c.name} — ${c.position}</option>`).join("");
    if (current) select.value = current;
  }

  function renderInterviewsTable() {
    const body = document.querySelector("#interviews-table tbody");
    const list = [...state.interviews].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    body.innerHTML = list.map(iv => {
      const c = findCandidate(iv.candidateId);
      return `
        <tr>
          <td>${c ? candidateCellHTML(c) : "Unknown candidate"}</td>
          <td>${iv.date}</td>
          <td>${formatTime(iv.time)}</td>
          <td>${iv.type}</td>
          <td><span class="badge badge-scheduled"><span class="badge-dot"></span>${iv.status}</span></td>
        </tr>`;
    }).join("") || emptyRow(5);
  }

  function formatTime(t) {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = ((h + 11) % 12) + 1;
    return `${hour}:${String(m).padStart(2, "0")} ${period}`;
  }

  function renderNotifications() {
    const badge = document.getElementById("notif-count");
    badge.textContent = state.notifications.length;
    badge.dataset.zero = state.notifications.length === 0 ? "true" : "false";

    const list = document.getElementById("notif-list");
    if (!state.notifications.length) {
      list.innerHTML = `<li class="empty-hint">No notifications yet. Schedule an interview to see one here.</li>`;
      return;
    }
    list.innerHTML = [...state.notifications].reverse().map(n => `
      <li>
        <div class="notif-icon ${n.channel}"><i class="bi ${n.icon}"></i></div>
        <div>
          <div class="notif-title">${n.title}</div>
          <div class="notif-msg">${n.message}</div>
          <div class="notif-time">${n.time}</div>
        </div>
      </li>
    `).join("");
  }

  /* ---------------------------------------------------------
     5. CANDIDATE DETAILS MODAL
     --------------------------------------------------------- */

  function openCandidateModal(id) {
    const c = findCandidate(id);
    if (!c) return;
    const backdrop = document.getElementById("modal-backdrop");
    const content = document.getElementById("modal-content");

    content.innerHTML = `
      <div class="mc-header">
        <div class="mc-avatar">${initials(c.name)}</div>
        <div>
          <div class="mc-name">${c.name}</div>
          <div class="mc-position">${c.position}</div>
        </div>
      </div>

      <div class="mc-section">
        <h4>Contact Information</h4>
        <div class="mc-grid">
          <div><span>Email</span>${c.email}</div>
          <div><span>Phone</span>${c.phone}</div>
          <div><span>Experience</span>${c.experience} years</div>
          <div><span>CV File</span>${c.cvFileName}</div>
        </div>
      </div>

      <div class="mc-section">
        <h4>Skills</h4>
        ${skillTagsHTML(c.skills)}
      </div>

      <div class="mc-section">
        <h4>AI Match Score</h4>
        <div class="score-block">
          <div class="score-row">
            <span class="label">Overall Match</span>
            <div class="bar"><div class="bar-fill" style="width:${c.score}%; background:${scoreColorFor(c.recommendation)}"></div></div>
            <span class="val">${c.score}%</span>
          </div>
          <div class="score-row">
            <span class="label">Skills Match</span>
            <div class="bar"><div class="bar-fill" style="width:${c.skillsMatch}%; background: var(--blue)"></div></div>
            <span class="val">${c.skillsMatch}%</span>
          </div>
          <div class="score-row">
            <span class="label">Experience</span>
            <div class="bar"><div class="bar-fill" style="width:${c.experienceScore}%; background: var(--purple)"></div></div>
            <span class="val">${c.experienceScore}%</span>
          </div>
        </div>
        <div style="margin-top:12px;">${statusBadgeHTML(c)}</div>
      </div>

      <div class="mc-section">
        <h4>Interview Status</h4>
        <span class="badge ${c.interviewStatus === "scheduled" ? "badge-scheduled" : "badge-pending"}">
          <span class="badge-dot"></span>${c.interviewStatus === "scheduled" ? "Interview Scheduled" : "Not Scheduled"}
        </span>
        &nbsp;
        <span class="badge ${c.status === "qualified" ? "badge-qualified" : c.status === "rejected" ? "badge-rejected" : "badge-pending"}">
          <span class="badge-dot"></span>${c.status === "qualified" ? "Qualified" : c.status === "rejected" ? "Rejected" : "Pending Review"}
        </span>
      </div>

      <div class="mc-actions">
        <button class="btn btn-primary" id="mc-schedule"><i class="bi bi-calendar-plus"></i> Schedule Interview</button>
        <button class="btn btn-outline" id="mc-qualify"><i class="bi bi-patch-check"></i> Mark as Qualified</button>
        <button class="btn btn-danger-outline" id="mc-reject"><i class="bi bi-x-circle"></i> Reject Candidate</button>
      </div>
    `;

    content.querySelector("#mc-schedule").addEventListener("click", () => {
      closeModal();
      goToPage("interviews");
      document.getElementById("i-candidate").value = c.id;
    });
    content.querySelector("#mc-qualify").addEventListener("click", () => {
      c.status = "qualified";
      render();
      closeModal();
      showToast("success", "Candidate qualified", `${c.name} has been marked as qualified.`);
    });
    content.querySelector("#mc-reject").addEventListener("click", () => {
      c.status = "rejected";
      render();
      closeModal();
      showToast("error", "Candidate rejected", `${c.name} has been marked as rejected.`);
    });

    backdrop.classList.add("open");
  }

  function closeModal() {
    document.getElementById("modal-backdrop").classList.remove("open");
  }

  /* ---------------------------------------------------------
     6. TOASTS
     --------------------------------------------------------- */

  function showToast(type, title, msg) {
    const container = document.getElementById("toast-container");
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `
      <i class="bi ${type === "success" ? "bi-check-circle" : "bi-exclamation-circle"}"></i>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${msg}</div>
      </div>`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity .3s ease, transform .3s ease";
      el.style.opacity = "0";
      el.style.transform = "translateX(20px)";
      setTimeout(() => el.remove(), 300);
    }, 3800);
  }

  function pushNotification(channel, icon, title, message) {
    state.notifications.push({
      id: nextNotifId++,
      channel, icon, title, message,
      time: new Date().toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    });
    renderNotifications();
  }

  /* ---------------------------------------------------------
     7. UPLOAD FORM
     --------------------------------------------------------- */

  function initUploadForm() {
    const fileDrop = document.getElementById("file-drop");
    const fileInput = document.getElementById("f-cv");
    const fileDropText = document.getElementById("file-drop-text");

    fileDrop.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      if (fileInput.files.length) {
        fileDropText.textContent = fileInput.files[0].name;
        fileDrop.classList.add("has-file");
      } else {
        fileDropText.textContent = "Click to select a CV file (PDF or DOCX)";
        fileDrop.classList.remove("has-file");
      }
    });

    document.getElementById("upload-form").addEventListener("submit", (e) => {
      e.preventDefault();

      const name = document.getElementById("f-name").value.trim();
      const email = document.getElementById("f-email").value.trim();
      const phone = document.getElementById("f-phone").value.trim();
      const position = document.getElementById("f-position").value;
      const experience = document.getElementById("f-experience").value;
      const cvFileName = fileInput.files.length ? fileInput.files[0].name : "resume.pdf";

      if (!name || !email || !phone || !position) {
        showToast("error", "Missing information", "Please fill in all required fields.");
        return;
      }

      const analysisBox = document.getElementById("analysis-box");
      analysisBox.hidden = false;
      const submitBtn = e.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      // Simulate a short AI analysis delay for a realistic feel.
      setTimeout(() => {
        const candidate = makeCandidate({ name, email, phone, position, experience, cvFileName });
        state.candidates.push(candidate);

        analysisBox.hidden = true;
        submitBtn.disabled = false;
        e.target.reset();
        fileDropText.textContent = "Click to select a CV file (PDF or DOCX)";
        fileDrop.classList.remove("has-file");

        render();
        showToast("success", "Screening complete", `${candidate.name} scored ${candidate.score}% — ${candidate.recommendation}.`);
        openCandidateModal(candidate.id);
        goToPage("candidates");
      }, 900);
    });
  }

  /* ---------------------------------------------------------
     8. RANKINGS FILTERS + SEARCH
     --------------------------------------------------------- */

  function initRankingsControls() {
    document.querySelectorAll("#rank-filters .chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll("#rank-filters .chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        state.rankFilter = chip.dataset.filter;
        renderRankingsTable();
      });
    });
    document.getElementById("rankings-search").addEventListener("input", (e) => {
      state.rankSearch = e.target.value;
      renderRankingsTable();
    });
    document.getElementById("candidates-search").addEventListener("input", (e) => {
      state.candidatesSearch = e.target.value;
      renderCandidatesTable();
    });
    document.getElementById("global-search").addEventListener("input", (e) => {
      state.candidatesSearch = e.target.value;
      renderCandidatesTable();
      if (e.target.value) goToPage("candidates");
    });
  }

  /* ---------------------------------------------------------
     9. INTERVIEW SCHEDULER
     --------------------------------------------------------- */

  function initInterviewForm() {
    // sensible default date: tomorrow
    const dateInput = document.getElementById("i-date");
    const d = new Date();
    d.setDate(d.getDate() + 1);
    dateInput.min = d.toISOString().slice(0, 10);

    document.getElementById("interview-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const candidateId = Number(document.getElementById("i-candidate").value);
      const date = document.getElementById("i-date").value;
      const time = document.getElementById("i-time").value;
      const type = document.getElementById("i-type").value;

      const c = findCandidate(candidateId);
      if (!c) {
        showToast("error", "Select a candidate", "Choose a candidate before scheduling.");
        return;
      }

      state.interviews.push({
        id: nextInterviewId++,
        candidateId, date, time, type, status: "Scheduled"
      });
      c.interviewStatus = "scheduled";

      render();
      e.target.reset();

      showToast("success", "Interview scheduled", `${c.name} is booked for ${date} at ${formatTime(time)}.`);

      pushNotification("email", "bi-envelope-check", "Email notification sent",
        `Interview invitation successfully sent to ${c.name} (${c.email}) for the ${type.toLowerCase()} on ${date} at ${formatTime(time)}.`);
      pushNotification("slack", "bi-slack", "Slack notification sent",
        `#hiring-${c.position.toLowerCase().replace(/\s+/g, "-")}: ${c.name} scheduled for a ${type.toLowerCase()} on ${date}.`);
    });
  }

  /* ---------------------------------------------------------
     10. HR ASSISTANT (simulated chat)
     --------------------------------------------------------- */

  function initAssistant() {
    const chatWindow = document.getElementById("chat-window");

    addBotMessage("Hi, I'm your HR Assistant. Ask me about candidates, scores, or scheduled interviews — or tap a suggestion below to get started.");

    document.querySelectorAll("#suggested-questions .chip").forEach(chip => {
      chip.addEventListener("click", () => handleChatQuestion(chip.dataset.q));
    });

    document.getElementById("chat-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("chat-input");
      const q = input.value.trim();
      if (!q) return;
      input.value = "";
      handleChatQuestion(q);
    });

    function addUserMessage(text) {
      const el = document.createElement("div");
      el.className = "msg msg-user";
      el.innerHTML = `<div class="msg-avatar"><i class="bi bi-person"></i></div><div class="msg-bubble">${escapeHTML(text)}</div>`;
      chatWindow.appendChild(el);
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function addBotMessage(html) {
      const el = document.createElement("div");
      el.className = "msg msg-bot";
      el.innerHTML = `<div class="msg-avatar"><i class="bi bi-stars"></i></div><div class="msg-bubble">${html}</div>`;
      chatWindow.appendChild(el);
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function escapeHTML(s) {
      const div = document.createElement("div");
      div.textContent = s;
      return div.innerHTML;
    }

    function handleChatQuestion(question) {
      addUserMessage(question);
      const reply = generateAssistantReply(question);
      setTimeout(() => addBotMessage(reply), 350);
    }

    window.__askAssistant = handleChatQuestion; // exposed for potential external use
  }

  function generateAssistantReply(question) {
    const q = question.toLowerCase();
    const sorted = [...state.candidates].sort((a, b) => b.score - a.score);

    if (q.includes("top") && q.includes("candidate")) {
      if (!sorted.length) return "There are no candidates in the system yet.";
      const top5 = sorted.slice(0, 5);
      return `Here are the top ${top5.length} candidates by match score:` +
        `<ul>${top5.map(c => `<li>${c.name} — ${c.position} (${c.score}%, ${c.recommendation})</li>`).join("")}</ul>`;
    }

    if (q.includes("highest score") || (q.includes("best") && q.includes("candidate"))) {
      if (!sorted.length) return "There are no candidates in the system yet.";
      const best = sorted[0];
      return `${best.name} has the highest match score at ${best.score}% for the ${best.position} role, rated "${best.recommendation}". Key skills: ${best.skills.join(", ")}.`;
    }

    if (q.includes("recommend")) {
      if (!sorted.length) return "There are no candidates to recommend yet — add one from the Upload Candidate page.";
      const best = sorted[0];
      return `Based on overall match score, I'd recommend <strong>${best.name}</strong> for the ${best.position} role. They scored ${best.score}% overall (skills match ${best.skillsMatch}%, experience ${best.experienceScore}%) and are rated "${best.recommendation}".`;
    }

    if (q.includes("scheduled interview") || (q.includes("interview") && q.includes("show"))) {
      if (!state.interviews.length) return "No interviews are scheduled yet. Head to the Interviews page to book one.";
      const list = [...state.interviews].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      return `There ${list.length === 1 ? "is" : "are"} ${list.length} interview${list.length === 1 ? "" : "s"} scheduled:` +
        `<ul>${list.map(iv => {
          const c = findCandidate(iv.candidateId);
          return `<li>${c ? c.name : "Unknown"} — ${iv.date} at ${formatTime(iv.time)} (${iv.type})</li>`;
        }).join("")}</ul>`;
    }

    if (q.includes("qualified")) {
      const qualified = state.candidates.filter(c => c.status === "qualified");
      if (!qualified.length) return "No candidates have been marked as qualified yet.";
      return `There ${qualified.length === 1 ? "is" : "are"} ${qualified.length} qualified candidate${qualified.length === 1 ? "" : "s"}:` +
        `<ul>${qualified.map(c => `<li>${c.name} — ${c.position} (${c.score}%)</li>`).join("")}</ul>`;
    }

    if (q.includes("average")) {
      const total = state.candidates.length;
      const avg = total ? Math.round(state.candidates.reduce((s, c) => s + c.score, 0) / total) : 0;
      return `The average candidate score across all ${total} candidates is ${avg}%.`;
    }

    if (q.includes("how many") && q.includes("candidate")) {
      return `There are currently ${state.candidates.length} candidates in the system.`;
    }

    // Fallback — try to match a candidate name directly
    const matched = state.candidates.find(c => q.includes(c.name.toLowerCase()));
    if (matched) {
      return `${matched.name} applied for ${matched.position} with a match score of ${matched.score}% (${matched.recommendation}). Status: ${matched.status}. Skills: ${matched.skills.join(", ")}.`;
    }

    return `I can help with candidate rankings, scores, qualified counts and scheduled interviews. Try one of the suggested questions below, or ask things like "show top candidates" or "who has the highest score?".`;
  }

  /* ---------------------------------------------------------
     11. GLOBAL EVENT WIRING
     --------------------------------------------------------- */

  function initNav() {
    document.querySelectorAll("[data-page]").forEach(el => {
      el.addEventListener("click", () => goToPage(el.dataset.page));
    });
    document.getElementById("menu-toggle").addEventListener("click", () => {
      document.getElementById("sidebar").classList.toggle("open");
      document.getElementById("scrim").classList.toggle("open");
    });
    document.getElementById("scrim").addEventListener("click", closeSidebarMobile);
  }

  function initModal() {
    document.getElementById("modal-close").addEventListener("click", closeModal);
    document.getElementById("modal-backdrop").addEventListener("click", (e) => {
      if (e.target.id === "modal-backdrop") closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  function initNotificationsPage() {
    document.getElementById("clear-notifications").addEventListener("click", () => {
      state.notifications = [];
      renderNotifications();
    });
  }

  /* ---------------------------------------------------------
     12. INIT
     --------------------------------------------------------- */

  document.addEventListener("DOMContentLoaded", () => {
    seedSampleData();
    initNav();
    initModal();
    initUploadForm();
    initRankingsControls();
    initInterviewForm();
    initNotificationsPage();
    initAssistant();
    render();
  });

})();
