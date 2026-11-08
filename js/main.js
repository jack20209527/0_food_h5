/* ==========================================================
   至味人间 · H5 交互脚本
   揭幕 / 金色粒子 / 整屏滚动 / 视差 / 入场编排 / 键盘翻页
   ========================================================== */
(function () {
  'use strict';

  var body = document.body;
  var loader = document.getElementById('loader');
  var progress = document.getElementById('progress');
  var dots = Array.prototype.slice.call(document.querySelectorAll('#dots a'));
  var backTop = document.getElementById('backTop');
  var screens = Array.prototype.slice.call(document.querySelectorAll('.screen'));
  var canvas = document.getElementById('particles');
  var ctx = canvas.getContext('2d');

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 开场揭幕 ---------- */
  window.addEventListener('load', function () {
    setTimeout(function () {
      loader.classList.add('done');
      body.classList.remove('is-loading');
      body.classList.add('ready');
    }, reducedMotion ? 150 : 1900);
  });
  // 兜底：load 事件被图片拖太久时，最多 4.5s 强制揭幕
  setTimeout(function () {
    loader.classList.add('done');
    body.classList.remove('is-loading');
    body.classList.add('ready');
  }, 4500);

  /* ---------- 入场编排：给每屏的 reveal 元素设置阶梯延迟 ---------- */
  screens.forEach(function (sec) {
    var items = sec.querySelectorAll('.reveal');
    Array.prototype.forEach.call(items, function (el, i) {
      el.style.setProperty('--d', Math.min(i * 110, 880) + 'ms');
    });
  });

  /* ---------- 屏幕进入检测 ---------- */
  var current = 0;

  function markIn(entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add('in-view');
      }
    });
  }
  var inView = new IntersectionObserver(markIn, {
    // 窄屏时每屏内容更高，降低触发阈值让揭示动画来得更从容
    threshold: window.innerWidth < 881 ? 0.1 : 0.28
  });
  screens.forEach(function (s) { inView.observe(s); });

  function syncNav() {
    var mid = window.innerHeight * 0.5;
    var idx = 0;
    screens.forEach(function (s, i) {
      var r = s.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) idx = i;
    });
    if (idx !== current) {
      current = idx;
      dots.forEach(function (d, i) {
        d.classList.toggle('active', i === idx);
      });
      // 菜品屏把粒子调淡，序章/尾声最梦幻
      var sec = screens[idx];
      body.classList.toggle('dim-particles', sec.classList.contains('dish'));
    }
  }

  /* ---------- 进度条 + 视差（rAF 节流） ---------- */
  var ticking = false;

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  function update() {
    ticking = false;

    // 阅读进度
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? window.pageYOffset / max : 0) + ')';

    syncNav();

    // 回到顶部按钮：滚过约 0.7 屏后浮现
    if (backTop) {
      backTop.classList.toggle('show', window.pageYOffset > window.innerHeight * 0.7);
    }

    if (reducedMotion) return;

    // 视差：图片轻移，背景水印反向慢移
    var vh = window.innerHeight;
    screens.forEach(function (sec) {
      var r = sec.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) return;
      var p = (r.top + r.height / 2 - vh / 2) / vh; // -0.5 ~ 0.5 越居中越接近 0
      var clip = sec.querySelector('.img-clip');
      if (clip) clip.style.transform = 'translateY(' + (p * -46).toFixed(1) + 'px)';
      var wm = sec.querySelector('.dish-watermark');
      if (wm) wm.style.transform = 'translateY(calc(-50% + ' + (p * 90).toFixed(1) + 'px))';
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();

  /* ---------- 键盘 / 滚轮整屏翻页辅助 ---------- */
  var animId = null;

  // rAF 自实现平滑滚动：mandatory snap 会把程序化滚动强制拉回原 snap 点，
  // 翻页期间临时禁用 snap，动画结束精确落点后再恢复。
  // 另设 setTimeout 兜底：页面切后台时 rAF 停滞，也能保证最终落点与 snap 状态收敛
  function animateScrollTo(target, duration) {
    if (reducedMotion) { window.scrollTo(0, target); return; }
    duration = duration || 900;
    var root = document.documentElement;
    root.style.scrollSnapType = 'none';
    var start = window.pageYOffset;
    var diff = target - start;
    if (Math.abs(diff) < 2) { window.scrollTo(0, target); restoreSnap(); return; }
    if (animId) cancelAnimationFrame(animId);
    if (safetyTimer) clearTimeout(safetyTimer);
    var finished = false;
    var t0 = performance.now();

    var safetyTimer = setTimeout(function () {
      if (finished) return;
      finished = true;
      if (animId) cancelAnimationFrame(animId);
      animId = null;
      window.scrollTo(0, target);
      restoreSnap();
    }, duration + 250);

    var step = function (now) {
      if (finished) return;
      var t = Math.min(1, (now - t0) / duration);
      var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      window.scrollTo(0, start + diff * e);
      if (t < 1) {
        animId = requestAnimationFrame(step);
      } else {
        finished = true;
        clearTimeout(safetyTimer);
        animId = null;
        window.scrollTo(0, target);
        restoreSnap();
      }
    };
    animId = requestAnimationFrame(step);
  }

  function restoreSnap() {
    requestAnimationFrame(function () {
      document.documentElement.style.scrollSnapType = '';
    });
  }

  function goTo(i) {
    i = Math.max(0, Math.min(screens.length - 1, i));
    animateScrollTo(screens[i].offsetTop);
  }

  document.addEventListener('keydown', function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    switch (e.key) {
      case 'ArrowDown': case 'PageDown': case ' ':
        e.preventDefault(); goTo(current + 1); break;
      case 'ArrowUp': case 'PageUp':
        e.preventDefault(); goTo(current - 1); break;
      case 'Home': e.preventDefault(); goTo(0); break;
      case 'End': e.preventDefault(); goTo(screens.length - 1); break;
    }
  });

  dots.forEach(function (d, i) {
    d.addEventListener('click', function (e) {
      e.preventDefault();
      goTo(i);
    });
  });

  if (backTop) {
    backTop.addEventListener('click', function () {
      animateScrollTo(0, 1100);
    });
  }

  /* ---------- 金色粒子 ---------- */
  var particles = [];
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;

  function resizeCanvas() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn() {
    return {
      x: Math.random() * W,
      y: H + Math.random() * H * 0.3,
      r: 0.6 + Math.random() * 1.9,
      vy: 0.12 + Math.random() * 0.42,
      vx: (Math.random() - 0.5) * 0.16,
      a: 0.12 + Math.random() * 0.5,
      tw: Math.random() * Math.PI * 2,
      ts: 0.008 + Math.random() * 0.02
    };
  }

  function initParticles() {
    resizeCanvas();
    var n = window.innerWidth < 700 ? 34 : 64;
    particles = [];
    for (var i = 0; i < n; i++) {
      var p = spawn();
      p.y = Math.random() * H; // 初始铺满全屏
      particles.push(p);
    }
  }

  function tickParticles() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.y -= p.vy;
      p.x += p.vx;
      p.tw += p.ts;
      if (p.y < -12 || p.x < -12 || p.x > W + 12) {
        particles[i] = spawn();
        continue;
      }
      var alpha = p.a * (0.55 + 0.45 * Math.sin(p.tw));
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.2);
      g.addColorStop(0, 'rgba(242, 221, 160, ' + alpha.toFixed(3) + ')');
      g.addColorStop(0.4, 'rgba(217, 180, 91, ' + (alpha * 0.5).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(217, 180, 91, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!document.hidden) requestAnimationFrame(tickParticles);
  }

  if (!reducedMotion) {
    initParticles();
    requestAnimationFrame(tickParticles);
    window.addEventListener('resize', function () {
      resizeCanvas();
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) requestAnimationFrame(tickParticles);
    });
  }
})();
