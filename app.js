// わざのひと：スプレッドシート（CSV）を読み、3つのページを組み立てます。
(function () {
  'use strict';
  var C = window.WZ_CONFIG || {};
  var TEXT = window.WZ_TEXT;
  var page = document.body.getAttribute('data-page');
  var people = [];
  var lang = pickLang();

  // ---------- 言語 ----------
  function pickLang() {
    var q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'ja') return q;
    try { var s = localStorage.getItem('wz_lang'); if (s === 'en' || s === 'ja') return s; } catch (e) {}
    var nav = (navigator.language || 'ja').toLowerCase();
    return nav.indexOf('ja') === 0 ? 'ja' : 'en';
  }
  function setLang(l) {
    lang = l;
    try { localStorage.setItem('wz_lang', l); } catch (e) {}
    var u = new URL(location.href); u.searchParams.delete('lang'); history.replaceState(null, '', u);
    applyText(); render();
  }
  function t(key, vars) {
    var s = (TEXT[lang] && TEXT[lang][key]) || TEXT.ja[key] || '';
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  function applyText() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-t]').forEach(function (el) { el.textContent = t(el.getAttribute('data-t')); });
    document.querySelectorAll('[data-t-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-t-aria'))); });
    document.querySelectorAll('[data-logo]').forEach(function (el) {
      el.src = lang === 'en' ? 'assets/logo-en.png' : 'assets/logo.png';
      el.alt = t('siteName');
    });
    document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-lang-btn') === lang ? 'true' : 'false');
    });
  }

  // ---------- リンク・メニュー ----------
  function wireCommon() {
    var map = { torimich: C.torimichUrl, gururi: C.gururiUrl, instagram: C.instagramUrl, facebook: C.facebookUrl, youtube: C.youtubeUrl };
    document.querySelectorAll('[data-href]').forEach(function (a) { var u = map[a.getAttribute('data-href')]; if (u) a.href = u; });
    document.querySelectorAll('[data-lang-btn]').forEach(function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-lang-btn')); });
    });
    var menu = document.getElementById('menu'), fab = document.getElementById('fab');
    if (menu && fab) {
      fab.addEventListener('click', function () {
        var open = !menu.classList.contains('open');
        menu.classList.toggle('open', open);
        fab.setAttribute('aria-expanded', open ? 'true' : 'false');
        fab.innerHTML = open ? ICON_CLOSE : ICON_MENU;
        fab.setAttribute('aria-label', t(open ? 'close' : 'menu'));
      });
      menu.addEventListener('click', function (e) { if (e.target.closest('a')) { menu.classList.remove('open'); fab.innerHTML = ICON_MENU; } });
    }
  }
  var ICON_MENU = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14"/></svg>';
  var ICON_CLOSE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  // ---------- データ ----------
  function parseCSV(text) {
    var rows = [], row = [], cell = '', q = false;
    text = text.replace(/^﻿/, '');
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    var head = (rows.shift() || []).map(function (h) { return h.trim(); });
    return rows.filter(function (r) { return r.some(function (c) { return c.trim() !== ''; }); }).map(function (r) {
      var o = {}; head.forEach(function (h, i) { o[h] = (r[i] || '').trim(); }); return o;
    });
  }
  function list(s, re) { return (s || '').split(re).map(function (x) { return x.trim(); }).filter(Boolean); }
  function photo(v) { if (!v) return ''; return /^https?:\/\//.test(v) ? v : 'photos/' + v; }
  function toPerson(r) {
    var p = { raw: r };
    p.id = r['ID'];
    p.published = !/^(非公開|いいえ|no|false|0)$/i.test(r['公開'] || '');
    p.main = photo(r['メインの写真']);
    p.days = list(r['日々の様子の写真'], /[,、\n]+/).map(photo);
    p.map = r['地図のURL'];
    p.visit = r['会いに行くURL'];
    p.instagram = r['InstagramのURL'];
    return p;
  }
  function f(p, key) { // 言語に合わせた値（英語が空なら日本語）
    var r = p.raw;
    if (lang === 'en' && r[key + '_en']) return r[key + '_en'];
    return r[key] || '';
  }
  function load() {
    var url = C.sheetCsvUrl || 'data/people.csv';
    return fetch(url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error(res.status);
      return res.text();
    }).catch(function () {
      return fetch('data/people.csv', { cache: 'no-store' }).then(function (r) { return r.text(); });
    }).then(function (txt) {
      people = parseCSV(txt).map(toPerson).filter(function (p) { return p.id && p.published; });
    });
  }

  // ---------- 小さな部品 ----------
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function img(src, alt) {
    if (!src) return '<span class="nophoto">' + esc(t('noPhoto')) + '</span>';
    return '<img src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy" data-nfd="1">';
  }
  // Macから上げた日本語のファイル名（濁点が分かれた形）にも対応
  document.addEventListener('error', function (e) {
    var el = e.target;
    if (el.tagName === 'IMG' && el.getAttribute('data-nfd') === '1') {
      el.setAttribute('data-nfd', '2');
      var s = el.getAttribute('src'); var n = s.normalize('NFD');
      if (n !== s) el.src = n;
    }
  }, true);
  function personUrl(p) { return 'person.html?id=' + encodeURIComponent(p.id); }
  function sub(p) { return f(p, '技') + (f(p, '最寄り') ? (lang === 'en' ? ' · ' : '・') + f(p, '最寄り') : ''); }

  // ---------- ページごと ----------
  function render() {
    if (page === 'home') renderHome();
    if (page === 'person') renderPerson();
    if (page === 'about') renderAbout();
    renderMenu();
  }

  function renderMenu() {
    var box = document.getElementById('menu-people'); if (!box) return;
    box.innerHTML = people.map(function (p) {
      return '<a class="row" href="' + personUrl(p) + '"><b>' + esc(f(p, '名前')) + '</b><span>' + esc(f(p, '技')) + '</span></a>';
    }).join('');
  }

  var stripDone = false;
  function renderHome() {
    // 冒頭の写真の帯：全員のメインの写真と日々の様子の写真を、交互に並べる
    if (!stripDone) {
      var pools = people.map(function (p) { return [p.main].concat(p.days).filter(Boolean); });
      var pics = [], i = 0, more = true;
      while (more) { more = false; pools.forEach(function (arr) { if (arr[i]) { pics.push(arr[i]); more = true; } }); i++; }
      var drift = document.getElementById('drift'), stage = document.getElementById('stage');
      if (pics.length) {
        while (pics.length < 6) pics = pics.concat(pics);
        drift.innerHTML = pics.concat(pics).map(function (s) { return '<img src="' + esc(s) + '" alt="" data-nfd="1">'; }).join('');
      } else if (stage) stage.style.display = 'none';
      stripDone = true;
    }
    var box = document.getElementById('cards');
    box.innerHTML = people.map(function (p) {
      return '<article class="card hide">' +
        '<a href="' + personUrl(p) + '">' +
          '<span class="name">' + esc(f(p, '名前')) + '</span>' +
          '<span class="sub">' + esc(sub(p)) + '</span>' +
          '<span class="photo">' + img(p.main, f(p, 'メインの写真の説明')) + '</span>' +
          '<span class="hitokoto">' + esc(f(p, 'ひとこと')) + '</span>' +
        '</a>' +
        '<div class="acts">' +
          (p.visit ? '<a class="pill-main" href="' + esc(p.visit) + '" target="_blank" rel="noopener">' + esc(t('visit')) + '</a>' : '') +
          '<a class="textlink" href="' + personUrl(p) + '">' + esc(t('more')) + '</a>' +
        '</div>' +
      '</article>';
    }).join('');
    var cards = box.querySelectorAll('.card');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove('hide'); io.unobserve(e.target); } });
      }, { threshold: 0.15 });
      cards.forEach(function (c) { io.observe(c); });
    } else cards.forEach(function (c) { c.classList.remove('hide'); });
  }

  function renderAbout() {
    // 2番目・3番目の方のメインの写真を使う（人が少ないときは1番目から）
    var withPhoto = people.filter(function (p) { return p.main; });
    [1, 2].forEach(function (n, i) {
      var box = document.getElementById('about-photo-' + n); if (!box) return;
      var p = withPhoto[(i + 1) % Math.max(withPhoto.length, 1)];
      if (p) box.innerHTML = img(p.main, f(p, 'メインの写真の説明')); else box.style.display = 'none';
    });
  }

  function renderPerson() {
    var id = new URLSearchParams(location.search).get('id');
    var p = people.filter(function (x) { return x.id === id; })[0] || people[0];
    var main = document.getElementById('person');
    if (!p) { main.innerHTML = '<p class="wrap">' + esc(t('notFound')) + '</p>'; return; }
    var name = f(p, '名前');
    document.title = name + ' | ' + t('siteName');
    var words = list(f(p, 'ことば'), /\n+/);
    var caps = list(f(p, '日々の様子の説明'), /\n+/);
    var address = f(p, '住所'), placeName = f(p, '会える場所の名前');
    var mapQ = (p.raw['住所'] || '') || placeName;
    var reviews = p.map || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((placeName + ' ' + (p.raw['住所'] || '')).trim()));
    var label = (p.raw['技の英字ラベル'] || '').toUpperCase();
    var visitBtn = p.visit ? '<a class="pill-main block" href="' + esc(p.visit) + '" target="_blank" rel="noopener">' + esc(t('visit')) + '</a>' : '';
    var others = people.filter(function (x) { return x !== p; });

    main.innerHTML =
      '<section style="padding:44px 16px 0">' +
        '<div class="in1" style="padding:0 12px">' +
          (label ? '<p class="label">（ ' + esc(label) + ' ）　' + esc(f(p, '技')) + '</p>' : '') +
          '<h1 style="margin:10px 0 0;font-size:30px;font-weight:700;letter-spacing:.03em">' + esc(name) + '</h1>' +
          '<p style="margin:4px 0 0;font-size:14px;color:var(--sub)">' + esc(sub(p)) + '</p>' +
        '</div>' +
        '<div class="hero-photo in2">' + img(p.main, f(p, 'メインの写真の説明')) + '</div>' +
        '<div style="padding:0 12px">' +
          '<p style="margin:20px 0 0;font-family:var(--mincho);font-weight:600;font-size:20px;line-height:1.8">' + esc(f(p, 'ひとこと')) + '</p>' +
          (visitBtn ? '<div style="margin-top:24px">' + visitBtn + '</div>' : '') +
          (f(p, '行き先の案内') ? '<p style="margin:10px 0 0;max-width:420px;text-align:center;font-size:12px;color:var(--sub)">' + esc(f(p, '行き先の案内')) + '</p>' : '') +
        '</div>' +
      '</section>' +

      (words.length ? '<section id="kotoba" style="padding:80px 28px 0"><p class="label">（ 01 ）　WORDS</p><h2 class="sec">' + esc(t('wordsH', { name: name })) + '</h2>' +
        '<div class="words">' + words.map(function (w) { return '<p>' + esc(w) + '</p>'; }).join('') + '</div></section>' : '') +

      ((p.days.length || p.instagram) ? '<section style="padding:80px 0 0"><div style="padding:0 28px"><p class="label">（ 02 ）　DAYS</p><h2 class="sec">' + esc(t('daysH')) + '</h2>' +
        (p.days.length ? '<p style="margin:10px 0 0;font-size:13px;line-height:2;color:var(--sub)">' + esc(t('daysNote', { name: name })) + '</p>' : '') + '</div>' +
        (p.days.length ? '<div class="rail" style="margin-top:24px">' + p.days.map(function (s, i) {
          return '<figure><div class="ph">' + img(s, caps[i] || '') + '</div>' + (caps[i] ? '<figcaption>' + esc(caps[i]) + '</figcaption>' : '') + '</figure>';
        }).join('') + '</div>' : '') +
        (p.instagram ? '<div style="padding:24px 28px 0"><a class="pill" href="' + esc(p.instagram) + '" target="_blank" rel="noopener" style="max-width:420px">' + esc(t('insta')) + '</a></div>' : '') +
      '</section>' : '') +

      (mapQ ? '<section id="place" style="padding:80px 16px 0"><div style="padding:0 12px"><p class="label">（ 03 ）　PLACE</p><h2 class="sec">' + esc(t('placeH')) + '</h2></div>' +
        '<div class="map"><iframe title="' + esc(placeName || t('placeH')) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=' + encodeURIComponent(mapQ) + '&output=embed&hl=' + lang + '"></iframe></div>' +
        '<div style="padding:0 12px">' +
          (placeName ? '<p style="margin:18px 0 0;font-size:16px;font-weight:700">' + esc(placeName) + '</p>' : '') +
          (address ? '<p style="margin:6px 0 0;font-size:13px;line-height:1.9;color:var(--sub)">' + esc(address) + '</p>' : '') +
          '<a class="pill" href="' + esc(reviews) + '" target="_blank" rel="noopener" style="margin-top:20px;max-width:420px">' + esc(t('reviews')) + '</a>' +
          (visitBtn ? '<div style="margin-top:12px">' + visitBtn + '</div>' : '') +
        '</div></section>' : '') +

      (others.length ? '<section style="padding:96px 0 0"><div style="padding:0 28px"><p class="label">（ OTHERS ）</p><h2 class="sec pre">' + esc(t('othersH')) + '</h2></div>' +
        '<div class="rail" style="margin-top:24px;gap:16px">' + others.map(function (o) {
          return '<a class="other" href="' + personUrl(o) + '"><span style="font-size:17px;font-weight:700">' + esc(f(o, '名前')) + '</span>' +
            '<span style="margin-top:2px;font-size:12px;color:var(--sub)">' + esc(sub(o)) + '</span>' +
            '<span class="ph">' + img(o.main, f(o, 'メインの写真の説明')) + '</span>' +
            '<span style="margin-top:12px;font-family:var(--mincho);font-weight:600;font-size:14px;line-height:1.8">' + esc(f(o, 'ひとこと')) + '</span></a>';
        }).join('') + '</div></section>' : '') +

      '<div style="padding:40px 28px 0"><a class="pill" href="index.html" style="max-width:420px">' + esc(t('back')) + '</a></div>';

    var inPage = document.getElementById('menu-this');
    if (inPage) inPage.innerHTML =
      (words.length ? '<a class="plain" href="#kotoba">' + esc(t('wordsH', { name: name })) + '</a>' : '') +
      (mapQ ? '<a class="plain" href="#place">' + esc(t('placeH')) + '</a>' : '');
  }

  // ---------- はじめに ----------
  applyText();
  wireCommon();
  var loadingEl = document.getElementById('loading');
  load().then(function () { if (loadingEl) loadingEl.remove(); render(); })
    .catch(function () { if (loadingEl) loadingEl.textContent = t('notFound'); });
})();
