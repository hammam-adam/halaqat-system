// الإشعارات: كل عملية تُظهر إشعارًا واضحًا أعلى الشاشة (نجاح أو رفض مع السبب)،
// وتُحفظ آخر الإشعارات في جرس أعلى الصفحة لترجع لها متى ما أردت (على هذا الجهاز).
(function(){
  const css = document.createElement("style");
  css.textContent = `
.toast{display:none!important}
.ntf-stack{position:fixed;top:calc(14px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:400;display:grid;gap:8px;width:min(440px,calc(100vw - 24px));pointer-events:none}
.ntf{pointer-events:auto;display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:14px;background:var(--surface);color:var(--fg);border:1px solid var(--line);box-shadow:var(--shadow-lg);font-size:14px;line-height:1.6;direction:rtl;animation:ntfIn .22s ease-out}
.ntf.out{opacity:0;transform:translateY(-6px);transition:opacity .2s,transform .2s}
.ntf .ni{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;flex:none;font-size:13px;font-weight:700;color:#fff;background:var(--info)}
.ntf.good .ni{background:var(--good)}.ntf.bad .ni{background:var(--bad)}
.ntf.bad{border-color:color-mix(in srgb,var(--bad) 35%,var(--line))}
.ntf .nt{flex:1;min-width:0}
.ntf .nx{border:0;background:transparent;color:var(--muted);font-size:18px;line-height:1;cursor:pointer;padding:0 2px}
@keyframes ntfIn{from{opacity:0;transform:translateY(-8px)}}
@media (prefers-reduced-motion:reduce){.ntf{animation:none}}
.bell{position:relative}
.bell .bdot{position:absolute;top:2px;inset-inline-end:2px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:var(--bad);color:#fff;font-size:10.5px;line-height:17px;text-align:center;font-weight:700}
.ntf-panel{position:fixed;z-index:390;top:70px;inset-inline-start:16px;width:min(380px,calc(100vw - 24px));max-height:min(70vh,560px);overflow:auto;background:var(--surface);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow-lg);direction:rtl}
.ntf-panel header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--surface)}
.ntf-panel header b{font-size:14.5px}
.ntf-panel .row{display:flex;gap:10px;padding:11px 14px;border-top:1px solid var(--line);font-size:13.5px;line-height:1.6}
.ntf-panel .row:first-of-type{border-top:0}
.ntf-panel .row i{width:8px;height:8px;border-radius:50%;margin-top:7px;flex:none;background:var(--info)}
.ntf-panel .row.good i{background:var(--good)}.ntf-panel .row.bad i{background:var(--bad)}
.ntf-panel .row span{display:block;font-size:11.5px;color:var(--muted)}
.ntf-panel .none{padding:22px 14px;text-align:center;color:var(--muted);font-size:13px}`;
  document.head.appendChild(css);

  const stack = document.createElement("div"); stack.className = "ntf-stack"; stack.setAttribute("aria-live", "polite");
  document.body.appendChild(stack);
  const KEY = () => "halaqat.notes." + (window.S?.phone || "x");
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY()) || "[]"); } catch (e) { return []; } };
  const save = l => { try { localStorage.setItem(KEY(), JSON.stringify(l.slice(0, 40))); } catch (e) {} };
  const BAD = /تعذّر|تعذر|ليست لديك|لا يمكن|غير صحيح|يتجاوز|رُفض|فشل|خطأ|انتهت|لم نجد|لا توجد لديك|محاولات كثيرة/;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  window.notify = function(msg, kind){
    if (!msg) return;
    kind = kind || (BAD.test(msg) ? "bad" : "good");
    const el = document.createElement("div"); el.className = "ntf " + kind; el.setAttribute("role", kind === "bad" ? "alert" : "status");
    el.innerHTML = `<span class="ni">${kind === "bad" ? "!" : kind === "good" ? "✓" : "i"}</span><div class="nt">${esc(msg)}</div><button class="nx" type="button" aria-label="إغلاق">×</button>`;
    stack.prepend(el);
    while (stack.children.length > 3) stack.lastChild.remove();
    const close = () => { el.classList.add("out"); setTimeout(() => el.remove(), 220); };
    el.querySelector(".nx").onclick = close;
    setTimeout(close, kind === "bad" ? 7000 : 4000);
    if (window.S?.phone) { const l = load(); l.unshift({ m: msg, k: kind, t: Date.now(), r: false }); save(l); paintBell(); }
  };
  window.toast = msg => notify(msg);

  /* الجرس أعلى الصفحة */
  const bell = document.createElement("button");
  bell.type = "button"; bell.className = "btn ghost icon-only bell"; bell.title = "الإشعارات"; bell.setAttribute("aria-label", "الإشعارات");
  bell.innerHTML = `<svg class="i" viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0"/></svg><span class="bdot" hidden></span>`;
  const signOut = document.getElementById("topSignOut");
  signOut?.parentNode.insertBefore(bell, signOut);
  function paintBell(){ const n = load().filter(x => !x.r).length, d = bell.querySelector(".bdot"); d.hidden = !n; d.textContent = n > 9 ? "9+" : n; }
  const ago = t => { const s = Math.round((Date.now() - t) / 1000); if (s < 60) return "الآن"; const m = Math.round(s / 60); if (m < 60) return `قبل ${m} د`; const h = Math.round(m / 60); if (h < 24) return `قبل ${h} س`; return new Date(t).toLocaleDateString("ar-SA-u-nu-latn"); };
  let panel = null;
  bell.onclick = e => {
    e.stopPropagation();
    if (panel) { panel.remove(); panel = null; return; }
    const l = load();
    panel = document.createElement("div"); panel.className = "ntf-panel";
    panel.innerHTML = `<header><b>الإشعارات</b>${l.length ? `<button class="btn ghost sm" type="button" data-clear>مسح الكل</button>` : ""}</header>` +
      (l.length ? l.map(x => `<div class="row ${x.k}"><i></i><div>${esc(x.m)}<span>${ago(x.t)}</span></div></div>`).join("") : `<div class="none">لا توجد إشعارات بعد. تظهر هنا نتيجة كل عملية تسويها.</div>`);
    document.body.appendChild(panel);
    const r = bell.getBoundingClientRect(); panel.style.top = (r.bottom + 8) + "px";
    panel.querySelector("[data-clear]")?.addEventListener("click", ev => { ev.stopPropagation(); save([]); panel.remove(); panel = null; paintBell(); });
    save(l.map(x => ({ ...x, r: true }))); paintBell();
  };
  document.addEventListener("click", e => { if (panel && !panel.contains(e.target)) { panel.remove(); panel = null; } });
  const iv = setInterval(() => { if (window.S?.phone) { paintBell(); clearInterval(iv); } }, 1000);
})();
