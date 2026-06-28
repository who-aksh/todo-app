const STORAGE_KEY = "simple-todo-tasks";

const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const list = document.querySelector("#todo-list");
const taskCount = document.querySelector("#task-count");
const emptyState = document.querySelector("#empty-state");

let tasks = loadTasks();

function loadTasks() {
  try {
    const savedTasks = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(savedTasks) ? savedTasks : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = `todo-item${task.completed ? " completed" : ""}`;
  item.dataset.id = task.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Mark ${task.text} as ${task.completed ? "incomplete" : "complete"}`);

  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.text;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete ${task.text}`);

  item.append(checkbox, text, deleteButton);
  return item;
}

function renderTasks() {
  list.replaceChildren(...tasks.map(createTaskElement));

  const remaining = tasks.filter((task) => !task.completed).length;
  taskCount.textContent = `${remaining} ${remaining === 1 ? "task" : "tasks"} left`;
  emptyState.hidden = tasks.length > 0;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();

  if (!text) return;

  tasks.unshift({
    id: crypto.randomUUID(),
    text,
    completed: false,
  });

  saveTasks();
  renderTasks();
  form.reset();
  input.focus();
});

list.addEventListener("change", (event) => {
  if (!event.target.matches('input[type="checkbox"]')) return;

  const item = event.target.closest(".todo-item");
  const task = tasks.find((currentTask) => currentTask.id === item.dataset.id);

  if (task) {
    task.completed = event.target.checked;
    saveTasks();
    renderTasks();
  }
});

list.addEventListener("click", (event) => {
  if (!event.target.matches(".delete-button")) return;

  const item = event.target.closest(".todo-item");
  tasks = tasks.filter((task) => task.id !== item.dataset.id);
  saveTasks();
  renderTasks();
});

renderTasks();
