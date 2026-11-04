// البنود والأنواع (من الإعدادات)، والتعبئة التلقائية لبيانات الأشخاص المسجّلين في النظام.
(function(){
  const css = document.createElement("style");
  css.textContent = `
.ct-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
.ct-list{display:grid;gap:6px}
.ct-list>div{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);font-size:14px}
.ct-list .grow{flex:1;min-width:0}.ct-list .grow span{display:block;font-size:12px;color:var(--muted)}
.ct-list .lock{font-size:12px;color:var(--muted)}
.ct-add{display:flex;gap:8px;margin-top:10px}.ct-add input{flex:1;min-width:0}
.pp-hint{font-size:12.5px;color:var(--good);margin-top:4px;line-height:1.6}`;
  document.head.appendChild(css);

  /* ---------- البنود ---------- */
  const OTHER = "أخرى";
  const LISTS = [
    ["incomeCats", "بنود الإيرادات", () => INCOME_CATS, [FEE_CAT], "مثال: كفالات مكنون", t => t.type === "income"],
    ["expenseCats", "بنود المصروفات", () => EXPENSE_CATS, [REWARD_CAT], "مثال: صيانة", t => t.type === "expense"],
    ["recvKinds", "أنواع المستحقات", () => window.RECV_KINDS || [], [], "مثال: إيجار قاعة", null]
  ];
  const DEFAULTS = Object.fromEntries(LISTS.map(([k, , get]) => [k, [...get()]]));
  const clean = (arr, locked) => { const out = [...new Set([...locked, ...arr.map(x => String(x).trim()).filter(Boolean)])].filter(x => x !== OTHER); return out.concat(OTHER); };
  function apply(){
    const st = S.settings || {};
    LISTS.forEach(([k, , get, locked]) => { const a = get(), want = clean(Array.isArray(st[k]) ? st[k] : DEFAULTS[k], locked); if (JSON.stringify(a) !== JSON.stringify(want)) a.splice(0, a.length, ...want); });
  }
  const prevPaint = window.paintHeader;
  window.paintHeader = function(){ apply(); prevPaint.apply(this, arguments); };

  const canEdit = () => S.isAdmin || S.role === "accountant" || S.role === "staff";
  const used = (k, name) => {
    const L = LISTS.find(x => x[0] === k);
    if (L[5]) return S.tx.filter(t => L[5](t) && t.category === name).length;
    return (window.__recv?.list || []).filter(r => r.kind === name).length;
  };
  window.paintCats = function(body){
    apply();
    const ed = canEdit();
    body.innerHTML = `<section class="panel sys-panel"><header><h3>البنود والأنواع</h3></header><div class="ss-body">
<p class="hint">البنود اللي تظهر لك عند تسجيل السندات والمستحقات. ${ed ? "أضف ما تحتاجه واحذف ما لا تستخدمه. حذف البند ما يغيّر السندات القديمة، تبقى كما هي وتظهر في التقارير." : "تعديلها لمدير النظام والمحاسب."} البند «أخرى» ثابت، وعند اختياره يُطلب كتابة نوعه.</p>
<div class="ct-grid">${LISTS.map(([k, title, get, locked, ph]) => `<div><h4 style="margin:0 0 8px;font-size:14.5px">${title}</h4><div class="ct-list">${get().map(c => {
      const fixed = locked.includes(c) || c === OTHER, n = used(k, c);
      return `<div><div class="grow">${esc(c)}${n ? `<span>مستخدم في ${n} ${k === "recvKinds" ? "مستحق" : "سند"}</span>` : ""}</div>${fixed ? `<span class="lock">${c === OTHER ? "ثابت" : "أساسي"}</span>` : ed ? `<button class="btn sm danger" type="button" data-ct-del="${k}" data-name="${esc(c)}">حذف</button>` : ""}</div>`; }).join("")}</div>
${ed ? `<form class="ct-add" data-ct-add="${k}"><input type="text" maxlength="40" placeholder="${ph}"><button class="btn sm primary" type="submit">إضافة</button></form>` : ""}</div>`).join("")}</div>
</div></section>`;
    if (!ed) return;
    const save = async (k, list, msg) => { const ok = await write(() => S.db.doc("settings/main").update({ [k]: list }), msg); if (ok) { S.settings = { ...(S.settings || {}), [k]: list }; apply(); paintCats(body); } };
    body.querySelectorAll("[data-ct-add]").forEach(f => f.onsubmit = e => {
      e.preventDefault(); const k = f.dataset.ctAdd, v = f.querySelector("input").value.trim(), L = LISTS.find(x => x[0] === k);
      if (!v) return;
      if (L[2]().includes(v)) return notify(`رُفض: «${v}» موجود من قبل.`, "bad");
      save(k, L[2]().filter(x => x !== OTHER).concat(v), `أُضيف «${v}»`);
    });
    body.querySelectorAll("[data-ct-del]").forEach(b => b.onclick = () => {
      const k = b.dataset.ctDel, v = b.dataset.name, L = LISTS.find(x => x[0] === k);
      if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "تأكيد الحذف"; return; }
      save(k, L[2]().filter(x => x !== v && x !== OTHER), `حُذف «${v}»${used(k, v) ? "، وبقيت السندات القديمة عليه" : ""}`);
    });
  };

  /* ---------- التعبئة التلقائية ---------- */
  function people(){
    const m = new Map();
    const add = (name, src, phone, email) => {
      name = String(name || "").trim(); if (!name) return;
      const p = m.get(name) || { name, src: [], phone: "", email: "" };
      if (src && !p.src.includes(src)) p.src.push(src);
      const ph = normPhone(phone || ""); if (ph && !p.phone) p.phone = ph;
      if (email && !p.email) p.email = email;
      m.set(name, p);
    };
    (S.members || []).forEach(x => add(x.name, roleName(x.role), x.phone, x.email));
    (S.teachers || []).forEach(x => add(x.name, "معلم", x.phone));
    (S.students || []).forEach(x => add(x.guardian, "ولي أمر", x.phone));
    (window.__recv?.list || []).forEach(x => add(x.name, "مستحق", x.phone));
    (S.tx || []).forEach(x => add(x.party, ""));
    return m;
  }
  const dl = document.createElement("datalist"); dl.id = "peopleDL"; document.body.appendChild(dl);
  /* اسم الحقل ← الحقول اللي تتعبأ منه */
  const LINKS = [["#mName", { phone: "#mPhone", email: "#mEmail" }], ["#tName", { phone: "#tPhone" }], ["#sGuardian", { phone: "#sPhone" }], ["#rvName", { phone: "#rvPhone" }], ["#txParty", {}]];
  function attach(root){
    const P = people();
    dl.innerHTML = [...P.values()].slice(0, 400).map(p => `<option value="${esc(p.name)}">${esc([p.src.join("، "), p.phone ? showPhone(p.phone) : ""].filter(Boolean).join(" · "))}</option>`).join("");
    LINKS.forEach(([sel, to]) => {
      const inp = root.querySelector(sel); if (!inp || inp.disabled) return;
      inp.setAttribute("list", "peopleDL"); inp.setAttribute("autocomplete", "off");
      const hint = document.createElement("div"); hint.className = "pp-hint"; hint.hidden = true; inp.after(hint);
      const fill = () => {
        const p = P.get(inp.value.trim()); hint.hidden = true; if (!p) return;
        const got = inp._got && inp._got.name === p.name ? inp._got.list : [];
        Object.entries(to).forEach(([k, s]) => { const el = root.querySelector(s); if (!el || el.disabled || el.value.trim() || !p[k]) return; el.value = k === "phone" ? showPhone(p[k]) : p[k]; got.push(k === "phone" ? "الجوال" : "البريد"); });
        inp._got = { name: p.name, list: got };
        if (p.src.length || got.length) { hint.textContent = `مسجّل في النظام${p.src.length ? " (" + p.src.join("، ") + ")" : ""}${got.length ? " · عُبّئ " + got.join(" و") + " تلقائيًا" : ""}`; hint.hidden = false; }
      };
      inp.addEventListener("change", fill); inp.addEventListener("input", () => { if (P.has(inp.value.trim())) fill(); else hint.hidden = true; });
    });
  }
  const prevOpen = window.openModal;
  window.openModal = function(html, onReady){
    const r = prevOpen.call(this, html, onReady);
    try { attach(document.getElementById("modalRoot")); } catch (e) {}
    return r;
  };
})();
