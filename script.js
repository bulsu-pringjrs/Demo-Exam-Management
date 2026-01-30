// Main JavaScript for TESTIFY Examination Management System

// Global State
let appData = {
    users: [],
    classes: [],
    exams: [],
    results: []
};

let currentUser = null;
let currentExam = null;
let currentQuestionIndex = 0;
let examAnswers = [];
let examTimer = null;
let examTimeRemaining = 0;

// Initialize Application
document.addEventListener('DOMContentLoaded', async function() {
    await loadData();
    checkSession();
    setupEventListeners();
});

// Load Data from JSON
async function loadData() {
    try {
        const response = await fetch('./data.json');
        const data = await response.json();
        
        // Load from localStorage if exists, otherwise use JSON data
        const storedData = localStorage.getItem('testifyData');
        if (storedData) {
            appData = JSON.parse(storedData);
        } else {
            appData = data;
            saveData();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading application data', 'error');
    }
}

// Save Data to localStorage
function saveData() {
    localStorage.setItem('testifyData', JSON.stringify(appData));
}

// Check Session
function checkSession() {
    const session = localStorage.getItem('testifySession');
    if (session) {
        currentUser = JSON.parse(session);
        showDashboard(currentUser.role);
    } else {
        showPage('loginPage');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Login Form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Logout Button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Tab Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(this.closest('.container').querySelector('.dashboard-tabs'), tabName);
        });
    });
    
    // Admin Forms
    document.getElementById('assignmentForm')?.addEventListener('submit', handleAssignment);
    
    // Teacher Forms
    document.getElementById('createClassForm')?.addEventListener('submit', handleCreateClass);
    document.getElementById('createExamForm')?.addEventListener('submit', handleCreateExam);
    document.getElementById('addQuestionBtn')?.addEventListener('click', addQuestionField);
    document.getElementById('resultsClassFilter')?.addEventListener('change', filterResults);
    
    // Exam Navigation
    document.getElementById('prevQuestionBtn')?.addEventListener('click', () => navigateQuestion(-1));
    document.getElementById('nextQuestionBtn')?.addEventListener('click', () => navigateQuestion(1));
    document.getElementById('submitExamBtn')?.addEventListener('click', submitExam);
    
    // Back Buttons
    document.getElementById('backToResultsBtn')?.addEventListener('click', () => {
        showDashboard(currentUser.role);
        switchTab(document.querySelector('#studentPage .dashboard-tabs'), 'myResults');
    });
}

// Authentication
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const user = appData.users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('testifySession', JSON.stringify(user));
        showToast(`Welcome, ${user.name}!`, 'success');
        showDashboard(user.role);
    } else {
        showToast('Invalid username or password', 'error');
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('testifySession');
    showToast('Logged out successfully', 'success');
    showPage('loginPage');
    document.getElementById('loginForm').reset();
}

// Page Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    if (pageId === 'loginPage') {
        document.getElementById('navbar').classList.add('hidden');
    } else {
        document.getElementById('navbar').classList.remove('hidden');
        document.getElementById('navUserName').textContent = currentUser.name;
    }
}

function showDashboard(role) {
    switch(role) {
        case 'admin':
            showPage('adminPage');
            loadAdminDashboard();
            break;
        case 'teacher':
            showPage('teacherPage');
            loadTeacherDashboard();
            break;
        case 'student':
            showPage('studentPage');
            loadStudentDashboard();
            break;
    }
}

// Tab Switching
function switchTab(tabContainer, tabName) {
    const allTabs = tabContainer.querySelectorAll('.tab-btn');
    const allContent = tabContainer.parentElement.querySelectorAll('.tab-content');
    
    allTabs.forEach(tab => tab.classList.remove('active'));
    allContent.forEach(content => content.classList.remove('active'));
    
    tabContainer.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Admin Dashboard Functions
function loadAdminDashboard() {
    loadUsersList();
    loadAssignmentForm();
    loadAssignmentsList();
    loadReports();
}

function loadUsersList() {
    const container = document.getElementById('usersList');
    container.innerHTML = '';
    
    appData.users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <div class="user-info">
                <h4>${user.name}</h4>
                <span class="user-role ${user.role}">${user.role.toUpperCase()}</span>
                <span style="color: #757575; font-size: 13px;">${user.email}</span>
            </div>
        `;
        container.appendChild(userItem);
    });
}

function loadAssignmentForm() {
    const userSelect = document.getElementById('assignUser');
    const classSelect = document.getElementById('assignClass');
    
    userSelect.innerHTML = '<option value="">Select User</option>';
    appData.users.filter(u => u.role !== 'admin').forEach(user => {
        userSelect.innerHTML += `<option value="${user.id}">${user.name} (${user.role})</option>`;
    });
    
    classSelect.innerHTML = '<option value="">Select Class</option>';
    appData.classes.forEach(cls => {
        classSelect.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
    });
}

function loadAssignmentsList() {
    const container = document.getElementById('assignmentsList');
    container.innerHTML = '<h3 style="margin-top: 24px;">Current Assignments</h3>';
    
    appData.classes.forEach(cls => {
        const teacher = appData.users.find(u => u.id === cls.teacherId);
        const students = appData.users.filter(u => cls.studentIds.includes(u.id));
        
        const assignmentItem = document.createElement('div');
        assignmentItem.className = 'assignment-item';
        assignmentItem.innerHTML = `
            <div>
                <strong>${cls.name}</strong><br>
                <small>Teacher: ${teacher?.name || 'None'}</small><br>
                <small>Students: ${students.map(s => s.name).join(', ') || 'None'}</small>
            </div>
        `;
        container.appendChild(assignmentItem);
    });
}

async function handleAssignment(e) {
    e.preventDefault();
    
    const userId = document.getElementById('assignUser').value;
    const classId = document.getElementById('assignClass').value;
    
    const user = appData.users.find(u => u.id === userId);
    const classObj = appData.classes.find(c => c.id === classId);
    
    if (!user || !classObj) {
        showToast('Please select both user and class', 'error');
        return;
    }
    
    if (user.role === 'teacher') {
        if (!user.classes) user.classes = [];
        if (!user.classes.includes(classId)) {
            user.classes.push(classId);
            classObj.teacherId = userId;
        }
    } else if (user.role === 'student') {
        if (!user.classes) user.classes = [];
        if (!user.classes.includes(classId)) {
            user.classes.push(classId);
        }
        if (!classObj.studentIds.includes(userId)) {
            classObj.studentIds.push(userId);
        }
    }
    
    saveData();
    showToast('Assignment successful!', 'success');
    loadAssignmentsList();
    e.target.reset();
}

function loadReports() {
    document.getElementById('totalUsers').textContent = appData.users.length;
    document.getElementById('totalClasses').textContent = appData.classes.length;
    document.getElementById('totalExams').textContent = appData.exams.length;
    document.getElementById('completedExams').textContent = appData.results.length;
}

// Teacher Dashboard Functions
function loadTeacherDashboard() {
    loadTeacherClasses();
    loadExamClassSelect();
    loadResultsFilter();
}

function loadTeacherClasses() {
    const container = document.getElementById('teacherClassesList');
    container.innerHTML = '';
    
    const teacherClasses = appData.classes.filter(c => c.teacherId === currentUser.id);
    
    if (teacherClasses.length === 0) {
        container.innerHTML = '<p style="color: #757575;">No classes assigned yet.</p>';
        return;
    }
    
    teacherClasses.forEach(cls => {
        const students = appData.users.filter(u => cls.studentIds.includes(u.id));
        const exams = appData.exams.filter(e => e.classId === cls.id);
        
        const classCard = document.createElement('div');
        classCard.className = 'class-card';
        classCard.innerHTML = `
            <div class="class-card-header">
                <h3>${cls.name}</h3>
                <p class="class-subject">${cls.subject}</p>
            </div>
            <div class="class-info">
                <div class="class-info-item">
                    <span class="class-info-label">Students:</span>
                    <span class="class-info-value">${students.length}</span>
                </div>
                <div class="class-info-item">
                    <span class="class-info-label">Exams:</span>
                    <span class="class-info-value">${exams.length}</span>
                </div>
            </div>
            <div class="class-students">
                <h4>Enrolled Students</h4>
                <div class="students-list">
                    ${students.map(s => `<span class="student-badge">${s.name}</span>`).join('')}
                </div>
            </div>
            <div style="margin-top: 16px;">
                <h4>Exams</h4>
                ${exams.map(exam => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #F5F5F5;">
                        <span style="font-size: 13px;">${exam.title}</span>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <span class="exam-status ${exam.enabled ? 'enabled' : 'disabled'}">
                                ${exam.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                            <button class="btn-${exam.enabled ? 'danger' : 'success'}" onclick="toggleExam('${exam.id}')">
                                ${exam.enabled ? 'Disable' : 'Enable'}
                            </button>
                        </div>
                    </div>
                `).join('') || '<p style="font-size: 13px; color: #757575;">No exams yet</p>'}
            </div>
        `;
        container.appendChild(classCard);
    });
}

window.toggleExam = function(examId) {
    const exam = appData.exams.find(e => e.id === examId);
    if (exam) {
        exam.enabled = !exam.enabled;
        saveData();
        showToast(`Exam ${exam.enabled ? 'enabled' : 'disabled'} successfully`, 'success');
        loadTeacherClasses();
        loadStudentExams();
    }
};

async function handleCreateClass(e) {
    e.preventDefault();
    
    const newClass = {
        id: 'class' + Date.now(),
        name: document.getElementById('className').value,
        subject: document.getElementById('classSubject').value,
        description: document.getElementById('classDescription').value,
        teacherId: currentUser.id,
        studentIds: []
    };
    
    appData.classes.push(newClass);
    
    if (!currentUser.classes) currentUser.classes = [];
    currentUser.classes.push(newClass.id);
    
    saveData();

    // 🔥 FIX: Sync currentUser properly
    currentUser = appData.users.find(u => u.id === currentUser.id);
    localStorage.setItem('testifySession', JSON.stringify(currentUser));

    showToast('Class created successfully!', 'success');
    e.target.reset();

    // 🔥 Force UI refresh
    loadTeacherClasses();
    loadExamClassSelect();
    loadTeacherDashboard();
}


function loadExamClassSelect() {
    const select = document.getElementById('examClass');
    select.innerHTML = '<option value="">Select Class</option>';
    
    const teacherClasses = appData.classes.filter(c => 
        String(c.teacherId) === String(currentUser.id)
    );

    teacherClasses.forEach(cls => {
        select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
    });
}


let questionCount = 0;

function addQuestionField() {
    questionCount++;
    const container = document.getElementById('questionsContainer');
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item';
    questionDiv.id = `question-${questionCount}`;
    questionDiv.innerHTML = `
        <div class="question-header">
            <h4>Question ${questionCount}</h4>
            <button type="button" class="btn-danger" onclick="removeQuestion(${questionCount})">Remove</button>
        </div>
        <div class="form-group">
            <label>Question Type</label>
            <select class="question-type" onchange="updateQuestionFields(${questionCount})">
                <option value="multiple-choice">Multiple Choice</option>
                <option value="short-answer">Short Answer</option>
                <option value="essay">Essay</option>
                <option value="coding">Coding</option>
            </select>
        </div>
        <div class="form-group">
            <label>Question Text</label>
            <textarea class="question-text" rows="2" required></textarea>
        </div>
        <div class="form-group">
            <label>Points</label>
            <input type="number" class="question-points" value="10" min="1" required>
        </div>
        <div class="options-area">
            <label>Options</label>
            <div class="options-container">
                <div class="option-input-group">
                    <input type="radio" name="correct-${questionCount}" value="0" checked>
                    <input type="text" placeholder="Option 1">
                </div>
                <div class="option-input-group">
                    <input type="radio" name="correct-${questionCount}" value="1">
                    <input type="text" placeholder="Option 2">
                </div>
                <div class="option-input-group">
                    <input type="radio" name="correct-${questionCount}" value="2">
                    <input type="text" placeholder="Option 3">
                </div>
                <div class="option-input-group">
                    <input type="radio" name="correct-${questionCount}" value="3">
                    <input type="text" placeholder="Option 4">
                </div>
            </div>
        </div>
    `;
    
    container.appendChild(questionDiv);
}

window.removeQuestion = function(id) {
    document.getElementById(`question-${id}`).remove();
};

window.updateQuestionFields = function(id) {
    const questionDiv = document.getElementById(`question-${id}`);
    const type = questionDiv.querySelector('.question-type').value;
    const optionsArea = questionDiv.querySelector('.options-area');
    const optionInputs = questionDiv.querySelectorAll('.option-input-group input[type="text"]');

    if (type === 'multiple-choice') {
        optionsArea.style.display = 'block';
        optionInputs.forEach(input => input.setAttribute('required', 'required'));
    } else {
        optionsArea.style.display = 'none';
        optionInputs.forEach(input => input.removeAttribute('required'));
    }
};


async function handleCreateExam(e) {
    e.preventDefault();
    
    const classId = document.getElementById('examClass').value;
    const title = document.getElementById('examTitle').value;
    const description = document.getElementById('examDescription').value;
    const duration = parseInt(document.getElementById('examDuration').value);
    const enabled = document.getElementById('examEnabled').value === 'true';
    
    if (!classId) {
        showToast('Please select a class', 'error');
        return;
    }
    
    const questions = [];
    if (document.querySelectorAll('.question-item').length === 0) {
        showToast('Please add at least one question', 'error');
        return;
    }

    let totalScore = 0;
    
    document.querySelectorAll('.question-item').forEach((qDiv, index) => {
        const type = qDiv.querySelector('.question-type').value;
        const questionText = qDiv.querySelector('.question-text').value;
        const points = parseInt(qDiv.querySelector('.question-points').value);
        
        totalScore += points;
        
        const question = {
            id: 'q' + (index + 1),
            type: type,
            question: questionText,
            points: points
        };
        
        if (type === 'multiple-choice') {
            const options = [];
            const optionInputs = qDiv.querySelectorAll('.option-input-group input[type="text"]');
            optionInputs.forEach(input => options.push(input.value));
            
            const correctRadio = qDiv.querySelector('input[type="radio"]:checked');
            const correctAnswer = parseInt(correctRadio.value);
            
            question.options = options;
            question.correctAnswer = correctAnswer;
        } else {
            question.correctAnswer = '';
        }
        
        questions.push(question);
    });
    
    if (questions.length === 0) {
        showToast('Please add at least one question', 'error');
        return;
    }
    
    const newExam = {
        id: 'exam' + Date.now(),
        classId: classId,
        title: title,
        description: description,
        duration: duration,
        totalScore: totalScore,
        enabled: enabled,
        createdBy: currentUser.id,
        questions: questions
    };
    
    appData.exams.push(newExam);
    saveData();
    
    showToast('Exam created successfully!', 'success');
    e.target.reset();
    document.getElementById('questionsContainer').innerHTML = '';
    questionCount = 0;
    loadTeacherClasses();
}

function loadResultsFilter() {
    const select = document.getElementById('resultsClassFilter');
    select.innerHTML = '<option value="">All Classes</option>';
    
    const teacherClasses = appData.classes.filter(c => 
        String(c.teacherId) === String(currentUser.id)
    );

    teacherClasses.forEach(cls => {
        select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
    });
    
    filterResults();
}

function filterResults() {
    const classId = document.getElementById('resultsClassFilter').value;
    const container = document.getElementById('resultsTableContainer');
    
    let results = appData.results;
    
    if (classId) {
        const classExams = appData.exams.filter(e => e.classId === classId).map(e => e.id);
        results = results.filter(r => classExams.includes(r.examId));
    } else {
        const teacherClasses = appData.classes.filter(c => c.teacherId === currentUser.id);
        const teacherExams = appData.exams.filter(e => teacherClasses.some(c => c.id === e.classId)).map(e => e.id);
        results = results.filter(r => teacherExams.includes(r.examId));
    }
    
    if (results.length === 0) {
        container.innerHTML = '<p style="color: #757575; margin-top: 16px;">No results found.</p>';
        return;
    }
    
    let tableHTML = `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Student</th>
                    <th>Exam</th>
                    <th>Score</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    results.forEach(result => {
        const student = appData.users.find(u => u.id === result.studentId);
        const exam = appData.exams.find(e => e.id === result.examId);
        const date = new Date(result.submittedAt).toLocaleDateString();
        
        tableHTML += `
            <tr>
                <td>${student?.name || 'Unknown'}</td>
                <td>${exam?.title || 'Unknown'}</td>
                <td><strong>${result.score}/${result.totalScore}</strong></td>
                <td>${date}</td>
            </tr>
        `;
    });
    
    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

// Student Dashboard Functions
function loadStudentDashboard() {
    loadStudentClasses();
    loadStudentExams();
    loadStudentResults();
}

function loadStudentClasses() {
    const container = document.getElementById('studentClassesList');
    container.innerHTML = '';
    
    const studentClasses = appData.classes.filter(c => c.studentIds.includes(currentUser.id));
    
    if (studentClasses.length === 0) {
        container.innerHTML = '<p style="color: #757575;">No classes assigned yet.</p>';
        return;
    }
    
    studentClasses.forEach(cls => {
        const teacher = appData.users.find(u => u.id === cls.teacherId);
        const exams = appData.exams.filter(e => e.classId === cls.id && e.enabled);
        
        const classCard = document.createElement('div');
        classCard.className = 'class-card';
        classCard.innerHTML = `
            <div class="class-card-header">
                <h3>${cls.name}</h3>
                <p class="class-subject">${cls.subject}</p>
            </div>
            <div class="class-info">
                <div class="class-info-item">
                    <span class="class-info-label">Teacher:</span>
                    <span class="class-info-value">${teacher?.name || 'Not assigned'}</span>
                </div>
                <div class="class-info-item">
                    <span class="class-info-label">Available Exams:</span>
                    <span class="class-info-value">${exams.length}</span>
                </div>
            </div>
            <p style="margin-top: 12px; font-size: 13px; color: #757575;">${cls.description}</p>
        `;
        container.appendChild(classCard);
    });
}

function loadStudentExams() {
    const container = document.getElementById('availableExamsList');
    container.innerHTML = '';
    
    const studentClasses = appData.classes.filter(c => c.studentIds.includes(currentUser.id));
    const availableExams = appData.exams.filter(e => 
        e.enabled && studentClasses.some(c => c.id === e.classId)
    );
    
    if (availableExams.length === 0) {
        container.innerHTML = '<p style="color: #757575;">No exams available at the moment.</p>';
        return;
    }
    
    availableExams.forEach(exam => {
        const cls = appData.classes.find(c => c.id === exam.classId);
        const alreadyTaken = appData.results.some(r => r.examId === exam.id && r.studentId === currentUser.id);
        
        const examCard = document.createElement('div');
        examCard.className = 'exam-card';
        examCard.innerHTML = `
            <div class="exam-card-header">
                <div>
                    <h3>${exam.title}</h3>
                    <p style="color: #757575; font-size: 13px;">${cls?.name || 'Unknown Class'}</p>
                </div>
                <span class="exam-status enabled">Available</span>
            </div>
            <p style="margin-bottom: 16px; font-size: 14px;">${exam.description}</p>
            <div class="exam-meta">
                <div>⏱️ Duration: ${exam.duration} minutes</div>
                <div>📝 Questions: ${exam.questions.length}</div>
                <div>🎯 Total Score: ${exam.totalScore}</div>
            </div>
            <div class="exam-actions">
                ${alreadyTaken 
                    ? '<button class="btn-secondary" disabled>Already Taken</button>'
                    : `<button class="btn-primary" onclick="startExam('${exam.id}')">Start Exam</button>`
                }
            </div>
        `;
        container.appendChild(examCard);
    });
}

window.startExam = function(examId) {
    currentExam = appData.exams.find(e => e.id === examId);
    if (!currentExam) return;
    
    currentQuestionIndex = 0;
    examAnswers = new Array(currentExam.questions.length).fill(null);
    examTimeRemaining = currentExam.duration * 60;
    
    showPage('examPage');
    loadExamInterface();
    startExamTimer();
};

function loadExamInterface() {
    document.getElementById('examPageTitle').textContent = currentExam.title;
    document.getElementById('examPageDescription').textContent = currentExam.description;
    
    displayQuestion();
    updateProgress();
}

function displayQuestion() {
    const question = currentExam.questions[currentQuestionIndex];
    const container = document.getElementById('examQuestionContainer');
    
    let answerHTML = '';
    
    switch(question.type) {
        case 'multiple-choice':
            answerHTML = '<div class="answer-options">';
            question.options.forEach((option, index) => {
                const isSelected = examAnswers[currentQuestionIndex] === index;
                answerHTML += `
                    <label class="option-label ${isSelected ? 'selected' : ''}">
                        <input type="radio" name="answer" value="${index}" 
                            ${isSelected ? 'checked' : ''}
                            onchange="saveAnswer(${index})">
                        <span>${option}</span>
                    </label>
                `;
            });
            answerHTML += '</div>';
            break;
            
        case 'short-answer':
        case 'essay':
        case 'coding':
            const rows = question.type === 'short-answer' ? 3 : 8;
            const currentAnswer = examAnswers[currentQuestionIndex] || '';
            answerHTML = `
                <textarea class="answer-textarea" rows="${rows}" 
                    placeholder="Type your answer here..."
                    oninput="saveAnswer(this.value)">${currentAnswer}</textarea>
            `;
            break;
    }
    
    container.innerHTML = `
        <div class="question-content">
            <div class="question-number">Question ${currentQuestionIndex + 1} of ${currentExam.questions.length}</div>
            <div class="question-text">${question.question}</div>
            <div class="question-points">${question.points} points</div>
        </div>
        ${answerHTML}
    `;
    
    // Update navigation buttons
    document.getElementById('prevQuestionBtn').disabled = currentQuestionIndex === 0;
    
    if (currentQuestionIndex === currentExam.questions.length - 1) {
        document.getElementById('nextQuestionBtn').classList.add('hidden');
        document.getElementById('submitExamBtn').classList.remove('hidden');
    } else {
        document.getElementById('nextQuestionBtn').classList.remove('hidden');
        document.getElementById('submitExamBtn').classList.add('hidden');
    }
}

window.saveAnswer = function(answer) {
    examAnswers[currentQuestionIndex] = answer;
};

function navigateQuestion(direction) {
    const newIndex = currentQuestionIndex + direction;
    
    if (newIndex >= 0 && newIndex < currentExam.questions.length) {
        currentQuestionIndex = newIndex;
        displayQuestion();
        updateProgress();
    }
}

function updateProgress() {
    const progress = ((currentQuestionIndex + 1) / currentExam.questions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('progressText').textContent = 
        `Question ${currentQuestionIndex + 1} of ${currentExam.questions.length}`;
}

function startExamTimer() {
    const timerDisplay = document.getElementById('timerDisplay');
    
    examTimer = setInterval(() => {
        examTimeRemaining--;
        
        const minutes = Math.floor(examTimeRemaining / 60);
        const seconds = examTimeRemaining % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (examTimeRemaining <= 300) {
            timerDisplay.classList.add('warning');
        }
        
        if (examTimeRemaining <= 0) {
            clearInterval(examTimer);
            showToast('Time is up! Submitting exam...', 'warning');
            setTimeout(submitExam, 2000);
        }
    }, 1000);
}

function submitExam() {
    if (examTimer) {
        clearInterval(examTimer);
    }
    
    // Calculate score
    let score = 0;
    const answers = [];
    
    currentExam.questions.forEach((question, index) => {
        const answer = examAnswers[index];
        answers.push({
            questionId: question.id,
            answer: answer
        });
        
        if (question.type === 'multiple-choice' && answer === question.correctAnswer) {
            score += question.points;
        }
    });
    
    // Save result
    const result = {
        id: 'result' + Date.now(),
        examId: currentExam.id,
        studentId: currentUser.id,
        answers: answers,
        score: score,
        totalScore: currentExam.totalScore,
        submittedAt: new Date().toISOString(),
        gradedBy: 'auto'
    };
    
    appData.results.push(result);
    saveData();
    
    showToast('Exam submitted successfully!', 'success');
    
    setTimeout(() => {
        showDashboard('student');
        switchTab(document.querySelector('#studentPage .dashboard-tabs'), 'myResults');
    }, 1500);
}

function loadStudentResults() {
    const container = document.getElementById('studentResultsList');
    container.innerHTML = '';
    
    const studentResults = appData.results.filter(r => r.studentId === currentUser.id);
    
    if (studentResults.length === 0) {
        container.innerHTML = '<p style="color: #757575;">No exam results yet.</p>';
        return;
    }
    
    studentResults.forEach(result => {
        const exam = appData.exams.find(e => e.id === result.examId);
        const cls = appData.classes.find(c => c.id === exam?.classId);
        const percentage = Math.round((result.score / result.totalScore) * 100);
        const passed = percentage >= 60;
        
        const resultCard = document.createElement('div');
        resultCard.className = 'result-card';
        resultCard.innerHTML = `
            <div class="result-header">
                <div>
                    <h3>${exam?.title || 'Unknown Exam'}</h3>
                    <p style="color: #757575; font-size: 13px;">${cls?.name || 'Unknown Class'}</p>
                </div>
                <div class="result-score ${passed ? 'pass' : 'fail'}">
                    ${result.score}/${result.totalScore}
                    <div style="font-size: 14px;">${percentage}%</div>
                </div>
            </div>
            <div class="result-meta">
                <div class="result-meta-item">
                    <span class="result-meta-label">Submitted:</span>
                    <span class="result-meta-value">${new Date(result.submittedAt).toLocaleString()}</span>
                </div>
                <div class="result-meta-item">
                    <span class="result-meta-label">Status:</span>
                    <span class="result-meta-value" style="color: ${passed ? '#4CAF50' : '#F44336'}">
                        ${passed ? 'Passed' : 'Failed'}
                    </span>
                </div>
            </div>
            <button class="btn-primary" onclick="viewResultDetail('${result.id}')">View Details</button>
        `;
        container.appendChild(resultCard);
    });
}

window.viewResultDetail = function(resultId) {
    const result = appData.results.find(r => r.id === resultId);
    const exam = appData.exams.find(e => e.id === result.examId);
    
    if (!result || !exam) return;
    
    const container = document.getElementById('resultDetailContent');
    const percentage = Math.round((result.score / result.totalScore) * 100);
    
    let detailHTML = `
        <div class="card">
            <h2>${exam.title}</h2>
            <div class="result-meta" style="margin-bottom: 24px;">
                <div class="result-meta-item">
                    <span class="result-meta-label">Your Score:</span>
                    <span class="result-meta-value" style="font-size: 24px; color: #FF9800;">
                        ${result.score}/${result.totalScore} (${percentage}%)
                    </span>
                </div>
                <div class="result-meta-item">
                    <span class="result-meta-label">Submitted:</span>
                    <span class="result-meta-value">${new Date(result.submittedAt).toLocaleString()}</span>
                </div>
            </div>
            <h3>Your Answers</h3>
    `;
    
    exam.questions.forEach((question, index) => {
        const studentAnswer = result.answers.find(a => a.questionId === question.id);
        let isCorrect = false;
        let answerText = 'Not answered';
        
        if (question.type === 'multiple-choice') {
            isCorrect = studentAnswer?.answer === question.correctAnswer;
            answerText = studentAnswer?.answer !== null && studentAnswer?.answer !== undefined
                ? question.options[studentAnswer.answer]
                : 'Not answered';
        } else {
            answerText = studentAnswer?.answer || 'Not answered';
        }
        
        detailHTML += `
            <div style="padding: 20px; background-color: #FAFAFA; border-radius: 8px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <strong>Question ${index + 1}</strong>
                    <span style="color: #757575;">${question.points} points</span>
                </div>
                <p style="margin-bottom: 12px;">${question.question}</p>
                <div style="padding: 12px; background-color: #FFFFFF; border-radius: 4px; border-left: 4px solid ${isCorrect ? '#4CAF50' : '#FF9800'};">
                    <strong>Your Answer:</strong>
                    <p style="margin-top: 8px;">${answerText}</p>
                </div>
                ${question.type === 'multiple-choice' ? `
                    <div style="margin-top: 12px; padding: 12px; background-color: #E8F5E9; border-radius: 4px;">
                        <strong>Correct Answer:</strong>
                        <p style="margin-top: 8px;">${question.options[question.correctAnswer]}</p>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    detailHTML += '</div>';
    container.innerHTML = detailHTML;
    
    showPage('resultDetailPage');
};

// Toast Notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Export functions for global access
window.toggleExam = window.toggleExam;
window.startExam = window.startExam;
window.saveAnswer = window.saveAnswer;
window.viewResultDetail = window.viewResultDetail;
window.removeQuestion = window.removeQuestion;
window.updateQuestionFields = window.updateQuestionFields;
