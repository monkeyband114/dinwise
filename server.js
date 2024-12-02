const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
  }),
);

// Load database
let db = JSON.parse(fs.readFileSync("db.json", "utf8"));

// Save database
function saveDB() {
  fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
}

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
}

// Routes
app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find((u) => u.email === email);
  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user = { id: user.id, role: user.role };
    res.redirect(
      user.role === "student" ? "/student-dashboard" : "/instructor-dashboard",
    );
  } else {
    res.redirect("/login");
  }
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "signup.html"));
});

app.post("/signup", (req, res) => {
  const { name, email, password, role } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const newUser = {
    id: db.users.length + 1,
    name,
    email,
    password: hashedPassword,
    role,
  };
  db.users.push(newUser);
  saveDB();
  res.redirect("/login");
});

app.get("/student-dashboard", requireAuth, (req, res) => {
  if (req.session.user.role !== "student") {
    return res.redirect("/instructor-dashboard");
  }
  res.sendFile(path.join(__dirname, "views", "student-dashboard.html"));
});

app.get("/instructor-dashboard", requireAuth, (req, res) => {
  if (req.session.user.role !== "instructor") {
    return res.redirect("/student-dashboard");
  }
  res.sendFile(path.join(__dirname, "views", "instructor-dashboard.html"));
});

app.get("/api/logbook", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const logbook = db.logbooks.find((l) => l.userId === userId) || {
    entries: [],
  };
  res.json(logbook.entries);
});

app.post("/api/logbook", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const { date, entry } = req.body;
  let logbook = db.logbooks.find((l) => l.userId === userId);
  if (!logbook) {
    logbook = { userId, entries: [] };
    db.logbooks.push(logbook);
  }
  logbook.entries.push({ date, entry });
  saveDB();
  res.json({ success: true });
});

app.get("/api/tasks", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const tasks = db.tasks.filter(
    (t) => t.studentId === userId || t.instructorId === userId,
  );
  res.json(tasks);
});

app.post("/api/tasks", requireAuth, (req, res) => {
  if (req.session.user.role !== "instructor") {
    return res.status(403).json({ error: "Only instructors can create tasks" });
  }
  const { studentId, description } = req.body;
  const newTask = {
    id: db.tasks.length + 1,
    instructorId: req.session.user.id,
    studentId,
    description,
    status: "pending",
  };
  db.tasks.push(newTask);
  saveDB();
  res.json(newTask);
});

app.put("/api/tasks/:id", requireAuth, (req, res) => {
  const taskId = parseInt(req.params.id);
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }
  if (
    req.session.user.role === "student" &&
    task.studentId !== req.session.user.id
  ) {
    return res
      .status(403)
      .json({ error: "You can only update your own tasks" });
  }
  task.status = req.body.status;
  saveDB();
  res.json(task);
});

app.get("/api/user", requireAuth, (req, res) => {
  const user = db.users.find((u) => u.id === req.session.user.id);
  res.json({ name: user.name, role: user.role });
});

app.get("/api/tasks", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const userRole = req.session.user.role;
  let tasks;
  if (userRole === "student") {
    tasks = db.tasks.filter((t) => t.studentId === userId);
  } else if (userRole === "instructor") {
    tasks = db.tasks.filter((t) => t.instructorId === userId);
  }
  res.json(tasks);
});

// Add this new route for logout
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Could not log out, please try again" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
});

// for logout
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Could not log out, please try again" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
