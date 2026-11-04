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
    green:  { name: "زمردي",    h: 160, s: 62, a: 42 },
    teal:   { name: "فيروزي",   h: 184, s: 64, a: 36 },
    blue:   { name: "أزرق",     h: 212, s: 66, a: 38 },
    indigo: { name: "نيلي",     h: 234, s: 52, a: 40 },
    purple: { name: "بنفسجي",   h: 266, s: 46, a: 40 },
    maroon: { name: "عنابي",    h: 346, s: 58, a: 36 },
    brown:  { name: "بني",      h: 26,  s: 52, a: 40 },
    amber:  { name: "كهرماني",  h: 36,  s: 72, a: 22 },
    slate:  { name: "رمادي",    h: 215, s: 18, a: 38 }
  };

  const hsl = (h, s, l, al) => `hsl(${Math.round(h)} ${Math.round(s)}% ${l}%${al != null ? " / " + al : ""})`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  /* لون الهوية واضح وحيوي في الوضعين: أغمق قليلًا في الفاتح ليقرأ عليه النص الأبيض، وأفتح في الداكن ليبان على الخلفية */
  function palette(t, dark){
    const h = t.h, s = clamp(t.s, 8, 74), a = t.a;
    if (!dark) return {
      "--bg": hsl(h, Math.min(20, s * .3), 96), "--surface": "#ffffff", "--surface-2": hsl(h, Math.min(24, s * .35), 97.6), "--line": hsl(h, Math.min(18, s * .3), 90), "--line-strong": hsl(h, Math.min(14, s * .25), 80),
      "--fg": hsl(h, 20, 10), "--muted": hsl(h, 10, 38), "--faint": hsl(h, 8, 56),
      "--brand": hsl(h, s, 30), "--brand-ink": "#ffffff", "--brand-soft": hsl(h, Math.min(60, s), 94),
      "--gold": hsl(a, 62, 44), "--gold-hi": hsl(a, 72, 62), "--gold-soft": hsl(a, 70, 93),
      "--side": hsl(h, s * .75, 15), "--side-2": hsl(h, s * .65, 21), "--side-fg": hsl(h, Math.min(40, s), 94), "--side-muted": hsl(h, s * .4, 72), "--side-line": hsl(h, 40, 90, .1),
      "--inc": "#0f8a64", "--exp": "#c46a1c", "--warnc": "#b07d12", "--info": "#2f6fa3",
      "--good": "#15784c", "--good-bg": "#e6f4ec", "--warn": "#8a5d00", "--warn-bg": "#fbf0d4", "--bad": "#b3362a", "--bad-bg": "#fbe8e5",
      "--shadow": "0 1px 2px rgba(20,20,30,.04),0 2px 8px rgba(20,20,30,.04)",
      "--shadow-lg": "0 4px 12px rgba(20,20,30,.08),0 24px 48px rgba(20,20,30,.16)",
      "color-scheme": "light"
    };
    return {
      "--bg": hsl(h, Math.min(18, s * .3), 7), "--surface": hsl(h, Math.min(16, s * .28), 10.5), "--surface-2": hsl(h, Math.min(16, s * .28), 13), "--line": hsl(h, Math.min(14, s * .25), 19), "--line-strong": hsl(h, Math.min(14, s * .25), 27),
      "--fg": hsl(h, 16, 93), "--muted": hsl(h, 10, 70), "--faint": hsl(h, 7, 52),
      "--brand": hsl(h, Math.min(72, s + 8), 62), "--brand-ink": hsl(h, 50, 8), "--brand-soft": hsl(h, s * .5, 17),
      "--gold": hsl(a, 66, 62), "--gold-hi": hsl(a, 70, 66), "--gold-soft": hsl(a, 34, 15),
      "--side": hsl(h, s * .5, 9), "--side-2": hsl(h, s * .5, 14), "--side-fg": hsl(h, Math.min(40, s), 92), "--side-muted": hsl(h, s * .3, 66), "--side-line": hsl(h, 40, 90, .08),
      "--inc": "#3cbf94", "--exp": "#e0924a", "--warnc": "#e2b04a", "--info": "#7fb0d6",
      "--good": "#5cc99a", "--good-bg": "#14291f", "--warn": "#e6bb5f", "--warn-bg": "#332914", "--bad": "#f08c80", "--bad-bg": "#3a1d19",
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
        const h = i1 * 10 + 5, s = clamp(sat[i1] / (bins[i1] || 1) * 76, 30, 68);
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
