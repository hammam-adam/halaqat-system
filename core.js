document.documentElement.lang = "ar";
document.documentElement.dir = "rtl";
const INCOME_CATS = ["رسوم دراسية","تبرعات","كفالات طلاب","دعم جهات ومؤسسات","أخرى"];
const EXPENSE_CATS = ["رواتب ومكافآت المعلمين","جوائز وحوافز الطلاب","مصاحف وكتب","إيجار ومرافق","أنشطة ورحلات","ضيافة","قرطاسية ومستلزمات","أخرى"];
const FEE_CAT = "رسوم دراسية";
const catsOf = (base, list) => [...new Set([...base, ...list.map(t=>t.category).filter(Boolean)])];
const REWARD_CAT = "رواتب ومكافآت المعلمين";
const DEFAULT_ORG = window.APP_CONFIG.orgName;
const METHODS = {cash:"نقدًا", transfer:"تحويل بنكي", pos:"شبكة (مدى)"};
const ROLES = {teacher:"معلم", supervisor:"مشرف", admin:"إداري"};
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const svg = d => `<svg class="i" viewBox="0 0 24 24"><path d="${d}"/></svg>`;
const ICON = {
inc: svg("M17 7 7 17M7 9v8h8"),
exp: svg("M7 17 17 7M9 7h8v8"),
plus: svg("M12 5v14M5 12h14"),
pay: svg("M5 12l4 4 10-10"),
wallet: svg("M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 13h2M3 10h18"),
clock: svg("M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"),
pct: svg("M19 5 5 19M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"),
users: svg("M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.5-3.3 3.1-5.5 6.5-5.5s6 2.2 6.5 5.5M16 4.2a3.5 3.5 0 0 1 0 6.6M18 14.6c2 .7 3.2 2.5 3.5 5.4"),
receipt: svg("M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"),
arch: svg("M5 21V11a7 7 0 0 1 14 0v10M3 21h18M9.5 21v-4.5a2.5 2.5 0 0 1 5 0V21")
};
const CAT_DOT = {"رسوم دراسية":"var(--inc)","تبرعات":"#2f8f9d","كفالات طلاب":"#5a7fb5","دعم جهات ومؤسسات":"#7a68b0","رواتب ومكافآت المعلمين":"var(--exp)","جوائز وحوافز الطلاب":"#c0a032","مصاحف وكتب":"#8a5a3a","إيجار ومرافق":"#7d8590","أنشطة ورحلات":"#c25c7a","ضيافة":"#a0784a","قرطاسية ومستلزمات":"#6b8e5a"};
const S = {
db:null, downloads:null, uid:null, canWrite:true, loaded:{h:false,s:false,t:false,tc:false},
halaqat:[], students:[], teachers:[], tx:[], settings:{}, members:[], isAdmin:false, phone:"",
view:"summary",
ledger:{type:"all", month:"", cat:"all", halaqa:"all", q:""},
fees:{month:"", halaqa:"all", status:"all"},
teach:{month:""},
reports:{mode:"month", month:"", year:""}
};
const $ = (s, r=document) => r.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2,"0");
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const thisMonth = () => todayISO().slice(0,7);
const nf = new Intl.NumberFormat("ar-SA-u-nu-latn",{minimumFractionDigits:0,maximumFractionDigits:2});
const fmt = v => { const r=Math.round((+v||0)*100)/100; return r<0 ? `\u200E-${nf.format(-r)}` : nf.format(r); };
const money = v => fmt(v) + " ر.س";
const mh = v => `<span class="num">${fmt(v)}</span><small>ر.س</small>`;
const moneyShort = v => { const a=Math.abs(v); return a>=1000 ? nf.format(Math.round(v/100)/10)+" ألف" : nf.format(Math.round(v)); };
const hijriFmt = (() => { try { return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn",{day:"numeric",month:"long",year:"numeric"}); } catch(e){ return null; } })();
const hijri = iso => { if(!hijriFmt||!iso) return ""; try { return hijriFmt.format(new Date(iso+"T12:00:00")).replace(/\s*هـ\s*$/,""); } catch(e){ return ""; } };
const wdFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn",{weekday:"long"});
const weekday = iso => { try { return wdFmt.format(new Date(iso+"T12:00:00")); } catch(e){ return ""; } };
const gDate = iso => { if(!iso) return ""; const [y,m,d]=iso.split("-"); return `${+d} ${MONTHS_AR[+m-1]} ${y}`; };
const monthLabel = ym => { if(!ym) return ""; const [y,m]=ym.split("-"); return `${MONTHS_AR[+m-1]} ${y}`; };
const monthName = ym => ym ? MONTHS_AR[+ym.slice(5)-1] : "";
const addMonths = (ym, k) => { let [y,m]=ym.split("-").map(Number); m+=k; while(m<1){m+=12;y--} while(m>12){m-=12;y++} return `${y}-${pad(m)}`; };
const vno = t => (t.type==="income"?"ق-":"ص-") + String(t.no||0).padStart(4,"0");
const halaqaName = id => S.halaqat.find(h=>h.id===id)?.name || "";
const studentById = id => S.students.find(s=>s.id===id);
const teacherById = id => S.teachers.find(t=>t.id===id);
const halTeacher = h => teacherById(h.teacherId)?.name || h.teacher || "";
const teacherHalaqat = id => S.halaqat.filter(h=>h.teacherId===id);
const live = () => S.tx.filter(t=>!t.void);
const sum = (arr, f=t=>+t.amount||0) => arr.reduce((a,t)=>a+f(t),0);
const initial = n => { const w=String(n||"").replace(/^(الشيخ|الأستاذ|أ\.|د\.)\s*/,"").replace(/^(حلقة)\s+/,"").trim(); return w ? w[0] : "؟"; };
const canW = () => S.canWrite!==false;
const rewardPaid = (id, m) => sum(live().filter(t=>t.type==="expense"&&t.category===REWARD_CAT&&t.teacherId===id&&t.rewardMonth===m));
const showPhone = p => { const d=String(p||""); return d.startsWith("966") ? "0"+d.slice(3) : "+"+d; };
const normPhone = v => { let d=String(v||"").replace(/[^0-9]/g,""); if(d.startsWith("00")) d=d.slice(2); if(d.startsWith("966")) d=d.slice(3); if(d.startsWith("0")) d=d.slice(1); return /^5[0-9]{8}$/.test(d) ? "966"+d : null; };
function toast(msg){ const el=document.createElement("div"); el.className="toast"; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),2800); }
function storeGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function storeSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
const pageHead = (title, desc, right="") => `<div class="page-head"><div class="ttl"><h2>${title}</h2>${desc?`<p>${desc}</p>`:""}</div>${right}</div>`;
const empty = (icon, title, text, actions="") => `<div class="empty"><div class="eicon">${icon}</div><strong>${title}</strong><span>${text}</span>${actions}</div>`;
const kpi = ({label, value, note="", icon, tone="var(--brand)", lead=false, extra=""}) =>
`<div class="kpi${lead?" lead":""}" style="--tone:${tone}"><div class="kpi-top"><span>${label}</span><i class="kicon">${icon}</i></div><b>${value}</b>${extra}${note?`<div class="note">${note}</div>`:""}</div>`;
const catTag = c => `<span class="cat" style="--dot:${CAT_DOT[c]||"var(--faint)"}">${esc(c)}</span>`;
const ONES=["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة"];
const TEENS=["عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر","ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"];
const TENS=["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"];
const HUNDREDS=["","مئة","مئتان","ثلاثمئة","أربعمئة","خمسمئة","ستمئة","سبعمئة","ثمانمئة","تسعمئة"];
function w100(n){ if(n<10) return ONES[n]; if(n<20) return TEENS[n-10]; const o=n%10,t=Math.floor(n/10); return o? `${ONES[o]} و${TENS[t]}` : TENS[t]; }
function w1000(n){ const h=Math.floor(n/100), r=n%100, p=[]; if(h) p.push(HUNDREDS[h]); if(r) p.push(w100(r)); return p.join(" و"); }
function scale(n, one, two, few, many){ if(n===1) return one; if(n===2) return two; if(n>=3&&n<=10) return `${w1000(n)} ${few}`; return `${w1000(n)} ${many}`; }
function words(n){
n=Math.floor(n); if(n===0) return "صفر";
const m=Math.floor(n/1e6), t=Math.floor((n%1e6)/1000), r=n%1000, p=[];
if(m) p.push(scale(m,"مليون","مليونان","ملايين","مليون"));
if(t) p.push(scale(t,"ألف","ألفان","آلاف","ألف"));
if(r) p.push(w1000(r));
return p.join(" و");
}
function tafqeet(v){
const riyals=Math.floor(v+1e-9), hal=Math.round((v-riyals)*100);
let s = `فقط ${words(riyals)} ريال`;
if(hal) s += ` و${words(hal)} هللة`;
return s + " لا غير";
}
function paintHeader(){
const org = S.settings.orgName?.trim();
$("#orgName").textContent = org || DEFAULT_ORG;
const t = todayISO();
$("#today").innerHTML = `<b>${esc(weekday(t))} ${esc(hijri(t))} هـ</b><span class="greg"> · ${esc(gDate(t))} م</span>`;
$("#topActions").hidden = !canW();
$("#sampleBanner").hidden = !(canW() && [...S.tx,...S.students,...S.halaqat,...S.teachers].some(d=>d.sample));
document.querySelectorAll(".nav button").forEach(b=>b.setAttribute("aria-selected", b.dataset.view===S.view ? "true":"false"));
$("#navUsers").hidden = !S.isAdmin;
if(S.phone) $("#mePhone").textContent = showPhone(S.phone);
if(S.db){
const m=thisMonth();
const nFees = feeRows(m,"all").filter(r=>r.fee>0&&r.paid<r.fee).length;
const nTc = rewardDue() ? S.teachers.filter(x=>x.active!==false && (+x.monthlyReward||0)>rewardPaid(x.id,m)).length : 0;
const bf=$("#bFees"), bt=$("#bTc");
bf.textContent=nFees; bf.hidden=!nFees; bf.title=`${nFees} طالب لم يكمل رسوم ${monthName(m)}`;
bt.textContent=nTc; bt.hidden=!nTc; bt.title=`${nTc} معلم لم يستلم مكافأة ${monthName(m)}`;
}
}
/* تنبيه صرف المكافآت يبدأ من يوم محدد في الشهر (الافتراضي ٢٠) */
const rewardDay = () => Math.min(28, Math.max(1, Math.round(+S.settings?.rewardRemindDay || 20)));
const rewardDue = () => new Date().getDate() >= rewardDay();
function paintRemindDay(){
const el=$("#remindDay"); if(!el) return;
const d=rewardDay();
el.innerHTML = canW()
? `تنبيهات صرف المكافآت تبدأ يوم <select id="rdSel" aria-label="يوم بدء التنبيه">${[...Array(28)].map((_,i)=>`<option${i+1===d?" selected":""}>${i+1}</option>`).join("")}</select> من كل شهر.`
: `تنبيهات صرف المكافآت تبدأ يوم ${d} من كل شهر.`;
const sel=$("#rdSel"); if(sel) sel.onchange=()=>write(()=>S.db.doc("settings/main").update({rewardRemindDay:+sel.value}), `صارت تنبيهات المكافآت تبدأ يوم ${sel.value}`);
}

/* «يحتاج انتباهك» في الرئيسية: كل وحدة تضيف مصدرًا يرجّع عناصر {key, tone, text, go} */
window.ATTN = window.ATTN || [];
const ATTN_KEY = "halaqat.attnHide";
let attnAll = false;
const attnHidden = () => { try { return JSON.parse(localStorage.getItem(ATTN_KEY) || "[]"); } catch(e){ return []; } };
function paintAttn(){
const host=$("#attn"); if(!host) return;
const hid=attnHidden();
const items=ATTN.flatMap(f=>{ try{ return f()||[]; }catch(e){ return []; } }).filter(i=>!hid.includes(i.key));
if(!items.length){ host.innerHTML=""; return; }
const shown = attnAll ? items : items.slice(0,3);
host.innerHTML = `<section class="attn"><header><h3>يحتاج انتباهك</h3><span class="sub">${items.length}</span></header>
${shown.map((x,i)=>`<div class="attn-row ${x.tone||""}"><i></i><p>${x.text}</p>${x.go?`<button class="btn sm" type="button" data-attn-go="${i}">عرض</button>`:""}<button class="btn ghost sm icon-only" type="button" data-attn-x="${esc(x.key)}" aria-label="إخفاء" title="إخفاء">✕</button></div>`).join("")}
${items.length>3?`<button class="attn-more" type="button" data-attn-more>${attnAll?"إظهار أقل":`إظهار المزيد (${items.length-3})`}</button>`:""}</section>`;
host.querySelectorAll("[data-attn-go]").forEach(b=>b.onclick=()=>shown[+b.dataset.attnGo].go());
host.querySelectorAll("[data-attn-x]").forEach(b=>b.onclick=()=>{ const l=attnHidden(); l.unshift(b.dataset.attnX); try{ localStorage.setItem(ATTN_KEY, JSON.stringify(l.slice(0,60))); }catch(e){} paintAttn(); });
const more=host.querySelector("[data-attn-more]"); if(more) more.onclick=()=>{ attnAll=!attnAll; paintAttn(); };
}
window.paintAttn = paintAttn;
ATTN.push(()=>{
const L=live(), m=thisMonth(), out=[];
const bal=sum(L.filter(t=>t.type==="income"))-sum(L.filter(t=>t.type==="expense"));
if(bal<0) out.push({key:"neg-"+m, tone:"bad", text:`الرصيد بالسالب <b>${money(bal)}</b>: المصروفات المسجّلة أكثر من المقبوضات.`, go:()=>show("ledger")});
const tcs=S.teachers.filter(x=>x.active!==false && (+x.monthlyReward||0)>rewardPaid(x.id,m));
if(rewardDue() && tcs.length) out.push({key:"rw-"+m, tone:"warn", text:`${tcs.length} ${tcs.length>2&&tcs.length<11?"معلمين":"معلم"} لم تُصرف مكافأة ${monthName(m)} بإجمالي <b>${money(sum(tcs,x=>(+x.monthlyReward||0)-rewardPaid(x.id,m)))}</b>.`, go:()=>show("teachers")});
const fees=feeRows(m,"all").filter(r=>r.fee>0&&r.paid<r.fee);
if(fees.length) out.push({key:"fee-"+m, tone:"info", text:`${fees.length} ${fees.length>2&&fees.length<11?"طلاب":"طالب"} لم يكملوا رسوم ${monthName(m)} بإجمالي <b>${money(sum(fees,r=>r.fee-r.paid))}</b>.`, go:()=>show("fees")});
return out;
});

const txSort = (a,b)=> (b.date||"").localeCompare(a.date||"") || (b.createdAt||"").localeCompare(a.createdAt||"");
function txRow(t){
const isInc = t.type==="income";
const st = t.studentId ? studentById(t.studentId)?.name : "", tc = t.teacherId ? teacherById(t.teacherId)?.name : "";
const forMonth = t.feeMonth || t.rewardMonth;
const title = t.party || st || tc || t.category;
const sub = [st && st!==title ? st : "", forMonth ? `عن ${monthLabel(forMonth)}` : "", t.note].filter(Boolean).join(" · ");
return `<tr class="click${t.void?" void":""}" data-tx="${esc(t.id)}" tabindex="0">
<td data-label="رقم السند" class="hide-m"><span class="vno">${vno(t)}</span></td>
<td class="main"><div class="who"><span class="ico ${isInc?"inc":"exp"}">${isInc?ICON.inc:ICON.exp}</span><div style="min-width:0"><div class="title">${esc(title)}</div>${sub?`<span class="sub">${esc(sub)}</span>`:`<span class="sub vno">${vno(t)}</span>`}<span class="m-meta">${esc(gDate(t.date))} · ${esc(t.catOther||t.category||"")}</span></div></div></td>
<td data-label="التاريخ" class="date num m-hide">${esc(gDate(t.date))}<small>${esc(hijri(t.date))} هـ</small></td>
<td data-label="البند" class="m-hide">${catTag(t.category)}${t.catOther?`<div class="sub">${esc(t.catOther)}</div>`:""}</td>
<td data-label="الحلقة" class="hide-m">${esc(halaqaName(t.halaqaId))||`<span class="sub">عام</span>`}</td>
<td data-label="الدفع" class="hide-m">${esc(METHODS[t.method]||"")}</td>
<td data-label="المبلغ" class="n"><span class="amount ${isInc?"inc":"exp"}">${mh(t.amount)}</span>${t.void?` <span class="chip bad">ملغى</span>`:""}</td></tr>`;
}
const txTable = rows => `<div class="tbl"><table class="dt"><thead><tr><th>رقم السند</th><th>الطرف والبيان</th><th>التاريخ</th><th>البند</th><th>الحلقة</th><th>الدفع</th><th class="n">المبلغ</th></tr></thead><tbody>${rows.map(txRow).join("")}</tbody></table></div>`;
function emptyTx(){
return empty(ICON.receipt,"لا توجد سندات بعد","ابدأ بتسجيل أول سند قبض (رسوم، تبرع، كفالة) أو سند صرف (مكافأة معلم، جوائز، مصاحف).",
canW()?`<div class="rowflex"><button class="btn primary" type="button" data-new="income">${ICON.plus}سند قبض</button><button class="btn" type="button" data-new="expense">${ICON.plus}سند صرف</button></div>`:"");
}
const views = {};
views.summary = {
shell(){ return `<div class="page">
${pageHead("لوحة التحكم", `الوضع المالي للمجمع حتى اليوم، وأرقام شهر ${monthLabel(thisMonth())}.`)}
<div class="kpis" id="kpis"></div>
<div id="attn"></div>
${canW()?`<div class="quick"><button class="quick-btn inc" type="button" data-new="income">${ICON.inc}<span><b>سند قبض</b><small>رسوم، تبرع، كفالة</small></span></button><button class="quick-btn exp" type="button" data-new="expense">${ICON.exp}<span><b>سند صرف</b><small>مكافأة، مشتريات، صيانة</small></span></button></div>`:""}
<div class="grid2">
<section class="panel"><header><h3>الإيرادات والمصروفات</h3><span class="sub">آخر ستة أشهر</span></header><div class="body"><div id="chart6"></div></div></section>
<section class="panel"><header><h3>مصروفات الشهر حسب البند</h3><span class="sub">${monthLabel(thisMonth())}</span></header><div class="body" id="expCats"></div></section>
</div>
<section class="panel"><header><h3>أحدث السندات</h3><button class="btn sm" type="button" data-go="ledger">عرض كل السندات</button></header><div id="recent"></div></section>
</div>`; },
fill(){
const L = live(), m = thisMonth();
const inc = sum(L.filter(t=>t.type==="income")), exp = sum(L.filter(t=>t.type==="expense"));
const bal = k => sum(L.filter(t=>(k==="cash")===(t.method==="cash")), t=>(t.type==="income"?1:-1)*(+t.amount||0));
const mI = L.filter(t=>t.type==="income"&&t.date?.startsWith(m)), mE = L.filter(t=>t.type==="expense"&&t.date?.startsWith(m));
const fees = feeRows(m,"all").filter(r=>r.fee>0);
const feeDue = sum(fees,r=>Math.max(0,r.fee-r.paid));
const tcDue = sum(S.teachers.filter(x=>x.active!==false), x=>Math.max(0,(+x.monthlyReward||0)-rewardPaid(x.id,m)));
$("#kpis").innerHTML =
kpi({label:"الرصيد الحالي", value:mh(inc-exp), icon:ICON.wallet, lead:true, note:"الصندوق والبنك معًا"}) +
kpi({label:`إيرادات ${monthName(m)}`, value:mh(sum(mI)), icon:ICON.inc, tone:"var(--inc)", note:`${mI.length} سند قبض`}) +
kpi({label:`مصروفات ${monthName(m)}`, value:mh(sum(mE)), icon:ICON.exp, tone:"var(--exp)", note:`${mE.length} سند صرف`}) +
kpi({label:`مستحقات ${monthName(m)} المتبقية`, value:mh(feeDue+tcDue), icon:ICON.clock, tone:"var(--warnc)", note:`رسوم لم تُحصّل ${money(feeDue)}<br>مكافآت لم تُصرف ${money(tcDue)}`});
drawChart6($("#chart6"));
const cats = catsOf(EXPENSE_CATS, mE).map(c=>({c, v:sum(mE.filter(t=>t.category===c))})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v);
const max = Math.max(1,...cats.map(x=>x.v)), tot=sum(cats,x=>x.v);
$("#expCats").innerHTML = cats.length ? `<div class="bars">${cats.map(x=>`<div class="bar-row"><div class="meta"><span>${esc(x.c)}</span><span><span class="num">${money(x.v)}</span> <span class="sub">${Math.round(x.v/tot*100)}%</span></span></div><div class="bar-track"><div class="bar-fill" style="width:${(x.v/max*100).toFixed(1)}%"></div></div></div>`).join("")}</div>`
: `<div class="empty" style="padding:24px 0"><span>لم تُسجَّل مصروفات هذا الشهر بعد.</span></div>`;
paintAttn();
const rec = [...S.tx].sort(txSort).slice(0,6);
$("#recent").innerHTML = rec.length ? txTable(rec) : emptyTx();
}
};
function drawChart6(host){
const end = thisMonth(), months = [...Array(6)].map((_,i)=>addMonths(end, i-5));
const L = live();
const data = months.map(m=>({m, inc:sum(L.filter(t=>t.type==="income"&&t.date?.startsWith(m))), exp:sum(L.filter(t=>t.type==="expense"&&t.date?.startsWith(m)))}));
const raw = Math.max(...data.map(d=>Math.max(d.inc,d.exp)));
if(raw<=0){ host.innerHTML = `<div class="empty" style="padding:24px 0"><span>سيظهر الرسم بعد تسجيل أول سند.</span></div>`; return; }
const stepRaw = raw/4, mag = Math.pow(10,Math.floor(Math.log10(stepRaw))), step = [1,2,2.5,5,10].map(k=>k*mag).find(s=>s>=stepRaw), top = step*4;
const W=640,H=250, padR=52, padL=8, padT=10, padB=30, pw=W-padR-padL, ph=H-padT-padB;
const y = v => padT + ph - v/top*ph;
const gw = pw/6, bw = Math.min(26, gw*0.3);
const gx = i => padL + pw - (i+0.5)*gw;
const bar = (cx,v) => { const h=ph-(y(v)-padT), x=cx-bw/2, yy=y(v), r=Math.min(4,h); if(h<=0) return ""; return `M${x},${padT+ph} V${yy+r} Q${x},${yy} ${x+r},${yy} H${x+bw-r} Q${x+bw},${yy} ${x+bw},${yy+r} V${padT+ph} Z`; };
let g = "";
for(let k=0;k<=4;k++){ const v=step*k, yy=y(v); g += `<line class="${k?"grid":"base"}" x1="${padL}" x2="${padL+pw}" y1="${yy}" y2="${yy}"/><text class="axis" x="${W-padR+8}" y="${yy+4}" text-anchor="start">${moneyShort(v)}</text>`; }
data.forEach((d,i)=>{ const cx=gx(i);
g += `<path d="${bar(cx+bw/2+1,d.inc)}" fill="var(--inc)"/><path d="${bar(cx-bw/2-1,d.exp)}" fill="var(--exp)"/>`;
g += `<text class="axis" x="${cx}" y="${H-8}" text-anchor="middle">${MONTHS_AR[+d.m.slice(5)-1]}</text>`;
g += `<rect class="hit" data-i="${i}" x="${cx-gw/2}" y="${padT}" width="${gw}" height="${ph}" rx="6"/>`; });
host.innerHTML = `<div class="legend"><span><i style="background:var(--inc)"></i>الإيرادات</span><span><i style="background:var(--exp)"></i>المصروفات</span></div>
<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="مقارنة الإيرادات والمصروفات لآخر ستة أشهر">${g}</svg><div class="tip" hidden></div></div>`;
const tip = host.querySelector(".tip"), svgEl = host.querySelector("svg");
svgEl.querySelectorAll(".hit").forEach(r=>{
r.addEventListener("mouseenter",()=>{ const d=data[+r.dataset.i];
tip.innerHTML = `<b>${monthLabel(d.m)}</b><div><span><i style="background:var(--inc)"></i>الإيرادات</span><span class="num">${money(d.inc)}</span></div><div><span><i style="background:var(--exp)"></i>المصروفات</span><span class="num">${money(d.exp)}</span></div><div style="border-top:1px solid var(--line);margin-top:4px;padding-top:4px"><span>الصافي</span><span class="num">${money(d.inc-d.exp)}</span></div>`;
const box=svgEl.getBoundingClientRect(), sc=box.width/W, cx=gx(+r.dataset.i)*sc;
tip.style.left = Math.min(Math.max(cx-90,0), box.width-180)+"px"; tip.style.top = (y(Math.max(d.inc,d.exp))*sc-8)+"px"; tip.style.transform="translateY(-100%)"; tip.hidden=false; });
r.addEventListener("mouseleave",()=>{ tip.hidden=true; });
});
}
views.ledger = {
shell(){ const f=S.ledger; return `<div class="page">
${pageHead("السندات والحركات المالية","كل سندات القبض والصرف. اضغط على أي سند لعرضه أو تعديله أو إلغائه.")}
<div class="filters">
<div class="seg" role="group" aria-label="نوع السند">
<button type="button" data-ltype="all" aria-pressed="${f.type==="all"}">الكل</button>
<button type="button" data-ltype="income" aria-pressed="${f.type==="income"}">قبض</button>
<button type="button" data-ltype="expense" aria-pressed="${f.type==="expense"}">صرف</button>
</div>
<input type="month" id="lMonth" value="${esc(f.month)}" aria-label="الشهر">
<select id="lCat" aria-label="البند">${catOptions(f.cat)}</select>
<select id="lHal" aria-label="الحلقة">${halOptions(f.halaqa,"كل الحلقات")}</select>
<input type="search" class="grow" id="lQ" placeholder="بحث بالاسم أو رقم السند" value="${esc(f.q)}">
<button class="btn sm ghost" type="button" id="lReset">مسح التصفية</button>
</div>
<section class="panel" id="ledgerBody"></section></div>`; },
fill(){
const f=S.ledger, q=f.q.trim();
const rows = [...S.tx].sort(txSort).filter(t=>
(f.type==="all"||t.type===f.type) && (!f.month||t.date?.startsWith(f.month)) &&
(f.cat==="all"||t.category===f.cat) && (f.halaqa==="all"||t.halaqaId===f.halaqa) &&
(!q || [vno(t),t.party,t.note,studentById(t.studentId)?.name,teacherById(t.teacherId)?.name,t.category].join(" ").includes(q)));
if(!S.tx.length){ $("#ledgerBody").innerHTML = emptyTx(); return; }
if(!rows.length){ $("#ledgerBody").innerHTML = `<div class="empty"><span>لا توجد سندات تطابق التصفية الحالية.</span></div>`; return; }
const L = rows.filter(t=>!t.void), inc=sum(L.filter(t=>t.type==="income")), exp=sum(L.filter(t=>t.type==="expense"));
$("#ledgerBody").innerHTML = `<div class="totals"><span>عدد السندات<b>${rows.length}</b></span><span>المقبوضات<b style="color:var(--inc)">${money(inc)}</b></span><span>المصروفات<b style="color:var(--exp)">${money(exp)}</b></span><span>الصافي<b>${money(inc-exp)}</b></span></div>${txTable(rows)}`;
},
bind(){
document.querySelectorAll("[data-ltype]").forEach(b=>b.onclick=()=>{ S.ledger.type=b.dataset.ltype; document.querySelectorAll("[data-ltype]").forEach(x=>x.setAttribute("aria-pressed",x===b)); views.ledger.fill(); });
$("#lMonth").oninput=e=>{S.ledger.month=e.target.value; views.ledger.fill();};
$("#lCat").onchange=e=>{S.ledger.cat=e.target.value; views.ledger.fill();};
$("#lHal").onchange=e=>{S.ledger.halaqa=e.target.value; views.ledger.fill();};
$("#lQ").oninput=e=>{S.ledger.q=e.target.value; views.ledger.fill();};
$("#lReset").onclick=()=>{ S.ledger={type:"all",month:"",cat:"all",halaqa:"all",q:""}; show("ledger"); };
}
};
function catOptions(sel){
return `<option value="all">كل البنود</option><optgroup label="إيرادات">${INCOME_CATS.map(c=>`<option value="${esc(c)}"${sel===c?" selected":""}>${esc(c)}</option>`).join("")}</optgroup><optgroup label="مصروفات">${EXPENSE_CATS.filter(c=>c!=="أخرى").map(c=>`<option value="${esc(c)}"${sel===c?" selected":""}>${esc(c)}</option>`).join("")}</optgroup>`;
}
function halOptions(sel, allLabel){
return `<option value="all">${allLabel}</option>${S.halaqat.map(h=>`<option value="${esc(h.id)}"${sel===h.id?" selected":""}>${esc(h.name)}</option>`).join("")}`;
}
function feeRows(month, halaqa){
const L = live().filter(t=>t.type==="income"&&t.category===FEE_CAT&&t.feeMonth===month);
return S.students.filter(s=>s.active!==false && (halaqa==="all"||s.halaqaId===halaqa))
.map(s=>({s, fee:+s.monthlyFee||0, paid:sum(L.filter(t=>t.studentId===s.id))}))
.sort((a,b)=>(halaqaName(a.s.halaqaId)).localeCompare(halaqaName(b.s.halaqaId),"ar") || a.s.name.localeCompare(b.s.name,"ar"));
}
function feeStatus(r){
if(r.off) return `<span class="chip mute">منقطع</span>`;
if(r.fee<=0) return `<span class="chip mute">معفى</span>`;
if(r.paid>=r.fee) return `<span class="chip good">مسدّد</span>`;
if(r.paid>0) return `<span class="chip warn">سداد جزئي</span>`;
return `<span class="chip bad">غير مسدّد</span>`;
}
views.fees = {
shell(){ const f=S.fees; return `<div class="page">
${pageHead("رسوم الطلاب","من سدّد ومن لم يسدّد في كل حلقة. اضغط على الطالب لتعديل بياناته.", canW()?`<button class="btn primary" type="button" id="addSt">${ICON.plus}طالب جديد</button>`:"")}
<div class="kpis" id="feeKpis"></div>
<div class="filters"><input type="month" id="fMonth" value="${esc(f.month)}" aria-label="الشهر">
<select id="fHal" aria-label="الحلقة">${halOptions(f.halaqa,"كل الحلقات")}</select>
<select id="fStatus" aria-label="الحالة"><option value="all">كل الحالات</option><option value="unpaid"${f.status==="unpaid"?" selected":""}>لم يكمل السداد</option><option value="paid"${f.status==="paid"?" selected":""}>مسدّد</option><option value="inactive"${f.status==="inactive"?" selected":""}>المنقطعون</option></select></div>
<section class="panel" id="feeBody"></section></div>`; },
fill(){
const f=S.fees; let rows = feeRows(f.month, f.halaqa);
const billable = rows.filter(r=>r.fee>0), expected=sum(billable,r=>r.fee), collected=sum(rows,r=>r.paid);
const outstanding = sum(billable,r=>Math.max(0,r.fee-r.paid));
$("#feeKpis").innerHTML =
kpi({label:`نسبة التحصيل · ${monthName(f.month)}`, value:`${expected?Math.round(Math.min(collected,expected)/expected*100):0}%`, icon:ICON.pct, lead:true, note:`${billable.filter(r=>r.paid>=r.fee).length} من ${billable.length} طالب سدّدوا كاملًا`}) +
kpi({label:"المستحق", value:mh(expected), icon:ICON.receipt, note:`${billable.length} طالب ملزم بالرسوم`}) +
kpi({label:"المحصّل", value:mh(collected), icon:ICON.inc, tone:"var(--inc)", note:"من سندات القبض"}) +
kpi({label:"المتبقي", value:mh(outstanding), icon:ICON.clock, tone:"var(--bad)", note:`${billable.filter(r=>r.paid<r.fee).length} طالب لم يكمل السداد`});
if(!S.students.length){ $("#feeBody").innerHTML = empty(ICON.users,"لا يوجد طلاب مسجلون","سجّل كل طالب مع حلقته ورسومه الشهرية (صفر للطالب المعفى)، وسيظهر هنا من سدّد ومن لم يسدّد.", canW()?`<button class="btn primary" type="button" data-new-st="1">${ICON.plus}إضافة طالب</button>`:""); return; }
if(f.status==="inactive") rows = S.students.filter(s=>s.active===false && (f.halaqa==="all"||s.halaqaId===f.halaqa)).map(s=>({s, fee:+s.monthlyFee||0, paid:0, off:true}));
if(f.status==="unpaid") rows = rows.filter(r=>r.fee>0&&r.paid<r.fee);
if(f.status==="paid") rows = rows.filter(r=>r.fee>0&&r.paid>=r.fee);
if(!rows.length){ $("#feeBody").innerHTML = `<div class="empty"><span>لا يوجد طلاب بهذه الحالة.</span></div>`; return; }
$("#feeBody").innerHTML = `<div class="tbl"><table class="dt"><thead><tr><th>الطالب</th><th>الحلقة</th><th class="n">الرسوم</th><th class="n">المدفوع</th><th class="n">المتبقي</th><th>الحالة</th><th></th></tr></thead><tbody>
${rows.map(r=>{ const pct = r.fee>0 ? Math.min(100, r.paid/r.fee*100) : 100;
return `<tr${canW()?` class="click" data-edit-st="${esc(r.s.id)}" tabindex="0"`:""}>
<td class="main"><div class="who"><span class="avatar">${esc(initial(r.s.name))}</span><div style="min-width:0"><div class="title">${esc(r.s.name)}</div><span class="sub">${esc([r.s.guardian, r.s.phone].filter(Boolean).join(" · "))}</span></div></div></td>
<td data-label="الحلقة">${esc(halaqaName(r.s.halaqaId))||`<span class="sub">بدون حلقة</span>`}</td>
<td data-label="الرسوم" class="n">${r.fee>0?money(r.fee):`<span class="sub">معفى</span>`}</td>
<td data-label="المدفوع" class="n">${r.off?"":money(r.paid)}</td>
<td data-label="المتبقي" class="n">${r.off||r.fee<=0?"":`<strong style="color:${r.paid<r.fee?"var(--bad)":"inherit"}">${money(Math.max(0,r.fee-r.paid))}</strong>`}</td>
<td data-label="الحالة"><div class="state">${feeStatus(r)}${!r.off&&r.fee>0?`<div class="prog${r.paid<r.fee?" warn":""}"><i style="width:${pct}%"></i></div>`:""}</div></td>
<td data-label="" class="n">${canW() && !r.off && r.fee>0 && r.paid<r.fee ? `<button class="btn sm inc" type="button" data-pay="${esc(r.s.id)}">تسجيل سداد</button>`:""}</td></tr>`; }).join("")}
</tbody></table></div>`;
},
bind(){
$("#fMonth").oninput=e=>{ if(e.target.value){S.fees.month=e.target.value; views.fees.fill();} };
$("#fHal").onchange=e=>{S.fees.halaqa=e.target.value; views.fees.fill();};
$("#fStatus").onchange=e=>{S.fees.status=e.target.value; views.fees.fill();};
const a=$("#addSt"); if(a) a.onclick=()=>openStudent();
}
};
function teacherRows(m){
return S.teachers.filter(x=>x.active!==false || rewardPaid(x.id,m)>0)
.map(x=>({x, reward:+x.monthlyReward||0, paid:rewardPaid(x.id,m)}))
.sort((a,b)=>(a.x.active===false)-(b.x.active===false) || a.x.name.localeCompare(b.x.name,"ar"));
}
function rewardStatus(r){
if(r.reward<=0) return r.paid>0 ? `<span class="chip good">صُرفت</span>` : `<span class="chip mute">متطوع</span>`;
if(r.paid>=r.reward) return `<span class="chip good">صُرفت</span>`;
if(r.paid>0) return `<span class="chip warn">صرف جزئي</span>`;
return `<span class="chip bad">لم تُصرف</span>`;
}
function halTable(){
if(!S.halaqat.length) return empty(ICON.arch,"لا توجد حلقات","أضف الحلقة واختر معلمها وموعدها، ثم سجّل طلابها من «رسوم الطلاب».");
return `<div class="tbl"><table class="dt"><thead><tr><th>الحلقة</th><th>المعلم</th><th>الموعد</th><th class="n">الطلاب</th><th class="n">الرسوم المتوقعة</th></tr></thead><tbody>
${S.halaqat.slice().sort((a,b)=>a.name.localeCompare(b.name,"ar")).map(h=>{ const st=S.students.filter(s=>s.halaqaId===h.id&&s.active!==false);
return `<tr${canW()?` class="click" data-edit-hal="${esc(h.id)}" tabindex="0"`:""}>
<td class="main"><div class="who"><span class="arch">${esc(initial(h.name))}</span><div class="title">${esc(h.name)}</div></div></td>
<td data-label="المعلم">${esc(halTeacher(h))||`<span class="sub">بدون معلم</span>`}</td>
<td data-label="الموعد">${esc(h.schedule||"—")}</td>
<td data-label="الطلاب" class="n">${st.length}</td>
<td data-label="الرسوم المتوقعة" class="n">${money(sum(st,s=>+s.monthlyFee||0))}</td></tr>`; }).join("")}
</tbody></table></div>`;
}
views.teachers = {
shell(){ return `<div class="page">
${pageHead("مكافآت المعلمين والمشرفين","المكافأة الشهرية لكل معلم ومشرف وحالة صرفها. الصرف يُسجَّل سند صرف تحت بند «رواتب ومكافآت المعلمين».",
`<div class="rowflex"><input type="month" id="tMonth" value="${esc(S.teach.month)}" aria-label="الشهر" style="width:auto">${canW()?`<button class="btn primary icon-only" type="button" id="addTc" title="إضافة معلم أو مشرف" aria-label="إضافة معلم أو مشرف">${ICON.plus}</button>`:""}</div>`)}
<div class="kpis" id="tcKpis"></div>
<div id="bulkBar"></div>
<div class="cards" id="tcList"></div>
<div class="sec-head"><h3>الحلقات</h3>${canW()?`<button class="btn" type="button" id="addHal">${ICON.plus}حلقة جديدة</button>`:""}</div>
<section class="panel" id="halList"></section>
<p class="remind-day" id="remindDay"></p></div>`; },
fill(){
$("#halList").innerHTML = halTable(); paintRemindDay();
const m=S.teach.month, rows=teacherRows(m);
const due=sum(rows,r=>r.reward), paid=sum(rows,r=>r.paid), rest=sum(rows,r=>Math.max(0,r.reward-r.paid));
const active=S.teachers.filter(x=>x.active!==false), noHal=active.filter(x=>!teacherHalaqat(x.id).length).length;
$("#tcKpis").innerHTML =
kpi({label:`مكافآت ${monthLabel(m)}`, value:mh(due), icon:ICON.wallet, lead:true, note:"إجمالي المكافآت الشهرية المعتمدة"}) +
kpi({label:"المصروف", value:mh(paid), icon:ICON.exp, tone:"var(--exp)", note:`${rows.filter(r=>r.reward>0&&r.paid>=r.reward).length} معلم استلم كامل مكافأته`}) +
kpi({label:"المتبقي للصرف", value:mh(rest), icon:ICON.clock, tone:"var(--bad)", note:`${rows.filter(r=>r.reward>0&&r.paid<r.reward).length} معلم لم يستلم بعد`}) +
kpi({label:"المعلمون", value:`<span class="num">${active.length}</span>`, icon:ICON.users, tone:"var(--info)", note:noHal?`${noHal} بدون حلقة`:"كلهم مسندة لهم حلقات"});
const unpaid = rows.filter(r=>r.x.active!==false && r.reward>r.paid);
$("#bulkBar").innerHTML = canW() && unpaid.length>1 ? `<div class="banner"><p>${unpaid.length} معلمين لم تُصرف مكافآتهم عن ${monthLabel(m)} بإجمالي <strong>${money(rest)}</strong>. يمكنك صرفها دفعة واحدة، ويُسجَّل لكل معلم سند صرف مستقل.</p><button class="btn primary" type="button" id="bulkPay">صرف المتبقي للجميع</button></div>` : "";
if(!S.teachers.length){ $("#tcList").innerHTML = `<div style="grid-column:1/-1" class="panel">${empty(ICON.users,"لا يوجد معلمون","أضف المعلمين مع المكافأة الشهرية لكل معلم، ثم أضف الحلقات أسفل الصفحة واختر لكل حلقة معلمها.", canW()?`<button class="btn primary" type="button" id="addTc2">${ICON.plus}إضافة معلم</button>`:"")}</div>`; const b=$("#addTc2"); if(b) b.onclick=()=>openTeacher(); return; }
$("#tcList").innerHTML = rows.map(r=>{ const x=r.x, hs=teacherHalaqat(x.id), pct=r.reward>0?Math.min(100,r.paid/r.reward*100):100;
return `<article class="card${x.active===false?" off":""}">
<div class="card-top"><div class="avatar lg">${esc(initial(x.name))}</div><div style="min-width:0;flex:1"><h4>${esc(x.name)}</h4><div class="sub">${esc(ROLES[x.role]||"معلم")} · ${hs.length?hs.map(h=>esc(h.name)).join("، "):"بدون حلقة"}</div></div>${x.active===false?`<span class="chip mute">موقوف</span>`:""}</div>
<div class="mini3"><div><span>المكافأة</span><b>${r.reward>0?fmt(r.reward):"متطوع"}</b></div><div><span>المصروف</span><b>${fmt(r.paid)}</b></div><div><span>المتبقي</span><b style="color:${r.reward>r.paid?"var(--bad)":"inherit"}">${fmt(Math.max(0,r.reward-r.paid))}</b></div></div>
<div class="card-status"><div class="row"><span class="sub">${esc(monthLabel(m))}</span>${rewardStatus(r)}</div>${r.reward>0?`<div class="prog${r.paid<r.reward?" warn":""}"><i style="width:${pct}%"></i></div>`:""}</div>
<div class="card-foot"><button class="btn sm" type="button" data-edit-tc="${esc(x.id)}">التفاصيل والسجل</button>${canW() && r.reward>r.paid ? `<button class="btn sm primary" type="button" data-reward="${esc(x.id)}">${ICON.pay}صرف المكافأة</button>`:""}</div>
</article>`; }).join("");
},
bind(){
$("#tMonth").oninput=e=>{ if(e.target.value){S.teach.month=e.target.value; views.teachers.fill();} };
const a=$("#addTc"); if(a) a.onclick=()=>openTeacher();
const ah=$("#addHal"); if(ah) ah.onclick=()=>openHalaqa();
$("#bulkBar").addEventListener("click", async e=>{
const b=e.target.closest("#bulkPay"); if(!b) return;
const m=S.teach.month, list=teacherRows(m).filter(r=>r.x.active!==false && r.reward>r.paid);
if(!b.classList.contains("armed")){ b.classList.add("armed","danger"); b.textContent=`تأكيد صرف ${money(sum(list,r=>r.reward-r.paid))} لـ ${list.length} معلمين`; return; }
b.disabled=true;
let no = Math.max(0,...S.tx.filter(x=>x.type==="expense").map(x=>+x.no||0)), done=0;
for(const r of list){ no++;
const hs=teacherHalaqat(r.x.id);
const body={type:"expense", no, amount:Math.round((r.reward-r.paid)*100)/100, date:todayISO(), category:REWARD_CAT, method:r.x.iban?"transfer":"cash",
halaqaId: hs.length===1 ? hs[0].id : "", studentId:"", teacherId:r.x.id, rewardMonth:m, feeMonth:"",
party:r.x.name, note:`مكافأة شهر ${monthLabel(m)}`, void:false, createdAt:new Date().toISOString(), createdBy:S.uid||""};
const ok = await write(()=>S.db.collection("transactions").add(body)); if(!ok) break; done++; }
toast(done===list.length ? `صُرفت مكافآت ${done} معلمين عن ${monthLabel(m)}` : `صُرفت ${done} من ${list.length}. أعد المحاولة للبقية.`);
});
}
};
function periodTx(){ const r=S.reports, key = r.mode==="month" ? r.month : r.year; return live().filter(t=>t.date?.startsWith(key)); }
views.reports = {
shell(){ const r=S.reports; const years=[...new Set([thisMonth().slice(0,4),...S.tx.map(t=>t.date?.slice(0,4)).filter(Boolean)])].sort().reverse();
return `<div class="page">
${pageHead("التقارير المالية","قائمة الإيرادات والمصروفات، وحركة كل حلقة، ومكافآت المعلمين لفترة تختارها.",
`<div class="toolbar">
<div class="seg" role="group" aria-label="الفترة"><button type="button" data-rmode="month" aria-pressed="${r.mode==="month"}">شهري</button><button type="button" data-rmode="year" aria-pressed="${r.mode==="year"}">سنوي</button></div>
<input type="month" id="rMonth" value="${esc(r.month)}" ${r.mode!=="month"?"hidden":""} aria-label="الشهر">
<select id="rYear" ${r.mode!=="year"?"hidden":""} aria-label="السنة">${years.map(y=>`<option${y===r.year?" selected":""}>${y}</option>`).join("")}</select>
<button class="btn" type="button" id="btnCsv" hidden>تصدير السندات (CSV)</button></div>`)}
<div class="kpis" id="rKpis"></div>
<section class="panel"><header><h3>قائمة الإيرادات والمصروفات</h3><span class="sub" id="plLabel"></span></header><div id="plBody"></div></section>
<div class="grid2">
<section class="panel"><header><h3>حسب الحلقة</h3></header><div id="halBody"></div></section>
<section class="panel"><header><h3>مكافآت المعلمين</h3></header><div id="tcBody"></div></section>
</div></div>`; },
fill(){
const T = periodTx(), label = S.reports.mode==="month" ? monthLabel(S.reports.month) : `سنة ${S.reports.year}`;
$("#plLabel").textContent = `${label} · ${T.length} سند (الملغاة غير محتسبة)`;
const incRows = catsOf(INCOME_CATS, T.filter(t=>t.type==="income")).map(c=>({c,v:sum(T.filter(t=>t.type==="income"&&t.category===c))})).filter(x=>x.v);
const expRows = catsOf(EXPENSE_CATS, T.filter(t=>t.type==="expense")).map(c=>({c,v:sum(T.filter(t=>t.type==="expense"&&t.category===c))})).filter(x=>x.v);
const ti=sum(incRows,x=>x.v), te=sum(expRows,x=>x.v);
$("#rKpis").innerHTML =
kpi({label:ti-te>=0?"الفائض":"العجز", value:mh(Math.abs(ti-te)), icon:ICON.wallet, lead:true, note:label}) +
kpi({label:"إجمالي الإيرادات", value:mh(ti), icon:ICON.inc, tone:"var(--inc)", note:`${T.filter(t=>t.type==="income").length} سند قبض`}) +
kpi({label:"إجمالي المصروفات", value:mh(te), icon:ICON.exp, tone:"var(--exp)", note:`${T.filter(t=>t.type==="expense").length} سند صرف`}) +
kpi({label:"نسبة المصروفات للإيرادات", value:`${ti?Math.round(te/ti*100):0}%`, icon:ICON.pct, tone:"var(--info)", note:"كلما قلّت كان أفضل"});
const block = (title, rows, tot, color) => `<tr class="sec"><td colspan="3">${title}</td></tr>
${rows.length?rows.map(x=>`<tr><td style="padding-inline-start:32px">${catTag(x.c)}</td><td class="n">${money(x.v)}</td><td class="n sub">${tot?Math.round(x.v/tot*100):0}%</td></tr>`).join(""):`<tr><td colspan="3" class="sub" style="padding-inline-start:32px">لا يوجد</td></tr>`}
<tr class="tot"><td>إجمالي ${title}</td><td class="n" style="color:${color}">${money(tot)}</td><td></td></tr>`;
$("#plBody").innerHTML = `<div class="tbl"><table><thead><tr><th>البند</th><th class="n">المبلغ</th><th class="n">النسبة</th></tr></thead><tbody>
${block("الإيرادات",incRows,ti,"var(--inc)")}${block("المصروفات",expRows,te,"var(--exp)")}</tbody>
<tfoot><tr><td>${ti-te>=0?"الفائض":"العجز"}</td><td class="n">${money(Math.abs(ti-te))}</td><td></td></tr></tfoot></table></div>`;
const groups = [...S.halaqat.map(h=>({id:h.id,name:h.name})),{id:"",name:"عام (غير مرتبط بحلقة)"}].map(g=>{
const G=T.filter(t=>(t.halaqaId||"")===g.id); return {...g, inc:sum(G.filter(t=>t.type==="income")), exp:sum(G.filter(t=>t.type==="expense")), n:G.length}; }).filter(g=>g.n);
$("#halBody").innerHTML = groups.length ? `<div class="tbl"><table><thead><tr><th>الحلقة</th><th class="n">الإيرادات</th><th class="n">المصروفات</th><th class="n">الصافي</th></tr></thead><tbody>
${groups.map(g=>`<tr><td>${esc(g.name)}</td><td class="n" style="color:var(--inc)">${money(g.inc)}</td><td class="n" style="color:var(--exp)">${money(g.exp)}</td><td class="n">${money(g.inc-g.exp)}</td></tr>`).join("")}</tbody></table></div>`
: `<div class="empty"><span>لا توجد سندات في هذه الفترة.</span></div>`;
const tcRows = [...S.teachers.map(x=>({id:x.id,name:x.name})),{id:"",name:"مكافآت جماعية (بدون معلم محدد)"}].map(x=>{
const G=T.filter(t=>t.type==="expense"&&t.category===REWARD_CAT&&(t.teacherId||"")===x.id); return {...x, v:sum(G), n:G.length}; }).filter(x=>x.n);
$("#tcBody").innerHTML = tcRows.length ? `<div class="tbl"><table><thead><tr><th>المعلم</th><th class="n">السندات</th><th class="n">المصروف</th></tr></thead><tbody>
${tcRows.map(x=>`<tr><td>${esc(x.name)}</td><td class="n">${x.n}</td><td class="n">${money(x.v)}</td></tr>`).join("")}</tbody>
<tfoot><tr><td>الإجمالي</td><td class="n">${sum(tcRows,x=>x.n)}</td><td class="n">${money(sum(tcRows,x=>x.v))}</td></tr></tfoot></table></div>`
: `<div class="empty"><span>لم تُصرف مكافآت في هذه الفترة.</span></div>`;
$("#btnCsv").hidden = !T.length;
},
bind(){
document.querySelectorAll("[data-rmode]").forEach(b=>b.onclick=()=>{ S.reports.mode=b.dataset.rmode; show("reports"); });
$("#rMonth").oninput=e=>{ if(e.target.value){S.reports.month=e.target.value; views.reports.fill();} };
$("#rYear").onchange=e=>{S.reports.year=e.target.value; views.reports.fill();};
$("#btnCsv").onclick=exportCsv;
}
};
function exportCsv(){
const T = periodTx().sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.no||0)-(b.no||0));
const q = v => `"${String(v??"").replace(/"/g,'""')}"`;
const head = ["رقم السند","النوع","التاريخ","التاريخ الهجري","البند","المبلغ","طريقة الدفع","الطرف","الطالب","المعلم","الحلقة","عن شهر","ملاحظات"];
const lines = [head.map(q).join(",")].concat(T.map(t=>[vno(t),t.type==="income"?"قبض":"صرف",t.date,hijri(t.date),t.category+(t.catOther?": "+t.catOther:""),t.amount,METHODS[t.method]||"",t.party,studentById(t.studentId)?.name||"",teacherById(t.teacherId)?.name||"",halaqaName(t.halaqaId),t.feeMonth||t.rewardMonth||"",t.note].map(q).join(",")));
const key = S.reports.mode==="month"?S.reports.month:S.reports.year;
const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob(["﻿"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"})); a.download=`سندات-${key}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
views.users = {
shell(){ return `<div class="page">
${pageHead("المستخدمون","الأرقام المسموح لها بالدخول إلى النظام. كل مستخدم يدخل برمز يصله على واتساب رقمه.", `<button class="btn primary" type="button" id="addMember">${ICON.plus}مستخدم جديد</button>`)}
<section class="panel" id="memberList"></section></div>`; },
fill(){
const me = S.phone;
$("#memberList").innerHTML = !S.members.length ? empty(ICON.users,"لا يوجد مستخدمون","أضف أرقام المحاسب والمشرفين.") :
`<div class="tbl"><table class="dt"><thead><tr><th>الاسم</th><th>الجوال</th><th>الصلاحية</th><th></th></tr></thead><tbody>
${S.members.slice().sort((a,b)=>(a.role==="admin"?0:1)-(b.role==="admin"?0:1)||a.name.localeCompare(b.name,"ar")).map(m=>`<tr>
<td class="main"><div class="who"><span class="avatar">${esc(initial(m.name||"؟"))}</span><div class="title">${esc(m.name||"بدون اسم")}${m.phone===me?` <span class="tag">أنت</span>`:""}</div></div></td>
<td data-label="الجوال" class="num" dir="ltr" style="text-align:right">${esc(showPhone(m.phone))}</td>
<td data-label="الصلاحية">${m.role==="admin"?`<span class="chip good">مدير النظام</span>`:`<span class="chip mute">مستخدم</span>`}</td>
<td data-label="" class="n">${m.phone===me?"":`<button class="btn sm danger" type="button" data-del-member="${esc(m.phone)}">إزالة</button>`}</td></tr>`).join("")}
</tbody></table></div>`;
},
bind(){
$("#addMember").onclick=()=>openMember();
$("#memberList").addEventListener("click", async e=>{
const b=e.target.closest("[data-del-member]"); if(!b) return;
if(!b.classList.contains("armed")){ b.classList.add("armed","danger"); b.classList.remove("icon-only","ghost"); b.textContent="تأكيد الإزالة"; return; }
b.disabled=true;
const {error}=await SB.from("members").delete().eq("phone",b.dataset.delMember);
if(error){ toast("تعذّرت الإزالة. أعد المحاولة."); b.disabled=false; } else { toast("أُزيل المستخدم"); loadMembers(); }
});
}
};
function show(v){
if(!views[v] || (v==="users" && !S.isAdmin)) v="summary";
S.view=v; storeSet("halaqat.view",v);
if(!S.db){ paintHeader(); return; }
$("#view").innerHTML = views[v].shell();
views[v].bind?.(); views[v].fill(); paintHeader();
}
function refresh(){ if(!S.db || !(S.loaded.h&&S.loaded.s&&S.loaded.t&&S.loaded.tc)) return; views[S.view].fill(); paintHeader(); }
document.querySelectorAll(".nav button").forEach(b=>b.onclick=()=>{ show(b.dataset.view); window.scrollTo({top:0}); });
function openModal(html, onReady){
const root=$("#modalRoot");
root.innerHTML = `<div class="scrim"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
const scrim=root.firstElementChild;
scrim.addEventListener("mousedown",e=>{ if(e.target===scrim) closeModal(); });
root.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeModal);
onReady?.(root.querySelector(".sheet"));
root.querySelector("input:not([type=hidden]),select,textarea,button")?.focus();
}
function closeModal(){ $("#modalRoot").innerHTML=""; }
const closeBtn = `<button class="btn ghost sm" type="button" data-close aria-label="إغلاق">✕</button>`;
document.addEventListener("keydown",e=>{ if(e.key==="Escape" && $("#modalRoot").innerHTML) closeModal(); });
async function write(fn, okMsg){
try { await fn(); if(okMsg) toast(okMsg); return true; }
catch(e){
if(e?.code==="invalid_argument"){ S.canWrite=false; paintHeader(); toast("ليست لديك صلاحية التعديل على هذه البيانات."); }
else toast("تعذّر الحفظ. تحقق من الاتصال وأعد المحاولة.");
return false;
}
}
function openTx(type, preset={}, editing=null){
const t = editing || {type, date:todayISO(), method:"cash", ...preset};
const isInc = t.type==="income";
const cats = [...new Set([...(isInc ? INCOME_CATS : EXPENSE_CATS), ...(t.category ? [t.category] : [])])];
const nextNo = editing ? editing.no : 1 + Math.max(0,...S.tx.filter(x=>x.type===t.type).map(x=>+x.no||0));
openModal(`<form id="txForm" novalidate><header><span class="ico ${isInc?"inc":"exp"}">${isInc?ICON.inc:ICON.exp}</span><h3>${editing?"تعديل ":""}${isInc?"سند قبض":"سند صرف"} <span class="vno">${vno({type:t.type,no:nextNo})}</span></h3>${closeBtn}</header>
<div class="content"><div class="form-grid">
<div class="field"><label for="txAmount">المبلغ (ر.س)</label><input type="number" id="txAmount" min="0.01" step="0.01" inputmode="decimal" value="${t.amount??""}" required></div>
<div class="field"><label for="txCat">البند</label><select id="txCat">${cats.map(c=>`<option${c===t.category?" selected":""}>${esc(c)}</option>`).join("")}</select></div>
<div class="field" id="catOtherW"><label for="txCatOther">حدّد النوع</label><input type="text" id="txCatOther" value="${esc(t.catOther||"")}" placeholder="${isInc?"مثال: تبرع عيني":"مثال: صيانة مكيفات"}"></div>
<div class="field wide" id="partyWrap"><label for="txParty">${isInc?"استلمنا من":"صرفنا إلى"}</label><input type="text" id="txParty" value="${esc(t.party||"")}" placeholder="${isInc?"اسم الدافع أو ولي الأمر":"اسم المستلم أو الجهة"}"></div>
${isInc?"":`<div class="field" id="tcWrap"><label for="txTeacher">المعلم</label><select id="txTeacher"><option value="">— اختر المعلم —</option>${S.teachers.filter(x=>x.active!==false||x.id===t.teacherId).map(x=>`<option value="${esc(x.id)}"${x.id===t.teacherId?" selected":""}>${esc(x.name)}</option>`).join("")}</select></div>
<div class="field" id="rmWrap"><label for="txRewardMonth">المكافأة عن شهر</label><input type="month" id="txRewardMonth" value="${esc(t.rewardMonth||thisMonth())}"></div>`}
${isInc?`<div class="field" id="stWrap"><label for="txStudent">الطالب <span class="sub">(اختياري)</span></label><select id="txStudent"></select></div>
<div class="field" id="feeMonthWrap"><label for="txFeeMonth">الرسوم عن شهر</label><input type="month" id="txFeeMonth" value="${esc(t.feeMonth||thisMonth())}"></div>`:""}
</div>
<details class="more-fields"${editing&&(t.halaqaId||t.studentId||t.note||t.method!=="cash")?" open":""}><summary>تفاصيل إضافية <span class="sub">التاريخ، طريقة الدفع، الحلقة، البيان</span></summary><div class="form-grid">
<div class="field"><label for="txDate">التاريخ</label><input type="date" id="txDate" value="${esc(t.date)}" required><span class="sub" id="txHijri">${hijri(t.date)} هـ</span></div>
<div class="field"><label for="txMethod">طريقة الدفع</label><select id="txMethod">${Object.entries(METHODS).map(([k,v])=>`<option value="${k}"${k===t.method?" selected":""}>${v}</option>`).join("")}</select></div>
<div class="field"><label for="txHal">الحلقة <span class="sub">(اختياري)</span></label><select id="txHal"><option value="">— غير مرتبط —</option>${S.halaqat.map(h=>`<option value="${esc(h.id)}"${h.id===t.halaqaId?" selected":""}>${esc(h.name)}</option>`).join("")}</select></div>
<div class="field wide"><label for="txNote">البيان / ملاحظات</label><textarea id="txNote" rows="2">${esc(t.note||"")}</textarea></div>
</div></details><p class="err" id="txErr" hidden></p></div>
<footer><button class="btn ${isInc?"inc":"primary"}" type="submit">${editing?"حفظ التعديل":"حفظ السند"}</button><button class="btn" type="button" data-close>إلغاء</button></footer></form>`, sheet=>{
const cat=$("#txCat",sheet), hal=$("#txHal",sheet), stSel=$("#txStudent",sheet), fmw=$("#feeMonthWrap",sheet);
const tcSel=$("#txTeacher",sheet), tcw=$("#tcWrap",sheet), rmw=$("#rmWrap",sheet), party=$("#txParty",sheet), amt=$("#txAmount",sheet);
const syncStudents = () => { if(!stSel) return; const cur = stSel.value || t.studentId || "";
const list = S.students.filter(s=>(s.active!==false||s.id===cur) && (!hal.value||s.halaqaId===hal.value));
stSel.innerHTML = `<option value="">— بدون طالب —</option>` + list.map(s=>`<option value="${esc(s.id)}"${s.id===cur?" selected":""}>${esc(s.name)}</option>`).join(""); };
const syncCat = () => { $("#catOtherW",sheet).hidden = cat.value!=="أخرى"; if(fmw) fmw.hidden = $("#stWrap",sheet).hidden = cat.value!==FEE_CAT; if(tcw){ tcw.hidden = rmw.hidden = cat.value!==REWARD_CAT; } };
const suggestSt = () => { if(!stSel || editing) return; const s=studentById(stSel.value); if(!s) return;
if(!party.value) party.value = s.guardian || s.name;
if(s.halaqaId && !hal.value) hal.value=s.halaqaId;
if(cat.value===FEE_CAT){ const m=$("#txFeeMonth",sheet).value; const paid=sum(live().filter(x=>x.studentId===s.id&&x.category===FEE_CAT&&x.feeMonth===m)); const rest=Math.max(0,(+s.monthlyFee||0)-paid); if(rest && !amt.value) amt.value=rest; } };
let lastTcName = teacherById(t.teacherId)?.name || "";
const suggestTc = () => { const x=teacherById(tcSel?.value); if(!x) return;
if(!party.value || party.value===lastTcName) party.value=x.name; lastTcName=x.name;
if(editing) return;
const rest=Math.max(0,(+x.monthlyReward||0)-rewardPaid(x.id,$("#txRewardMonth",sheet).value)); if(rest && !amt.value) amt.value=rest;
if(x.iban && $("#txMethod",sheet).value==="cash") $("#txMethod",sheet).value="transfer";
const hs=teacherHalaqat(x.id); if(hs.length===1 && !hal.value) hal.value=hs[0].id; };
syncStudents(); syncCat();
hal.onchange=syncStudents; cat.onchange=()=>{syncCat(); suggestSt();};
if(stSel) stSel.onchange=suggestSt;
if(tcSel) tcSel.onchange=suggestTc;
$("#txDate",sheet).oninput=e=>{$("#txHijri",sheet).textContent = e.target.value ? hijri(e.target.value)+" هـ" : "";};
if(preset.studentId) suggestSt();
if(preset.teacherId) suggestTc();
$("#txForm",sheet).onsubmit=async e=>{ e.preventDefault();
const amount = Math.round(parseFloat(amt.value)*100)/100, date=$("#txDate",sheet).value, err=$("#txErr",sheet);
const fail = (msg, el) => { err.textContent=msg; err.hidden=false; el?.focus(); };
if(!(amount>0)) return fail("أدخل مبلغًا أكبر من صفر.", amt);
if(!date) return fail("اختر تاريخ السند.");
const catOther = cat.value==="أخرى" ? $("#txCatOther",sheet).value.trim() : "";
if(cat.value==="أخرى" && !catOther) return fail("البند «أخرى»: اكتب نوعه في خانة «حدّد النوع».", $("#txCatOther",sheet));
const studentId = stSel?.value || "";
if(isInc && cat.value===FEE_CAT && !studentId) return fail("سند الرسوم الدراسية يحتاج اختيار الطالب، حتى تظهر حالة سداده في صفحة الرسوم.", stSel);
const isReward = !isInc && cat.value===REWARD_CAT, teacherId = isReward ? (tcSel?.value||"") : "";
if(isReward && !teacherId && !(editing && !editing.teacherId)) return fail("اختر المعلم حتى تظهر المكافأة في صفحة المعلمين.", tcSel);
const body = { type:t.type, no:nextNo, amount, date, category:cat.value, catOther, method:$("#txMethod",sheet).value,
halaqaId:hal.value || studentById(studentId)?.halaqaId || "", studentId, teacherId,
rewardMonth: isReward && teacherId ? $("#txRewardMonth",sheet).value : "",
feeMonth: isInc&&cat.value===FEE_CAT ? $("#txFeeMonth",sheet).value : "",
party:party.value.trim(), note:$("#txNote",sheet).value.trim() };
const btn=e.submitter; if(btn) btn.disabled=true;
const ok = editing
? await write(()=>S.db.doc("transactions/"+editing.id).update({...body, updatedAt:new Date().toISOString(), updatedBy:S.uid||""}), "تم حفظ التعديل")
: await write(()=>S.db.collection("transactions").add({...body, void:false, createdAt:new Date().toISOString(), createdBy:S.uid||""}), `تم حفظ ${isInc?"سند القبض":"سند الصرف"} ${vno(body)}`);
if(btn) btn.disabled=false;
if(ok) closeModal();
};
});
}
function openVoucher(id){
const t = S.tx.find(x=>x.id===id); if(!t) return;
const isInc=t.type==="income", st=studentById(t.studentId), tc=teacherById(t.teacherId), forMonth=t.feeMonth||t.rewardMonth;
openModal(`<header><h3>${isInc?"سند قبض":"سند صرف"} <span class="vno">${vno(t)}</span></h3>${closeBtn}</header>
<div class="content"><div class="voucher">
<div class="vorg"><div class="mark" aria-hidden="true"></div><div><div class="vorg-name">${esc(S.settings.orgName||DEFAULT_ORG)}</div><div class="sub">${esc([window.APP_CONFIG.tagline, window.APP_CONFIG.est].filter(Boolean).join(" · "))}</div></div></div>
<div class="vbody">
<div class="vhead"><p class="vtitle ${isInc?"inc":"exp"}">${isInc?"سند قبض":"سند صرف"}</p>
<div style="text-align:left"><div class="vno" style="font-size:16px">${vno(t)}</div><div class="sub">${esc(hijri(t.date))} هـ</div><div class="sub">${esc(gDate(t.date))} م</div></div></div>
<dl>
<dt>${isInc?"استلمنا من":"صرفنا إلى"}</dt><dd>${esc(t.party)||"—"}</dd>
<dt>المبلغ</dt><dd class="big">${money(t.amount)}</dd>
<dt>كتابةً</dt><dd class="words">${esc(tafqeet(+t.amount||0))}</dd>
<dt>وذلك عن</dt><dd>${esc(t.category)}${t.catOther?`: ${esc(t.catOther)}`:""}${forMonth?` · شهر ${monthLabel(forMonth)}`:""}${st?` · الطالب ${esc(st.name)}`:""}${tc?` · المعلم ${esc(tc.name)}`:""}</dd>
${t.halaqaId?`<dt>الحلقة</dt><dd>${esc(halaqaName(t.halaqaId))}</dd>`:""}
<dt>طريقة الدفع</dt><dd>${esc(METHODS[t.method]||"")}</dd>
${t.note?`<dt>ملاحظات</dt><dd>${esc(t.note)}</dd>`:""}
</dl></div>
${t.void?`<div class="stamp">ملغى</div>`:""}
</div>${t.void&&t.voidReason?`<p class="sub" style="margin:0">سبب الإلغاء: ${esc(t.voidReason)}</p>`:""}</div>
<footer>${canW()&&!t.void&&(S.role!=="accountant"||t.createdBy===S.uid)?`<button class="btn" type="button" id="vEdit">تعديل</button><span class="spacer"></span><input type="text" id="vReason" placeholder="سبب الإلغاء (اختياري)" style="width:auto;flex:0 1 200px"><button class="btn danger" type="button" id="vVoid">إلغاء السند</button>`:`${canW()&&!t.void?`<span class="sub" style="margin-inline-end:auto">سجّل هذا السند مستخدم آخر، فلا تعدّله أو تلغيه إلا هو أو مدير النظام.</span>`:""}<button class="btn" type="button" data-close>إغلاق</button>`}</footer>`, sheet=>{
const ed=$("#vEdit",sheet); if(ed) ed.onclick=()=>openTx(t.type,{},t);
const vv=$("#vVoid",sheet); if(vv) vv.onclick=async()=>{
if(!vv.classList.contains("armed")){ vv.classList.add("armed"); vv.textContent="تأكيد الإلغاء"; return; }
vv.disabled=true;
const ok = await write(()=>S.db.doc("transactions/"+t.id).update({void:true, voidReason:$("#vReason",sheet).value.trim(), voidedAt:new Date().toISOString(), voidedBy:S.uid||""}), `أُلغي السند ${vno(t)}`);
if(ok) closeModal(); else vv.disabled=false;
};
});
}
function openTeacher(id){
const x = S.teachers.find(t=>t.id===id) || {active:true, role:"teacher", monthlyReward:""};
const hist = id ? S.tx.filter(t=>t.teacherId===id).sort(txSort).slice(0,12) : [];
const hs = id ? teacherHalaqat(id) : [];
const ro = !canW();
openModal(`<form id="tForm" novalidate><header>${id?`<span class="avatar">${esc(initial(x.name))}</span>`:""}<h3>${id?esc(x.name):"معلم جديد"}</h3>${closeBtn}</header>
<div class="content"><div class="form-grid">
<div class="field wide"><label for="tName">الاسم</label><input type="text" id="tName" value="${esc(x.name||"")}" placeholder="مثال: الشيخ عبدالرحمن السالم" required ${ro?"disabled":""}></div>
<div class="field"><label for="tRole">الصفة</label><select id="tRole" ${ro?"disabled":""}>${Object.entries(ROLES).map(([k,v])=>`<option value="${k}"${k===x.role?" selected":""}>${v}</option>`).join("")}</select></div>
<div class="field"><label for="tReward">المكافأة الشهرية (ر.س)</label><input type="number" id="tReward" min="0" step="0.01" inputmode="decimal" value="${esc(x.monthlyReward)}" placeholder="0 للمتطوع" ${ro?"disabled":""}></div>
<div class="field"><label for="tPhone">الجوال</label><input type="tel" id="tPhone" dir="ltr" style="text-align:right" value="${esc(x.phone||"")}" placeholder="05xxxxxxxx" ${ro?"disabled":""}></div>
<div class="field"><label for="tIban">الآيبان <span class="sub">(للتحويل)</span></label><input type="text" id="tIban" dir="ltr" style="text-align:right" value="${esc(x.iban||"")}" placeholder="SA00 0000 0000 0000 0000 0000" ${ro?"disabled":""}></div>
<div class="field wide"><label for="tNotes">ملاحظات</label><textarea id="tNotes" rows="2" ${ro?"disabled":""}>${esc(x.notes||"")}</textarea></div>
<label class="check wide"><input type="checkbox" id="tActive" ${x.active!==false?"checked":""} ${ro?"disabled":""}> على رأس العمل (تُحسب له مكافأة شهرية)</label>
</div>
${id?`<div class="field"><span class="lbl">الحلقات المسندة</span><div>${hs.length?hs.map(h=>`<span class="tag" style="margin-inline-end:6px">${esc(h.name)}</span>`).join(""):`<span class="sub">لا توجد. اختره معلمًا لحلقة من جدول «الحلقات».</span>`}</div></div>
<div class="field"><span class="lbl">سجل المكافآت</span>${hist.length?`<div class="history">${txTable(hist)}</div>`:`<span class="sub">لم تُصرف له مكافآت بعد.</span>`}</div>`:""}
<p class="err" id="tErr" hidden></p></div>
<footer>${ro?`<button class="btn" type="button" data-close>إغلاق</button>`:`<button class="btn primary" type="submit">حفظ</button><button class="btn" type="button" data-close>إلغاء</button><span class="spacer"></span>${id?`<button class="btn danger" type="button" id="tDel">حذف المعلم</button>`:""}`}</footer></form>`, sheet=>{
sheet.querySelectorAll(".history [data-tx]").forEach(r=>r.addEventListener("click",ev=>{ ev.stopPropagation(); openVoucher(r.dataset.tx); }));
const er=$("#tErr",sheet);
$("#tForm",sheet).onsubmit=async e=>{ e.preventDefault(); if(ro) return;
const name=$("#tName",sheet).value.trim(); if(!name){ er.textContent="اكتب اسم المعلم."; er.hidden=false; return; }
const rw=parseFloat($("#tReward",sheet).value);
const body={name, role:$("#tRole",sheet).value, monthlyReward: rw>0?Math.round(rw*100)/100:0, phone:$("#tPhone",sheet).value.trim(), iban:$("#tIban",sheet).value.trim().toUpperCase(), notes:$("#tNotes",sheet).value.trim(), active:$("#tActive",sheet).checked};
const ok = await write(()=> id ? S.db.doc("teachers/"+id).update(body) : S.db.collection("teachers").add({...body, createdAt:new Date().toISOString()}), "تم حفظ بيانات المعلم");
if(ok){ if(id && name!==x.name){ for(const h of hs){ await write(()=>S.db.doc("halaqat/"+h.id).update({teacher:name})); } } closeModal(); } };
const del=$("#tDel",sheet); if(del) del.onclick=async()=>{
if(hist.length){ er.textContent="للمعلم سندات مسجلة، لذلك لا يُحذف حفاظًا على السجل المالي. ألغِ تحديد «على رأس العمل» بدلًا من ذلك."; er.hidden=false; return; }
if(hs.length){ er.textContent=`المعلم مسند إلى ${hs.length} حلقة. غيّر معلم الحلقة أولًا.`; er.hidden=false; return; }
if(!del.classList.contains("armed")){ del.classList.add("armed"); del.textContent="تأكيد الحذف"; return; }
if(await write(()=>S.db.doc("teachers/"+id).delete(),"حُذف المعلم")) closeModal(); };
});
}
function openHalaqa(id){
const h = S.halaqat.find(x=>x.id===id) || {};
const nSt = id ? S.students.filter(s=>s.halaqaId===id).length : 0;
openModal(`<form id="hForm" novalidate><header><span class="arch">${esc(initial(h.name||"ح"))}</span><h3>${id?"تعديل حلقة":"حلقة جديدة"}</h3>${closeBtn}</header>
<div class="content"><div class="form-grid">
<div class="field wide"><label for="hName">اسم الحلقة</label><input type="text" id="hName" value="${esc(h.name||"")}" placeholder="مثال: حلقة أبي بن كعب" required></div>
<div class="field"><label for="hTeacher">المعلم</label><select id="hTeacher"><option value="">— بدون معلم —</option>${S.teachers.filter(x=>x.active!==false||x.id===h.teacherId).map(x=>`<option value="${esc(x.id)}"${x.id===h.teacherId?" selected":""}>${esc(x.name)}</option>`).join("")}</select>${S.teachers.length?"":`<span class="sub">أضف المعلمين أولًا من أعلى الصفحة.</span>`}</div>
<div class="field"><label for="hSched">الموعد</label><input type="text" id="hSched" value="${esc(h.schedule||"")}" placeholder="مثال: بعد العصر، الأحد – الخميس"></div>
</div><p class="err" id="hErr" hidden></p></div>
<footer><button class="btn primary" type="submit">حفظ</button><button class="btn" type="button" data-close>إلغاء</button><span class="spacer"></span>${id?`<button class="btn danger" type="button" id="hDel">حذف الحلقة</button>`:""}</footer></form>`, sheet=>{
const er=$("#hErr",sheet);
$("#hForm",sheet).onsubmit=async e=>{ e.preventDefault(); const name=$("#hName",sheet).value.trim();
if(!name){ er.textContent="اكتب اسم الحلقة."; er.hidden=false; return; }
const teacherId=$("#hTeacher",sheet).value;
const body={name, teacherId, teacher: teacherById(teacherId)?.name || "", schedule:$("#hSched",sheet).value.trim()};
const ok = await write(()=> id ? S.db.doc("halaqat/"+id).update(body) : S.db.collection("halaqat").add({...body, createdAt:new Date().toISOString()}), "تم حفظ الحلقة");
if(ok) closeModal(); };
const del=$("#hDel",sheet); if(del) del.onclick=async()=>{
if(nSt){ er.textContent=`لا يمكن حذف الحلقة وفيها ${nSt} طالب. انقل الطلاب إلى حلقة أخرى أولًا.`; er.hidden=false; return; }
if(!del.classList.contains("armed")){ del.classList.add("armed"); del.textContent="تأكيد الحذف"; return; }
if(await write(()=>S.db.doc("halaqat/"+id).delete(),"حُذفت الحلقة")) closeModal(); };
});
}
function openStudent(id){
const s = S.students.find(x=>x.id===id) || {active:true, monthlyFee:""};
const hasTx = id && S.tx.some(t=>t.studentId===id);
openModal(`<form id="sForm" novalidate><header>${id?`<span class="avatar">${esc(initial(s.name))}</span>`:""}<h3>${id?"تعديل بيانات طالب":"طالب جديد"}</h3>${closeBtn}</header>
<div class="content"><div class="form-grid">
<div class="field wide"><label for="sName">اسم الطالب</label><input type="text" id="sName" value="${esc(s.name||"")}" required></div>
<div class="field"><label for="sHal">الحلقة</label><select id="sHal"><option value="">— اختر —</option>${S.halaqat.map(h=>`<option value="${esc(h.id)}"${h.id===s.halaqaId?" selected":""}>${esc(h.name)}</option>`).join("")}</select>${S.halaqat.length?"":`<span class="sub">أضف الحلقات من صفحة «المعلمون والحلقات».</span>`}</div>
<div class="field"><label for="sFee">الرسوم الشهرية (ر.س)</label><input type="number" id="sFee" min="0" step="0.01" inputmode="decimal" value="${esc(s.monthlyFee)}" placeholder="0 للطالب المعفى"></div>
<div class="field"><label for="sGuardian">ولي الأمر</label><input type="text" id="sGuardian" value="${esc(s.guardian||"")}"></div>
<div class="field"><label for="sPhone">جوال ولي الأمر</label><input type="tel" id="sPhone" dir="ltr" style="text-align:right" value="${esc(s.phone||"")}" placeholder="05xxxxxxxx"></div>
<label class="check wide"><input type="checkbox" id="sActive" ${s.active!==false?"checked":""}> الطالب منتظم (تُحسب عليه الرسوم الشهرية)</label>
</div><p class="err" id="sErr" hidden></p></div>
<footer><button class="btn primary" type="submit">حفظ</button><button class="btn" type="button" data-close>إلغاء</button><span class="spacer"></span>${id?`<button class="btn danger" type="button" id="sDel">حذف الطالب</button>`:""}</footer></form>`, sheet=>{
const er=$("#sErr",sheet);
$("#sForm",sheet).onsubmit=async e=>{ e.preventDefault(); const name=$("#sName",sheet).value.trim();
if(!name){ er.textContent="اكتب اسم الطالب."; er.hidden=false; return; }
const fee=parseFloat($("#sFee",sheet).value);
const body={name, halaqaId:$("#sHal",sheet).value, monthlyFee: fee>0?Math.round(fee*100)/100:0, guardian:$("#sGuardian",sheet).value.trim(), phone:$("#sPhone",sheet).value.trim(), active:$("#sActive",sheet).checked};
const ok = await write(()=> id ? S.db.doc("students/"+id).update(body) : S.db.collection("students").add({...body, createdAt:new Date().toISOString()}), "تم حفظ بيانات الطالب");
if(ok) closeModal(); };
const del=$("#sDel",sheet); if(del) del.onclick=async()=>{
if(hasTx){ er.textContent="للطالب سندات مسجلة، لذلك لا يُحذف حفاظًا على السجل المالي. ألغِ تحديد «الطالب منتظم» بدلًا من ذلك."; er.hidden=false; return; }
if(!del.classList.contains("armed")){ del.classList.add("armed"); del.textContent="تأكيد الحذف"; return; }
if(await write(()=>S.db.doc("students/"+id).delete(),"حُذف الطالب")) closeModal(); };
});
}
document.addEventListener("click",e=>{
if(e.target.closest("#modalRoot")) return;
const el=e.target.closest("[data-tx],[data-new-st],[data-new],[data-go],[data-pay],[data-reward],[data-edit-hal],[data-edit-st],[data-edit-tc]"); if(!el) return;
if(el.dataset.tx) openVoucher(el.dataset.tx);
else if(el.dataset.newSt) openStudent();
else if(el.dataset.new) openTx(el.dataset.new);
else if(el.dataset.go) show(el.dataset.go);
else if(el.dataset.pay){ const s=studentById(el.dataset.pay); openTx("income",{category:FEE_CAT, studentId:s.id, halaqaId:s.halaqaId, feeMonth:S.fees.month}); }
else if(el.dataset.reward) openTx("expense",{category:REWARD_CAT, teacherId:el.dataset.reward, rewardMonth:S.teach.month, method:"transfer"});
else if(el.dataset.editHal) openHalaqa(el.dataset.editHal);
else if(el.dataset.editSt) openStudent(el.dataset.editSt);
else if(el.dataset.editTc) openTeacher(el.dataset.editTc);
});
document.addEventListener("keydown",e=>{ if(e.key==="Enter" && e.target.matches?.("tr[tabindex]") && !e.target.closest("#modalRoot")) e.target.click(); });
$("#btnIn").onclick=()=>openTx("income");
$("#btnOut").onclick=()=>openTx("expense");
$("#btnClearSample").onclick=async e=>{
const b=e.currentTarget;
if(!b.classList.contains("armed")){ b.classList.add("armed"); b.textContent="تأكيد حذف البيانات التجريبية"; return; }
b.disabled=true;
const list=[...S.tx.filter(d=>d.sample).map(d=>"transactions/"+d.id),...S.students.filter(d=>d.sample).map(d=>"students/"+d.id),...S.halaqat.filter(d=>d.sample).map(d=>"halaqat/"+d.id),...S.teachers.filter(d=>d.sample).map(d=>"teachers/"+d.id)];
let fails=0; for(const p of list){ try{ await S.db.doc(p).delete(); }catch(err){ fails++; } }
b.disabled=false; b.classList.remove("armed"); b.textContent="حذف البيانات التجريبية";
toast(fails ? `تعذّر حذف ${fails} من السجلات. أعد المحاولة.` : "حُذفت البيانات التجريبية.");
};
S.fees.month = thisMonth(); S.teach.month = thisMonth(); S.reports.month = thisMonth(); S.reports.year = thisMonth().slice(0,4);
S.view = views[(location.hash||"").slice(1)] ? (location.hash||"").slice(1) : (views[storeGet("halaqat.view")] ? storeGet("halaqat.view") : "summary");
paintHeader();
const SB_URL = window.APP_CONFIG.supabaseUrl;
const SB_KEY = window.APP_CONFIG.supabaseKey;
const SB = window.supabase.createClient(SB_URL, SB_KEY, {auth:{persistSession:true, autoRefreshToken:true}, db:{schema: window.APP_CONFIG.dbSchema || "public"}});
function makeDb(sb){
const cache = {}, subs = {}, docSubs = {};
const put = (c,id,data) => { (cache[c] ||= new Map()).set(id,data); };
const snap = c => { const docs=[...(cache[c]||new Map()).entries()].map(([id,data])=>({id,exists:true,data:()=>data})); return {docs,size:docs.length,empty:!docs.length}; };
const docSnap = k => { const [c,id]=k.split("/"); const d=cache[c]?.get(id); return {id, exists:!!d, data:()=>d}; };
const notify = c => { (subs[c]||new Set()).forEach(cb=>cb(snap(c))); Object.keys(docSubs).forEach(k=>{ if(k.startsWith(c+"/")) docSubs[k].forEach(cb=>cb(docSnap(k))); }); };
const fail = e => { const err=new Error(e?.message||"error"); err.code = (e?.code==="42501"||/row-level security|permission/i.test(e?.message||"")) ? "invalid_argument" : "unavailable"; return err; };
const ready = (async()=>{ for(let from=0;;from+=1000){ const {data,error}=await sb.from("docs").select("collection,id,data").range(from,from+999); if(error) throw fail(error); data.forEach(r=>put(r.collection,r.id,r.data)); if(data.length<1000) break; } })();
sb.channel("docs-live").on("postgres_changes",{event:"*",schema:"public",table:"docs"},p=>{
if(p.eventType==="DELETE"){ if(p.old?.collection){ cache[p.old.collection]?.delete(p.old.id); notify(p.old.collection); } }
else if(p.new?.collection){ put(p.new.collection,p.new.id,p.new.data); notify(p.new.collection); }
}).subscribe();
const docRef = (c,id) => ({ id, path:`${c}/${id}`,
onSnapshot(cb, onErr){ const k=`${c}/${id}`; (docSubs[k] ||= new Set()).add(cb); ready.then(()=>cb(docSnap(k))).catch(e=>onErr?.(e)); return ()=>docSubs[k].delete(cb); },
async set(data){ const {error}=await sb.from("docs").upsert({collection:c,id,data}); if(error) throw fail(error); put(c,id,data); notify(c); },
async update(patch){ const data={...(cache[c]?.get(id)||{}), ...patch}; const {error}=await sb.from("docs").update({data}).eq("collection",c).eq("id",id); if(error) throw fail(error); put(c,id,data); notify(c); },
async delete(){ const {error}=await sb.from("docs").delete().eq("collection",c).eq("id",id); if(error) throw fail(error); cache[c]?.delete(id); notify(c); }
});
return {
doc(path){ const [c,id]=path.split("/"); return docRef(c,id); },
collection(c){ return {
onSnapshot(cb, onErr){ (subs[c] ||= new Set()).add(cb); ready.then(()=>cb(snap(c))).catch(e=>onErr?.(e)); return ()=>subs[c].delete(cb); },
doc(id){ return docRef(c, id||crypto.randomUUID()); },
async add(data){ const r=docRef(c, crypto.randomUUID()); await r.set(data); return r; }
}; }
};
}
async function loadMembers(){
const {data} = await SB.from("members").select("phone,name,role");
S.members = data || [];
if(S.view==="users" && $("#memberList")) views.users.fill();
}
let pendingPhone = "";
function authStep(step){
$("#auth").hidden = !step;
["authPhone","authCode","authDenied"].forEach(id=>$("#"+id).hidden = id!==({phone:"authPhone",code:"authCode",denied:"authDenied"})[step]);
if(step==="phone") setTimeout(()=>$("#phoneIn").focus(),50);
if(step==="code") setTimeout(()=>$("#codeIn").focus(),50);
}
function authError(el, error){
const m = String(error?.message||"");
el.textContent = /provider|unsupported phone|sms/i.test(m) && !/rate|seconds/i.test(m) ? "خدمة إرسال الرموز عبر واتساب لم تُفعَّل بعد في إعدادات النظام. تواصل مع مدير النظام."
: /seconds|rate|too many/i.test(m) ? "طلبت رموزًا كثيرة. انتظر دقيقة ثم أعد المحاولة."
: /expired|invalid|token/i.test(m) ? "الرمز غير صحيح أو انتهت صلاحيته. اطلب رمزًا جديدًا."
: "تعذّر الإرسال. تحقق من الرقم والاتصال ثم أعد المحاولة.";
el.hidden = false;
}
async function sendCode(){
const err=$("#authErr"); err.hidden=true;
const phone = normPhone($("#phoneIn").value);
if(!phone){ err.textContent="اكتب رقم جوال سعودي صحيح، مثل 5XXXXXXXX."; err.hidden=false; return; }
const btn=$("#authPhone button[type=submit]"); btn.disabled=true;
const {error} = await SB.auth.signInWithOtp({phone:"+"+phone, options:{channel:"whatsapp"}});
btn.disabled=false;
if(error){ authError(err, error); return; }
pendingPhone = phone; $("#sentTo").textContent = showPhone(phone); $("#codeIn").value=""; authStep("code");
}
$("#authPhone").onsubmit = e => { e.preventDefault(); sendCode(); };
$("#changePhone").onclick = () => authStep("phone");
$("#resend").onclick = async () => { $("#codeErr").hidden=true; const {error}=await SB.auth.signInWithOtp({phone:"+"+pendingPhone, options:{channel:"whatsapp"}}); if(error) authError($("#codeErr"), error); else toast("أُرسل رمز جديد على واتساب"); };
$("#authCode").onsubmit = async e => { e.preventDefault();
const code = $("#codeIn").value.replace(/[^0-9]/g,""), err=$("#codeErr"); err.hidden=true;
if(code.length!==6){ err.textContent="الرمز 6 أرقام."; err.hidden=false; return; }
const btn=$("#authCode button[type=submit]"); btn.disabled=true;
const {data, error} = await SB.auth.verifyOtp({phone:"+"+pendingPhone, token:code, type:"sms"});
btn.disabled=false;
if(error){ authError(err, error); return; }
enter(data.session);
};
$("#codeIn").addEventListener("input", e=>{ if(e.target.value.replace(/[^0-9]/g,"").length===6) $("#authCode").requestSubmit(); });
document.addEventListener("click", async e=>{ if(e.target.closest("[data-signout]")){ await SB.auth.signOut(); location.reload(); } });
let entered = false;
async function enter(session){
if(entered || !session) return;
const {data:isMember, error} = await SB.rpc("is_member");
if(error || !isMember){ authStep("denied"); return; }
entered = true; authStep(null);
S.uid = session.user.id; S.phone = String(session.user.phone||"").replace(/[^0-9]/g,"");
const {data:isAdmin} = await SB.rpc("is_admin"); S.isAdmin = !!isAdmin;
if(S.isAdmin){ loadMembers(); SB.channel("members-live").on("postgres_changes",{event:"*",schema:"public",table:"members"},loadMembers).subscribe(); }
const db = makeDb(SB); S.db = db;
const onErr = () => { $("#view").innerHTML = `<div class="notice">تعذّر تحميل البيانات. حدّث الصفحة، وإذا تكررت المشكلة سجّل الخروج ثم ادخل مرة ثانية.</div>`; };
const ready = () => S.loaded.h&&S.loaded.s&&S.loaded.t&&S.loaded.tc;
const first = () => { if(ready() && !$("#view .page")) show(S.view); else refresh(); };
db.collection("halaqat").onSnapshot(s=>{ S.halaqat=s.docs.map(d=>({id:d.id,...d.data()})); S.loaded.h=true; first(); }, onErr);
db.collection("students").onSnapshot(s=>{ S.students=s.docs.map(d=>({id:d.id,...d.data()})); S.loaded.s=true; first(); }, onErr);
db.collection("teachers").onSnapshot(s=>{ S.teachers=s.docs.map(d=>({id:d.id,...d.data()})); S.loaded.tc=true; first(); }, onErr);
db.collection("transactions").onSnapshot(s=>{ S.tx=s.docs.map(d=>({id:d.id,...d.data()})); S.loaded.t=true; first(); }, onErr);
db.doc("settings/main").onSnapshot(s=>{ S.settings = s.exists ? {...s.data()} : {}; paintHeader(); }, onErr);
}
(async function boot(){
const {data:{session}} = await SB.auth.getSession();
if(session) enter(session); else authStep("phone");
})();
