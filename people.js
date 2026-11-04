// الأشخاص: دليل واحد لكل من له اسم في النظام، وتعديل الاسم والجوال مرة واحدة في كل السجلات المرتبطة.
(function(){
  const css = document.createElement("style");
  css.textContent = `
.pp-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
.pp-tools input{flex:1;min-width:180px}
.pp-seg{display:flex;gap:6px;flex-wrap:wrap}
.pp-seg button{border:1px solid var(--line);background:var(--surface-2);color:inherit;border-radius:999px;padding:5px 12px;font:inherit;font-size:12.5px;cursor:pointer}
.pp-seg button.on{background:var(--brand,#2f6f5e);border-color:transparent;color:#fff}
.pp-list{display:grid;gap:6px}
.pp-row{display:flex;align-items:center;gap:10px;padding:9px 11px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2)}
.pp-row .grow{flex:1;min-width:0}
.pp-row .nm{font-weight:600;font-size:14.5px}
.pp-row .ch{display:flex;gap:5px;flex-wrap:wrap;margin-top:4px}
.pp-row .ch span{font-size:12px;padding:1px 8px;border-radius:999px;background:var(--surface,#fff);border:1px solid var(--line);color:var(--muted)}
.pp-row .ph{font-size:13px;direction:ltr;text-align:right;white-space:nowrap}
.pp-row .ph.bad{color:var(--bad,#b42318)}
.pp-row .ph.none{color:var(--muted);direction:rtl}
.pp-warn{font-size:12.5px;color:var(--bad,#b42318);line-height:1.7;margin:6px 0 0}
.pp-sum{font-size:13px;line-height:1.9;margin:10px 0 0;padding:10px 12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line)}
.pp-more{text-align:center;font-size:12.5px;color:var(--muted);padding:8px}`;
  document.head.appendChild(css);

  const canEdit = () => S.isAdmin || S.role === "accountant" || S.role === "staff";
  const key = n => String(n || "").trim().replace(/\s+/g, " ").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[\u064B-\u0652\u0640]/g, "");
  const recvList = () => window.__recv?.list || [];

  function gather(){
    const m = new Map();
    const get = raw => { const n = key(raw); if (!n) return null; if (!m.has(n)) m.set(n, { k: n, name: String(raw).trim(), names: new Set(), teachers: [], guard: [], recv: [], members: [], tx: 0, phones: new Map() }); const p = m.get(n); p.names.add(String(raw).trim().replace(/\s+/g, " ")); return p; };
    const ph = (p, raw, where) => { const v = normPhone(raw || ""); if (!v) return; if (!p.phones.has(v)) p.phones.set(v, new Set()); p.phones.get(v).add(where); };
    (S.teachers || []).forEach(t => { const p = get(t.name); if (p) { p.teachers.push(t); ph(p, t.phone, "المعلمين"); } });
    (S.students || []).forEach(s => { const p = get(s.guardian); if (p) { p.guard.push(s); ph(p, s.phone, "الطلاب"); } });
    recvList().forEach(r => { const p = get(r.name); if (p) { p.recv.push(r); ph(p, r.phone, "المستحقات"); } });
    (S.members || []).forEach(u => { const p = get(u.name); if (p) { p.members.push(u); ph(p, u.phone, "حساب الدخول"); } });
    (S.tx || []).forEach(t => { if (t.void) return; const p = get(t.party); if (p) p.tx++; });
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }
  const chips = p => [
    p.members.length ? (p.members.map(u => roleName(u.role)).join("، ")) : "",
    p.teachers.length ? "معلم" : "",
    p.guard.length ? `ولي أمر ${p.guard.length > 1 ? p.guard.length + " طلاب" : esc(p.guard[0].name)}` : "",
    p.recv.length ? `${p.recv.length} مستحق` : "",
    p.tx ? `${p.tx} سند` : ""
  ].filter(Boolean);

  let q = "", flt = "all";
  window.paintPeople = function(body){
    const all = gather();
    const nConf = all.filter(p => p.phones.size > 1).length;
    const nNone = all.filter(p => !p.phones.size && (p.teachers.length || p.guard.length || p.recv.length)).length;
    const ed = canEdit();
    body.innerHTML = `<section class="panel sys-panel"><header><h3>الأشخاص</h3></header><div class="ss-body">
<p class="hint">كل من له اسم في النظام: المعلمون وأولياء الأمور وأصحاب المستحقات والمستخدمون وأطراف السندات. ${ed ? "عدّل الاسم أو الجوال هنا مرة واحدة، ويتغيّر في كل مكان مرتبط به." : "التعديل لمدير النظام والمحاسب."}</p>
<div class="pp-tools"><input type="search" id="ppQ" placeholder="ابحث بالاسم أو الجوال" value="${esc(q)}">
<div class="pp-seg">${[["all", `الكل (${all.length})`], ["conf", `أرقام مختلفة (${nConf})`], ["none", `بدون جوال (${nNone})`]].map(([k, l]) => `<button type="button" data-pp-f="${k}" class="${flt === k ? "on" : ""}">${l}</button>`).join("")}</div></div>
<div class="pp-list" id="ppList"></div></div></section>`;
    const list = body.querySelector("#ppList");
    const draw = () => {
      const s = q.trim(), sd = normPhone(s) || s.replace(/\D/g, "");
      let rows = all.filter(p => flt === "all" || (flt === "conf" ? p.phones.size > 1 : !p.phones.size && (p.teachers.length || p.guard.length || p.recv.length)));
      if (s) rows = rows.filter(p => [...p.names].some(x => x.includes(s)) || p.k.includes(key(s)) || (sd.length >= 3 && [...p.phones.keys()].some(x => x.includes(sd))));
      const shown = rows.slice(0, 200);
      list.innerHTML = shown.length ? shown.map(p => {
        const phs = [...p.phones.keys()];
        const phHtml = !phs.length ? `<span class="ph none">بدون جوال</span>` : `<span class="ph${phs.length > 1 ? " bad" : ""}">${phs.map(showPhone).join("<br>")}</span>`;
        return `<div class="pp-row"><div class="grow"><div class="nm">${esc(p.name)}${p.names.size > 1 ? ` <span class="sub" style="font-weight:400;font-size:12.5px;color:var(--muted)">يُكتب أيضًا: ${esc([...p.names].filter(x => x !== p.name).join("، "))}</span>` : ""}</div><div class="ch">${chips(p).map(c => `<span>${c}</span>`).join("")}</div></div>${phHtml}${ed && (p.teachers.length || p.guard.length || p.recv.length) ? `<button class="btn sm" type="button" data-pp-edit="${esc(p.k)}">تعديل</button>` : ""}</div>`;
      }).join("") + (rows.length > shown.length ? `<div class="pp-more">يظهر أول ${shown.length} من ${rows.length}. استخدم البحث للوصول للباقي.</div>` : "") : `<p class="hint">لا يوجد أشخاص مطابقون.</p>`;
      list.querySelectorAll("[data-pp-edit]").forEach(b => b.onclick = () => openPerson(b.dataset.ppEdit, () => paintPeople(body)));
    };
    body.querySelector("#ppQ").oninput = e => { q = e.target.value; draw(); };
    body.querySelectorAll("[data-pp-f]").forEach(b => b.onclick = () => { flt = b.dataset.ppF; paintPeople(body); });
    draw();
  };

  function openPerson(k, done){
    const p = gather().find(x => x.k === k); if (!p) return;
    const phs = [...p.phones.entries()];
    const best = (phs.find(([, w]) => !w.has("حساب الدخول")) || phs[0] || [""])[0];
    const hals = (S.halaqat || []).filter(h => key(h.teacher) === p.k);
    const parts = [
      p.teachers.length ? `بيانات المعلم` : "",
      p.guard.length ? `${p.guard.length} ${p.guard.length > 1 ? "طلاب" : "طالب"} (جوال ولي الأمر)` : "",
      p.recv.length ? `${p.recv.length} مستحق` : ""
    ].filter(Boolean);
    openModal(`<form id="ppForm" novalidate><header><span class="avatar">${esc(p.name.slice(0, 1))}</span><h3>${esc(p.name)}</h3>${closeBtn}</header>
<div class="content"><div class="form-grid">
<div class="field wide"><label for="ppName">الاسم</label><input type="text" id="ppName" value="${esc(p.name)}" required></div>
<div class="field wide"><label for="ppPhone">الجوال</label><input type="tel" id="ppPhone" dir="ltr" style="text-align:right" value="${esc(best ? showPhone(best) : "")}" placeholder="05xxxxxxxx"></div>
</div>
${p.names.size > 1 ? `<p class="pp-warn">مكتوب بأكثر من طريقة: ${esc([...p.names].join("، "))}. الحفظ يوحّد الكتابة على الاسم أعلاه.</p>` : ""}
${phs.length > 1 ? `<p class="pp-warn">هذا الشخص مسجّل بأكثر من رقم: ${phs.map(([v, w]) => `${showPhone(v)} (في ${[...w].join(" و")})`).join("، ")}. اختر الرقم الصحيح أعلاه، ويُوحَّد في كل مكان.</p>` : ""}
<div class="pp-sum">يتغيّر في: ${parts.join("، ") || "لا شيء"}${hals.length ? `، واسم المعلم في ${hals.length} حلقة` : ""}.
${p.tx ? `<br>السندات (${p.tx}) تبقى كما سُجّلت، لأنها سجل مالي لا يُغيَّر.` : ""}
${p.members.length ? `<br>حساب الدخول (${p.members.map(u => showPhone(u.phone)).join("، ")}) لا يتغيّر من هنا، لأن الرقم هو اللي يدخل به. غيّره من «المستخدمون»، أو يغيّره صاحبه من «حسابي».` : ""}</div>
<p class="err" id="ppErr" hidden></p></div>
<footer><button class="btn primary" type="submit">حفظ في كل مكان</button><button class="btn" type="button" data-close>إلغاء</button></footer></form>`, sheet => {
      const er = sheet.querySelector("#ppErr");
      sheet.querySelector("#ppForm").onsubmit = async e => {
        e.preventDefault(); er.hidden = true;
        const nm = sheet.querySelector("#ppName").value.trim(), raw = sheet.querySelector("#ppPhone").value.trim();
        if (!nm) { er.textContent = "اكتب الاسم."; er.hidden = false; return; }
        const phone = raw ? normPhone(raw) : "";
        if (raw && !phone) { er.textContent = "اكتب رقم جوال سعودي صحيح يبدأ بـ 05، أو اتركه فارغًا."; er.hidden = false; return; }
        const shown = phone ? showPhone(phone) : "";
        const jobs = [];
        p.teachers.forEach(t => { if (t.name !== nm || normPhone(t.phone || "") !== phone) jobs.push(() => S.db.doc("teachers/" + t.id).update({ name: nm, phone: shown })); });
        p.guard.forEach(s => { if (s.guardian !== nm || normPhone(s.phone || "") !== phone) jobs.push(() => S.db.doc("students/" + s.id).update({ guardian: nm, phone: shown })); });
        p.recv.forEach(r => { if (r.name !== nm || normPhone(r.phone || "") !== phone) jobs.push(() => S.db.doc("receivables/" + r.id).update({ name: nm, phone })); });
        hals.forEach(h => h.teacher !== nm && jobs.push(() => S.db.doc("halaqat/" + h.id).update({ teacher: nm })));
        if (!jobs.length) { closeModal(); return; }
        const btn = sheet.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "جارٍ الحفظ…";
        let ok = 0;
        for (const j of jobs) { if (await write(j)) ok++; else break; }
        if (ok === jobs.length) { toast(`تم التحديث في ${ok} ${ok > 2 && ok < 11 ? "سجلات" : "سجل"}`); closeModal(); setTimeout(done, 400); }
        else { btn.disabled = false; btn.textContent = "حفظ في كل مكان"; er.textContent = `حُدّث ${ok} من ${jobs.length} سجل ثم توقّف. أعد المحاولة لإكمال الباقي.`; er.hidden = false; }
      };
    });
  }
  window.openPerson = openPerson;
})();
