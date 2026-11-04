// Day-to-day conveniences for the accountant, layered on core.js: rewards for teachers and
// supervisors with a role filter and search, quick periods on the vouchers page, and the
// amount in words while a voucher is typed.
(function(){
  /* formal Naskh type everywhere: pages, sign-in screen and printed vouchers */
  const font = document.createElement("link");
  font.rel = "stylesheet"; font.href = "https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap";
  document.head.appendChild(font);
  const css = document.createElement("style");
  css.textContent = `
:root:root:root{--f-display:"Noto Naskh Arabic","Traditional Arabic","Times New Roman",serif;--f-body:"Noto Naskh Arabic","Traditional Arabic","Times New Roman",serif}
html body,html .auth,html .auth h1,html .auth h2,html .auth button,html .auth input,html .splash{font-family:var(--f-body)}
html body{font-size:15.5px}
.rw-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r)}
.rw-bar input{flex:1 1 200px;width:auto;background:var(--surface-2);border-color:var(--line)}
.rw-bar .cnt{font-size:12.5px;color:var(--muted);margin-inline-start:auto}
.q-periods{display:inline-flex;gap:4px;flex-wrap:wrap}
.q-periods .btn{padding:5px 11px}
.q-periods .btn[aria-pressed="true"]{background:var(--brand);border-color:var(--brand);color:var(--brand-ink)}
.part-box{display:grid;gap:8px;padding:12px 14px;border:1px solid color-mix(in srgb,var(--warn) 30%,transparent);border-radius:12px;background:var(--warn-bg)}
.tx-words{display:block;margin-top:4px;font-size:12.5px;color:var(--muted);line-height:1.6;min-height:1.6em}`;
  document.head.appendChild(css);

  /* ---------- interface polish: motion, hover states, sticky sheet header and footer ---------- */
  const polish = document.createElement("style");
  polish.textContent = `
::selection{background:color-mix(in srgb,var(--brand) 22%,transparent)}
*{scrollbar-width:thin;scrollbar-color:var(--line-strong) transparent}
input:hover,select:hover,textarea:hover{border-color:var(--faint)}
input:focus,select:focus,textarea:focus{border-color:var(--brand)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 14%,transparent)!important}
.btn{transition:background .12s,border-color .12s,box-shadow .12s,transform .08s}
.btn:active:not(:disabled){transform:translateY(1px)}
.btn:disabled{opacity:.55;cursor:not-allowed}
.btn.primary:hover{box-shadow:0 4px 12px -4px rgba(74,46,26,.45)}
.seg button{transition:background .15s,color .15s}
.seg button:not([aria-pressed="true"]):hover{color:var(--fg);background:var(--surface)}
.page-head h2{letter-spacing:0;line-height:1.35}
.page-head p{max-width:62ch}
.kpi{transition:border-color .15s,box-shadow .15s,transform .15s}
.kpi:not(.lead):hover{border-color:var(--line-strong);box-shadow:0 6px 18px -10px rgba(28,23,18,.25);transform:translateY(-1px)}
.kpi b,.num,.n{font-variant-numeric:tabular-nums}
.dt tbody tr{transition:background .12s}
.dt tbody tr:hover{background:color-mix(in srgb,var(--surface-2) 70%,transparent)}
tr.click,tr[data-c-open]{cursor:pointer}
.card:hover,.tk:hover{border-color:var(--line-strong);box-shadow:0 8px 22px -14px rgba(28,23,18,.3)}
.tk{transition:border-color .15s,box-shadow .15s}
.panel>header{border-bottom:1px solid var(--line)}
.sheet>form>header,.sheet>header,.sheet>div>header{position:sticky;top:0;z-index:2;background:var(--surface);border-bottom:1px solid var(--line)}
.sheet footer{position:sticky;bottom:0;z-index:2}
.sheet h3{font-size:17px}
.empty{padding:34px 16px!important;color:var(--muted)}
.chip{font-weight:600}
@media (prefers-reduced-motion:no-preference){
  @keyframes fx-up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  @keyframes fx-in{from{opacity:0}to{opacity:1}}
  @keyframes fx-pop{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}
  #view>.page,#view>.cs-switch{animation:fx-up .22s ease-out}
  .scrim{animation:fx-in .15s ease-out}
  .scrim .sheet{animation:fx-pop .2s cubic-bezier(.2,.8,.2,1)}
  .toast{animation:fx-up .2s ease-out}
}`;
  document.head.appendChild(polish);

  /* ---------- rewards: teachers and supervisors ---------- */
  S.teach.role = S.teach.role || "all";
  S.teach.q = S.teach.q || "";
  const navT = document.querySelector('.nav [data-view="teachers"]');
  if (navT) { const t = [...navT.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (t) t.textContent = "المكافآت"; }

  const baseRows = teacherRows;
  window.teacherRows = m => {
    const q = S.teach.q.trim();
    return baseRows(m).filter(r => (S.teach.role === "all" || (r.x.role || "teacher") === S.teach.role)
      && (!q || [r.x.name, r.x.phone, r.x.notes].join(" ").includes(q)));
  };
  const counts = () => { const a = S.teachers.filter(x => x.active !== false);
    return { all: a.length, teacher: a.filter(x => (x.role || "teacher") === "teacher").length, supervisor: a.filter(x => x.role === "supervisor").length }; };

  const baseShell = views.teachers.shell;
  views.teachers.shell = function(){
    const c = counts(), tabs = [["all", "الكل"], ["teacher", "المعلمون"], ["supervisor", "المشرفون"]];
    return baseShell.call(this)
      .replace("المعلمون ومكافآتهم", "مكافآت المعلمين والمشرفين")
      .replace("مكافأة كل معلم الشهرية وحالة صرفها.", "المكافأة الشهرية لكل معلم ومشرف وحالة صرفها.")
      .replace(`${ICON.plus}معلم جديد`, `${ICON.plus}إضافة معلم أو مشرف`)
      .replace(`<div class="cards" id="tcList"></div>`, `<div class="rw-bar"><div class="seg" id="rwRole">${tabs.map(([k, t]) =>
        `<button type="button" data-role="${k}" aria-pressed="${S.teach.role === k}">${t} <span class="sub">${c[k]}</span></button>`).join("")}</div>
<input type="search" id="rwQ" placeholder="بحث بالاسم أو الجوال" value="${esc(S.teach.q)}"></div>
<div class="cards" id="tcList"></div>`);
  };
  const baseBind = views.teachers.bind;
  views.teachers.bind = function(){
    baseBind.call(this);
    $("#rwRole").onclick = e => { const b = e.target.closest("[data-role]"); if (!b) return; S.teach.role = b.dataset.role;
      $("#rwRole").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); views.teachers.fill(); };
    $("#rwQ").oninput = e => { S.teach.q = e.target.value; views.teachers.fill(); };
  };
  const baseFill = views.teachers.fill;
  views.teachers.fill = function(){
    baseFill.call(this);
    $("#tcKpis")?.querySelectorAll(".kpi-top>span").forEach(sp => { if (sp.textContent === "المعلمون") sp.textContent = "المعلمون والمشرفون"; });
    if (S.teachers.length && !teacherRows(S.teach.month).length) $("#tcList").innerHTML = `<div style="grid-column:1/-1" class="panel"><div class="empty"><span>لا يوجد أحد بهذا البحث أو الصفة.</span></div></div>`;
  };

  /* the teacher form also serves supervisors */
  const baseTeacher = openTeacher;
  window.openTeacher = function(id){
    baseTeacher(id);
    const h = document.querySelector("#tForm header h3");
    if (h && !id) h.textContent = "إضافة معلم أو مشرف";
    const n = $("#tName"); if (n) n.placeholder = "الاسم الكامل";
    const del = $("#tDel"); if (del) del.textContent = "حذف";
  };

  /* ---------- vouchers: quick periods ---------- */
  const ym = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const periods = () => { const now = new Date(), prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return [[ym(now), "هذا الشهر"], [ym(prev), "الشهر الماضي"], ["", "كل الفترات"]]; };
  const baseLedgerBind = views.ledger.bind;
  views.ledger.bind = function(){
    baseLedgerBind.call(this);
    const month = $("#lMonth"); if (!month) return;
    const wrap = document.createElement("div"); wrap.className = "q-periods";
    const paint = () => wrap.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.p === (S.ledger.month || "")));
    wrap.innerHTML = periods().map(([v, t]) => `<button class="btn sm" type="button" data-p="${v}">${t}</button>`).join("");
    wrap.onclick = e => { const b = e.target.closest("[data-p]"); if (!b) return; S.ledger.month = b.dataset.p; month.value = b.dataset.p; paint(); views.ledger.fill(); };
    month.addEventListener("input", paint);
    month.after(wrap); paint();
  };

  /* ---------- reports: print on A4 with a formal header and signature lines ---------- */
  const pcss = document.createElement("style");
  pcss.textContent = `
.print-head,.print-sign{display:none}
@media print{
  @page{size:A4;margin:12mm}
  html,body{background:#fff!important}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .side,.topbar,#sampleBanner,#modalRoot,.auth,.splash,.page-head,.toast{display:none!important}
  .app,.work,.work-inner{display:block!important;margin:0!important;padding:0!important;max-width:none!important;width:auto!important}
  .page{gap:12px!important}
  .kpis{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}
  .kpi{padding:10px!important;box-shadow:none!important}
  .grid2{grid-template-columns:minmax(0,1fr)!important;gap:12px!important}
  .panel{box-shadow:none!important;break-inside:avoid;border-color:#bbb!important}
  .tbl{overflow:visible!important}
  .tbl th,.tbl td{padding:5px 10px!important}
  .panel>header{padding:8px 12px!important}
  .print-head{display:flex;align-items:center;gap:14px;padding-bottom:10px;margin-bottom:4px;border-bottom:2px solid #333}
  .print-head img{width:58px;height:auto}
  .print-head .org{flex:1}.print-head .org b{display:block;font-size:17px}.print-head .org span{font-size:12px;color:#444}
  .print-head .rt{text-align:left;font-size:12px;line-height:1.8}.print-head .rt b{display:block;font-size:16px}
  .print-sign{display:grid;grid-template-columns:repeat(2,1fr);gap:40px;margin-top:36px;break-inside:avoid;font-size:13px;text-align:center}
  .print-sign i{display:block;height:44px;border-bottom:1px dotted #555;margin-bottom:6px}
}`;
  document.head.appendChild(pcss);
  const repLabel = () => S.reports.mode === "month" ? monthLabel(S.reports.month) : `سنة ${S.reports.year}`;
  const baseRepShell = views.reports.shell;
  views.reports.shell = function(){
    const t = todayISO(), org = S.settings.orgName?.trim() || DEFAULT_ORG;
    return baseRepShell.call(this)
      .replace(`<button class="btn" type="button" id="btnCsv"`, `<button class="btn primary" type="button" id="btnPrint">${ICON.receipt}طباعة التقرير</button><button class="btn" type="button" id="btnCsv"`)
      .replace(`<div class="page">`, `<div class="page"><div class="print-head"><img src="logo-sm.png" alt=""><div class="org"><b>${esc(org)}</b><span>${esc(window.APP_CONFIG.tagline)}</span></div>
<div class="rt"><b>التقرير المالي</b><span id="prLabel"></span><br>تاريخ الطباعة: ${esc(hijri(t))} هـ · ${esc(gDate(t))} م</div></div>`)
      .replace("<h3>مكافآت المعلمين</h3>", "<h3>مكافآت المعلمين والمشرفين</h3>")
      .replace(/<\/div>$/, `<div class="print-sign"><div><i></i>المحاسب</div><div><i></i>مدير المجمع</div></div></div>`);
  };
  const baseRepFill = views.reports.fill;
  views.reports.fill = function(){ baseRepFill.call(this); const l = $("#prLabel"); if (l) l.textContent = repLabel(); };
  const baseRepBind = views.reports.bind;
  views.reports.bind = function(){
    baseRepBind.call(this);
    $("#btnPrint").onclick = () => { const old = document.title; document.title = `التقرير المالي - ${repLabel()}`; window.print(); document.title = old; };
  };

  /* ---------- custody requests: partial approval with a written reason ---------- */
  const partErr = (sheet, msg) => { const e = $("#dErr", sheet); if (e) { e.textContent = msg; e.hidden = false; } };
  const enhanceDecide = () => {
    const sheet = $("#modalRoot .sheet"), ok = sheet && $("#dOk", sheet), amt = sheet && $("#dAmt", sheet);
    if (!ok || !amt || $("#dPart", sheet)) return;
    const req = parseFloat(amt.defaultValue) || 0;
    amt.closest(".form-grid").insertAdjacentHTML("afterend", `<div class="part-box" id="partBox" hidden>
<div class="field"><label for="dPartWhy">سبب الموافقة الجزئية</label><textarea id="dPartWhy" rows="3" placeholder="مثال: يُعتمد مبلغ الجوائز فقط، والضيافة تُطلب لاحقًا"></textarea></div>
<p class="c-sub">المبلغ المطلوب ${money(req)}. اكتب في «المبلغ المعتمد» مبلغًا أقل، ويُرسل السبب لصاحب العهدة على واتساب.</p></div>`);
    ok.insertAdjacentHTML("afterend", `<button class="btn" type="button" id="dPart">موافقة جزئية</button>`);
    const box = $("#partBox", sheet), why = $("#dPartWhy", sheet), part = $("#dPart", sheet), lbl = $('label[for="dAmt"]', sheet);
    const open = () => { box.hidden = false; lbl.textContent = "المبلغ المعتمد جزئيًا (ر.س)"; part.textContent = "تأكيد الموافقة الجزئية"; part.classList.add("primary"); ok.hidden = true;
      const nf = $("#dNote", sheet)?.closest(".field"); if (nf) nf.hidden = true;
      if ((parseFloat(amt.value) || 0) >= req) amt.value = ""; amt.focus(); };
    part.onclick = () => {
      if (box.hidden) return open();
      const v = parseFloat(amt.value) || 0;
      if (v <= 0 || v >= req) { amt.focus(); return partErr(sheet, `اكتب مبلغًا أقل من المطلوب (${money(req)}).`); }
      if (!why.value.trim()) { why.focus(); return partErr(sheet, "اكتب سبب الموافقة الجزئية، ويُرسل لصاحب العهدة على واتساب."); }
      ok.click();
    };
    /* approving less than requested always carries the reason, whichever button was used */
    ok.addEventListener("click", e => {
      const v = parseFloat(amt.value) || 0; if (!(v > 0 && v < req)) return;
      const r = why.value.trim() || ($("#dNote", sheet)?.value || "").trim();
      if (!r) { e.stopImmediatePropagation(); open(); why.focus(); return partErr(sheet, "المبلغ أقل من المطلوب: اكتب سبب الموافقة الجزئية."); }
      const n = $("#dNote", sheet); if (n) n.value = r;
    }, true);
  };
  new MutationObserver(enhanceDecide).observe($("#modalRoot"), { childList: true, subtree: true });

  /* ---------- voucher form: amount in words while typing, wording for supervisors ---------- */
  const baseTx = openTx;
  window.openTx = function(...args){
    baseTx(...args);
    const amt = $("#txAmount"); if (!amt) return;
    const out = document.createElement("span"); out.className = "tx-words";
    const say = () => { const v = parseFloat(amt.value); out.textContent = v > 0 ? tafqeet(Math.round(v * 100) / 100) : ""; };
    amt.after(out); amt.addEventListener("input", say); say();
    const lbl = document.querySelector('label[for="txTeacher"]'); if (lbl) lbl.textContent = "المعلم أو المشرف";
    const first = document.querySelector('#txTeacher option[value=""]'); if (first) first.textContent = "— اختر —";
  };
})();

// Tasks (المهام): the system admin assigns tasks to members; each member sees «مهامي» and marks them done.
// It gets rpc and token by wrapping Custody.init.
(function(){
  const T = { role: null, list: [], people: [], tab: "open", who: "", loaded: false };
  let rpc, token;
  const ERR = {
    no_title: "اكتب عنوان المهمة.",
    no_assignee: "اختر من تُسند إليه المهمة.",
    no_reason: "اكتب الملاحظة، وتُرسل له على واتساب.",
    bad_state: "تغيّرت حالة المهمة. حدّث الصفحة.",
    forbidden: "ليست لديك صلاحية لهذا الإجراء.",
    network: "تعذّر الاتصال. تحقق من الإنترنت وأعد المحاولة."
  };
  const ICO = { list: svg("M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2") };
  const admin = () => T.role === "admin";
  const mgr = () => T.role === "admin" || T.role === "accountant";
  const late = t => t.status === "open" && t.due && t.due < todayISO();
  const tno = t => "م-" + String(t.id).padStart(4, "0");
  const openMine = () => T.list.filter(t => t.status === "open" && (mgr() ? true : t.assignee === S.phone));
  const badgeN = () => admin() ? T.list.filter(late).length : mgr() ? 0 : openMine().length;

  const css = document.createElement("style");
  css.textContent = `
.tk-list{display:grid;gap:10px}
.tk{display:grid;gap:8px;padding:14px 16px;border:1px solid var(--line);border-radius:var(--r);background:var(--surface)}
.tk.done{background:var(--surface-2)}
.tk.done h4{color:var(--muted);text-decoration:line-through;text-decoration-thickness:1px}
.tk-top{display:flex;align-items:flex-start;gap:10px}
.tk-top h4{margin:0;flex:1;min-width:0;font-size:15px;font-weight:700;line-height:1.6}
.tk-det{margin:0;font-size:13.5px;line-height:1.8;color:var(--ink-2,var(--ink));white-space:pre-wrap}
.tk-meta{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:12.5px;color:var(--muted)}
.tk-note{padding:8px 10px;border-radius:10px;background:var(--good-bg);color:var(--good);font-size:13px;line-height:1.7}
.tk-foot{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
.cs-switch{display:flex;margin-bottom:14px}
.cs-switch .seg{width:100%}.cs-switch .seg button{flex:1}
.cs-switch .badge{position:static;margin-inline-start:6px}`;
  document.head.appendChild(css);

  async function load(){
    if (!rpc) return;
    const r = await rpc("task_list", { p_token: token() });
    if (!r?.ok) return;
    const first = !T.loaded;
    T.role = r.role; T.list = r.tasks || []; T.people = r.people || []; T.loaded = true;
    if (S.view === "tasks" && $("#tkBody")) { if (first) show("tasks"); else views.tasks.fill(); }
    paintHeader();
  }
  async function act(fn, args, okMsg){
    const r = await rpc(fn, { p_token: token(), ...args });
    if (r?.error) return r;
    if (okMsg) toast(okMsg);
    await load();
    return r;
  }
  const errOf = r => ERR[r?.error] || ERR.network;

  /* custody holders have no side nav: a switcher between their two pages */
  const switcher = cur => {
    if (!isCustRole(T.role) && document.documentElement.classList.contains("is-cust") === false) return "";
    const n = openMine().length;
    return `<div class="cs-switch"><div class="seg"><button type="button" data-go="custody" aria-pressed="${cur === "custody"}">عهدي</button><button type="button" data-go="tasks" aria-pressed="${cur === "tasks"}">مهامي${n ? `<span class="badge">${n}</span>` : ""}</button></div></div>`;
  };
  document.addEventListener("click", e => { const b = e.target.closest(".cs-switch [data-go]"); if (b) { show(b.dataset.go); window.scrollTo({ top: 0 }); } });
  const custShell = views.custody.shell;
  views.custody.shell = function(){ return switcher("custody") + custShell.call(this); };

  views.tasks = {
    shell(){
      const a = admin(), m = mgr();
      const tabs = [["open", "الحالية"], ["done", "المنجزة"], ["all", "الكل"]];
      const people = [...new Map(T.list.map(t => [t.assignee, t.assignee_name || showPhone(t.assignee)])).entries()].sort((x, y) => x[1].localeCompare(y[1], "ar"));
      return `${switcher("tasks")}<div class="page">
${pageHead(m ? "المهام" : "مهامي", a ? "أسند المهام للإداريين والمستخدمين، وتصلهم على واتساب." : m ? "المهام المسندة من مدير النظام وحالة إنجازها." : "المهام المسندة إليك من مدير النظام. اضغط «تم الإنجاز» عند الانتهاء.",
  a ? `<button class="btn primary" type="button" id="tkNew">${ICON.plus}مهمة جديدة</button>` : "")}
<div class="filters"><div class="seg" id="tkTabs">${tabs.map(([k, t]) => `<button type="button" data-tab="${k}" aria-pressed="${T.tab === k}">${t}</button>`).join("")}</div>
${m ? `<select id="tkWho" aria-label="الشخص"><option value="">الكل</option>${people.map(([ph, n]) => `<option value="${esc(ph)}"${T.who === ph ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>` : ""}</div>
<div class="tk-list" id="tkBody"></div></div>`;
    },
    fill(){
      const body = $("#tkBody"); if (!body) return;
      if (!T.loaded) { body.innerHTML = `<section class="panel"><div class="empty"><span>جارٍ التحميل…</span></div></section>`; return; }
      const L = T.list.filter(t => (T.tab === "all" || t.status === T.tab) && (!T.who || t.assignee === T.who));
      if (!L.length) { body.innerHTML = `<section class="panel"><div class="empty"><span>${T.tab === "open" ? "لا توجد مهام حالية." : "لا توجد مهام."}</span></div></section>`; return; }
      const a = admin(), mine = t => t.assignee === S.phone;
      body.innerHTML = L.map(t => `<article class="tk${t.status === "done" ? " done" : ""}">
<div class="tk-top"><h4>${esc(t.title)}</h4>${t.status === "done" ? `<span class="chip good">منجزة</span>` : late(t) ? `<span class="chip bad">متأخرة</span>` : `<span class="chip info">قيد التنفيذ</span>`}</div>
${t.details ? `<p class="tk-det">${esc(t.details)}</p>` : ""}
<div class="tk-meta"><span>${tno(t)}</span>${mgr() ? `<span>إلى: <b>${esc(t.assignee_name || showPhone(t.assignee))}</b></span>` : ""}${t.due ? `<span>المطلوب قبل: ${esc(gDate(t.due))}</span>` : ""}<span>أُسندت: ${esc(gDate(String(t.created_at).slice(0, 10)))}</span>${t.done_at ? `<span>أُنجزت: ${esc(gDate(String(t.done_at).slice(0, 10)))}</span>` : ""}</div>
${t.done_note ? `<div class="tk-note">${esc(t.done_note)}</div>` : ""}
${(t.status === "open" && (mine(t) || a)) || a ? `<div class="tk-foot">
${t.status === "open" && (mine(t) || a) ? `<button class="btn sm primary" type="button" data-tk-done="${t.id}">${ICON.pay}تم الإنجاز</button>` : ""}
${a && t.status === "done" ? `<button class="btn sm" type="button" data-tk-reopen="${t.id}">إعادة المهمة</button>` : ""}
${a ? `<button class="btn sm ghost" type="button" data-tk-del="${t.id}">حذف</button>` : ""}</div>` : ""}
</article>`).join("");
    },
    bind(){
      $("#tkNew")?.addEventListener("click", openNew);
      $("#tkTabs").onclick = e => { const b = e.target.closest("[data-tab]"); if (!b) return; T.tab = b.dataset.tab;
        $("#tkTabs").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); views.tasks.fill(); };
      const w = $("#tkWho"); if (w) w.onchange = () => { T.who = w.value; views.tasks.fill(); };
      $("#tkBody").onclick = e => {
        const d = e.target.closest("[data-tk-done]"), ro = e.target.closest("[data-tk-reopen]"), del = e.target.closest("[data-tk-del]");
        if (d) openNote(+d.dataset.tkDone, "done");
        else if (ro) openNote(+ro.dataset.tkReopen, "reopen");
        else if (del) remove(+del.dataset.tkDel);
      };
      load();
    }
  };

  function openNew(){
    openModal(`<form id="tkForm" novalidate><header><h3>مهمة جديدة</h3>${closeBtn}</header>
<div class="content"><div class="form-grid">
<div class="field wide"><label for="tkTo">إلى</label><select id="tkTo"><option value="">اختر…</option>${T.people.map(p => `<option value="${esc(p.phone)}">${esc(p.name || showPhone(p.phone))}</option>`).join("")}</select></div>
<div class="field wide"><label for="tkTitle">المهمة</label><input type="text" id="tkTitle" placeholder="مثال: شراء جوائز مسابقة الحفظ"></div>
<div class="field wide"><label for="tkDet">التفاصيل (اختياري)</label><textarea id="tkDet" rows="3"></textarea></div>
<div class="field"><label for="tkDue">المطلوب قبل (اختياري)</label><input type="date" id="tkDue" min="${todayISO()}"></div>
</div><p class="c-sub">تصله المهمة على واتساب، وتصلك رسالة عند إنجازها.</p><p class="err" id="tkErr" hidden></p></div>
<footer><button class="btn primary" type="submit">إسناد المهمة</button><button class="btn" type="button" data-close>إلغاء</button></footer></form>`, sheet => {
      $("#tkForm", sheet).onsubmit = async e => { e.preventDefault();
        const err = $("#tkErr", sheet); err.hidden = true;
        if (!$("#tkTo", sheet).value) { err.textContent = ERR.no_assignee; err.hidden = false; return; }
        const b = e.submitter; if (b) b.disabled = true;
        const r = await act("task_add", { p_assignee: $("#tkTo", sheet).value, p_title: $("#tkTitle", sheet).value, p_details: $("#tkDet", sheet).value, p_due: $("#tkDue", sheet).value || null }, "أُسندت المهمة وأُبلغ صاحبها على واتساب");
        if (b) b.disabled = false;
        if (r?.error) { err.textContent = errOf(r); err.hidden = false; return; }
        closeModal(); };
    });
  }

  function openNote(id, kind){
    const t = T.list.find(x => x.id === id); if (!t) return;
    const done = kind === "done";
    openModal(`<form id="tnForm" novalidate><header><h3>${done ? "تم الإنجاز" : "إعادة المهمة"}</h3>${closeBtn}</header>
<div class="content"><p style="margin:0;font-weight:600">${esc(t.title)}</p>
<div class="field"><label for="tnNote">${done ? "ملاحظة (اختياري)" : "سبب الإعادة"}</label><textarea id="tnNote" rows="3" placeholder="${done ? "مثال: تم الشراء والتسليم" : "ما المطلوب تعديله؟"}"></textarea></div>
<p class="err" id="tnErr" hidden></p></div>
<footer><button class="btn primary" type="submit">${done ? "تأكيد الإنجاز" : "إعادة وإبلاغه"}</button><button class="btn" type="button" data-close>إلغاء</button></footer></form>`, sheet => {
      $("#tnForm", sheet).onsubmit = async e => { e.preventDefault();
        const b = e.submitter; if (b) b.disabled = true;
        const r = await act(done ? "task_done" : "task_reopen", { p_id: id, p_note: $("#tnNote", sheet).value }, done ? "أُبلغ مدير النظام بإنجاز المهمة" : "أُعيدت المهمة وأُبلغ صاحبها");
        if (b) b.disabled = false;
        if (r?.error) { const el = $("#tnErr", sheet); el.textContent = errOf(r); el.hidden = false; return; }
        closeModal(); };
    });
  }

  async function remove(id){
    const t = T.list.find(x => x.id === id); if (!t || !confirm(`حذف المهمة «${t.title}»؟`)) return;
    const r = await act("task_del", { p_id: id }, "حُذفت المهمة");
    if (r?.error) toast(errOf(r));
  }

  /* ---------- nav, header, routing ---------- */
  const navBtn = document.createElement("button");
  navBtn.type = "button"; navBtn.setAttribute("role", "tab"); navBtn.dataset.view = "tasks";
  navBtn.innerHTML = `${ICO.list}<span id="navTaskT">المهام</span><span class="badge" id="bTask" hidden></span>`;
  navBtn.onclick = () => { show("tasks"); window.scrollTo({ top: 0 }); };
  const navRef = document.querySelector('.nav [data-view="reports"]');
  navRef.parentNode.insertBefore(navBtn, navRef);

  const basePaint = paintHeader;
  window.paintHeader = function(){
    basePaint();
    navBtn.hidden = !T.loaded;
    $("#navTaskT").textContent = mgr() ? "المهام" : "مهامي";
    const n = badgeN(), b = $("#bTask"); b.textContent = n; b.hidden = !n;
  };
  const baseShow = show;
  window.show = function(v){
    if (v !== "tasks") return baseShow(v);
    S.view = "tasks";
    $("#view").innerHTML = views.tasks.shell();
    views.tasks.bind(); views.tasks.fill(); paintHeader();
  };

  const baseInit = Custody.init;
  Custody.init = async function(ctx){
    rpc = ctx.rpc; token = ctx.token;
    load();
    setInterval(() => { if (!document.hidden) load(); }, 30000);
    window.addEventListener("focus", load);
    return baseInit.call(this, ctx);
  };
})();

// Messages (الرسائل): the system admin or the accountant writes a WhatsApp message to any users and sees what was sent.
(function(){
  const M = { role: null, people: [], log: [], pick: new Set(), q: "", loaded: false };
  let rpc, token;
  const ROLE = new Proxy({}, { get: (_, r) => window.roleName ? roleName(r) : r });
  const ERR = { no_body: "اكتب نص الرسالة.", no_recipients: "اختر مستلمًا واحدًا على الأقل.", too_long: "الرسالة طويلة، اختصرها إلى 3000 حرف.", forbidden: "ليست لديك صلاحية لهذا الإجراء." };
  const ICO = { mail: svg("M4 6h16v12H4zM4 7l8 6 8-6") };
  const css = document.createElement("style");
  css.textContent = `
.msg-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:20px;align-items:start}
@media (max-width:1100px){.msg-grid{grid-template-columns:minmax(0,1fr)}}
.msg-form{display:grid;gap:14px;padding:16px}
.msg-groups{display:flex;flex-wrap:wrap;gap:6px}
.msg-people{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:6px;max-height:260px;overflow:auto;padding:2px}
.msg-people label{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;cursor:pointer;background:var(--surface);transition:border-color .12s,background .12s}
.msg-people label:hover{border-color:var(--line-strong)}
.msg-people label:has(input:checked){border-color:var(--brand);background:var(--brand-soft)}
.msg-people input{width:16px;height:16px;accent-color:var(--brand);flex:none}
.msg-people .nm{flex:1;min-width:0}.msg-people .nm b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.msg-people .nm span{font-size:12px;color:var(--muted)}
.msg-form textarea{min-height:130px;resize:vertical;line-height:1.8}
.msg-count{font-size:12px;color:var(--muted);text-align:left}
.msg-prev{white-space:pre-wrap;padding:12px 14px;border-radius:12px;background:#e9f6ec;border:1px solid #d3ebdc;font-size:13.5px;line-height:1.8;color:#1f3b2a}
.msg-log{display:grid}
.msg-log article{padding:12px 16px;border-top:1px solid var(--line);display:grid;gap:4px}
.msg-log article:first-child{border-top:0}
.msg-log .meta{font-size:12px;color:var(--muted)}
.msg-log p{margin:0;white-space:pre-wrap;line-height:1.8;font-size:14px}`;
  document.head.appendChild(css);

  async function load(){
    if (!rpc || document.documentElement.classList.contains("is-cust")) return;
    const r = await rpc("msg_list", { p_token: token() });
    if (!r?.ok) return;
    const first = !M.loaded;
    M.role = r.role; M.people = r.people || []; M.log = r.log || []; M.loaded = true;
    if (S.view === "messages" && $("#msgPeople")) { if (first) show("messages"); else fillLog(); }
    navBtn.hidden = false;
  }
  /* the WhatsApp text as it will look: *bold* and _italic_ rendered */
  const wa = t => esc(t).replace(/\*([^*\n]+)\*/g, "<b>$1</b>").replace(/(^|\s)_([^_\n]+)_/g, "$1<i>$2</i>");
  const preview = b => wa(`*${S.settings.orgName?.trim() || DEFAULT_ORG}*\n━━━━━━━━━━━━━━\n✉️ *رسالة من إدارة المجمع*\n\n${b.trim() || "…"}\n\n🔗 ${window.APP_CONFIG.siteUrl}`);
  const clearErr = () => { const e = $("#msgErr"); if (e) e.hidden = true; };

  views.messages = {
    shell(){
      return `<div class="page">
${pageHead("الرسائل", `اكتب رسالة وأرسلها على واتساب لمن تختار من المستخدمين، وتصل نسخة منها ${M.role === "accountant" ? "لمدير النظام" : "للمحاسب"}.`)}
<div class="msg-grid">
<section class="panel"><header><h3>رسالة جديدة</h3></header><form class="msg-form" id="msgForm" novalidate>
<div class="field"><label>المستلمون</label>
<div class="msg-groups" id="msgGroups">${[["all", "الكل"], ["custodian", "الإداريون"], ["tech", "الدعم الفني"], ["accountant", "المحاسبون"], ["admin", "مدير النظام"]]
  .filter(([g]) => g === "all" || M.people.some(p => p.role === g)).map(([g, t]) => `<button class="btn sm" type="button" data-g="${g}">${t}</button>`).join("")}<button class="btn sm" type="button" data-g="none">إلغاء التحديد</button></div></div>
<input type="search" id="msgQ" placeholder="بحث بالاسم" value="${esc(M.q)}">
<div class="msg-people" id="msgPeople"></div>
<div class="field"><label for="msgBody">نص الرسالة</label><textarea id="msgBody" maxlength="3000" placeholder="مثال: السلام عليكم ورحمة الله، نذكّركم باجتماع المعلمين يوم الخميس بعد العصر."></textarea><div class="msg-count" id="msgCount" dir="ltr">0 / 3000</div></div>
<div class="field"><label>تصل بهذا الشكل</label><div class="msg-prev" id="msgPrev"></div></div>
<p class="err" id="msgErr" hidden></p>
<div><button class="btn primary" type="submit" id="msgSend">${ICO.mail}<span>إرسال</span></button></div>
</form></section>
<section class="panel"><header><h3>الرسائل المرسلة</h3></header><div class="msg-log" id="msgLog"></div></section>
</div></div>`;
    },
    fill(){ fillPeople(); fillLog(); paintSend(); $("#msgPrev").innerHTML = preview($("#msgBody").value); },
    bind(){
      $("#msgQ").oninput = e => { M.q = e.target.value; fillPeople(); };
      $("#msgPeople").onchange = e => { const c = e.target.closest("input[data-ph]"); if (!c) return; c.checked ? M.pick.add(c.dataset.ph) : M.pick.delete(c.dataset.ph); paintSend(); clearErr(); };
      $("#msgGroups").onclick = e => { const b = e.target.closest("[data-g]"); if (!b) return; const g = b.dataset.g;
        if (g === "none") M.pick.clear(); else M.people.filter(p => g === "all" || p.role === g).forEach(p => M.pick.add(p.phone));
        fillPeople(); paintSend(); clearErr(); };
      $("#msgBody").oninput = e => { $("#msgCount").textContent = `${e.target.value.length} / 3000`; $("#msgPrev").innerHTML = preview(e.target.value); clearErr(); };
      $("#msgForm").onsubmit = async e => { e.preventDefault();
        const err = $("#msgErr"), body = $("#msgBody").value; err.hidden = true;
        const fail = m => { err.textContent = m; err.hidden = false; };
        if (!M.pick.size) return fail(ERR.no_recipients);
        if (!body.trim()) { $("#msgBody").focus(); return fail(ERR.no_body); }
        if (M.pick.size > 3 && !confirm(`إرسال الرسالة إلى ${M.pick.size} مستخدمين على واتساب؟`)) return;
        const b = $("#msgSend"); b.disabled = true;
        const r = await rpc("msg_send", { p_token: token(), p_to: [...M.pick], p_body: body });
        b.disabled = false;
        if (!r?.ok) return fail(ERR[r?.error] || "تعذّر الإرسال. تحقق من الاتصال وأعد المحاولة.");
        toast(`أُرسلت الرسالة إلى ${r.sent} ${r.sent === 1 ? "مستخدم" : "مستخدمين"} على واتساب`);
        M.pick.clear(); $("#msgBody").value = ""; views.messages.fill(); $("#msgCount").textContent = "0 / 3000";
        load();
      };
      load();
    }
  };
  function fillPeople(){
    const box = $("#msgPeople"); if (!box) return;
    if (!M.loaded) { box.innerHTML = `<span class="sub">جارٍ التحميل…</span>`; return; }
    const q = M.q.trim(), L = M.people.filter(p => !q || (p.name || "").includes(q) || showPhone(p.phone).includes(q));
    box.innerHTML = L.length ? L.map(p => `<label><input type="checkbox" data-ph="${esc(p.phone)}"${M.pick.has(p.phone) ? " checked" : ""}><span class="nm"><b>${esc(p.name || showPhone(p.phone))}</b><span>${esc(ROLE[p.role] || "")}</span></span></label>`).join("")
      : `<span class="sub">لا يوجد مستخدم بهذا الاسم.</span>`;
  }
  function paintSend(){ const s = $("#msgSend span"); if (s) s.textContent = M.pick.size ? `إرسال إلى ${M.pick.size}` : "إرسال"; }
  function fillLog(){
    const box = $("#msgLog"); if (!box) return;
    box.innerHTML = M.log.length ? M.log.map(x => `<article><div class="meta">${esc(gDate(String(x.created_at).slice(0, 10)))} · ${x.mine ? "منك" : `من ${esc(x.from || "")}`} · إلى ${x.n <= 3 ? esc((x.names || []).join("، ")) : `${x.n} مستخدمين`}</div><p>${esc(x.body)}</p></article>`).join("")
      : `<div class="empty"><span>لم تُرسل رسائل بعد.</span></div>`;
  }

  const navBtn = document.createElement("button");
  navBtn.type = "button"; navBtn.setAttribute("role", "tab"); navBtn.dataset.view = "messages"; navBtn.hidden = true;
  navBtn.innerHTML = `${ICO.mail}<span>الرسائل</span>`;
  navBtn.onclick = () => { show("messages"); window.scrollTo({ top: 0 }); };
  const navRef = document.querySelector('.nav [data-view="reports"]');
  navRef.parentNode.insertBefore(navBtn, navRef);

  const basePaint = paintHeader;
  window.paintHeader = function(){ basePaint(); navBtn.hidden = !M.loaded; };
  const baseShow = show;
  window.show = function(v){
    if (v !== "messages") return baseShow(v);
    if (!M.loaded) return baseShow("summary");
    S.view = "messages";
    $("#view").innerHTML = views.messages.shell();
    views.messages.bind(); views.messages.fill(); paintHeader();
  };
  const baseInit = Custody.init;
  Custody.init = async function(ctx){
    rpc = ctx.rpc; token = ctx.token;
    load();
    return baseInit.call(this, ctx);
  };
})();

// Cancelling a pending custody request: the requester can withdraw it before it is approved.
(function(){
  let rpc, token;
  const CANCELLED = "أُلغي الطلب بطلب صاحبه";
  const enhance = () => {
    const sheet = $("#modalRoot .sheet"); if (!sheet || sheet.dataset.cx) return;
    const head = sheet.querySelector(":scope > header"), foot = sheet.querySelector(":scope > footer");
    if (!head || !foot) return;
    sheet.dataset.cx = "1";
    /* a withdrawn request reads as cancelled, not rejected */
    const note = sheet.querySelector(".c-note");
    if (note && note.textContent.includes(CANCELLED)) {
      note.innerHTML = `<b>ملغاة:</b> ${CANCELLED}.`;
      const ch = head.querySelector(".chip"); if (ch) { ch.textContent = "ملغاة"; ch.className = "chip mute"; }
      return;
    }
    const chip = head.querySelector(".chip"), no = head.querySelector(".num");
    if (!chip || chip.textContent.trim() !== "طلب جديد" || $("#dOk", sheet) || !no) return;
    const id = parseInt(no.textContent.replace(/\D/g, ""), 10); if (!id) return;
    const close = foot.querySelector("[data-close]");
    close.insertAdjacentHTML("beforebegin", `<button class="btn danger" type="button" id="dCancel">إلغاء الطلب</button>`);
    const b = $("#dCancel", sheet);
    b.onclick = async () => {
      if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "تأكيد إلغاء الطلب"; return; }
      b.disabled = true;
      const r = await rpc("cust_cancel", { p_token: token(), p_id: id });
      b.disabled = false;
      if (!r?.ok) { const e = $("#dErr", sheet); if (e) { e.textContent = r?.error === "bad_state" ? "تغيّرت حالة الطلب، حدّث الصفحة." : "تعذّر الإلغاء. تحقق من الاتصال وأعد المحاولة."; e.hidden = false; } return; }
      closeModal(); toast("أُلغي طلب العهدة"); Custody.reload();
    };
  };
  new MutationObserver(enhance).observe($("#modalRoot"), { childList: true, subtree: true });
  const baseInit = Custody.init;
  Custody.init = async function(ctx){ rpc = ctx.rpc; token = ctx.token; return baseInit.call(this, ctx); };
})();
