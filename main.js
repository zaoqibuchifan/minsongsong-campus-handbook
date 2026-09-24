/* =========================================================
   潘宇航 · 个人网站 —— 共用脚本
   导航 / 逐段淡入 / 关键词云 / 背景音乐 / 滚动列车 / 复制 / 回顶部
   ========================================================= */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- 站长备注：默认隐藏，网址加 ?todo=1 才显示 ---------------- */
  if (/[?&]todo=1/.test(window.location.search)) {
    document.body.classList.add("todo-on");
  }

  /* ---------------- 提示条 ---------------- */
  var toast = $("#toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toast.classList.remove("on"); }, 2100);
  }

  /* ---------------- 中英双语切换 ----------------
     文案直接写在元素上：<el data-zh="中文" data-en="English">中文</el>
     关键词提示用 data-tip-zh / data-tip-en，图片 alt 用 data-alt-zh / data-alt-en。
     约束：带 data-zh 的元素里不能再嵌套带 data-zh 的子元素（innerHTML 会覆盖）。 */
  var langBtn = $("#langBtn");
  var langLabel = $("#langLabel");
  var LANG_KEY = "pyh-lang";
  var lang = "zh";

  function t(zh, en) { return lang === "en" ? en : zh; }

  function applyLang(next, silent) {
    lang = (next === "en") ? "en" : "zh";
    var root = document.documentElement;
    root.setAttribute("lang", lang === "en" ? "en" : "zh-CN");

    $$("[data-zh]").forEach(function (el) {
      var v = el.getAttribute("data-" + lang);
      if (v !== null) el.innerHTML = v;
    });
    $$("[data-tip-zh]").forEach(function (el) {
      var v = el.getAttribute("data-tip-" + lang);
      if (v !== null) el.setAttribute("data-tip", v);
    });
    $$("[data-alt-zh]").forEach(function (el) {
      var v = el.getAttribute("data-alt-" + lang);
      if (v !== null) el.setAttribute("alt", v);
    });

    var ti = root.getAttribute("data-title-" + lang);
    if (ti) document.title = ti;
    var de = root.getAttribute("data-desc-" + lang);
    if (de) {
      var meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute("content", de);
    }

    if (langBtn) {
      langBtn.setAttribute("data-lang", lang);
      langBtn.setAttribute("aria-label", lang === "en" ? "切换到中文" : "Switch to English");
    }
    if (langLabel) langLabel.textContent = lang === "en" ? "中文" : "EN";
    try { window.localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    if (!silent) window.dispatchEvent(new CustomEvent("langchange", { detail: lang }));
  }

  if (langBtn) {
    langBtn.addEventListener("click", function () {
      applyLang(lang === "zh" ? "en" : "zh");
    });
  }
  var savedLang = null;
  try { savedLang = window.localStorage.getItem(LANG_KEY); } catch (e) {}
  if (savedLang === "en") applyLang("en", true);

  /* ---------------- 移动端菜单 ---------------- */
  var toggle = $("#navToggle");
  var mnav = $("#mobileNav");
  function closeNav() {
    if (!mnav) return;
    mnav.classList.remove("on");
    if (toggle) toggle.classList.remove("on");
  }
  if (toggle && mnav) {
    toggle.addEventListener("click", function () {
      var open = mnav.classList.toggle("on");
      toggle.classList.toggle("on", open);
    });
    $$("a", mnav).forEach(function (a) { a.addEventListener("click", closeNav); });
  }

  /* ---------------- 逐段淡入 ---------------- */
  var revealEls = $$(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    $$("[data-stagger]").forEach(function (group) {
      $$(".reveal", group).forEach(function (el, i) {
        if (!el.style.transitionDelay) el.style.transitionDelay = (i * 0.09).toFixed(3) + "s";
      });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.13, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- 关键词云：点击展开（手机可用） ---------------- */
  var kws = $$(".kw");
  kws.forEach(function (k) {
    k.addEventListener("click", function (e) {
      e.stopPropagation();
      var wasOpen = k.classList.contains("is-open");
      kws.forEach(function (o) { o.classList.remove("is-open"); });
      if (!wasOpen) k.classList.add("is-open");
    });
  });
  document.addEventListener("click", function () {
    kws.forEach(function (o) { o.classList.remove("is-open"); });
  });

  /* ---------------- 技能条填充 ---------------- */
  var barBox = $("#packCard");
  if (barBox) {
    var fills = $$(".bar__fill", barBox);
    var runBars = function () {
      fills.forEach(function (f, i) {
        var w = f.getAttribute("data-w") || "0";
        window.setTimeout(function () { f.style.width = w + "%"; }, reduce ? 0 : i * 110);
      });
    };
    if (!("IntersectionObserver" in window)) { runBars(); }
    else {
      var bio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { runBars(); bio.disconnect(); } });
      }, { threshold: 0.28 });
      bio.observe(barBox);
    }
  }

  /* ---------------- 复制到剪贴板 ---------------- */
  function fallbackCopy(text, done) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
      done();
    } catch (e) { showToast(t("复制失败，请手动选择", "Copy failed — please select manually")); }
  }
  $$("[data-copy]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      var text = el.getAttribute("data-copy-" + lang) || el.getAttribute("data-copy");
      if (el.tagName === "A") e.preventDefault();
      var done = function () { showToast(t("已复制到剪贴板", "Copied to clipboard")); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
      } else { fallbackCopy(text, done); }
      if (el.tagName === "A" && el.getAttribute("href")) {
        window.setTimeout(function () { window.location.href = el.getAttribute("href"); }, 260);
      }
    });
  });

  /* ---------------- 背景音乐（跨页记忆播放意图） ---------------- */
  var fab = $("#bgmFab");
  var panel = $("#bgmPanel");
  var audio = $("#bgmAudio");
  if (fab && panel && audio) {
    var KEY = "pyh-bgm";
    var remember = function (on) { try { window.sessionStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {} };
    var wantOn = false;
    try { wantOn = window.sessionStorage.getItem(KEY) === "1"; } catch (e) {}

    var syncFab = function () {
      fab.classList.toggle("is-playing", !audio.paused);
    };
    fab.addEventListener("click", function () {
      panel.classList.toggle("on");
      if (!panel.classList.contains("on")) return;
      if (audio.paused) {
        audio.volume = 0.42;
        var p = audio.play();
        if (p && p.catch) p.catch(function () { /* 需用户再点一次播放键 */ });
      }
    });
    audio.addEventListener("play", function () { remember(true); syncFab(); });
    audio.addEventListener("pause", function () { remember(false); syncFab(); });
    document.addEventListener("click", function (e) {
      if (panel.classList.contains("on") && !panel.contains(e.target) && !fab.contains(e.target)) {
        panel.classList.remove("on");
      }
    });
    // 上一页在播放 → 本页加载后尝试续播（浏览器若拦截，点一下 ♪ 即可）
    if (wantOn) {
      audio.volume = 0.42;
      var pp = audio.play();
      if (pp && pp.catch) pp.catch(function () {});
    }
    syncFab();
  }

  /* ---------------- 旅途相册灯箱（DOM 由脚本生成，各页无需重复写） ---------------- */
  var gals = $$(".gal");
  if (gals.length) {
    var lb = document.createElement("div");
    lb.className = "lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.setAttribute("aria-label", t("照片大图", "Photo viewer"));
    lb.innerHTML =
      '<div class="lightbox__stage"><figure style="margin:0"><img alt="">' +
      '<figcaption><b></b><span></span></figcaption></figure></div>' +
      '<button class="lb-btn lb-close" type="button" aria-label="' + t("关闭", "Close") + '"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<button class="lb-btn lb-prev" type="button" aria-label="' + t("上一张", "Previous") + '"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button>' +
      '<button class="lb-btn lb-next" type="button" aria-label="' + t("下一张", "Next") + '"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>';
    document.body.appendChild(lb);

    var lbImg = $("img", lb), lbTitle = $("b", lb), lbDesc = $("span", lb);
    var cur = 0;

    // 每次都从 DOM 里现读，切换语言后灯箱文案自动跟着变
    function showPhoto(i) {
      cur = (i + gals.length) % gals.length;
      var el = gals[cur];
      var im = $("img", el);
      var b = $(".gal__cap b", el);
      var sp = $(".gal__cap span", el);
      if (im) {
        lbImg.setAttribute("src", im.getAttribute("src"));
        lbImg.setAttribute("alt", im.getAttribute("alt") || "");
      }
      lbTitle.textContent = b ? b.textContent : "";
      lbDesc.textContent = sp ? sp.textContent : "";
    }
    function openLb(i) {
      showPhoto(i);
      lb.classList.add("on");
      document.body.style.overflow = "hidden";
    }
    function closeLb() {
      lb.classList.remove("on");
      document.body.style.overflow = "";
    }

    gals.forEach(function (el, i) {
      el.addEventListener("click", function () { openLb(i); });
    });
    $(".lb-close", lb).addEventListener("click", closeLb);
    $(".lb-prev", lb).addEventListener("click", function () { showPhoto(cur - 1); });
    $(".lb-next", lb).addEventListener("click", function () { showPhoto(cur + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("on")) return;
      if (e.key === "Escape") closeLb();
      else if (e.key === "ArrowLeft") showPhoto(cur - 1);
      else if (e.key === "ArrowRight") showPhoto(cur + 1);
    });
  }

  /* ---------------- 回到顶部 ---------------- */
  var toTop = $("#toTop");
  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  }

  /* =========================================================
     首屏：滚动驱动的列车
     舞台高度 460vh，视口 sticky 100vh；
     滚动进度 p 决定列车位置、当前点亮站点与文案面板。
     ========================================================= */
  function initTrain() {
    var stage = $("#trainStage");
    if (!stage) return;

    var train = $("#train");
    var bar = $("#trainBar");
    var heroCopy = $("#heroCopy");
    var hint = $("#scrollHint");
    var stations = $$(".station", stage);
    var panels = $$(".station-panel", stage);
    var starsBox = $("#stars");
    var N = stations.length;
    if (!N) return;

    // 星空：用确定性伪随机生成，避免每次刷新位置乱跳
    if (starsBox) {
      var seed = 20250918;
      var rnd = function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
      var html = "";
      for (var i = 0; i < 90; i++) {
        var x = (rnd() * 100).toFixed(2);
        var y = (rnd() * 56).toFixed(2);
        var r = (rnd() * 1.15 + 0.35).toFixed(2);
        var o = (rnd() * 0.6 + 0.25).toFixed(2);
        html += '<circle cx="' + x + '%" cy="' + y + '%" r="' + r + '" fill="#EDF2F9" opacity="' + o + '"/>';
      }
      starsBox.innerHTML = html;
    }

    // 站点位置来自 HTML 的 left 百分比
    var xs = stations.map(function (s) {
      return parseFloat(s.style.left) || 0;
    });
    var first = xs[0], last = xs[xs.length - 1];

    var active = -1;
    var ticking = false;

    function update() {
      ticking = false;
      var rect = stage.getBoundingClientRect();
      var total = stage.offsetHeight - window.innerHeight;
      var p = total > 0 ? (-rect.top) / total : 0;
      p = Math.max(0, Math.min(1, p));

      var x = first + (last - first) * p;
      if (train) train.style.left = x.toFixed(3) + "%";
      if (bar) bar.style.width = (p * 100).toFixed(2) + "%";

      if (heroCopy) heroCopy.classList.toggle("is-out", p > 0.05);
      if (hint) hint.classList.toggle("is-out", p > 0.02);

      var idx = Math.round(p * (N - 1));
      idx = Math.max(0, Math.min(N - 1, idx));
      if (idx !== active) {
        active = idx;
        stations.forEach(function (s, i) {
          s.classList.toggle("is-active", i === idx);
          s.classList.toggle("is-past", i < idx);
        });
        panels.forEach(function (pn, i) { pn.classList.toggle("is-on", i === idx); });
      }
    }

    function onScroll() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("load", update);
    update();
  }

  /* ---------------- 全局滚动样式 ---------------- */
  var ticking2 = false;
  function onGlobalScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (toTop) toTop.classList.toggle("on", y > 700);
    ticking2 = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking2) { ticking2 = true; window.requestAnimationFrame(onGlobalScroll); }
  }, { passive: true });
  onGlobalScroll();

  initTrain();
})();
