const API = "http://localhost:5000/api";

let accountRole = "";
let authMode = "signin";

function chooseRole(role) {
    accountRole = role;
    document.getElementById("roleChoices").hidden = true;
    document.getElementById("authFormPanel").hidden = false;
    document.getElementById("authPrompt").textContent = `Continue as a ${role}.`;
    document.getElementById("authHeading").textContent = `${role === "student" ? "Student" : "Company"} sign in`;
    setAuthMode("signin");
}

function backToRoles() {
    accountRole = "";
    document.getElementById("roleChoices").hidden = false;
    document.getElementById("authFormPanel").hidden = true;
    document.getElementById("authPrompt").textContent = "Choose how you want to use the portal.";
    document.getElementById("authMessage").textContent = "";
}

function setAuthMode(mode) {
    authMode = mode;
    const signingUp = mode === "signup";
    document.getElementById("authHeading").textContent = `${accountRole === "student" ? "Student" : "Company"} ${signingUp ? "sign up" : "sign in"}`;
    document.getElementById("nameField").hidden = !signingUp;
    document.getElementById("authName").required = signingUp;
    document.getElementById("authPassword").autocomplete = signingUp ? "new-password" : "current-password";
    document.getElementById("authSubmit").textContent = signingUp ? "Create account" : "Sign in";
    document.getElementById("signinTab").classList.toggle("active", !signingUp);
    document.getElementById("signupTab").classList.toggle("active", signingUp);
    document.getElementById("authMessage").textContent = "";
}

async function authenticate(event) {
    event.preventDefault();
    const payload = {
        email: document.getElementById("authEmail").value,
        password: document.getElementById("authPassword").value,
        role: accountRole
    };

    if (authMode === "signup") {
        payload.name = document.getElementById("authName").value;
    }

    try {
        const response = await fetch(`${API}/auth/${authMode}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Unable to sign in");
        }

        openPortal(data.user);
    } catch (error) {
        document.getElementById("authMessage").textContent = error.message;
    }
}

function openPortal(user) {
    document.getElementById("authSection").hidden = true;
    document.getElementById("appHeader").hidden = false;

    if (user.role === "student") {
        document.getElementById("studentName").value = user.name;
        document.getElementById("studentEmail").value = user.email;
        document.getElementById("studentSection").hidden = false;
        loadJobs();
        loadStudentApplications();
        return;
    }

    document.getElementById("companyName").value = user.name;
    document.getElementById("companySection").hidden = false;
    loadApplications();
}

function signOut() {
    document.getElementById("appHeader").hidden = true;
    document.getElementById("studentSection").hidden = true;
    document.getElementById("companySection").hidden = true;
    document.getElementById("authForm").reset();
    backToRoles();
    document.getElementById("authSection").hidden = false;
}

async function loadJobs() {
    const response = await fetch(`${API}/jobs`);
    const jobs = await response.json();

    const container = document.getElementById("jobsContainer");
    container.innerHTML = "";

    jobs.forEach(job => {
        container.innerHTML += `
            <div class="job-card">
                <h3>${job.title}</h3>
                <p>Company: ${job.company}</p>
                <p>${job.description}</p>
                <p>Location: ${job.location}</p>

                <button onclick="applyForJob(${job.id})">
                    Apply
                </button>
            </div>
        `;
    });
}

async function applyForJob(jobId) {
    const studentName = document.getElementById("studentName").value;
    const studentEmail = document.getElementById("studentEmail").value;

    if (!studentName || !studentEmail) {
        alert("Enter your name and email first");
        return;
    }

    const response = await fetch(`${API}/applications`, {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            studentName,
            studentEmail,
            jobId
        })
    });

    const data = await response.json();

    alert(data.message || "Application submitted");

    loadStudentApplications();
}

async function loadStudentApplications() {
    const email = document.getElementById("studentEmail").value;

    if (!email) return;

    const response = await fetch(
        `${API}/applications/student/${email}`
    );

    const applications = await response.json();

    const container = document.getElementById("applicationsContainer");
    container.innerHTML = "";

    applications.forEach(application => {
        container.innerHTML += `
            <div class="application-card">
                <h3>${application.jobTitle}</h3>

                <p>Company: ${application.company}</p>

                <p>
                    Status:
                    <strong>${application.status}</strong>
                </p>
            </div>
        `;
    });
}

async function postJob() {
    const company = document.getElementById("companyName").value;
    const title = document.getElementById("jobTitle").value;
    const description = document.getElementById("jobDescription").value;
    const location = document.getElementById("jobLocation").value;

    if (!company || !title) {
        alert("Company name and job title are required");
        return;
    }

    const response = await fetch(`${API}/jobs`, {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            company,
            title,
            description,
            location
        })
    });

    await response.json();

    alert("Job posted successfully");

    loadJobs();
}

async function loadApplications() {
    const response = await fetch(`${API}/applications`);
    const applications = await response.json();

    const container = document.getElementById("companyApplications");
    container.innerHTML = "";

    applications.forEach(application => {
        container.innerHTML += `
            <div class="application-card">

                <h3>${application.studentName}</h3>

                <p>Email: ${application.studentEmail}</p>

                <p>Job: ${application.jobTitle}</p>

                <p>
                    Status:
                    <strong>${application.status}</strong>
                </p>

                <button onclick="updateStatus(${application.id}, 'Selected')">
                    Select
                </button>

                <button onclick="updateStatus(${application.id}, 'Rejected')">
                    Reject
                </button>

            </div>
        `;
    });
}

async function updateStatus(applicationId, status) {

    const response = await fetch(
        `${API}/applications/${applicationId}`,
        {
            method: "PUT",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                status: status
            })
        }
    );

    const data = await response.json();

    alert(`Status changed to ${data.status}`);

    loadApplications();
}