// واجهة الجوال: رأس أصغر، شريط سفلي بخمسة أزرار وقائمة «المزيد»، نوافذ تفتح من الأسفل، وصفحة دخول أنظف.
(function(){
  const css = document.createElement("style");
  css.textContent = `
@media (max-width:980px){
  /* منع اتساع الصفحة عن عرض الشاشة */
  .work-inner{grid-template-columns:minmax(0,1fr)!important}
  #view,.page,.page>*{min-width:0}
  .actions .btn{padding:8px 10px!important;font-size:13.5px}
  /* تبويبات الإعدادات والإيرادات: شريط أفقي بدل قائمة طويلة */
  .set-tabs{display:flex!important;overflow-x:auto;scrollbar-width:none;gap:6px!important;padding:6px!important;border-radius:14px!important}
  .set-tabs::-webkit-scrollbar{display:none}
  .set-tabs button{width:auto!important;flex:none;white-space:nowrap;padding:8px 12px!important;font-size:13.5px!important;gap:6px!important}
  .set-tabs button small{display:none!important}
  .set-tabs button svg{width:16px!important;height:16px!important}
  .set-tabs .badge{position:static!important;margin-inline-start:4px!important}
  /* التصفية تنطوي خلف زر */
  .filters.m-fold{display:none!important}
  .m-ftog{display:flex;align-items:center;justify-content:space-between;width:100%;padding:11px 14px;border:1px solid var(--line);border-radius:var(--r);background:var(--surface);color:var(--fg);font:inherit;font-size:14px;cursor:pointer}
  .m-ftog svg{width:18px;height:18px;transition:transform .15s}
  .m-ftog[aria-expanded="true"] svg{transform:rotate(180deg)}

  /* السندات: سطر مختصر، الاسم يمينًا والمبلغ يسارًا بخط أبرز، والتاريخ والبند تحت الاسم */
  .dt tr:has(td.m-hide){display:flex!important;align-items:center;gap:12px}
  .dt tr:has(td.m-hide) td.main{flex:1;min-width:0;padding:0!important}
  .dt tr:has(td.m-hide) td.m-hide,.dt tr:has(td.m-hide) td.hide-m{display:none!important}
  .dt tr:has(td.m-hide) td.n{width:auto!important;flex:none;padding:0!important;flex-direction:column;align-items:flex-end;gap:2px}
  .dt tr:has(td.m-hide) td.n::before{display:none}
  .dt tr:has(td.m-hide) .amount{font-size:16.5px;font-weight:700}
  .dt tr:has(td.m-hide) .who .sub:not(.m-meta){display:none}
  .m-meta{display:block!important;font-size:12.5px;color:var(--muted);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dt tr:has(td.m-hide) .title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  /* الرأس */
  .side{padding:10px max(16px,env(safe-area-inset-right,0px)) 10px max(16px,env(safe-area-inset-left,0px))!important}
  .side-brand{padding:0!important;gap:10px!important;align-items:center}
  .side-brand .mark{width:30px!important}
  .side-brand h1{font-size:15px!important;line-height:1.4!important}
  .side-brand p{font-size:11.5px!important;line-height:1.4}
  .work-inner{padding-top:14px!important;gap:18px!important}
  .topbar{gap:10px!important;padding:10px 12px!important}
  .today{flex:1 1 0!important;font-size:13px!important;line-height:1.5;white-space:nowrap;overflow:hidden}
  .today #today{overflow:hidden;text-overflow:ellipsis}
  .today .greg{display:none}
  .today .cal{width:32px!important;height:32px!important;border-radius:9px}
  .topbar .icon-only{padding:7px!important}
  /* أزرار العهد موجودة داخل صفحة العهد، فلا داعي لتكرارها أعلى كل صفحة على الجوال */
  #topActions{display:none!important}
  .actions{flex-basis:100%}
  .actions .btn{flex:1;justify-content:center;padding:10px 12px}
  .page-head h2{font-size:20px!important}
  .page-head p{font-size:13px!important}

  /* الشريط السفلي */
  .nav button.m-over{display:none!important}
  .nav{overflow:visible!important}
  .nav button{min-width:0!important;font-size:11px!important}
  #navMore{display:flex}
  .m-more{position:fixed;inset:0;z-index:58;background:rgba(19,16,12,.35);display:flex;align-items:flex-end;direction:rtl}
  .m-more .m-grid{width:100%;background:var(--surface);border-radius:20px 20px 0 0;padding:14px 14px calc(84px + env(safe-area-inset-bottom,0px));display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;box-shadow:0 -12px 40px -12px rgba(0,0,0,.3)}
  .m-more .m-grid h4{grid-column:1/-1;margin:2px 4px 6px;font-size:13px;color:var(--muted);font-weight:600}
  .m-more button{position:relative;appearance:none;border:1px solid var(--line);background:var(--surface-2);border-radius:14px;padding:14px 6px;display:grid;justify-items:center;gap:6px;font:inherit;font-size:13px;color:var(--fg);cursor:pointer}
  .m-more button svg.i{width:22px;height:22px;color:var(--brand)}
  .m-more button.on{border-color:var(--brand);background:var(--brand-soft)}
  .m-more button .badge{position:absolute;top:6px;inset-inline-end:8px;margin:0}
  #navMore .mdot{position:absolute;top:6px;inset-inline-start:calc(50% + 6px);width:8px;height:8px;border-radius:50%;background:#efe3cf}

  /* النوافذ: تفتح من أسفل الشاشة وفوق الشريط، وزر الحفظ ظاهر دائمًا */
  .scrim{z-index:70!important;align-items:end!important;place-items:end center!important;padding:0!important;padding-top:max(24px,env(safe-area-inset-top,0px))!important}
  .sheet{width:100%!important;max-height:calc(100dvh - max(24px,env(safe-area-inset-top,0px)))!important;border-radius:20px 20px 0 0!important;border-bottom:0!important;display:flex;flex-direction:column}
  .sheet>form{display:flex;flex-direction:column;min-height:0}
  .sheet>header,.sheet form>header{padding:14px 16px!important}
  .sheet .content{padding:16px!important}
  .sheet footer{position:sticky;bottom:0;z-index:1;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px))!important}
  .sheet footer .btn.primary{flex:1;justify-content:center;padding:11px 16px}
  .toast{bottom:calc(86px + env(safe-area-inset-bottom,0px))!important;max-width:calc(100vw - 32px);text-align:center}

  /* منع تكبير iOS عند الكتابة */
  input,select,textarea{font-size:16px!important}
}
@media (max-width:860px){
  .auth-wrap{grid-template-rows:max-content 1fr!important}
  .auth-art{flex-direction:column!important;gap:10px!important;padding:calc(28px + env(safe-area-inset-top,0px)) 20px 26px!important;text-align:center!important;overflow:visible!important}
  .auth-art .mark{width:46px!important}
  .auth-art h1{font-size:19px!important;margin:0!important}
  .auth-main{padding:18px 16px 28px!important}
  .auth-box{padding:22px 18px!important;gap:18px!important;border-radius:18px!important}
  .auth-box h2{font-size:21px!important}
  .pw-wrap{position:relative}
  .pw-wrap #pwIn{width:100%;padding-inline-end:76px}
  .pw-wrap #pwEye{position:absolute;inset-inline-end:6px;top:50%;transform:translateY(-50%);background:var(--surface-2);border-radius:8px}
}`;
  document.head.appendChild(css);

  const mq = matchMedia("(max-width:980px)");
  const nav = document.querySelector(".nav");
  if (!nav) return;
  const more = document.createElement("button");
  more.type = "button"; more.id = "navMore"; more.hidden = true;
  more.innerHTML = `<svg class="i" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>المزيد<span class="mdot" hidden></span>`;
  nav.appendChild(more);
  const MAX = 5;
  const items = () => [...nav.querySelectorAll("button[data-view]")].filter(b => !b.hidden);
  let busy = false;
  function lay(){
    if (busy) return; busy = true;
    const all = items();
    const over = mq.matches && all.length > MAX ? all.slice(MAX - 1) : [];
    all.forEach(b => b.classList.toggle("m-over", over.includes(b)));
    if (more.hidden !== !over.length) more.hidden = !over.length;
    const sel = over.some(b => b.getAttribute("aria-selected") === "true") ? "true" : "false";
    if (more.getAttribute("aria-selected") !== sel) more.setAttribute("aria-selected", sel);
    const dot = more.querySelector(".mdot"), dh = !over.some(b => { const x = b.querySelector(".badge"); return x && !x.hidden && x.textContent.trim() && x.textContent.trim() !== "0"; });
    if (dot.hidden !== dh) dot.hidden = dh;
    busy = false;
  }
  function close(){ document.querySelector(".m-more")?.remove(); }
  more.onclick = () => {
    if (document.querySelector(".m-more")) return close();
    const over = items().filter(b => b.classList.contains("m-over"));
    const box = document.createElement("div"); box.className = "m-more";
    box.innerHTML = `<div class="m-grid"><h4>باقي الأقسام</h4>${over.map((b, i) => {
      const c = b.cloneNode(true); c.removeAttribute("id"); c.removeAttribute("role"); c.classList.remove("m-over");
      c.className = b.getAttribute("aria-selected") === "true" ? "on" : ""; c.dataset.i = i; c.removeAttribute("data-view");
      return c.outerHTML; }).join("")}</div>`;
    box.onclick = e => { const t = e.target.closest("button[data-i]"); if (t) { close(); over[+t.dataset.i].click(); } else if (e.target === box) close(); };
    document.body.appendChild(box);
  };
  nav.addEventListener("click", e => { if (e.target.closest("button[data-view]")) close(); });
  new MutationObserver(recs => { if (recs.some(r => !more.contains(r.target))) lay(); }).observe(nav, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden", "aria-selected"], characterData: true });
  mq.addEventListener ? mq.addEventListener("change", lay) : mq.addListener(lay);
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  lay();

  /* أدوات الصفحات على الجوال */
  const fOpen = {};
  function tidy(){
    const view = document.getElementById("view"); if (!view) return;
    const key = document.querySelector(".nav button[aria-selected=true]")?.dataset.view || "";
    view.querySelectorAll(".filters").forEach((f, i) => {
      const k = key + i;
      let t = f.previousElementSibling;
      if (!t || !t.classList.contains("m-ftog")) {
        t = document.createElement("button"); t.type = "button"; t.className = "m-ftog";
        t.innerHTML = `<span>التصفية والبحث</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>`;
        t.onclick = () => { fOpen[k] = !fOpen[k]; t.setAttribute("aria-expanded", fOpen[k]); f.classList.toggle("m-fold", !fOpen[k]); };
        f.before(t);
      }
      t.hidden = !mq.matches;
      t.setAttribute("aria-expanded", !!fOpen[k]);
      f.classList.toggle("m-fold", mq.matches && !fOpen[k]);
    });
    if (mq.matches) view.querySelectorAll('.set-tabs button[aria-pressed="true"]').forEach(b => { const n = b.parentElement, id = b.dataset.setTab || b.dataset.revTab || ""; if (n.dataset.mScrolled === id) return; n.dataset.mScrolled = id; n.scrollLeft = 0; const d = b.getBoundingClientRect().left - n.getBoundingClientRect().left; if (d < 0) n.scrollLeft += d - 8; });
  }
  let tq = 0;
  const v = document.getElementById("view");
  if (v) new MutationObserver(() => { if (!tq) tq = requestAnimationFrame(() => { tq = 0; tidy(); }); }).observe(v, { childList: true, subtree: true });
  mq.addEventListener ? mq.addEventListener("change", tidy) : mq.addListener(tidy);
})();
