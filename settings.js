// إعدادات النظام (للمدير فقط) أسفل صفحة المستخدمين:
// الهوية والمظهر (الاسم، السطر التعريفي، الشعار، الألوان)، وربط واتساب عبر WasenderAPI مع تعليمات خطوة بخطوة.
// ويضيف لكل مستخدم اختيار الوضع (فاتح، داكن، حسب الجهاز) أسفل القائمة الجانبية.
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
.side-mode{display:grid;gap:6px;margin-bottom:10px}
.side-mode span{font-size:12px;color:var(--side-muted)}
.side-mode .seg{background:var(--side-2);border-color:var(--side-line)}
.side-mode .seg{display:flex;width:100%}.side-mode .seg button{color:var(--side-fg);flex:1;padding:5px 6px;font-size:12px;white-space:nowrap}
.side-mode .seg button[aria-pressed="true"]{background:var(--side-fg);color:var(--side)}
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

  /* اختيار الوضع لكل مستخدم أسفل القائمة الجانبية */
  const who = document.querySelector(".side-foot .who-me");
  if (who && !document.querySelector(".side-mode")) {
    const d = document.createElement("div"); d.className = "side-mode";
    d.innerHTML = `<span>المظهر</span>${modeSeg()}`;
    who.insertBefore(d, who.querySelector("[data-signout]"));
  }

  const shell = views.users.shell;
  views.users.shell = function(){
    return shell.call(this).replace(/<\/div>\s*$/, `
<section class="panel sys-panel" id="brandSettings"><header><h3>الهوية والمظهر</h3></header><div class="ss-body"><p class="hint">جارٍ التحميل…</p></div></section>
<section class="panel sys-panel" id="sysSettings"><header><h3>ربط واتساب</h3></header><div class="ss-body"><p class="hint">جارٍ التحميل…</p></div></section></div>`);
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
<div class="field"><span class="lbl">وضع العرض على هذا الجهاز</span>${modeSeg()}<p class="hint">«تلقائي» يتبع إعداد الجهاز. وكل مستخدم يقدر يغيّره لجهازه من أسفل القائمة الجانبية.</p></div>
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

  const fill = views.users.fill;
  views.users.fill = function(){
    fill.apply(this, arguments);
    if (S.isAdmin) { paintBrand(); paintWa(); }
    else document.querySelectorAll(".sys-panel").forEach(p => p.remove());
  };

  /* قراءة بيانات الفاتورة من رمزها الضريبي */
  const inv = document.createElement("script"); inv.src = "invoice.js"; document.body.appendChild(inv);
})();
