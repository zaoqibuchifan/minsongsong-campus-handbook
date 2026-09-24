/* =========================================================================
 * 民小松 · 校园手册问答助手 —— 前端逻辑
 * 机制：学校切换（默认中南民族大学）+ 关键词加权匹配 → 输出原文条款 + 依据
 *       命中不足则如实拒答；两校条款严格隔离，绝不混用
 * 依赖：minsongsong-kb.js（中南民大分册）、minsongsong-kb-hust.js（华科分册）
 * 配置：window.MINSONGSONG_CONFIG 可在引入前设置
 * ========================================================================= */

(function () {
  'use strict';

  var CFG = window.MINSONGSONG_CONFIG || {};

  /* ---------------- 学校注册表 ---------------- */
  var SCHOOLS = [
    {
      key: 'scuec',
      name: '中南民族大学',
      short: '中南民大',
      desc: '主手册 · 20 项制度',
      kb: window.MINSONGSONG_KB || {},
      fb: window.MINSONGSONG_FALLBACK || {},
      chips: [
        ['请假怎么办理', '请假办理'],
        ['奖学金评选条件', '奖学金条件'],
        ['休学复学怎么办', '休学复学'],
        ['学生证怎么补办', '学生证补办']
      ]
    },
    {
      key: 'hust',
      name: '华中科技大学',
      short: '华科',
      desc: '参考手册 · 9 项制度',
      kb: window.MINSONGSONG_KB_HUST || {},
      fb: window.MINSONGSONG_FALLBACK_HUST || {},
      chips: [
        ['华科请假怎么办理', '请假办理'],
        ['华科奖学金条件', '奖学金条件'],
        ['华科学生证怎么补办', '学生证补办'],
        ['华科转专科什么条件', '转专科条件']
      ]
    }
  ];

  var AVATAR = CFG.avatar || 'assets/minsongsong.jpg';
  var HINT_TEXT = CFG.hint || '我是民小松，学生手册的事问我～';
  var MIN_SCORE = CFG.minScore == null ? 2 : CFG.minScore;
  var DEFAULT_SCHOOL = CFG.school || 'scuec';

  var current = SCHOOLS.filter(function (s) { return s.key === DEFAULT_SCHOOL; })[0] || SCHOOLS[0];

  /* ---------------- 越界话题：直接礼貌拒绝 ---------------- */
  var OUT_OF_SCOPE = [
    { k: ['心理', '压力大', '抑郁', '焦虑', '情绪', '失眠', '难过'], r: '心理咨询' },
    { k: ['法律', '起诉', '律师', '打官司', '违法吗', '赔偿吗'], r: '法律判断' },
    { k: ['职业规划', '未来怎么办', '该不该考研', '要不要考研', '就业方向', '帮我规划'], r: '学业与职业规划' },
    { k: ['恋爱', '感情', '男朋友', '女朋友'], r: '私人事务' },
    { k: ['推荐个餐厅', '附近有什么好吃的', '打游戏', '看电影'], r: '与手册无关的闲聊' }
  ];

  /* ---------------- 诱导性请求：转为引用手册禁止条款 ---------------- */
  var ENTICE = {
    k: ['编一个', '编个', '编造', '假的', '伪造', '造假', '随便写个理由', '帮我编', '想个理由'],
    hitBySchool: { scuec: 'qingjia-weigui', hust: null }
  };

  /* ---------------- 学校识别关键词（用于跨校追问） ---------------- */
  var SCHOOL_HINTS = [
    { k: ['华中科技大学', '华科', '华中大', '华工', 'hust'], school: 'hust' },
    { k: ['中南民族大学', '中南民大', '民大', '中南', 'scuec'], school: 'scuec' }
  ];

  /* =====================================================================
   * 检索
   * ===================================================================== */
  function search(query, kb) {
    var q = String(query || '').toLowerCase().replace(/\s+/g, '');
    if (!q) return { best: null, score: 0, others: [] };

    var ranked = [];

    Object.keys(kb).forEach(function (key) {
      var item = kb[key];
      var score = 0;

      (item.keywords || []).forEach(function (kw) {
        var w = kw.toLowerCase();
        if (q.indexOf(w) !== -1) score += Math.max(2, w.length / 2);
      });

      var title = (item.title || '').toLowerCase();
      for (var i = 0; i < title.length - 1; i++) {
        var bi = title.substr(i, 2);
        if (bi.length === 2 && q.indexOf(bi) !== -1) score += 0.6;
      }

      if (q.indexOf((item.category || '').toLowerCase()) !== -1) score += 1.5;

      if (score > 0) ranked.push({ item: item, score: score });
    });

    ranked.sort(function (a, b) { return b.score - a.score; });
    return {
      best: ranked.length ? ranked[0].item : null,
      score: ranked.length ? ranked[0].score : 0,
      others: ranked.slice(1, 4).map(function (r) { return r.item; })
    };
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function matchList(list, q) {
    for (var i = 0; i < list.length; i++) {
      for (var j = 0; j < list[i].k.length; j++) {
        if (q.indexOf(list[i].k[j]) !== -1) return list[i];
      }
    }
    return null;
  }

  function detectSchool(q) {
    for (var i = 0; i < SCHOOL_HINTS.length; i++) {
      for (var j = 0; j < SCHOOL_HINTS[i].k.length; j++) {
        if (q.indexOf(SCHOOL_HINTS[i].k[j]) !== -1) return SCHOOL_HINTS[i].school;
      }
    }
    return null;
  }

  /* =====================================================================
   * 渲染
   * ===================================================================== */
  function renderItem(item, opts) {
    opts = opts || {};
    var html = '';
    var fb = opts.fb || current.fb;

    if (opts.showDeclare && fb.declare) {
      html += '<span class="ms-declare">' + esc(fb.declare) + '</span>';
    }

    html += '<ul class="ms-steps">';
    (item.answer || []).forEach(function (line) {
      html += '<li>' + esc(line) + '</li>';
    });
    html += '</ul>';
    html += '<span class="ms-src">依据：<em>' + esc(item.source) + '</em></span>';

    if (opts.others && opts.others.length) {
      html += '<div class="ms-acts">';
      opts.others.slice(0, 2).forEach(function (o) {
        html += '<button class="ms-act" type="button" data-goto="' + esc(o.id) + '">' + esc(o.title) + '</button>';
      });
      html += '</div>';
    }
    return html;
  }

  function renderFallback(kind) {
    var fb = current.fb || {};
    var lines = fb[kind] || fb.no_hit || ['暂无可依据的手册内容。'];
    var html = '<span class="ms-declare">' + esc(fb.declare || '') + '</span>';
    html += '<p>' + lines.map(esc).join('<br>') + '</p>';
    if (kind === 'no_hit') {
      html += '<div class="ms-acts">';
      html += '<button class="ms-act" type="button" data-switch="' + (current.key === 'scuec' ? 'hust' : 'scuec') + '">' +
              '切换到' + (current.key === 'scuec' ? '华中科技大学' : '中南民族大学') + '试试</button>';
      html += '</div>';
    }
    return html;
  }

  /* =====================================================================
   * 核心应答
   * ===================================================================== */
  function answer(query) {
    var q = String(query || '').toLowerCase().trim();
    var qc = q.replace(/\s+/g, '');
    var usedSchool = current;
    var declared = null;

    // 0) 用户问题里点名了另一所学校 → 自动切到该校作答（不改全局选择）
    var hint = detectSchool(qc);
    if (hint && hint !== current.key) {
      var target = SCHOOLS.filter(function (s) { return s.key === hint; })[0];
      if (target) { usedSchool = target; declared = target; }
    }

    // 1) 诱导性请求拦截
    for (var e = 0; e < ENTICE.k.length; e++) {
      if (qc.indexOf(ENTICE.k[e]) !== -1) {
        var hitId = ENTICE.hitBySchool[usedSchool.key];
        var hitItem = hitId ? usedSchool.kb[hitId] : null;
        var msg = '<span class="ms-declare">' + esc(usedSchool.fb.declare || '') + '</span>' +
                  '<p>这个忙我不能帮——编造请假理由属于手册明确规定的违纪情形，我不能协助你规避制度。</p>';
        if (hitItem) {
          msg += '<p>' + usedSchool.name + '手册对此的规定是：</p>' +
                 '<ul class="ms-steps">' + (hitItem.answer || []).map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' +
                 '<span class="ms-src">依据：<em>' + esc(hitItem.source) + '</em></span>';
        } else {
          msg += '<p>建议你按正常流程向辅导员说明实际情况，如确有困难可申请临时困难补助等正规资助渠道。</p>';
        }
        return { html: msg };
      }
    }

    // 2) 越界话题
    var oos = matchList(OUT_OF_SCOPE, qc);
    if (oos) {
      return {
        html: '<p>这个问题属于「' + esc(oos.r) + '」，超出了我的服务范围——我只依据学生手册回答学生事务的制度与办理流程。</p>' +
              '<p>' + esc((usedSchool.fb.out_of_scope || [''])[1] || '') + '</p>'
      };
    }

    // 3) 检索
    var res = search(qc, usedSchool.kb);
    if (res.best && res.score >= MIN_SCORE) {
      return {
        html: renderItem(res.best, { showDeclare: true, others: res.others, fb: usedSchool.fb }),
        school: usedSchool
      };
    }

    // 4) 无命中
    var savedCurrent = current;
    current = usedSchool;
    var html = renderFallback('no_hit');
    current = savedCurrent;
    if (declared) {
      html = '<span class="ms-declare">以下依据《' + esc(usedSchool.name) + '学生手册》作答，未查询到该规定。</span>' +
             html.replace(/^<span class="ms-declare">.*?<\/span>/, '');
    }
    return { html: html, school: usedSchool };
  }

  /* =====================================================================
   * UI
   * ===================================================================== */
  var fab, panel, body, input, hintEl, opened = false;

  function schoolBar() {
    return SCHOOLS.map(function (s) {
      return '<button class="ms-school' + (s.key === current.key ? ' is-on' : '') + '" type="button" data-switch="' + s.key + '">' +
             '<b>' + esc(s.short) + '</b><small>' + esc(s.desc) + '</small></button>';
    }).join('');
  }

  function chipsBar() {
    return current.chips.map(function (c) {
      return '<button class="ms-chip" type="button" data-ask="' + esc(c[0]) + '">' + esc(c[1]) + '</button>';
    }).join('');
  }

  function buildUI() {
    fab = document.createElement('button');
    fab.className = 'ms-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', '打开民小松 · 校园手册问答助手');
    fab.innerHTML = '<img src="' + AVATAR + '" alt="民小松"><span class="ms-fab__dot" id="msDot"></span>';
    document.body.appendChild(fab);

    hintEl = document.createElement('div');
    hintEl.className = 'ms-hint';
    hintEl.textContent = HINT_TEXT;
    document.body.appendChild(hintEl);

    panel = document.createElement('div');
    panel.className = 'ms-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '民小松 · 校园手册问答助手');
    panel.innerHTML =
      '<div class="ms-head">' +
        '<div class="ms-head__ava"><img src="' + AVATAR + '" alt=""></div>' +
        '<div class="ms-head__who">' +
          '<b>民小松</b>' +
          '<small><i></i>校园手册问答助手 · 在线</small>' +
        '</div>' +
        '<button class="ms-head__x" type="button" aria-label="关闭">✕</button>' +
      '</div>' +
      '<div class="ms-schools" id="msSchools">' + schoolBar() + '</div>' +
      '<div class="ms-body" id="msBody"></div>' +
      '<div class="ms-chips" id="msChips">' + chipsBar() + '</div>' +
      '<div class="ms-foot">' +
        '<input type="text" placeholder="问我手册里的任何规定…" aria-label="输入问题">' +
        '<button class="ms-foot__send" type="button" aria-label="发送">➤</button>' +
      '</div>';
    document.body.appendChild(panel);

    body = panel.querySelector('#msBody');
    input = panel.querySelector('.ms-foot input');

    fab.addEventListener('click', toggle);
    panel.querySelector('.ms-head__x').addEventListener('click', close);
    panel.querySelector('.ms-foot__send').addEventListener('click', submit);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
    });
    panel.addEventListener('click', function (e) {
      var el = e.target;
      var ask = el.getAttribute && el.getAttribute('data-ask');
      var go = el.getAttribute && el.getAttribute('data-goto');
      var sw = el.getAttribute && el.getAttribute('data-switch');
      if (ask) ask2(ask);
      if (go && current.kb[go]) ask2(current.kb[go].title, current.kb[go]);
      if (sw) switchSchool(sw);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && opened) close();
    });
  }

  function refreshSchools() {
    var s = panel.querySelector('#msSchools');
    if (s) s.innerHTML = schoolBar();
    var c = panel.querySelector('#msChips');
    if (c) c.innerHTML = chipsBar();
  }

  function switchSchool(key, silent) {
    var t = SCHOOLS.filter(function (s) { return s.key === key; })[0];
    if (!t || t.key === current.key) return;
    current = t;
    refreshSchools();
    if (silent) return;
    addMsg('<span class="ms-declare">已切换为《' + esc(current.name) + '学生手册》口径。两校条款独立，不混用。</span>' +
           '<p>现在问我' + esc(current.short) + '的请假、奖学金、学籍、违纪、证件或宿舍规定都可以。</p>', 'bot');
  }

  function addMsg(html, who) {
    var div = document.createElement('div');
    div.className = 'ms-msg ms-msg--' + (who === 'user' ? 'user' : 'bot');
    div.innerHTML = html;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  function typing() {
    var div = document.createElement('div');
    div.className = 'ms-msg ms-msg--bot';
    div.innerHTML = '<span class="ms-typing"><i></i><i></i><i></i></span>';
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  function reply(query) {
    var t = typing();
    setTimeout(function () {
      var out = answer(query);
      t.innerHTML = out.html;
      body.scrollTop = body.scrollHeight;
    }, 300 + Math.random() * 240);
  }

  function submit() {
    var v = (input.value || '').trim();
    if (!v) return;
    input.value = '';
    addMsg(esc(v), 'user');
    reply(v);
  }

  function ask2(text, directItem) {
    addMsg(esc(text), 'user');
    var t = typing();
    setTimeout(function () {
      if (directItem) {
        t.innerHTML = renderItem(directItem, { showDeclare: true, others: [], fb: current.fb });
      } else {
        var out = answer(text);
        t.innerHTML = out.html;
      }
      body.scrollTop = body.scrollHeight;
    }, 340);
  }

  function open() {
    opened = true;
    panel.hidden = false;
    panel.classList.remove('is-closing');
    fab.setAttribute('aria-label', '关闭民小松');
    if (hintEl) hintEl.classList.add('is-hidden');
    var dot = document.getElementById('msDot');
    if (dot) dot.classList.add('is-hidden');
    if (!body.children.length) {
      addMsg(
        '<span class="ms-declare">当前口径：' + esc(current.name) + '（可在上方切换学校）</span>' +
        '<p>你好，我是<b>民小松</b>。我依据学生手册回答请假、奖助学金、学籍、违纪处分、证件办理等事务的办理流程。</p>' +
        '<p>手册里没有写的内容，我会直接告诉你在手册中未查询到，<b>不会编造</b>。</p>' +
        '<p>本助手收录两所学校的手册，<b>默认按中南民族大学作答</b>；点上方按钮可切换到华中科技大学，我会严格按对应手册回答，不混用两校条款。</p>',
        'bot'
      );
    }
    setTimeout(function () { input.focus(); }, 260);
  }

  function close() {
    opened = false;
    panel.classList.add('is-closing');
    fab.setAttribute('aria-label', '打开民小松 · 校园手册问答助手');
    setTimeout(function () {
      panel.hidden = true;
      panel.classList.remove('is-closing');
    }, 230);
  }

  function toggle() { opened ? close() : open(); }

  function init() {
    if (!Object.keys(SCHOOLS[0].kb).length) {
      console.warn('[民小松] 未检测到中南民大知识库，请确认已引入 minsongsong-kb.js');
    }
    buildUI();
    setTimeout(function () { if (hintEl && !opened) hintEl.classList.add('is-hidden'); }, 6000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.Minsongsong = { search: search, answer: answer, schools: SCHOOLS, switchSchool: switchSchool };

})();
