// Loads the app (core.js), then swaps its sign-in and data layer for the WhatsApp-code login
// served by our own database functions (login_request / login_verify / app_* / member_*).
(function(){
  const CFG = window.APP_CONFIG;
  /* ---- runs before the app loads: light theme, splash, new sign-in screen ---- */
  const LIGHT = "--bg:#f5f4f1;--surface:#ffffff;--surface-2:#f8f7f4;--line:#ebe7e0;--line-strong:#d8d1c5;--fg:#1c1712;--muted:#6e665b;--faint:#a0988c;--brand:#4a2e1a;--brand-ink:#ffffff;--brand-soft:#f5eee6;--gold:#b08442;--gold-hi:#d4aa64;--gold-soft:#f8f0e2;--side:#2a1b10;--side-2:#38251a;--side-fg:#f3e9da;--side-muted:#b4a189;--side-line:rgba(243,233,218,.09);--inc:#118463;--exp:#c7792f;--warnc:#b07d12;--info:#3d6a8a;--good:#18794e;--good-bg:#e8f3ec;--warn:#8a5d00;--warn-bg:#faf0d7;--bad:#b4372c;--bad-bg:#fbe9e6;--shadow:0 1px 2px rgba(28,23,18,.04),0 2px 8px rgba(28,23,18,.04);--shadow-lg:0 4px 12px rgba(28,23,18,.08),0 24px 48px rgba(28,23,18,.16);color-scheme:light";
  const css = document.createElement("style");
  css.textContent = `
:root:root{${LIGHT}}
html.booting .app{visibility:hidden}
.splash{position:fixed;inset:0;z-index:200;display:grid;place-items:center;background:var(--side);transition:opacity .25s}
.splash.out{opacity:0;pointer-events:none}
.splash .mark{width:74px;background:var(--side-fg);animation:pulse 1.4s ease-in-out infinite}
.splash p{margin:14px 0 0;color:var(--side-muted);font-size:13px;text-align:center}
@keyframes pulse{50%{opacity:.45}}
@media (prefers-reduced-motion:reduce){.splash .mark{animation:none}}
.auth{padding:0;place-items:stretch;background:var(--bg)}
.auth,.auth h1,.auth h2,.auth button,.auth input{font-family:"IBM Plex Sans Arabic","Segoe UI",Tahoma,sans-serif}
.auth-wrap{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);min-height:100%;width:100%}
.auth-art{position:relative;overflow:hidden;background:var(--side);color:var(--side-fg);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:56px 40px;gap:0}
.auth-art>*{position:relative}
.auth-art .mark{width:104px;background:var(--side-fg)}
.auth-art h1{margin:22px 0 4px;font-size:27px;font-weight:700;line-height:1.45}
.auth-art .auth-tag{margin:0;color:var(--side-muted);font-size:14.5px}
.auth-art blockquote{margin:34px 0 0;padding-top:26px;border-top:1px solid rgba(243,233,218,.14);max-width:340px;font-size:18px;font-weight:500;line-height:1.9;color:var(--side-fg)}
.auth-art cite{display:block;margin-top:6px;font-style:normal;font-size:12.5px;color:var(--side-muted)}
.auth-art .est{position:absolute;bottom:22px;left:0;right:0;font-size:12px;color:var(--side-muted)}
.auth-main{display:grid;place-items:center;align-content:center;gap:18px;padding:40px 24px}
.auth-box{width:min(430px,100%);display:grid;gap:22px;background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:34px 32px;box-shadow:0 1px 2px rgba(28,23,18,.04),0 18px 48px -12px rgba(28,23,18,.14)}
.auth-foot{font-size:12.5px;color:var(--faint);text-align:center}
.auth-box .steps{display:flex;gap:8px;align-items:center;font-size:12.5px;color:var(--faint)}
.auth-box .steps span{display:inline-flex;align-items:center;gap:6px}
.auth-box .steps b{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--surface-2);border:1px solid var(--line);font-size:11.5px;color:var(--muted)}
.auth-box .steps .on{color:var(--fg);font-weight:600}
.auth-box .steps .on b{background:var(--brand);border-color:var(--brand);color:#fff}
.auth-box .steps .done b{background:var(--good-bg);border-color:transparent;color:var(--good)}
.auth-box .steps i{flex:0 0 28px;height:1px;background:var(--line-strong)}
.auth-box h2{margin:0;font-size:24px;font-weight:700;line-height:1.4}
.auth-box .lead{margin:6px 0 0;color:var(--muted);font-size:14px;line-height:1.75}
.auth-box form,.auth-box .panel-x{display:grid;gap:18px;padding:0;background:none}
.auth-box .phone-field{background:var(--surface-2);border-radius:12px}
.auth-box .phone-field input{padding:13px 14px;font-size:19px;background:transparent}
.auth-box .phone-field span{padding:13px 14px;font-weight:600;background:transparent}
.auth-box .phone-field:focus-within{background:var(--surface);border-color:var(--brand);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 14%,transparent)}
.auth-box .btn.wa,.auth-box .btn.primary{padding:14px 16px;font-size:15.5px;font-weight:600;border-radius:12px;justify-content:center;position:relative}
.auth-box button[type=submit]:disabled{opacity:.75;cursor:progress}
.auth-box button[type=submit]:disabled::after{content:"";width:16px;height:16px;border-radius:50%;border:2px solid currentColor;border-inline-start-color:transparent;animation:spin .7s linear infinite;margin-inline-start:6px}
@keyframes spin{to{transform:rotate(360deg)}}
.otp-boxes{display:flex;gap:8px;direction:ltr;justify-content:space-between}
.otp-boxes input{width:100%;min-width:0;max-width:56px;aspect-ratio:5/6;padding:0!important;text-align:center;font-size:26px!important;font-weight:700;border-radius:12px!important;background:var(--surface-2);font-variant-numeric:tabular-nums;caret-color:var(--brand)}
.otp-boxes input:focus{background:var(--surface);border-color:var(--brand)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 14%,transparent)!important}
.otp-boxes input.filled{background:var(--surface);border-color:var(--line-strong)}
.otp-boxes.bad input{border-color:var(--bad);animation:shake .3s}

.auth-method{display:flex;width:100%;margin-bottom:4px}.auth-method button{flex:1;justify-content:center;display:inline-flex;align-items:center;gap:6px}
.auth-method button[aria-pressed="true"]{background:var(--surface);color:var(--fg);box-shadow:var(--shadow)}
.auth-method svg.i{width:16px;height:16px}
.pw-wrap{display:flex;gap:6px;align-items:center}.pw-wrap input{flex:1;min-width:0}
#pwIn{box-sizing:border-box;padding:12px 14px;border:1px solid var(--line-strong);border-radius:12px;background:var(--surface);color:var(--fg);font:inherit;font-size:16px;min-height:52px}
@keyframes shake{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.auth-box .hint{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:12px;background:#eef7f1;border:1px solid #d3ebdc;color:#2f5b40;font-size:13px;line-height:1.7}
.auth-box .hint svg{color:#1f9d57;margin-top:3px;flex:none}
.auth-box .lbl-row{display:flex;justify-content:space-between;align-items:center;gap:8px}
.auth-box .lbl-row .btn{padding:4px 8px;color:var(--brand);font-weight:600}
.auth-box .row2{display:flex;justify-content:space-between;align-items:center;gap:8px}
.auth-box .row2 .btn{padding:6px 4px;color:var(--brand);font-weight:600}
.auth-box .row2 .btn:disabled{color:var(--faint);opacity:1}
.auth-box .err{padding:10px 12px;border-radius:10px;background:var(--bad-bg);border:1px solid color-mix(in srgb,var(--bad) 25%,transparent)}
.auth-box .denied{display:grid;gap:12px;text-align:center;justify-items:center}
.auth-box .denied .ico{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:var(--bad-bg);color:var(--bad)}
@media (max-width:860px){
  .auth-wrap{grid-template-columns:minmax(0,1fr);grid-template-rows:auto 1fr}
  .auth-art{flex-direction:row;justify-content:center;gap:14px;padding:22px 20px;text-align:start}
  .auth-art blockquote,.auth-art .est{display:none}
  .auth-art .mark{width:52px;flex:none}.auth-art h1{font-size:18px;margin:0}.auth-art .auth-tag{font-size:12.5px}
  .auth-main{place-items:start center;align-content:start;padding:20px 16px 32px}
  .auth-box{padding:26px 20px;border-radius:18px}
  .otp-boxes{gap:6px}
}`;
  document.head.appendChild(css);
  /* ---- design layer: one formal typeface, no gold rules, calmer surfaces, bottom tab bar on phones ---- */
  const look = document.createElement("style");
  look.textContent = `
:root:root{--f-display:"IBM Plex Sans Arabic","Segoe UI",Tahoma,sans-serif;--f-body:"IBM Plex Sans Arabic","Segoe UI",Tahoma,sans-serif;--r:16px;--line:#ece8e1;--shadow:0 1px 2px rgba(28,23,18,.04)}
body{letter-spacing:0}
h1,h2,h3,h4{letter-spacing:0}
.side-brand p{color:var(--side-muted)}
.side-brand h1{font-size:16px}
.nav button{font-weight:500}
.nav button[aria-selected="true"]{background:var(--side-2);color:#fff}
.nav button[aria-selected="true"]::before{display:none}
.nav button[aria-selected="true"] svg.i{color:#fff}
.badge{background:#efe3cf;color:#2a1b10}
.kpi.lead b{color:#fff}
.kpi.lead .kicon{color:var(--side-fg);background:rgba(243,233,218,.1)}
.kpi{transition:box-shadow .15s,transform .15s}
.page-head h2{font-size:25px;font-weight:700}
.page-head p{font-size:14px}
.topbar{box-shadow:none}
.panel,.kpi,.filters{box-shadow:none}
.panel>header{background:var(--surface-2)}
.panel>header h3{font-size:15px}
.dt thead th{background:var(--surface-2);color:var(--muted);font-weight:600;font-size:12.5px}
.dt tbody tr{transition:background .12s}
.dt tbody tr.click:hover{background:color-mix(in srgb,var(--brand) 4%,var(--surface))}
.btn{border-radius:10px;transition:background .12s,border-color .12s,box-shadow .12s}
.btn:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 18%,transparent)}
.btn.primary:hover{background:#3a2314}
.sheet{border-radius:20px;box-shadow:0 24px 64px -16px rgba(28,23,18,.35)}
.sheet>header,.sheet form>header{background:var(--surface)}
.chip{border-radius:999px;padding:2px 10px}
.seg{border-radius:12px}
.seg button{border-radius:9px}
@media (max-width:980px){
  .nav{position:fixed;bottom:0;left:0;right:0;z-index:60;display:flex;gap:0;margin:0;padding:6px 4px calc(6px + env(safe-area-inset-bottom,0px));background:var(--side);border-top:1px solid rgba(243,233,218,.08);overflow-x:auto}
  .nav button{flex:1 1 0;min-width:42px;flex-direction:column;justify-content:center;gap:3px;padding:7px 2px;font-size:10.5px;line-height:1.25;border-radius:10px;text-align:center;white-space:normal}
  .nav button svg.i{width:21px;height:21px}
  .nav button .badge{position:absolute;top:3px;inset-inline-start:calc(50% + 4px);margin:0;min-width:18px;padding:0 5px;font-size:10.5px;line-height:17px}
  .side{padding-bottom:12px}
  .work-inner{padding-bottom:110px}
  .topbar{padding:10px 12px}
  .page-head h2{font-size:21px}
}`;
  document.head.appendChild(look);
  document.documentElement.removeAttribute("data-theme");
  const cs = document.createElement("meta"); cs.name = "color-scheme"; cs.content = "light"; document.head.appendChild(cs);
  document.documentElement.classList.add("booting");

  const splash = document.createElement("div");
  splash.className = "splash";
  splash.innerHTML = `<div><div class="mark" role="img" aria-label="الشعار"></div><p>جارٍ التحميل…</p></div>`;
  document.body.appendChild(splash);
  window.__hideSplash = () => { document.documentElement.classList.remove("booting"); splash.classList.add("out"); setTimeout(() => splash.remove(), 300); };

  const WA = `<svg class="i" viewBox="0 0 24 24"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1z M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8c-.8-.4-1.4-1-1.8-1.8l.8-1-1-2z"/></svg>`;
  const steps = n => `<div class="steps"><span class="${n===1?"on":""}"><b>1</b>رقم الجوال</span><i></i><span class="${n===2?"on":""}"><b>2</b>رمز التحقق</span></div>`;
  document.getElementById("auth").innerHTML = `<div class="auth-wrap">
  <aside class="auth-art"><div class="mark" role="img" aria-label="الشعار"></div>
    <div><h1>${CFG.orgName}</h1><p class="auth-tag">${CFG.tagline}</p></div>
    ${CFG.est ? `<p class="est">${CFG.est}</p>` : ""}</aside>
  <main class="auth-main"><div class="auth-box">
    <form id="authPhone" novalidate>
      <div class="seg auth-method" role="group" aria-label="طريقة الدخول"><button type="button" data-auth-method="pw" aria-pressed="true">كلمة المرور</button><button type="button" data-auth-method="wa" aria-pressed="false">${WA}رمز واتساب</button></div>
      <div><h2>أهلًا بك</h2><p class="lead" id="authLead">سجّل دخولك برقم جوالك المسجّل في النظام وكلمة المرور.</p></div>
      <div class="field"><label for="phoneIn">رقم الجوال</label><div class="phone-field"><span>+966</span><input id="phoneIn" type="tel" inputmode="numeric" placeholder="5X XXX XXXX" autocomplete="username"></div></div>
      <div class="field" id="pwField"><label for="pwIn">كلمة المرور</label><div class="pw-wrap"><input id="pwIn" type="password" autocomplete="current-password" dir="ltr"><button type="button" class="btn ghost sm" id="pwEye" aria-label="إظهار كلمة المرور">إظهار</button></div></div>
      <p class="err" id="authErr" hidden></p>
      <button class="btn primary" type="submit" id="authGo">دخول</button>
      <div class="hint" id="authHint"><span>نسيت كلمة المرور؟ اختر «رمز واتساب» وادخل بالرمز، ثم غيّرها من الإعدادات.</span></div>
    </form>
    <form id="authCode" hidden novalidate>
      ${steps(2)}
      <div><h2>أدخل رمز التحقق</h2><p class="lead">أرسلنا رمزًا من 6 أرقام إلى <b id="sentTo" dir="ltr"></b> على واتساب. انسخ الرمز من الرسالة وارجع هنا، ويُكتب تلقائيًا.</p></div>
      <div class="field"><div class="lbl-row"><label for="otp0">رمز التحقق</label><button type="button" class="btn ghost sm" id="pasteCode">لصق الرمز</button></div><div class="otp-boxes" id="otpBoxes">${[0,1,2,3,4,5].map(i => `<input id="otp${i}" type="text" inputmode="numeric" maxlength="1" aria-label="الرقم ${i+1}"${i ? "" : ` autocomplete="one-time-code"`}>`).join("")}</div><input id="codeIn" type="hidden"></div>
      <p class="err" id="codeErr" hidden></p>
      <button class="btn primary" type="submit">دخول</button>
      <div class="row2"><button type="button" class="btn ghost sm" id="changePhone">تغيير الرقم</button><button type="button" class="btn ghost sm" id="resend">إعادة إرسال الرمز</button></div>
    </form>
    <div class="denied" id="authDenied" hidden>
      <div class="ico"><svg class="i" viewBox="0 0 24 24"><path d="M12 8v5M12 16.5v.5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/></svg></div>
      <h2>رقمك غير مسجّل</h2><p class="lead">اطلب من مدير النظام إضافة رقمك من صفحة «المستخدمون»، ثم سجّل الدخول مرة ثانية.</p>
      <button class="btn" type="button" data-signout>رجوع</button>
    </div>
  </div><p class="auth-foot">تواجه مشكلة في الدخول؟ تواصل مع مدير النظام.</p></main></div>`;

  /* six code boxes feed the hidden #codeIn; typing, pasting and SMS autofill all work, and the 6th digit submits */
  const boxes = [...document.querySelectorAll("#otpBoxes input")], codeIn = document.getElementById("codeIn");
  const syncCode = () => { codeIn.value = boxes.map(b => b.value).join(""); boxes.forEach(b => b.classList.toggle("filled", !!b.value)); document.getElementById("otpBoxes").classList.remove("bad"); };
  const fillFrom = (i, digits) => { digits.split("").forEach((d, k) => { if (boxes[i + k]) boxes[i + k].value = d; }); syncCode();
    const next = boxes[Math.min(i + digits.length, 5)]; next.focus();
    if (codeIn.value.length === 6) document.getElementById("authCode").requestSubmit(); };
  boxes.forEach((b, i) => {
    b.addEventListener("input", () => { const d = b.value.replace(/\D/g, ""); b.value = ""; if (d) fillFrom(i, d.slice(0, 6 - i)); else syncCode(); });
    b.addEventListener("keydown", e => {
      if (e.key === "Backspace" && !b.value && i) { boxes[i - 1].value = ""; boxes[i - 1].focus(); syncCode(); e.preventDefault(); }
      if (e.key === "ArrowLeft" && i < 5) boxes[i + 1].focus();
      if (e.key === "ArrowRight" && i) boxes[i - 1].focus();
    });
    b.addEventListener("paste", e => { const d = (e.clipboardData?.getData("text") || "").replace(/\D/g, ""); if (d) { e.preventDefault(); fillFrom(0, d.slice(0, 6)); } });
    b.addEventListener("focus", () => b.select());
  });
  /* code inputs are cleared by setting #codeIn to "" — mirror that into the boxes */
  Object.defineProperty(codeIn, "value", { get(){ return HTMLInputElement.prototype.__lookupGetter__("value").call(this); },
    set(v){ HTMLInputElement.prototype.__lookupSetter__("value").call(this, v); if (!v) { boxes.forEach(b => { b.value = ""; b.classList.remove("filled"); }); } } });
  const codeObserver = new MutationObserver(() => { if (!document.getElementById("authCode").hidden) setTimeout(() => (boxes.find(b => !b.value) || boxes[5]).focus(), 50); });
  codeObserver.observe(document.getElementById("authCode"), { attributes: true, attributeFilter: ["hidden"] });

  /* a copied WhatsApp message fills the boxes: on the paste button, and when coming back to the page */
  const codeFromText = t => (/(?<!\d)\d{6}(?!\d)/.exec(t || "") || [])[0];
  const tryClipboard = async quiet => {
    if (document.getElementById("authCode").hidden || codeIn.value.length === 6) return;
    try { const c = codeFromText(await navigator.clipboard.readText()); if (c) fillFrom(0, c); else if (!quiet) toast("لم أجد رمزًا من 6 أرقام. انسخ رسالة الرمز من واتساب ثم اضغط «لصق الرمز»."); }
    catch (e) { if (!quiet) toast("اسمح للمتصفح بقراءة الحافظة، أو اكتب الرمز بنفسك."); }
  };
  document.getElementById("pasteCode").onclick = () => tryClipboard(false);
  window.addEventListener("focus", () => tryClipboard(true));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tryClipboard(true); });

  /* phone: digits only, shown as 5X XXX XXXX, last number remembered */
  const phoneIn = document.getElementById("phoneIn");
  const fmtPhone = v => { let d = v.replace(/\D/g, ""); if (d.startsWith("966")) d = d.slice(3); if (d.startsWith("0")) d = d.slice(1); d = d.slice(0, 9); return [d.slice(0, 2), d.slice(2, 5), d.slice(5)].filter(Boolean).join(" "); };
  phoneIn.addEventListener("input", () => { phoneIn.value = fmtPhone(phoneIn.value); });
  try { const last = localStorage.getItem("halaqat.lastPhone"); if (last) phoneIn.value = fmtPhone(last); } catch (e) {}

  /* sign-in method: fixed password or WhatsApp code; the last choice is remembered */
  let authMethod = "pw";
  try { authMethod = localStorage.getItem("halaqat.authMethod") || "pw"; } catch (e) {}
  const setMethod = m => {
    authMethod = m; try { localStorage.setItem("halaqat.authMethod", m); } catch (e) {}
    document.querySelectorAll("[data-auth-method]").forEach(b => b.setAttribute("aria-pressed", b.dataset.authMethod === m));
    const pw = m === "pw";
    document.getElementById("pwField").hidden = !pw;
    document.getElementById("authErr").hidden = true;
    document.getElementById("authLead").textContent = pw ? "سجّل دخولك برقم جوالك المسجّل في النظام وكلمة المرور." : "سجّل دخولك برقم جوالك المسجّل في النظام، ونرسل لك رمز الدخول على واتساب.";
    const go = document.getElementById("authGo");
    go.className = "btn " + (pw ? "primary" : "wa"); go.innerHTML = pw ? "دخول" : WA + "أرسل رمز الدخول";
    document.getElementById("authHint").innerHTML = pw ? "<span>نسيت كلمة المرور؟ اختر «رمز واتساب» وادخل بالرمز، ثم غيّرها من الإعدادات.</span>" : WA + "<span>يصلك الرمز من رقم المجمع على واتساب، وهو صالح لمدة 5 دقائق.</span>";
  };
  window.__authMethod = () => authMethod;
  document.querySelectorAll("[data-auth-method]").forEach(b => b.onclick = () => setMethod(b.dataset.authMethod));
  document.getElementById("pwEye").onclick = () => { const i = document.getElementById("pwIn"), show = i.type === "password"; i.type = show ? "text" : "password"; document.getElementById("pwEye").textContent = show ? "إخفاء" : "إظهار"; };
  setMethod(authMethod);

  /* تحميل الملفات بالتوازي مع الحفاظ على ترتيب التنفيذ */
  const FILES = ["core.js", "custody.js", "extras.js", "settings.js", "notify.js", "reward.js", "audit.js", "receivables.js", "cats.js"];
  let left = FILES.length, started = false;
  const done = () => { if (--left === 0 && !started) { started = true; start(); } };
  FILES.forEach(f => { const el = document.createElement("script"); el.src = f; el.async = false; el.onload = el.onerror = done; document.body.appendChild(el); });

  function start(){
    const TK = "halaqat.token";
    let token = storeGet(TK) || "";
    let inside = false;
    const MSG = {
      bad_phone: "اكتب رقم جوال سعودي صحيح، مثل 5XXXXXXXX.",
      not_registered: "رقمك غير مسجّل في النظام. اطلب من مدير النظام إضافته.",
      too_soon: "أرسلنا لك رمزًا قبل قليل. انتظر دقيقة ثم اطلب رمزًا جديدًا.",
      sender_not_configured: "خدمة الإرسال عبر واتساب غير مهيأة. تواصل مع مدير النظام.",
      expired: "انتهت صلاحية الرمز. اطلب رمزًا جديدًا.",
      wrong_code: "الرمز غير صحيح. تأكد منه وأعد المحاولة.",
      locked: "محاولات كثيرة. اطلب رمزًا جديدًا.",
      forbidden: "ليست لديك صلاحية لهذا الإجراء.",
      network: "تعذّر الاتصال. تحقق من الإنترنت وأعد المحاولة.",
      no_password: "ما فيه كلمة مرور لهذا الرقم بعد. ادخل برمز واتساب، أو اطلب من مدير النظام كلمة مرور.",
      wrong_password: "كلمة المرور غير صحيحة.",
      pw_locked: "محاولات كثيرة. انتظر 15 دقيقة، أو ادخل برمز واتساب.",
      bad_password: "كلمة المرور من 6 إلى 64 حرفًا."
    };
    const rpc = async (fn, args) => {
      try { const { data, error } = await SB.rpc(fn, args); return error ? { error: "network" } : data; }
      catch (e) { return { error: "network" }; }
    };
    window.appRpc = (fn, args) => rpc(fn, { p_token: token, ...(args || {}) });
    const showErr = (el, code) => { el.textContent = MSG[code] || MSG.network; el.hidden = false; };
    const origStep = authStep;
    window.authStep = step => { if (inside && step) return; origStep(step); };
    const expired = () => { try { localStorage.removeItem(TK); } catch (e) {} location.reload(); };

    /* data store over the app_* database functions; refreshes every 20 s and on focus */
    window.makeDb = function(){
      let cache = {}, last = "";
      const subs = {}, docSubs = {};
      const snap = c => { const docs = [...(cache[c] || new Map()).entries()].map(([id, data]) => ({ id, exists: true, data: () => data })); return { docs, size: docs.length, empty: !docs.length }; };
      const docSnap = k => { const [c, id] = k.split("/"); const d = cache[c]?.get(id); return { id, exists: !!d, data: () => d }; };
      const notify = c => { (subs[c] || new Set()).forEach(cb => cb(snap(c))); Object.keys(docSubs).forEach(k => { if (k.startsWith(c + "/")) docSubs[k].forEach(cb => cb(docSnap(k))); }); };
      const notifyAll = () => { const cs = new Set([...Object.keys(subs), ...Object.keys(docSubs).map(k => k.split("/")[0])]); cs.forEach(notify); };
      const fail = r => { if (r?.error === "invalid_session") expired(); const e = new Error(r?.error || "error"); e.code = "unavailable"; return e; };
      async function load(){
        const r = await rpc("app_load", { p_token: token });
        if (r?.error) throw fail(r);
        const raw = JSON.stringify(r.docs);
        if (raw === last) return;
        last = raw; const next = {};
        r.docs.forEach(x => { (next[x.c] ||= new Map()).set(x.id, x.d); });
        cache = next; notifyAll();
      }
      const ready = load();
      setInterval(() => { if (!document.hidden) load().catch(() => {}); }, 20000);
      window.addEventListener("focus", () => load().catch(() => {}));
      const put = (c, id, data) => { (cache[c] ||= new Map()).set(id, data); last = ""; notify(c); };
      const docRef = (c, id) => ({ id, path: `${c}/${id}`,
        onSnapshot(cb, onErr){ const k = `${c}/${id}`; (docSubs[k] ||= new Set()).add(cb); ready.then(() => cb(docSnap(k))).catch(e => onErr?.(e)); return () => docSubs[k].delete(cb); },
        async set(data){ const r = await rpc("app_put", { p_token: token, p_collection: c, p_id: id, p_data: data }); if (r?.error) throw fail(r); put(c, id, data); },
        async update(patch){ const data = { ...(cache[c]?.get(id) || {}), ...patch }; const r = await rpc("app_put", { p_token: token, p_collection: c, p_id: id, p_data: data }); if (r?.error) throw fail(r); put(c, id, data); },
        async delete(){ const r = await rpc("app_delete", { p_token: token, p_collection: c, p_id: id }); if (r?.error) throw fail(r); cache[c]?.delete(id); last = ""; notify(c); }
      });
      return {
        doc(path){ const [c, id] = path.split("/"); return docRef(c, id); },
        collection(c){ return {
          onSnapshot(cb, onErr){ (subs[c] ||= new Set()).add(cb); ready.then(() => cb(snap(c))).catch(e => onErr?.(e)); return () => subs[c].delete(cb); },
          doc(id){ return docRef(c, id || crypto.randomUUID()); },
          async add(data){ const r = docRef(c, crypto.randomUUID()); await r.set(data); return r; }
        }; }
      };
    };

    /* users (admins) */
    window.loadMembers = async function(){
      const r = await rpc("members_list", { p_token: token });
      S.members = r?.members || [];
      if ($("#memberList")) views.users.fill();
    };
    views.users.bind = function(){
      $("#addMember").onclick = () => openMember();
      $("#memberList").addEventListener("click", async e => {
        const b = e.target.closest("[data-del-member]"); if (!b) return;
        if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "تأكيد الإزالة"; return; }
        b.disabled = true;
        const r = await rpc("member_remove", { p_token: token, p_phone: b.dataset.delMember });
        if (r?.error) { toast("تعذّرت الإزالة. أعد المحاولة."); b.disabled = false; } else { toast("أُزيل المستخدم"); loadMembers(); }
      });
    };
    /* sign-in */
    window.sendCode = async function(){
      const err = $("#authErr"); err.hidden = true;
      const phone = normPhone($("#phoneIn").value);
      if (!phone) return showErr(err, "bad_phone");
      const btn = $("#authPhone button[type=submit]"); btn.disabled = true;
      if (window.__authMethod() === "pw") {
        const pw = $("#pwIn").value;
        if (!pw) { btn.disabled = false; err.textContent = "اكتب كلمة المرور."; err.hidden = false; return; }
        const r = await rpc("login_password", { p_phone: phone, p_password: pw });
        btn.disabled = false;
        if (r?.error) return showErr(err, r.error);
        storeSet("halaqat.lastPhone", phone); $("#pwIn").value = "";
        token = r.token; storeSet(TK, token); return enter2(r);
      }
      const r = await rpc("login_request", { p_phone: phone });
      btn.disabled = false;
      if (r?.error) return showErr(err, r.error);
      storeSet("halaqat.lastPhone", phone);
      pendingPhone = phone; $("#sentTo").textContent = showPhone(phone); $("#codeIn").value = ""; $("#codeErr").hidden = true; origStep("code"); cooldown();
    };
    let cdTimer = null;
    function cooldown(){
      const b = $("#resend"); let n = 60; clearInterval(cdTimer);
      const tick = () => { if (n <= 0) { clearInterval(cdTimer); b.disabled = false; b.textContent = "إعادة إرسال الرمز"; return; } b.disabled = true; b.textContent = `إعادة الإرسال بعد ${n} ث`; n--; };
      tick(); cdTimer = setInterval(tick, 1000);
    }
    $("#resend").onclick = async () => {
      $("#codeErr").hidden = true;
      const r = await rpc("login_request", { p_phone: pendingPhone });
      if (r?.error) showErr($("#codeErr"), r.error); else { toast("أُرسل رمز جديد على واتساب"); cooldown(); }
    };
    $("#authCode").onsubmit = async e => {
      e.preventDefault();
      const code = $("#codeIn").value.replace(/[^0-9]/g, ""), err = $("#codeErr"); err.hidden = true;
      if (code.length !== 6) { err.textContent = "الرمز 6 أرقام."; err.hidden = false; return; }
      const btn = $("#authCode button[type=submit]"); btn.disabled = true;
      const r = await rpc("login_verify", { p_phone: pendingPhone, p_code: code });
      btn.disabled = false;
      if (r?.error) { $("#otpBoxes").classList.add("bad"); return showErr(err, r.error); }
      token = r.token; storeSet(TK, token); enter2(r);
    };
    document.addEventListener("click", e => {
      if (e.target.closest("[data-signout]")) { rpc("logout", { p_token: token }); try { localStorage.removeItem(TK); } catch (x) {} }
    }, true);

    async function enter2(info){
      if (inside) return;
      inside = true;
      S.uid = info.phone; S.phone = info.phone; S.isAdmin = info.role === "admin";
      S.role = info.role; S.isTech = info.role === "tech"; S.canSys = S.isAdmin || S.isTech;
      S.me = { ...(S.me || {}), name: info.name || S.me?.name || "", title: info.title || "", role: info.role };
      const ctx = { rpc, token: () => token };
      if (info.role === "custodian" || info.role === "tech") {
        /* الإداريون والدعم الفني: عهدهم ومهامهم فقط، والدعم الفني يرى إعدادات النظام */
        S.canWrite = false; document.documentElement.classList.add("is-cust");
        await Custody.init(ctx);
        origStep(null); __hideSplash(); show("custody");
        return;
      }
      origStep(null); __hideSplash();
      Custody.init(ctx);
      if (S.isAdmin) loadMembers();
      const db = makeDb(); S.db = db;
      const onErr = () => { $("#view").innerHTML = `<div class="notice">تعذّر تحميل البيانات. حدّث الصفحة، وإذا تكررت المشكلة سجّل الخروج ثم ادخل مرة ثانية.</div>`; };
      const ready = () => S.loaded.h && S.loaded.s && S.loaded.t && S.loaded.tc;
      const first = () => { if (ready() && !$("#view .page")) show(S.view); else refresh(); };
      db.collection("halaqat").onSnapshot(s => { S.halaqat = s.docs.map(d => ({ id: d.id, ...d.data() })); S.loaded.h = true; first(); }, onErr);
      db.collection("students").onSnapshot(s => { S.students = s.docs.map(d => ({ id: d.id, ...d.data() })); S.loaded.s = true; first(); }, onErr);
      db.collection("teachers").onSnapshot(s => { S.teachers = s.docs.map(d => ({ id: d.id, ...d.data() })); S.loaded.tc = true; first(); }, onErr);
      db.collection("transactions").onSnapshot(s => { S.tx = s.docs.map(d => ({ id: d.id, ...d.data() })); S.loaded.t = true; first(); }, onErr);
      db.doc("settings/main").onSnapshot(s => { S.settings = s.exists ? { ...s.data() } : {}; paintHeader(); }, onErr);
    }

    if (token) {
      rpc("session_info", { p_token: token }).then(r => {
        if (r?.ok) enter2(r);
        else { try { localStorage.removeItem(TK); } catch (e) {} token = ""; origStep("phone"); __hideSplash(); }
      });
    } else { origStep("phone"); __hideSplash(); }
  }
})();
