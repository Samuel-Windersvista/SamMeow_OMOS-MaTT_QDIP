/* ==========================================================================
 * quiz.js -- 课程测验组件（原生 JS，零依赖，file:// 直接可用）
 * --------------------------------------------------------------------------
 * 【数据格式】在页面中定义一个全局数组，每个元素是一道单选题：
 *
 *   window.QUIZ_DATA = [
 *     {
 *       question:     "题干文字（必填）",
 *       options:      ["选项一", "选项二", "选项三"],  // 至少 2 项
 *       correctIndex: 1,                              // 正确选项下标，从 0 开始
 *       explanation:  "作答后显示的解析文字（可选，建议填写）"
 *     }
 *   ];
 *
 * 【用法一：自动挂载（推荐）】
 *   <div class="quiz" data-quiz="QUIZ_DATA"></div>
 *   data-quiz 的值为全局数组的变量名；省略时默认读取 window.QUIZ_DATA。
 *   自动挂载在 DOMContentLoaded 时执行，每个 .quiz 容器渲染一次。
 *
 * 【用法二：手动挂载】
 *   Quiz.render(document.querySelector("#myQuiz"), myQuestionArray);
 *
 * 【行为说明】
 *   - 点击选项立即判定：正确标绿 [OK]，错误标橙 [!!] 并同时亮出正确答案；
 *   - 同一题作答后锁定，未选选项淡出，解析文字就地显示；
 *   - 全部作答后显示成绩汇总（题数 / 答对数 / 正确率），可一键重答；
 *   - 键盘可达：Tab 聚焦选项，上下方向键在选项间移动，数字键 1-9 直接选择；
 *   - 作答前所有选项外观完全一致，正确答案不进入 DOM，无泄漏风险。
 * ========================================================================== */
(function () {
  "use strict";

  var OK_MARK = "[OK]";
  var BAD_MARK = "[!!]";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function isValidQuestion(q) {
    return q &&
      typeof q.question === "string" &&
      Array.isArray(q.options) && q.options.length >= 2 &&
      typeof q.correctIndex === "number" &&
      q.correctIndex >= 0 &&
      q.correctIndex < q.options.length;
  }

  /* 渲染一道题；state 在整份测验内共享计分 */
  function buildQuestion(q, index, state, onAllAnswered) {
    var block = el("section", "quiz-block");

    var qText = el("p", "quiz-q");
    qText.appendChild(el("span", "quiz-no", "第 " + (index + 1) + " 题"));
    qText.appendChild(document.createTextNode(q.question));
    block.appendChild(qText);

    var optionsBox = el("div", "quiz-options");
    optionsBox.setAttribute("role", "group");
    optionsBox.setAttribute("aria-label", "第 " + (index + 1) + " 题选项");
    block.appendChild(optionsBox);

    var feedback = el("div", "quiz-feedback");
    feedback.setAttribute("aria-live", "polite");
    feedback.hidden = true;

    var buttons = q.options.map(function (optText, optIndex) {
      var btn = el("button", "quiz-option", optText);
      btn.type = "button";
      btn.addEventListener("click", function () { answer(optIndex, btn); });
      optionsBox.appendChild(btn);
      return btn;
    });

    function lockAll() {
      buttons.forEach(function (b) { b.disabled = true; });
    }

    function answer(choiceIndex, chosenBtn) {
      if (block.classList.contains("answered")) return;
      var correct = (choiceIndex === q.correctIndex);

      block.classList.add("answered");
      lockAll();

      if (correct) {
        state.correct += 1;
        chosenBtn.classList.add("is-correct");
        chosenBtn.appendChild(el("span", "quiz-mark", OK_MARK));
        chosenBtn.setAttribute("aria-label", q.options[choiceIndex] + "（回答正确）");
      } else {
        chosenBtn.classList.add("is-wrong");
        chosenBtn.appendChild(el("span", "quiz-mark", BAD_MARK));
        chosenBtn.setAttribute("aria-label", q.options[choiceIndex] + "（回答错误）");
        var rightBtn = buttons[q.correctIndex];
        rightBtn.classList.add("is-correct");
        rightBtn.appendChild(el("span", "quiz-mark", OK_MARK));
        rightBtn.setAttribute("aria-label", q.options[q.correctIndex] + "（正确答案）");
      }

      /* 解析文字：判定标记 + 说明 */
      feedback.classList.toggle("bad", !correct);
      var verdict = correct
        ? OK_MARK + " 回答正确。"
        : BAD_MARK + " 回答错误，正确答案是 " +
          String.fromCharCode(65 + q.correctIndex) + "。";
      var first = el("p", null, verdict);
      feedback.appendChild(first);
      if (q.explanation) {
        var second = el("p", null, q.explanation);
        feedback.appendChild(second);
      }
      feedback.hidden = false;
      block.appendChild(feedback);

      state.answered += 1;
      if (state.answered === state.total) onAllAnswered();
    }

    /* 键盘支持：方向键移动焦点，数字键 1-9 选择对应项 */
    optionsBox.addEventListener("keydown", function (e) {
      var current = buttons.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        buttons[(current + 1 + buttons.length) % buttons.length].focus();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        buttons[(current - 1 + buttons.length) % buttons.length].focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        buttons[0].focus();
      } else if (e.key === "End") {
        e.preventDefault();
        buttons[buttons.length - 1].focus();
      } else {
        var n = parseInt(e.key, 10);
        if (n >= 1 && n <= buttons.length) {
          e.preventDefault();
          buttons[n - 1].click();
        }
      }
    });

    return block;
  }

  function verdictMessage(ratio) {
    if (ratio === 1) return "满分！Vault 密封完好，本课知识点全部掌握。";
    if (ratio >= 0.7) return "不错，大部分要点已掌握，建议回顾答错的知识点。";
    if (ratio >= 0.4) return "及格线上，建议重读对应小节后再试一次。";
    return "别灰心，回到正文重学一遍，然后点击“重新作答”。";
  }

  /* 核心渲染：把一组题目装进容器 */
  function renderQuiz(mount, questions) {
    if (!mount || !Array.isArray(questions) || questions.length === 0) {
      if (mount) mount.appendChild(el("p", "quiz-intro",
        "[!!] 未找到测验数据，请检查全局数组是否正确定义。"));
      return;
    }
    var valid = questions.filter(isValidQuestion);
    if (valid.length === 0) {
      mount.appendChild(el("p", "quiz-intro",
        "[!!] 测验数据格式有误，请参考 quiz.js 顶部注释。"));
      return;
    }
    if (valid.length < questions.length) {
      console.warn("[quiz.js] 已跳过 " + (questions.length - valid.length) +
        " 道格式有误的题目。");
    }

    mount.innerHTML = "";
    mount.setAttribute("data-rendered", "true");

    var state = { total: valid.length, answered: 0, correct: 0 };

    mount.appendChild(el("p", "quiz-intro",
      "[*] 随堂小测 · 点击或按数字键作答 · 共 " + state.total + " 题"));

    var summary = el("div", "quiz-summary");
    summary.setAttribute("tabindex", "-1");
    summary.hidden = true;
    mount.appendChild(summary);

    function showSummary() {
      var ratio = state.correct / state.total;
      var percent = Math.round(ratio * 100);
      summary.appendChild(el("p", "quiz-score-line",
        "测验完成：共 " + state.total + " 题 · 答对 " + state.correct +
        " 题 · 正确率 " + percent + "%"));
      summary.appendChild(el("p", null, verdictMessage(ratio)));

      var restart = el("button", "quiz-restart", "重新作答");
      restart.type = "button";
      restart.addEventListener("click", function () {
        renderQuiz(mount, questions);
      });
      summary.appendChild(restart);

      summary.hidden = false;
      summary.focus();   /* 让屏幕阅读器感知成绩已出现 */
    }

    valid.forEach(function (q, i) {
      mount.appendChild(buildQuestion(q, i, state, showSummary));
    });
  }

  /* 自动挂载所有 .quiz 容器 */
  function autoInit() {
    var mounts = document.querySelectorAll(".quiz");
    Array.prototype.forEach.call(mounts, function (m) {
      if (m.getAttribute("data-rendered")) return;   /* 手动渲染过的跳过 */
      var name = m.getAttribute("data-quiz") || "QUIZ_DATA";
      renderQuiz(m, window[name]);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit);
  } else {
    autoInit();
  }

  /* 暴露手动挂载 API */
  window.Quiz = { render: renderQuiz };
})();
