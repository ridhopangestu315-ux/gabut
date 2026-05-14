const STORAGE_KEYS = {
  tasks: "studentTodoTasks",
  name: "studentTodoName",
  darkMode: "studentTodoDarkMode",
  notification: "studentTodoNotification"
};

const appState = {
  tasks: loadFromStorage(STORAGE_KEYS.tasks, []),
  searchKeyword: "",
  statusFilter: "all",
  activePage: "dashboard",
  isNotificationEnabled: loadFromStorage(STORAGE_KEYS.notification, true),
  isDarkMode: loadFromStorage(STORAGE_KEYS.darkMode, false)
};

const elements = {
  body: document.body,
  navLinks: document.querySelectorAll(".nav-link"),
  pages: document.querySelectorAll(".page"),
  welcomeText: document.getElementById("welcomeText"),
  totalTasks: document.getElementById("totalTasks"),
  pendingTasks: document.getElementById("pendingTasks"),
  completedTasks: document.getElementById("completedTasks"),
  nearDeadlineTasks: document.getElementById("nearDeadlineTasks"),
  deadlineAlertList: document.getElementById("deadlineAlertList"),
  recentTaskList: document.getElementById("recentTaskList"),
  taskForm: document.getElementById("taskForm"),
  taskTitleInput: document.getElementById("taskTitleInput"),
  courseInput: document.getElementById("courseInput"),
  deadlineInput: document.getElementById("deadlineInput"),
  taskTitleError: document.getElementById("taskTitleError"),
  courseError: document.getElementById("courseError"),
  deadlineError: document.getElementById("deadlineError"),
  searchInput: document.getElementById("searchInput"),
  statusFilter: document.getElementById("statusFilter"),
  taskList: document.getElementById("taskList"),
  calendarList: document.getElementById("calendarList"),
  nameInput: document.getElementById("nameInput"),
  saveNameButton: document.getElementById("saveNameButton"),
  darkModeToggle: document.getElementById("darkModeToggle"),
  notificationToggle: document.getElementById("notificationToggle"),
  resetDataButton: document.getElementById("resetDataButton"),
  confirmModal: document.getElementById("confirmModal"),
  confirmModalTitle: document.getElementById("confirmModalTitle"),
  confirmModalMessage: document.getElementById("confirmModalMessage"),
  cancelModalButton: document.getElementById("cancelModalButton"),
  confirmModalButton: document.getElementById("confirmModalButton")
};

let confirmModalResolver = null;

function loadFromStorage(key, fallbackValue) {
  const savedValue = localStorage.getItem(key);

  if (savedValue === null) {
    return fallbackValue;
  }

  try {
    return JSON.parse(savedValue);
  } catch (error) {
    return savedValue;
  }
}

function saveToStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createTask(title, course, deadline) {
  return {
    id: Date.now().toString(),
    title,
    course,
    deadline,
    isCompleted: false,
    createdAt: new Date().toISOString()
  };
}

function saveTasks() {
  saveToStorage(STORAGE_KEYS.tasks, appState.tasks);
}

function addTask(task) {
  appState.tasks.unshift(task);
  saveTasks();
}

function deleteTask(taskId) {
  appState.tasks = appState.tasks.filter((task) => task.id !== taskId);
  saveTasks();
}

function toggleTaskStatus(taskId) {
  appState.tasks = appState.tasks.map((task) => {
    if (task.id !== taskId) {
      return task;
    }

    return {
      ...task,
      isCompleted: !task.isCompleted
    };
  });

  saveTasks();
}

function getFilteredTasks() {
  const keyword = appState.searchKeyword.toLowerCase();

  return appState.tasks.filter((task) => {
    const matchesKeyword =
      task.title.toLowerCase().includes(keyword) ||
      task.course.toLowerCase().includes(keyword);

    const matchesStatus =
      appState.statusFilter === "all" ||
      (appState.statusFilter === "completed" && task.isCompleted) ||
      (appState.statusFilter === "pending" && !task.isCompleted);

    return matchesKeyword && matchesStatus;
  });
}

function getTasksByDeadline() {
  return [...appState.tasks].sort((firstTask, secondTask) => {
    return new Date(firstTask.deadline) - new Date(secondTask.deadline);
  });
}

function getNearDeadlineTasks() {
  return appState.tasks.filter((task) => {
    if (task.isCompleted) {
      return false;
    }

    const remainingDays = getRemainingDays(task.deadline);
    return remainingDays >= 0 && remainingDays <= 2;
  });
}

function getRemainingDays(deadline) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const difference = deadlineDate - today;
  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(dateValue));
}

function getDeadlineLabel(deadline) {
  const remainingDays = getRemainingDays(deadline);

  if (remainingDays < 0) {
    return "Terlewat";
  }

  if (remainingDays === 0) {
    return "Hari ini";
  }

  if (remainingDays === 1) {
    return "Besok";
  }

  return `${remainingDays} hari lagi`;
}

function validateTaskForm() {
  clearFormErrors();

  const title = elements.taskTitleInput.value.trim();
  const course = elements.courseInput.value;
  const deadline = elements.deadlineInput.value;
  let isValid = true;

  if (title.length < 3) {
    showFieldError(elements.taskTitleInput, elements.taskTitleError, "Nama tugas minimal 3 karakter.");
    isValid = false;
  }

  if (!course) {
    showFieldError(elements.courseInput, elements.courseError, "Pilih mata kuliah terlebih dahulu.");
    isValid = false;
  }

  if (!deadline) {
    showFieldError(elements.deadlineInput, elements.deadlineError, "Pilih tanggal deadline.");
    isValid = false;
  } else if (getRemainingDays(deadline) < 0) {
    showFieldError(elements.deadlineInput, elements.deadlineError, "Deadline tidak boleh tanggal yang sudah lewat.");
    isValid = false;
  }

  return {
    isValid,
    values: { title, course, deadline }
  };
}

function showFieldError(inputElement, errorElement, message) {
  inputElement.classList.add("input-error");
  errorElement.textContent = message;
}

function clearFormErrors() {
  const inputs = [elements.taskTitleInput, elements.courseInput, elements.deadlineInput];
  const errors = [elements.taskTitleError, elements.courseError, elements.deadlineError];

  inputs.forEach((input) => input.classList.remove("input-error"));
  errors.forEach((error) => {
    error.textContent = "";
  });
}

function renderApp() {
  renderDashboard();
  renderTaskList();
  renderCalendar();
}

function renderDashboard() {
  const totalTasks = appState.tasks.length;
  const completedTasks = appState.tasks.filter((task) => task.isCompleted).length;
  const pendingTasks = totalTasks - completedTasks;
  const nearDeadlineTasks = getNearDeadlineTasks();

  elements.totalTasks.textContent = totalTasks;
  elements.completedTasks.textContent = completedTasks;
  elements.pendingTasks.textContent = pendingTasks;
  elements.nearDeadlineTasks.textContent = nearDeadlineTasks.length;

  renderDeadlineAlerts(nearDeadlineTasks);
  renderRecentTasks();
}

function renderDeadlineAlerts(nearDeadlineTasks) {
  if (!appState.isNotificationEnabled) {
    elements.deadlineAlertList.innerHTML = createEmptyState("Notifikasi deadline sedang dinonaktifkan.");
    return;
  }

  if (nearDeadlineTasks.length === 0) {
    elements.deadlineAlertList.innerHTML = createEmptyState("Belum ada deadline dekat.");
    return;
  }

  elements.deadlineAlertList.innerHTML = nearDeadlineTasks
    .map((task) => {
      return `
        <div class="calendar-item">
          <div class="calendar-date">${getDeadlineLabel(task.deadline)}</div>
          <div>
            <strong>${escapeHtml(task.title)}</strong>
            <p>${escapeHtml(task.course)} - ${formatDate(task.deadline)}</p>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderRecentTasks() {
  const recentTasks = appState.tasks.slice(0, 4);

  if (recentTasks.length === 0) {
    elements.recentTaskList.innerHTML = createEmptyState("Belum ada tugas. Tambahkan tugas pertamamu.");
    return;
  }

  elements.recentTaskList.innerHTML = recentTasks
    .map((task) => {
      return `
        <div class="calendar-item">
          <span class="badge ${task.isCompleted ? "success" : "warning"}">
            ${task.isCompleted ? "Selesai" : getDeadlineLabel(task.deadline)}
          </span>
          <div>
            <strong>${escapeHtml(task.title)}</strong>
            <p>${escapeHtml(task.course)}</p>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderTaskList() {
  const filteredTasks = getFilteredTasks();

  if (filteredTasks.length === 0) {
    elements.taskList.innerHTML = createEmptyState("Tidak ada tugas yang sesuai.");
    return;
  }

  elements.taskList.innerHTML = filteredTasks
    .map((task) => {
      const deadlineStatus = getDeadlineLabel(task.deadline);

      return `
        <article class="task-item ${task.isCompleted ? "completed" : ""}" data-task-id="${task.id}">
          <div class="task-main">
            <input class="task-checkbox" type="checkbox" ${task.isCompleted ? "checked" : ""} aria-label="Tandai selesai">
            <div>
              <p class="task-title">${escapeHtml(task.title)}</p>
              <div class="task-meta">
                <span>${escapeHtml(task.course)}</span>
                <span>${formatDate(task.deadline)}</span>
                <span class="badge ${task.isCompleted ? "success" : "warning"}">${task.isCompleted ? "Selesai" : deadlineStatus}</span>
              </div>
            </div>
          </div>
          <div class="task-actions">
            <button class="small-button delete" type="button" data-action="delete">Hapus</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCalendar() {
  const sortedTasks = getTasksByDeadline();

  if (sortedTasks.length === 0) {
    elements.calendarList.innerHTML = createEmptyState("Belum ada jadwal deadline.");
    return;
  }

  elements.calendarList.innerHTML = sortedTasks
    .map((task) => {
      return `
        <article class="calendar-item">
          <div class="calendar-date">${formatDate(task.deadline)}</div>
          <div>
            <strong>${escapeHtml(task.title)}</strong>
            <p>${escapeHtml(task.course)} - ${task.isCompleted ? "Selesai" : getDeadlineLabel(task.deadline)}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function createEmptyState(message) {
  return `<div class="empty-state">${message}</div>`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showPage(pageId) {
  appState.activePage = pageId;

  elements.pages.forEach((page) => {
    page.classList.toggle("active-page", page.id === pageId);
  });

  elements.navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.page === pageId);
  });
}

function saveName() {
  const name = elements.nameInput.value.trim();

  if (!name) {
    elements.nameInput.focus();
    return;
  }

  localStorage.setItem(STORAGE_KEYS.name, name);
  renderUserName(name);
}

function renderUserName(name) {
  elements.welcomeText.textContent = `Selamat datang, ${name}`;
}

function applyDarkMode() {
  elements.body.classList.toggle("dark", appState.isDarkMode);
  elements.darkModeToggle.checked = appState.isDarkMode;
}

function openConfirmModal(options) {
  elements.confirmModalTitle.textContent = options.title;
  elements.confirmModalMessage.textContent = options.message;
  elements.confirmModalButton.textContent = options.confirmText || "Hapus";
  elements.cancelModalButton.textContent = options.cancelText || "Batal";

  elements.confirmModal.classList.add("show");
  elements.confirmModal.setAttribute("aria-hidden", "false");
  elements.confirmModalButton.focus();

  return new Promise((resolve) => {
    confirmModalResolver = resolve;
  });
}

function closeConfirmModal(isConfirmed) {
  if (!elements.confirmModal.classList.contains("show")) {
    return;
  }

  elements.confirmModal.classList.remove("show");
  elements.confirmModal.setAttribute("aria-hidden", "true");

  if (confirmModalResolver) {
    confirmModalResolver(isConfirmed);
    confirmModalResolver = null;
  }
}

async function resetAllTasks() {
  const isConfirmed = await openConfirmModal({
    title: "Hapus semua tugas?",
    message: "Semua tugas yang tersimpan di browser ini akan dihapus permanen.",
    confirmText: "Hapus",
    cancelText: "Batal"
  });

  if (!isConfirmed) {
    return;
  }

  appState.tasks = [];
  saveTasks();
  renderApp();
}

function setMinimumDeadlineDate() {
  const today = new Date().toISOString().split("T")[0];
  elements.deadlineInput.min = today;
}

function bindEvents() {
  elements.navLinks.forEach((link) => {
    link.addEventListener("click", () => showPage(link.dataset.page));
  });

  elements.taskForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const result = validateTaskForm();
    if (!result.isValid) {
      return;
    }

    const newTask = createTask(result.values.title, result.values.course, result.values.deadline);
    addTask(newTask);
    elements.taskForm.reset();
    clearFormErrors();
    renderApp();
  });

  elements.taskList.addEventListener("click", (event) => {
    const taskItem = event.target.closest(".task-item");

    if (!taskItem) {
      return;
    }

    if (event.target.matches(".task-checkbox")) {
      toggleTaskStatus(taskItem.dataset.taskId);
      renderApp();
    }

    if (event.target.dataset.action === "delete") {
      deleteTask(taskItem.dataset.taskId);
      renderApp();
    }
  });

  elements.searchInput.addEventListener("input", (event) => {
    appState.searchKeyword = event.target.value.trim();
    renderTaskList();
  });

  elements.statusFilter.addEventListener("change", (event) => {
    appState.statusFilter = event.target.value;
    renderTaskList();
  });

  elements.saveNameButton.addEventListener("click", saveName);

  elements.darkModeToggle.addEventListener("change", (event) => {
    appState.isDarkMode = event.target.checked;
    saveToStorage(STORAGE_KEYS.darkMode, appState.isDarkMode);
    applyDarkMode();
  });

  elements.notificationToggle.addEventListener("change", (event) => {
    appState.isNotificationEnabled = event.target.checked;
    saveToStorage(STORAGE_KEYS.notification, appState.isNotificationEnabled);
    renderDashboard();
  });

  elements.resetDataButton.addEventListener("click", resetAllTasks);
  elements.confirmModalButton.addEventListener("click", () => closeConfirmModal(true));
  elements.cancelModalButton.addEventListener("click", () => closeConfirmModal(false));

  elements.confirmModal.addEventListener("click", (event) => {
    if (event.target === elements.confirmModal) {
      closeConfirmModal(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeConfirmModal(false);
    }
  });
}

function migrateOldTasksIfNeeded() {
  if (appState.tasks.length > 0) {
    return;
  }

  const oldTasks = loadFromStorage("tugas", []);

  if (!Array.isArray(oldTasks) || oldTasks.length === 0) {
    return;
  }

  appState.tasks = oldTasks.map((task, index) => ({
    id: `${Date.now()}-${index}`,
    title: task.judul || "Tugas tanpa nama",
    course: task.matkul || "Mata kuliah",
    deadline: task.deadline,
    isCompleted: Boolean(task.selesai),
    createdAt: new Date().toISOString()
  }));

  saveTasks();
}

function initApp() {
  migrateOldTasksIfNeeded();
  bindEvents();
  setMinimumDeadlineDate();

  const savedName = localStorage.getItem(STORAGE_KEYS.name);
  if (savedName) {
    elements.nameInput.value = savedName;
    renderUserName(savedName);
  }

  elements.notificationToggle.checked = appState.isNotificationEnabled;
  applyDarkMode();
  showPage(appState.activePage);
  renderApp();
}

initApp();
