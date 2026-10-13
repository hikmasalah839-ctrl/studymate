'use strict';

(() => {
  const STORAGE_KEY = 'studymate-data-v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(`${dateString}T12:00:00`);
    return Number.isNaN(date.getTime()) ? dateString : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const todayISO = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
  };

  const starterQuestions = [
    { subject: 'Mathematics', question: 'What is the value of 7 × 8?', choices: ['54', '56', '64', '48'], answer: 1, explanation: '7 × 8 = 56.' },
    { subject: 'Mathematics', question: 'Solve: x + 5 = 12.', choices: ['x = 5', 'x = 6', 'x = 7', 'x = 17'], answer: 2, explanation: 'Subtract 5 from both sides: x = 12 − 5 = 7.' },
    { subject: 'Mathematics', question: 'Which number is a prime number?', choices: ['9', '15', '21', '13'], answer: 3, explanation: '13 has exactly two positive factors: 1 and 13.' },
    { subject: 'Biology', question: 'Which cell structure contains most of the cell’s genetic material?', choices: ['Nucleus', 'Cell membrane', 'Cytoplasm', 'Vacuole'], answer: 0, explanation: 'The nucleus contains most of a eukaryotic cell’s DNA.' },
    { subject: 'Biology', question: 'What is the main purpose of photosynthesis?', choices: ['Break down rocks', 'Make food using light energy', 'Pump blood', 'Digest proteins'], answer: 1, explanation: 'Plants use light energy to make sugars from carbon dioxide and water.' },
    { subject: 'Biology', question: 'Which organ pumps blood around the human body?', choices: ['Lung', 'Kidney', 'Heart', 'Stomach'], answer: 2, explanation: 'The heart pumps blood through the circulatory system.' },
    { subject: 'English', question: 'Which word is an adjective in “The bright sun rose”?', choices: ['The', 'bright', 'sun', 'rose'], answer: 1, explanation: '“Bright” describes the noun “sun,” so it is an adjective.' },
    { subject: 'English', question: 'What is the past tense of “go”?', choices: ['Goed', 'Gone', 'Went', 'Going'], answer: 2, explanation: 'The simple past form of “go” is “went.”' },
    { subject: 'English', question: 'Which sentence is correctly punctuated?', choices: ['Where are you.', 'Where are you?', 'where are you?', 'Where are you,'], answer: 1, explanation: 'A direct question starts with a capital letter and ends with a question mark.' },
    { subject: 'Python', question: 'Which Python command displays text on the screen?', choices: ['show()', 'echo()', 'print()', 'writeLine()'], answer: 2, explanation: 'print() displays text or values in the output.' },
    { subject: 'Python', question: 'What is the result of 3 ** 2 in Python?', choices: ['5', '6', '9', '8'], answer: 2, explanation: '** means exponentiation, so 3 ** 2 is 3 squared, which is 9.' },
    { subject: 'Python', question: 'Which data type stores True or False?', choices: ['str', 'bool', 'list', 'int'], answer: 1, explanation: 'The bool type stores Boolean values: True and False.' },
    { subject: 'General Science', question: 'What is the approximate force that pulls objects toward Earth?', choices: ['Gravity', 'Friction only', 'Magnetism only', 'Sound'], answer: 0, explanation: 'Gravity attracts objects with mass toward one another.' },
    { subject: 'General Science', question: 'At standard atmospheric pressure, water freezes at what temperature?', choices: ['100°C', '50°C', '0°C', '−100°C'], answer: 2, explanation: 'Water freezes at 0°C under standard atmospheric pressure.' },
    { subject: 'General Science', question: 'Which state of matter has a fixed shape and fixed volume?', choices: ['Gas', 'Liquid', 'Plasma', 'Solid'], answer: 3, explanation: 'A solid has a definite shape and a definite volume.' }
  ];

  const defaultData = () => ({ notes: [], tasks: [], customQuestions: [], quizHistory: [], focusSessions: 0 });
  let data = defaultData();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object') data = { ...defaultData(), ...saved };
  } catch (error) {
    console.warn('StudyMate could not read saved data:', error);
  }
  const saveData = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      showToast('Could not save. Check browser storage space or privacy settings.');
      return false;
    }
  };
  let toastTimer;
  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }
  function updateStats() {
    $('#notesCount').textContent = data.notes.length;
    $('#tasksCount').textContent = data.tasks.filter((task) => !task.done).length;
    $('#quizzesCount').textContent = data.quizHistory.length;
    $('#sessionsCount').textContent = data.focusSessions;
    $('#timerSessionCount').textContent = data.focusSessions;
  }
  function renderNotes() {
    const list = $('#notesList');
    const search = ($('#noteSearch').value || '').trim().toLowerCase();
    const notes = [...data.notes].filter((note) => `${note.title} ${note.subject} ${note.content}`.toLowerCase().includes(search));
    const filtered = notes.sort((a, b) => b.updatedAt - a.updatedAt);
    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state"><span>📝</span><strong>${search ? 'No matching notes' : 'Your notes will appear here'}</strong><p>${search ? 'Try a different search term.' : 'Create your first note using the form.'}</p></div>`;
      return;
    }
    list.innerHTML = filtered.map((note) => `<article class="item-card"><div class="item-top"><div><h4>${escapeHtml(note.title)}</h4><p class="item-meta">${escapeHtml(note.subject)} · Updated ${escapeHtml(formatDate(new Date(note.updatedAt).toISOString().slice(0, 10)))}</p></div><div class="item-actions"><button type="button" class="small-action" data-note-edit="${escapeHtml(note.id)}">Edit</button><button type="button" class="small-action danger" data-note-delete="${escapeHtml(note.id)}">Delete</button></div></div><p class="item-body">${escapeHtml(note.content.length > 420 ? `${note.content.slice(0, 420)}…` : note.content)}</p></article>`).join('');
  }
  function resetNoteForm() {
    $('#noteForm').reset();
    $('#noteId').value = '';
    $('#noteFormTitle').textContent = 'Create a note';
    $('#saveNoteButton').textContent = 'Save note';
    $('#cancelEditNote').classList.add('hidden');
  }
  $('#noteForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const id = $('#noteId').value;
    const title = $('#noteTitle').value.trim();
    const subject = $('#noteSubject').value.trim();
    const content = $('#noteContent').value.trim();
    if (!title || !subject || !content) return showToast('Please complete all note fields.');
    if (id) {
      const note = data.notes.find((item) => item.id === id);
      if (note) Object.assign(note, { title, subject, content, updatedAt: Date.now() });
      showToast('Note updated.');
    } else {
      data.notes.push({ id: makeId(), title, subject, content, createdAt: Date.now(), updatedAt: Date.now() });
      showToast('Note saved to this browser.');
    }
    saveData(); resetNoteForm(); renderNotes(); updateStats();
  });
  $('#cancelEditNote').addEventListener('click', resetNoteForm);
  $('#noteSearch').addEventListener('input', renderNotes);
  $('#notesList').addEventListener('click', (event) => {
    const editButton = event.target.closest('[data-note-edit]');
    const deleteButton = event.target.closest('[data-note-delete]');
    if (editButton) {
      const note = data.notes.find((item) => item.id === editButton.dataset.noteEdit);
      if (!note) return;
      $('#noteId').value = note.id; $('#noteTitle').value = note.title; $('#noteSubject').value = note.subject; $('#noteContent').value = note.content;
      $('#noteFormTitle').textContent = 'Edit your note'; $('#saveNoteButton').textContent = 'Update note'; $('#cancelEditNote').classList.remove('hidden');
      $('#noteTitle').focus(); $('#noteForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (deleteButton) {
      const note = data.notes.find((item) => item.id === deleteButton.dataset.noteDelete);
      if (note && window.confirm(`Delete “${note.title}”? This cannot be undone.`)) {
        data.notes = data.notes.filter((item) => item.id !== note.id); saveData(); renderNotes(); updateStats(); showToast('Note deleted.');
      }
    }
  });

  function allQuestions() {
    return [...starterQuestions, ...data.customQuestions];
  }
  let currentQuiz = [];
  let questionIndex = 0;
  let currentScore = 0;
  let selectedAnswer = null;
  let answerSubmitted = false;
  function renderQuizQuestion() {
    const area = $('#quizArea');
    if (!currentQuiz.length) {
      area.innerHTML = '<div class="empty-state small-empty"><span>🧩</span><strong>No questions for this subject yet</strong><p>Try Mixed subjects or add a custom question.</p></div>';
      return;
    }
    if (questionIndex >= currentQuiz.length) {
      const percent = Math.round((currentScore / currentQuiz.length) * 100);
      const history = { id: makeId(), score: currentScore, total: currentQuiz.length, percent, date: Date.now() };
      data.quizHistory.push(history); saveData(); updateStats();
      const message = percent >= 80 ? 'Excellent work! Keep practising.' : percent >= 50 ? 'Good effort. Review the questions you missed and try again.' : 'Every attempt teaches you something. Review the explanations and try another round.';
      area.innerHTML = `<div class="quiz-question quiz-result"><div class="empty-state small-empty"><span>${percent >= 80 ? '🏆' : percent >= 50 ? '🌟' : '🌱'}</span><strong>Quiz complete!</strong><p>You scored ${currentScore} out of ${currentQuiz.length} (${percent}%).</p><p>${message}</p><button type="button" class="button primary" id="restartQuizButton">Try another quiz</button></div></div>`;
      return;
    }
    const question = currentQuiz[questionIndex];
    const optionHtml = question.choices.map((choice, index) => `<label class="quiz-option"><input type="radio" name="quizAnswer" value="${index}" ${selectedAnswer === index ? 'checked' : ''} ${answerSubmitted ? 'disabled' : ''}><span><strong>${String.fromCharCode(65 + index)}.</strong> ${escapeHtml(choice)}</span></label>`).join('');
    let feedback = '';
    if (answerSubmitted) feedback = `<div class="quiz-feedback ${selectedAnswer === question.answer ? 'correct' : 'incorrect'}">${selectedAnswer === question.answer ? '✓ Correct!' : `Not quite. The correct answer is ${String.fromCharCode(65 + question.answer)}.`} ${escapeHtml(question.explanation || '')}</div>`;
    area.innerHTML = `<div class="quiz-question"><div class="quiz-progress"><span>Question ${questionIndex + 1} of ${currentQuiz.length}</span><span>Score: ${currentScore}</span></div><p class="item-meta">${escapeHtml(question.subject)}</p><h4>${escapeHtml(question.question)}</h4><div>${optionHtml}</div>${feedback}<div class="quiz-buttons">${answerSubmitted ? `<button type="button" class="button primary" id="nextQuestionButton">${questionIndex === currentQuiz.length - 1 ? 'See results' : 'Next question →'}</button>` : '<button type="button" class="button primary" id="checkAnswerButton">Check answer</button>'}</div></div>`;
  }
  $('#startQuizButton').addEventListener('click', () => {
    const subject = $('#quizSubject').value;
    let questions = allQuestions().filter((question) => subject === 'all' || question.subject.toLowerCase() === subject.toLowerCase());
    questions = questions.sort(() => Math.random() - 0.5);
    if (!questions.length) return showToast('No questions available for this subject yet. Add one below.');
    const requested = $('#quizLength').value === 'all' ? questions.length : Number($('#quizLength').value);
    currentQuiz = questions.slice(0, Math.min(requested, questions.length));
    questionIndex = 0; currentScore = 0; selectedAnswer = null; answerSubmitted = false;
    renderQuizQuestion();
  });
  $('#quizArea').addEventListener('change', (event) => {
    if (event.target.name === 'quizAnswer' && !answerSubmitted) selectedAnswer = Number(event.target.value);
  });
  $('#quizArea').addEventListener('click', (event) => {
    if (event.target.closest('#checkAnswerButton')) {
      if (selectedAnswer === null) return showToast('Choose an answer first.');
      answerSubmitted = true;
      if (selectedAnswer === currentQuiz[questionIndex].answer) currentScore += 1;
      renderQuizQuestion();
    }
    if (event.target.closest('#nextQuestionButton')) {
      questionIndex += 1; selectedAnswer = null; answerSubmitted = false; renderQuizQuestion();
    }
    if (event.target.closest('#restartQuizButton')) $('#startQuizButton').click();
  });
  $('#customQuizForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const subject = $('#customSubject').value.trim(); const question = $('#customQuestion').value.trim();
    const choices = ['A', 'B', 'C', 'D'].map((letter) => $(`#choice${letter}`).value.trim());
    if (!subject || !question || choices.some((choice) => !choice)) return showToast('Please fill in the subject, question, and all four choices.');
    data.customQuestions.push({ id: makeId(), subject, question, choices, answer: Number($('#correctChoice').value), explanation: 'Review your class notes to remember why this answer is correct.' });
    saveData(); $('#customQuizForm').reset(); $('#customQuizMessage').textContent = 'Question added! Select its subject in Practice Quiz to use it.'; showToast('Your quiz question has been added.');
    if (![...$('#quizSubject').options].some((option) => option.value.toLowerCase() === subject.toLowerCase())) {
      const option = document.createElement('option'); option.value = subject; option.textContent = subject; $('#quizSubject').append(option);
    }
  });

  function renderTasks() {
    const list = $('#tasksList'); const filter = $('#taskFilter').value;
    const tasks = [...data.tasks].filter((task) => filter === 'all' || (filter === 'done' ? task.done : !task.done)).sort((a, b) => a.date.localeCompare(b.date));
    if (!tasks.length) {
      list.innerHTML = `<div class="empty-state"><span>🗓️</span><strong>${filter === 'done' ? 'No completed tasks yet' : filter === 'open' ? 'All caught up!' : 'Your plan starts here'}</strong><p>${filter === 'open' ? 'Add a new task when you are ready.' : 'Add a task you want to complete.'}</p></div>`;
      return;
    }
    list.innerHTML = tasks.map((task) => `<article class="item-card task-item ${task.done ? 'is-done' : ''}"><input class="task-check" type="checkbox" aria-label="Mark ${escapeHtml(task.title)} as complete" data-task-toggle="${escapeHtml(task.id)}" ${task.done ? 'checked' : ''}><div class="task-details"><div class="item-top"><div><h4>${escapeHtml(task.title)}</h4><p class="item-meta">${escapeHtml(task.subject)}</p></div><button type="button" class="small-action danger" data-task-delete="${escapeHtml(task.id)}">Delete</button></div><p class="task-footer">📅 ${escapeHtml(formatDate(task.date))} · ⏱️ ${Number(task.minutes)} minutes ${task.done ? '· ✓ Completed' : ''}</p></div></article>`).join('');
  }
  $('#taskDate').value = todayISO(); $('#taskDate').min = todayISO();
  $('#taskForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const title = $('#taskTitle').value.trim(); const subject = $('#taskSubject').value.trim(); const date = $('#taskDate').value; const minutes = Number($('#taskMinutes').value);
    if (!title || !subject || !date || !Number.isFinite(minutes) || minutes < 5 || minutes > 600) return showToast('Enter a task, subject, date, and 5–600 minutes.');
    data.tasks.push({ id: makeId(), title, subject, date, minutes, done: false, createdAt: Date.now() });
    saveData(); renderTasks(); updateStats(); $('#taskForm').reset(); $('#taskDate').value = todayISO(); $('#taskDate').min = todayISO(); $('#taskMinutes').value = 25; showToast('Task added to your study plan.');
  });
  $('#taskFilter').addEventListener('change', renderTasks);
  $('#tasksList').addEventListener('change', (event) => {
    const id = event.target.dataset.taskToggle;
    if (!id) return;
    const task = data.tasks.find((item) => item.id === id);
    if (task) { task.done = event.target.checked; saveData(); renderTasks(); updateStats(); showToast(task.done ? 'Well done! Task completed.' : 'Task moved back to your to-do list.'); }
  });
  $('#tasksList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-task-delete]'); if (!button) return;
    data.tasks = data.tasks.filter((task) => task.id !== button.dataset.taskDelete); saveData(); renderTasks(); updateStats(); showToast('Task removed from your plan.');
  });

  const motivations = [
    ['You do not have to learn everything at once. Just begin with one small step.','Your effort today is building your future skills.'],
    ['Progress is better than perfection. Keep practising.','Every question you try helps you learn something new.'],
    ['A difficult topic is not a sign that you cannot learn it.','Slow down, ask questions, and try one example at a time.'],
    ['Your future self will be glad you started today.','Even ten focused minutes can help you move forward.'],
    ['Mistakes are part of learning, not proof that you failed.','Read the feedback, learn from it, and try again.'],
    ['You are allowed to take a break and start again.','Rest helps you return with a clearer mind.'],
    ['Focus on the next step, not the whole mountain.','Choose one task, work on it, and celebrate finishing it.'],
    ['You can improve a little with regular practice.','Keep your study sessions realistic and consistent.']
  ];
  function newMotivation() {
    let item = motivations[Math.floor(Math.random() * motivations.length)];
    if (motivations.length > 1 && $('#motivationText').textContent === item[0]) item = motivations[(motivations.indexOf(item) + 1) % motivations.length];
    $('#motivationText').textContent = item[0]; $('#motivationSubtext').textContent = item[1];
  }
  $('#newMotivationButton').addEventListener('click', newMotivation);

  let timerMinutes = 25; let timeLeft = timerMinutes * 60; let timerInterval = null; let activeTimerMode = 'study'; let timerEndTimestamp = null;
  const timerDisplay = $('#timerDisplay');
  function drawTimer() {
    const minutes = Math.floor(timeLeft / 60); const seconds = timeLeft % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const elapsedRatio = timerMinutes * 60 > 0 ? (timerMinutes * 60 - timeLeft) / (timerMinutes * 60) : 0;
    $('#timerRing').style.background = `conic-gradient(#ad98ff ${elapsedRatio * 360}deg, rgba(255,255,255,.12) ${elapsedRatio * 360}deg)`;
    $('#timerMode').textContent = activeTimerMode === 'study' ? 'FOCUS TIME' : activeTimerMode === 'break' ? 'BREAK TIME' : 'CUSTOM SESSION';
    $('#timerStatus').textContent = timerInterval ? 'You are doing great' : timeLeft === 0 ? 'Session complete!' : 'Ready when you are';
    $('#timerStartPause').textContent = timerInterval ? 'Pause timer' : timeLeft === 0 ? 'Start again' : 'Start focus';
  }
  function pauseTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null; timerEndTimestamp = null; drawTimer();
  }
  function startTimer() {
    if (timerInterval) return;
    if (timeLeft <= 0) timeLeft = timerMinutes * 60;
    timerEndTimestamp = Date.now() + timeLeft * 1000;
    timerInterval = setInterval(() => {
      timeLeft = Math.max(0, Math.ceil((timerEndTimestamp - Date.now()) / 1000));
      if (timeLeft <= 0) {
        clearInterval(timerInterval); timerInterval = null; timerEndTimestamp = null;
        if (activeTimerMode !== 'break') { data.focusSessions += 1; saveData(); updateStats(); }
        drawTimer(); showToast(activeTimerMode === 'study' ? 'Focus session complete. Great work! Take a short break.' : 'Break complete. Ready for another focus session?');
        try { document.title = 'Session complete! | StudyMate'; } catch (_) {}
        return;
      }
      drawTimer();
    }, 250);
    drawTimer();
  }
  function setTimer(minutes, mode = 'custom') {
    pauseTimer(); timerMinutes = minutes; timeLeft = minutes * 60; activeTimerMode = mode; drawTimer();
    $$('.preset[data-minutes]').forEach((button) => button.classList.toggle('active', Number(button.dataset.minutes) === minutes && button.dataset.mode === mode));
    document.title = 'StudyMate | Your Student Companion';
  }
  $('#timerStartPause').addEventListener('click', () => timerInterval ? pauseTimer() : startTimer());
  $('#timerReset').addEventListener('click', () => { pauseTimer(); timeLeft = timerMinutes * 60; drawTimer(); });
  $$('.preset[data-minutes]').forEach((button) => button.addEventListener('click', () => setTimer(Number(button.dataset.minutes), button.dataset.mode)));
  $('#applyCustomTimer').addEventListener('click', () => {
    const minutes = Number($('#customTimerMinutes').value);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) return showToast('Choose a whole number between 1 and 180 minutes.');
    setTimer(minutes, 'custom'); showToast(`Timer set for ${minutes} minute${minutes === 1 ? '' : 's'}.`);
  });

  const offlineReplies = [
    { matches: /\b(hello|hi|hey)\b/i, answer: 'Hello! 😊 What subject are you working on today? Share a question or tell me what feels confusing, and we can break it into smaller steps.' },
    { matches: /motivat|unmotivated|lazy|tired|give up|discourag/i, answer: 'It is normal to feel stuck sometimes. Try this: choose one small task, set a 10-minute timer, and focus only on that task. You do not need to finish everything now. A little progress still counts. 🌱' },
    { matches: /study plan|plan my|schedule|timetable|organis/i, answer: 'Here is a simple study plan:\n1. Pick your 2 most important subjects.\n2. Study the first for 25 minutes.\n3. Take a 5-minute break.\n4. Study the second for 25 minutes.\n5. Spend 10 minutes reviewing from memory.\nAdd each task in the Study Planner so you can check it off.' },
    { matches: /exam|revision|revise|prepare for/i, answer: 'For exam preparation, try this: (1) list the topics, (2) start with the hardest one, (3) explain each idea in your own words, (4) answer practice questions without looking at the notes, and (5) review mistakes. Take short breaks and get enough rest.' },
    { matches: /note|summari|remember|memor/i, answer: 'To make useful notes, write the main idea in your own words, add key terms and one example, then finish with 2–3 questions to test yourself. To remember it, cover the notes and explain the idea from memory.' },
    { matches: /python|program|coding|code|loop|variable|function/i, answer: 'I can help with beginner programming. Tell me what the code should do and include the code or exact error message if you have one. We can look at it step by step. Remember: in Python, indentation matters, and print() displays output.' },
    { matches: /math|equation|factor|algebra|fraction|calculate|solve/i, answer: 'Let’s solve it step by step. Please send the full maths question (including any numbers, equation, or diagram details). I’ll show the working and explain why each step is used.' },
    { matches: /biology|cell|photosynthesis|human body|organ/i, answer: 'For Biology, start with three questions: What is it? Where is it found? What does it do? Then draw a simple labelled diagram or give an example. Send the exact topic or question and I’ll help you make it easier to understand.' },
    { matches: /english|grammar|paragraph|verb|adjective|phrasal/i, answer: 'For English, share the sentence or paragraph and tell me what you need: meaning, grammar, vocabulary, or an example. I can explain it using simple English and show a few examples.' },
    { matches: /focus|timer|distract|concentrat/i, answer: 'Try a small focus session: put away distractions, choose one clear task, work for 25 minutes (or start with 10), and then take a 5-minute break. Write down unrelated thoughts to return to later. You can run the Focus Timer on this page.' },
    { matches: /quiz|test me|practice question/i, answer: 'You can practise using the Quizzes section above. Choose a subject and start a quiz, or create your own multiple-choice questions. After each answer, read the explanation and revisit anything you missed.' }
  ];
  function makeOfflineReply(message) {
    const match = offlineReplies.find((entry) => entry.matches.test(message));
    if (match) return match.answer;
    return 'Let’s work through that together. 😊\n\nPlease tell me the subject and write the complete question (or paste your code and error). I’ll help you split it into smaller steps.\n\nI’m currently using the built-in StudyMate helper. For open-ended questions across many subjects, start the optional server and configure an AI API key as described in README.md.';
  }
  function addChatMessage(message, who) {
    const wrapper = document.createElement('div'); wrapper.className = `chat-message ${who === 'user' ? 'user-message' : 'assistant-message'}`;
    const avatar = document.createElement('div'); avatar.className = 'message-avatar'; avatar.textContent = who === 'user' ? 'You' : '✦';
    const bubble = document.createElement('div'); bubble.className = 'message-bubble';
    const paragraph = document.createElement('p'); paragraph.textContent = message; bubble.append(paragraph); wrapper.append(avatar, bubble); $('#chatMessages').append(wrapper); $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight; return wrapper;
  }
  async function getAssistantAnswer(message) {
    const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
    if (!response.ok) throw new Error(`AI service not ready (${response.status})`);
    const payload = await response.json();
    if (!payload || typeof payload.answer !== 'string' || !payload.answer.trim()) throw new Error('Empty AI response');
    return payload.answer.trim();
  }
  async function sendChatMessage(message) {
    if (!message.trim()) return;
    addChatMessage(message.trim(), 'user');
    const sendButton = $('#sendChatButton'); sendButton.disabled = true; sendButton.textContent = 'Thinking…';
    const loading = addChatMessage('Let me think through that…', 'assistant'); loading.classList.add('loading-message');
    try {
      const answer = await getAssistantAnswer(message.trim());
      loading.querySelector('.message-bubble p').textContent = answer;
      $('#assistantModeBadge').textContent = 'AI connected';
      $('#assistantDisclaimer').textContent = 'Real AI responses are coming from the server you configured. Notes and tasks remain stored locally in this browser.';
    } catch (error) {
      loading.querySelector('.message-bubble p').textContent = makeOfflineReply(message.trim());
      $('#assistantModeBadge').textContent = 'Study helper';
    } finally {
      sendButton.disabled = false; sendButton.textContent = 'Send ↗'; $('#chatInput').focus(); $('#chatMessages').scrollTop = $('#chatMessages').scrollHeight;
    }
  }
  $('#chatForm').addEventListener('submit', (event) => {
    event.preventDefault(); const input = $('#chatInput'); const message = input.value.trim(); if (!message) return;
    input.value = ''; sendChatMessage(message);
  });
  $('#chatInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); $('#chatForm').requestSubmit(); }
  });
  $$('.prompt-chip').forEach((button) => button.addEventListener('click', () => { $('#chatInput').value = button.dataset.prompt; $('#chatForm').requestSubmit(); }));

  const menuToggle = $('#menuToggle');
  menuToggle.addEventListener('click', () => {
    const isOpen = $('#mainNav').classList.toggle('open'); menuToggle.setAttribute('aria-expanded', String(isOpen)); menuToggle.textContent = isOpen ? '×' : '☰';
  });
  $$('#mainNav a').forEach((link) => link.addEventListener('click', () => { $('#mainNav').classList.remove('open'); menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.textContent = '☰'; }));

  // Restore subject filters for custom questions saved in an earlier visit.
  const quizSubjectSelect = $('#quizSubject');
  const existingSubjects = new Set([...quizSubjectSelect.options].map((option) => option.value.toLowerCase()));
  [...new Set(data.customQuestions.map((question) => question.subject.trim()).filter(Boolean))].forEach((subject) => {
    if (!existingSubjects.has(subject.toLowerCase())) {
      const option = document.createElement('option'); option.value = subject; option.textContent = subject; quizSubjectSelect.append(option);
      existingSubjects.add(subject.toLowerCase());
    }
  });

  $('#todayLabel').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  renderNotes(); renderTasks(); updateStats(); drawTimer();
})();
