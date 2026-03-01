document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Questions Data ---
    // Placeholder questions until the PDF questions are provided/uploaded.
    const questions = typeof finalRevisionQuestions !== 'undefined' ? finalRevisionQuestions : [
        {
            question: "No questions loaded. Please ensure questions.js is loaded correctly.",
            options: ["A", "B", "C", "D"],
            answer: "A"
        }
    ];

    // --- 2. State Management ---
    const STATE_KEY = 'smart_revision_app_state';
    let state = {
        currentIndex: 0,
        userAnswers: {},     // Map storing user answers { questionIndex: "selected or typed answer" }
        isSubmitted: false
    };

    // Load saved progress from localStorage
    function loadState() {
        const saved = localStorage.getItem(STATE_KEY);
        if (saved) {
            try {
                state = JSON.parse(saved);
            } catch (err) {
                console.error("Failed to parse saved progress from localStorage:", err);
            }
        }
    }

    // Save progress to localStorage
    function saveState() {
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
    }

    // --- 3. DOM Elements Setup ---
    const dom = {
        progressBar: document.getElementById('progress-bar'),
        currentScore: document.getElementById('current-score'),
        questionNumber: document.getElementById('question-number'),
        questionText: document.getElementById('question-text'),
        optionsContainer: document.getElementById('options-container'),
        fillInBlankContainer: document.getElementById('fill-in-blank-container'),
        blankInput: document.getElementById('blank-input'),

        btnPrev: document.getElementById('btn-prev'),
        btnNext: document.getElementById('btn-next'),
        btnSkip: document.getElementById('btn-skip'),
        btnReset: document.getElementById('btn-reset'),
        btnSubmit: document.getElementById('btn-submit'),

        quizContainer: document.getElementById('quiz-container'),
        resultContainer: document.getElementById('result-container'),

        resTotal: document.getElementById('res-total'),
        resAttempted: document.getElementById('res-attempted'),
        answersReviewList: document.getElementById('answers-review-list'),
        btnRestart: document.getElementById('btn-restart')
    };

    // --- 4. Core Logic Functions ---

    // Initialize the application
    function init() {
        if (!questions || questions.length === 0) {
            dom.questionText.textContent = "No questions loaded.";
            return;
        }

        loadState();

        if (state.isSubmitted) {
            showResults();
        } else {
            renderQuestion();
            updateScoreDisplay(); // Initialize running score
        }

        attachEventListeners();
    }

    // Render the current question to the UI
    function renderQuestion() {
        const qIndex = state.currentIndex;
        const qData = questions[qIndex];

        // Header & Progress
        dom.questionNumber.textContent = `Question ${qIndex + 1} of ${questions.length}`;
        const progressPercent = ((qIndex) / questions.length) * 100;
        dom.progressBar.style.width = `${progressPercent}%`;

        // Text Content
        dom.questionText.textContent = qData.question;

        // Reset interactive areas
        dom.optionsContainer.innerHTML = '';
        dom.blankInput.value = '';

        const currentAnswer = state.userAnswers[qIndex] || "";

        // Check format (MCQ vs Fill-in-the-blank)
        if (qData.options && qData.options.length > 0) {
            // Setup MCQ UI
            dom.optionsContainer.style.display = 'flex';
            dom.fillInBlankContainer.style.display = 'none';

            const prefixes = ['A', 'B', 'C', 'D', 'E', 'F'];

            qData.options.forEach((opt, index) => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';

                // Highlight if previously selected
                if (currentAnswer === opt) {
                    btn.classList.add('selected');
                }

                const prefixChar = prefixes[index] || (index + 1);

                btn.innerHTML = `
                    <span class="option-prefix">${prefixChar}</span>
                    <span class="option-text">${escapeHTML(opt)}</span>
                `;

                // Add click listener
                btn.onclick = () => selectOption(opt);
                dom.optionsContainer.appendChild(btn);
            });
        } else {
            // Setup Fill-in-the-blank UI
            dom.optionsContainer.style.display = 'none';
            dom.fillInBlankContainer.style.display = 'block';
            if (currentAnswer) {
                dom.blankInput.value = currentAnswer;
            }
        }

        // Update nav buttons states
        updateNavigationButtons();
    }

    // Handles user making an MCQ selection
    function selectOption(optionText) {
        state.userAnswers[state.currentIndex] = optionText;
        saveState();
        renderQuestion();       // Re-render UI to apply 'selected' class
        updateScoreDisplay();   // Reflect score change live

        // Optional: auto-advance
        // setTimeout(goNext, 300);
    }

    // Handles fluid input binding for fill-in-the-blank
    function handleBlankInputChange(e) {
        const val = e.target.value.trim();
        if (val) {
            state.userAnswers[state.currentIndex] = val;
        } else {
            delete state.userAnswers[state.currentIndex];
        }
        saveState();
        updateScoreDisplay();
    }

    // Safely saves any text input data when navigating away from the current question
    function saveBlankInputIfNeeded() {
        const qData = questions[state.currentIndex];
        if (!qData.options || qData.options.length === 0) {
            handleBlankInputChange({ target: dom.blankInput });
        }
    }

    // Iterate efficiently to find total correct based on given answers
    // Note: Grading logic removed per user request for manual review
    // function calculateScore() { ... }

    // Synchronize score display banner
    function updateScoreDisplay() {
        // Updated to simply show "Attempted" count while in progress
        const attempted = Object.keys(state.userAnswers).length;
        dom.currentScore.textContent = `${attempted} Attempted`;
    }

    // Handle button locking on edges
    function updateNavigationButtons() {
        dom.btnPrev.disabled = state.currentIndex === 0;

        if (state.currentIndex === questions.length - 1) {
            dom.btnNext.disabled = true;
            dom.btnSkip.disabled = true;
        } else {
            dom.btnNext.disabled = false;
            dom.btnSkip.disabled = false;
        }
    }

    // --- 5. Navigation Handlers ---
    function goPrev() {
        if (state.currentIndex > 0) {
            saveBlankInputIfNeeded();
            state.currentIndex--;
            saveState();
            renderQuestion();
        }
    }

    function goNext() {
        if (state.currentIndex < questions.length - 1) {
            saveBlankInputIfNeeded();
            state.currentIndex++;
            saveState();
            renderQuestion();
        }
    }

    function goSkip() {
        // Skip behaves identically to next but conveys intent to skip
        goNext();
    }

    // Completely wipe application state and clear storage
    function resetAll() {
        if (confirm("Are you sure you want to completely reset? This clears all your answers and progress.")) {
            localStorage.removeItem(STATE_KEY);
            state = {
                currentIndex: 0,
                userAnswers: {},
                isSubmitted: false
            };
            dom.quizContainer.style.display = 'block';
            dom.resultContainer.style.display = 'none';
            renderQuestion();
            updateScoreDisplay();
        }
    }

    // Lock in answers and display final score
    function submitExam() {
        saveBlankInputIfNeeded();
        if (confirm("Are you ready to submit your exam? You cannot change your answers after submission!")) {
            state.isSubmitted = true;
            saveState();
            showResults();
        }
    }

    // Process and reveal the results card
    function showResults() {
        dom.quizContainer.style.display = 'none';
        dom.resultContainer.style.display = 'block';
        dom.progressBar.style.width = '100%';
        dom.progressBar.style.background = 'var(--success)';

        const total = questions.length;
        const attempted = Object.keys(state.userAnswers).length;

        dom.resTotal.textContent = total;
        dom.resAttempted.textContent = attempted;

        // Render detailed answer review list
        dom.answersReviewList.innerHTML = '';

        if (attempted === 0) {
            dom.answersReviewList.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-muted);">No questions were attempted.</div>';
            return;
        }

        // Generate the manual grading list 
        // Iterate only over questions the user actually answered or iterate all? 
        // We will show all questions so they can see what they missed.

        const reviewFragment = document.createDocumentFragment();

        for (let i = 0; i < questions.length; i++) {
            const qData = questions[i];
            const userAnswer = state.userAnswers[i] || "No Answer Provided";

            const itemDiv = document.createElement('div');
            itemDiv.className = 'review-item';

            // Add some inline styles here or rely on the CSS update
            itemDiv.style.padding = '1rem';
            itemDiv.style.marginBottom = '1rem';
            itemDiv.style.border = '1px solid var(--border)';
            itemDiv.style.borderRadius = 'var(--radius-md)';
            itemDiv.style.backgroundColor = 'var(--background)';

            itemDiv.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 0.5rem; color: var(--secondary);">
                    Question ${i + 1}
                </div>
                <div style="margin-bottom: 0.75rem; color: var(--text-main);">
                    ${escapeHTML(qData.question)}
                </div>
                <div style="padding: 0.75rem; background: var(--card-bg); border-left: 4px solid var(--primary); border-radius: 4px;">
                    <span style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase;">Your Answer:</span><br>
                    <strong>${escapeHTML(userAnswer)}</strong>
                </div>
            `;

            reviewFragment.appendChild(itemDiv);
        }

        dom.answersReviewList.appendChild(reviewFragment);
    }

    // --- 6. Event Listeners ---
    function attachEventListeners() {
        dom.btnPrev.addEventListener('click', goPrev);
        dom.btnNext.addEventListener('click', goNext);
        dom.btnSkip.addEventListener('click', goSkip);
        dom.btnReset.addEventListener('click', resetAll);
        dom.btnSubmit.addEventListener('click', submitExam);
        dom.btnRestart.addEventListener('click', resetAll);

        // Handle return/enter key on fill-in-the-blank input
        dom.blankInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                goNext();
            }
        });

        // Bind live text input changes
        dom.blankInput.addEventListener('input', handleBlankInputChange);
    }

    // --- 7. Utility Functions ---
    // Minimal DOM sanitizer against simple injection if user provided nasty content in state
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Boot App
    init();
});
