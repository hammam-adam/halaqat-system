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
.set-wrap{display:grid;grid-template-columns:230px minmax(0,1fr);gap:18px;align-items:start}
.rg-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
.rg-list>div{display:grid;gap:6px;align-content:start;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2)}
.rg-list .chip{justify-self:start}.rg-list p{margin:0;font-size:12.5px;line-height:1.8;color:var(--muted)}
.role-guide{margin-bottom:14px}
.set-tabs{display:grid;gap:4px;padding:8px;background:var(--surface);border:1px solid var(--line);border-radius:16px;position:sticky;top:16px}
.set-tabs button{display:flex;align-items:center;gap:10px;width:100%;padding:11px 12px;border:0;border-radius:10px;background:transparent;color:var(--fg);font:inherit;font-size:14px;text-align:start;cursor:pointer}
.set-tabs button svg{width:18px;height:18px;flex:none;color:var(--muted)}
.set-tabs button small{display:block;font-size:11.5px;color:var(--muted);font-weight:400;margin-top:1px}
.set-tabs button:hover{background:var(--surface-2)}
.set-tabs button[aria-pressed="true"]{background:var(--brand-soft);color:var(--brand);font-weight:600}
.set-tabs button[aria-pressed="true"] svg{color:var(--brand)}
@media (max-width:860px){.set-wrap{grid-template-columns:1fr}.set-tabs{position:static}}
.acct-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.acct-grid .field{display:grid;gap:6px}
.acct-grid input{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface);color:var(--fg);font:inherit;min-height:42px}
.acct-grid input:disabled{background:var(--surface-2);color:var(--muted)}
.ro-line{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);min-height:42px}
.dev-list,.act-list{display:grid;gap:0;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.dev-list>div,.act-list>button{display:flex;align-items:center;gap:12px;padding:11px 14px;border-top:1px solid var(--line);background:var(--surface);font:inherit;color:inherit;text-align:start;width:100%}
.dev-list>div:first-child,.act-list>button:first-child{border-top:0}
.act-list>button{cursor:pointer;border-inline:0;border-bottom:0}.act-list>button:hover{background:var(--surface-2)}
.dev-list .ic{width:34px;height:34px;border-radius:10px;background:var(--surface-2);display:grid;place-items:center;flex:none;color:var(--muted)}
.dev-list .ic svg{width:18px;height:18px}
.dev-list b,.act-list b{font-weight:600;font-size:13.5px}
.dev-list span,.act-list span{display:block;font-size:12px;color:var(--muted)}
.dev-list .grow,.act-list .grow{flex:1;min-width:0}
.act-list .amt{font-weight:600;font-size:13.5px;white-space:nowrap}
.who-me .me-name{color:var(--side-fg);font-weight:700;font-size:15px}
#mePhone{font-size:12px;color:var(--side-muted);font-weight:400}
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
    forbidden: "هذه الإعدادات لمدير النظام والدعم الفني فقط.",
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
  const TABS = [["account", "حسابي", () => true], ["look", "المظهر", () => true], ["users", "المستخدمون", () => S.canSys], ["wa", "واتساب", () => S.canSys],
    ["log", "سجل التعديلات", () => S.isAdmin], ["backup", "النسخ الاحتياطي", () => S.isAdmin]];
  let tab = "account";
  try { tab = localStorage.getItem("halaqat.setTab") || "account"; } catch (e) {}
  const tabsFor = () => TABS.filter(t => t[2]());
  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const TAB_ICON = {
    account: svg('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.6-3.4 3.4-5.5 7-5.5s6.4 2.1 7 5.5"/>'),
    look: svg('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/>'),
    users: svg('<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-3 2.8-4.8 5.5-4.8s5 1.8 5.5 4.8M16 5.5a3 3 0 0 1 0 5.5M18 14.5c1.6.6 2.6 2.1 2.9 4.5"/>'),
    wa: svg('<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1z"/>'),
    log: svg('<path d="M12 7v5l3 2"/><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5"/><path d="M3.5 4v4.5H8"/>'),
    backup: svg('<path d="M12 3v11M7.5 9.5 12 14l4.5-4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>')
  };
  const TAB_SUB = { account: "بياناتك وكلمة المرور والأجهزة", look: "الوضع الفاتح والداكن والألوان", users: "الحسابات وصلاحياتها", wa: "رقم الإرسال ومفتاح الربط", log: "من عدّل ماذا ومتى", backup: "نسخ البيانات وتنزيلها" };

  views.settings = {
    shell(){
      if (!tabsFor().some(t => t[0] === tab)) tab = "account";
      return `<div class="page">${pageHead("الإعدادات", "", "")}
<div class="set-wrap"><nav class="set-tabs" role="tablist" aria-label="أقسام الإعدادات">${tabsFor().map(([k, t]) => `<button type="button" role="tab" data-set-tab="${k}" aria-pressed="${k === tab}">${TAB_ICON[k]}<span>${t}<small>${TAB_SUB[k]}</small></span></button>`).join("")}</nav>
<div id="setBody"></div></div></div>`;
    },
    bind(){
      $(".set-tabs").onclick = e => { const b = e.target.closest("[data-set-tab]"); if (!b) return; tab = b.dataset.setTab; try { localStorage.setItem("halaqat.setTab", tab); } catch (x) {}
        document.querySelectorAll("[data-set-tab]").forEach(x => x.setAttribute("aria-pressed", x === b)); paintTab(); if (innerWidth <= 860) $("#setBody")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
      paintTab();
    },
    fill(){ if (tab === "users" && $("#memberList")) views.users.fill(); }
  };
  function paintTab(){
    const body = $("#setBody"); if (!body) return;
    if (tab === "users") {
      body.innerHTML = `<div class="set-row"><p class="hint">${S.isAdmin ? "كل مستخدم يدخل بكلمة المرور أو برمز يصله على واتساب. اضغط على المستخدم لتعديله أو لتعيين كلمة مرور جديدة له." : "تقدر تضيف حسابات الإداريين والدعم الفني وتعدّلها. حسابات المدير والمحاسب يديرها مدير النظام."}</p><button class="btn primary" type="button" id="addMember">${ICON.plus}مستخدم جديد</button></div>
${roleGuide()}<section class="panel" id="memberList"></section>`;
      views.users.bind(); views.users.fill(); loadMembers();
    } else if (tab === "look") {
      body.innerHTML = `<section class="panel sys-panel"><header><h3>وضع العرض</h3></header><div class="ss-body">${modeSeg()}<p class="hint">«تلقائي» يتبع إعداد جهازك. الاختيار يُحفظ على هذا الجهاز فقط، وكل مستخدم يختار لجهازه.</p></div></section>` +
        (S.canSys ? `<section class="panel sys-panel" id="brandSettings"><header><h3>الهوية والألوان</h3></header><div class="ss-body"><p class="hint">جارٍ التحميل…</p></div></section>` : "");
      if (S.canSys) paintBrand();
    } else if (tab === "wa") {
      body.innerHTML = `<section class="panel sys-panel" id="sysSettings"><header><h3>ربط واتساب</h3></header><div class="ss-body"><p class="hint">جارٍ التحميل…</p></div></section>`;
      paintWa();
    } else if (tab === "log") window.paintAudit ? paintAudit(body) : (body.innerHTML = "");
    else if (tab === "backup") window.paintBackup ? paintBackup(body) : (body.innerHTML = "");
    else paintAccount();
  }

  /* حسابي: بياناتي، كلمة المرور، الأجهزة، آخر عملياتي */
  const ROLE_NAME = new Proxy({}, { get: (_, r) => roleName(r) });
  function roleGuide(){
    const keys = S.isAdmin ? ["admin", "accountant", "custodian", "tech"] : ["custodian", "tech"];
    return `<section class="panel sys-panel role-guide"><header><h3>الصلاحيات</h3></header><div class="ss-body"><div class="rg-list">${keys.map(k => `<div><span class="chip ${window.ROLES[k].chip}">${window.ROLES[k].name}</span><p>${window.ROLES[k].desc}</p></div>`).join("")}
<div><span class="chip mute">المعلمون</span><p>ما يحتاجون حسابًا. أضفهم من صفحة «المعلمون» برقم جوالهم، ويوصلهم رابط تأكيد استلام المكافأة.</p></div></div></div></section>`;
  }
  const ERR = { bad_name: "اكتب اسمك (حرفين على الأقل).", bad_email: "البريد الإلكتروني غير صحيح.", bad_phone: "اكتب رقم جوال سعودي صحيح يبدأ بـ 05.", same_phone: "هذا رقمك الحالي.", exists: "هذا الرقم مسجّل لمستخدم آخر.", wrong_password: "كلمة المرور الحالية غير صحيحة.", bad_password: "كلمة المرور من 6 إلى 64 حرفًا." };
  function device(ua){
    ua = ua || "";
    const os = /iPhone|iPad/.test(ua) ? "آيفون" : /Android/.test(ua) ? "أندرويد" : /Windows/.test(ua) ? "ويندوز" : /Mac OS/.test(ua) ? "ماك" : /Linux/.test(ua) ? "لينكس" : "جهاز";
    const br = /Edg\//.test(ua) ? "Edge" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /FxiOS|Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
    const mob = /iPhone|Android.*Mobile/.test(ua);
    return { name: ua ? `${os}${br ? " · " + br : ""}` : "جهاز غير معروف", mob };
  }
  const dt = iso => { try { const d = new Date(iso); return d.toLocaleDateString("ar-SA-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "long", year: "numeric" }) + " · " + d.toLocaleTimeString("ar-SA-u-nu-latn", { hour: "numeric", minute: "2-digit" }); } catch (e) { return ""; } };
  async function paintAccount(){
    const body = $("#setBody");
    body.innerHTML = `<section class="panel sys-panel"><div class="ss-body"><p class="hint">جارٍ التحميل…</p></div></section>`;
    const r = await appRpc("my_profile");
    if (!r?.ok) { body.innerHTML = `<div class="notice">تعذّر تحميل بيانات حسابك. حدّث الصفحة.</div>`; return; }
    S.me = r; paintWho();
    const has = r.has_password, fromAdmin = r.password_from_admin;
    const mine = (S.tx || []).filter(t => t.createdBy === S.uid).sort((a, b) => (b.createdAt || b.date || "").localeCompare(a.createdAt || a.date || "")).slice(0, 8);
    body.innerHTML = `
<section class="panel sys-panel"><header><h3>بياناتي</h3></header><div class="ss-body">
<form id="profForm" class="acct-grid" novalidate>
<div class="field"><label class="lbl" for="pfName">الاسم</label><input id="pfName" value="${esc(r.name || "")}" autocomplete="name"></div>
<div class="field"><label class="lbl" for="pfEmail">البريد الإلكتروني <span class="sub">(اختياري)</span></label><input id="pfEmail" type="email" dir="ltr" style="text-align:right" value="${esc(r.email || "")}" placeholder="name@example.com"></div>
<div class="field"><span class="lbl">رقم الجوال</span><div class="ro-line"><b dir="ltr">${esc(showPhone(r.phone))}</b><button type="button" class="btn sm" id="pfPhoneBtn">تغيير الرقم</button></div></div>
<div class="field"><span class="lbl">الصلاحية</span><div class="ro-line"><span>${ROLE_NAME[r.role] || r.role}${r.title ? " · " + esc(r.title) : ""}</span>${r.role === "accountant" ? `<span class="sub">الرصيد ${money(r.budget)}</span>` : ""}</div></div>
</form>
<div class="ss-actions"><button class="btn primary" type="submit" form="profForm">حفظ البيانات</button><span class="ss-status" id="pfStatus"></span></div>
</div></section>

<section class="panel sys-panel"><header><h3>كلمة المرور</h3></header><div class="ss-body">
<p class="hint">${!has ? "ما عندك كلمة مرور بعد. ضع كلمة مرور تدخل بها بدل انتظار رمز واتساب." : fromAdmin ? "كلمة مرورك الحالية وضعها مدير النظام ويقدر يشوفها. غيّرها لكلمة مرور تعرفها أنت فقط." : "تقدر تدخل بكلمة مرورك أو برمز واتساب. إذا نسيتها ادخل بالرمز وغيّرها من هنا."}</p>
<form id="pwForm" class="acct-grid" novalidate>
<div class="field"><label class="lbl" for="pwNew">كلمة المرور الجديدة</label><input type="password" id="pwNew" autocomplete="new-password" dir="ltr"></div>
<div class="field"><label class="lbl" for="pwNew2">أعد كتابتها</label><input type="password" id="pwNew2" autocomplete="new-password" dir="ltr"></div>
</form>
<div class="ss-actions"><button class="btn primary" type="submit" form="pwForm">${has ? "تغيير كلمة المرور" : "حفظ كلمة المرور"}</button><span class="ss-status" id="pwStatus">6 أحرف على الأقل.</span></div>
</div></section>

<section class="panel sys-panel"><header><h3>الأجهزة المسجّل دخولها</h3></header><div class="ss-body">
<div class="dev-list">${r.sessions.map(x => { const d = device(x.ua); return `<div><span class="ic">${svg(d.mob ? '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>' : '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 20h8"/>')}</span><div class="grow"><b>${esc(d.name)}</b><span>دخل ${esc(dt(x.created_at))}</span></div>${x.current ? `<span class="chip good">هذا الجهاز</span>` : ""}</div>`; }).join("") || `<div><div class="grow"><span>لا توجد أجهزة.</span></div></div>`}</div>
${r.sessions.length > 1 ? `<div class="ss-actions"><button class="btn" type="button" id="endOthers">تسجيل الخروج من الأجهزة الأخرى</button></div>` : ""}
</div></section>

${mine.length ? `<section class="panel sys-panel"><header><h3>آخر عملياتي</h3></header><div class="ss-body"><div class="act-list">${mine.map(t => `<button type="button" data-my-tx="${esc(t.id)}"><div class="grow"><b>${t.type === "income" ? "سند قبض" : "سند صرف"} ${esc(vno(t))}${t.void ? ` <span class="chip bad">ملغى</span>` : ""}</b><span>${esc(t.category || "")}${t.party ? " · " + esc(t.party) : ""} · ${esc(gDate(t.date))}</span></div><span class="amt">${money(t.amount)}</span></button>`).join("")}</div></div></section>` : ""}`;

    $("#profForm").onsubmit = async e => {
      e.preventDefault();
      const x = await appRpc("profile_update", { p_name: $("#pfName").value.trim(), p_email: $("#pfEmail").value.trim() || null });
      if (x?.error) { say("pfStatus", "bad", ERR[x.error] || MSG.network); notify(ERR[x.error] || MSG.network, "bad"); return; }
      say("pfStatus", "good", "حُفظت."); notify("حُفظت بياناتك", "good");
      S.me.name = $("#pfName").value.trim(); paintWho(); if (S.canSys) loadMembers();
    };
    $("#pwForm").onsubmit = async e => {
      e.preventDefault();
      const a = $("#pwNew").value, b = $("#pwNew2").value;
      if (a.length < 6 || a.length > 64) { say("pwStatus", "bad", ERR.bad_password); return notify("رُفض تغيير كلمة المرور: " + ERR.bad_password, "bad"); }
      if (a !== b) { say("pwStatus", "bad", "الكلمتان غير متطابقتين."); return notify("رُفض تغيير كلمة المرور: الكلمتان غير متطابقتين.", "bad"); }
      const btn = document.querySelector('[form="pwForm"]'); btn.disabled = true;
      const x = await appRpc("password_change", { p_new: a });
      btn.disabled = false;
      if (x?.error) { say("pwStatus", "bad", ERR[x.error] || MSG.network); return notify("رُفض تغيير كلمة المرور: " + (ERR[x.error] || MSG.network), "bad"); }
      notify("تم تغيير كلمة المرور. من الآن تدخل بها أو برمز واتساب.", "good"); paintAccount();
    };
    $("#pfPhoneBtn").onclick = () => openPhoneChange(has);
    const eo = $("#endOthers"); if (eo) eo.onclick = async () => {
      if (!eo.classList.contains("armed")) { eo.classList.add("armed", "danger"); eo.textContent = "تأكيد الخروج من الأجهزة الأخرى"; return; }
      const x = await appRpc("sessions_end_others");
      if (x?.ok) { notify(`سُجّل الخروج من ${x.ended} ${x.ended === 1 ? "جهاز" : "أجهزة"}`, "good"); paintAccount(); } else notify("تعذّر تسجيل الخروج من الأجهزة الأخرى.", "bad");
    };
    body.querySelectorAll("[data-my-tx]").forEach(b => b.onclick = () => openVoucher(b.dataset.myTx));
  }
  function openPhoneChange(has){
    openModal(`<form id="phForm" novalidate><header><h3>تغيير رقم الجوال</h3>${closeBtn}</header>
<div class="content"><div class="form-grid">
<div class="field wide"><label for="phNew">الرقم الجديد</label><input type="tel" id="phNew" dir="ltr" style="text-align:right" placeholder="05XXXXXXXX" inputmode="numeric"></div>
${has ? `<div class="field wide"><label for="phPw">كلمة المرور الحالية</label><input type="password" id="phPw" dir="ltr" autocomplete="current-password"></div>` : ""}
</div><p class="c-sub">بعد التغيير تدخل بالرقم الجديد، وتنتقل له كل عهدك ومهامك. رموز واتساب توصل للرقم الجديد.</p><p class="err" id="phErr" hidden></p></div>
<footer><button class="btn primary" type="submit">تغيير الرقم</button><button class="btn" type="button" data-close>إلغاء</button></footer></form>`, sheet => {
      $("#phForm", sheet).onsubmit = async e => {
        e.preventDefault(); const er = $("#phErr", sheet); er.hidden = true;
        const x = await appRpc("phone_change", { p_new: $("#phNew", sheet).value, p_password: has ? $("#phPw", sheet).value : null });
        if (x?.error) { er.textContent = ERR[x.error] || MSG.network; er.hidden = false; notify("رُفض تغيير الرقم: " + (ERR[x.error] || MSG.network), "bad"); return; }
        S.phone = S.uid = x.phone; storeSet("halaqat.lastPhone", x.phone);
        closeModal(); notify("تم تغيير رقمك إلى " + showPhone(x.phone), "good"); paintHeader(); paintAccount();
      };
    });
  }

  /* اسم المستخدم أسفل القائمة الجانبية بدل «مسجّل الدخول» */
  function paintWho(){
    const w = document.querySelector(".side-foot .who-me"); if (!w) return;
    const lbl = w.querySelector(":scope > span"); const ph = $("#mePhone");
    if (S.me?.name) { if (lbl) { lbl.textContent = S.me.name; lbl.className = "me-name"; } if (ph) { ph.dir = "rtl"; ph.textContent = (S.me.title || ROLE_NAME[S.me.role] || "") + " · " + showPhone(S.phone); } }
  }
  let whoAsked = false;

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
    if (S.phone && !whoAsked && window.appRpc) { whoAsked = true; appRpc("my_profile").then(r => { if (r?.ok) { S.me = r; paintWho(); } }); }
    paintWho();
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
