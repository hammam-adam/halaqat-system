// إقرار المعلم باستلام مكافأته: لكل سند صرف مكافأة رابط يفتحه المعلم ويؤكد فيه الاستلام.
// يُرسل الرابط تلقائيًا على واتساب المعلم عند صرف المكافأة (إذا كان واتساب مربوطًا ورقم المعلم مسجلًا)،
// ويظهر في السند مع أزرار الإرسال والنسخ، وتظهر حالة التأكيد في بطاقات المعلمين.
(function(){
  const css = document.createElement("style");
  css.textContent = `
.rcpt{margin-top:14px;padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2);display:grid;gap:10px}
.rcpt .rc-head{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px}
.rcpt .rc-head .dot{width:9px;height:9px;border-radius:50%;background:var(--warnc);flex:none}
.rcpt.ok{background:var(--good-bg);border-color:transparent}.rcpt.ok .rc-head{color:var(--good)}.rcpt.ok .rc-head .dot{background:var(--good)}
.rcpt p{margin:0;font-size:12.5px;color:var(--muted);line-height:1.7}
.rcpt .rc-actions{display:flex;flex-wrap:wrap;gap:8px}.rcpt a.btn{text-decoration:none}
.voucher .vconf{margin-top:10px;font-size:12.5px;color:var(--good);font-weight:600}
.rc-chip{display:inline-flex;align-items:center;gap:5px;font-size:12px;padding:2px 9px;border-radius:999px;background:var(--warn-bg);color:var(--warn);margin-top:6px}
.rc-chip.ok{background:var(--good-bg);color:var(--good)}`;
  document.head.appendChild(css);

  const R = window.Reward = { map: {}, loaded: false };
  const isReward = t => t && t.type === "expense" && !t.void && t.teacherId && t.category === REWARD_CAT;
  const when = iso => { try { const d = new Date(iso); return d.toLocaleDateString("ar-SA-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "long" }) + " · " + d.toLocaleTimeString("ar-SA-u-nu-latn", { hour: "numeric", minute: "2-digit" }); } catch (e) { return ""; } };
  const waLink = (phone, text) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  const msgFor = (t, url) => `${S.settings?.orgName || APP_CONFIG.orgName}\nالسلام عليكم ${t.party || ""}\n\nصُرفت لك مكافأة${t.rewardMonth ? " شهر " + monthLabel(t.rewardMonth) : ""} بمبلغ ${money(t.amount)} (سند ${vno(t)}).\nنرجو تأكيد الاستلام من هذا الرابط:\n${url}`;

  R.load = async function(){
    if (!window.appRpc || !S.db) return;
    const r = await appRpc("reward_list");
    if (!r?.ok) return;
    const next = {}; r.receipts.forEach(x => next[x.tx_id] = x);
    const changed = JSON.stringify(next) !== JSON.stringify(R.map);
    R.map = next; R.loaded = true;
    if (changed && S.view === "teachers") paintChips();
  };
  R.link = async function(txId, send){
    const t = S.tx.find(x => x.id === txId);
    const r = await appRpc("reward_link", { p_tx_id: txId, p_send: !!send, p_month_label: t?.rewardMonth ? monthLabel(t.rewardMonth) : null });
    if (r?.ok) R.map[txId] = { ...(R.map[txId] || {}), tx_id: txId, url: r.url, confirmed_at: r.confirmed_at, confirmed_name: r.confirmed_name, sent_at: r.sent ? new Date().toISOString() : R.map[txId]?.sent_at, phone: r.phone };
    return r;
  };

  /* بعد حفظ سند مكافأة جديد: أنشئ الرابط وأرسله على واتساب المعلم */
  const origMake = window.makeDb;
  window.makeDb = function(){
    const db = origMake.apply(this, arguments);
    const after = (c, id, data, isNew) => {
      if (c !== "transactions" || !isReward({ ...data, category: data.category })) return;
      if (isNew) R.link(id, true).then(r => { if (r?.sent) toast("أُرسل للمعلم رابط تأكيد الاستلام على واتساب"); });
      else if (R.map[id] && !R.map[id].confirmed_at) R.link(id, false);
    };
    const wrap = (c, ref) => {
      const set = ref.set.bind(ref), update = ref.update.bind(ref);
      ref.set = async d => { const isNew = c === "transactions" && !S.tx.some(t => t.id === ref.id); await set(d); after(c, ref.id, d, isNew); };
      ref.update = async p => { await update(p); if (c === "transactions") { const t = S.tx.find(x => x.id === ref.id); if (t) after(c, ref.id, { ...t, ...p }, false); } };
      return ref;
    };
    return {
      doc(path){ return wrap(path.split("/")[0], db.doc(path)); },
      collection(c){ const col = db.collection(c); return {
        onSnapshot: (...a) => col.onSnapshot(...a),
        doc: id => wrap(c, col.doc(id)),
        async add(d){ const ref = await col.add(d); after(c, ref.id, d, true); return ref; }
      }; }
    };
  };

  /* السند: حالة الإقرار وأزرار الإرسال */
  const origVoucher = window.openVoucher;
  window.openVoucher = function(id){
    origVoucher(id);
    const t = S.tx.find(x => x.id === id);
    if (!isReward(t)) return;
    const box = document.createElement("div"); box.className = "rcpt";
    document.querySelector("#modalRoot .voucher")?.after(box);
    paintBox(box, t);
    R.link(id, false).then(() => paintBox(box, t));
  };
  function paintBox(box, t){
    if (!box.isConnected) return;
    const rc = R.map[t.id], tc = teacherById(t.teacherId), phone = normPhone(tc?.phone || "");
    const v = document.querySelector("#modalRoot .voucher");
    v?.querySelector(".vconf")?.remove();
    if (rc?.confirmed_at) {
      box.className = "rcpt ok";
      box.innerHTML = `<div class="rc-head"><i class="dot"></i>أكّد المعلم استلام المكافأة</div><p>أقرّ ${esc(rc.confirmed_name || t.party)} بالاستلام في ${esc(when(rc.confirmed_at))}.</p><div class="rc-actions"><a class="btn sm" href="${esc(rc.url)}" target="_blank" rel="noopener">عرض الإقرار</a></div>`;
      v?.querySelector(".vbody")?.insertAdjacentHTML("beforeend", `<div class="vconf">✓ أقرّ المستلم بالاستلام إلكترونيًا · ${esc(when(rc.confirmed_at))}</div>`);
      return;
    }
    box.className = "rcpt";
    if (!rc?.url) { box.innerHTML = `<div class="rc-head"><i class="dot"></i>إقرار المعلم بالاستلام</div><p>جارٍ تجهيز رابط التأكيد…</p>`; return; }
    box.innerHTML = `<div class="rc-head"><i class="dot"></i>بانتظار تأكيد المعلم للاستلام</div>
<p>${rc.sent_at ? `أُرسل الرابط على واتساب ${esc(when(rc.sent_at))}.` : phone ? "لم يُرسل الرابط بعد." : "لا يوجد رقم جوال للمعلم. أضفه من صفحة المعلم، أو انسخ الرابط وأرسله بنفسك."} يفتح المعلم الرابط ويؤكد الاستلام، فيصير بمثابة سند استلام موقّع منه.</p>
<div class="rc-actions">${phone ? `<button class="btn sm primary" type="button" data-rc-send>${rc.sent_at ? "إعادة الإرسال" : "إرسال على واتساب"}</button><a class="btn sm" href="${esc(waLink(phone, msgFor(t, rc.url)))}" target="_blank" rel="noopener">فتح في واتساب</a>` : ""}<button class="btn sm" type="button" data-rc-copy>نسخ الرابط</button></div>`;
    box.querySelector("[data-rc-copy]").onclick = async () => { try { await navigator.clipboard.writeText(rc.url); toast("نُسخ الرابط"); } catch (e) { prompt("انسخ الرابط:", rc.url); } };
    const s = box.querySelector("[data-rc-send]");
    if (s) s.onclick = async () => { s.disabled = true; const r = await R.link(t.id, true); s.disabled = false;
      if (r?.sent) { toast("أُرسل الرابط على واتساب المعلم"); paintBox(box, t); }
      else toast("واتساب غير مربوط بعد. استخدم «فتح في واتساب» وأرسله من جوالك."); };
  }

  /* بطاقات المعلمين: حالة الإقرار لمكافأة الشهر */
  function paintChips(){
    const m = S.teach?.month; if (!m) return;
    document.querySelectorAll("#tcList [data-edit-tc]").forEach(b => {
      const card = b.closest("article"); if (!card) return;
      card.querySelector(".rc-chip")?.remove();
      const txs = S.tx.filter(t => isReward(t) && t.teacherId === b.dataset.editTc && t.rewardMonth === m);
      if (!txs.length) return;
      const ok = txs.every(t => R.map[t.id]?.confirmed_at);
      const st = card.querySelector(".card-status"); if (!st) return;
      st.insertAdjacentHTML("beforeend", `<span class="rc-chip${ok ? " ok" : ""}">${ok ? "✓ أكّد الاستلام" : "بانتظار تأكيد الاستلام"}</span>`);
    });
  }
  const origFill = views.teachers.fill;
  views.teachers.fill = function(){ origFill.apply(this, arguments); paintChips(); if (!R.loaded) R.load(); };

  /* تحديث الحالة مع كل تحديث للبيانات */
  setInterval(() => { if (!document.hidden && S.db) R.load(); }, 30000);
  window.addEventListener("focus", () => { if (S.db) R.load(); });
})();
