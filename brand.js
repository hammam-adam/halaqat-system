// الهوية والمظهر: اسم المجمع والشعار وألوان الموقع، والوضع الفاتح والداكن.
// يُحمَّل من config.js قبل app.js، فيطبّق آخر هوية محفوظة فورًا ثم يحدّثها من قاعدة البيانات.
(function(){
  const CFG = window.APP_CONFIG;
  const KEY = "halaqat.brand", MODE_KEY = "halaqat.mode";
  const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

  /* شعار عام يظهر حتى يرفع المجمع شعاره (قوس مسجد وفيه مصحف مفتوح) */
  const DEFAULT_MARK = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 381 520"><path fill-rule="evenodd" d="M30 500V250C30 150 110 70 190.5 20C271 70 351 150 351 250V500ZM95 430L190.5 400L286 430V300L190.5 270L95 300ZM120 320L178 302V392L120 410ZM203 302L261 320V410L203 392Z"/></svg>');

  /* ثيمات جاهزة: h درجة اللون الأساسي، s تشبّعه، a درجة اللون الذهبي المرافق */
  const THEMES = {
    brown:  { name: "بني",      h: 25,  s: 48, a: 36 },
    green:  { name: "أخضر",     h: 158, s: 45, a: 40 },
    teal:   { name: "فيروزي",   h: 186, s: 50, a: 34 },
    blue:   { name: "أزرق",     h: 214, s: 48, a: 38 },
    purple: { name: "بنفسجي",   h: 268, s: 32, a: 40 },
    maroon: { name: "عنابي",    h: 350, s: 46, a: 36 },
    slate:  { name: "رمادي",    h: 215, s: 14, a: 38 }
  };

  const hsl = (h, s, l, al) => `hsl(${Math.round(h)} ${Math.round(s)}% ${l}%${al != null ? " / " + al : ""})`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function palette(t, dark){
    const h = t.h, s = clamp(t.s, 8, 62), a = t.a;
    if (!dark) return {
      "--bg": hsl(h, 12, 95.5), "--surface": "#ffffff", "--surface-2": hsl(h, 14, 97.2), "--line": hsl(h, 15, 90.5), "--line-strong": hsl(h, 13, 81),
      "--fg": hsl(h, 22, 9), "--muted": hsl(h, 9, 39), "--faint": hsl(h, 7, 59),
      "--brand": hsl(h, s, 20), "--brand-ink": "#ffffff", "--brand-soft": hsl(h, Math.min(45, s), 94),
      "--gold": hsl(a, 46, 48), "--gold-hi": hsl(a, 56, 61), "--gold-soft": hsl(a, 62, 93),
      "--side": hsl(h, s * .95, 11), "--side-2": hsl(h, s * .75, 16), "--side-fg": hsl(h, Math.min(50, s + 5), 90.5), "--side-muted": hsl(h, s * .45, 62), "--side-line": hsl(h, 45, 90, .09),
      "--inc": "#118463", "--exp": "#c7792f", "--warnc": "#b07d12", "--info": "#3d6a8a",
      "--good": "#18794e", "--good-bg": "#e8f3ec", "--warn": "#8a5d00", "--warn-bg": "#faf0d7", "--bad": "#b4372c", "--bad-bg": "#fbe9e6",
      "--shadow": "0 1px 2px rgba(28,23,18,.04),0 2px 8px rgba(28,23,18,.04)",
      "--shadow-lg": "0 4px 12px rgba(28,23,18,.08),0 24px 48px rgba(28,23,18,.16)",
      "color-scheme": "light"
    };
    return {
      "--bg": hsl(h, 6, 6.5), "--surface": hsl(h, 6, 9.6), "--surface-2": hsl(h, 7, 11.2), "--line": hsl(h, 7, 17), "--line-strong": hsl(h, 8, 24.5),
      "--fg": hsl(h, 18, 91.5), "--muted": hsl(h, 6, 63), "--faint": hsl(h, 5, 45),
      "--brand": hsl(h, Math.min(58, s + 12), 75), "--brand-ink": hsl(h, 50, 7), "--brand-soft": hsl(h, s * .45, 14),
      "--gold": hsl(a, 56, 61), "--gold-hi": hsl(a, 56, 61), "--gold-soft": hsl(a, 28, 14),
      "--side": hsl(h, s * .4, 4), "--side-2": hsl(h, s * .45, 8), "--side-fg": hsl(h, Math.min(45, s), 89), "--side-muted": hsl(h, s * .4, 56), "--side-line": hsl(h, 40, 89, .08),
      "--inc": "#2fa883", "--exp": "#c98238", "--warnc": "#d9a63c", "--info": "#79a7c7",
      "--good": "#5cc496", "--good-bg": "#17291f", "--warn": "#e0b45a", "--warn-bg": "#342a15", "--bad": "#ef8a7f", "--bad-bg": "#3a1e1a",
      "--shadow": "0 1px 2px rgba(0,0,0,.3)",
      "--shadow-lg": "0 4px 12px rgba(0,0,0,.35),0 24px 48px rgba(0,0,0,.5)",
      "color-scheme": "dark"
    };
  }

  /* يستخرج اللون الغالب من الشعار ولونًا ثانيًا مختلفًا عنه */
  function colorsFrom(src){
    return new Promise(ok => {
      const img = new Image();
      img.onload = () => {
        const n = 72, cv = document.createElement("canvas"); cv.width = cv.height = n;
        const g = cv.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0, n, n);
        let d; try { d = g.getImageData(0, 0, n, n).data; } catch (e) { return ok(null); }
        const bins = new Array(36).fill(0), sat = new Array(36).fill(0);
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 140) continue;
          const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2, c = mx - mn;
          if (c < .08 || l < .08 || l > .94) continue;
          const s = c / (1 - Math.abs(2 * l - 1));
          let h = mx === r ? ((gg - b) / c) % 6 : mx === gg ? (b - r) / c + 2 : (r - gg) / c + 4; h = (h * 60 + 360) % 360;
          const w = s * (1 - Math.abs(l - .45));
          bins[Math.floor(h / 10)] += w; sat[Math.floor(h / 10)] += s * w;
        }
        const total = bins.reduce((x, y) => x + y, 0);
        if (total < 2) return ok({ h: 215, s: 14, a: 38, gray: true });
        const sm = bins.map((v, i) => v + .5 * (bins[(i + 35) % 36] + bins[(i + 1) % 36]));
        const i1 = sm.indexOf(Math.max(...sm));
        const dist = i => Math.min(Math.abs(i - i1), 36 - Math.abs(i - i1));
        let i2 = -1, best = 0; sm.forEach((v, i) => { if (dist(i) >= 4 && v > best && v > total * .08) { best = v; i2 = i; } });
        const h = i1 * 10 + 5, s = clamp(sat[i1] / (bins[i1] || 1) * 70, 22, 58);
        ok({ h, s: Math.round(s), a: i2 >= 0 ? i2 * 10 + 5 : (h >= 15 && h <= 60 ? h + 10 : 38) });
      };
      img.onerror = () => ok(null);
      img.src = src;
    });
  }

  let B = null;
  try { B = JSON.parse(read(KEY) || "null"); } catch (e) {}
  B = B || {};
  const mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  const mode = () => read(MODE_KEY) || "system";
  const isDark = () => mode() === "dark" || (mode() === "system" && !!mq?.matches);

  function themeOf(b){
    if (b.theme === "auto") { try { const t = JSON.parse(b.theme_auto || ""); if (t && t.h != null) return t; } catch (e) {} }
    return THEMES[b.theme] || THEMES.brown;
  }

  const css = document.createElement("style"); css.id = "brandCss";
  document.head.appendChild(css);
  function apply(b){
    b = b || B;
    const root = document.documentElement, p = palette(themeOf(b), isDark());
    for (const k in p) root.style.setProperty(k, p[k]);
    root.dataset.mode = isDark() ? "dark" : "light";
    const logo = b.logo || "";
    css.textContent = logo
      ? `.mark{aspect-ratio:1/1!important;-webkit-mask:none!important;mask:none!important;background:url("${logo}") center/contain no-repeat!important}.print-head img{content:url("${logo}")}`
      : `.mark{-webkit-mask-image:url("${DEFAULT_MARK}")!important;mask-image:url("${DEFAULT_MARK}")!important}.print-head img{content:url("${DEFAULT_MARK}")}`;
    let fav = document.querySelector('link[rel="icon"]');
    if (!fav) { fav = document.createElement("link"); fav.rel = "icon"; document.head.appendChild(fav); }
    fav.href = logo || DEFAULT_MARK;
    const meta = document.querySelector('meta[name="theme-color"]') || document.head.appendChild(Object.assign(document.createElement("meta"), { name: "theme-color" }));
    meta.content = p["--side"];
    if (b.org_name) {
      CFG.orgName = b.org_name;
      document.title = b.org_name + " · النظام المالي";
      document.querySelectorAll(".auth-art h1, .auth-head h1").forEach(el => el.textContent = b.org_name);
      const o = document.getElementById("orgName"); if (o && !(window.S && S.settings && S.settings.orgName)) o.textContent = b.org_name;
    }
    if (b.tagline != null) {
      CFG.tagline = b.tagline;
      document.querySelectorAll("[data-tagline], .auth-tag").forEach(el => el.textContent = b.tagline);
    }
  }
  apply();
  mq?.addEventListener?.("change", () => { if (mode() === "system") apply(); });

  async function refresh(){
    try {
      const r = await fetch(CFG.supabaseUrl + "/rest/v1/rpc/brand_get", { method: "POST",
        headers: { apikey: CFG.supabaseKey, Authorization: "Bearer " + CFG.supabaseKey, "Content-Type": "application/json" }, body: "{}" });
      if (!r.ok) return;
      const b = await r.json(); if (!b || typeof b !== "object") return;
      B = b; write(KEY, JSON.stringify(b)); apply();
    } catch (e) {}
  }
  refresh();
  /* app.js يرسم شاشة الدخول بعد هذا الملف؛ نعيد التطبيق حين تظهر */
  document.addEventListener("DOMContentLoaded", () => apply());
  new MutationObserver(() => { if (document.querySelector(".auth-art h1") && B.org_name && document.querySelector(".auth-art h1").textContent !== B.org_name) apply(); })
    .observe(document.body || document.documentElement, { childList: true, subtree: true });

  window.Brand = {
    THEMES, palette, colorsFrom, apply, refresh,
    get: () => B,
    preview: b => apply({ ...B, ...b }),
    mode, setMode(m){ write(MODE_KEY, m); apply(); document.querySelectorAll("[data-mode-pick]").forEach(x => x.setAttribute("aria-pressed", x.dataset.modePick === m)); },
    save(b){ B = { ...B, ...b }; write(KEY, JSON.stringify(B)); apply(); }
  };
})();
