// موتور اصلی وب‌اپلیکیشن بیوشیمی
window.BIOCHEM_DB = window.BIOCHEM_DB || {};

const app = {
  state: {
    view: 'home', // home | chapter | quiz | bookmarks | wrong
    activeChapterId: null,
    activeTopicIndex: 0,
    mode: 'deep', // deep (درسنامه + تست) | fast (مرور سریع درسنامه) | quizOnly (فقط تست)
    currentQuestionIdx: 0,
    selectedOption: null,
    showExplanation: false,
    userAnswers: JSON.parse(localStorage.getItem('biochem_answers') || '{}'),
    bookmarks: JSON.parse(localStorage.getItem('biochem_bookmarks') || '[]'),
    wrongIds: JSON.parse(localStorage.getItem('biochem_wrongs') || '[]'),
    customQuizList: [],
    searchQuery: ''
  },

  init() {
    if (localStorage.getItem('biochem_theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
    this.updateCounters();
    this.render();
  },

  saveStorage() {
    localStorage.setItem('biochem_answers', JSON.stringify(this.state.userAnswers));
    localStorage.setItem('biochem_bookmarks', JSON.stringify(this.state.bookmarks));
    localStorage.setItem('biochem_wrongs', JSON.stringify(this.state.wrongIds));
    this.updateCounters();
  },

  updateCounters() {
    document.getElementById('bookmark-count').innerText = this.state.bookmarks.length;
    document.getElementById('wrong-count').innerText = this.state.wrongIds.length;
  },

  toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('biochem_theme', isDark ? 'dark' : 'light');
  },

  goHome() {
    this.state.view = 'home';
    this.state.activeChapterId = null;
    this.render();
  },

  openChapter(chapterId, topicIdx = 0) {
    this.state.view = 'chapter';
    this.state.activeChapterId = chapterId;
    this.state.activeTopicIndex = topicIdx;
    this.state.currentQuestionIdx = 0;
    this.state.selectedOption = null;
    this.state.showExplanation = false;
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  setMode(newMode) {
    this.state.mode = newMode;
    this.render();
  },

  selectTopic(idx) {
    this.state.activeTopicIndex = idx;
    this.state.currentQuestionIdx = 0;
    this.state.selectedOption = null;
    this.state.showExplanation = false;
    this.render();
  },

  getAllQuestions() {
    const list = [];
    Object.values(window.BIOCHEM_DB).forEach(ch => {
      (ch.topics || []).forEach((tp, tIdx) => {
        (tp.questions || []).forEach(q => {
          list.push({
            ...q,
            chapterId: ch.id,
            chapterTitle: ch.title,
            topicIdx: tIdx,
            topicTitle: tp.title
          });
        });
      });
    });
    return list;
  },

  openBookmarks() {
    const all = this.getAllQuestions();
    this.state.customQuizList = all.filter(q => this.state.bookmarks.includes(q.uid));
    this.state.view = 'custom_quiz';
    this.state.customTitle = 'سوالات نشان‌شده (مرور شخصی)';
    this.state.currentQuestionIdx = 0;
    this.state.selectedOption = null;
    this.state.showExplanation = false;
    this.render();
  },

  openWrongBank() {
    const all = this.getAllQuestions();
    this.state.customQuizList = all.filter(q => this.state.wrongIds.includes(q.uid));
    this.state.view = 'custom_quiz';
    this.state.customTitle = 'بانک تست‌های غلط و نیازمند مرور';
    this.state.currentQuestionIdx = 0;
    this.state.selectedOption = null;
    this.state.showExplanation = false;
    this.render();
  },

  toggleBookmark(uid) {
    const idx = this.state.bookmarks.indexOf(uid);
    if (idx > -1) this.state.bookmarks.splice(idx, 1);
    else this.state.bookmarks.push(uid);
    this.saveStorage();
    this.render();
  },

  answerQuestion(qUid, optionIdx, correctIdx) {
    if (this.state.showExplanation) return;
    this.state.selectedOption = optionIdx;
    this.state.showExplanation = true;
    this.state.userAnswers[qUid] = optionIdx;

    if (optionIdx !== correctIdx) {
      if (!this.state.wrongIds.includes(qUid)) this.state.wrongIds.push(qUid);
    } else {
      const wIdx = this.state.wrongIds.indexOf(qUid);
      if (wIdx > -1) this.state.wrongIds.splice(wIdx, 1);
    }
    this.saveStorage();
    this.render();
  },

  nextQuestion(total) {
    if (this.state.currentQuestionIdx < total - 1) {
      this.state.currentQuestionIdx++;
      this.state.selectedOption = null;
      this.state.showExplanation = false;
      this.render();
    }
  },

  prevQuestion() {
    if (this.state.currentQuestionIdx > 0) {
      this.state.currentQuestionIdx--;
      this.state.selectedOption = null;
      this.state.showExplanation = false;
      this.render();
    }
  },

  jumpToQuestion(idx) {
    this.state.currentQuestionIdx = idx;
    this.state.selectedOption = null;
    this.state.showExplanation = false;
    this.render();
  },

  openLessonRow(chapterId, topicIdx, rowNum) {
    const ch = window.BIOCHEM_DB[chapterId];
    if (!ch) return;
    const topic = ch.topics[topicIdx];
    if (!topic) return;
    const row = (topic.rows || []).find(r => String(r.row) === String(rowNum));

    document.getElementById('modal-row-badge').innerText = `ردیف ${rowNum} درسنامه (${topic.title})`;
    if (row) {
      document.getElementById('modal-row-title').innerText = row.title;
      document.getElementById('modal-row-body').innerHTML = row.html;
    } else {
      document.getElementById('modal-row-title').innerText = 'جدول خلاصه درسنامه';
      document.getElementById('modal-row-body').innerHTML = `<p class="text-slate-500">محتوای کامل ردیف ${rowNum} در تب «درسنامه جدولی» همین مبحث قابل مشاهده است.</p>`;
    }
    document.getElementById('lesson-modal').classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('lesson-modal').classList.add('hidden');
  },

  render() {
    const root = document.getElementById('app-root');
    if (this.state.view === 'home') {
      root.innerHTML = this.renderHome();
    } else if (this.state.view === 'chapter') {
      root.innerHTML = this.renderChapter();
    } else if (this.state.view === 'custom_quiz') {
      root.innerHTML = this.renderCustomQuiz();
    }
  },

  renderHome() {
    const chapters = window.CHAPTER_MANIFEST || [];
    const allQs = this.getAllQuestions();
    const answeredCount = Object.keys(this.state.userAnswers).length;

    let cardsHtml = chapters.map(ch => {
      const dbCh = window.BIOCHEM_DB[ch.id];
      const qCount = dbCh ? dbCh.topics.reduce((acc, t) => acc + (t.questions ? t.questions.length : 0), 0) : 0;
      const tCount = dbCh ? dbCh.topics.length : ch.subtopics.length;

      return `
        <div onclick="app.openChapter(${ch.id})" class="group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">فصل ${ch.id}</span>
              <span class="text-xs text-slate-400">${tCount} مبحث | ${qCount} تست</span>
            </div>
            <h3 class="font-bold text-base text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors mb-2">${ch.title}</h3>
            <ul class="text-xs text-slate-500 dark:text-slate-400 space-y-1 mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
              ${ch.subtopics.map(st => `<li class="truncate">• ${st}</li>`).join('')}
            </ul>
          </div>
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-medium text-teal-600 dark:text-teal-400">
            <span>ورود به درسنامه و تست‌ها</span>
            <span>←</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="space-y-6">
        <!-- Hero Banner -->
        <div class="bg-gradient-to-l from-teal-700 to-emerald-600 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl sm:text-2xl font-extrabold mb-2">پلتفرم مطالعه هوشمند بیوشیمی</h2>
            <p class="text-teal-100 text-sm leading-relaxed max-w-2xl">
              ساختار دوگانه: یادگیری عمیق با جداول طبقه‌بندی‌شده + تست‌های آزمون علوم پایه با ارجاع مستقیم به ردیف درسنامه و پاسخ تشریحی.
            </p>
          </div>
          <div class="flex gap-3 bg-white/10 backdrop-blur p-3.5 rounded-xl border border-white/20 shrink-0">
            <div class="text-center px-3">
              <div class="text-xl font-black">${chapters.length}</div>
              <div class="text-xs text-teal-100">فصل کامل</div>
            </div>
            <div class="w-px bg-white/20"></div>
            <div class="text-center px-3">
              <div class="text-xl font-black">${allQs.length}</div>
              <div class="text-xs text-teal-100">تست طبقه‌بندی</div>
            </div>
            <div class="w-px bg-white/20"></div>
            <div class="text-center px-3">
              <div class="text-xl font-black">${answeredCount}</div>
              <div class="text-xs text-teal-100">پاسخ داده‌شده</div>
            </div>
          </div>
        </div>

        <!-- Chapters Grid -->
        <div>
          <h3 class="font-bold text-lg mb-4 text-slate-800 dark:text-slate-100">فهرست سرفصل‌های بیوشیمی</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${cardsHtml}
          </div>
        </div>
      </div>
    `;
  },

  renderChapter() {
    const ch = window.BIOCHEM_DB[this.state.activeChapterId];
    if (!ch) return `<div class="p-8 text-center">فصل مورد نظر یافت نشد.</div>`;

    const topics = ch.topics || [];
    const activeTopic = topics[this.state.activeTopicIndex] || topics[0];

    const topicTabs = topics.map((t, idx) => `
      <button onclick="app.selectTopic(${idx})" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
        idx === this.state.activeTopicIndex
          ? 'bg-teal-600 text-white shadow-sm'
          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-teal-400'
      }">
        ${t.title}
      </button>
    `).join('');

    const modeSwitcher = `
      <div class="inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-1">
        <button onclick="app.setMode('deep')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${this.state.mode === 'deep' ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm' : 'text-slate-600 dark:text-slate-400'}">
          📖 درسنامه + تست
        </button>
        <button onclick="app.setMode('fast')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${this.state.mode === 'fast' ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm' : 'text-slate-600 dark:text-slate-400'}">
          ⚡ مرور سریع جدول
        </button>
        <button onclick="app.setMode('quizOnly')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition ${this.state.mode === 'quizOnly' ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm' : 'text-slate-600 dark:text-slate-400'}">
          ✍️ فقط آزمون تستی
        </button>
      </div>
    `;

    // Lesson Rows Table
    const rowsHtml = (activeTopic.rows || []).map(r => `
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div class="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <span class="w-7 h-7 rounded-lg bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">${r.row}</span>
          <h4 class="font-bold text-sm sm:text-base text-slate-900 dark:text-white">${r.title}</h4>
        </div>
        <div class="p-4 text-sm leading-7 text-slate-700 dark:text-slate-200 overflow-x-auto custom-scroll">
          ${r.html}
        </div>
      </div>
    `).join('');

    const quizSection = this.renderQuizBox(activeTopic.questions || [], ch.id, this.state.activeTopicIndex);

    return `
      <div class="space-y-5">
        <!-- Breadcrumb & Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <button onclick="app.goHome()" class="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700">→ بازگشت</button>
            <div>
              <span class="text-xs text-teal-600 dark:text-teal-400 font-bold">فصل ${ch.id}</span>
              <h2 class="font-bold text-base sm:text-lg text-slate-900 dark:text-white">${ch.title}</h2>
            </div>
          </div>
          ${modeSwitcher}
        </div>

        <!-- Subtopics Tabs -->
        ${topics.length > 1 ? `<div class="flex gap-2 overflow-x-auto pb-1 custom-scroll">${topicTabs}</div>` : ''}

        <!-- Content Area -->
        ${this.state.mode === 'fast' ? `
          <div class="space-y-4">
            <div class="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-200">
              حالت مرور سریع جمع‌بندی: تمامی نکات کلیدی این مبحث بر اساس ردیف‌های جدول درسنامه خلاصه شده‌اند.
            </div>
            ${rowsHtml}
          </div>
        ` : ''}

        ${this.state.mode === 'quizOnly' ? `
          <div>${quizSection}</div>
        ` : ''}

        ${this.state.mode === 'deep' ? `
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div class="lg:col-span-6 space-y-4">
              <h3 class="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>📋</span> جدول درسنامه مبحث: ${activeTopic.title}
              </h3>
              ${rowsHtml}
            </div>
            <div class="lg:col-span-6 lg:sticky lg:top-20">
              <h3 class="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <span>🎯</span> تست‌های طبقه‌بندی‌شده (${(activeTopic.questions || []).length} سوال)
              </h3>
              ${quizSection}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  renderCustomQuiz() {
    const list = this.state.customQuizList || [];
    if (list.length === 0) {
      return `
        <div class="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800 max-w-xl mx-auto mt-8">
          <div class="text-4xl mb-3">📭</div>
          <h3 class="font-bold text-lg mb-2">${this.state.customTitle}</h3>
          <p class="text-sm text-slate-500 mb-5">هنوز هیچ سوالی در این بخش ثبت نشده است.</p>
          <button onclick="app.goHome()" class="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold">بازگشت به صفحه اصلی</button>
        </div>
      `;
    }
    const q = list[this.state.currentQuestionIdx] || list[0];
    return `
      <div class="max-w-3xl mx-auto space-y-4">
        <div class="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <button onclick="app.goHome()" class="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold">→ بازگشت</button>
            <h2 class="font-bold text-base">${this.state.customTitle}</h2>
          </div>
          <span class="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800">${this.state.currentQuestionIdx + 1} از ${list.length}</span>
        </div>
        ${this.renderQuizBox(list, q.chapterId, q.topicIdx, true)}
      </div>
    `;
  },

  renderQuizBox(questions, chapterId, topicIdx, isCustom = false) {
    if (!questions || questions.length === 0) {
      return `<div class="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500">تستی برای این مبحث ثبت نشده است.</div>`;
    }

    const idx = Math.min(this.state.currentQuestionIdx, questions.length - 1);
    const q = questions[idx];
    const isBookmarked = this.state.bookmarks.includes(q.uid);
    const labels = ['الف', 'ب', 'ج', 'د'];

    const navPills = questions.map((item, i) => {
      const prevAns = this.state.userAnswers[item.uid];
      let colorClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
      if (prevAns !== undefined) {
        colorClass = prevAns === item.correct
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-400'
          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border border-rose-400';
      }
      if (i === idx) colorClass += ' ring-2 ring-teal-500 font-bold';
      return `<button onclick="app.jumpToQuestion(${i})" class="w-8 h-8 rounded-lg text-xs transition ${colorClass}">${i + 1}</button>`;
    }).join('');

    const optionsHtml = q.options.map((opt, oIdx) => {
      let btnStyle = 'border-slate-200 dark:border-slate-700 hover:border-teal-500 bg-slate-50/50 dark:bg-slate-800/40';
      let badgeStyle = 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600';

      if (this.state.showExplanation) {
        if (oIdx === q.correct) {
          btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 font-medium';
          badgeStyle = 'bg-emerald-600 text-white border-emerald-600';
        } else if (oIdx === this.state.selectedOption) {
          btnStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-100';
          badgeStyle = 'bg-rose-600 text-white border-rose-600';
        } else {
          btnStyle = 'border-slate-200 dark:border-slate-800 opacity-60';
        }
      }

      return `
        <button onclick="app.answerQuestion('${q.uid}', ${oIdx}, ${q.correct})" class="w-full text-right p-3.5 rounded-xl border transition-all flex items-start gap-3 ${btnStyle}">
          <span class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${badgeStyle}">${labels[oIdx]}</span>
          <span class="text-sm leading-6">${opt}</span>
        </button>
      `;
    }).join('');

    const relatedRows = Array.isArray(q.rows) ? q.rows : (q.rows ? [q.rows] : []);
    const rowButtons = relatedRows.map(rNum => `
      <button onclick="app.openLessonRow(${isCustom ? q.chapterId : chapterId}, ${isCustom ? q.topicIdx : topicIdx}, '${rNum}')" class="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1 shadow-sm">
        <span>📑 مشاهده ردیف ${rNum} درسنامه</span>
      </button>
    `).join(' ');

    return `
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-5">
        <!-- Question Number Navigator -->
        <div class="flex flex-wrap gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          ${navPills}
        </div>

        <!-- Question Meta -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">سوال ${idx + 1} از ${questions.length}</span>
            ${q.source ? `<span class="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-medium">${q.source}</span>` : ''}
          </div>
          <button onclick="app.toggleBookmark('${q.uid}')" class="px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
            isBookmarked
              ? 'bg-amber-100 border-amber-400 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
              : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-amber-600'
          }">
            ${isBookmarked ? '★ نشان‌شده' : '☆ نشان کردن'}
          </button>
        </div>

        <!-- Question Stem -->
        <div class="text-base font-bold leading-8 text-slate-900 dark:text-white">
          ${q.q}
        </div>

        <!-- Options -->
        <div class="space-y-2.5">
          ${optionsHtml}
        </div>

        <!-- Explanation & Lesson Row Link -->
        ${this.state.showExplanation ? `
          <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3 animate-fadeIn">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-xs font-bold ${this.state.selectedOption === q.correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
                ${this.state.selectedOption === q.correct ? '✓ پاسخ شما کاملاً صحیح است' : `✕ پاسخ صحیح: گزینه (${labels[q.correct]})`}
              </span>
              <div class="flex flex-wrap gap-1.5">${rowButtons}</div>
            </div>
            <p class="text-sm leading-7 text-slate-700 dark:text-slate-200 border-t border-slate-200 dark:border-slate-700 pt-2.5">
              <strong class="text-teal-700 dark:text-teal-400">پاسخ تشریحی:</strong> ${q.exp}
            </p>
          </div>
        ` : ''}

        <!-- Prev / Next Controls -->
        <div class="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button onclick="app.prevQuestion()" ${idx === 0 ? 'disabled' : ''} class="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800">
            → سوال قبلی
          </button>
          <button onclick="app.nextQuestion(${questions.length})" ${idx === questions.length - 1 ? 'disabled' : ''} class="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white disabled:opacity-40 hover:bg-teal-700">
            سوال بعدی ←
          </button>
        </div>
      </div>
    `;
  }
};

document.addEventListener('DOMContentLoaded', () => app.init());
