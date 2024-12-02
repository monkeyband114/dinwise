document.addEventListener("DOMContentLoaded", () => {
  const logbookForm = document.getElementById("logbook-form");
  const taskForm = document.getElementById("task-form");
  const logbookEntries = document.getElementById("logbook-entries");
  const taskList = document.getElementById("task-list");
  const userNameElement = document.getElementById("user-name");

  if (logbookForm) {
    loadLogbook();
    logbookForm.addEventListener("submit", addLogbookEntry);
  }

  if (taskForm) {
    taskForm.addEventListener("submit", assignTask);
  }

  if (taskList) {
    loadTasks();
    // loadTask();
  }

  // Load user information
  loadUserInfo();
});

async function loadLogbook() {
  const response = await fetch("/api/logbook");
  const entries = await response.json();
  const logbookEntries = document.getElementById("logbook-entries");
  logbookEntries.innerHTML = entries
    .map(
      (entry) => `
        <div class="logbook-entry">
            <strong>${entry.date}</strong>
            <p>${entry.entry}</p>
        </div>
    `,
    )
    .join("");
}

async function addLogbookEntry(e) {
  e.preventDefault();
  const date = document.getElementById("logbook-date").value;
  const entry = document.getElementById("logbook-entry").value;
  const response = await fetch("/api/logbook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, entry }),
  });
  if (response.ok) {
    loadLogbook();
    e.target.reset();
  }
}

async function loadTasks() {
  const response = await fetch("/api/tasks");
  const tasks = await response.json();
  const taskList = document.getElementById("task-list");
  const userRole = document.body.classList.contains("student-dashboard")
    ? "student"
    : "instructor";

  taskList.innerHTML = tasks
    .map(
      (task) => `
    <div class="task">
      <h3>${task.description}</h3>
      <p>Status: ${task.status}</p>
      ${
        userRole === "student" && task.status === "pending"
          ? `
        <button onclick="updateTaskStatus(${task.id}, 'completed')">Mark as Completed</button>
      `
          : ""
      }
      ${
        userRole === "instructor"
          ? `
        <p>Assigned to Student ID: ${task.studentId}</p>
      `
          : ""
      }
    </div>
  `,
    )
    .join("");
}

async function assignTask(e) {
  e.preventDefault();
  const studentId = document.getElementById("student-id").value;
  const description = document.getElementById("task-description").value;
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, description }),
  });
  if (response.ok) {
    loadTasks();
    e.target.reset();
  }
}

async function updateTaskStatus(taskId, status) {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (response.ok) {
    loadTasks();
  }
}
function logout() {
  fetch("/logout", { method: "POST" })
    .then(() => {
      window.location.href = "/login";
    })
    .catch((error) => {
      console.error("Logout failed:", error);
    });
}
