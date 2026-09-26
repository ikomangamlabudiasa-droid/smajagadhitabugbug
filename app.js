// ============ STORAGE ============
const DB = {
  get: (key) => JSON.parse(localStorage.getItem(key) || '[]'),
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
};

// ============ AUTH ============
const USERS = [
  { username: 'student', password: '123', role: 'student', name: 'Budi Santoso' },
  { username: 'teacher', password: '123', role: 'teacher', name: 'Ibu Ani' },
];

let currentUser = null;
let selectedTaskId = null;

// ============ INIT ============
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

function showPage(id) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function toast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => (t.className = 'toast'), 2500);
}

// ============ LOGIN ============
function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const role = document.querySelector('.tab.active').dataset.role;

  const user = USERS.find(
    (u) => u.username === username && u.password === password && u.role === role
  );

  if (!user) return toast('Username/password salah!', true);

  currentUser = user;
  localStorage.setItem('currentUser', JSON.stringify(user));

  if (user.role === 'student') {
    document.getElementById('studentName').textContent = `👋 ${user.name}`;
    renderStudent();
    showPage('studentPage');
  } else {
    document.getElementById('teacherName').textContent = `👋 ${user.name}`;
    renderTeacher();
    showPage('teacherPage');
  }
  toast(`Selamat datang, ${user.name}!`);
}

function logout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  showPage('loginPage');
}

// Auto-login
window.addEventListener('load', () => {
  const saved = localStorage.getItem('currentUser');
  if (saved) {
    currentUser = JSON.parse(saved);
    if (currentUser.role === 'student') {
      document.getElementById('studentName').textContent = `👋 ${currentUser.name}`;
      renderStudent();
      showPage('studentPage');
    } else {
      document.getElementById('teacherName').textContent = `👋 ${currentUser.name}`;
      renderTeacher();
      showPage('teacherPage');
    }
  }
});

// ============ TASKS (TEACHER) ============
function createTask() {
  const title = document.getElementById('taskTitle').value.trim();
  const desc = document.getElementById('taskDesc').value.trim();
  const deadline = document.getElementById('taskDeadline').value;

  if (!title || !deadline) return toast('Judul & deadline wajib diisi!', true);

  const tasks = DB.get('tasks');
  tasks.push({
    id: Date.now(),
    title,
    desc,
    deadline,
    createdBy: currentUser.name,
    createdAt: new Date().toISOString(),
  });
  DB.set('tasks', tasks);

  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDesc').value = '';
  document.getElementById('taskDeadline').value = '';

  renderTeacher();
  toast('Tugas berhasil dibuat!');
}

function deleteTask(id) {
  if (!confirm('Hapus tugas ini?')) return;
  DB.set('tasks', DB.get('tasks').filter((t) => t.id !== id));
  DB.set('submissions', DB.get('submissions').filter((s) => s.taskId !== id));
  renderTeacher();
  toast('Tugas dihapus');
}

// ============ SUBMISSIONS (STUDENT) ============
function openSubmitModal(taskId) {
  selectedTaskId = taskId;
  const task = DB.get('tasks').find((t) => t.id === taskId);
  document.getElementById('modalTitle').textContent = `Submit: ${task.title}`;

  const existing = DB.get('submissions').find(
    (s) => s.taskId === taskId && s.student === currentUser.username
  );
  document.getElementById('submitAnswer').value = existing ? existing.answer : '';
  document.getElementById('submitModal').classList.add('active');
}

function closeModal() {
  document.getElementById('submitModal').classList.remove('active');
  selectedTaskId = null;
}

function submitTask() {
  const answer = document.getElementById('submitAnswer').value.trim();
  if (!answer) return toast('Jawaban tidak boleh kosong!', true);

  const subs = DB.get('submissions');
  const idx = subs.findIndex(
    (s) => s.taskId === selectedTaskId && s.student === currentUser.username
  );

  const task = DB.get('tasks').find((t) => t.id === selectedTaskId);
  const now = new Date();
  const deadline = new Date(task.deadline + 'T23:59:59');
  const status = now > deadline ? 'late' : 'submitted';

  const data = {
    taskId: selectedTaskId,
    taskTitle: task.title,
    student: currentUser.username,
    studentName: currentUser.name,
    answer,
    status,
    submittedAt: now.toISOString(),
  };

  if (idx >= 0) subs[idx] = data;
  else subs.push(data);

  DB.set('submissions', subs);
  closeModal();
  renderStudent();
  toast('Tugas berhasil dikumpulkan!');
}

// ============ RENDER STUDENT ============
function renderStudent() {
  const tasks = DB.get('tasks');
  const subs = DB.get('submissions').filter((s) => s.student === currentUser.username);

  // Task list
  const taskList = document.getElementById('taskList');
  if (tasks.length === 0) {
    taskList.innerHTML = '<div class="empty">Belum ada tugas</div>';
  } else {
    taskList.innerHTML = tasks
      .map((t) => {
        const sub = subs.find((s) => s.taskId === t.id);
        const badge = sub
          ? `<span class="badge badge-${sub.status}">${sub.status}</span>`
          : '<span class="badge badge-pending">Belum</span>';

        return `
          <div class="item">
            <div class="item-header">
              <div>
                <div class="item-title">${t.title}</div>
                <div class="item-meta">Deadline: ${formatDate(t.deadline)}</div>
              </div>
              ${badge}
            </div>
            <div class="item-desc">${t.desc || '-'}</div>
            <button class="btn-small btn-submit" onclick="openSubmitModal(${t.id})">
              ${sub ? '✏️ Edit' : '📤 Submit'}
            </button>
          </div>
        `;
      })
      .join('');
  }

  // Submissions
  const mySubs = document.getElementById('mySubmissions');
  if (subs.length === 0) {
    mySubs.innerHTML = '<div class="empty">Belum ada submission</div>';
  } else {
    mySubs.innerHTML = subs
      .map(
        (s) => `
        <div class="item">
          <div class="item-header">
            <div class="item-title">${s.taskTitle}</div>
            <span class="badge badge-${s.status}">${s.status}</span>
          </div>
          <div class="item-desc">${s.answer}</div>
          <div class="item-meta">Dikirim: ${formatDateTime(s.submittedAt)}</div>
        </div>
      `
      )
      .join('');
  }
}

// ============ RENDER TEACHER ============
function renderTeacher() {
  const tasks = DB.get('tasks');
  const subs = DB.get('submissions');

  const list = document.getElementById('teacherTaskList');
  if (tasks.length === 0) {
    list.innerHTML = '<div class="empty">Belum ada tugas</div>';
  } else {
    list.innerHTML = tasks
      .map((t) => {
        const count = subs.filter((s) => s.taskId === t.id).length;
        return `
          <div class="item">
            <div class="item-header">
              <div>
                <div class="item-title">${t.title}</div>
                <div class="item-meta">Deadline: ${formatDate(t.deadline)} • ${count} submission</div>
              </div>
              <button class="btn-small btn-delete" onclick="deleteTask(${t.id})">🗑️ Hapus</button>
            </div>
            <div class="item-desc">${t.desc || '-'}</div>
          </div>
        `;
      })
      .join('');
  }

  const allSubs = document.getElementById('allSubmissions');
  if (subs.length === 0) {
    allSubs.innerHTML = '<div class="empty">Belum ada submission</div>';
  } else {
    allSubs.innerHTML = subs
      .map(
        (s) => `
        <div class="item">
          <div class="item-header">
            <div>
              <div class="item-title">${s.taskTitle}</div>
              <div class="item-meta">👤 ${s.studentName} • ${formatDateTime(s.submittedAt)}</div>
            </div>
            <span class="badge badge-${s.status}">${s.status}</span>
          </div>
          <div class="item-desc">${s.answer}</div>
        </div>
      `
      )
      .join('');
  }
}

// ============ HELPERS ============
function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
