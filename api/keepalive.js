// يُستدعى يوميًا من Vercel Cron حتى لا تتوقف قاعدة البيانات المجانية بسبب عدم الاستخدام.
const URL_ = "https://vtpjmvrebcheupoydclg.supabase.co/rest/v1/rpc/brand_get";
const KEY = "sb_publishable_Xglo4NXVwd7kgsfbL57-1w_DnhS-mpx";
module.exports = async function handler(req, res) {
  try {
    const r = await fetch(URL_, { method: "POST", headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" }, body: "{}" });
    res.status(200).json({ ok: r.ok, status: r.status, at: new Date().toISOString() });
  } catch (e) { res.status(200).json({ ok: false }); }
}
