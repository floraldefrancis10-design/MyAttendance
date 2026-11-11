
const rosterKey = "attendanceRoster";

let students = [];
let attendance = [];

const dateInput = document.getElementById("attendanceDate");
const periodSelect = document.getElementById("attendancePeriod");
const studentTable = document.getElementById("studentTable");

function getToday() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getRecordKey() {
    return `attendanceRecords_${dateInput.value}_${periodSelect.value}`;
}

function readStorage(key, fallback) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : fallback;
    } catch {
        return fallback;
    }
}

function saveRoster() {
    localStorage.setItem(rosterKey, JSON.stringify(students));
}

function saveData() {
    localStorage.setItem(getRecordKey(), JSON.stringify(attendance));
}

function getTime() {
    return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function loadStudents() {
    students = readStorage(rosterKey, []);

    // Migrate records from the previous version if necessary.
    if (students.length === 0) {
        const oldData = readStorage("attendanceStudents", []);

        if (oldData.length > 0) {
            students = oldData.map((student, index) => ({
                id: student.id || Date.now() + index,
                name: student.name
            }));

            saveRoster();

            const migrated = students.map((student, index) => ({
                id: student.id,
                status: oldData[index].status || "Pending",
                time: oldData[index].time || "--",
                remarks: oldData[index].remarks || ""
            }));

            localStorage.setItem(getRecordKey(), JSON.stringify(migrated));
        }
    }

    loadAttendance();
}

function loadAttendance() {
    const saved = readStorage(getRecordKey(), []);

    attendance = students.map(student => {
        const record = saved.find(item => item.id === student.id);

        return record || {
            id: student.id,
            status: "Pending",
            time: "--",
            remarks: ""
        };
    });

    renderStudents();
}

function renderStudents() {
    studentTable.innerHTML = "";

    students.forEach((student, index) => {
        const record = attendance.find(item => item.id === student.id);

        if (!record) return;

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${index + 1}</td>

            <td>${escapeHTML(student.name)}</td>

            <td>
                <select class="status-select"
                    onchange="changeStatus(${student.id}, this.value)">
                    ${["Pending", "Present", "Late", "Absent", "Excuse" "Kick out"]
                        .map(status => `
                            <option value="${status}"
                                ${record.status === status ? "selected" : ""}>
                                ${status}
                            </option>
                        `).join("")}
                </select>
            </td>

            <td>${escapeHTML(record.time)}</td>

            <td>
                <input class="remark-input"
                    value="${escapeAttribute(record.remarks)}"
                    placeholder="Remarks"
                    onchange="updateRemark(${student.id}, this.value)">
            </td>

            <td>
                <button class="action-btn edit-btn"
                    onclick="editStudentName(${student.id})">
                    Edit
                </button>

                <button class="action-btn"
                    onclick="deleteStudent(${student.id})">
                    Delete
                </button>
            </td>
        `;

        studentTable.appendChild(row);
    });

    updateStats();
    updatePeriodLabel();
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function escapeAttribute(value) {
    return escapeHTML(value);
}

function updatePeriodLabel() {
    document.getElementById("periodLabel").textContent =
        `${periodSelect.value} Attendance - ${dateInput.value}`;
}

function addStudent() {
    const nameInput = document.getElementById("studentName");
    const name = nameInput.value.trim();

    if (!name) {
        alert("Please enter a student name.");
        return;
    }

    const exists = students.some(student =>
        student.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
        alert("This student already exists.");
        return;
    }

    const student = {
        id: Date.now(),
        name: name
    };

    students.push(student);

    attendance.push({
        id: student.id,
        status: "Pending",
        time: "--",
        remarks: ""
    });

    saveRoster();
    saveData();

    nameInput.value = "";
    renderStudents();
}

function changeStatus(id, status) {
    const record = attendance.find(item => item.id === id);

    if (!record) return;

    record.status = status;
    record.time = status === "Pending" ? "--" : getTime();

    saveData();
    renderStudents();
}

function updateRemark(id, remark) {
    const record = attendance.find(item => item.id === id);

    if (!record) return;

    record.remarks = remark;
    saveData();
}

function editStudentName(id) {
    const student = students.find(item => item.id === id);

    if (!student) return;

    const newName = prompt("Enter new student name:", student.name);

    if (newName === null) return;

    const cleanName = newName.trim();

    if (!cleanName) {
        alert("Student name cannot be empty.");
        return;
    }

    const duplicate = students.some(item =>
        item.id !== id &&
        item.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (duplicate) {
        alert("That student name already exists.");
        return;
    }

    student.name = cleanName;

    saveRoster();
    renderStudents();
}

function deleteStudent(id) {
    const student = students.find(item => item.id === id);

    if (!student) return;

    if (!confirm(`Delete ${student.name} from all attendance records?`)) {
        return;
    }

    students = students.filter(item => item.id !== id);

    saveRoster();

    // Remove this student from all saved dates and periods.
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith("attendanceRecords_")) {
            const records = readStorage(key, []);
            const updated = records.filter(item => item.id !== id);

            localStorage.setItem(key, JSON.stringify(updated));
        }
    });

    attendance = attendance.filter(item => item.id !== id);

    renderStudents();
}

function markAllPresent() {
    if (students.length === 0) {
        alert("There are no students to mark.");
        return;
    }

    if (!confirm("Mark all students as Present for this period?")) {
        return;
    }

    attendance.forEach(record => {
        record.status = "Present";
        record.time = getTime();
    });

    saveData();
    renderStudents();
}

function clearAttendance() {
    if (!confirm("Reset attendance for this date and period?")) {
        return;
    }

    attendance.forEach(record => {
        record.status = "Pending";
        record.time = "--";
        record.remarks = "";
    });

    saveData();
    renderStudents();
}

function searchStudents() {
    const search = document.getElementById("searchInput")
        .value.toLowerCase();

    const rows = studentTable.querySelectorAll("tr");

    rows.forEach(row => {
        const name = row.cells[1].textContent.toLowerCase();

        row.style.display = name.includes(search) ? "" : "none";
    });
}

function updateStats() {
    document.getElementById("totalStudents").textContent =
        students.length;

    document.getElementById("presentCount").textContent =
        attendance.filter(item => item.status === "Present").length;

    document.getElementById("lateCount").textContent =
        attendance.filter(item => item.status === "Late").length;

    document.getElementById("absentCount").textContent =
        attendance.filter(item => item.status === "Absent").length;

    document.getElementById("excuseCount").textContent =
        attendance.filter(item => item.status === "Excuse").length;
}

function changePeriod() {
    loadAttendance();
}

function exportCSV() {
    const rows = [
        ["Date", "Period", "Student No", "Student Name",
         "Status", "Time", "Remarks"]
    ];

    students.forEach((student, index) => {
        const record = attendance.find(item => item.id === student.id);

        rows.push([
            dateInput.value,
            periodSelect.value,
            index + 1,
            student.name,
            record ? record.status : "Pending",
            record ? record.time : "--",
            record ? record.remarks : ""
        ]);
    });

    const csv = rows.map(row =>
        row.map(value =>
            `"${String(value).replace(/"/g, '""')}"`
        ).join(",")
    ).join("\n");

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
        `Attendance_${dateInput.value}_${periodSelect.value}.csv`;

    link.click();

    URL.revokeObjectURL(url);
}

// Save the current date before loading another date.
dateInput.addEventListener("change", () => {
    loadAttendance();
});

document.getElementById("studentName").addEventListener("keydown", event => {
    if (event.key === "Enter") {
        addStudent();
    }
});

// Initialize the system.
dateInput.value = getToday();
loadStudents();
