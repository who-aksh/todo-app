const STORAGE_KEY = "orbit-tasks-v1";
const LEGACY_KEY = "simple-todo-tasks";

const elements = {
  form: document.querySelector("#todo-form"),
  input: document.querySelector("#todo-input"),
  priority: document.querySelector("#priority-input"),
  due: document.querySelector("#due-input"),
  list: document.querySelector("#todo-list"),
  empty: document.querySelector("#empty-state"),
  count: document.querySelector("#task-count"),
  search: document.querySelector("#search-input"),
  viewTitle: document.querySelector("#view-title"),
  openForm: document.querySelector("#open-task-form"),
  clearCompleted: document.querySelector("#clear-completed"),
  sidebar: document.querySelector("#sidebar"),
  overlay: document.querySelector("#sidebar-overlay"),
  menuButton: document.querySelector("#menu-button"),
  toast: document.querySelector("#toast"),
};

let tasks = loadTasks();
let viewFilter = "all";
let statusFilter = "all";
let query = "";
let toastTimer;

function localDateString(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function shiftDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

function starterTasks() {
  const now = Date.now();
  return [
    { id: crypto.randomUUID(), text: "Finalize product strategy deck", completed: false, priority: "high", dueDate: shiftDate(0), createdAt: now - 7200000, completedAt: null },
    { id: crypto.randomUUID(), text: "Review landing page concepts", completed: false, priority: "medium", dueDate: shiftDate(1), createdAt: now - 86400000, completedAt: null },
    { id: crypto.randomUUID(), text: "Send weekly performance update", completed: true, priority: "low", dueDate: shiftDate(0), createdAt: now - 172800000, completedAt: now - 3600000 },
    { id: crypto.randomUUID(), text: "Prepare notes for design sync", completed: false, priority: "medium", dueDate: shiftDate(3), createdAt: now - 259200000, completedAt: null },
    { id: crypto.randomUUID(), text: "Update Q3 project roadmap", completed: true, priority: "high", dueDate: shiftDate(-1), createdAt: now - 345600000, completedAt: now - 90000000 },
  ];
}

function normalizeTask(task, index = 0) {
  return {
    id: task.id || `${Date.now()}-${index}`,
    text: String(task.text || "Untitled task"),
    completed: Boolean(task.completed),
    priority: ["high", "medium", "low"].includes(task.priority) ? task.priority : "medium",
    dueDate: task.dueDate || "",
    createdAt: Number(task.createdAt) || Date.now(),
    completedAt: task.completed ? (Number(task.completedAt) || Date.now()) : null,
  };
}

function loadTasks() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current !== null) {
      const parsed = JSON.parse(current);
      return Array.isArray(parsed) ? parsed.map(normalizeTask) : [];
    }

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy !== null) {
      const parsed = JSON.parse(legacy);
      const migrated = Array.isArray(parsed) ? parsed.map(normalizeTask) : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    const initial = starterTasks();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  } catch {
    return starterTasks();
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function formatDueDate(value) {
  if (!value) return "No due date";
  const today = localDateString();
  if (value === today) return "Today";
  if (value === shiftDate(1)) return "Tomorrow";
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function isUpcoming(task) {
  return task.dueDate && task.dueDate > localDateString() && !task.completed;
}

function matchesView(task) {
  const today = localDateString();
  if (viewFilter === "today") return task.dueDate === today && !task.completed;
  if (viewFilter === "upcoming") return isUpcoming(task);
  if (viewFilter === "completed") return task.completed;
  if (["high", "medium", "low"].includes(viewFilter)) return task.priority === viewFilter;
  return true;
}

function visibleTasks() {
  return tasks.filter((task) => {
    const statusMatch = statusFilter === "all" || (statusFilter === "done" ? task.completed : !task.completed);
    const queryMatch = task.text.toLowerCase().includes(query.toLowerCase());
    return matchesView(task) && statusMatch && queryMatch;
  });
}

function icon(paths) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
}

function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = `todo-item${task.completed ? " completed" : ""}`;
  item.dataset.id = task.id;

  const checkLabel = document.createElement("label");
  checkLabel.className = "custom-check";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Mark ${task.text} as ${task.completed ? "incomplete" : "complete"}`);
  const checkmark = document.createElement("span");
  checkmark.className = "checkmark";
  checkmark.innerHTML = icon('<path d="m7 12 3 3 7-7"/>');
  checkLabel.append(checkbox, checkmark);

  const details = document.createElement("div");
  details.className = "task-details";
  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.text;
  const meta = document.createElement("div");
  meta.className = "task-meta";
  const priority = document.createElement("span");
  priority.className = `priority-pill ${task.priority}`;
  priority.textContent = `${task.priority} priority`;
  const due = document.createElement("span");
  const today = localDateString();
  const dueState = task.dueDate && task.dueDate < today && !task.completed ? " overdue" : task.dueDate === today ? " today" : "";
  due.className = `due-date${dueState}`;
  due.innerHTML = `${icon('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18"/>')}<span></span>`;
  due.querySelector("span").textContent = formatDueDate(task.dueDate);
  meta.append(priority, due);
  details.append(text, meta);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.setAttribute("aria-label", `Delete ${task.text}`);
  deleteButton.innerHTML = icon('<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>');
  actions.append(deleteButton);
  item.append(checkLabel, details, actions);
  return item;
}

function updateStats() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const remaining = total - completed;
  const today = localDateString();
  const dueToday = tasks.filter((task) => task.dueDate === today && !task.completed).length;
  const upcoming = tasks.filter(isUpcoming).length;
  const rate = total ? Math.round((completed / total) * 100) : 0;

  document.querySelector("#stat-total").textContent = total;
  document.querySelector("#stat-progress").textContent = remaining;
  document.querySelector("#stat-completed").textContent = completed;
  document.querySelector("#stat-due").textContent = dueToday;
  document.querySelector("#total-trend").textContent = total ? `${total} in your workspace` : "All caught up";
  document.querySelector("#completed-label").textContent = `${rate}% completion rate`;
  document.querySelector("#completion-rate").textContent = `${rate}%`;
  document.querySelector("#completion-ring").style.setProperty("--progress", `${rate}%`);
  document.querySelector("#progress-line").style.setProperty("--width", `${total ? Math.round((remaining / total) * 100) : 0}%`);
  document.querySelector("#due-label").textContent = dueToday ? `${dueToday} need attention` : "Nothing urgent";
  document.querySelector("#all-count").textContent = total;
  document.querySelector("#today-count").textContent = dueToday;
  document.querySelector("#upcoming-count").textContent = upcoming;
  document.querySelector("#completed-count").textContent = completed;
  document.querySelector("#sidebar-progress").textContent = `${rate}%`;
  document.querySelector("#sidebar-ring").style.setProperty("--progress", `${rate}%`);
  document.querySelector("#week-score").textContent = `${rate}%`;
}

function renderChart() {
  const chart = document.querySelector("#week-chart");
  const dayFormatter = new Intl.DateTimeFormat("en", { weekday: "short" });
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = localDateString(date);
    const created = tasks.filter((task) => localDateString(new Date(task.createdAt)) === key).length;
    const completed = tasks.filter((task) => task.completedAt && localDateString(new Date(task.completedAt)) === key).length;
    return { date, key, created, completed };
  });
  const max = Math.max(1, ...days.flatMap((day) => [day.created, day.completed]));
  chart.replaceChildren(...days.map((day) => {
    const element = document.createElement("div");
    element.className = `chart-day${day.key === localDateString() ? " today" : ""}`;
    const bars = document.createElement("div");
    bars.className = "bar-wrap";
    bars.innerHTML = `<i class="chart-bar completed" style="height:${Math.max(3, (day.completed / max) * 78)}px"></i><i class="chart-bar created" style="height:${Math.max(3, (day.created / max) * 78)}px"></i>`;
    const label = document.createElement("span");
    label.textContent = dayFormatter.format(day.date).slice(0, 1);
    element.append(bars, label);
    return element;
  }));
}

function render() {
  const filtered = visibleTasks();
  elements.list.replaceChildren(...filtered.map(createTaskElement));
  const remaining = tasks.filter((task) => !task.completed).length;
  elements.count.textContent = `${remaining} ${remaining === 1 ? "task" : "tasks"} left`;
  elements.empty.hidden = filtered.length > 0;
  elements.clearCompleted.hidden = !tasks.some((task) => task.completed);
  updateStats();
  renderChart();
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.querySelector("span").textContent = message;
  elements.toast.classList.add("show");
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

function toggleTaskForm(force) {
  const shouldOpen = typeof force === "boolean" ? force : elements.form.hidden;
  elements.form.hidden = !shouldOpen;
  if (shouldOpen) {
    elements.due.value = localDateString();
    requestAnimationFrame(() => elements.input.focus());
  }
}

function closeSidebar() {
  document.body.classList.remove("sidebar-open");
  elements.menuButton.setAttribute("aria-expanded", "false");
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = elements.input.value.trim();
  if (!text) return;
  tasks.unshift({ id: crypto.randomUUID(), text, completed: false, priority: elements.priority.value, dueDate: elements.due.value, createdAt: Date.now(), completedAt: null });
  saveTasks();
  elements.form.reset();
  toggleTaskForm(false);
  render();
  showToast("Task created");
});

elements.list.addEventListener("change", (event) => {
  if (!event.target.matches('input[type="checkbox"]')) return;
  const item = event.target.closest(".todo-item");
  const task = tasks.find((candidate) => candidate.id === item.dataset.id);
  if (!task) return;
  task.completed = event.target.checked;
  task.completedAt = task.completed ? Date.now() : null;
  saveTasks();
  render();
  showToast(task.completed ? "Task completed" : "Task reopened");
});

elements.list.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-button");
  if (!button) return;
  const item = button.closest(".todo-item");
  item.style.opacity = "0";
  item.style.transform = "translateX(10px)";
  setTimeout(() => {
    tasks = tasks.filter((task) => task.id !== item.dataset.id);
    saveTasks();
    render();
    showToast("Task deleted");
  }, 180);
});

document.querySelectorAll(".nav-item[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    viewFilter = button.dataset.filter;
    document.querySelectorAll(".nav-item[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
    const titles = { all: "All tasks", today: "Today’s tasks", upcoming: "Upcoming tasks", completed: "Completed tasks", high: "High priority", medium: "Medium priority", low: "Low priority" };
    elements.viewTitle.textContent = titles[viewFilter];
    render();
    closeSidebar();
  });
});

document.querySelectorAll(".filter-chip").forEach((button) => {
  button.addEventListener("click", () => {
    statusFilter = button.dataset.status;
    document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.toggle("active", chip === button));
    render();
  });
});

elements.search.addEventListener("input", () => {
  query = elements.search.value.trim();
  render();
});

elements.openForm.addEventListener("click", () => toggleTaskForm());
elements.clearCompleted.addEventListener("click", () => {
  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  render();
  showToast("Completed tasks cleared");
});
elements.menuButton.addEventListener("click", () => {
  const isOpen = document.body.classList.toggle("sidebar-open");
  elements.menuButton.setAttribute("aria-expanded", String(isOpen));
});
elements.overlay.addEventListener("click", closeSidebar);

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    elements.search.focus();
  }
  if (event.key === "Escape") {
    closeSidebar();
    toggleTaskForm(false);
  }
});

const now = new Date();
const hour = now.getHours();
document.querySelector("#day-period").textContent = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(now).toUpperCase();

render();
