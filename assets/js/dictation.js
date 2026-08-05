/* ============================================================
   Learn with Ms.Thúy — dictation.js
   Handles: loading a lesson's JSON, rendering blanked transcript,
   sticky audio player controls, hints, checking answers, scoring,
   attempt limits, and the final result card.
   ============================================================ */

(function () {
  "use strict";

  // ---------- Config ----------
  const MAX_ATTEMPTS = 3;
  const HINT_PENALTY = 0.5; // deducted from final score per hint press

  // ---------- State ----------
  let lessonData = null;
  let sentenceStates = []; // { hintUsed: bool, checked: bool, correct: bool }
  let attemptCount = 0;
  let totalHintsUsed = 0;

  // ---------- DOM references ----------
  const titleEl = document.getElementById("lesson-title");
  const metaEl = document.getElementById("lesson-meta");
  const pageTitleEl = document.getElementById("page-title");
  const listEl = document.getElementById("sentence-list");
  const checkBtn = document.getElementById("check-btn");
  const resetBtn = document.getElementById("reset-btn");
  const limitBanner = document.getElementById("limit-banner");

  const progressTextEl = document.getElementById("progress-text");
  const progressPercentEl = document.getElementById("progress-percent");
  const progressFillEl = document.getElementById("progress-bar-fill");

  const finalCard = document.getElementById("final-card");
  const finalScoreEl = document.getElementById("final-score");
  const statCorrectEl = document.getElementById("stat-correct");
  const statWrongEl = document.getElementById("stat-wrong");
  const statHintsEl = document.getElementById("stat-hints");
  const statAttemptsEl = document.getElementById("stat-attempts");

  // Audio elements
  const audioEl = document.getElementById("lesson-audio");
  const playBtn = document.getElementById("play-btn");
  const rewindBtn = document.getElementById("rewind-btn");
  const forwardBtn = document.getElementById("forward-btn");
  const progressTrack = document.getElementById("audio-progress-track");
  const progressFillAudio = document.getElementById("audio-progress-fill");
  const timeEl = document.getElementById("audio-time");
  const speedSelect = document.getElementById("speed-select");

  document.addEventListener("DOMContentLoaded", init);

  // ============================================================
  // Init
  // ============================================================
  async function init() {
    const params = new URLSearchParams(window.location.search);
    const lessonId = params.get("id");

    if (!lessonId) {
      titleEl.textContent = "Lesson not found";
      return;
    }

    try {
      const res = await fetch(`data/${lessonId}.json`);
      if (!res.ok) throw new Error("Lesson not found");
      lessonData = await res.json();
    } catch (err) {
      titleEl.textContent = "Lesson not found";
      console.error(err);
      return;
    }

    renderLessonHeader();
    setupAudio(lessonId);
    setupSentences();
    updateProgress();

    checkBtn.addEventListener("click", checkAnswers);
    resetBtn.addEventListener("click", resetLesson);
  }

  // ============================================================
  // Header
  // ============================================================
  function renderLessonHeader() {
    titleEl.textContent = lessonData.title;
    pageTitleEl.textContent = `${lessonData.title} | Learn with Ms.Thúy`;
    metaEl.innerHTML = `<span class="badge">${escapeHtml(lessonData.level)}</span>`;
  }

  // ============================================================
  // Audio player
  // ============================================================
  function setupAudio(lessonId) {
    const audioFile = lessonData.audio || `${lessonId}.mp3`;
    audioEl.src = `assets/audio/${audioFile}`;

    playBtn.addEventListener("click", () => {
      if (audioEl.paused) {
        audioEl.play().catch(() => {
          /* audio file may be missing in this demo build */
        });
      } else {
        audioEl.pause();
      }
    });

    audioEl.addEventListener("play", () => (playBtn.textContent = "⏸"));
    audioEl.addEventListener("pause", () => (playBtn.textContent = "▶"));

    rewindBtn.addEventListener("click", () => {
      audioEl.currentTime = Math.max(0, audioEl.currentTime - 10);
    });
    forwardBtn.addEventListener("click", () => {
      audioEl.currentTime = Math.min(audioEl.duration || 0, audioEl.currentTime + 10);
    });

    speedSelect.addEventListener("change", () => {
      audioEl.playbackRate = Number(speedSelect.value);
    });

    audioEl.addEventListener("timeupdate", updateAudioProgress);
    audioEl.addEventListener("loadedmetadata", updateAudioProgress);

    progressTrack.addEventListener("click", (e) => {
      if (!audioEl.duration) return;
      const rect = progressTrack.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      audioEl.currentTime = ratio * audioEl.duration;
    });

    // Keyboard support for the seek bar
    progressTrack.addEventListener("keydown", (e) => {
      if (!audioEl.duration) return;
      if (e.key === "ArrowRight") audioEl.currentTime = Math.min(audioEl.duration, audioEl.currentTime + 5);
      if (e.key === "ArrowLeft") audioEl.currentTime = Math.max(0, audioEl.currentTime - 5);
    });
  }

  function updateAudioProgress() {
    const duration = audioEl.duration || 0;
    const current = audioEl.currentTime || 0;
    const percent = duration ? (current / duration) * 100 : 0;

    progressFillAudio.style.width = `${percent}%`;
    progressTrack.setAttribute("aria-valuenow", Math.round(percent));
    timeEl.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
  }

  function formatTime(seconds) {
    if (!isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  // ============================================================
  // Sentence rendering
  // ============================================================
  function setupSentences() {
    sentenceStates = lessonData.sentences.map(() => ({
      hintUsed: false,
      checked: false,
      correct: false,
    }));

    listEl.innerHTML = lessonData.sentences.map(sentenceTemplate).join("");

    lessonData.sentences.forEach((sentence, idx) => {
      const input = document.getElementById(`input-${idx}`);
      const blankLine = document.getElementById(`blank-${idx}`);
      const hintBtn = document.getElementById(`hint-${idx}`);

      // Real-time progress + live blank preview as the user types is not
      // required by spec, but progress updates as fields are filled.
      input.addEventListener("input", updateProgress);

      hintBtn.addEventListener("click", () => {
        if (sentenceStates[idx].hintUsed) return; // one hint credit per sentence view, but user can still see it
        sentenceStates[idx].hintUsed = true;
        totalHintsUsed += 1;
        blankLine.textContent = hintify(sentence);
        hintBtn.disabled = true;
        hintBtn.textContent = "💡 Hint used";
      });
    });
  }

  function sentenceTemplate(sentence, idx) {
    return `
      <article class="sentence-block glass" id="sentence-block-${idx}">
        <div class="sentence-top">
          <span class="sentence-number">Sentence ${idx + 1}</span>
          <span class="sentence-status" id="status-${idx}"></span>
        </div>
        <p class="blank-line" id="blank-${idx}">${escapeHtml(blankify(sentence))}</p>
        <textarea
          class="sentence-input"
          id="input-${idx}"
          rows="1"
          aria-label="Type sentence ${idx + 1}"
          placeholder="Type what you hear..."
        ></textarea>
        <p class="sentence-answer-reveal" id="reveal-${idx}" hidden></p>
        <div class="sentence-actions">
          <button class="hint-btn" id="hint-${idx}">💡 Hint</button>
        </div>
      </article>
    `;
  }

  /**
   * Turns a sentence into underscores.
   * Rule: letters/digits -> "_", punctuation and spaces stay unchanged.
   */
  function blankify(sentence) {
    return sentence.replace(/[A-Za-z0-9]/g, "_");
  }

  /**
   * Reveals the first alphabetic character of every word,
   * underscoring the rest. Punctuation and spaces stay unchanged.
   */
  function hintify(sentence) {
    return sentence
      .split(" ")
      .map((word) => {
        let revealed = false;
        let out = "";
        for (const ch of word) {
          if (/[A-Za-z0-9]/.test(ch) && !revealed) {
            out += ch;
            revealed = true;
          } else if (/[A-Za-z0-9]/.test(ch)) {
            out += "_";
          } else {
            out += ch;
          }
        }
        return out;
      })
      .join(" ");
  }

  // ============================================================
  // Progress bar
  // ============================================================
  function updateProgress() {
    const total = lessonData.sentences.length;
    const completed = lessonData.sentences.filter((_, idx) => {
      const input = document.getElementById(`input-${idx}`);
      return input && input.value.trim().length > 0;
    }).length;

    const percent = total ? Math.round((completed / total) * 100) : 0;
    progressTextEl.textContent = `Progress: ${completed} / ${total} completed`;
    progressPercentEl.textContent = `${percent}%`;
    progressFillEl.style.width = `${percent}%`;
  }

  // ============================================================
  // Check answers
  // ============================================================
  function checkAnswers() {
    attemptCount += 1;

    let correctCount = 0;

    lessonData.sentences.forEach((sentence, idx) => {
      const input = document.getElementById(`input-${idx}`);
      const statusEl = document.getElementById(`status-${idx}`);
      const blockEl = document.getElementById(`sentence-block-${idx}`);
      const revealEl = document.getElementById(`reveal-${idx}`);

      const isCorrect = normalize(input.value) === normalize(sentence);
      sentenceStates[idx].checked = true;
      sentenceStates[idx].correct = isCorrect;

      blockEl.classList.remove("state-correct", "state-wrong");
      input.classList.remove("correct-input", "wrong-input");

      if (isCorrect) {
        correctCount += 1;
        statusEl.textContent = "✔";
        statusEl.className = "sentence-status correct";
        blockEl.classList.add("state-correct");
        input.classList.add("correct-input");
      } else {
        statusEl.textContent = "✖";
        statusEl.className = "sentence-status wrong";
        blockEl.classList.add("state-wrong");
        input.classList.add("wrong-input");
      }
    });

    // Reveal full transcript after reaching the max attempts
    if (attemptCount >= MAX_ATTEMPTS) {
      limitBanner.hidden = false;
      lessonData.sentences.forEach((sentence, idx) => {
        const revealEl = document.getElementById(`reveal-${idx}`);
        revealEl.hidden = false;
        revealEl.textContent = `Answer: ${sentence}`;
        document.getElementById(`input-${idx}`).setAttribute("readonly", "true");
      });
      checkBtn.disabled = true;
    }

    showFinalResult(correctCount);
    updateProgress();
  }

  function normalize(text) {
    return text.trim().toLowerCase().replace(/\s+/g, " ");
  }

  // ============================================================
  // Final result card
  // ============================================================
  function showFinalResult(correctCount) {
    const total = lessonData.sentences.length;
    const wrongCount = total - correctCount;
    const rawScore = (correctCount / total) * 10;
    const finalScore = Math.max(0, rawScore - totalHintsUsed * HINT_PENALTY);

    finalScoreEl.textContent = `${finalScore.toFixed(1)}/10`;
    statCorrectEl.textContent = String(correctCount);
    statWrongEl.textContent = String(wrongCount);
    statHintsEl.textContent = String(totalHintsUsed);
    statAttemptsEl.textContent = String(attemptCount);

    finalCard.hidden = false;
    finalCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ============================================================
  // Reset lesson
  // ============================================================
  function resetLesson() {
    attemptCount = 0;
    totalHintsUsed = 0;
    limitBanner.hidden = true;
    finalCard.hidden = true;
    checkBtn.disabled = false;
    setupSentences();
    updateProgress();
  }

  // ============================================================
  // Helpers
  // ============================================================
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
