// إعدادات النظام (للمدير فقط): اسم المجمع، ورقم واتساب المرسِل ومفتاح WasenderAPI.
// تظهر أسفل صفحة المستخدمين، وتُحفظ في قاعدة البيانات (المفتاح مشفّر في Vault ولا يُعرض كاملًا).
(function(){
  const css = document.createElement("style");
  css.textContent = `
#sysSettings{margin-top:18px}
#sysSettings .ss-body{padding:18px 20px;display:grid;gap:16px}
#sysSettings .ss-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
#sysSettings .field{display:grid;gap:6px}
#sysSettings .hint{font-size:12.5px;color:var(--muted);line-height:1.7}
#sysSettings .ss-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
#sysSettings .ss-status{font-size:13px;color:var(--muted)}
#sysSettings .ss-status.good{color:#1f7a4d}#sysSettings .ss-status.bad{color:#b3261e}`;
  document.head.appendChild(css);

  const MSG = {
    bad_name: "اكتب اسم المجمع (من حرفين إلى 80 حرفًا).",
    bad_phone: "اكتب رقم جوال سعودي صحيح، مثل 05XXXXXXXX.",
    bad_key: "المفتاح غير صحيح. انسخه كاملًا من لوحة WasenderAPI.",
    forbidden: "هذه الإعدادات لمدير النظام فقط.",
    sender_not_configured: "لم يُضف مفتاح WasenderAPI بعد.",
    network: "تعذّر الاتصال. أعد المحاولة."
  };
  const say = (cls, text) => { const el = $("#ssStatus"); if (el) { el.className = "ss-status " + cls; el.textContent = text; } };

  const shell = views.users.shell;
  views.users.shell = function(){
    return shell.call(this).replace(/<\/div>\s*$/, `<section class="panel" id="sysSettings"><header><h3>إعدادات النظام وواتساب</h3></header><div class="ss-body"><p class="hint">جارٍ التحميل…</p></div></section></div>`);
  };

  async function paint(){
    const box = $("#sysSettings .ss-body"); if (!box || box.dataset.ready) return;
    box.dataset.ready = "1";
    const r = await window.appRpc("config_get");
    if (!r || r.error) { box.innerHTML = `<p class="hint">${MSG[r?.error] || MSG.network}</p>`; return; }
    box.innerHTML = `
<div class="ss-grid">
  <div class="field"><label for="ssOrg">اسم المجمع</label><input type="text" id="ssOrg" maxlength="80" value="${esc(r.org_name || "")}"></div>
  <div class="field"><label for="ssNum">رقم واتساب المرسِل</label><input type="tel" id="ssNum" dir="ltr" style="text-align:right" placeholder="05XXXXXXXX" value="${esc(r.wa_number ? "0" + r.wa_number.slice(3) : "")}"></div>
  <div class="field"><label for="ssKey">مفتاح WasenderAPI</label><input type="password" id="ssKey" dir="ltr" autocomplete="off" placeholder="${r.has_key ? "محفوظ " + esc(r.key_hint) + " · اكتب مفتاحًا جديدًا لتغييره" : "الصق المفتاح هنا"}"></div>
</div>
<p class="hint">الرقم للعرض والتذكير فقط؛ الإرسال يتم من الرقم المربوط بالمفتاح في حسابك على WasenderAPI. تجد المفتاح في لوحة WasenderAPI داخل الجلسة (Session) الخاصة بالرقم.</p>
<div class="ss-actions">
  <button class="btn primary" type="button" id="ssSave">حفظ الإعدادات</button>
  <button class="btn" type="button" id="ssTest"${r.has_key ? "" : " disabled"}>إرسال رسالة تجربة لي</button>
  <span class="ss-status" id="ssStatus">${r.has_key ? "واتساب مهيأ." : "واتساب غير مهيأ بعد: أضف المفتاح ليتمكن المستخدمون من الدخول."}</span>
</div>`;
    $("#ssSave").onclick = async () => {
      const b = $("#ssSave"); b.disabled = true; say("", "جارٍ الحفظ…");
      const key = $("#ssKey").value.trim();
      const s = await window.appRpc("config_set", { p_org_name: $("#ssOrg").value, p_wa_number: $("#ssNum").value, p_wa_key: key || null });
      b.disabled = false;
      if (!s || s.error) return say("bad", MSG[s?.error] || MSG.network);
      toast("حُفظت الإعدادات");
      box.dataset.ready = ""; paint();
    };
    $("#ssTest").onclick = async () => {
      const b = $("#ssTest"); b.disabled = true; say("", "جارٍ الإرسال…");
      const t = await window.appRpc("wa_test");
      if (!t || t.error) { b.disabled = false; return say("bad", MSG[t?.error] || MSG.network); }
      for (let i = 0; i < 15; i++) {
        await new Promise(ok => setTimeout(ok, 2000));
        const st = await window.appRpc("wa_status", { p_id: t.id });
        if (st?.status === "sent") { b.disabled = false; return say("good", "وصلت رسالة التجربة إلى واتسابك."); }
        if (st?.status === "failed") { b.disabled = false; return say("bad", "فشل الإرسال. تأكد من المفتاح وأن الرقم متصل في WasenderAPI." + (st.error ? " (" + String(st.error).slice(0, 80) + ")" : "")); }
      }
      b.disabled = false; say("", "الرسالة في الطابور ولم تُرسل بعد. تحقق بعد قليل.");
    };
  }

  const fill = views.users.fill;
  views.users.fill = function(){ fill.apply(this, arguments); if (S.isAdmin) paint(); else { const p = $("#sysSettings"); if (p) p.remove(); } };
})();
