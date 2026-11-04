// المستحقات: مبالغ للمجمع عند أشخاص أو جهات ولم تُستلم بعد (متبرع وعد، جهة متأخرة، سلفة...).
// لا تدخل في رصيد الصندوق. عند الاستلام يُسجَّل سند قبض مربوط بالمستحق، وإلغاء السند يعيد المبلغ مستحقًا.
// وصفحة «الإيرادات» تجمع رسوم الطلاب والمستحقات بتبويبات جانبية مثل الإعدادات.
(function(){
  const css = document.createElement("style");
  css.textContent = `
.rev-wrap .set-tabs .badge{position:static;margin-inline-start:auto}
.rev-wrap #revBody>.page{padding:0;margin:0;max-width:none}
.rv-list{display:grid}
.rv{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 14px;align-items:center;padding:14px 16px;border-top:1px solid var(--line)}
.rv:first-child{border-top:0}
.rv.click{cursor:pointer}.rv.click:hover{background:var(--surface-2)}
.rv h4{margin:0;font-size:15px;font-weight:700;line-height:1.5}
.rv .meta{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12.5px;color:var(--muted)}
.rv .amt{text-align:end;font-weight:700;font-size:15px;white-space:nowrap}
.rv .amt span{display:block;font-size:12.5px;font-weight:500;color:var(--muted)}
.rv .acts{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
.rv .acts a.btn{text-decoration:none}
.rv .bar{grid-column:1/-1;height:5px;border-radius:5px;background:var(--surface-2);overflow:hidden}
.rv .bar i{display:block;height:100%;background:var(--good)}
.rv-pays{display:grid;gap:6px;margin-top:4px}
.rv-pays button{display:flex;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);font:inherit;font-size:13px;color:inherit;cursor:pointer;text-align:start}`;
  document.head.appendChild(css);

  const COL = "receivables";
  const R = { list: [], sub: false, tab: "open", q: "" };
  const KINDS = window.RECV_KINDS = ["وعد بتبرع", "دعم جهة أو مؤسسة", "كفالة متأخرة", "سلفة أو قرض", "أخرى"];
  window.__recv = R;
  const ICO = svg("M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 1.6 2.6 4.5 3.2 4.5 1.6 4.5 3.3-2 3-4.5 3-4.5-1.3-4.5-3");
  const paidOf = r => sum(live().filter(t => t.type === "income" && t.receivableId === r.id));
  const restOf = r => r.status === "waived" ? 0 : Math.max(0, (+r.amount || 0) - paidOf(r));
  const isOpen = r => r.status !== "waived" && restOf(r) > 0;
  const isLate = r => isOpen(r) && r.due && r.due < todayISO();
  const mgr = () => canW() && !isCustRole(S.role);

  /* زر «رسوم الطلاب» في القائمة يصير «الإيرادات» */
  const navBtn = document.querySelector('.nav [data-view="fees"]');
  if (navBtn) {
    navBtn.dataset.view = "revenue";
    const t = [...navBtn.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (t) t.textContent = "الإيرادات";
  }
  let sub = "fees";
  try { sub = localStorage.getItem("halaqat.revTab") === "receivables" ? "receivables" : "fees"; } catch (e) {}
  const TAB_ICO = { fees: svg("M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18M7 15h4"), receivables: ICO };
  const TABS = [["fees", "رسوم الطلاب", "من سدّد ومن لم يسدّد"], ["receivables", "المستحقات", "مبالغ لك عند الآخرين"]];
  views.revenue = {
    shell(){
      return `<div class="page"><div class="set-wrap rev-wrap"><nav class="set-tabs" role="tablist" aria-label="أقسام الإيرادات">${TABS.map(([k, t, d]) => `<button type="button" role="tab" data-rev-tab="${k}" aria-pressed="${k === sub}">${TAB_ICO[k]}<span>${t}<small>${d}</small></span><span class="badge" data-rev-badge="${k}" hidden></span></button>`).join("")}</nav>
<div id="revBody">${views[sub].shell()}</div></div></div>`;
    },
    bind(){
      document.querySelector(".rev-wrap .set-tabs").onclick = e => {
        const b = e.target.closest("[data-rev-tab]"); if (!b || b.dataset.revTab === sub) return;
        sub = b.dataset.revTab; try { localStorage.setItem("halaqat.revTab", sub); } catch (x) {}
        document.querySelectorAll("[data-rev-tab]").forEach(x => x.setAttribute("aria-pressed", x === b));
        $("#revBody").innerHTML = views[sub].shell(); views[sub].bind?.(); views[sub].fill(); paintBadge();
        if (innerWidth <= 860) $("#revBody").scrollIntoView({ behavior: "smooth", block: "start" });
      };
      views[sub].bind?.();
    },
    fill(){ views[sub].fill(); }
  };
  const prevShow = window.show;
  window.show = function(v){
    if (v === "fees" || v === "receivables") { sub = v; try { localStorage.setItem("halaqat.revTab", sub); } catch (e) {} v = "revenue"; }
    return prevShow(v);
  };

  const prevPaint = window.paintHeader;
  window.paintHeader = function(){
    prevPaint.apply(this, arguments);
    if (S.db && !R.sub) { R.sub = true; S.db.collection(COL).onSnapshot(s => { R.list = s.docs.map(d => ({ id: d.id, ...d.data() })); paintBadge(); if ($("#rvBody")) views.receivables.fill(); if (S.view === "summary") paintAttn(); }); }
    paintBadge();
  };
  function paintBadge(){
    const late = R.list.filter(isLate).length, bf = $("#bFees"), nf = bf && !bf.hidden ? +bf.textContent || 0 : 0;
    const set = (el, n) => { if (el) { el.textContent = n; el.hidden = !n; } };
    set(document.querySelector('[data-rev-badge="fees"]'), nf); set(document.querySelector('[data-rev-badge="receivables"]'), late);
    if (bf && late) { bf.textContent = nf + late; bf.hidden = false; bf.title = `${nf} طالب لم يكمل رسومه، و${late} مستحق متأخر`; }
  }

  /* الرئيسية: المستحقات ضمن «يحتاج انتباهك» */
  ATTN.push(() => {
    const open = R.list.filter(isOpen); if (!open.length) return [];
    const late = open.filter(isLate);
    return [late.length
      ? { key: "rv-late-" + thisMonth(), tone: "bad", text: `${late.length} ${late.length > 2 && late.length < 11 ? "مستحقات متأخرة" : "مستحق متأخر"} بقيمة <b>${money(sum(late, restOf))}</b>، من أصل ${money(sum(open, restOf))} لك عند الآخرين.`, go: () => show("receivables") }
      : { key: "rv-" + thisMonth(), tone: "info", text: `لك مستحقات بقيمة <b>${money(sum(open, restOf))}</b> عند ${open.length} ${open.length === 1 ? "جهة" : "جهات"}، ولا تدخل في الرصيد حتى تُستلم.`, go: () => show("receivables") }];
  });

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
        return `<div class="rv click" data-rv="${esc(r.id)}"><div><h4>${esc(r.name || "بدون اسم")} ${st}</h4><div class="meta"><span>${esc(r.kind === "أخرى" && r.kindOther ? r.kindOther : r.kind || "")}${r.reason ? " · " + esc(r.reason) : ""}</span>${r.due ? `<span>الموعد ${esc(gDate(r.due))}</span>` : ""}${ph ? `<span dir="ltr">${esc(showPhone(ph))}</span>` : ""}</div></div>
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
<div class="field"><label for="rvKind">النوع</label><select id="rvKind"${ro ? " disabled" : ""}>${[...new Set([...KINDS, ...(r?.kind ? [r.kind] : [])])].map(k => `<option${k === (r?.kind || KINDS[0]) ? " selected" : ""}>${esc(k)}</option>`).join("")}</select></div>
<div class="field" id="rvKindOW"><label for="rvKindO">حدّد النوع</label><input type="text" id="rvKindO" value="${esc(r?.kindOther || "")}" placeholder="مثال: إيجار قاعة"${ro ? " disabled" : ""}></div>
<div class="field"><label for="rvCat">يُسجَّل عند الاستلام تحت بند</label><select id="rvCat"${ro ? " disabled" : ""}>${[...new Set([...INCOME_CATS.filter(c => c !== FEE_CAT), ...(r?.category ? [r.category] : [])])].map(c => `<option${c === (r?.category || "تبرعات") ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
<div class="field" id="rvCatOW"><label for="rvCatO">حدّد البند</label><input type="text" id="rvCatO" value="${esc(r?.catOther || "")}" placeholder="مثال: تبرع عيني"${ro ? " disabled" : ""}></div>
<div class="field wide"><label for="rvReason">السبب أو البيان</label><textarea id="rvReason" rows="2" placeholder="مثال: تبرع لمسابقة رمضان"${ro ? " disabled" : ""}>${esc(r?.reason || "")}</textarea></div>
</div>
${r ? `<p class="c-sub">استُلم ${money(paidOf(r))} من ${money(+r.amount || 0)}${r.status === "waived" ? "، وأُسقط الباقي" : ""}.</p>${pays.length ? `<div class="rv-pays">${pays.map(t => `<button type="button" data-open-tx="${esc(t.id)}"><span>سند قبض ${esc(vno(t))} · ${esc(gDate(t.date))}</span><b>${money(t.amount)}</b></button>`).join("")}</div>` : ""}` : ""}
<p class="err" id="rvErr" hidden></p></div>
<footer>${ro ? `<button class="btn" type="button" data-close>إغلاق</button>` : `<button class="btn primary" type="submit">${r ? "حفظ" : "إضافة"}</button>${r && isOpen(r) ? `<button class="btn inc" type="button" id="rvPayBtn">استلام مبلغ</button>` : ""}<span class="spacer"></span>${r ? (pays.length ? (isOpen(r) ? `<button class="btn danger" type="button" id="rvWaive">إسقاط الباقي</button>` : r.status === "waived" ? `<button class="btn" type="button" id="rvUnwaive">إعادة الباقي مستحقًا</button>` : "") : `<button class="btn danger" type="button" id="rvDel">حذف</button>`) : ""}`}</footer></form>`, sheet => {
      sheet.querySelectorAll("[data-open-tx]").forEach(b => b.onclick = () => openVoucher(b.dataset.openTx));
      const syncO = () => { $("#rvKindOW", sheet).hidden = $("#rvKind", sheet).value !== "أخرى"; $("#rvCatOW", sheet).hidden = $("#rvCat", sheet).value !== "أخرى"; };
      $("#rvKind", sheet).onchange = $("#rvCat", sheet).onchange = syncO; syncO();
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
        const kind = $("#rvKind", sheet).value, category = $("#rvCat", sheet).value;
        const kindOther = kind === "أخرى" ? $("#rvKindO", sheet).value.trim() : "", catOther = category === "أخرى" ? $("#rvCatO", sheet).value.trim() : "";
        if (kind === "أخرى" && !kindOther) return bad("النوع «أخرى»: اكتب نوعه في خانة «حدّد النوع».");
        if (category === "أخرى" && !catOther) return bad("البند «أخرى»: اكتب نوعه في خانة «حدّد البند».");
        const body = { name, phone, amount, due: $("#rvDue", sheet).value || "", kind, kindOther, category, catOther, reason: $("#rvReason", sheet).value.trim() };
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
<div class="field"><label>البند</label><input type="text" value="${esc((r.category || "تبرعات") + (r.catOther ? ": " + r.catOther : ""))}" disabled></div>
</div><p class="c-sub">يُسجَّل سند قبض بهذا المبلغ ويدخل في الرصيد، وينقص من المستحق. تقدر تستلم على دفعات.</p><p class="err" id="rpErr" hidden></p></div>
<footer><button class="btn inc" type="submit">حفظ سند القبض</button><button class="btn" type="button" data-close>إلغاء</button></footer></form>`, sheet => {
      $("#rpForm", sheet).onsubmit = async e => {
        e.preventDefault(); const er = $("#rpErr", sheet);
        const amount = Math.round(parseFloat($("#rpAmount", sheet).value) * 100) / 100, date = $("#rpDate", sheet).value;
        if (!(amount > 0)) { er.textContent = "اكتب مبلغًا أكبر من صفر."; er.hidden = false; return; }
        if (amount > rest + 0.001) { er.textContent = `المبلغ أكبر من المتبقي (${money(rest)}).`; er.hidden = false; return; }
        if (!date) { er.textContent = "اختر التاريخ."; er.hidden = false; return; }
        const btn = e.submitter; if (btn) btn.disabled = true;
        const tx = { type: "income", no: nextNo, amount, date, category: r.category || "تبرعات", catOther: r.catOther || "", method: $("#rpMethod", sheet).value, halaqaId: "", studentId: "", teacherId: "", rewardMonth: "", feeMonth: "",
          party: r.name, note: `سداد مستحق${r.reason ? ": " + r.reason : ""}`, receivableId: r.id, void: false, createdAt: new Date().toISOString(), createdBy: S.uid || "" };
        const ok = await write(() => S.db.collection("transactions").add(tx), `سُجّل سند القبض ${vno(tx)} بمبلغ ${money(amount)}${amount < rest ? `، وباقي ${money(rest - amount)}` : "، وسُدّد المستحق كاملًا"}`);
        if (ok) closeModal(); else if (btn) btn.disabled = false;
      };
    });
  }
})();
