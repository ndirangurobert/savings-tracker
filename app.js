(() => {
  const KEY = "savewise-v1";
  const $ = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value) || 0);
  const dateText = (value) => new Date(value + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  const today = () => new Date().toISOString().slice(0, 10);
  const monthKey = (date) => date.slice(0, 7);
  const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const starter = { transactions: [], goals: [] };
  let state;
  try { state = JSON.parse(localStorage.getItem(KEY)) || starter; } catch { state = starter; }
  state.transactions ||= []; state.goals ||= [];
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));
  const balance = () => state.transactions.reduce((sum, t) => sum + (t.type === "deposit" ? t.amount : -t.amount), 0);
  const deposits = () => state.transactions.filter(t => t.type === "deposit").reduce((s,t) => s+t.amount,0);
  const withdrawals = () => state.transactions.filter(t => t.type === "withdrawal").reduce((s,t) => s+t.amount,0);
  const toast = (message) => { const el=$("toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove("show"),2600); };
  const sortNewest = (items) => [...items].sort((a,b)=>b.date.localeCompare(a.date) || b.id-a.id);

  function render() {
    const currentMonth = monthKey(today());
    const monthTotal = state.transactions.filter(t=>t.type==="deposit" && monthKey(t.date)===currentMonth).reduce((s,t)=>s+t.amount,0);
    const active = state.goals.filter(g=>g.saved<g.target);
    const targetSum = state.goals.reduce((s,g)=>s+g.target,0);
    const savedSum = state.goals.reduce((s,g)=>s+Math.min(g.saved,g.target),0);
    $("totalSavings").textContent=money(balance()); $("monthSavings").textContent=money(monthTotal);
    $("activeGoals").textContent=active.length; $("overallProgress").textContent=(targetSum?Math.round(savedSum/targetSum*100):0)+"%";
    $("goalTargetTotal").textContent=money(targetSum); $("goalSavedTotal").textContent=money(savedSum);
    $("goalCompleted").textContent=state.goals.filter(g=>g.saved>=g.target).length;
    $("reportDeposits").textContent=money(deposits()); $("reportWithdrawals").textContent=money(withdrawals());
    $("reportNet").textContent=money(balance()); $("reportCount").textContent=state.transactions.length;
    renderGoals(); renderTransactions(); renderChart(); renderReport();
  }
  function goalMarkup(g, card=false) {
    const pct=Math.min(100,Math.round(g.saved/g.target*100));
    return card ? `<article class="goal-card"><div class="goal-card-head"><span class="goal-emoji">${escapeHTML(g.icon)}</span><button class="goal-delete" data-delete-goal="${g.id}" title="Delete goal" aria-label="Delete ${escapeHTML(g.name)}">×</button></div><h3>${escapeHTML(g.name)}</h3><p class="muted">${g.deadline?"Target date: "+dateText(g.deadline):"No target date set"}</p><div class="goal-big">${money(g.saved)}</div><div class="muted">of ${money(g.target)} saved</div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><div class="goal-card-foot"><strong>${pct}% complete</strong><span>${money(Math.max(0,g.target-g.saved))} to go</span></div></article>` : `<div><div class="goal-item-top"><span class="goal-title">${escapeHTML(g.name)}</span><span class="goal-amount">${money(g.saved)} / ${money(g.target)}</span></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div><div class="progress-meta"><span>${pct}% complete</span><span>${g.deadline?dateText(g.deadline):"Keep going"}</span></div></div>`;
  }
  function renderGoals() {
    $("overviewGoals").innerHTML=state.goals.length?state.goals.slice(0,3).map(g=>goalMarkup(g)).join(""):'<div class="empty-state compact">No goals yet. Create one to get started.</div>';
    $("allGoals").innerHTML=state.goals.length?state.goals.map(g=>goalMarkup(g,true)).join(""):'<div class="panel empty-state">No savings goals yet. Create your first goal and start tracking progress.</div>';
  }
  function rowMarkup(t, showDelete=false) {
    const deposit=t.type==="deposit";
    return `<tr><td><div class="transaction-name"><span class="transaction-icon ${deposit?"":"withdrawal"}">${deposit?"↙":"↗"}</span><span>${escapeHTML(t.description)}${t.note?'<small style="display:block;color:#9aa5b3;font-weight:400;margin-top:3px">'+escapeHTML(t.note)+'</small>':""}</span></div></td><td>${dateText(t.date)}</td><td><span class="type-pill ${deposit?"":"withdrawal"}">${deposit?"Deposit":"Withdrawal"}</span></td><td class="align-right amount-cell ${deposit?"":"negative"}">${deposit?"+":"−"} ${money(t.amount)}</td>${showDelete?'<td class="align-right"><button class="delete-button" data-delete-transaction="'+t.id+'" title="Delete transaction" aria-label="Delete transaction">×</button></td>':""}</tr>`;
  }
  function renderTransactions() {
    const newest=sortNewest(state.transactions);
    $("recentRows").innerHTML=newest.length?newest.slice(0,5).map(t=>rowMarkup(t)).join(""):'<tr><td colspan="4" class="empty-state">No transactions yet. Add your first deposit.</td></tr>';
    const months=[...new Set(newest.map(t=>monthKey(t.date)))].sort().reverse();
    const filter=$("monthFilter"), selected=filter.value;
    filter.innerHTML='<option value="all">All dates</option>'+months.map(m=>`<option value="${m}">${new Date(m+"-01T00:00:00").toLocaleDateString("en",{month:"long",year:"numeric"})}</option>`).join("");
    if(months.includes(selected)) filter.value=selected;
    const query=$("searchTransactions").value.toLowerCase(), type=$("typeFilter").value, month=filter.value;
    const filtered=newest.filter(t=>(t.description+" "+(t.note||"")).toLowerCase().includes(query)&&(type==="all"||t.type===type)&&(month==="all"||monthKey(t.date)===month));
    $("transactionRows").innerHTML=filtered.map(t=>rowMarkup(t,true)).join("");
    $("transactionEmpty").classList.toggle("hidden",filtered.length!==0);
  }
  function renderChart() {
    const months=[]; const now=new Date();
    for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:d.toISOString().slice(0,7),label:d.toLocaleDateString("en",{month:"short"})});}
    const values=months.map(m=>state.transactions.filter(t=>t.type==="deposit"&&monthKey(t.date)===m.key).reduce((s,t)=>s+t.amount,0));
    const max=Math.max(...values,1000); const points=values.map((v,i)=>({x:12+i*596/5,y:178-(v/max)*150}));
    const line=points.map((p,i)=>(i?"L":"M")+p.x+","+p.y).join(" ");
    $("chartLine").setAttribute("d",line); $("chartArea").setAttribute("d",line+" L608,190 L12,190 Z");
    $("chartDots").innerHTML=points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#fff" stroke="#43b88c" stroke-width="2.5"/>`).join("");
    $("chartLabels").innerHTML=months.map(m=>"<span>"+m.label+"</span>").join("");
  }
  function renderReport() {
    const now=new Date(), months=[];
    for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:d.toISOString().slice(0,7),label:d.toLocaleDateString("en",{month:"short",year:"numeric"})});}
    const data=months.map(m=>{const dep=state.transactions.filter(t=>t.type==="deposit"&&monthKey(t.date)===m.key).reduce((s,t)=>s+t.amount,0);const wd=state.transactions.filter(t=>t.type==="withdrawal"&&monthKey(t.date)===m.key).reduce((s,t)=>s+t.amount,0);return {...m,dep,wd};});
    const max=Math.max(...data.map(x=>x.dep),1);
    $("monthlyBreakdown").innerHTML=data.map(m=>`<div class="month-row"><strong>${m.label}</strong><div><div class="month-bar"><span style="width:${m.dep/max*100}%"></span></div><small style="color:#b0b8c2">Withdrawals: ${money(m.wd)}</small></div><span class="month-value">${money(m.dep)}</span></div>`).join("");
  }
  function navigate(view) {
    document.querySelectorAll(".page-view").forEach(el=>el.classList.remove("active"));
    $(view+"View").classList.add("active");
    document.querySelectorAll(".nav-link").forEach(el=>el.classList.toggle("active",el.dataset.view===view));
    $("pageCrumb").textContent=view[0].toUpperCase()+view.slice(1);
    $("sidebar").classList.remove("open");
    if(view==="transactions")renderTransactions();
  }
  function exportCSV() {
    const rows=[["Description","Date","Type","Amount (KES)","Note"],...sortNewest(state.transactions).map(t=>[t.description,t.date,t.type,t.amount,t.note||""])];
    const csv=rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\n");
    const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="savewise-transactions.csv";a.click();URL.revokeObjectURL(url);toast("Your CSV export is ready.");
  }
  function openTransaction() { $("transactionForm").reset(); $("transactionForm").elements.date.value=today(); $("transactionError").textContent=""; $("transactionModalTitle").textContent="Add transaction"; $("transactionDialog").showModal(); }
  function openGoal() { $("goalForm").reset(); $("goalError").textContent=""; $("goalDialog").showModal(); }

  document.querySelectorAll(".nav-link").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.view)));
  document.querySelectorAll("[data-go-view]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.goView)));
  $("quickAdd").addEventListener("click",openTransaction); $("transactionAdd").addEventListener("click",openTransaction); $("goalAdd").addEventListener("click",openGoal);
  $("mobileMenu").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.close).close()));
  $("transactionForm").addEventListener("submit",e=>{
    e.preventDefault();const f=new FormData(e.currentTarget),amount=Number(f.get("amount")),type=f.get("type");
    if(!Number.isFinite(amount)||amount<=0){$("transactionError").textContent="Enter an amount greater than zero.";return;}
    if(type==="withdrawal"&&amount>balance()){$("transactionError").textContent="This withdrawal is higher than your current savings balance.";return;}
    state.transactions.push({id:Date.now(),description:f.get("description").trim(),amount,type,date:f.get("date"),note:f.get("note").trim()});
    save();$("transactionDialog").close();render();toast(type==="deposit"?"Deposit added successfully.":"Withdrawal recorded.");
  });
  $("goalForm").addEventListener("submit",e=>{
    e.preventDefault();const f=new FormData(e.currentTarget),target=Number(f.get("target")),saved=Number(f.get("saved"));
    if(target<=0||saved<0||saved>target){$("goalError").textContent="Enter a valid target and an amount saved between zero and the target.";return;}
    state.goals.push({id:Date.now(),name:f.get("name").trim(),target,saved,deadline:f.get("deadline"),icon:f.get("icon")});
    save();$("goalDialog").close();render();toast("Your savings goal has been created.");
  });
  $("searchTransactions").addEventListener("input",renderTransactions);$("typeFilter").addEventListener("change",renderTransactions);$("monthFilter").addEventListener("change",renderTransactions);
  document.addEventListener("click",e=>{
    const delT=e.target.closest("[data-delete-transaction]");if(delT){const id=Number(delT.dataset.deleteTransaction);if(confirm("Delete this transaction? Your balance and reports will be updated.")){state.transactions=state.transactions.filter(t=>t.id!==id);save();render();toast("Transaction deleted.");}}
    const delG=e.target.closest("[data-delete-goal]");if(delG){const id=Number(delG.dataset.deleteGoal);if(confirm("Delete this savings goal?")){state.goals=state.goals.filter(g=>g.id!==id);save();render();toast("Goal deleted.");}}
  });
  $("exportBtn").addEventListener("click",exportCSV);$("reportExport").addEventListener("click",exportCSV);
  const now=new Date();$("todayLabel").textContent=now.toLocaleDateString("en",{weekday:"short",day:"numeric",month:"short"});$("dateLong").textContent=now.toLocaleDateString("en",{weekday:"long",day:"numeric",month:"long"});
  render();
})();