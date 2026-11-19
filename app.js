/* 家計ラボ v1.0 — 端末内完結・外部ライブラリ不要 */
'use strict';
(() => {
const KEY = 'kakei-lab.local.v1';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const NAV = [
  ['home','⌂','ホーム'],['history','☷','履歴'],['weekly','▥','週次'],
  ['monthly','◕','月次'],['forecast','↗','予測'],['settings','⚙','設定']
];
const PALETTE = ['#eb8278','#3a9cba','#e3a24f','#8f79cf','#5aac87','#7292bc','#d77eaa','#62a2a3','#b28e58','#758f6b','#c16b75','#a6a2b4'];
const today = () => { const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const pad = n => String(n).padStart(2,'0');
const monthOf = date => String(date||'').slice(0,7);
const nowMonth = () => monthOf(today());
const nowYear = () => Number(today().slice(0,4));
const monthPlus = (ym,n) => { const [y,m]=ym.split('-').map(Number); const d=new Date(y,m-1+n,1);return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; };
const yearMonth = (year,month) => `${year}-${pad(month)}`;
const daysIn = ym => { const [y,m]=ym.split('-').map(Number);return new Date(y,m,0).getDate(); };
const dayOf = d => Number(String(d).slice(8,10));
const toDate = s => { const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d); };
const dateStr = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const dayPlus = (s,n) => {const d=toDate(s);d.setDate(d.getDate()+n);return dateStr(d);};
const fmt = n => Math.round(Number(n)||0).toLocaleString('ja-JP');
const money = n => `${fmt(n)}円`;
const signMoney = n => `${n<0?'−':'+'}${money(Math.abs(n))}`;
const e = s => String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const sum = (arr,k='amount') => arr.reduce((a,x)=>a+(Number(x[k])||0),0);
const uid = () => {try{return crypto.randomUUID();}catch(_){return Date.now().toString(36)+Math.random().toString(36).slice(2);}};
const safeDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s||'')) && !Number.isNaN(toDate(s).getTime()) && dateStr(toDate(s)) === s;
const num = x => Math.max(0,Math.round(Number(x)||0));
const defaultCats = () => {
  const rows=[
    ['食費','expense','variable',0],['日用品','expense','variable',0],
    ['住居費','expense','fixed',0],['水道・光熱費','expense','fixed',0],
    ['通信費','expense','fixed',0],['サブスク','expense','fixed',0],
    ['趣味・娯楽','expense','variable',0],['交通費','expense','variable',0],
    ['交際費','expense','variable',0],['医療費','expense','variable',0],
    ['特別費','expense','variable',0],['その他','expense','variable',0],
    ['給与','income','fixed',0],['賞与','income','variable',0],['副収入','income','variable',0],['その他収入','income','variable',0]
  ];
  return rows.map((r,i)=>({id:'c'+(i+1),name:r[0],type:r[1],kind:r[2],expected:r[3],budget:0,color:PALETTE[i%PALETTE.length]}));
};
const fresh = () => ({version:1,settings:{monthlyIncome:0,avgMonths:3,monthlyGoal:0},categories:defaultCats(),transactions:[],plans:[],createdAt:new Date().toISOString()});
function load(){try{const raw=localStorage.getItem(KEY);if(raw){const v=JSON.parse(raw); if(v && Array.isArray(v.transactions) && Array.isArray(v.categories))return normalize(v);}}catch(err){console.warn('Load error',err);}return fresh();}
function normalize(v){
 const s={...fresh(),...v};
 s.settings={...fresh().settings,...(v.settings||{})};
 s.categories=(v.categories||[]).map((c,i)=>({id:String(c.id||uid()),name:String(c.name||'その他'),type:c.type==='income'?'income':'expense',kind:c.kind==='fixed'?'fixed':'variable',expected:num(c.expected),budget:num(c.budget),color:/^#[0-9a-fA-F]{6}$/.test(c.color)?c.color:PALETTE[i%PALETTE.length]}));
 s.transactions=(v.transactions||[]).filter(x=>safeDate(x.date)&&['expense','income','transfer'].includes(x.type)&&Number(x.amount)>0).map(x=>({...x,id:String(x.id||uid()),amount:num(x.amount),memo:String(x.memo||''),withdrawal:safeDate(x.withdrawal)?x.withdrawal:'',payment:String(x.payment||'その他')}));
 s.plans=(v.plans||[]).filter(p=>/^\d{4}-\d{2}$/.test(p.month)&&Number(p.amount)>0).map(p=>({...p,id:String(p.id||uid()),amount:num(p.amount),done:!!p.done,type:p.type==='income'?'income':'expense',name:String(p.name||'予定')}));
 return s;
}
let db=load();
let ui={page:'home',month:nowMonth(),year:nowYear(),search:'',filterType:'all',filterCategory:'all',settingsTab:'basic',entryType:'expense'};
let toastTimer;
function persist(){try{localStorage.setItem(KEY,JSON.stringify(db));return true;}catch(err){toast('保存に失敗しました。空き容量を確認してください。');return false;}}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3000);}
function catBy(id){return db.categories.find(x=>x.id===id);}
function catLabel(id){return catBy(id)?.name || (id==='transfer'?'資金移動':'未設定');}
function catColor(id){return catBy(id)?.color||'#a9b5c2';}
function payments(){return ['楽天カード','PayPay','現金','Suica','銀行振替','その他'];}
function txInMonth(ym,type){return db.transactions.filter(t=>monthOf(t.date)===ym && (!type||t.type===type));}
function actualMonth(ym){const tx=txInMonth(ym);return {income:sum(tx.filter(t=>t.type==='income')),expense:sum(tx.filter(t=>t.type==='expense')),count:tx.length,transfer:sum(tx.filter(t=>t.type==='transfer'))};}
function expenseForCategory(ym,id){return sum(db.transactions.filter(x=>x.type==='expense'&&x.categoryId===id&&monthOf(x.date)===ym));}
function getOldestTrackedMonth(){const a=db.transactions.filter(x=>x.type==='expense').map(x=>monthOf(x.date)).sort();return a[0]||null;}
function categoryAverage(id,ym){
 // 未来の月は「その月の直前」ではなく、現在から見た直近の完了月を参照する。
 const oldest=getOldestTrackedMonth(),anchor=ym>nowMonth()?nowMonth():ym;
 const nums=[];
 for(let i=1;i<=Number(db.settings.avgMonths||3);i++){
  const previous=monthPlus(anchor,-i);
  if(oldest && previous>=oldest && previous<nowMonth())nums.push(expenseForCategory(previous,id));
 }
 return {avg:nums.length?sum(nums.map(amount=>({amount})))/nums.length:0,months:nums.length};
}
function plannedFor(ym,type){return db.plans.filter(p=>p.month===ym&&!p.done&&(!type||p.type===type));}
function getForecast(ym){
 const current=nowMonth(), isPast=ym<current, isCurrent=ym===current;
 const n=daysIn(ym), elapsed=isCurrent?Math.min(n,dayOf(today())):(isPast?n:0), remain=Math.max(0,n-elapsed);
 const act=actualMonth(ym), hasActual=act.count>0;
 const categories=db.categories.filter(c=>c.type==='expense').map(c=>{
  const actual=expenseForCategory(ym,c.id), hist=categoryAverage(c.id,ym);
  // 記録開始初月で過去データがなくても、今月の実績を未来月に引き継ぐ。
  const monthProgress=Math.max(1,dayOf(today()));
  const fallback=ym>nowMonth() && hist.months===0
    ? (c.kind==='fixed'?expenseForCategory(nowMonth(),c.id):expenseForCategory(nowMonth(),c.id)/monthProgress*daysIn(nowMonth())) : 0;
  const baseline=c.expected>0?c.expected:(hist.months>0?hist.avg:fallback);
  let forecast;
  if(isPast && hasActual){forecast=actual;}
  else if(isCurrent){
    if(c.kind==='fixed')forecast=Math.max(actual,baseline);
    else if(elapsed>0){
      const observed=actual/elapsed;
      const historical=baseline/n;
      const weight=baseline>0?Math.max(.08,Math.min(.58,elapsed/n*.68)) : 1;
      forecast=actual+remain*(historical*(1-weight)+observed*weight);
    }else forecast=baseline;
  }else forecast=baseline;
  return {cat:c,actual,avg:hist.avg,historyMonths:hist.months,forecast:Math.max(actual,Math.round(forecast||0))};
 });
 const planExpense=sum(plannedFor(ym,'expense'));
 const planIncome=sum(plannedFor(ym,'income'));
 const spending=sum(categories,'forecast')+planExpense;
 const actualIncome=act.income;
 const income=(isPast&&hasActual)?actualIncome:Math.max(actualIncome,num(db.settings.monthlyIncome))+planIncome;
 return {ym,act,categories,spending,income,surplus:income-spending,planExpense,planIncome,estimate:!isPast||!hasActual,hasActual};
}
function yearForecast(year){
 const months=Array.from({length:12},(_,i)=>getForecast(yearMonth(year,i+1)));
 return {months,income:sum(months,'income'),expense:sum(months,'spending'),surplus:sum(months,'surplus')};
}
function weekStart(d){const date=toDate(d);const delta=(date.getDay()+6)%7;return dayPlus(d,-delta);}
function weeklyData(){
 const start=weekStart(today());return Array.from({length:8},(_,i)=>{
  const mon=dayPlus(start,(i-7)*7),sun=dayPlus(mon,6);
  const tx=db.transactions.filter(t=>t.date>=mon && t.date<=sun);
  return {start:mon,end:sun,expense:sum(tx.filter(t=>t.type==='expense')),income:sum(tx.filter(t=>t.type==='income')),isCurrent:i===7};
 });
}
const sectionTitle=(name,details='',extra='')=>`<div class="panel-title"><div><h2>${name}</h2>${details?`<div class="panel-sub">${details}</div>`:''}</div>${extra}</div>`;
const metric=(title,value,desc,icon,cls='')=>`<div class="metric"><div class="metric-top"><span>${title}</span><span class="metric-ico">${icon}</span></div><div class="metric-number ${cls}">${e(value)}</div><div class="metric-sub">${e(desc)}</div></div>`;
const empty=(title,sub='記録を追加するとここに表示されます。')=>`<div class="empty"><div class="empty-ico">▤</div><strong>${e(title)}</strong>${e(sub)}</div>`;
const monthNav=()=>`<div class="month-nav"><button class="arrow" data-action="month-prev" aria-label="前の月">‹</button><span>${e(ui.month.replace('-','年'))}月</span><button class="arrow" data-action="month-next" aria-label="次の月">›</button></div>`;
function chartBars(points,types=['expense'],maxH=146){
 const max=Math.max(1,...points.flatMap(p=>types.map(t=>p[t]||0)));
 return `<div class="chart-bars" role="img" aria-label="${e(points.map(p=>`${p.label}: 支出${fmt(p.expense)}円`).join('、'))}">${points.map(p=>`<div class="chart-col">${types.map(t=>`<div class="chart-bar ${t}" style="height:${Math.max(2,Math.round((p[t]||0)/max*maxH))}px" title="${e(t==='income'?'収入':'支出')} ${money(p[t]||0)}"></div>`).join('')}<span class="bar-label">${e(p.label)}</span></div>`).join('')}</div><div class="legend">${types.map(t=>`<span><span class="color-dot" style="background:${t==='income'?'#a0c4a8':'#3d779d'}"></span>${t==='income'?'収入':'支出'}</span>`).join('')}</div>`;
}
function recentTransactions(ym,limit=6){return db.transactions.filter(t=>monthOf(t.date)===ym).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)).slice(0,limit);}
function transactionTable(rows,withActions=true){
 if(!rows.length)return empty('まだ明細がありません');
 return `<div class="table-scroll"><table class="data-table"><thead><tr><th>利用日</th><th>内容</th><th>支払方法</th><th>引落日</th><th class="number">金額</th>${withActions?'<th></th>':''}</tr></thead><tbody>${rows.map(t=>`<tr><td style="white-space:nowrap">${e(t.date.slice(5).replace('-','/'))}</td><td><span class="color-dot" style="background:${e(catColor(t.categoryId))}"></span><strong>${e(catLabel(t.categoryId))}</strong><div class="tiny muted">${e(t.memo||({expense:'支出',income:'収入',transfer:'資金移動'}[t.type]))}</div></td><td><span class="tag">${e(t.payment)}</span></td><td class="tiny muted" style="white-space:nowrap">${t.withdrawal?e(t.withdrawal.slice(5).replace('-','/')):'—'}</td><td class="number ${t.type==='income'?'good':t.type==='expense'?'bad':''}">${t.type==='expense'?'−':t.type==='income'?'+':'⇄'}${money(t.amount)}</td>${withActions?`<td class="actions"><button data-action="edit-tx" data-id="${e(t.id)}" title="編集">編集</button> <button data-action="remove-tx" data-id="${e(t.id)}" title="削除">削除</button></td>`:''}</tr>`).join('')}</tbody></table></div>`;
}
function homeView(){
 const f=getForecast(ui.month), s=weeklyData(), last7=s.slice(-1)[0], monthlyBudget=sum(db.categories.filter(c=>c.type==='expense'),'budget');
 const withdrawal=sum(db.transactions.filter(t=>t.type==='expense'&&monthOf(t.withdrawal||t.date)===ui.month));
 const topCats=f.categories.filter(x=>x.actual>0).sort((a,b)=>b.actual-a.actual).slice(0,6);
 const projected=signMoney(f.surplus);const goal=num(db.settings.monthlyGoal);
 const progress=goal>0?Math.min(100,Math.max(0,Math.round(Math.max(0,f.surplus)/goal*100))):0;
 return `<div class="hero"><div><small>YOUR MONEY, CLEARER EVERY DAY</small><h2>今日の記録から、未来のお金を見通す。</h2><p>収支を入力すると、月末と年間の見込みが自動更新されます。</p></div><button class="btn" data-action="new-transaction">＋ 記録する</button></div>
 <div class="section-bar"><h2>今月のサマリー</h2>${monthNav()}</div>
 <div class="metrics">${metric('月末の余剰資金予測',projected,'収入見込み − 支出見込み','↗',f.surplus>=0?'positive':'negative')}${metric('今月の収入',money(f.act.income),'登録済みの収入','↥')}${metric('今月の支出',money(f.act.expense),'利用日ベースの実績','↧')}${metric('今月末の支出予測',money(f.spending),'過去の平均と現在のペースから','◷')}</div>
 <div class="grid-two"><section class="panel">${sectionTitle('月末の見通し','実績とカテゴリーごとの予測を反映',`<button class="btn soft small" data-action="navigate" data-page="forecast">くわしく見る →</button>`)}<div class="two-stats"><div class="mini"><div class="muted tiny">今月の支出実績</div><strong>${money(f.act.expense)}</strong></div><div class="mini"><div class="muted tiny">残りの支出予測</div><strong>${money(Math.max(0,f.spending-f.act.expense))}</strong></div></div><div style="margin-top:16px"><div class="progress-caption"><strong>月の予算</strong><span>${monthlyBudget?`${money(f.act.expense)} / ${money(monthlyBudget)}`:'未設定（設定から登録）'}</span></div><div class="progress"><div class="${monthlyBudget&&f.act.expense>monthlyBudget?'over':''}" style="width:${monthlyBudget?Math.min(100,f.act.expense/monthlyBudget*100):0}%"></div></div></div><div style="margin-top:16px"><div class="progress-caption"><strong>毎月の余剰資金目標</strong><span>${goal?money(goal):'未設定'}</span></div><div class="progress"><div style="width:${progress}%"></div></div></div><p class="tiny muted">※予定や口座間の資金移動は実績と区別して計算します。引落日は集計日を変更しません。</p></section>
 <section class="panel">${sectionTitle('カテゴリー別の支出','今月の実績')}${topCats.length?topCats.map(r=>`<div class="cat-line"><span class="color-dot" style="background:${e(r.cat.color)}"></span><span class="cat-name">${e(r.cat.name)}</span><div class="cat-track"><div style="width:${f.act.expense?Math.round(r.actual/f.act.expense*100):0}%;background:${e(r.cat.color)}"></div></div><span class="cat-val">${money(r.actual)}</span></div>`).join(''):empty('支出を入力すると内訳が出ます')}<div class="info-note" style="margin-top:15px">${e(ui.month)} の支払日ベースの支出合計：<strong>${money(withdrawal)}</strong><br>※カードの引落日を入力すると支払月ごとの確認にも使えます。</div></section></div>
 <div class="grid-equal"><section class="panel">${sectionTitle('直近8週間の支出','月曜〜日曜の支出額',`<button class="btn soft small" data-action="navigate" data-page="weekly">週次分析 →</button>`)}${chartBars(s.map(r=>({...r,label:`${Number(r.start.slice(5,7))}/${Number(r.start.slice(8))}`})))}</section><section class="panel">${sectionTitle('最近の明細',ui.month,`<button class="btn soft small" data-action="navigate" data-page="history">すべて見る →</button>`)}${transactionTable(recentTransactions(ui.month,5),false)}</section></div>
 ${db.transactions.length===0?`<div class="notice">はじめて使う場合は「＋ 記録する」から1件入力してみよう。デモを見たい場合は「設定」→「サンプルデータを入れる」も使えます。</div>`:''}`;
}
function historyView(){
 let tx=txInMonth(ui.month).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
 if(ui.filterType!=='all')tx=tx.filter(t=>t.type===ui.filterType);
 if(ui.filterCategory!=='all')tx=tx.filter(t=>t.categoryId===ui.filterCategory);
 if(ui.search.trim())tx=tx.filter(t=>`${catLabel(t.categoryId)} ${t.memo||''} ${t.payment||''}`.toLowerCase().includes(ui.search.trim().toLowerCase()));
 const c=actualMonth(ui.month);
 const dates=[...new Set(txInMonth(ui.month).map(t=>t.date))].sort((a,b)=>b.localeCompare(a));
 const dailyRows=dates.map(date=>{const a=db.transactions.filter(t=>t.date===date);const income=sum(a.filter(t=>t.type==='income'));const expense=sum(a.filter(t=>t.type==='expense'));return {date,income,expense,diff:income-expense,count:a.length};});
 return `<div class="section-bar"><div><h2>収支履歴</h2><div class="muted tiny">利用日ベースで表示。引落日も別に保存します。</div></div>${monthNav()}</div>
 <div class="metrics" style="grid-template-columns:repeat(3,minmax(0,1fr))">${metric('収入合計',money(c.income),'登録済み','↥')}${metric('支出合計',money(c.expense),'登録済み','↧')}${metric('実績の差額',signMoney(c.income-c.expense),'積立や振替は含まない','⇄',c.income>=c.expense?'positive':'negative')}</div>
 <section class="panel">${sectionTitle('日別の収支集計','記録のある日付ごとに収入・支出を集計')}${dailyRows.length?`<div class="table-scroll"><table class="data-table"><thead><tr><th>日付</th><th class="number">収入</th><th class="number">支出</th><th class="number">差額</th><th class="number">件数</th></tr></thead><tbody>${dailyRows.map(d=>`<tr><td>${e(d.date)}</td><td class="number">${money(d.income)}</td><td class="number">${money(d.expense)}</td><td class="number ${d.diff<0?'bad':'good'}">${signMoney(d.diff)}</td><td class="number">${d.count}件</td></tr>`).join('')}</tbody></table></div>`:empty('今月の日別データはまだありません')}</section>
 <section class="panel"><div class="filters"><label class="field small">区分<select id="filterType"><option value="all" ${ui.filterType==='all'?'selected':''}>すべて</option>${[['expense','支出'],['income','収入'],['transfer','資金移動']].map(([k,t])=>`<option value="${k}" ${ui.filterType===k?'selected':''}>${t}</option>`).join('')}</select></label><label class="field small">カテゴリー<select id="filterCategory"><option value="all">すべて</option>${db.categories.map(c=>`<option value="${e(c.id)}" ${ui.filterCategory===c.id?'selected':''}>${e(c.name)}</option>`).join('')}</select></label><label class="field grow">キーワード<input id="searchTx" value="${e(ui.search)}" placeholder="メモ・カテゴリーで検索"></label><button class="btn primary" data-action="new-transaction">＋ 追加</button></div><div class="muted small-text" style="margin:0 0 12px">${tx.length}件の明細</div>${transactionTable(tx)}</section>`;
}
function weeklyView(){
 const ws=weeklyData(), prev=ws.slice(-5,-1), avg4=sum(prev,'expense')/4, cur=ws[7], elapsed=((toDate(today()).getDay()+6)%7)+1;
 const last7=dayPlus(today(),-6), seven=sum(db.transactions.filter(t=>t.type==='expense'&&t.date>=last7&&t.date<=today()));
 return `<div class="section-bar"><div><h2>週次レポート</h2><div class="muted tiny">月曜始まり、今日を含む直近8週間</div></div></div>
 <div class="metrics" style="grid-template-columns:repeat(3,minmax(0,1fr))">${metric('今週の支出',money(cur.expense),'月曜〜今日','▥')}${metric('直近4週の週平均',money(avg4),'終了した4週間の平均','≈')}${metric('過去7日の1日平均',money(seven/7),'直近7日間の支出 ÷ 7','◷')}</div>
 <div class="grid-two"><section class="panel">${sectionTitle('週別の支出推移','今週は途中経過を表示')}${chartBars(ws.map(w=>({...w,label:`${Number(w.start.slice(5,7))}/${Number(w.start.slice(8))}`})))}<div class="info-note" style="margin-top:17px">今週の1日平均：<strong>${money(cur.expense/elapsed)}</strong>（今週 ${elapsed} 日目）</div></section><section class="panel">${sectionTitle('8週間の比較','週ごとの収支')}
 <div class="table-scroll"><table class="data-table"><thead><tr><th>期間</th><th class="number">収入</th><th class="number">支出</th></tr></thead><tbody>${[...ws].reverse().map(w=>`<tr><td>${w.start.slice(5).replace('-','/')}〜${w.end.slice(5).replace('-','/')} ${w.isCurrent?'<span class="tag blue">今週</span>':''}</td><td class="number">${money(w.income)}</td><td class="number">${money(w.expense)}</td></tr>`).join('')}</tbody></table></div></section></div>
 <div class="notice">「週平均」は、終了済みの直近4週間の支出合計 ÷ 4 で計算。「1日平均」は直近7日間の支出合計 ÷ 7 です。記録がない日は0円として扱います。</div>`;
}
function monthlyView(){
 const ac=actualMonth(ui.month), cats=db.categories.filter(c=>c.type==='expense').map(c=>({cat:c,actual:expenseForCategory(ui.month,c.id)})).sort((a,b)=>b.actual-a.actual);
 const items=cats.filter(x=>x.actual>0), total=ac.expense, recent=Array.from({length:6},(_,i)=>{const m=monthPlus(ui.month,i-5);return {...actualMonth(m),label:m.slice(5)+'月'};});
 let p=0;const wedges=items.map(x=>{const start=p;p+=x.actual/Math.max(1,total)*100;return `${x.cat.color} ${start}% ${p}%`;}).join(',');
 return `<div class="section-bar"><div><h2>月次分析</h2><div class="muted tiny">費目ごとの内訳と月次推移</div></div>${monthNav()}</div><div class="metrics" style="grid-template-columns:repeat(3,minmax(0,1fr))">${metric('収入実績',money(ac.income),'その月の登録済み収入','↥')}${metric('支出実績',money(total),'その月の登録済み支出','↧')}${metric('収支差額',signMoney(ac.income-total),'実績ベース','◈',ac.income>=total?'positive':'negative')}</div>
 <div class="grid-two"><section class="panel">${sectionTitle('支出の内訳',ui.month)}${total?`<div style="display:flex;align-items:center;gap:30px;flex-wrap:wrap;justify-content:center;padding:9px 0"><div style="width:205px;height:205px;border-radius:50%;background:conic-gradient(${wedges});display:grid;place-items:center"><div style="border-radius:50%;width:122px;height:122px;background:#fff;display:grid;place-items:center;text-align:center"><div><div class="muted tiny">支出合計</div><strong style="font-size:19px">${money(total)}</strong></div></div></div><div style="flex:1;min-width:160px">${items.slice(0,8).map(x=>`<div class="cat-line"><span class="color-dot" style="background:${e(x.cat.color)}"></span><span class="cat-name">${e(x.cat.name)}</span><strong>${(x.actual/total*100).toFixed(1)}%</strong></div>`).join('')}</div></div>`:empty('費目別の支出はまだありません')}</section>
 <section class="panel">${sectionTitle('直近6か月の推移','利用日ベースの収入・支出')}${chartBars(recent,['income','expense'])}</section></div>
 <section class="panel">${sectionTitle('カテゴリー別の予算と実績','予算0円は未設定として扱います')}
 <div class="table-scroll"><table class="data-table"><thead><tr><th>費目</th><th class="number">実績</th><th class="number">予算</th><th class="number">差額</th><th>消化率</th></tr></thead><tbody>${cats.map(x=>{const b=x.cat.budget||0;return `<tr><td><span class="color-dot" style="background:${e(x.cat.color)}"></span>${e(x.cat.name)}</td><td class="number">${money(x.actual)}</td><td class="number">${b?money(b):'—'}</td><td class="number ${b&&x.actual>b?'bad':'good'}">${b?signMoney(b-x.actual):'—'}</td><td style="min-width:130px">${b?`<div class="progress"><div class="${x.actual>b?'over':''}" style="width:${Math.min(100,x.actual/b*100)}%"></div></div>`:'—'}</td></tr>`;}).join('')}</tbody></table></div></section>`;
}
function forecastView(){
 const f=getForecast(ui.month), y=yearForecast(ui.year);
 const yearPoints=y.months.map((m,i)=>({...m,expense:m.spending,label:`${i+1}月`}));
 return `<div class="section-bar"><div><h2>予算・将来予測</h2><div class="muted tiny">月ごとの傾向から着地と年間の余剰資金を試算</div></div>${monthNav()}</div>
 <div class="metrics" style="grid-template-columns:repeat(3,minmax(0,1fr))">${metric('月末の収入予測',money(f.income),'基本月収と入力実績・予定から','↥')}${metric('月末の支出予測',money(f.spending),'費目の平均＋一時支出予定','↧')}${metric('月末の余剰予測',signMoney(f.surplus),'収入予測 − 支出予測','◈',f.surplus>=0?'positive':'negative')}</div>
 <section class="panel">${sectionTitle('カテゴリーごとの着地予測',`履歴の直近${num(db.settings.avgMonths)}か月平均／見込額を使用`)}
 <div class="table-scroll"><table class="data-table"><thead><tr><th>費目</th><th class="number">今月実績</th><th class="number">過去月平均</th><th class="number">月末予測</th></tr></thead><tbody>${f.categories.map(x=>`<tr><td><span class="color-dot" style="background:${e(x.cat.color)}"></span>${e(x.cat.name)} <span class="muted tiny">${x.cat.kind==='fixed'?'固定':'変動'}</span></td><td class="number">${money(x.actual)}</td><td class="number">${x.historyMonths?money(x.avg):'—'}</td><td class="number">${money(x.forecast)}</td></tr>`).join('')}<tr style="background:#f4f7fa"><td><strong>費目合計</strong></td><td class="number">${money(f.act.expense)}</td><td></td><td class="number">${money(sum(f.categories,'forecast'))}</td></tr><tr><td>未反映の一時支出予定</td><td></td><td></td><td class="number">${money(f.planExpense)}</td></tr><tr><td><strong>支出予測合計</strong></td><td></td><td></td><td class="number"><strong>${money(f.spending)}</strong></td></tr></tbody></table></div><p class="tiny muted" style="margin-bottom:0">固定費は実績と設定見込額の大きい方、変動費は過去平均と今月の利用ペースを組み合わせます。過去データがなければ今月のペースを使用。費目の「月の見込額」は設定画面で変更できます。</p></section>
 <div class="section-bar" style="margin-top:22px"><h2>年間シミュレーション</h2><label class="field"><select id="forecastYear">${Array.from({length:7},(_,i)=>nowYear()-2+i).map(yr=>`<option ${ui.year===yr?'selected':''}>${yr}</option>`).join('')}</select></label></div>
 <section class="panel"><div class="year-highlight"><div><small>${ui.year}年の余剰資金予測</small><strong class="${y.surplus<0?'bad':'good'}">${signMoney(y.surplus)}</strong><div class="small-text muted">12か月分の予測収入から予測支出を差し引き</div></div><div class="two-stats"><div class="mini"><span class="tiny muted">予測収入</span><strong>${money(y.income)}</strong></div><div class="mini"><span class="tiny muted">予測支出</span><strong>${money(y.expense)}</strong></div></div></div>
 ${chartBars(yearPoints,['income','expense'])}<div class="table-scroll" style="margin-top:13px"><table class="data-table"><thead><tr><th>月</th><th class="number">収入</th><th class="number">支出</th><th class="number">余剰</th><th>区分</th></tr></thead><tbody>${y.months.map(m=>`<tr><td>${e(m.ym)}</td><td class="number">${money(m.income)}</td><td class="number">${money(m.spending)}</td><td class="number ${m.surplus>=0?'good':'bad'}">${signMoney(m.surplus)}</td><td><span class="tag ${m.estimate?'blue':'green'}">${m.estimate?'予測':'実績'}</span></td></tr>`).join('')}</tbody></table></div>
 <div class="info-note" style="margin-top:15px"><strong>余剰資金 ≠ 預金残高</strong><br>ここでは収入から生活費などの支出を引いた額を計算します。NISAへの積立や貯金口座への資金移動は支出に含めません。実績のない過去月は見込額で補完するため、予測結果は確定値ではありません。</div></section>
 <section class="panel">${sectionTitle('特別な収入・支出の予定','賞与・旅行・家具購入など、月ごとの一時的な予定を加算')}
 <form id="planForm" class="filters" style="align-items:end"><label class="field">予定月<input type="month" name="month" value="${e(ui.month)}" required></label><label class="field">区分<select name="type"><option value="expense">支出</option><option value="income">収入</option></select></label><label class="field grow">内容<input name="name" placeholder="例：冬賞与、旅行" maxlength="60" required></label><label class="field">金額<input name="amount" type="number" min="1" step="1" placeholder="例：30000" required></label><button class="btn primary" type="submit">＋ 予定を追加</button></form>
 ${db.plans.length?`<div class="table-scroll"><table class="data-table"><thead><tr><th>月</th><th>内容</th><th>区分</th><th class="number">金額</th><th>状態</th><th></th></tr></thead><tbody>${[...db.plans].sort((a,b)=>a.month.localeCompare(b.month)).map(p=>`<tr><td>${e(p.month)}</td><td>${e(p.name)}</td><td><span class="tag ${p.type==='income'?'green':'red'}">${p.type==='income'?'収入':'支出'}</span></td><td class="number">${money(p.amount)}</td><td><button class="btn small ${p.done?'soft':'outline'}" data-action="toggle-plan" data-id="${e(p.id)}">${p.done?'実績反映済み':'未反映'}</button></td><td><button class="btn small danger" data-action="remove-plan" data-id="${e(p.id)}">削除</button></td></tr>`).join('')}</tbody></table></div>`:empty('一時的な予定はまだありません','賞与や旅行を追加すると年間予測に反映されます。')}
 <p class="tiny muted">※予定を実際の収支として登録したら、二重計上を防ぐため「実績反映済み」に変更してください。</p></section>`;
}
function settingsView(){
 const tabs=[['basic','基本設定'],['categories','カテゴリー'],['backup','データ管理']];
 let body='';
 if(ui.settingsTab==='basic')body=`<section class="panel">${sectionTitle('毎月の基本設定','年間の余剰金予測の精度に影響します')}<div class="settings-grid"><label>見込手取り月収（円）<input type="number" min="0" step="1" data-setting="monthlyIncome" value="${num(db.settings.monthlyIncome)}"><small class="muted">未記録月の収入予測に使います</small></label><label>月次平均を取る期間<select data-setting="avgMonths">${[1,2,3,6,12].map(n=>`<option value="${n}" ${db.settings.avgMonths===n?'selected':''}>直近${n}か月</option>`).join('')}</select><small class="muted">過去の実績がある月で平均</small></label><label>月の余剰資金目標（円）<input type="number" min="0" step="1" data-setting="monthlyGoal" value="${num(db.settings.monthlyGoal)}"><small class="muted">ホームの進捗ゲージに反映</small></label></div><div class="notice" style="margin-top:17px;margin-bottom:0">設定は自動保存されます。予測のためには費目ごとに「月の見込額」も登録するか、過去数か月の明細を記録してください。</div></section>`;
 if(ui.settingsTab==='categories')body=`<section class="panel">${sectionTitle('カテゴリーと予算','月の見込額は予測用、月予算は使いすぎ確認用です')}
 <div class="table-scroll"><table class="data-table"><thead><tr><th>カテゴリー名</th><th>種類</th><th>固定/変動</th><th class="number">月の見込額</th><th class="number">月予算</th><th></th></tr></thead><tbody>${db.categories.map(c=>`<tr><td><input class="edit-input name" data-category-id="${e(c.id)}" data-category-key="name" value="${e(c.name)}" aria-label="カテゴリー名"></td><td>${c.type==='expense'?'支出':'収入'}</td><td>${c.type==='expense'?`<select class="select-tiny" data-category-id="${e(c.id)}" data-category-key="kind"><option value="variable" ${c.kind==='variable'?'selected':''}>変動</option><option value="fixed" ${c.kind==='fixed'?'selected':''}>固定</option></select>`:'—'}</td><td class="number">${c.type==='expense'?`<input class="edit-input" type="number" min="0" data-category-id="${e(c.id)}" data-category-key="expected" value="${num(c.expected)}">`:'—'}</td><td class="number">${c.type==='expense'?`<input class="edit-input" type="number" min="0" data-category-id="${e(c.id)}" data-category-key="budget" value="${num(c.budget)}">`:'—'}</td><td><button class="btn small danger" data-action="remove-category" data-id="${e(c.id)}">削除</button></td></tr>`).join('')}</tbody></table></div>
 <form id="categoryForm" class="category-forms" style="margin-top:20px"><label class="field">新しいカテゴリー<input name="name" required maxlength="30" placeholder="例：ペット用品"></label><label class="field">種類<select name="type"><option value="expense">支出</option><option value="income">収入</option></select></label><button class="btn primary" type="submit">＋ 追加</button></form><p class="tiny muted">※明細に使っているカテゴリーは削除できません。予測の見込額を0円にした場合、記録済みの過去月平均を使用します。</p></section>`;
 if(ui.settingsTab==='backup')body=`<section class="panel">${sectionTitle('データの書き出しと復元','端末が変わってもファイル経由でデータを移せます')}
 <div class="grid-equal" style="margin:0"><div class="list-tile"><strong>JSONバックアップ</strong><p class="small-text muted">すべての明細・カテゴリー・予定・設定を1ファイルに保存。別の端末で復元できます。</p><div class="row-between"><button class="btn primary small" data-action="export-json">JSONを保存</button><button class="btn outline small" data-action="import-json">JSONから復元</button></div></div><div class="list-tile"><strong>CSV（表計算用）</strong><p class="small-text muted">Excel・スプレッドシートで確認するための取引明細を出力／取り込みできます。</p><div class="row-between"><button class="btn primary small" data-action="export-csv">CSVを保存</button><button class="btn outline small" data-action="import-csv">CSVを取り込む</button></div></div></div>
 <div class="notice" style="margin-top:17px">同じデータがMacとiPhoneに自動同期されるわけではありません。端末間で移す場合はJSONファイルを書き出して読み込んでください。ブラウザの履歴・Webサイトデータの削除や端末故障で記録が失われる場合があるため、定期的なファイル保存をおすすめします。</div>
 <div class="row-between"><span class="small-text muted">現在 ${db.transactions.length} 件の明細・${db.plans.length} 件の予定</span><button class="btn danger small" data-action="reset">すべてのデータを初期化</button></div></section><section class="panel">${sectionTitle('使い方を試す','操作を試すための架空データです')}<p class="small-text muted">食費や趣味の明細、給与を過去数か月分登録したデモデータを用意しています。ご自身の家計とは関係ありません。</p><button class="btn outline" data-action="demo">サンプルデータを入れる</button></section>`;
 return `<div class="section-bar"><div><h2>設定</h2><div class="muted tiny">データ・予測・カテゴリーをカスタマイズ</div></div></div><div class="subtabs">${tabs.map(([k,label])=>`<button class="${ui.settingsTab===k?'active':''}" data-action="settings-tab" data-tab="${k}">${label}</button>`).join('')}</div>${body}`;
}
const views={home:homeView,history:historyView,weekly:weeklyView,monthly:monthlyView,forecast:forecastView,settings:settingsView};
function render(){
 const navLabel=NAV.find(x=>x[0]===ui.page)?.[2]||'ホーム';
 $('#pageTitle').textContent=navLabel;
 $('#pageEyebrow').textContent=({home:'OVERVIEW',history:'TRANSACTIONS',weekly:'WEEKLY INSIGHTS',monthly:'MONTHLY INSIGHTS',forecast:'FORECAST',settings:'PREFERENCES'})[ui.page]||'FINANCE';
 $('#sideNav').innerHTML=NAV.map(([k,ic,txt])=>`<button type="button" class="nav-item ${ui.page===k?'active':''}" data-action="navigate" data-page="${k}" ${ui.page===k?'aria-current="page"':''}><span class="nav-ico">${ic}</span>${txt}</button>`).join('');
 $('#bottomNav').innerHTML=NAV.map(([k,ic,txt])=>`<button type="button" class="${ui.page===k?'active':''}" data-action="navigate" data-page="${k}" ${ui.page===k?'aria-current="page"':''}><span>${ic}</span>${txt}</button>`).join('');
 $('#view').innerHTML=(views[ui.page]||homeView)();
}
function fillDialogOptions(type,chosen=''){
 const cats=db.categories.filter(c=>c.type===type);
 $('#txCategory').innerHTML=type==='transfer'?'<option value="transfer">口座間移動（収支には計上しない）</option>':cats.map(c=>`<option value="${e(c.id)}" ${c.id===chosen?'selected':''}>${e(c.name)}</option>`).join('');
 $('#txPayment').innerHTML=payments().map(p=>`<option value="${e(p)}">${e(p)}</option>`).join('');
}
function setDialogType(type,catId){
 ui.entryType=type;
 $$('#typeSwitch button').forEach(b=>b.classList.toggle('active',b.dataset.type===type));
 fillDialogOptions(type,catId);
 $('#txCategory').disabled=type==='transfer';
}
function openDialog(tx=null){
 $('#transactionForm').reset();$('#txId').value=tx?.id||'';
 $('#dialogTitle').textContent=tx?'収支を編集':'収支を登録';
 $('#txDate').value=tx?.date||today();$('#txAmount').value=tx?.amount||'';
 $('#txMemo').value=tx?.memo||'';$('#txWithdrawal').value=tx?.withdrawal||'';
 $('#formError').textContent='';setDialogType(tx?.type||'expense',tx?.categoryId);
 if(tx?.payment)$('#txPayment').value=tx.payment;
 if(typeof $('#transactionDialog').showModal==='function')$('#transactionDialog').showModal();
 else $('#transactionDialog').setAttribute('open','');
}
function closeDialog(){const d=$('#transactionDialog');if(d.close)d.close();else d.removeAttribute('open');}
function saveTransaction(event){
 event.preventDefault();const id=$('#txId').value;
 const type=ui.entryType,date=$('#txDate').value,amount=Number($('#txAmount').value),categoryId=$('#txCategory').value,payment=$('#txPayment').value,withdrawal=$('#txWithdrawal').value,memo=$('#txMemo').value.trim();
 if(!safeDate(date)){ $('#formError').textContent='正しい日付を入力してください。';return;}
 if(!Number.isInteger(amount)||amount<=0||amount>100000000000){$('#formError').textContent='金額は1円以上の整数で入力してください。';return;}
 if(withdrawal&&!safeDate(withdrawal)){ $('#formError').textContent='引落日を正しく入力してください。';return;}
 if(type!=='transfer'&&!catBy(categoryId)){ $('#formError').textContent='カテゴリーを選んでください。';return;}
 const record={id:id||uid(),type,date,amount,categoryId:type==='transfer'?'transfer':categoryId,payment,withdrawal,memo};
 if(id){const i=db.transactions.findIndex(x=>x.id===id);if(i>=0)db.transactions[i]=record;else db.transactions.push(record);}
 else db.transactions.push(record);
 persist();closeDialog();ui.month=monthOf(date);render();toast(id?'明細を更新しました':'明細を登録しました');
}
function download(filename,text,mime='text/plain;charset=utf-8'){
 const blob=new Blob([text],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function exportJson(){download(`家計ラボ_バックアップ_${today()}.json`,JSON.stringify(db,null,2),'application/json;charset=utf-8');toast('JSONバックアップを保存しました');}
function csvCell(x){const s=String(x??'');return /[",\r\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
function exportCsv(){
 const headings=['ID','日付','区分','カテゴリー','金額','支払方法','引落日','メモ'];
 const rows=[headings,...db.transactions.sort((a,b)=>a.date.localeCompare(b.date)).map(t=>[t.id,t.date,({expense:'支出',income:'収入',transfer:'資金移動'})[t.type],catLabel(t.categoryId),t.amount,t.payment,t.withdrawal,t.memo])];
 download(`家計ラボ_取引明細_${today()}.csv`,'\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');toast('CSVを保存しました');
}
function readCsv(text){
 const res=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(ch===','&&!quoted){row.push(cell);cell='';}
  else if((ch==='\r'||ch==='\n')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))res.push(row);row=[];cell='';}
  else cell+=ch;
 }
 row.push(cell);if(row.some(x=>x!==''))res.push(row);
 return res;
}
async function importCsv(file){
 const rows=readCsv((await file.text()).replace(/^\ufeff/,''));if(rows.length<2){toast('CSVに明細がありません');return;}
 const head=rows.shift().map(s=>s.trim());
 const col={id:head.indexOf('ID'),date:head.indexOf('日付'),type:head.indexOf('区分'),cat:head.indexOf('カテゴリー'),amount:head.indexOf('金額'),payment:head.indexOf('支払方法'),withdrawal:head.indexOf('引落日'),memo:head.indexOf('メモ')};
 if(['date','type','cat','amount'].some(k=>col[k]<0)){alert('家計ラボから出力したCSVを選んでください（必須列がありません）。');return;}
 let newCount=0, skipped=0;const knownIds=new Set(db.transactions.map(t=>t.id));
 for(const row of rows){
  const date=row[col.date],amount=Number(row[col.amount]);
  const type=({'支出':'expense','収入':'income','資金移動':'transfer',expense:'expense',income:'income',transfer:'transfer'})[row[col.type]];
  if(!safeDate(date)||!type||!Number.isInteger(amount)||amount<=0){skipped++;continue;}
  let id=col.id>=0?row[col.id]:'';if(id&&knownIds.has(id)){skipped++;continue;}if(!id)id=uid();
  let cat='transfer';if(type!=='transfer'){
   let target=db.categories.find(c=>c.name===row[col.cat]&&c.type===type);
   if(!target){target={id:uid(),name:row[col.cat]||'その他',type,kind:'variable',expected:0,budget:0,color:PALETTE[db.categories.length%PALETTE.length]};db.categories.push(target);}
   cat=target.id;
  }
  db.transactions.push({id,type,date,categoryId:cat,amount,payment:col.payment>=0?(row[col.payment]||'その他'):'その他',withdrawal:col.withdrawal>=0&&safeDate(row[col.withdrawal])?row[col.withdrawal]:'',memo:col.memo>=0?row[col.memo]||'':''});
  knownIds.add(id);newCount++;
 }
 persist();render();toast(`${newCount}件取り込みました（スキップ${skipped}件）`);
}
async function importJson(file){
 try{
  const json=JSON.parse(await file.text());
  if(!Array.isArray(json.transactions)||!Array.isArray(json.categories))throw new Error('形式が異なります');
  if(!confirm(`JSONバックアップから復元します。現在の${db.transactions.length}件の明細と設定をすべて置き換えます。続けますか？`))return;
  db=normalize(json);persist();ui.month=nowMonth();render();toast('バックアップを復元しました');
 }catch(err){alert(`読み込めませんでした：${err.message}`);}
}
function demo(){
 if(db.transactions.length && !confirm('サンプルデータを追加します（既存の明細は残します）。続けますか？'))return;
 const start=monthPlus(nowMonth(),-3),food=db.categories.find(c=>c.name==='食費')?.id||'c1',hobby=db.categories.find(c=>c.name==='趣味・娯楽')?.id||'c7',daily=db.categories.find(c=>c.name==='日用品')?.id||'c2',house=db.categories.find(c=>c.name==='住居費')?.id||'c3',salary=db.categories.find(c=>c.name==='給与')?.id||'c13';
 db.settings.monthlyIncome=db.settings.monthlyIncome||270000;
 for(let m=0;m<=3;m++){
  const ym=monthPlus(start,m);const max=Math.min(daysIn(ym),ym===nowMonth()?dayOf(today()):31);
  const put=(d,type,categoryId,amount,payment,memo)=>db.transactions.push({id:uid(),date:`${ym}-${pad(d)}`,type,categoryId,amount,payment,withdrawal:'',memo});
  if(max>=5)put(5,'income',salary,270000,'銀行振替','サンプル給与');
  if(max>=2)put(2,'expense',house,60000,'銀行振替','サンプル家賃');
  for(let d=1;d<=max;d+=3){put(d,'expense',food,800+(d*73+m*139)%1800,'楽天カード','サンプル食費');if(d%2===1)put(d,'expense',hobby,400+(d*113+m*53)%1900,'PayPay','サンプル趣味');if(d%3===1)put(d,'expense',daily,200+(d*29)%700,'現金','サンプル日用品');}
 }
 persist();render();toast('架空のサンプル明細を追加しました');
}
// クリック・入力イベントは委譲して描画後も継続利用
 document.addEventListener('click',event=>{
  const b=event.target.closest('[data-action]');if(!b)return;
  const action=b.dataset.action,id=b.dataset.id;
  if(action==='navigate'){ui.page=b.dataset.page;render();window.scrollTo({top:0,behavior:'smooth'});}
  if(action==='new-transaction')openDialog();
  if(action==='close-dialog')closeDialog();
  if(action==='month-prev'||action==='month-next'){ui.month=monthPlus(ui.month,action==='month-prev'?-1:1);render();}
  if(action==='edit-tx'){const tx=db.transactions.find(t=>t.id===id);if(tx)openDialog(tx);}
  if(action==='remove-tx'&&confirm('この明細を削除しますか？')){db.transactions=db.transactions.filter(t=>t.id!==id);persist();render();toast('削除しました');}
  if(action==='settings-tab'){ui.settingsTab=b.dataset.tab;render();}
  if(action==='toggle-plan'){const p=db.plans.find(p=>p.id===id);if(p){p.done=!p.done;persist();render();}}
  if(action==='remove-plan'&&confirm('この予定を削除しますか？')){db.plans=db.plans.filter(p=>p.id!==id);persist();render();}
  if(action==='remove-category'){
   if(db.transactions.some(t=>t.categoryId===id)){toast('このカテゴリーは明細で使用中のため削除できません');return;}
   const c=catBy(id);if(c&&confirm(`「${c.name}」を削除しますか？`)){db.categories=db.categories.filter(x=>x.id!==id);persist();render();}
  }
  if(action==='export-json')exportJson();
  if(action==='import-json')$('#jsonFile').click();
  if(action==='export-csv')exportCsv();
  if(action==='import-csv')$('#csvFile').click();
  if(action==='demo')demo();
  if(action==='reset'&&confirm('すべての明細・設定・予定を完全に初期化します。元に戻せません。実行しますか？')){db=fresh();persist();ui.month=nowMonth();ui.page='home';render();toast('初期化しました');}
 });
 document.addEventListener('change',event=>{
  const t=event.target;
  if(t.id==='filterType'){ui.filterType=t.value;render();}
  if(t.id==='filterCategory'){ui.filterCategory=t.value;render();}
  if(t.id==='forecastYear'){ui.year=Number(t.value);render();}
  if(t.dataset.setting){db.settings[t.dataset.setting]=num(t.value);if(t.dataset.setting==='avgMonths')db.settings.avgMonths=Math.max(1,Math.min(12,db.settings.avgMonths));persist();render();toast('設定を保存しました');}
  if(t.dataset.categoryId){const cat=catBy(t.dataset.categoryId);if(!cat)return;const key=t.dataset.categoryKey;if(key==='name'){const value=t.value.trim();if(value)cat.name=value;}else if(key==='kind'){cat.kind=t.value==='fixed'?'fixed':'variable';}else if(['expected','budget'].includes(key)){cat[key]=num(t.value);}persist();render();toast('カテゴリーを更新しました');}
 });
 document.addEventListener('input',event=>{
  if(event.target.id==='searchTx'){
    const input=event.target;ui.search=input.value;
    const sel=input.selectionStart;
    render();const next=$('#searchTx');next?.focus();next?.setSelectionRange(sel,sel);
  }
 });
 document.addEventListener('submit',event=>{
  if(event.target.id==='transactionForm')return saveTransaction(event);
  if(event.target.id==='categoryForm'){
   event.preventDefault();const fd=new FormData(event.target),name=String(fd.get('name')||'').trim().slice(0,30),type=fd.get('type');
   if(!name)return;if(db.categories.some(c=>c.name===name&&c.type===type)){toast('同じ名前のカテゴリーがあります');return;}
   db.categories.push({id:uid(),name,type,kind:'variable',budget:0,expected:0,color:PALETTE[db.categories.length%PALETTE.length]});persist();render();toast('カテゴリーを追加しました');
  }
  if(event.target.id==='planForm'){
   event.preventDefault();const fd=new FormData(event.target),month=String(fd.get('month')),amount=Number(fd.get('amount')),name=String(fd.get('name')||'').trim();
   if(!/^\d{4}-\d{2}$/.test(month)||!name||!Number.isInteger(amount)||amount<=0){toast('予定の入力を確認してください');return;}
   db.plans.push({id:uid(),month,type:fd.get('type')==='income'?'income':'expense',name,amount,done:false});persist();render();toast('予定を追加しました');
  }
 });
 $('#typeSwitch').addEventListener('click',event=>{const b=event.target.closest('[data-type]');if(b)setDialogType(b.dataset.type);});
 $('#jsonFile').addEventListener('change',async event=>{const f=event.target.files[0];if(f)await importJson(f);event.target.value='';});
 $('#csvFile').addEventListener('change',async event=>{const f=event.target.files[0];if(f)await importCsv(f);event.target.value='';});
 window.addEventListener('storage',event=>{if(event.key===KEY){db=load();render();toast('別のタブでの変更を反映しました');}});
 render();
 // HTTPS上のPWAでは、2回目以降は通信なしで起動可能。
 if('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('SW registration failed:',err)));
 }
})();
