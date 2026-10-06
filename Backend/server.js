const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { randomBytes, scryptSync, timingSafeEqual } = require("crypto");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "Frontend")));

const PORT = process.env.PORT || 5000;
const USERS_FILE = path.join(__dirname, "users.json");

let jobs = [
    {
        id: 1,
        company: "ABC Technologies",
        title: "Software Developer",
        description: "Looking for a fresher software developer.",
        location: "Nagpur"
    },
    {
        id: 2,
        company: "XYZ Analytics",
        title: "Data Analyst",
        description: "Looking for a junior data analyst.",
        location: "Pune"
    }
];

let applications = [];
let users = fs.existsSync(USERS_FILE)
    ? JSON.parse(fs.readFileSync(USERS_FILE, "utf8"))
    : [];

let nextJobId = 3;
let nextApplicationId = 1;

app.post("/api/auth/signup", (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !["student", "company"].includes(role)) {
        return res.status(400).json({ message: "Complete all fields and choose an account type" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = users.find(user => user.email === normalizedEmail && user.role === role);

    if (existingUser) {
        return res.status(409).json({ message: "An account already exists for this email and account type" });
    }

    const salt = randomBytes(16).toString("hex");
    const passwordHash = scryptSync(password, salt, 64).toString("hex");
    const user = { name: name.trim(), email: normalizedEmail, role, salt, passwordHash };
    users.push(user);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    res.status(201).json({ user: { name: user.name, email: user.email, role: user.role } });
});

app.post("/api/auth/signin", (req, res) => {
    const { email, password, role } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const user = users.find(account => account.email === normalizedEmail && account.role === role);

    if (!user || typeof password !== "string") {
        return res.status(401).json({ message: "Email or password is incorrect" });
    }

    const passwordHash = scryptSync(password, user.salt, 64);
    const savedHash = Buffer.from(user.passwordHash, "hex");

    if (!timingSafeEqual(passwordHash, savedHash)) {
        return res.status(401).json({ message: "Email or password is incorrect" });
    }

    res.json({ user: { name: user.name, email: user.email, role: user.role } });
});


// Get all jobs
app.get("/api/jobs", (req, res) => {
    res.json(jobs);
});


// Post a new job
app.post("/api/jobs", (req, res) => {

    const { company, title, description, location } = req.body;

    if (!company || !title) {
        return res.status(400).json({
            message: "Company and job title are required"
        });
    }

    const newJob = {
        id: nextJobId++,
        company,
        title,
        description,
        location
    };

    jobs.push(newJob);

    res.status(201).json(newJob);
});


// Apply for a job
app.post("/api/applications", (req, res) => {

    const { studentName, studentEmail, jobId } = req.body;

    const job = jobs.find(job => job.id == jobId);

    if (!job) {
        return res.status(404).json({
            message: "Job not found"
        });
    }

    const alreadyApplied = applications.find(
        application =>
            application.studentEmail === studentEmail &&
            application.jobId == jobId
    );

    if (alreadyApplied) {
        return res.status(400).json({
            message: "Already applied for this job"
        });
    }

    const newApplication = {
        id: nextApplicationId++,
        studentName,
        studentEmail,
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        status: "Applied"
    };

    applications.push(newApplication);

    res.status(201).json({
        message: "Application submitted",
        application: newApplication
    });
});


// Get all applications
app.get("/api/applications", (req, res) => {
    res.json(applications);
});


// Get applications of a student
app.get("/api/applications/student/:email", (req, res) => {

    const email = req.params.email;

    const studentApplications = applications.filter(
        application => application.studentEmail === email
    );

    res.json(studentApplications);
});

app.put("/api/applications/:id", (req, res) => {

    const application = applications.find(
        application => application.id == req.params.id
    );

    if (!application) {
        return res.status(404).json({
            message: "Application not found"
        });
    }

    const { status } = req.body;

    if (!["Applied", "Selected", "Rejected"].includes(status)) {
        return res.status(400).json({
            message: "Invalid status"
        });
    }

    application.status = status;

    res.json(application);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});