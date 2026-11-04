// المستحقات: مبالغ للمجمع عند أشخاص أو جهات ولم تُستلم بعد (متبرع وعد، جهة متأخرة، سلفة...).
// لا تدخل في رصيد الصندوق. عند الاستلام يُسجَّل سند قبض مربوط بالمستحق، وإلغاء السند يعيد المبلغ مستحقًا.
// ويرتّب هذا الملف القائمة الجانبية بأقسام: الإيرادات، المصروفات، الإدارة.
(function(){
  const css = document.createElement("style");
  css.textContent = `
.nav-sec{font-size:11px;font-weight:600;color:var(--side-muted);opacity:.75;padding:14px 14px 4px;letter-spacing:.02em}
@media (max-width:980px){.nav-sec{display:none}}
.rv-list{display:grid}
.rv{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 14px;align-items:center;padding:14px 16px;border-top:1px solid var(--line)}
.rv:first-child{border-top:0}
.rv.click{cursor:pointer}.rv.click:hover{background:var(--surface-2)}
.rv h4{margin:0;font-size:15px;font-weight:700;line-height:1.5}
.rv .meta{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12.5px;color:var(--muted)}
.rv .amt{text-align:end;font-weight:700;font-size:15px;white-space:nowrap}
.rv .amt span{display:block;font-size:12px;font-weight:500;color:var(--muted)}
.rv .acts{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
.rv .acts a.btn{text-decoration:none}
.rv .bar{grid-column:1/-1;height:5px;border-radius:5px;background:var(--surface-2);overflow:hidden}
.rv .bar i{display:block;height:100%;background:var(--good)}
.rv-sum{display:flex;align-items:center;gap:12px;padding:12px 16px;margin-bottom:14px;border:1px solid var(--line);border-radius:var(--r,14px);background:var(--surface);cursor:pointer}
.rv-sum b{color:var(--brand)}.rv-sum .grow{flex:1;min-width:0;font-size:14px;line-height:1.7}
.rv-pays{display:grid;gap:6px;margin-top:4px}
.rv-pays button{display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);font:inherit;font-size:13px;color:inherit;cursor:pointer;text-align:start}`;
  document.head.appendChild(css);

  const COL = "receivables";
  const R = { list: [], sub: false, tab: "open", q: "" };
  const KINDS = ["وعد بتبرع", "دعم جهة أو مؤسسة", "كفالة متأخرة", "سلفة أو قرض", "أخرى"];
  const ICO = svg("M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 1.6 2.6 4.5 3.2 4.5 1.6 4.5 3.3-2 3-4.5 3-4.5-1.3-4.5-3");
  const paidOf = r => sum(live().filter(t => t.type === "income" && t.receivableId === r.id));
  const restOf = r => r.status === "waived" ? 0 : Math.max(0, (+r.amount || 0) - paidOf(r));
  const isOpen = r => r.status !== "waived" && restOf(r) > 0;
  const isLate = r => isOpen(r) && r.due && r.due < todayISO();
  const mgr = () => canW() && !isCustRole(S.role);

  /* القائمة الجانبية: زر المستحقات، ثم الأقسام */
  const navBtn = document.createElement("button");
  navBtn.type = "button"; navBtn.setAttribute("role", "tab"); navBtn.dataset.view = "receivables";
  navBtn.innerHTML = `${ICO}المستحقات<span class="badge" id="bRecv" hidden></span>`;
  navBtn.onclick = () => { show("receivables"); window.scrollTo({ top: 0 }); };
  const nav = document.querySelector(".nav");
  const GROUPS = [[null, ["summary", "ledger"]], ["الإيرادات", ["fees", "receivables"]], ["المصروفات", ["teachers", "custody"]], ["الإدارة", ["tasks", "messages", "reports"]], [null, ["settings"]]];
  if (nav) {
    nav.appendChild(navBtn);
    const byView = v => nav.querySelector(`:scope > button[data-view="${v}"]`);
    const placed = new Set();
    GROUPS.forEach(([label, views]) => {
      if (label) { const d = document.createElement("div"); d.className = "nav-sec"; d.textContent = label; d.dataset.sec = views.join(","); nav.appendChild(d); }
      views.forEach(v => { const b = byView(v); if (b) { nav.appendChild(b); placed.add(b); } });
    });
    [...nav.querySelectorAll(":scope > button")].filter(b => !placed.has(b)).forEach(b => nav.insertBefore(b, nav.querySelector('[data-view="settings"]')));
  }

  const prevPaint = window.paintHeader;
  window.paintHeader = function(){
    prevPaint.apply(this, arguments);
    if (S.db && !R.sub) { R.sub = true; S.db.collection(COL).onSnapshot(s => { R.list = s.docs.map(d => ({ id: d.id, ...d.data() })); paintBadge(); if (S.view === "receivables" && $("#rvBody")) views.receivables.fill(); if (S.view === "summary") paintSummary(); }); }
    navBtn.hidden = !S.db || isCustRole(S.role);
    navBtn.setAttribute("aria-selected", S.view === "receivables" ? "true" : "false");
    paintBadge();
    nav?.querySelectorAll(".nav-sec").forEach(d => { d.hidden = !d.dataset.sec.split(",").some(v => { const b = nav.querySelector(`:scope > button[data-view="${v}"]`); return b && !b.hidden; }); });
  };
  function paintBadge(){ const n = R.list.filter(isLate).length, b = $("#bRecv"); if (b) { b.textContent = n; b.hidden = !n; } }

  /* الملخص: سطر بإجمالي المستحقات (خارج الرصيد) */
  function paintSummary(){
    const k = $("#kpis"); if (!k) return;
    $("#rvSum")?.remove();
    const open = R.list.filter(isOpen); if (!open.length) return;
    const late = open.filter(isLate).length;
    k.insertAdjacentHTML("afterend", `<div class="rv-sum" id="rvSum" role="button" tabindex="0"><i class="kicon">${ICO}</i><div class="grow">لك مستحقات بقيمة <b>${money(sum(open, restOf))}</b> عند ${open.length} ${open.length === 1 ? "جهة" : "جهات"}${late ? ` · <span style="color:var(--bad)">${late} متأخرة</span>` : ""}. لا تدخل في الرصيد حتى تُستلم.</div><span class="btn sm">عرض</span></div>`);
    $("#rvSum").onclick = () => { show("receivables"); window.scrollTo({ top: 0 }); };
  }
  const sumFill = views.summary.fill;
  views.summary.fill = function(){ sumFill.apply(this, arguments); paintSummary(); };

  /* الصفحة */
  views.receivables = {
    shell(){
      const tabs = [["open", "الحالية"], ["late", "المتأخرة"], ["done", "المسددة والمُسقطة"], ["all", "الكل"]];
      return `<div class="page">
${pageHead("المستحقات", "مبالغ للمجمع عند أشخاص أو جهات ولم تُستلم بعد. لا تدخل في رصيد الصندوق إلا لما تستلمها، فيُسجَّل لها سند قبض تلقائيًا.",
  mgr() ? `<button class="btn primary" type="button" id="rvNew">${ICON.plus}مستحق جديد</button>` : "")}
<div class="kpis" id="rvKpis"></div>
<div class="filters"><div class="seg" id="rvTabs">${tabs.map(([k, t]) => `<button type="button" data-tab="${k}" aria-pressed="${R.tab === k}">${t}</button>`).join("")}</div>
<input type="search" id="rvQ" placeholder="بحث بالاسم أو السبب" value="${esc(R.q)}"></div>
<section class="panel" id="rvBody"></section></div>`;
    },
    bind(){
      $("#rvNew") && ($("#rvNew").onclick = () => openRecv());
      $("#rvTabs").onclick = e => { const b = e.target.closest("[data-tab]"); if (!b) return; R.tab = b.dataset.tab; document.querySelectorAll("#rvTabs button").forEach(x => x.setAttribute("aria-pressed", x === b)); this.fill(); };
      $("#rvQ").oninput = e => { R.q = e.target.value; this.fill(); };
      $("#rvBody").onclick = e => {
        const pay = e.target.closest("[data-rv-pay]"); if (pay) return openPay(pay.dataset.rvPay);
        if (e.target.closest("a")) return;
        const row = e.target.closest("[data-rv]"); if (row) openRecv(row.dataset.rv);
      };
    },
    fill(){
      const open = R.list.filter(isOpen), late = open.filter(isLate);
      const got = sum(R.list, paidOf);
      $("#rvKpis").innerHTML =
        kpi({ label: "المتبقي لك", value: money(sum(open, restOf)), icon: ICO, lead: true, note: `${open.length} مستحق قائم` }) +
        kpi({ label: "متأخرة عن موعدها", value: money(sum(late, restOf)), icon: ICON.exp, tone: "var(--bad)", note: `${late.length} مستحق` }) +
        kpi({ label: "استُلم منها", value: money(got), icon: ICON.inc, tone: "var(--inc)", note: "سندات قبض مربوطة بالمستحقات" });
      const q = R.q.trim();
      let L = R.list.filter(r => R.tab === "all" ? true : R.tab === "open" ? isOpen(r) : R.tab === "late" ? isLate(r) : !isOpen(r));
      if (q) L = L.filter(r => (r.name || "").includes(q) || (r.reason || "").includes(q) || (r.kind || "").includes(q));
      L.sort((a, b) => (isOpen(b) - isOpen(a)) || (a.due || "9").localeCompare(b.due || "9") || (b.createdAt || "").localeCompare(a.createdAt || ""));
      const org = S.settings?.orgName || APP_CONFIG.orgName;
      $("#rvBody").innerHTML = L.length ? `<div class="rv-list">${L.map(r => {
        const paid = paidOf(r), rest = restOf(r), pct = Math.min(100, Math.round(paid / (+r.amount || 1) * 100)), ph = normPhone(r.phone || "");
        const st = r.status === "waived" ? `<span class="chip mute">أُسقط الباقي</span>` : !rest ? `<span class="chip good">مسدد</span>` : isLate(r) ? `<span class="chip bad">متأخر</span>` : paid ? `<span class="chip info">مسدد جزئيًا</span>` : `<span class="chip warn">قائم</span>`;
        const msg = `السلام عليكم ${r.name || ""}\nنذكّركم بمبلغ ${money(rest)} المستحق لـ${org}${r.reason ? " عن " + r.reason : ""}.\nجزاكم الله خيرًا.`;
        return `<div class="rv click" data-rv="${esc(r.id)}"><div><h4>${esc(r.name || "بدون اسم")} ${st}</h4><div class="meta"><span>${esc(r.kind || "")}${r.reason ? " · " + esc(r.reason) : ""}</span>${r.due ? `<span>الموعد ${esc(gDate(r.due))}</span>` : ""}${ph ? `<span dir="ltr">${esc(showPhone(ph))}</span>` : ""}</div></div>
<div class="amt">${money(rest)}<span>${paid ? `من ${money(+r.amount || 0)}` : "المتبقي"}</span></div>
${paid && rest ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ""}
${rest && mgr() ? `<div class="acts">${ph ? `<a class="btn sm" href="https://wa.me/${ph}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">تذكير على واتساب</a>` : ""}<button class="btn sm inc" type="button" data-rv-pay="${esc(r.id)}">استلام مبلغ</button></div>` : ""}</div>`; }).join("")}</div>`
        : empty(ICO, R.list.length ? "لا توجد مستحقات هنا" : "لا توجد مستحقات", R.list.length ? "جرّب تبويبًا آخر أو امسح البحث." : "سجّل هنا أي مبلغ لك عند شخص أو جهة ولم يُسلَّم بعد، مثل متبرع وعد بمبلغ أو جهة داعمة تأخر دعمها.",
            mgr() && !R.list.length ? `<button class="btn primary" type="button" onclick="document.getElementById('rvNew').click()">${ICON.plus}مستحق جديد</button>` : "");
      paintHeader();
    }
  };

  /* إضافة وتعديل مستحق */
  function openRecv(id){
    const r = id ? R.list.find(x => x.id === id) : null; if (id && !r) return;
    const pays = r ? live().filter(t => t.type === "income" && t.receivableId === r.id).sort((a, b) => (a.date || "").localeCompare(b.date || "")) : [];
    const ro = !mgr();
    openModal(`<form id="rvForm" novalidate><header><h3>${r ? "المستحق" : "مستحق جديد"}</h3>${closeBtn}</header>
<div class="content"><div class="form-grid">
<div class="field"><label for="rvName">على من؟</label><input type="text" id="rvName" value="${esc(r?.name || "")}" placeholder="اسم الشخص أو الجهة"${ro ? " disabled" : ""}></div>
<div class="field"><label for="rvPhone">الجوال <span class="sub">(اختياري، للتذكير)</span></label><input type="tel" id="rvPhone" dir="ltr" style="text-align:right" value="${esc(r?.phone ? showPhone(r.phone) : "")}" placeholder="05XXXXXXXX"${ro ? " disabled" : ""}></div>
<div class="field"><label for="rvAmount">المبلغ (ر.س)</label><input type="number" id="rvAmount" min="0.01" step="0.01" inputmode="decimal" value="${r ? +r.amount || "" : ""}"${ro ? " disabled" : ""}></div>
<div class="field"><label for="rvDue">موعد السداد <span class="sub">(اختياري)</span></label><input type="date" id="rvDue" value="${esc(r?.due || "")}"${ro ? " disabled" : ""}></div>
<div class="field"><label for="rvKind">النوع</label><select id="rvKind"${ro ? " disabled" : ""}>${KINDS.map(k => `<option${k === (r?.kind || KINDS[0]) ? " selected" : ""}>${k}</option>`).join("")}</select></div>
<div class="field"><label for="rvCat">يُسجَّل عند الاستلام تحت بند</label><select id="rvCat"${ro ? " disabled" : ""}>${INCOME_CATS.map(c => `<option${c === (r?.category || "تبرعات") ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
<div class="field wide"><label for="rvReason">السبب أو البيان</label><textarea id="rvReason" rows="2" placeholder="مثال: تبرع لمسابقة رمضان"${ro ? " disabled" : ""}>${esc(r?.reason || "")}</textarea></div>
</div>
${r ? `<p class="c-sub">استُلم ${money(paidOf(r))} من ${money(+r.amount || 0)}${r.status === "waived" ? "، وأُسقط الباقي" : ""}.</p>${pays.length ? `<div class="rv-pays">${pays.map(t => `<button type="button" data-open-tx="${esc(t.id)}"><span>سند قبض ${esc(vno(t))} · ${esc(gDate(t.date))}</span><b>${money(t.amount)}</b></button>`).join("")}</div>` : ""}` : ""}
<p class="err" id="rvErr" hidden></p></div>
<footer>${ro ? `<button class="btn" type="button" data-close>إغلاق</button>` : `<button class="btn primary" type="submit">${r ? "حفظ" : "إضافة"}</button>${r && isOpen(r) ? `<button class="btn inc" type="button" id="rvPayBtn">استلام مبلغ</button>` : ""}<span class="spacer"></span>${r ? (pays.length ? (isOpen(r) ? `<button class="btn danger" type="button" id="rvWaive">إسقاط الباقي</button>` : r.status === "waived" ? `<button class="btn" type="button" id="rvUnwaive">إعادة الباقي مستحقًا</button>` : "") : `<button class="btn danger" type="button" id="rvDel">حذف</button>`) : ""}`}</footer></form>`, sheet => {
      sheet.querySelectorAll("[data-open-tx]").forEach(b => b.onclick = () => openVoucher(b.dataset.openTx));
      if (ro) return;
      const pb = $("#rvPayBtn", sheet); if (pb) pb.onclick = () => openPay(r.id);
      const arm = (b, text, fn) => { if (!b) return; b.onclick = async () => { if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = text; return; } b.disabled = true; if (await fn()) closeModal(); else b.disabled = false; }; };
      arm($("#rvDel", sheet), "تأكيد الحذف", () => write(() => S.db.doc(`${COL}/${r.id}`).delete(), "حُذف المستحق"));
      arm($("#rvWaive", sheet), "تأكيد إسقاط الباقي", () => write(() => S.db.doc(`${COL}/${r.id}`).update({ status: "waived", waivedAt: new Date().toISOString(), waivedBy: S.uid }), `أُسقط الباقي (${money(restOf(r))})`));
      const uw = $("#rvUnwaive", sheet); if (uw) uw.onclick = async () => { if (await write(() => S.db.doc(`${COL}/${r.id}`).update({ status: "open" }), "رجع الباقي مستحقًا")) closeModal(); };
      $("#rvForm", sheet).onsubmit = async e => {
        e.preventDefault(); const er = $("#rvErr", sheet), bad = m => { er.textContent = m; er.hidden = false; };
        const name = $("#rvName", sheet).value.trim(), amount = Math.round(parseFloat($("#rvAmount", sheet).value) * 100) / 100, phRaw = $("#rvPhone", sheet).value.trim();
        if (!name) return bad("اكتب اسم الشخص أو الجهة.");
        if (!(amount > 0)) return bad("اكتب مبلغًا أكبر من صفر.");
        if (r && amount < paidOf(r)) return bad(`استُلم ${money(paidOf(r))} من هذا المستحق، فلا يكون المبلغ أقل منه.`);
        const phone = phRaw ? normPhone(phRaw) : "";
        if (phRaw && !phone) return bad("اكتب رقم جوال سعودي صحيح يبدأ بـ 05، أو اتركه فارغًا.");
        const body = { name, phone, amount, due: $("#rvDue", sheet).value || "", kind: $("#rvKind", sheet).value, category: $("#rvCat", sheet).value, reason: $("#rvReason", sheet).value.trim() };
        const ok = r ? await write(() => S.db.doc(`${COL}/${r.id}`).update({ ...body, updatedAt: new Date().toISOString(), updatedBy: S.uid }), "حُفظ المستحق")
          : await write(() => S.db.collection(COL).add({ ...body, status: "open", createdAt: new Date().toISOString(), createdBy: S.uid }), `أُضيف مستحق ${money(amount)} على ${name}`);
        if (ok) closeModal();
      };
    });
  }

  /* استلام مبلغ: سند قبض مربوط بالمستحق */
  function openPay(id){
    const r = R.list.find(x => x.id === id); if (!r) return;
    const rest = restOf(r), nextNo = 1 + Math.max(0, ...S.tx.filter(x => x.type === "income").map(x => +x.no || 0));
    openModal(`<form id="rpForm" novalidate><header><span class="ico inc">${ICON.inc}</span><h3>استلام من ${esc(r.name)} <span class="vno">${vno({ type: "income", no: nextNo })}</span></h3>${closeBtn}</header>
<div class="content"><div class="form-grid">
<div class="field"><label for="rpAmount">المبلغ المستلم (ر.س)</label><input type="number" id="rpAmount" min="0.01" step="0.01" max="${rest}" inputmode="decimal" value="${rest}"><span class="sub">المتبقي ${money(rest)}</span></div>
<div class="field"><label for="rpDate">التاريخ</label><input type="date" id="rpDate" value="${todayISO()}"></div>
<div class="field"><label for="rpMethod">طريقة الدفع</label><select id="rpMethod">${Object.entries(METHODS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>
<div class="field"><label>البند</label><input type="text" value="${esc(r.category || "تبرعات")}" disabled></div>
</div><p class="c-sub">يُسجَّل سند قبض بهذا المبلغ ويدخل في الرصيد، وينقص من المستحق. تقدر تستلم على دفعات.</p><p class="err" id="rpErr" hidden></p></div>
<footer><button class="btn inc" type="submit">حفظ سند القبض</button><button class="btn" type="button" data-close>إلغاء</button></footer></form>`, sheet => {
      $("#rpForm", sheet).onsubmit = async e => {
        e.preventDefault(); const er = $("#rpErr", sheet);
        const amount = Math.round(parseFloat($("#rpAmount", sheet).value) * 100) / 100, date = $("#rpDate", sheet).value;
        if (!(amount > 0)) { er.textContent = "اكتب مبلغًا أكبر من صفر."; er.hidden = false; return; }
        if (amount > rest + 0.001) { er.textContent = `المبلغ أكبر من المتبقي (${money(rest)}).`; er.hidden = false; return; }
        if (!date) { er.textContent = "اختر التاريخ."; er.hidden = false; return; }
        const btn = e.submitter; if (btn) btn.disabled = true;
        const tx = { type: "income", no: nextNo, amount, date, category: r.category || "تبرعات", method: $("#rpMethod", sheet).value, halaqaId: "", studentId: "", teacherId: "", rewardMonth: "", feeMonth: "",
          party: r.name, note: `سداد مستحق${r.reason ? ": " + r.reason : ""}`, receivableId: r.id, void: false, createdAt: new Date().toISOString(), createdBy: S.uid || "" };
        const ok = await write(() => S.db.collection("transactions").add(tx), `سُجّل سند القبض ${vno(tx)} بمبلغ ${money(amount)}${amount < rest ? `، وباقي ${money(rest - amount)}` : "، وسُدّد المستحق كاملًا"}`);
        if (ok) closeModal(); else if (btn) btn.disabled = false;
      };
    });
  }
})();
