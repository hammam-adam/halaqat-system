// سجل التعديلات والنسخ الاحتياطي (لمدير النظام): يظهران في الإعدادات.
(function(){
  const css = document.createElement("style");
  css.textContent = `
.au-filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.au-filters select{width:auto;min-width:150px;flex:1 1 150px}
.au-list{display:grid}
.au-row{display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px;padding:12px 14px;border-top:1px solid var(--line);text-align:start;background:transparent;border-inline:0;border-bottom:0;font:inherit;color:inherit;width:100%}
.au-row:first-child{border-top:0}
.au-row.click{cursor:pointer}.au-row.click:hover{background:var(--surface-2)}
.au-ic{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:700;color:#fff;background:var(--info)}
.au-ic.add{background:var(--good)}.au-ic.delete,.au-ic.void{background:var(--bad)}.au-ic.edit{background:var(--warnc,#b7791f)}
.au-row b{font-weight:600;font-size:14px;line-height:1.6}
.au-meta{font-size:12px;color:var(--muted);margin-top:2px}
.au-ch{display:grid;gap:2px;margin-top:6px;font-size:12.5px;line-height:1.7}
.au-ch span{color:var(--muted)}.au-ch del{color:var(--bad);text-decoration:none}.au-ch ins{color:var(--good);text-decoration:none;font-weight:600}
.au-more{display:flex;justify-content:center;padding:12px}
.bk-list{display:grid}
.bk-list>div{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line);font-size:13.5px}
.bk-list>div:first-child{border-top:0}
.bk-list .grow{flex:1;min-width:0}.bk-list .grow span{display:block;font-size:12px;color:var(--muted)}
.bk-warn{padding:10px 12px;border-radius:10px;background:var(--warn-bg);color:var(--warn);font-size:13px;line-height:1.8;margin-bottom:12px}`;
  document.head.appendChild(css);

  const ENT = { transactions: "سند", teachers: "معلم", students: "طالب", halaqat: "حلقة", settings: "الإعدادات", receivables: "مستحق", custodies: "عهدة", members: "مستخدم", tasks: "مهمة" };
  const FILTERS = [["", "كل الأنواع"], ["transactions", "السندات"], ["receivables", "المستحقات"], ["custodies", "العهد"], ["members", "المستخدمون"], ["teachers", "المعلمون"], ["students", "الطلاب"], ["halaqat", "الحلقات"], ["tasks", "المهام"]];
  const KEY = { amount: "المبلغ", party: "الجهة", category: "البند", date: "التاريخ", note: "ملاحظات", method: "طريقة الدفع", void: "ملغى", voidReason: "سبب الإلغاء",
    name: "الاسم", phone: "الجوال", role: "الصلاحية", title: "المسمى", email: "البريد", budget: "رصيد الصلاحية", status: "الحالة", purpose: "الغرض",
    requested: "المطلوب", settled_total: "المصفّى", holder_name: "صاحب العهدة", rewardMonth: "الشهر", fee: "الرسوم", halaqaId: "الحلقة", teacherId: "المعلم",
    assignee_name: "المسند إليه", due: "الموعد", done_note: "ملاحظة الإنجاز", orgName: "اسم المجمع", type: "النوع", no: "الرقم" };
  const SKIP = new Set(["updatedAt", "updatedBy", "createdAt", "createdBy", "voidedAt", "voidedBy", "sample", "id", "pw_reset"]);
  const STATUS = { requested: "طلب جديد", open: "قائمة", submitted: "بانتظار التصفية", closed: "مغلقة", rejected: "مرفوضة", done: "منجزة" };
  const val = (k, v) => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "boolean") return v ? "نعم" : "لا";
    if (k === "role") return roleName(v);
    if (k === "status") return STATUS[v] || v;
    if (k === "type") return v === "income" ? "قبض" : v === "expense" ? "صرف" : v;
    if (k === "amount" || k === "budget" || k === "requested" || k === "settled_total" || k === "fee") return money(+v || 0);
    if (k === "teacherId") return S.teachers?.find(t => t.id === v)?.name || "…";
    if (k === "halaqaId") return S.halaqat?.find(h => h.id === v)?.name || "…";
    if (typeof v === "object") return "…";
    const s = String(v); return s.length > 80 ? s.slice(0, 80) + "…" : s;
  };
  const when = iso => { try { const d = new Date(iso); return d.toLocaleDateString("ar-SA-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "long", year: "numeric" }) + " · " + d.toLocaleTimeString("ar-SA-u-nu-latn", { hour: "numeric", minute: "2-digit" }); } catch (e) { return ""; } };

  function describe(r){
    const d = r.new || r.old || {};
    let act = r.action, what = ENT[r.entity] || r.entity, label = "";
    if (r.entity === "transactions") {
      what = d.type === "income" ? "سند قبض" : "سند صرف";
      label = `${vno(d)} · ${money(+d.amount || 0)}${d.party ? " · " + d.party : ""}`;
      if (act === "edit" && !r.old?.void && r.new?.void) act = "void";
    } else if (r.entity === "custodies") label = `${d.no || ""} · ${d.holder_name || ""} · ${money(+d.amount || +d.requested || 0)}`;
    else if (r.entity === "tasks") label = d.title || "";
    else if (r.entity === "members") label = `${d.name || ""}${d.phone ? " · " + showPhone(d.phone) : ""}`;
    else if (r.entity === "settings") label = "";
    else label = d.name || "";
    const verb = { add: "أضاف", edit: "عدّل", delete: "حذف", void: "ألغى" }[act] || act;
    let changes = [];
    if (act === "edit" || act === "void") {
      const o = r.old || {}, n = r.new || {};
      changes = [...new Set([...Object.keys(o), ...Object.keys(n)])]
        .filter(k => !SKIP.has(k) && JSON.stringify(o[k] ?? null) !== JSON.stringify(n[k] ?? null) && !(act === "void" && k === "void"))
        .slice(0, 6).map(k => `<div><span>${esc(KEY[k] || k)}:</span> <del>${esc(val(k, o[k]))}</del> ← <ins>${esc(val(k, n[k]))}</ins></div>`);
      if (r.new?.pw_reset) changes.push(`<div><span>كلمة المرور:</span> <ins>أُعيد تعيينها</ins></div>`);
    }
    return { act, html: `<b>${esc(r.actor_name || (r.actor ? showPhone(r.actor) : "النظام"))} ${verb} ${esc(what)}${label ? ` <span style="font-weight:500">${esc(label)}</span>` : ""}</b>
<div class="au-meta">${esc(when(r.at))}</div>${changes.length ? `<div class="au-ch">${changes.join("")}</div>` : ""}` };
  }

  const A = { rows: [], actors: [], entity: "", actor: "", end: false };
  async function loadAudit(more){
    const before = more && A.rows.length ? A.rows[A.rows.length - 1].id : null;
    const r = await appRpc("audit_list", { p_before: before, p_entity: A.entity || null, p_actor: A.actor || null });
    if (!r?.ok) return false;
    A.rows = more ? A.rows.concat(r.rows) : r.rows; A.actors = r.actors; A.end = r.rows.length < 60;
    return true;
  }
  function paintRows(){
    const box = $("#auList"); if (!box) return;
    box.innerHTML = A.rows.length ? `<div class="au-list">${A.rows.map(r => { const x = describe(r), open = r.entity === "transactions" && S.tx?.some(t => t.id === r.entity_id) ? r.entity_id : "";
      return `<button type="button" class="au-row${open ? " click" : ""}"${open ? ` data-au-tx="${esc(open)}"` : ""}><span class="au-ic ${x.act}">${{ add: "+", edit: "✎", delete: "×", void: "⊘" }[x.act] || "•"}</span><div>${x.html}</div></button>`; }).join("")}</div>
${A.end ? "" : `<div class="au-more"><button class="btn sm" type="button" id="auMore">عرض المزيد</button></div>`}`
      : `<div class="empty"><span>لا توجد تعديلات مسجّلة بعد. من الآن يُسجَّل هنا كل إضافة وتعديل وإلغاء وحذف، ومن قام به.</span></div>`;
    box.querySelectorAll("[data-au-tx]").forEach(b => b.onclick = () => openVoucher(b.dataset.auTx));
    const m = $("#auMore"); if (m) m.onclick = async () => { m.disabled = true; await loadAudit(true); paintRows(); };
  }
  window.paintAudit = async function(body){
    body.innerHTML = `<section class="panel sys-panel"><header><h3>سجل التعديلات</h3></header><div class="ss-body">
<p class="hint">كل إضافة أو تعديل أو إلغاء أو حذف في السندات والعهد والمستخدمين والمعلمين والطلاب والمهام، مع اسم من قام بها ووقتها وما الذي تغيّر. لا يمكن لأحد حذف هذا السجل من الموقع.</p>
<div class="au-filters"><select id="auEnt" aria-label="النوع">${FILTERS.map(([k, t]) => `<option value="${k}"${A.entity === k ? " selected" : ""}>${t}</option>`).join("")}</select><select id="auWho" aria-label="المستخدم"><option value="">كل المستخدمين</option></select></div>
</div><div id="auList"><div class="empty"><span>جارٍ التحميل…</span></div></div></section>`;
    const fillWho = () => { const w = $("#auWho"); if (w) w.innerHTML = `<option value="">كل المستخدمين</option>` + A.actors.map(a => `<option value="${esc(a.phone)}"${A.actor === a.phone ? " selected" : ""}>${esc(a.name || showPhone(a.phone))}</option>`).join(""); };
    const reload = async () => { if (!(await loadAudit(false))) { $("#auList").innerHTML = `<div class="notice">تعذّر تحميل السجل. حدّث الصفحة.</div>`; return; } fillWho(); paintRows(); };
    $("#auEnt").onchange = e => { A.entity = e.target.value; reload(); };
    $("#auWho").onchange = e => { A.actor = e.target.value; reload(); };
    reload();
  };

  /* النسخ الاحتياطي */
  const size = n => n > 1048576 ? (n / 1048576).toFixed(1) + " م.ب" : Math.max(1, Math.round(n / 1024)) + " ك.ب";
  function save(json){
    const d = new Date(), name = `نسخة-احتياطية-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.json`;
    const url = URL.createObjectURL(new Blob([JSON.stringify(json, null, 1)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  window.paintBackup = async function(body){
    body.innerHTML = `<section class="panel sys-panel"><header><h3>النسخ الاحتياطي</h3></header><div class="ss-body"><p class="hint">جارٍ التحميل…</p></div></section>`;
    const r = await appRpc("backup_info");
    if (!r?.ok) { body.innerHTML = `<div class="notice">تعذّر التحميل. حدّث الصفحة.</div>`; return; }
    const weekly = r.list.filter(b => b.kind === "weekly"), dl = r.list.filter(b => b.kind === "download").slice(0, 5);
    const old = !r.last_download || Date.now() - new Date(r.last_download) > 30 * 864e5;
    body.innerHTML = `<section class="panel sys-panel"><header><h3>نسخة كاملة على جهازك</h3></header><div class="ss-body">
${old ? `<div class="bk-warn">${r.last_download ? "آخر نسخة نزّلتها كانت قبل أكثر من شهر." : "ما نزّلت أي نسخة بعد."} نزّل نسخة الآن واحفظها في مكان آمن خارج الموقع، مثل Google Drive أو بريدك.</div>` : ""}
<p class="hint">ملف واحد فيه كل السندات والطلاب والمعلمين والحلقات والعهد والمهام والمستخدمين وسجل التعديلات (بدون كلمات المرور وصور الفواتير). يفيدك لو تعطّل الموقع أو انحذف شيء بالغلط. نزّل نسخة مرة في الشهر على الأقل.</p>
<div class="ss-actions"><button class="btn primary" type="button" id="bkNow">تنزيل نسخة كاملة الآن</button><span class="ss-status" id="bkSt"></span></div>
${dl.length ? `<div class="bk-list" style="margin-top:12px">${dl.map(b => `<div><div class="grow">نزّلها ${esc(b.by || "")}<span>${esc(when(b.at))} · ${size(b.size || 0)}</span></div></div>`).join("")}</div>` : ""}
</div></section>
<section class="panel sys-panel"><header><h3>النسخ التلقائية</h3></header><div class="ss-body">
<p class="hint">يحفظ النظام نسخة تلقائية كل جمعة، ويحتفظ بآخر 8 نسخ (شهرين تقريبًا). تقدر تنزّل أي واحدة منها.</p>
<div class="bk-list">${weekly.map(b => `<div><div class="grow">نسخة تلقائية<span>${esc(when(b.at))} · ${size(b.size || 0)}</span></div><button class="btn sm" type="button" data-bk="${b.id}">تنزيل</button></div>`).join("") || `<div><div class="grow"><span>لا توجد نسخ بعد. أول نسخة تُحفظ يوم الجمعة.</span></div></div>`}</div>
</div></section>`;
    const get = async (id, btn) => {
      btn.disabled = true; const x = await appRpc("backup_get", { p_id: id }); btn.disabled = false;
      if (!x?.ok) return notify("تعذّر تنزيل النسخة. أعد المحاولة.", "bad");
      save(x.backup); notify("نُزّلت النسخة الاحتياطية. احفظها في مكان آمن.", "good");
      if (!id) paintBackup(body);
    };
    $("#bkNow").onclick = e => get(null, e.currentTarget);
    body.querySelectorAll("[data-bk]").forEach(b => b.onclick = () => get(+b.dataset.bk, b));
  };
})();
