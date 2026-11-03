// صفحة الإعدادات: حسابي (كلمة المرور)، المظهر (الوضع لكل مستخدم، والهوية والألوان للمدير)،
// والمستخدمون وربط واتساب عبر WasenderAPI (للمدير فقط).
(function(){
  const css = document.createElement("style");
  css.textContent = `
.sys-panel{margin-top:18px}
.sys-panel .ss-body{padding:18px 20px;display:grid;gap:16px}
.sys-panel .ss-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.sys-panel .field{display:grid;gap:6px}
.sys-panel .hint{font-size:12.5px;color:var(--muted);line-height:1.7;margin:0}
.sys-panel .ss-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.sys-panel .ss-status{font-size:13px;color:var(--muted)}
.sys-panel .ss-status.good{color:var(--good)}.sys-panel .ss-status.bad{color:var(--bad)}
.sys-panel input[type=password]{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface);color:var(--fg);font:inherit;min-height:42px}
.sys-panel .lbl{font-weight:600;font-size:13.5px}
.logo-row{display:flex;flex-wrap:wrap;align-items:center;gap:14px}
.logo-prev{width:84px;height:84px;border-radius:16px;display:grid;place-items:center;background:var(--side);padding:10px;flex:none}
.logo-prev .mark{width:56px;background:var(--side-fg)}
.swatches{display:flex;flex-wrap:wrap;gap:10px}
.swatch{display:grid;justify-items:center;gap:6px;padding:8px;border:1px solid var(--line);border-radius:12px;background:var(--surface);cursor:pointer;min-width:78px;font:inherit;color:inherit}
.swatch[aria-pressed="true"]{border-color:var(--brand);box-shadow:0 0 0 2px var(--brand-soft)}
.swatch:disabled{opacity:.45;cursor:not-allowed}
.swatch i{display:block;width:46px;height:30px;border-radius:8px;position:relative;overflow:hidden}
.swatch i b{position:absolute;inset-inline-start:0;bottom:0;width:100%;height:9px}
.swatch span{font-size:12px}
.seg.mode-seg button{padding:6px 10px;font-size:12.5px}
.set-tabs{display:flex;flex-wrap:nowrap;overflow-x:auto;margin-bottom:16px;width:fit-content;max-width:100%}
.set-tabs button{padding:8px 16px;white-space:nowrap;flex:1 0 auto}
@media (max-width:560px){.set-tabs{width:100%}.set-tabs button{padding:8px 10px}}
.set-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:14px}
.set-row .hint{margin:0;font-size:13px;color:var(--muted);line-height:1.7;max-width:60ch}
.sys-panel:first-child{margin-top:0}
.pw-init{display:inline-flex;gap:6px;align-items:center;font-size:12.5px}
.pw-init code{font-family:ui-monospace,monospace;background:var(--surface-2);border:1px solid var(--line);border-radius:6px;padding:1px 6px;direction:ltr}
.wa-steps{margin:0;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)}
.wa-steps summary{cursor:pointer;font-weight:600}
.wa-steps ol{margin:12px 0 0;padding-inline-start:22px;display:grid;gap:8px;line-height:1.8;font-size:13.5px}
.wa-steps .note{margin-top:12px;padding:10px 12px;border-radius:10px;background:var(--warn-bg);color:var(--warn);font-size:13px;line-height:1.8}
.wa-steps a{color:var(--brand);font-weight:600}`;
  document.head.appendChild(css);

  const MSG = {
    bad_name: "اكتب اسم المجمع (من حرفين إلى 80 حرفًا).",
    bad_tagline: "السطر التعريفي طويل. اختصره إلى 120 حرفًا.",
    bad_logo: "تعذّر حفظ الشعار. جرّب صورة PNG أو JPG أصغر.",
    bad_theme: "تعذّر حفظ الألوان.",
    bad_phone: "اكتب رقم جوال سعودي صحيح، مثل 05XXXXXXXX.",
    bad_key: "المفتاح غير صحيح. انسخه كاملًا من لوحة WasenderAPI.",
    forbidden: "هذه الإعدادات لمدير النظام فقط.",
    sender_not_configured: "لم يُضف مفتاح WasenderAPI بعد.",
    network: "تعذّر الاتصال. أعد المحاولة."
  };
  const say = (id, cls, text) => { const el = document.getElementById(id); if (el) { el.className = "ss-status " + cls; el.textContent = text; } };
  const MODES = [["light", "فاتح"], ["dark", "داكن"], ["system", "تلقائي"]];
  const modeSeg = () => `<div class="seg mode-seg" role="group" aria-label="وضع العرض">${MODES.map(([k, t]) => `<button type="button" data-mode-pick="${k}" aria-pressed="${Brand.mode() === k}"${k === "system" ? ' title="يتبع إعداد الجهاز"' : ""}>${t}</button>`).join("")}</div>`;
  document.addEventListener("click", e => { const b = e.target.closest("[data-mode-pick]"); if (b) Brand.setMode(b.dataset.modePick); });

  /* ---------- صفحة الإعدادات: حسابي، المظهر، المستخدمون، واتساب ---------- */
  const GEAR = `<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`;
  const navSet = document.getElementById("navUsers");
  if (navSet) { navSet.dataset.view = "settings"; navSet.innerHTML = GEAR + "الإعدادات"; navSet.hidden = false; }
  const TABS = [["account", "حسابي", false], ["look", "المظهر", false], ["users", "المستخدمون", true], ["wa", "واتساب", true]];
  let tab = "account";
  try { tab = localStorage.getItem("halaqat.setTab") || "account"; } catch (e) {}
  const tabsFor = () => TABS.filter(t => !t[2] || S.isAdmin);

  views.settings = {
    shell(){
      if (!tabsFor().some(t => t[0] === tab)) tab = "account";
      return `<div class="page">${pageHead("الإعدادات", "حسابك وكلمة المرور، ومظهر الموقع" + (S.isAdmin ? "، والمستخدمون وربط واتساب." : "."), "")}
<div class="seg set-tabs" role="tablist">${tabsFor().map(([k, t]) => `<button type="button" role="tab" data-set-tab="${k}" aria-pressed="${k === tab}">${t}</button>`).join("")}</div>
<div id="setBody"></div></div>`;
    },
    bind(){
      $(".set-tabs").onclick = e => { const b = e.target.closest("[data-set-tab]"); if (!b) return; tab = b.dataset.setTab; try { localStorage.setItem("halaqat.setTab", tab); } catch (x) {}
        document.querySelectorAll("[data-set-tab]").forEach(x => x.setAttribute("aria-pressed", x === b)); paintTab(); };
      paintTab();
    },
    fill(){ if (tab === "users" && $("#memberList")) views.users.fill(); }
  };
  function paintTab(){
    const body = $("#setBody"); if (!body) return;
    if (tab === "users") {
      body.innerHTML = `<div class="set-row"><p class="hint">الأرقام المسموح لها بالدخول. كل مستخدم يدخل بكلمة المرور أو برمز يصله على واتساب. اضغط على المستخدم لتعديله أو لتعيين كلمة مرور جديدة له.</p><button class="btn primary" type="button" id="addMember">${ICON.plus}مستخدم جديد</button></div><section class="panel" id="memberList"></section>`;
      views.users.bind(); views.users.fill(); loadMembers();
    } else if (tab === "look") {
      body.innerHTML = `<section class="panel sys-panel"><header><h3>وضع العرض</h3></header><div class="ss-body">${modeSeg()}<p class="hint">«تلقائي» يتبع إعداد جهازك. الاختيار يُحفظ على هذا الجهاز فقط، وكل مستخدم يختار لجهازه.</p></div></section>` +
        (S.isAdmin ? `<section class="panel sys-panel" id="brandSettings"><header><h3>الهوية والألوان</h3></header><div class="ss-body"><p class="hint">جارٍ التحميل…</p></div></section>` : "");
      if (S.isAdmin) paintBrand();
    } else if (tab === "wa") {
      body.innerHTML = `<section class="panel sys-panel" id="sysSettings"><header><h3>ربط واتساب</h3></header><div class="ss-body"><p class="hint">جارٍ التحميل…</p></div></section>`;
      paintWa();
    } else paintAccount();
  }

  /* حسابي: كلمة المرور */
  async function paintAccount(){
    const body = $("#setBody");
    body.innerHTML = `<section class="panel sys-panel"><header><h3>كلمة المرور</h3></header><div class="ss-body"><p class="hint">جارٍ التحميل…</p></div></section>`;
    const r = await appRpc("session_info");
    const box = body.querySelector(".ss-body"); if (!box) return;
    const has = !!r?.has_password, fromAdmin = !!r?.password_from_admin;
    box.innerHTML = `<p class="hint">${!has ? "ما عندك كلمة مرور بعد. ضع كلمة مرور تدخل بها بدل انتظار رمز واتساب." : fromAdmin ? "كلمة مرورك الحالية وضعها مدير النظام ويقدر يشوفها. غيّرها لكلمة مرور تعرفها أنت فقط." : "تقدر تدخل بكلمة مرورك أو برمز واتساب. إذا نسيتها ادخل بالرمز وغيّرها من هنا."}</p>
<form id="pwForm" class="ss-grid" novalidate>
<div class="field"><label class="lbl" for="pwNew">كلمة المرور الجديدة</label><input type="password" id="pwNew" autocomplete="new-password" dir="ltr" minlength="6"></div>
<div class="field"><label class="lbl" for="pwNew2">أعد كتابتها</label><input type="password" id="pwNew2" autocomplete="new-password" dir="ltr"></div>
</form>
<div class="ss-actions"><button class="btn primary" type="submit" form="pwForm">${has ? "تغيير كلمة المرور" : "حفظ كلمة المرور"}</button><span class="ss-status" id="pwStatus">6 أحرف على الأقل.</span></div>`;
    $("#pwForm").onsubmit = async e => {
      e.preventDefault();
      const a = $("#pwNew").value, b = $("#pwNew2").value;
      if (a.length < 6 || a.length > 64) return say("pwStatus", "bad", "كلمة المرور من 6 إلى 64 حرفًا.");
      if (a !== b) return say("pwStatus", "bad", "الكلمتان غير متطابقتين.");
      const btn = document.querySelector('[form="pwForm"]'); btn.disabled = true;
      const x = await appRpc("password_change", { p_new: a });
      btn.disabled = false;
      if (x?.error) return say("pwStatus", "bad", x.error === "bad_password" ? "كلمة المرور من 6 إلى 64 حرفًا." : MSG.network);
      toast("حُفظت كلمة المرور"); paintAccount();
    };
  }

  /* الضغط على الشعار يرجع للرئيسية */
  const brandEl = document.querySelector(".side-brand");
  if (brandEl) { brandEl.style.cursor = "pointer"; brandEl.title = "الرئيسية";
    brandEl.addEventListener("click", () => { show(S.isAdmin || S.db ? "summary" : "custody"); window.scrollTo({ top: 0 }); }); }

  const prevShow = window.show;
  window.show = function(v){
    if (v === "users") { v = "settings"; tab = "users"; }
    if (v !== "settings") return prevShow(v);
    S.view = "settings"; storeSet("halaqat.view", "settings");
    $("#view").innerHTML = views.settings.shell();
    views.settings.bind(); paintHeader();
  };
  const prevPaint = window.paintHeader;
  window.paintHeader = function(){
    prevPaint.apply(this, arguments);
    if (navSet) { navSet.hidden = false; navSet.setAttribute("aria-selected", S.view === "settings" ? "true" : "false"); }
  };

  /* ---------- الهوية والمظهر ---------- */
  function shrinkLogo(file){
    return new Promise((ok, no) => {
      if (!/^image\//.test(file.type)) return no(new Error("اختر صورة (PNG أو JPG)."));
      const img = new Image(), src = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 320 / Math.max(img.width, img.height)), cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round(img.width * k)); cv.height = Math.max(1, Math.round(img.height * k));
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(src);
        let out = cv.toDataURL("image/png");
        if (out.length > 380000) out = cv.toDataURL("image/webp", .9);
        if (out.length > 380000) return no(new Error("الصورة كبيرة. جرّب صورة أبسط أو أصغر."));
        ok(out);
      };
      img.onerror = () => { URL.revokeObjectURL(src); no(new Error("تعذّرت قراءة الصورة.")); };
      img.src = src;
    });
  }
  const swatch = (id, t, name, on, disabled) => { const p = Brand.palette(t, false);
    return `<button type="button" class="swatch" data-theme="${id}" aria-pressed="${on}"${disabled ? " disabled" : ""}><i style="background:${p["--side"]}"><b style="background:${p["--gold"]}"></b></i><span>${name}</span></button>`; };

  async function paintBrand(){
    const box = $("#brandSettings .ss-body"); if (!box || box.dataset.ready) return;
    box.dataset.ready = "1";
    await Brand.refresh();
    const b = Brand.get();
    const st = { logo: null, logoNow: b.logo || "", theme: b.theme || "brown", auto: (() => { try { return JSON.parse(b.theme_auto || ""); } catch (e) { return null; } })() };
    const swatches = () => swatch("auto", st.auto || Brand.THEMES.slate, "من الشعار", st.theme === "auto", !st.auto) +
      Object.entries(Brand.THEMES).map(([k, t]) => swatch(k, t, t.name, st.theme === k)).join("");
    box.innerHTML = `
<div class="ss-grid">
  <div class="field"><label for="bOrg">اسم الجامع أو المجمع</label><input type="text" id="bOrg" maxlength="80" value="${esc(b.org_name || "")}"></div>
  <div class="field"><label for="bTag">السطر التعريفي تحت الاسم</label><input type="text" id="bTag" maxlength="120" value="${esc(b.tagline || "")}" placeholder="مثال: لتحفيظ القرآن الكريم · حي النرجس"></div>
</div>
<div class="field"><span class="lbl">الشعار</span>
  <div class="logo-row"><div class="logo-prev"><div class="mark" role="img" aria-label="الشعار"></div></div>
  <div style="display:grid;gap:8px"><div class="rowflex"><label class="btn" style="position:relative;overflow:hidden">رفع شعار<input type="file" id="bLogo" accept="image/png,image/jpeg,image/webp" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
  <button class="btn ghost" type="button" id="bLogoDel"${st.logoNow ? "" : " hidden"}>إزالة الشعار</button></div>
  <p class="hint">يُفضّل PNG بخلفية شفافة. يظهر في القائمة وشاشة الدخول والسندات المطبوعة وأيقونة المتصفح.</p></div></div></div>
<div class="field"><span class="lbl">ألوان الموقع</span><div class="swatches" id="bSw">${swatches()}</div>
  <p class="hint">«من الشعار» يأخذ ألوانه من الشعار المرفوع تلقائيًا. تقدر تختار أي ثيم وتشوف أثره مباشرة قبل الحفظ.</p></div>
<div class="ss-actions"><button class="btn primary" type="button" id="bSave">حفظ الهوية والمظهر</button><span class="ss-status" id="bStatus"></span></div>`;
    const preview = () => Brand.preview({ logo: st.logo ?? st.logoNow, theme: st.theme, theme_auto: st.auto ? JSON.stringify(st.auto) : "" });
    const repaintSw = () => { $("#bSw").innerHTML = swatches(); };
    $("#bSw").onclick = e => { const s = e.target.closest("[data-theme]"); if (!s || s.disabled) return; st.theme = s.dataset.theme; repaintSw(); preview(); };
    $("#bLogo").onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try { st.logo = await shrinkLogo(f); } catch (er) { return say("bStatus", "bad", er.message); }
      st.auto = await Brand.colorsFrom(st.logo); if (st.auto) { delete st.auto.gray; st.theme = "auto"; }
      $("#bLogoDel").hidden = false; repaintSw(); preview(); say("bStatus", "", "لم يُحفظ بعد. اضغط «حفظ الهوية والمظهر».");
    };
    $("#bLogoDel").onclick = () => { st.logo = ""; st.auto = null; if (st.theme === "auto") st.theme = "brown"; $("#bLogoDel").hidden = true; repaintSw(); preview(); say("bStatus", "", "لم يُحفظ بعد."); };
    $("#bSave").onclick = async () => {
      const btn = $("#bSave"); btn.disabled = true; say("bStatus", "", "جارٍ الحفظ…");
      const r = await window.appRpc("brand_set", { p_org_name: $("#bOrg").value, p_tagline: $("#bTag").value, p_logo: st.logo, p_theme: st.theme, p_theme_auto: st.auto ? JSON.stringify(st.auto) : "" });
      btn.disabled = false;
      if (!r || r.error) return say("bStatus", "bad", MSG[r?.error] || MSG.network);
      if (st.logo !== null) st.logoNow = st.logo;
      Brand.save({ org_name: $("#bOrg").value.trim(), tagline: $("#bTag").value.trim(), logo: st.logoNow, theme: st.theme, theme_auto: st.auto ? JSON.stringify(st.auto) : "" });
      st.logo = null;
      if (S.settings) S.settings.orgName = $("#bOrg").value.trim();
      paintHeader(); toast("حُفظت الهوية والمظهر"); say("bStatus", "good", "محفوظ، ويظهر لكل المستخدمين.");
    };
  }

  /* ---------- ربط واتساب ---------- */
  const STEPS = `<details class="wa-steps"><summary>طريقة الربط خطوة بخطوة</summary><ol>
<li>جهّز رقم جوال خاص بالمجمع (الأفضل رقم جديد، لا تستخدم رقمك الشخصي)، وثبّت عليه واتساب أو واتساب أعمال وفعّله.</li>
<li>ادخل موقع <a href="https://wasenderapi.com" target="_blank" rel="noopener">WasenderAPI</a> وأنشئ حسابًا، ثم اشترك في باقة تسمح بربط رقم واحد على الأقل.</li>
<li>من لوحة التحكم أنشئ جلسة جديدة (Session) واكتب فيها رقم المجمع.</li>
<li>اضغط زر الربط فيظهر لك رمز QR. من جوال المجمع افتح واتساب ← الإعدادات ← الأجهزة المرتبطة ← ربط جهاز، وامسح الرمز.</li>
<li>انتظر حتى تصير حالة الجلسة «متصلة» (Connected)، ثم انسخ مفتاح API الخاص بهذه الجلسة من صفحتها.</li>
<li>ارجع هنا: اكتب رقم المجمع، والصق المفتاح، واضغط «حفظ إعدادات واتساب».</li>
<li>اضغط «إرسال رسالة تجربة لي». إذا وصلتك الرسالة على واتسابك فالربط تمام، وصار المستخدمون يستلمون رموز الدخول والتنبيهات.</li>
</ol><div class="note">
• خلّ جوال المجمع شغّالًا ومتصلًا بالإنترنت، والرسائل تطلع باسم هذا الرقم.<br>
• لا تستخدم الرقم لرسائل جماعية كثيرة لأشخاص ما يعرفونه، حتى لا يحظره واتساب.<br>
• إذا انفصلت الجلسة أو غيّرت الجوال، أعد مسح الرمز من WasenderAPI. وإذا تغيّر المفتاح الصقه هنا من جديد.<br>
• المفتاح يُحفظ مشفّرًا، ولا يظهر هنا إلا آخر أربعة أحرف منه.</div></details>`;

  async function paintWa(){
    const box = $("#sysSettings .ss-body"); if (!box || box.dataset.ready) return;
    box.dataset.ready = "1";
    const r = await window.appRpc("config_get");
    if (!r || r.error) { box.innerHTML = `<p class="hint">${MSG[r?.error] || MSG.network}</p>`; return; }
    box.innerHTML = `${STEPS}
<div class="ss-grid">
  <div class="field"><label for="ssNum">رقم واتساب المجمع (المرسِل)</label><input type="tel" id="ssNum" dir="ltr" style="text-align:right" placeholder="05XXXXXXXX" value="${esc(r.wa_number ? "0" + r.wa_number.slice(3) : "")}"></div>
  <div class="field"><label for="ssKey">مفتاح WasenderAPI</label><input type="password" id="ssKey" dir="ltr" autocomplete="off" placeholder="${r.has_key ? "محفوظ " + esc(r.key_hint) + " · اكتب مفتاحًا جديدًا لتغييره" : "الصق المفتاح هنا"}"></div>
</div>
<p class="hint">الرسائل تُرسل من الرقم المربوط بالمفتاح في WasenderAPI. الرقم المكتوب هنا للتوثيق ولتعرف أي رقم مربوط.</p>
<div class="ss-actions">
  <button class="btn primary" type="button" id="ssSave">حفظ إعدادات واتساب</button>
  <button class="btn" type="button" id="ssTest"${r.has_key ? "" : " disabled"}>إرسال رسالة تجربة لي</button>
  <span class="ss-status${r.has_key ? " good" : ""}" id="ssStatus">${r.has_key ? "واتساب مربوط." : "واتساب غير مربوط بعد: اتبع الخطوات أعلاه ليتمكن المستخدمون من الدخول."}</span>
</div>`;
    if (!r.has_key) box.querySelector(".wa-steps").open = true;
    $("#ssSave").onclick = async () => {
      const b = $("#ssSave"); b.disabled = true; say("ssStatus", "", "جارٍ الحفظ…");
      const key = $("#ssKey").value.trim();
      const s = await window.appRpc("config_set", { p_org_name: null, p_wa_number: $("#ssNum").value, p_wa_key: key || null });
      b.disabled = false;
      if (!s || s.error) return say("ssStatus", "bad", MSG[s?.error] || MSG.network);
      toast("حُفظت إعدادات واتساب");
      box.dataset.ready = ""; paintWa();
    };
    $("#ssTest").onclick = async () => {
      const b = $("#ssTest"); b.disabled = true; say("ssStatus", "", "جارٍ الإرسال…");
      const t = await window.appRpc("wa_test");
      if (!t || t.error) { b.disabled = false; return say("ssStatus", "bad", MSG[t?.error] || MSG.network); }
      for (let i = 0; i < 15; i++) {
        await new Promise(ok => setTimeout(ok, 2000));
        const st = await window.appRpc("wa_status", { p_id: t.id });
        if (st?.status === "sent") { b.disabled = false; return say("ssStatus", "good", "وصلت رسالة التجربة إلى واتسابك."); }
        if (st?.status === "failed") { b.disabled = false; return say("ssStatus", "bad", "فشل الإرسال. تأكد من المفتاح وأن الجلسة «متصلة» في WasenderAPI." + (st.error ? " (" + String(st.error).slice(0, 80) + ")" : "")); }
      }
      b.disabled = false; say("ssStatus", "", "الرسالة في الطابور ولم تُرسل بعد. تحقق بعد قليل.");
    };
  }

  /* قراءة بيانات الفاتورة من رمزها الضريبي */
  const inv = document.createElement("script"); inv.src = "invoice.js"; document.body.appendChild(inv);
})();
