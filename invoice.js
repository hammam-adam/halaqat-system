// قراءة بيانات الفاتورة من صورتها: الفواتير الضريبية في السعودية (هيئة الزكاة والضريبة والجمارك)
// تحمل رمز QR فيه اسم المورّد والرقم الضريبي والتاريخ والإجمالي والضريبة. نقرأه ونعبّئ نموذج الفاتورة في العهد.
(function(){
  const css = document.createElement("style");
  css.textContent = `.qr-note{font-size:12.5px;line-height:1.8;padding:8px 12px;border-radius:10px;background:var(--surface);border:1px solid var(--line);color:var(--muted)}
.qr-note.good{background:var(--good-bg);border-color:transparent;color:var(--good)}`;
  document.head.appendChild(css);

  /* TLV: وسم (بايت) + طول (بايت) + قيمة UTF-8 */
  function parseZatca(text){
    let bin; try { bin = atob(String(text).trim()); } catch (e) { return null; }
    const u8 = Uint8Array.from(bin, c => c.charCodeAt(0)), dec = new TextDecoder("utf-8", { fatal: false }), out = {};
    for (let i = 0; i + 2 <= u8.length;) {
      const tag = u8[i], len = u8[i + 1];
      if (i + 2 + len > u8.length) break;
      if (tag >= 1 && tag <= 5) out[tag] = dec.decode(u8.slice(i + 2, i + 2 + len));
      i += 2 + len;
      if (tag === 5) break;
    }
    const total = parseFloat(String(out[4] || "").replace(/[^0-9.]/g, ""));
    if (!out[1] || !(total > 0)) return null;
    const vat = parseFloat(String(out[5] || "").replace(/[^0-9.]/g, ""));
    const m = String(out[3] || "").match(/(\d{4})-(\d{2})-(\d{2})/);
    return { seller: out[1].trim(), vatNo: (out[2] || "").trim(), date: m ? `${m[1]}-${m[2]}-${m[3]}` : "", total, vat: vat >= 0 ? vat : null };
  }

  let jsqr = null;
  const loadJsQR = () => jsqr || (jsqr = new Promise((ok, no) => {
    if (window.jsQR) return ok(window.jsQR);
    const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
    s.onload = () => ok(window.jsQR); s.onerror = () => { jsqr = null; no(new Error("load")); }; document.head.appendChild(s);
  }));

  function loadImage(file){
    return new Promise((ok, no) => { const img = new Image(), src = URL.createObjectURL(file);
      img.onload = () => { URL.revokeObjectURL(src); ok(img); }; img.onerror = () => { URL.revokeObjectURL(src); no(new Error("img")); }; img.src = src; });
  }

  async function readQR(file){
    const img = await loadImage(file);
    if ("BarcodeDetector" in window) {
      try { const det = new BarcodeDetector({ formats: ["qr_code"] }); const r = await det.detect(img); if (r[0]?.rawValue) return r.map(x => x.rawValue); } catch (e) {}
    }
    const jsQR = await loadJsQR();
    const found = [];
    for (const max of [1400, 900, 2200]) {
      const k = Math.min(1, max / Math.max(img.width, img.height)), cv = document.createElement("canvas");
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      const g = cv.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0, cv.width, cv.height);
      const d = g.getImageData(0, 0, cv.width, cv.height);
      const r = jsQR(d.data, d.width, d.height, { inversionAttempts: "attemptBoth" });
      if (r?.data) { found.push(r.data); break; }
    }
    return found;
  }

  function note(sheet, cls, html){
    let el = sheet.querySelector(".qr-note");
    if (!el) { el = document.createElement("p"); el.className = "qr-note"; sheet.querySelector("#iPick")?.closest(".field")?.after(el); }
    el.className = "qr-note " + cls; el.innerHTML = html;
  }

  document.addEventListener("change", async e => {
    if (e.target.id !== "iFile") return;
    const f = e.target.files[0], sheet = e.target.closest("form") || document;
    if (!f || !/^image\//.test(f.type)) return;
    note(sheet, "", "جارٍ قراءة رمز الفاتورة الضريبية…");
    let codes = [];
    try { codes = await readQR(f); } catch (er) {}
    const z = codes.map(parseZatca).find(Boolean);
    if (!z) return note(sheet, "", "لم نجد رمز QR ضريبي واضح في الصورة. اكتب مبلغ الفاتورة وتاريخها بنفسك، وتبقى الصورة مرفقة كمستند.");
    const amt = sheet.querySelector("#iAmt"), date = sheet.querySelector("#iDate"), desc = sheet.querySelector("#iDesc");
    if (amt) amt.value = z.total;
    if (date && z.date) date.value = z.date;
    if (desc && !desc.value.trim()) desc.value = z.seller;
    note(sheet, "good", `✓ عبّأنا البيانات من رمز الفاتورة: <b>${esc(z.seller)}</b> · الإجمالي ${money(z.total)} شامل الضريبة${z.vat != null ? ` (منها ضريبة ${money(z.vat)})` : ""}${z.date ? ` · ${esc(gDate(z.date))}` : ""}${z.vatNo ? `<br>الرقم الضريبي للمورّد: <span dir="ltr">${esc(z.vatNo)}</span>` : ""}<br>راجع المبلغ قبل الإضافة.`);
  }, true);
})();
