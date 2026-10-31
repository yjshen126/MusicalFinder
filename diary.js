window.createMujianDiary = function ({shows,allSessions,poster,esc,format,today,idFor,update}) {
  const storageKey='mujian-diary-v1'
  let records=[]
  try { const saved=JSON.parse(localStorage.getItem(storageKey)||'[]'); if(Array.isArray(saved)) records=saved.filter(x=>x&&typeof x.id==='string'&&typeof x.date==='string') } catch (_) {}
  const sessions=new Map(allSessions.map(x=>[idFor(x.show,x.session),x]))
  const titleMap=new Map()
  for(const s of shows){if(!titleMap.has(s.title))titleMap.set(s.title,[]);titleMap.get(s.title).push(s)}
  const state={month:today.slice(0,7),day:today,mode:'',query:'',title:'',filterDate:'',chosen:'',edit:'',price:'',rating:'',review:''}
  const monthKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  const dayKey=(year,month,day)=>`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  const monthTitle=m=>`${Number(m.slice(0,4))} 年 ${Number(m.slice(5,7))} 月`
  const lookup=record=>sessions.get(record.id)||{show:{id:record.showId,title:record.title},session:{date:record.date,time:record.time}}
  const inMonth=()=>records.filter(r=>r.date.startsWith(state.month))
  const imageFor=r=>poster(lookup(r).show)
  const colors=['#eeeeef','#ffe8eb','#ffd9df','#ffc8d1','#ffb6c2','#ffa0b0','#ff879c','#ff7089','#f65272','#e7355b','#c91942']
  const selectedEntries=()=>records.filter(r=>r.date===state.day).sort((a,b)=>a.time.localeCompare(b.time))
  function heatmap(){
    const year=Number(state.month.slice(0,4)),counts=Array(12).fill(0)
    records.forEach(r=>{if(Number(r.date.slice(0,4))===year){const m=Number(r.date.slice(5,7));if(m>=1&&m<=12)counts[m-1]++}})
    return `<section class="diary-heat"><div class="diary-section-title"><strong>${year} 年观剧足迹</strong><span>${counts.reduce((a,b)=>a+b,0)} 场</span></div><div class="heat-months">${counts.map((n,i)=>{const value=`${year}-${String(i+1).padStart(2,'0')}`;return `<button class="heat-month ${state.month===value?'active':''}" data-diary="heat-month" data-month="${value}" aria-label="${year}年${i+1}月，${n}场" title="${n} 场"><span>${i+1}月</span><i style="background:${colors[Math.min(n,10)]}"></i><small>${n||'—'}</small></button>`}).join('')}</div><div class="heat-legend"><span>少</span>${[0,2,4,6,8,10].map(i=>`<i style="background:${colors[i]}"></i>`).join('')}<span>10 场及以上</span></div></section>`
  }
  function grid(){
    const [year,month]=state.month.split('-').map(Number),first=new Date(year,month-1,1).getDay(),days=new Date(year,month,0).getDate(),cells=[]
    for(let i=0;i<(first+6)%7;i++)cells.push('<span class="diary-blank"></span>')
    for(let day=1;day<=days;day++){
      const date=dayKey(year,month,day),list=records.filter(r=>r.date===date),images=list.slice(0,3).map(imageFor).join('')
      cells.push(`<button class="diary-day ${date===state.day?'active':''} ${date===today?'today':''}" data-diary="day" data-date="${date}" aria-label="${esc(format(date))}，${list.length} 场"><span class="diary-day-number">${day}</span><span class="diary-day-posters">${images}${list.length>3?`<span class="diary-more">+${list.length-3}</span>`:''}</span></button>`)
    }
    return `<div class="diary-week">${['一','二','三','四','五','六','日'].map(x=>`<span>${x}</span>`).join('')}</div><div class="diary-grid">${cells.join('')}</div>`
  }
  function entries(){
    const list=selectedEntries()
    if(!list.length)return `<div class="diary-empty-day">这天还没有观剧记录</div>`
    return `<div class="diary-entries">${list.map(r=>{const {show,session}=lookup(r);return `<button class="diary-entry" data-diary="edit" data-id="${esc(r.id)}">${poster(show)}<span class="diary-entry-copy"><strong>${esc(r.title||show.title)}</strong><span>${esc(r.time||session.time)} · ${esc(r.city||show.city)}${r.price!==''&&r.price!=null?` · ¥${esc(r.price)}`:''}</span>${r.rating?`<span class="diary-stars">${'★'.repeat(Number(r.rating))}${'☆'.repeat(5-Number(r.rating))}</span>`:''}${r.review?`<span class="diary-review">${esc(r.review)}</span>`:''}</span><span class="row-chevron">›</span></button>`}).join('')}</div>`
  }
  function searchResults(){
    const q=state.query.trim().toLowerCase();if(!q)return '<p class="diary-helper">输入剧名，选择看过或计划看的场次</p>'
    const titles=Array.from(titleMap.keys()).filter(t=>t.toLowerCase().includes(q)).sort((a,b)=>Number(!a.toLowerCase().startsWith(q))-Number(!b.toLowerCase().startsWith(q))||a.length-b.length).slice(0,12)
    return titles.length?titles.map(t=>{const group=titleMap.get(t),count=group.reduce((n,s)=>n+s.schedules.length,0);return `<button class="diary-search-result" data-diary="title" data-title="${esc(t)}">${poster(group[0])}<span><strong>${esc(t)}</strong><small>${count} 场 · ${new Set(group.map(s=>s.city)).size} 个城市</small></span><span class="row-chevron">›</span></button>`}).join(''):'<p class="diary-helper">没有找到相关剧目，试试其他剧名</p>'
  }
  function sessionResults(){
    const groups=titleMap.get(state.title)||[],items=groups.flatMap(show=>show.schedules.map(session=>({show,session}))).filter(x=>!state.filterDate||x.session.date===state.filterDate).sort((a,b)=>Number(a.session.date<today)-Number(b.session.date<today)||(a.session.date<today?b.session.date.localeCompare(a.session.date):a.session.date.localeCompare(b.session.date))||a.session.time.localeCompare(b.session.time))
    const visible=items.slice(0,80)
    return `${!state.filterDate&&items.length>80?'<p class="diary-helper">场次较多，可选择日期快速查找</p>':''}${visible.map(({show,session})=>`<button class="diary-session-option" data-diary="choose" data-id="${esc(idFor(show,session))}"><span><strong>${esc(format(session.date))} ${esc(session.time)}</strong><small>${esc(show.city)} · ${esc(show.venue)}${session.date<today?' · 已结束':''}</small></span><span class="row-chevron">›</span></button>`).join('')||'<p class="diary-helper">该日期没有找到场次，试试其他日期</p>'}`
  }
  function modal(){
    if(!state.mode)return ''
    if(state.mode==='search')return `<div class="diary-overlay"><section class="diary-sheet" role="dialog" aria-modal="true" aria-label="添加观剧"><div class="diary-sheet-head"><strong>添加观剧</strong><button data-diary="close" aria-label="关闭">×</button></div><div class="diary-sheet-body"><div class="search-box"><span>⌕</span><input id="diary-search" type="search" value="${esc(state.query)}" placeholder="搜索剧名" autocomplete="off"></div><div id="diary-search-results">${searchResults()}</div></div></section></div>`
    if(state.mode==='sessions')return `<div class="diary-overlay"><section class="diary-sheet" role="dialog" aria-modal="true" aria-label="选择场次"><div class="diary-sheet-head"><button data-diary="back-search" aria-label="返回">‹</button><strong>选择场次</strong><button data-diary="close" aria-label="关闭">×</button></div><div class="diary-sheet-body"><h2>${esc(state.title)}</h2><label class="diary-date-filter">按日期查找 <input id="diary-filter-date" type="date" value="${esc(state.filterDate)}"></label><div id="diary-session-results">${sessionResults()}</div></div></section></div>`
    const match=sessions.get(state.chosen), existing=records.find(r=>r.id===state.edit), show=match?.show||{title:existing?.title||'演出',city:existing?.city||'',venue:existing?.venue||''}, session=match?.session||{date:existing?.date||'',time:existing?.time||''}
    return `<div class="diary-overlay"><section class="diary-sheet diary-form-sheet" role="dialog" aria-modal="true" aria-label="观剧记录"><div class="diary-sheet-head"><button data-diary="back-sessions" aria-label="返回">‹</button><strong>${state.edit?'编辑观剧记录':'填写观剧记录'}</strong><button data-diary="close" aria-label="关闭">×</button></div><form id="diary-form" class="diary-sheet-body"><div class="diary-chosen">${poster(show)}<span><strong>${esc(show.title)}</strong><small>${esc(format(session.date))} ${esc(session.time)}</small><small>${esc(show.city)} · ${esc(show.venue)}</small></span></div><label class="diary-field">票价 <span>元，可不填</span><input name="price" type="number" min="0" max="1000000" step="0.01" inputmode="decimal" placeholder="填写实际花费" value="${esc(state.price)}"></label><label class="diary-field">评分 <span>可不填</span><select name="rating"><option value="">暂不评分</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${String(n)===String(state.rating)?'selected':''}>${'★'.repeat(n)}${'☆'.repeat(5-n)}</option>`).join('')}</select></label><label class="diary-field">观剧评价 <span>可不填</span><textarea name="review" maxlength="2000" rows="4" placeholder="写下你的观剧感受">${esc(state.review)}</textarea></label><button class="diary-save" type="submit">保存记录</button>${state.edit?'<button class="diary-delete" type="button" data-diary="delete">删除这条记录</button>':''}</form></section></div>`
  }
  function page(){
    const monthRecords=inMonth(),prices=monthRecords.filter(r=>r.price!==''&&r.price!=null),total=prices.reduce((n,r)=>n+Number(r.price||0),0)
    return `<div class="diary-page"><div class="diary-top"><div><h1>观剧日历</h1><p>记录每一次走进剧场</p></div><button class="diary-add" data-diary="add">＋ 添加</button></div><div class="diary-month-header"><button data-diary="month-prev" aria-label="上个月">‹</button><strong>${monthTitle(state.month)}</strong><button data-diary="month-next" aria-label="下个月">›</button></div><div class="diary-month-summary">${monthRecords.length} 场${prices.length?` · 已记录 ¥${total.toFixed(2).replace(/\.00$/,'')}`:''}</div>${grid()}<section class="diary-day-section"><div class="diary-section-title"><strong>${esc(format(state.day))}</strong><span>${selectedEntries().length} 场</span></div>${entries()}</section>${heatmap()}<p class="diary-local-note">记录仅保存在当前浏览器</p>${modal()}</div>`
  }
  function updateSearch(){const node=document.querySelector('#diary-search-results');if(node)node.innerHTML=searchResults()}
  function click(e){
    const button=e.target.closest('[data-diary]');if(!button)return false
    e.preventDefault();const action=button.dataset.diary
    if(action==='add'){Object.assign(state,{mode:'search',query:'',title:'',filterDate:'',chosen:'',edit:'',price:'',rating:'',review:''});update();document.querySelector('#diary-search')?.focus()}
    else if(action==='close'){state.mode='';update()}
    else if(action==='title'){state.title=button.dataset.title;state.filterDate='';state.mode='sessions';update()}
    else if(action==='back-search'){state.mode='search';update()}
    else if(action==='back-sessions'){if(state.edit){state.mode='';update()}else{state.mode='sessions';update()}}
    else if(action==='choose'){const found=records.find(r=>r.id===button.dataset.id);Object.assign(state,{chosen:button.dataset.id,edit:found?.id||'',price:found?.price??'',rating:found?.rating??'',review:found?.review??'',mode:'form'});update()}
    else if(action==='edit'){const found=records.find(r=>r.id===button.dataset.id);if(found){Object.assign(state,{chosen:found.id,edit:found.id,price:found.price??'',rating:found.rating??'',review:found.review??'',mode:'form'});update()}}
    else if(action==='day'){state.day=button.dataset.date;update()}
    else if(action==='heat-month'){state.month=button.dataset.month;state.day=state.month+'-01';update()}
    else if(action==='month-prev'||action==='month-next'){const [y,m]=state.month.split('-').map(Number),d=new Date(y,m-1+(action==='month-next'?1:-1),1);state.month=monthKey(d);state.day=state.month+'-01';update()}
    else if(action==='delete'){if(confirm('确定删除这条观剧记录？')){const next=records.filter(r=>r.id!==state.edit);try{localStorage.setItem(storageKey,JSON.stringify(next));records=next;state.mode='';update()}catch(_){alert('保存失败，请检查浏览器存储空间。')}}}
    return true
  }
  function input(e){if(e.target.id==='diary-search'){state.query=e.target.value;if(!e.isComposing)updateSearch();return true}return false}
  function compositionEnd(e){if(e.target.id==='diary-search'){state.query=e.target.value;updateSearch();return true}return false}
  function change(e){if(e.target.id==='diary-filter-date'){state.filterDate=e.target.value;document.querySelector('#diary-session-results').innerHTML=sessionResults();return true}return false}
  function submit(e){
    if(e.target.id!=='diary-form')return false;e.preventDefault()
    const form=new FormData(e.target),price=String(form.get('price')||'').trim(),rating=String(form.get('rating')||''),review=String(form.get('review')||'').trim(),match=sessions.get(state.chosen),old=records.find(r=>r.id===state.edit)
    if(price!==''&&(!Number.isFinite(Number(price))||Number(price)<0)){alert('请输入有效的非负票价');return true}
    if(!match&&!old){alert('找不到该场次，请重新选择');return true}
    const record=match?{id:state.chosen,showId:match.show.id,title:match.show.title,city:match.show.city,venue:match.show.venue,date:match.session.date,time:match.session.time,price,rating,review}:{...old,price,rating,review}
    const next=records.filter(r=>r.id!==record.id).concat(record)
    try{localStorage.setItem(storageKey,JSON.stringify(next));records=next;state.month=record.date.slice(0,7);state.day=record.date;state.mode='';update()}catch(_){alert('保存失败，请检查浏览器存储空间。')}
    return true
  }
  return {page,click,input,compositionEnd,change,submit}
}
