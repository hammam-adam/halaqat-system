// Custodies (العهد): requests, issuing within an accounts manager's budget, invoices, settlement.
// Loaded by app.js after core.js; app.js calls Custody.init({ rpc, token }) once signed in.
(function(){
  const ROLE_LABEL = { admin: "مدير النظام", accountant: "مدير حسابات", staff: "مستخدم", custodian: "صاحب عهدة" };
  const ROLE_CHIP = { admin: "good", accountant: "info", staff: "mute", custodian: "warn" };
  const ST = {
    requested: ["طلب جديد", "warn"], open: ["قائمة", "info"], submitted: ["بانتظار التصفية", "warn"],
    closed: ["مغلقة", "good"], rejected: ["مرفوضة", "bad"]
  };
  const ERR = {
    bad_amount: "اكتب مبلغًا صحيحًا أكبر من صفر.",
    no_purpose: "اكتب الغرض من العهدة.",
    no_holder: "اختر صاحب العهدة.",
    over_budget: "المبلغ يتجاوز رصيد صلاحيتك.",
    over_custody: "مجموع الفواتير يتجاوز مبلغ العهدة.",
    no_file: "أرفق صورة الفاتورة.",
    file_too_big: "الملف كبير. صوّر الفاتورة بدقة أقل أو أرفق ملف PDF أصغر من 2.5 ميجا.",
    bad_state: "تغيّرت حالة العهدة. حدّث الصفحة.",
    no_reason: "اكتب السبب، ويُرسل لصاحب العهدة على واتساب.",
    too_soon: "أُرسل تذكير لهذه العهدة قبل أقل من ساعة.",
    no_invoices: "ارفع فاتورة واحدة على الأقل مع صورتها أو ملفها قبل التصفية.",
    forbidden: "ليست لديك صلاحية لهذا الإجراء.",
    network: "تعذّر الاتصال. تحقق من الإنترنت وأعد المحاولة."
  };
  const ICO = {
    box: svg("M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8"),
    hand: svg("M3 12h4l3-2h5a2 2 0 0 1 0 4h-3M7 18l3-2h5l5-4"),
    file: svg("M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h4"),
    cam: svg("M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"),
    shield: svg("M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"),
    trash: svg("M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3")
  };
  const C = { me: null, list: [], holders: [], tab: null, who: "", q: "", loaded: false };
  let rpc, token;

  const cno = c => "ع-" + String(c.id).padStart(4, "0");
  const mgr = () => C.me && (C.me.role === "admin" || C.me.role === "accountant");
  const itemsSum = c => sum(c.items || []);
  const chip = c => { let [t, k] = ST[c.status] || [c.status, "mute"]; if (c.status === "submitted") t = c.submit_kind === "partial" ? "تصفية جزئية للاعتماد" : "تصفية نهائية للاعتماد";
    return `<span class="chip ${k}">${t}</span>`; };
  const settledSum = c => +c.settled_total || 0;
  const newItems = c => (c.items || []).filter(i => !i.settled);
  const dt = ts => ts ? gDate(String(ts).slice(0, 10)) : "";
  const errText = r => (r?.error === "over_budget" && r.budget != null) ? `المبلغ يتجاوز رصيد صلاحيتك المتاح (${money(r.budget)}).`
    : (r?.error === "over_custody" && r.left != null) ? `مجموع الفواتير يتجاوز مبلغ العهدة. المتبقي لك ${money(r.left)}.`
    : ERR[r?.error] || ERR.network;
  const nameOf = ph => C.holders.find(h => h.phone === ph)?.name || (ph === C.me?.phone ? C.me.name : "") || showPhone(ph);
  const needsMe = c => mgr() ? (c.status === "requested" || c.status === "submitted") : c.status === "open";

  const css = document.createElement("style");
  css.textContent = `
.chip.info{background:color-mix(in srgb,var(--info) 12%,transparent);color:var(--info)}
.budget-line{display:flex;justify-content:space-between;gap:8px;align-items:baseline;padding:10px 12px;margin-bottom:10px;border-radius:10px;background:var(--side-2);color:var(--side-fg);font-size:12.5px}
.budget-line b{font-size:15px;color:var(--gold-hi);font-variant-numeric:tabular-nums}
.c-info{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px 18px;margin:0}
.c-info div{display:grid;gap:2px}.c-info dt{font-size:12px;color:var(--muted)}.c-info dd{margin:0;font-weight:600}
.c-note{padding:10px 12px;border-radius:10px;background:var(--warn-bg);color:var(--warn);font-size:13.5px;line-height:1.7}
.c-sum{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid var(--line);border-radius:12px;overflow:hidden}
.c-sum div{padding:10px 12px;display:grid;gap:2px;border-inline-start:1px solid var(--line)}.c-sum div:first-child{border:0}
.c-sum4{grid-template-columns:repeat(4,minmax(0,1fr))}
.c-sum span{font-size:12px;color:var(--muted)}.c-sum b{font-size:16px;font-variant-numeric:tabular-nums}
.inv{display:grid;gap:8px}
.inv-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
.inv-row .ic{width:36px;height:36px;flex:0 0 36px;border-radius:10px;display:grid;place-items:center;background:var(--brand-soft);color:var(--brand)}
.inv-row .tx{flex:1;min-width:0}.inv-row .tx b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.inv-row .tx span{font-size:12px;color:var(--muted)}
.inv-row .amt{font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.sheet .content{grid-template-columns:minmax(0,1fr)}
.inv-add{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0;padding:14px;border:1px dashed var(--line-strong);border-radius:12px;background:var(--surface-2)}
.file-pick{position:relative;min-width:0;display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface);cursor:pointer;color:var(--muted)}
.file-pick input{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer}
.file-pick span{min-width:0;overflow:hidden;text-overflow:ellipsis}
.inv-add input,.inv-add select{min-width:0;width:100%}
.file-pick.has{color:var(--good);border-color:color-mix(in srgb,var(--good) 40%,transparent);background:var(--good-bg)}
.file-view{display:grid;place-items:center;background:var(--surface-2);border-radius:12px;overflow:hidden}
.file-view img{max-width:100%;max-height:70dvh;display:block}
.file-view iframe{width:100%;height:70dvh;border:0}
.c-sub{font-size:12px;color:var(--muted)}
.sheet textarea{width:100%;resize:vertical;min-height:70px}
#cBody[data-sum]:not(:has(.empty))::before{content:attr(data-sum);display:block;padding:10px 16px;font-size:12.5px;color:var(--muted);border-bottom:1px solid var(--line)}
@media (max-width:760px){.c-sum4{grid-template-columns:repeat(2,minmax(0,1fr))}.c-sum4 div:nth-child(3){border-inline-start:0}.c-sum4 div:nth-child(n+3){border-top:1px solid var(--line)}}
@media (max-width:560px){.inv-row{flex-wrap:wrap}.inv-row .tx{flex:1 1 calc(100% - 48px)}.inv-row .amt{margin-inline-start:48px;flex:1}.c-sum{grid-template-columns:minmax(0,1fr)}.c-sum div{border-inline-start:0;border-top:1px solid var(--line)}.c-sum.c-sum4{grid-template-columns:repeat(2,minmax(0,1fr))}.c-sum4 div:nth-child(-n+2){border-top:0}.c-sum4 div:nth-child(even){border-inline-start:1px solid var(--line)}}`;
  document.head.appendChild(css);

  /* ---------- data ---------- */
  async function load(){
    if (!rpc) return;
    const r = await rpc("cust_list", { p_token: token() });
    if (!r?.ok) return;
    const first = !C.loaded;
    if (first && !C.tab) C.tab = r.me.role === "admin" ? "all" : "action";
    C.me = r.me; C.list = r.custodies; C.holders = r.holders; C.loaded = true;
    // the page title and buttons depend on the role, known only after the first load
    if (S.view === "custody" && $("#cBody")) { if (first) show("custody"); else views.custody.fill(); }
    paintHeader();
  }
  async function act(fn, args, okMsg){
    const r = await rpc(fn, { p_token: token(), ...args });
    if (r?.error) return r;
    if (okMsg) toast(okMsg);
    await load();
    return r;
  }

  /* ---------- page ---------- */
  views.custody = {
    shell(){
      const m = mgr();
      const right = m ? `<button class="btn primary" type="button" id="cIssue">${ICON.plus}صرف عهدة</button>`
        : `<button class="btn primary" type="button" id="cReq">${ICON.plus}طلب عهدة</button>`;
      const tabs = [["action", m ? "تحتاج إجراء" : "الحالية"], ["open", "القائمة"], ["done", "المنتهية"], ["all", "الكل"], ...(m ? [["people", "حسب الموظف"]] : [])];
      const people = [...new Map(C.list.map(c => [c.holder, c.holder_name || nameOf(c.holder)])).entries()].sort((a, b) => a[1].localeCompare(b[1], "ar"));
      return `<div class="page">
${pageHead(m ? "العهد" : "عهدي", m ? "اعتماد طلبات العهد وصرفها، ومراجعة فواتيرها وتصفيتها." : "اطلب عهدة، وارفع فواتيرها، ثم سدّدها لتُراجع وتُغلق.", right)}
<div class="kpis" id="cKpis"></div>
<div class="filters"><div class="seg" id="cTabs">${tabs.map(([k, t]) => `<button type="button" data-tab="${k}" aria-pressed="${C.tab === k}">${t}</button>`).join("")}</div>
${m ? `<select id="cWho" aria-label="صاحب العهدة"><option value="">كل الموظفين</option>${people.map(([ph, n]) => `<option value="${esc(ph)}"${C.who === ph ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>
<input class="grow" type="search" id="cQ" placeholder="بحث بالغرض أو رقم العهدة" value="${esc(C.q)}">` : ""}</div>
<section class="panel" id="cBody"></section></div>`;
    },
    fill(){
      if (!C.loaded) { $("#cBody").innerHTML = `<div class="empty"><span>جارٍ التحميل…</span></div>`; return; }
      const m = mgr(), L = C.list;
      delete $("#cBody").dataset.sum;
      const live = L.filter(c => c.status === "open" || c.status === "submitted");
      const outstanding = sum(live, c => +c.amount), invoiced = sum(live, c => itemsSum(c));
      const pending = L.filter(needsMe).length;
      if (m) {
        $("#cKpis").innerHTML =
          (C.me.role === "accountant"
            ? kpi({ label: "رصيد صلاحيتك المتاح", value: mh(C.me.budget), icon: ICO.shield, lead: true, note: "تصرف منه العهد وسندات الصرف" })
            : kpi({ label: "عهد قائمة لدى الموظفين", value: mh(outstanding), icon: ICO.box, lead: true, note: `${live.length} عهدة لم تُغلق` })) +
          kpi({ label: "تحتاج إجراءك", value: `<span class="num">${pending}</span>`, icon: ICON.clock, tone: "var(--warn)", note: "طلبات جديدة وتسديدات للمراجعة" }) +
          kpi({ label: "مبالغ العهد القائمة", value: mh(outstanding), icon: ICO.hand, tone: "var(--exp)", note: `بفواتير ${money(invoiced)}` }) +
          kpi({ label: "المتبقي لدى أصحاب العهد", value: mh(outstanding - invoiced), icon: ICON.wallet, tone: "var(--info)", note: "يُرجَع عند التصفية" });
      } else {
        $("#cKpis").innerHTML =
          kpi({ label: "عهدتك الجارية", value: mh(outstanding), icon: ICO.box, lead: true, note: `${live.length} عهدة لم تُغلق` }) +
          kpi({ label: "فواتيرك المرفوعة", value: mh(invoiced), icon: ICON.receipt, tone: "var(--exp)", note: "على العهد القائمة" }) +
          kpi({ label: "المتبقي في عهدتك", value: mh(outstanding - invoiced), icon: ICON.wallet, tone: "var(--info)", note: "يُرجَع نقدًا عند التسديد" }) +
          kpi({ label: "طلبات بانتظار الاعتماد", value: `<span class="num">${L.filter(c => c.status === "requested").length}</span>`, icon: ICON.clock, tone: "var(--warn)" });
      }
      if (C.tab === "people") return fillPeople();
      const q = C.q.trim();
      const rows = L.filter(c => (!C.who || c.holder === C.who) && (!q || c.purpose.includes(q) || cno(c).includes(q) || String(c.id) === q)).filter(c => C.tab === "all" ? true : C.tab === "open" ? c.status === "open" || c.status === "submitted"
        : C.tab === "done" ? c.status === "closed" || c.status === "rejected" : needsMe(c) || (!m && c.status === "requested") || (!m && c.status === "submitted"));
      if (!L.length) {
        $("#cBody").innerHTML = empty(ICO.box, m ? "لا توجد عهد بعد" : "لا توجد لديك عهد",
          m ? "اصرف عهدة لأحد الموظفين، أو انتظر طلباتهم. تصلك رسالة واتساب عند كل طلب جديد." : "اطلب عهدة بالمبلغ والغرض، وتصلك رسالة واتساب عند اعتمادها.",
          m ? `<button class="btn primary" type="button" data-c-issue="1">${ICON.plus}صرف عهدة</button>` : `<button class="btn primary" type="button" data-c-req="1">${ICON.plus}طلب عهدة</button>`);
        return;
      }
      if (rows.length && m) { const tot = sum(rows, c => c.status === "requested" || c.status === "rejected" ? 0 : +c.amount);
        $("#cBody").dataset.sum = `${rows.length} عهدة · مجموعها ${money(tot)}`; }
      if (!rows.length) { $("#cBody").innerHTML = `<div class="empty"><span>${C.tab === "action" ? "لا يوجد ما يحتاج إجراء الآن." : "لا توجد عهد بهذه الحالة."}</span></div>`; return; }
      $("#cBody").innerHTML = `<div class="tbl"><table class="dt"><thead><tr><th>العهدة</th>${m ? "<th>صاحب العهدة</th>" : ""}<th>التاريخ</th><th class="n">المبلغ</th><th class="n">الفواتير</th><th class="n">المتبقي</th><th>الحالة</th><th></th></tr></thead><tbody>
${rows.map(c => { const inv = itemsSum(c), live = c.status === "open" || c.status === "submitted";
  const btn = m ? (c.status === "requested" ? "مراجعة الطلب" : c.status === "submitted" ? "مراجعة التصفية" : "")
    : (c.status === "open" ? "رفع الفواتير" : "");
  return `<tr class="click" data-c-open="${c.id}" tabindex="0">
<td class="main"><div class="title">${esc(c.purpose)}</div><span class="sub num">${cno(c)}</span></td>
${m ? `<td data-label="صاحب العهدة"><div class="who"><span class="avatar">${esc(initial(c.holder_name))}</span><span>${esc(c.holder_name || showPhone(c.holder))}</span></div></td>` : ""}
<td data-label="التاريخ">${esc(dt(c.issued_at || c.created_at))}</td>
<td data-label="المبلغ" class="n">${money(c.status === "requested" ? c.requested : c.amount)}</td>
<td data-label="الفواتير" class="n">${c.items.length ? `${money(inv)} <span class="c-sub">(${c.items.length})</span>` : `<span class="sub">—</span>`}</td>
<td data-label="المتبقي" class="n">${live ? `<strong>${money(c.amount - inv)}</strong>${settledSum(c) ? `<br><span class="c-sub">صُفّي ${money(settledSum(c))}</span>` : ""}` : c.status === "closed" ? `<span class="sub">أُرجع ${money(c.returned)}</span>` : ""}</td>
<td data-label="الحالة">${chip(c)}</td>
<td data-label="" class="n">${btn ? `<button class="btn sm${needsMe(c) ? " primary" : ""}" type="button" data-c-open="${c.id}">${btn}</button>` : ""}</td></tr>`; }).join("")}
</tbody></table></div>`;
    },
    bind(){
      const i = $("#cIssue"); if (i) i.onclick = openIssue;
      const q = $("#cReq"); if (q) q.onclick = openRequest;
      $("#cTabs").onclick = e => { const b = e.target.closest("[data-tab]"); if (!b) return; C.tab = b.dataset.tab;
        $("#cTabs").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); views.custody.fill(); };
      $("#cBody").onclick = e => {
        if (e.target.closest("[data-c-issue]")) return openIssue();
        if (e.target.closest("[data-c-req]")) return openRequest();
        const r = e.target.closest("[data-c-open]"); if (r) openCustody(+r.dataset.cOpen);
      };
      const who = $("#cWho"); if (who) who.onchange = () => { C.who = who.value; if (C.tab === "people") { C.tab = "all"; $("#cTabs").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x.dataset.tab === "all")); } views.custody.fill(); };
      const cq = $("#cQ"); if (cq) cq.oninput = () => { C.q = cq.value; views.custody.fill(); };
      $("#cBody").addEventListener("click", e => { const p = e.target.closest("[data-who]"); if (!p) return; e.stopPropagation(); C.who = p.dataset.who; C.tab = "all"; show("custody"); });
      $("#cBody").onkeydown = e => { if (e.key === "Enter") { const r = e.target.closest("tr[data-c-open]"); if (r) openCustody(+r.dataset.cOpen); } };
      load();
    }
  };

  function fillPeople(){
    const by = new Map();
    C.list.forEach(c => { const g = by.get(c.holder) || { ph: c.holder, name: c.holder_name || nameOf(c.holder), n: 0, live: 0, amt: 0, inv: 0, spent: 0, pend: 0 };
      g.n++;
      if (c.status === "open" || c.status === "submitted") { g.live++; g.amt += +c.amount; g.inv += itemsSum(c); }
      if (c.status === "closed") g.spent += +c.spent || 0;
      if (c.status === "requested" || c.status === "submitted") g.pend++;
      by.set(c.holder, g); });
    const rows = [...by.values()].sort((a, b) => (b.amt - b.inv) - (a.amt - a.inv) || a.name.localeCompare(b.name, "ar"));
    if (!rows.length) { $("#cBody").innerHTML = `<div class="empty"><span>لا توجد عهد بعد.</span></div>`; return; }
    $("#cBody").innerHTML = `<div class="tbl"><table class="dt"><thead><tr><th>الموظف</th><th class="n">عدد العهد</th><th class="n">القائمة الآن</th><th class="n">بفواتير</th><th class="n">المتبقي في عهدته</th><th class="n">صُرف فعليًا (المغلقة)</th><th></th></tr></thead><tbody>
${rows.map(g => `<tr class="click" data-who="${esc(g.ph)}" tabindex="0">
<td class="main"><div class="who"><span class="avatar">${esc(initial(g.name))}</span><div><div class="title">${esc(g.name)}</div>${g.pend ? `<span class="sub">${g.pend} بانتظار إجراء</span>` : ""}</div></div></td>
<td data-label="عدد العهد" class="n num">${g.n}</td>
<td data-label="القائمة الآن" class="n">${g.live ? `${money(g.amt)} <span class="c-sub">(${g.live})</span>` : `<span class="sub">—</span>`}</td>
<td data-label="بفواتير" class="n">${g.live ? money(g.inv) : `<span class="sub">—</span>`}</td>
<td data-label="المتبقي في عهدته" class="n">${g.live ? `<strong>${money(g.amt - g.inv)}</strong>` : `<span class="sub">—</span>`}</td>
<td data-label="صُرف فعليًا" class="n">${money(g.spent)}</td>
<td data-label="" class="n"><button class="btn sm" type="button" data-who="${esc(g.ph)}">عرض عهده</button></td></tr>`).join("")}
</tbody></table></div>`;
  }

  // core.js picked the starting page before this view existed
  const hash = (location.hash || "").slice(1);
  if (hash === "custody" || (!views[hash] && storeGet("halaqat.view") === "custody")) S.view = "custody";

  /* ---------- forms ---------- */
  function formErr(sheet, sel, r){ const el = $(sel, sheet); el.textContent = typeof r === "string" ? r : errText(r); el.hidden = false; }

  function openRequest(){
    openModal(`<form id="crForm" novalidate><header><h3>طلب عهدة</h3>${closeBtn}</header>
<div class="content"><div class="form-grid">
<div class="field"><label for="crAmt">المبلغ المطلوب (ر.س)</label><input type="number" id="crAmt" min="1" step="0.01" inputmode="decimal" placeholder="0"></div>
<div class="field wide"><label for="crPur">الغرض</label><input type="text" id="crPur" placeholder="مثال: شراء جوائز مسابقة الحفظ"></div>
</div><p class="c-sub">يصل طلبك لمدير الحسابات على واتساب، وتصلك رسالة عند اعتماده.</p><p class="err" id="crErr" hidden></p></div>
<footer><button class="btn primary" type="submit">إرسال الطلب</button><button class="btn" type="button" data-close>إلغاء</button></footer></form>`, sheet => {
      $("#crForm", sheet).onsubmit = async e => { e.preventDefault(); const b = e.submitter; if (b) b.disabled = true;
        const r = await act("cust_request", { p_amount: parseFloat($("#crAmt", sheet).value) || 0, p_purpose: $("#crPur", sheet).value }, "أُرسل طلب العهدة");
        if (b) b.disabled = false;
        if (r?.error) return formErr(sheet, "#crErr", r);
        closeModal(); };
    });
  }

  function openIssue(){
    const acct = C.me.role === "accountant";
    const opts = C.holders.filter(h => h.phone !== C.me.phone || C.me.role !== "admin");
    openModal(`<form id="ciForm" novalidate><header><h3>صرف عهدة</h3>${closeBtn}</header>
<div class="content">${acct ? `<div class="c-note" style="background:var(--brand-soft);color:var(--brand)">رصيد صلاحيتك المتاح: <b>${money(C.me.budget)}</b></div>` : ""}
<div class="form-grid">
<div class="field wide"><label for="ciHolder">صاحب العهدة</label><select id="ciHolder"><option value="">اختر…</option>${opts.map(h => `<option value="${esc(h.phone)}">${esc(h.name || showPhone(h.phone))} — ${ROLE_LABEL[h.role] || ""}</option>`).join("")}</select></div>
<div class="field"><label for="ciAmt">المبلغ (ر.س)</label><input type="number" id="ciAmt" min="1" step="0.01" inputmode="decimal" placeholder="0"></div>
<div class="field wide"><label for="ciPur">الغرض</label><input type="text" id="ciPur" placeholder="مثال: مستلزمات الحلقات لشهر ربيع الآخر"></div>
</div>${opts.length ? "" : `<p class="c-sub">لا يوجد أصحاب عهد. أضفهم من صفحة «المستخدمون» بصلاحية «صاحب عهدة».</p>`}<p class="err" id="ciErr" hidden></p></div>
<footer><button class="btn primary" type="submit">صرف العهدة</button><button class="btn" type="button" data-close>إلغاء</button></footer></form>`, sheet => {
      $("#ciForm", sheet).onsubmit = async e => { e.preventDefault();
        if (!$("#ciHolder", sheet).value) return formErr(sheet, "#ciErr", ERR.no_holder);
        const b = e.submitter; if (b) b.disabled = true;
        const r = await act("cust_issue", { p_holder: $("#ciHolder", sheet).value, p_amount: parseFloat($("#ciAmt", sheet).value) || 0, p_purpose: $("#ciPur", sheet).value }, "صُرفت العهدة وأُبلغ صاحبها على واتساب");
        if (b) b.disabled = false;
        if (r?.error) return formErr(sheet, "#ciErr", r);
        closeModal(); };
    });
  }

  /* ---------- one custody ---------- */
  function openCustody(id){
    const c = C.list.find(x => x.id === id); if (!c) return;
    const m = mgr(), mine = c.holder === C.me.phone, inv = itemsSum(c), left = c.amount - inv;
    const canEdit = mine && c.status === "open";
    const cats = EXPENSE_CATS.filter(x => x !== REWARD_CAT);
    const items = c.items.length ? `<div class="inv">${c.items.map(i => `<div class="inv-row">
<span class="ic">${ICO.file}</span><div class="tx"><b>${esc(i.descr || i.category)}</b><span>${esc(gDate(i.date))} · ${esc(i.category)}${i.settled ? ` · <span class="chip good">مُصفّاة</span>` : c.status === "submitted" ? ` · <span class="chip warn">ضمن هذه التصفية</span>` : ""}</span></div>
<span class="amt">${money(i.amount)}</span>
${i.has_file ? `<button class="btn sm" type="button" data-file="${i.id}">عرض</button>` : ""}
${canEdit && !i.settled ? `<button class="btn sm ghost icon-only" type="button" data-del-item="${i.id}" aria-label="حذف الفاتورة" title="حذف الفاتورة">${ICO.trash}</button>` : ""}</div>`).join("")}</div>`
      : `<p class="c-sub">${c.status === "requested" || c.status === "rejected" ? "" : "لم تُرفع فواتير بعد."}</p>`;
    const addForm = canEdit ? `<form class="inv-add" id="iForm" novalidate>
<strong>إضافة فاتورة</strong>
<div class="form-grid">
<div class="field"><label for="iAmt">مبلغ الفاتورة (ر.س)</label><input type="number" id="iAmt" min="0.01" step="0.01" inputmode="decimal" placeholder="0"></div>
<div class="field"><label for="iDate">التاريخ</label><input type="date" id="iDate" value="${todayISO()}"></div>
<div class="field"><label for="iCat">البند</label><select id="iCat">${cats.map(x => `<option>${esc(x)}</option>`).join("")}</select></div>
<div class="field"><label for="iDesc">البيان</label><input type="text" id="iDesc" placeholder="مثال: جوائز من مكتبة جرير"></div>
<div class="field wide"><label class="file-pick" id="iPick">${ICO.cam}<span id="iPickT">صوّر الفاتورة أو اختر ملفًا (صورة أو PDF)</span><input type="file" id="iFile" accept="image/*,application/pdf"></label></div>
</div><p class="err" id="iErr" hidden></p>
<div><button class="btn primary" type="submit">${ICON.plus}إضافة الفاتورة</button></div></form>` : "";
    let actions = "";
    if (m && c.status === "requested") actions = `<div class="form-grid">
<div class="field"><label for="dAmt">المبلغ المعتمد (ر.س)</label><input type="number" id="dAmt" min="1" step="0.01" value="${c.requested}"></div>
<div class="field wide"><label for="dNote">ملاحظة مع الاعتماد (اختياري)</label><input type="text" id="dNote" placeholder="تظهر لصاحب العهدة"></div></div>
<div class="field" id="rejBox" hidden><label for="dReason">سبب الرفض</label><textarea id="dReason" rows="3" placeholder="اكتب سبب الرفض، ويُرسل لصاحب العهدة على واتساب"></textarea></div>
${C.me.role === "accountant" ? `<p class="c-sub">رصيد صلاحيتك المتاح: ${money(C.me.budget)}</p>` : ""}`;
    if (m && c.status === "submitted") actions = `<div class="field" id="rejBox" hidden><label for="dReason">سبب الإعادة للتعديل</label><textarea id="dReason" rows="3" placeholder="مثال: فاتورة الضيافة غير واضحة"></textarea></div>
<p class="c-sub">${c.submit_kind === "partial"
  ? `تصفية جزئية: عند الاعتماد يُنشأ سند صرف بالفواتير الجديدة (${money(inv - settledSum(c))})، وتبقى العهدة قائمة بالمتبقي ${money(left)}.`
  : `تصفية نهائية: عند الاعتماد يُنشأ سند صرف بالفواتير الجديدة (${money(inv - settledSum(c))})، وتُغلق العهدة، ويعود المبلغ المُرجَع (${money(left)}) إلى رصيد الصلاحية.`}</p>`;
    if (m && c.status === "open") actions += `<div class="field" id="remBox" hidden><label for="dRem">رسالة إضافية مع التذكير (اختياري)</label><textarea id="dRem" rows="2" placeholder="مثال: نحتاج الفواتير قبل نهاية الأسبوع"></textarea></div>
${c.reminded_at ? `<p class="c-sub">آخر تذكير: ${esc(dt(c.reminded_at))}</p>` : ""}`;
    const foot = [];
    if (m && c.status === "open") foot.push(`<button class="btn" type="button" id="dRemind">🔔 إرسال تذكير</button>`);
    if (m && c.status === "requested") foot.push(`<button class="btn primary" type="button" id="dOk">اعتماد وصرف</button>`, `<button class="btn danger" type="button" id="dNo">رفض الطلب</button>`);
    if (m && c.status === "submitted") foot.push(`<button class="btn primary" type="button" id="dClose">${c.submit_kind === "partial" ? "اعتماد التصفية الجزئية" : "اعتماد التصفية وإغلاق العهدة"}</button>`, `<button class="btn" type="button" id="dBack">إعادة للتعديل</button>`);
    const fresh = newItems(c).length;
    if (canEdit) foot.push(`<button class="btn primary" type="button" id="dSubmit"${fresh || settledSum(c) ? "" : " disabled"}>تصفية نهائية</button>`,
      `<button class="btn" type="button" id="dPartial"${fresh ? "" : " disabled"}>تصفية جزئية</button>`);
    foot.push(`<button class="btn" type="button" data-close>إغلاق</button>`);

    openModal(`<header><h3>العهدة <span class="num">${cno(c)}</span></h3>${chip(c)}${closeBtn}</header>
<div class="content">
${c.note && (c.status === "open" || c.status === "rejected") ? `<div class="c-note"><b>${c.status === "rejected" ? "سبب الرفض" : "ملاحظة المراجع"}:</b> ${esc(c.note)}</div>` : ""}
<dl class="c-info">
<div><dt>الغرض</dt><dd>${esc(c.purpose)}</dd></div>
<div><dt>صاحب العهدة</dt><dd>${esc(c.holder_name || showPhone(c.holder))}</dd></div>
<div><dt>${c.status === "requested" ? "تاريخ الطلب" : "تاريخ الصرف"}</dt><dd>${esc(dt(c.status === "requested" ? c.created_at : c.issued_at || c.created_at))}</dd></div>
${c.requested && c.requested !== c.amount && c.status !== "requested" ? `<div><dt>المبلغ المطلوب</dt><dd>${money(c.requested)}</dd></div>` : ""}
${c.issued_by && c.status !== "requested" ? `<div><dt>${c.status === "rejected" ? "رفضها" : c.created_by === c.issued_by ? "صرفها" : "اعتمدها"}</dt><dd>${esc(nameOf(c.issued_by))}</dd></div>` : ""}
${c.closed_at ? `<div><dt>تاريخ الإغلاق</dt><dd>${esc(dt(c.closed_at))}</dd></div>${c.closed_by ? `<div><dt>أغلقها</dt><dd>${esc(nameOf(c.closed_by))}</dd></div>` : ""}` : ""}
</dl>
${c.status === "requested" || c.status === "rejected" ? `<div class="c-sum"><div><span>المبلغ المطلوب</span><b>${money(c.requested)}</b></div></div>` :
  `<div class="c-sum c-sum4"><div><span>مبلغ العهدة</span><b>${money(c.amount)}</b></div><div><span>صُفّي واعتُمد</span><b style="color:var(--good)">${money(settledSum(c))}</b></div><div><span>فواتير لم تُصفَّ</span><b>${money(inv - settledSum(c))}</b></div><div><span>${c.status === "closed" ? "المُرجَع" : "المتبقي في العهدة"}</span><b style="color:var(--info)">${money(c.status === "closed" ? c.returned : left)}</b></div></div>`}
${c.status === "requested" || c.status === "rejected" ? "" : `<div><div class="sec-head" style="margin-bottom:8px"><strong>الفواتير</strong></div>${items}</div>`}
${addForm}${actions}${canEdit ? `<p class="c-sub">${fresh ? "«تصفية جزئية» ترسل الفواتير الجديدة للاعتماد وتبقى العهدة معك بالمتبقي. «تصفية نهائية» تغلق العهدة وتسلّم المتبقي نقدًا." : "ارفع فاتورة مع صورتها أو ملفها لتقدر ترسل التصفية."}</p>` : ""}<p class="err" id="dErr" hidden></p>
</div><footer>${foot.join("")}</footer>`, sheet => bindCustody(sheet, c, left));
  }

  function bindCustody(sheet, c, left){
    const again = () => { const fresh = C.list.find(x => x.id === c.id); if (fresh) openCustody(c.id); else closeModal(); };
    const busy = (b, on) => { if (b) b.disabled = on; };
    sheet.onclick = async e => {
      const f = e.target.closest("[data-file]"); if (f) return viewFile(+f.dataset.file, c.id);
      const d = e.target.closest("[data-del-item]");
      if (d) {
        if (!d.classList.contains("armed")) { d.classList.add("armed", "danger"); d.title = "اضغط مرة ثانية للحذف"; return; }
        busy(d, true); const r = await act("cust_item_del", { p_item: +d.dataset.delItem }, "حُذفت الفاتورة");
        if (r?.error) { toast(errText(r)); busy(d, false); } else again();
      }
    };
    const file = $("#iFile", sheet);
    if (file) file.onchange = () => { const x = file.files[0]; $("#iPick", sheet).classList.toggle("has", !!x); $("#iPickT", sheet).textContent = x ? x.name : "صوّر الفاتورة أو اختر ملفًا (صورة أو PDF)"; };
    const iForm = $("#iForm", sheet);
    if (iForm) iForm.onsubmit = async e => {
      e.preventDefault(); $("#iErr", sheet).hidden = true;
      const amt = parseFloat($("#iAmt", sheet).value) || 0, x = file.files[0];
      if (amt <= 0) return formErr(sheet, "#iErr", ERR.bad_amount);
      if (amt > left + 1e-9) return formErr(sheet, "#iErr", `مبلغ الفاتورة أكبر من المتبقي في العهدة (${money(left)}).`);
      if (!x) return formErr(sheet, "#iErr", ERR.no_file);
      const b = e.submitter; busy(b, true); b.textContent = "جارٍ الرفع…";
      let enc;
      try { enc = await encodeFile(x); } catch (er) { busy(b, false); b.textContent = "إضافة الفاتورة"; return formErr(sheet, "#iErr", er.message || "تعذّرت قراءة الملف."); }
      const r = await act("cust_item_add", { p_custody: c.id, p_date: $("#iDate", sheet).value || todayISO(), p_amount: amt, p_descr: $("#iDesc", sheet).value,
        p_category: $("#iCat", sheet).value, p_file_name: x.name, p_file_mime: enc.mime, p_file_data: enc.data }, "أُضيفت الفاتورة");
      busy(b, false); b.innerHTML = `${ICON.plus}إضافة الفاتورة`;
      if (r?.error) return formErr(sheet, "#iErr", r);
      again();
    };
    const on = (sel, fn) => { const b = $(sel, sheet); if (b) b.onclick = async () => { $("#dErr", sheet).hidden = true; busy(b, true); const r = await fn(b); busy(b, false); if (r?.error) formErr(sheet, "#dErr", r); }; };
    const note = () => $("#dNote", sheet)?.value || "";
    /* reject / send back: the first click opens the reason box, the second sends it */
    const reason = b => { const box = $("#rejBox", sheet);
      if (box.hidden) { box.hidden = false; $("#dReason", sheet).focus(); b.textContent = b.id === "dNo" ? "تأكيد الرفض" : "تأكيد الإعادة"; return null; }
      const v = $("#dReason", sheet).value.trim(); if (!v) { $("#dReason", sheet).focus(); return { error: "no_reason" }; } return v; };
    on("#dRemind", async b => { const box = $("#remBox", sheet);
      if (box.hidden) { box.hidden = false; $("#dRem", sheet).focus(); b.textContent = "تأكيد إرسال التذكير"; return; }
      const r = await act("cust_remind", { p_id: c.id, p_note: $("#dRem", sheet).value }, "أُرسل التذكير لصاحب العهدة على واتساب"); if (!r?.error) closeModal(); return r; });
    on("#dOk", async () => { const r = await act("cust_decide", { p_id: c.id, p_approve: true, p_amount: parseFloat($("#dAmt", sheet).value) || 0, p_note: note() }, "اعتُمدت العهدة وأُبلغ صاحبها"); if (!r?.error) closeModal(); return r; });
    on("#dNo", async b => { const v = reason(b); if (v === null || v?.error) return v;
      const r = await act("cust_decide", { p_id: c.id, p_approve: false, p_amount: 0, p_note: v }, "رُفض الطلب وأُرسل السبب لصاحب العهدة"); if (!r?.error) closeModal(); return r; });
    on("#dClose", async b => { if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = c.submit_kind === "partial" ? "تأكيد اعتماد الفواتير" : `تأكيد: استلمت ${money(left)} وأغلق العهدة`; return; }
      const r = await act("cust_close", { p_id: c.id }, c.submit_kind === "partial" ? "اعتُمدت التصفية الجزئية وسُجّلت سندات الصرف" : "أُغلقت العهدة وسُجّلت سندات الصرف"); if (!r?.error) closeModal(); return r; });
    on("#dBack", async b => { const v = reason(b); if (v === null || v?.error) return v;
      const r = await act("cust_return", { p_id: c.id, p_note: v }, "أُعيدت العهدة لصاحبها مع السبب"); if (!r?.error) closeModal(); return r; });
    on("#dSubmit", async b => { if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = left > 0 ? `تأكيد: أسلّم المتبقي ${money(left)}` : "تأكيد التسديد"; return; }
      const r = await act("cust_submit_kind", { p_id: c.id, p_kind: "final" }, "أُرسلت التصفية النهائية للمراجعة"); if (!r?.error) closeModal(); return r; });
    on("#dPartial", async b => { if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = `تأكيد تصفية ${money(sum(newItems(c)))}`; return; }
      const r = await act("cust_submit_kind", { p_id: c.id, p_kind: "partial" }, "أُرسلت التصفية الجزئية للمراجعة"); if (!r?.error) closeModal(); return r; });
  }

  async function viewFile(item, cid){
    toast("جارٍ فتح الفاتورة…");
    const r = await rpc("cust_file", { p_token: token(), p_item: item });
    if (!r?.ok || !r.data) return toast("تعذّر فتح الملف.");
    const bin = atob(r.data), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u8], { type: r.mime || "application/octet-stream" }));
    const img = /^image\//.test(r.mime);
    openModal(`<header><h3>${esc(r.name || "الفاتورة")}</h3>${closeBtn}</header>
<div class="content"><div class="file-view">${img ? `<img src="${url}" alt="صورة الفاتورة">` : `<iframe src="${url}" title="الفاتورة"></iframe>`}</div></div>
<footer><button class="btn" type="button" id="fBack">رجوع للعهدة</button><a class="btn" href="${url}" download="${esc(r.name || "فاتورة")}">تنزيل</a></footer>`, sheet => {
      $("#fBack", sheet).onclick = () => { URL.revokeObjectURL(url); openCustody(cid); };
    });
  }

  /* images are shrunk to ~1600px JPEG before upload; PDFs go as-is up to 2.5 MB */
  function encodeFile(f){
    const toB64 = blob => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = () => no(new Error("تعذّرت قراءة الملف.")); r.readAsDataURL(blob); });
    if (f.type === "application/pdf") {
      if (f.size > 2.5 * 1024 * 1024) return Promise.reject(new Error(ERR.file_too_big));
      return toB64(f).then(data => ({ mime: "application/pdf", data }));
    }
    if (!/^image\//.test(f.type)) return Promise.reject(new Error("أرفق صورة أو ملف PDF."));
    return new Promise((ok, no) => {
      const img = new Image(), src = URL.createObjectURL(f);
      img.onload = () => {
        const k = Math.min(1, 1600 / Math.max(img.width, img.height)), cv = document.createElement("canvas");
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(src);
        cv.toBlob(b => b ? toB64(b).then(data => ok({ mime: "image/jpeg", data }), no) : no(new Error("تعذّرت معالجة الصورة.")), "image/jpeg", 0.75);
      };
      img.onerror = () => { URL.revokeObjectURL(src); no(new Error("تعذّرت قراءة الصورة. جرّب صورة أخرى.")); };
      img.src = src;
    });
  }

  /* ---------- users page: four roles and the accounts manager's budget ---------- */
  views.users.fill = function(){
    const me = S.phone, order = { admin: 0, accountant: 1, staff: 2, custodian: 3 };
    $("#memberList").innerHTML = !S.members.length ? empty(ICON.users, "لا يوجد مستخدمون", "أضف أرقام المحاسب والمشرفين وأصحاب العهد.") :
`<div class="tbl"><table class="dt"><thead><tr><th>الاسم</th><th>الجوال</th><th>الصلاحية</th><th class="n">رصيد الصلاحية</th><th>كلمة المرور</th><th></th></tr></thead><tbody>
${S.members.slice().sort((a, b) => (order[a.role] ?? 9) - (order[b.role] ?? 9) || (a.name || "").localeCompare(b.name || "", "ar")).map(m => `<tr class="click" data-edit-member="${esc(m.phone)}" tabindex="0">
<td class="main"><div class="who"><span class="avatar">${esc(initial(m.name || "؟"))}</span><div class="title">${esc(m.name || "بدون اسم")}${m.phone === me ? ` <span class="tag">أنت</span>` : ""}</div></div></td>
<td data-label="الجوال" class="num" dir="ltr" style="text-align:right">${esc(showPhone(m.phone))}</td>
<td data-label="الصلاحية"><span class="chip ${ROLE_CHIP[m.role] || "mute"}">${ROLE_LABEL[m.role] || m.role}</span></td>
<td data-label="رصيد الصلاحية" class="n">${m.role === "accountant" ? money(m.budget) : `<span class="sub">—</span>`}</td>
<td data-label="كلمة المرور">${m.init_password ? `<span class="pw-init" title="وضعها المدير، وتختفي إذا غيّرها المستخدم"><code>${esc(m.init_password)}</code></span>` : m.has_password ? `<span class="chip good">خاصة بالمستخدم</span>` : `<span class="sub">لا توجد</span>`}</td>
<td data-label="" class="n">${m.phone === me ? "" : `<button class="btn sm danger" type="button" data-del-member="${esc(m.phone)}">إزالة</button>`}</td></tr>`).join("")}
</tbody></table></div>`;
  };
  const ROLE_OPTS = [
    ["staff", "مستخدم — السندات والرسوم والمكافآت"],
    ["accountant", "مدير حسابات — كل شيء في حدود مبلغ الصلاحية، ويعتمد العهد"],
    ["custodian", "صاحب عهدة — طلب العهدة وتسديدها ورفع الفواتير فقط"],
    ["admin", "مدير النظام — كل الصلاحيات وإضافة المستخدمين"]
  ];
  window.openMember = function(phone){
    const m = phone ? S.members.find(x => x.phone === phone) : null;
    openModal(`<form id="mForm" novalidate><header><h3>${m ? "تعديل المستخدم" : "مستخدم جديد"}</h3>${closeBtn}</header>
<div class="content"><div class="form-grid">
<div class="field wide"><label for="mName">الاسم</label><input type="text" id="mName" value="${esc(m?.name || "")}" placeholder="مثال: محاسب المجمع"></div>
<div class="field"><label for="mPhone">رقم الجوال (واتساب)</label><input type="tel" id="mPhone" dir="ltr" style="text-align:right" placeholder="05XXXXXXXX" value="${m ? esc(showPhone(m.phone)) : ""}"${m ? " disabled" : ""}></div>
<div class="field wide"><label for="mRole">الصلاحية</label><select id="mRole">${ROLE_OPTS.map(([k, t]) => `<option value="${k}"${(m?.role || "staff") === k ? " selected" : ""}>${t}</option>`).join("")}</select></div>
<div class="field" id="mBudgetW"><label for="mBudget">${m ? "رصيد الصلاحية المتاح (ر.س)" : "مبلغ الصلاحية (ر.س)"}</label><input type="number" id="mBudget" min="0" step="0.01" inputmode="decimal" value="${m ? +m.budget || 0 : ""}" placeholder="مثال: 10000"></div>
<div class="field wide"><label for="mPw">${m ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور الأولى (اختياري)"}</label><div class="pw-wrap"><input type="text" id="mPw" dir="ltr" autocomplete="off" minlength="6" placeholder="${m ? "اتركها فارغة لإبقاء كلمة المرور الحالية" : "6 أحرف على الأقل"}"><button type="button" class="btn sm" id="mPwGen">توليد</button></div></div>
</div><p class="c-sub">${m?.phone === S.phone ? "كلمة مرورك أنت تُخفى عن الجميع." : "تظهر لك في جدول المستخدمين لين يغيّرها المستخدم من الإعدادات. ويقدر يدخل برمز واتساب في أي وقت."}</p><p class="c-sub" id="mBudgetHint">ينقص الرصيد مع كل عهدة يصرفها أو سند صرف يسجّله، ويعود إليه ما يُرجَع من العهد أو سند يُلغى. زِده متى ما أردت.</p>
<p class="err" id="mErr" hidden></p></div>
<footer><button class="btn primary" type="submit">${m ? "حفظ" : "إضافة"}</button><button class="btn" type="button" data-close>إلغاء</button></footer></form>`, sheet => {
      const sync = () => { const a = $("#mRole", sheet).value === "accountant"; $("#mBudgetW", sheet).hidden = $("#mBudgetHint", sheet).hidden = !a; };
      $("#mRole", sheet).onchange = sync; sync();
      $("#mPwGen", sheet).onclick = () => { const a = "abcdefghjkmnpqrstuvwxyz23456789", r = crypto.getRandomValues(new Uint32Array(8)); $("#mPw", sheet).value = [...r].map(x => a[x % a.length]).join(""); };
      $("#mForm", sheet).onsubmit = async e => { e.preventDefault(); const er = $("#mErr", sheet);
        const args = { p_token: token(), p_name: $("#mName", sheet).value.trim(), p_role: $("#mRole", sheet).value, p_budget: parseFloat($("#mBudget", sheet).value) || 0, p_password: $("#mPw", sheet).value.trim() || null };
        if (args.p_password && args.p_password.length < 6) { er.textContent = "كلمة المرور 6 أحرف على الأقل."; er.hidden = false; return; }
        const r = m ? await rpc("member_update", { ...args, p_phone: m.phone }) : await rpc("member_add", { ...args, p_phone: $("#mPhone", sheet).value });
        if (r?.error) { er.textContent = r.error === "exists" ? "هذا الرقم مسجّل من قبل." : r.error === "bad_phone" ? "اكتب رقم جوال سعودي صحيح يبدأ بـ 05." : r.error === "self" ? "لا يمكنك تغيير صلاحيتك أنت." : r.error === "bad_password" ? "كلمة المرور من 6 إلى 64 حرفًا." : "تعذّر الحفظ. أعد المحاولة."; er.hidden = false; return; }
        toast(m ? "حُفظت التعديلات" : args.p_password ? "أُضيف المستخدم. يدخل برقمه وكلمة المرور، أو برمز واتساب." : "أُضيف المستخدم. يقدر يدخل الآن برقمه."); closeModal(); loadMembers(); load(); };
    });
  };
  document.addEventListener("click", e => {
    if ((S.view !== "users" && S.view !== "settings") || e.target.closest("[data-del-member]")) return;
    const r = e.target.closest("[data-edit-member]"); if (r) openMember(r.dataset.editMember);
  });

  /* ---------- nav, header, routing ---------- */
  const navBtn = document.createElement("button");
  navBtn.type = "button"; navBtn.setAttribute("role", "tab"); navBtn.dataset.view = "custody";
  navBtn.innerHTML = `${ICO.box}<span id="navCustT">العهد</span><span class="badge" id="bCust" hidden></span>`;
  navBtn.onclick = () => { show("custody"); window.scrollTo({ top: 0 }); };
  const navRef = document.querySelector('.nav [data-view="reports"]');
  navRef.parentNode.insertBefore(navBtn, navRef);
  const budgetLine = document.createElement("div");
  budgetLine.className = "budget-line"; budgetLine.hidden = true;
  document.querySelector(".side-foot .who-me")?.prepend(budgetLine);

  /* top bar: custody request / settlement instead of the voucher buttons (those move to the vouchers page) */
  const top = $("#topActions");
  top.innerHTML = `<button class="btn" id="btnSettle" type="button">${ICO.file}تصفية عهدة</button><button class="btn primary" id="btnReq" type="button">${ICON.plus}<span id="btnReqT">طلب عهدة</span></button>`;
  $("#btnReq").onclick = () => { if (C.me) mgr() ? openIssue() : openRequest(); };
  $("#btnSettle").onclick = () => {
    if (!C.me) return;
    const due = C.list.filter(c => mgr() ? c.status === "submitted" : c.holder === C.me.phone && c.status === "open");
    if (due.length === 1) return openCustody(due[0].id);
    if (!due.length) return toast(mgr() ? "لا توجد عهد بانتظار التصفية." : "لا توجد لديك عهدة قائمة لتصفيتها.");
    C.tab = "action"; show("custody"); window.scrollTo({ top: 0 });
  };
  const origLedgerBind = views.ledger.bind;
  views.ledger.bind = function(){
    origLedgerBind?.call(this);
    if (canW()) $(".page-head")?.insertAdjacentHTML("beforeend", `<div class="rowflex"><button class="btn" type="button" data-new="expense">${ICON.exp}سند صرف</button><button class="btn primary" type="button" data-new="income">${ICON.inc}سند قبض</button></div>`);
  };

  const origPaint = paintHeader;
  window.paintHeader = function(){
    origPaint();
    const role = C.me?.role, cust = role === "custodian";
    document.querySelectorAll(".nav button").forEach(b => { if (b.dataset.view !== "custody" && b.id !== "navUsers") b.hidden = cust; });
    $("#navCustT").textContent = mgr() ? "العهد" : "عهدي";
    const n = C.list.filter(needsMe).length, bc = $("#bCust");
    bc.textContent = n; bc.hidden = !n;
    budgetLine.hidden = role !== "accountant";
    if (role === "accountant") budgetLine.innerHTML = `<span>رصيد صلاحيتك</span><b>${money(C.me.budget)}</b>`;
    top.hidden = !C.me;
    $("#btnReqT").textContent = mgr() ? "صرف عهدة" : "طلب عهدة";
  };
  const origShow = show;
  window.show = function(v){
    if (C.me?.role === "custodian") v = "custody";
    if (v !== "custody" || S.db) return origShow(v);
    S.view = "custody";
    $("#view").innerHTML = views.custody.shell();
    views.custody.bind(); views.custody.fill(); paintHeader();
  };
  /* vouchers by an accounts manager draw on the budget; say so when it runs out */
  window.write = async function(fn, okMsg){
    try { await fn(); if (okMsg) toast(okMsg); if (C.me?.role === "accountant") load(); return true; }
    catch (e) {
      if (e?.message === "over_budget") toast(`المبلغ يتجاوز رصيد صلاحيتك (${money(C.me?.budget || 0)}). اطلب من مدير النظام زيادته.`);
      else if (e?.message === "forbidden") toast("ليست لديك صلاحية لهذا الإجراء.");
      else toast("تعذّر الحفظ. تحقق من الاتصال وأعد المحاولة.");
      return false;
    }
  };

  window.Custody = {
    async init(ctx){
      rpc = ctx.rpc; token = ctx.token;
      await load();
      setInterval(() => { if (!document.hidden) load(); }, 20000);
      window.addEventListener("focus", load);
      return C.me;
    },
    reload: load
  };
})();
