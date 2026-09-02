/**
 * 自分軸タイプ診断 — メインロジック
 * 画面遷移・スコア集計・結果判定・DOM操作
 */

const SEMINAR_CONTENTS = {
  a: {
    title: "コーチとして活動する第一歩を一緒に踏み出しましょう",
    points: [
      "アドラー心理学ベースのコーチングとは何かを体験できる",
      "プロコーチ・講師になるまでのロードマップが見える",
      "「人を支える仕事」を具体的にイメージできるようになる",
      "ライフデザインコーチ養成プログラムの内容が詳しくわかる"
    ],
    tags: ["プロコーチ・講師志望の方向け", "ブルーミング・コーチングスクールの案内あり"]
  },
  b: {
    title: "現場で使える対話力を今日から変えていきましょう",
    points: [
      "部下・メンバーの本音を引き出す「問いかけ」の技術がわかる",
      "1on1・面談・コンサルの質が根本から変わるアプローチを体験",
      "アドラー心理学ベースの「相手の主体性を引き出す関わり方」を学べる",
      "ブルーミング・コーチングスクールの案内あり"
    ],
    tags: ["管理職・コンサル・支援職の方向け", "ブルーミング・コーチングスクールの案内あり"]
  },
  c: {
    title: "あなただけのライフデザインを一緒に描きましょう",
    points: [
      "自分の価値観・強みを言語化するプロセスを体験できる",
      "「本当にやりたいこと」の見つけ方が具体的にわかる",
      "自分の軸が見えると、副業・転職・起業の判断が変わる",
      "コーチングを受けながら学ぶライフデザインコーチ養成プログラムも紹介"
    ],
    tags: ["自分の生き方・働き方を整えたい方向け", "ライフデザインコーチ養成プログラムの案内あり"]
  }
};

const state = {
  currentQuestion: 0,
  scores: { a: 0, b: 0, c: 0 },
  answers: []
};

const screens = {
  top:      document.getElementById("screen-top"),
  question: document.getElementById("screen-question"),
  result:   document.getElementById("screen-result")
};

const els = {
  btnStart:          document.getElementById("btn-start"),
  btnRetry:          document.getElementById("btn-retry"),
  btnSeminar:        document.getElementById("btn-seminar"),
  qCurrent:          document.getElementById("q-current"),
  qTotal:            document.getElementById("q-total"),
  qNum:              document.getElementById("q-num"),
  questionText:      document.getElementById("question-text"),
  choicesArea:       document.getElementById("choices-area"),
  progressBar:       document.getElementById("progress-bar"),
  progressFill:      document.getElementById("progress-fill"),
  resultEmoji:       document.getElementById("result-emoji"),
  resultTypeBadge:   document.getElementById("result-type-badge"),
  resultTypeName:    document.getElementById("result-type-name"),
  resultFeature:     document.getElementById("result-feature-text"),
  resultReason:      document.getElementById("result-reason-text"),
  resultNeed:        document.getElementById("result-need-text"),
  resultPush:        document.getElementById("result-push-text"),
  seminarLead:       document.getElementById("seminar-lead-text"),
  seminarCardTitle:  document.getElementById("seminar-card-title"),
  seminarCardPoints: document.getElementById("seminar-card-points"),
  seminarCourseTags: document.getElementById("seminar-course-tags")
};

const FOCUS_TARGET_ID = {
  top: "top-title",
  question: "question-text",
  result: "result-type-name"
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active", "visible"));
  const target = screens[name];
  target.classList.add("active");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => target.classList.add("visible"));
  });
  window.scrollTo({ top: 0, behavior: "smooth" });

  // スクリーン遷移のたびに見出しへフォーカスを移し、スクリーンリーダーにも変化を伝える
  const focusEl = document.getElementById(FOCUS_TARGET_ID[name]);
  if (focusEl) {
    setTimeout(() => focusEl.focus({ preventScroll: true }), 50);
  }
}

function nl2br(text) {
  return text.replace(/\n/g, "<br>");
}

function renderQuestion(index) {
  const q = QUESTIONS[index];
  const total = QUESTIONS.length;
  els.qCurrent.textContent = index + 1;
  els.qTotal.textContent   = total;
  els.qNum.textContent     = index + 1;
  els.progressFill.style.width = ((index / total) * 100) + "%";
  els.progressBar.setAttribute("aria-valuenow", index);
  els.progressBar.setAttribute("aria-valuemax", total);
  els.questionText.innerHTML = nl2br(q.text);

  const card = document.getElementById("question-card");
  card.classList.remove("fade-in");
  void card.offsetWidth;
  card.classList.add("fade-in");

  els.choicesArea.innerHTML = "";
  q.choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.className = "choice-btn fade-in fade-in-delay-" + (i + 1);
    btn.setAttribute("aria-label", choice.text);
    btn.innerHTML = `
      <span class="choice-icon" aria-hidden="true">${["a","b","c"][i]}<` + `/span>
      <span class="choice-text">${choice.text}<` + `/span>
    `;
    btn.addEventListener("click", () => handleAnswer(i));
    els.choicesArea.appendChild(btn);
  });
}

function handleAnswer(choiceIndex) {
  const q = QUESTIONS[state.currentQuestion];
  const chosen = q.choices[choiceIndex];

  const btns = els.choicesArea.querySelectorAll(".choice-btn");
  btns.forEach(b => b.classList.remove("selected", "tapping"));
  btns[choiceIndex].classList.add("selected", "tapping");

  state.scores.a += chosen.score[0];
  state.scores.b += chosen.score[1];
  state.scores.c += chosen.score[2];
  state.answers.push({ questionId: q.id, choiceIndex });

  setTimeout(() => {
    state.currentQuestion++;
    if (state.currentQuestion < QUESTIONS.length) {
      renderQuestion(state.currentQuestion);
    } else {
      showResult();
    }
  }, 380);
}

function judgeType() {
  const { a, b, c } = state.scores;
  let type = "a";
  if (b > a && b >= c) type = "b";
  else if (c > a && c > b) type = "c";
  return type;
}

function renderSeminarCard(typeKey) {
  const content = SEMINAR_CONTENTS[typeKey];
  els.seminarCardTitle.innerHTML = nl2br(content.title);
  els.seminarCardPoints.innerHTML = content.points.map(p => `<li>${p}<` + `/li>`).join("");
  els.seminarCourseTags.innerHTML = content.tags.map(t => `<span class="course-tag">${t}<` + `/span>`).join("");
}

function showResult() {
  const typeKey = judgeType();
  const data    = RESULT_TYPES[typeKey];

  els.resultEmoji.textContent   = data.emoji;
  els.resultTypeBadge.textContent = data.badgeLabel;
  els.resultTypeBadge.className   = `result-type-badge type-${typeKey}`;
  els.resultTypeName.innerHTML    = nl2br(data.typeName);
  els.resultFeature.innerHTML = nl2br(data.feature);
  els.resultReason.innerHTML  = nl2br(data.reason);
  els.resultNeed.innerHTML    = nl2br(data.need);
  els.resultPush.innerHTML    = nl2br(data.push);
  els.seminarLead.innerHTML   = nl2br(data.seminarLead);

  renderSeminarCard(typeKey);

  // セミナーボタン（重複登録防止：クローンして付け替え）
  const oldBtn = els.btnSeminar;
  const newBtn = oldBtn.cloneNode(true);
  oldBtn.parentNode.replaceChild(newBtn, oldBtn);
  els.btnSeminar = newBtn;
  els.btnSeminar.addEventListener("click", () => {
    window.open(SEMINAR_INFO.url, "_blank", "noopener,noreferrer");
  });

  showScreen("result");

  setTimeout(() => {
    const sections = document.querySelectorAll(
      ".result-header, .result-section, .result-push-box, .seminar-section, .btn-retry"
    );
    sections.forEach((el, i) => {
      el.style.opacity    = "0";
      el.style.transform  = "translateY(16px)";
      el.style.transition = `opacity 0.45s ease ${i * 0.1}s, transform 0.45s ease ${i * 0.1}s`;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.opacity   = "1";
          el.style.transform = "translateY(0)";
        });
      });
    });
  }, 150);
}

function resetDiagnosis() {
  state.currentQuestion = 0;
  state.scores = { a: 0, b: 0, c: 0 };
  state.answers = [];
  document.querySelectorAll(
    ".result-header, .result-section, .result-push-box, .seminar-section, .btn-retry"
  ).forEach(el => {
    el.style.opacity = el.style.transform = el.style.transition = "";
  });
}

function init() {
  els.qTotal.textContent = QUESTIONS.length;
  els.btnStart.addEventListener("click", () => {
    renderQuestion(0);
    showScreen("question");
  });
  els.btnRetry.addEventListener("click", () => {
    resetDiagnosis();
    showScreen("top");
  });
  showScreen("top");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
