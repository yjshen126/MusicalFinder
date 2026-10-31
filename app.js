(() => {
  const { shows } = window.MUJIAN_DATA
  // 保留现有未来场次；历史只追加缺失场次，并使用相同的稳定标识。
  if(window.MUJIAN_HISTORY?.shows){const byId=new Map(shows.map(s=>[s.id,s]));for(const old of window.MUJIAN_HISTORY.shows){let current=byId.get(old.id);if(!current){current={...old,schedules:[]};shows.push(current);byId.set(old.id,current)}const ids=new Set(current.schedules.map(s=>s.slotId));for(const slot of old.schedules)if(!ids.has(slot.slotId)){current.schedules.push(slot);ids.add(slot.slotId)}current.schedules.sort((a,b)=>`${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))}}
  const main = document.querySelector('#main'), nav = document.querySelector('.tabbar')
  const icons = {
    calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M12 14h2M17 14h.1M7 18h2M12 18h2"/>',
    diary:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18M11 8h5M11 12h5M11 16h3"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    heart:'<path d="M20.7 5.8a5.2 5.2 0 0 0-7.4 0L12 7.1l-1.3-1.3a5.2 5.2 0 0 0-7.4 7.4L12 22l8.7-8.8a5.2 5.2 0 0 0 0-7.4Z"/>',
    pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    down:'<path d="m7 10 5 5 5-5"/>', back:'<path d="m15 18-6-6 6-6"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>', ticket:'<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6Z"/><path d="M13 8v2m0 4v2"/>'
  }
  const icon=(n,extra='')=>`<svg class="icon ${extra}" viewBox="0 0 24 24" aria-hidden="true">${icons[n]}</svg>`
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
  const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const parse=d=>new Date(`${d}T12:00:00`), weekdays=['周日','周一','周二','周三','周四','周五','周六']
  const format=d=>{const x=parse(d);return `${x.getFullYear()!==new Date().getFullYear()?x.getFullYear()+'年':''}${x.getMonth()+1}月${x.getDate()}日 ${weekdays[x.getDay()]}`}
  const dates=Array.from(new Set(shows.flatMap(s=>s.schedules.map(x=>x.date)))).sort(), today=key(new Date())
  const cities=Array.from(new Set(shows.map(s=>s.city))).sort((a,b)=>a.localeCompare(b,'zh-Hans-CN'))
  const hot=['上海','北京','广州','深圳','杭州','南京','成都','武汉','西安','重庆','天津','长沙'].filter(c=>cities.includes(c))
  const allSessions=shows.flatMap(show=>show.schedules.map(session=>({show,session}))).sort((a,b)=>Number(a.session.date<today)-Number(b.session.date<today)||a.session.date.localeCompare(b.session.date)||a.session.time.localeCompare(b.session.time))
  const actors=cast=>(cast||'').split(/[、，,]/).map(s=>s.trim().replace(/[（(].*$/,'').trim()).filter(Boolean)
  const venueKey=s=>`${s.city}｜${s.venue}`
  const idFor=(s,x)=>`${s.id}|${x.slotId}`
  const byUpcoming=(a,b)=>Number(a.date<today)-Number(b.date<today)||a.date.localeCompare(b.date)||a.time.localeCompare(b.time)
  const TYPES={session:'单场',show:'剧目',actor:'演员',venue:'剧院'}
  let favorites={session:[],show:[],actor:[],venue:[]}
  try {
    const saved=JSON.parse(localStorage.getItem('mujian-favorites-v2')||'null')
    if(saved && typeof saved==='object') {
      for(const type of Object.keys(TYPES)) if(Array.isArray(saved[type])) favorites[type]=saved[type].filter(x=>typeof x==='string')
    }
    if(!saved){const old=JSON.parse(localStorage.getItem('mujian-favorites')||'[]');if(Array.isArray(old)) favorites.show=Array.from(new Set(old.map(id=>shows.find(s=>s.id===id)?.title).filter(Boolean)))}
  } catch (_) {}
  const initialDate=dates.find(d=>d>=today)||dates[dates.length-1]
  const state={tab:'schedule',city:cities.includes('上海')?'上海':cities[0],searchCity:'',date:initialDate,browseDate:initialDate,dateAnchor:initialDate<today?initialDate:today,query:'',searchDraft:'',cityOpen:false,cityQuery:'',detail:null,slot:null,castFilter:[],castDraft:[],castQuery:'',castOpen:false,favTab:'session',related:null,relatedOrigin:null,actor:null,actorWork:null,actorHistory:[],limit:12}
  const save=()=>{try{localStorage.setItem('mujian-favorites-v2',JSON.stringify(favorites))}catch(_){}}
  const toggle=(type,value)=>{favorites[type]=favorites[type].includes(value)?favorites[type].filter(x=>x!==value):favorites[type].concat(value);save()}
  const favoriteButton=(type,value,label)=>`<button class="follow ${favorites[type].includes(value)?'on':''}" data-action="toggle" data-type="${type}" data-value="${esc(value)}" aria-pressed="${favorites[type].includes(value)}">${icon('heart')} ${favorites[type].includes(value)?'已关注':esc(label)}</button>`
  const empty=(title,body)=>`<div class="empty">${icon('ticket','empty-icon')}<strong>${title}</strong><span>${body}</span></div>`
  const poster=s=>{const raw=(window.MUJIAN_POSTERS||{})[s.id]||(window.MUJIAN_POSTERS||{})[s.title]||s.posterUrl||'';const url=String(raw).trim();const safe=/^(https:\/\/|\.\.?\/|assets\/)/i.test(url)?url:'';return `<span class="poster">${safe?`<img src="${esc(safe)}" alt="${esc(s.title)}宣传图" loading="lazy" referrerpolicy="no-referrer">`:''}<span class="poster-placeholder" ${safe?'hidden':''}>${icon('ticket')}<span>海报待补充</span></span></span>`}
  const diary=window.createMujianDiary({shows,allSessions,poster,esc,format,today,idFor,update:()=>render()})
  const compactRow=(s,x,withDate=false,withCity=false)=>`<button class="compact-row" data-action="detail" data-id="${esc(s.id)}" data-slot="${esc(x.slotId)}">${poster(s)}<span class="row-info"><strong>${esc(s.title)}</strong><span class="row-date-line">${withDate?esc(format(x.date))+' · ':''}${esc(x.time)}${x.date<today?' · 已结束':''}</span><span>${withCity?esc(s.city)+' · ':''}${esc(s.venue)}</span>${x.castSummary?`<span class="row-cast-compact">${esc(actors(x.castSummary).join(' / '))}</span>`:''}</span><span class="row-chevron">›</span></button>`
  const suggestionIndex=(()=>{const terms=new Map();const add=(name,type)=>{if(name)terms.set(`${type}|${name}`,{name,type})};shows.forEach(s=>{add(s.title,'剧目');add(s.venue,'剧院');s.schedules.forEach(x=>actors(x.castSummary).forEach(name=>add(name,'演员')))});return Array.from(terms.values())})()
  const suggestions=()=>{const q=state.searchDraft.trim().toLowerCase();if(!q)return '';const list=suggestionIndex.filter(x=>x.name.toLowerCase().includes(q)).sort((a,b)=>Number(!a.name.toLowerCase().startsWith(q))-Number(!b.name.toLowerCase().startsWith(q))||a.name.length-b.name.length||a.name.localeCompare(b.name,'zh-Hans-CN')).slice(0,7);return list.map(x=>`<button type="button" class="suggestion" data-action="suggestion" data-value="${esc(x.name)}">${icon('search')}<span>${esc(x.name)}</span><small>${esc(x.type)}</small></button>`).join('')}
  function filteredSessions(){
    const q=state.query.trim().toLowerCase()
    return allSessions.filter(({show:s,session:x})=>(q?(!state.searchCity||s.city===state.searchCity):s.city===state.city) && (!q || [s.title,s.venue,x.castSummary].join(' ').toLowerCase().includes(q)) && (!state.date || x.date===state.date))
  }
  function resultMarkup(){
    const matches=filteredSessions(), q=state.query.trim(), visible=matches.slice(0,state.limit)
    const dateReset=q&&state.date?'<button class="clear-date" data-action="all-dates">全部日期</button>':''
    if(!matches.length) return `<div class="result-head"><h2>${q?'搜索结果':'演出排期'}</h2><div class="result-meta">${dateReset}<span>0 场</span></div></div>${empty(q?'没有找到相关演出':'这天暂无演出',q&&state.date?'试试其他日期，或查看全部日期':q?'试试其他关键词，或切换城市':'试试其他日期或城市')}`
    let last=''
    const rows=visible.map(({show,session})=>{const group=session.date; const heading=q&&!state.date&&group!==last?`<div class="group-heading">${esc(format(group))}</div>`:'';last=group;return heading+compactRow(show,session,false,!!q)}).join('')
    return `<div class="result-head"><h2>${q?'搜索结果':'演出排期'}</h2><div class="result-meta">${dateReset}<span>${matches.length} 场</span></div></div><div class="compact-list">${rows}</div>${matches.length>state.limit?`<button class="more" data-action="more">查看更多 <span>${Math.min(state.limit,matches.length)} / ${matches.length}</span></button>`:''}`
  }
  function homePage(){
    const viewDate=state.date||state.browseDate
    const start=parse(state.dateAnchor), end=parse(dates[dates.length-1]>viewDate?dates[dates.length-1]:viewDate)
    end.setDate(end.getDate()+7)
    const dayCount=Math.max(14,Math.round((end-start)/86400000)+1)
    const dateButtons=Array.from({length:dayCount},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);const v=key(d);return `<button class="date ${v===state.date?'active':''}" data-action="date" data-date="${v}" aria-pressed="${v===state.date}"><span>${v===today?'今天':weekdays[d.getDay()]}</span><strong>${d.getDate()}</strong><span>${d.getMonth()+1}月</span></button>`}).join('')
    return `<header class="header"><div class="brand">幕间<span>.</span></div><button class="city-control" data-action="city-open">${icon('pin')} ${esc(state.query?(state.searchCity||'地点'):state.city)} ${icon('down')}</button></header><form class="home-search" id="search-form" role="search"><div class="search-box">${icon('search')}<input id="search-input" type="search" enterkeyhint="search" value="${esc(state.searchDraft)}" placeholder="搜索剧名、演员或剧院" aria-label="搜索剧名、演员或剧院" autocomplete="off"><button type="button" class="clear-search" data-action="clear-search" aria-label="清除搜索" ${state.searchDraft||state.query?'':'hidden'}>${icon('close')}</button><button type="submit" class="submit-search">搜索</button></div><div class="search-suggestions" id="search-suggestions" hidden></div></form><div class="date-area"><div class="date-top"><strong>${parse(viewDate).getFullYear()} 年 ${parse(viewDate).getMonth()+1} 月</strong><label class="date-picker">选择日期 ${icon('calendar')}<input aria-label="选择演出日期" type="date" value="${state.date||''}" min="${dates[0]}" max="${dates[dates.length-1]}" data-action="calendar"></label></div><div class="dates">${dateButtons}</div></div><section class="section" id="results">${resultMarkup()}</section>`
  }
  function cityContent(){
    const q=state.cityQuery.trim().toLowerCase(), found=cities.filter(c=>c.toLowerCase().includes(q)), selected=c=>`<button class="city-item ${(state.query?state.searchCity:state.city)===c?'selected':''}" data-action="city-select" data-city="${esc(c)}">${esc(c)}</button>`
    if(!found.length) return empty('没有找到城市','当前仅展示有排期数据的城市')
    // 按中文拼音排序的常用边界，城市集合完全来自数据源。
    const boundaries=[['A','阿'],['B','八'],['C','嚓'],['D','搭'],['E','蛾'],['F','发'],['G','噶'],['H','哈'],['J','击'],['K','喀'],['L','垃'],['M','妈'],['N','拿'],['O','哦'],['P','啪'],['Q','期'],['R','然'],['S','撒'],['T','塌'],['W','挖'],['X','昔'],['Y','压'],['Z','匝']]
    const collator=new Intl.Collator('zh-Hans-CN-u-co-pinyin'), groups={}
    found.forEach(city=>{let letter='A';for(const [l,start] of boundaries) if(collator.compare(city,start)>=0) letter=l; (groups[letter]||(groups[letter]=[])).push(city)})
    return `${!q?`${state.query?`<h3>搜索范围</h3><div class="city-grid"><button class="city-item ${!state.searchCity?'selected':''}" data-action="city-select" data-city="">全部地点</button></div>`:''}<h3>热门城市</h3><div class="city-grid">${hot.map(selected).join('')}</div><h3 class="all-label">全部城市 <span>仅包含有演出数据的城市</span></h3>`:''}${Object.keys(groups).sort().map(l=>`<section class="city-group"><div class="city-letter">${l}</div><div class="city-grid">${groups[l].map(selected).join('')}</div></section>`).join('')}`
  }
  function cityModal(){return `<div class="sheet-backdrop" data-action="city-close"><div class="city-sheet" role="dialog" aria-modal="true" aria-label="选择城市"><div class="sheet-head"><strong>选择城市</strong><button data-action="city-close" aria-label="关闭">${icon('close')}</button></div><div class="city-search"><div class="search-box">${icon('search')}<input id="city-search" type="search" placeholder="搜索城市" value="${esc(state.cityQuery)}" aria-label="搜索城市"></div></div><div class="city-scroll" id="city-results">${cityContent()}</div></div></div>`}
  const castEntries=slot=>Array.isArray(slot.cast)?slot.cast.filter(c=>c.artist).map(c=>({name:c.artist,role:c.role||''})):(slot.castSummary||'').split('、').map(text=>{const match=text.trim().match(/^(.+?)（(.+)）$/);return match?{name:match[1].trim(),role:match[2].trim()}:{name:text.trim(),role:''}}).filter(c=>c.name)
  const castGroups=selected=>{const groups=new Map();selected.forEach(({role,name})=>{if(!groups.has(role))groups.set(role,[]);groups.get(role).push(name)});return groups}
  const matchCast=(slot,selected)=>{const entries=castEntries(slot);return Array.from(castGroups(selected)).every(([role,names])=>entries.some(c=>c.role===role&&names.includes(c.name)))}
  const castSummaryText=selected=>Array.from(castGroups(selected),([role,names])=>`${role||'角色未注明'}：${names.join(' / ')}`).join(' · ')
  const castList=slot=>{const cast=castEntries(slot);return cast.length?`<div class="cast-list">${cast.map(({name,role})=>`<button class="cast-row" data-action="actor-open" data-value="${esc(name)}" aria-label="${esc(role||'角色未注明')}，${esc(name)}，查看演员"><span class="cast-role">${esc(role||'角色未注明')}</span><span class="cast-performer">${esc(name)} <span class="cast-arrow" aria-hidden="true">›</span></span></button>`).join('')}</div>`:'<p class="no-cast">暂无卡司信息</p>'}
  function castChoices(s){
    const groups=new Map(), q=state.castQuery.trim().toLowerCase()
    s.schedules.flatMap(castEntries).forEach(({role,name})=>{if(!groups.has(role))groups.set(role,new Set());groups.get(role).add(name)})
    const content=Array.from(groups,([role,names])=>{const found=Array.from(names).sort((a,b)=>a.localeCompare(b,'zh-Hans-CN')).filter(name=>!q||name.toLowerCase().includes(q)||(role||'角色未注明').toLowerCase().includes(q));if(!found.length)return '';return `<section class="cast-role-group"><h3>${esc(role||'角色未注明')}</h3><div class="cast-actor-list">${found.map(name=>{const chosen=state.castDraft.some(c=>c.role===role&&c.name===name);return `<button class="filter-actor ${chosen?'selected':''}" data-action="cast-pick" data-role="${esc(role)}" data-name="${esc(name)}" aria-pressed="${chosen}">${esc(name)}${chosen?' ✓':''}</button>`}).join('')}</div></section>`}).join('')
    return content||'<p class="filter-no-results">没有找到相关演员或角色</p>'
  }
  function castModal(){
    const s=shows.find(show=>show.id===state.detail)
    const count=s.schedules.filter(slot=>matchCast(slot,state.castDraft)).length
    return `<div class="sheet-backdrop" data-action="cast-close"><div class="city-sheet cast-sheet" role="dialog" aria-modal="true" aria-label="筛选卡司"><div class="sheet-head"><strong>筛选卡司</strong><button data-action="cast-close" aria-label="关闭">${icon('close')}</button></div><p class="filter-explanation">同一角色多选满足任一即可，不同角色需同时满足</p><div class="city-search"><div class="search-box">${icon('search')}<input id="cast-search" type="search" placeholder="搜索演员或角色" value="${esc(state.castQuery)}" aria-label="搜索演员或角色"></div></div><div class="cast-selection"><span>已选 <b id="cast-selected-count">${state.castDraft.length}</b> 人</span><button data-action="cast-clear-draft">清空</button></div><div class="city-scroll cast-options" id="cast-options">${castChoices(s)}</div><div class="cast-actions"><span>匹配 <b id="cast-match-count">${count}</b> 场</span><button data-action="cast-apply">查看场次</button></div></div></div>`
  }
  function detailPage(){
    const s=shows.find(x=>x.id===state.detail);if(!s)return empty('没有找到剧目','请返回重新选择')
    const available=s.schedules.filter(slot=>matchCast(slot,state.castFilter)).sort(byUpcoming)
    const x=available.find(slot=>slot.slotId===state.slot)||available[0]
    return `<div class="detail"><div class="detail-bar"><button class="back" data-action="back" aria-label="返回">${icon('back')}</button><strong>演出详情</strong></div><div class="detail-content"><div class="detail-heading">${poster(s)}<div class="detail-title-wrap"><h1 class="detail-title">${esc(s.title)}</h1><button class="detail-place" data-action="venue-open" data-value="${esc(venueKey(s))}">${icon('pin')}<span>${esc(s.city)} · ${esc(s.venue)}</span><span class="venue-chevron">›</span></button></div>${favoriteButton('show',s.title,'关注剧目')}</div><section class="detail-schedule"><div class="result-head"><div><h2>选择场次</h2><p>${state.castFilter.length?`符合条件 ${available.length} 场 / 共 ${s.schedules.length} 场`:`共 ${s.schedules.length} 场`}</p></div><button class="cast-filter-button ${state.castFilter.length?'active':''}" data-action="cast-open">卡司筛选${state.castFilter.length?` · ${state.castFilter.length}`:''}</button></div>${state.castFilter.length?`<div class="filter-summary">${esc(castSummaryText(state.castFilter))}<button data-action="cast-reset">清除</button></div>`:''}${available.length?`<div class="slot-picker">${available.map(slot=>`<button class="slot-chip ${slot.slotId===x.slotId?'selected':''}" data-action="slot" data-slot="${esc(slot.slotId)}"><strong>${esc(format(slot.date))}</strong><span>${esc(slot.time)}</span></button>`).join('')}</div>`:'<div class="filter-empty">没有同时出演的场次，请调整筛选条件</div>'}</section>${x?`<section class="selected-session"><div class="selected-session-head"><div class="cast-heading">本场卡司</div>${favoriteButton('session',idFor(s,x),'想看这场')}</div>${castList(x)}</section>`:''}<p class="source-note">场次和卡司可能变化，请以演出方公告为准。</p></div></div>`
  }
  function actorPage(){
    const name=state.actor, matches=allSessions.filter(({session})=>actors(session.castSummary).includes(name))
    if(state.actorWork){
      const items=matches.filter(({show})=>show.title===state.actorWork), visible=items.slice(0,state.limit);let last=''
      return `<div class="related-page"><div class="detail-bar"><button class="back" data-action="actor-back" aria-label="返回">${icon('back')}</button><strong>${esc(state.actorWork)}</strong></div><div class="section"><div class="result-head"><div><h2>${esc(name)}的演出场次</h2></div><span>${items.length} 场</span></div><div class="compact-list">${visible.map(({show,session})=>{const heading=last!==session.date?`<div class="group-heading">${esc(format(session.date))}</div>`:'';last=session.date;return heading+compactRow(show,session)}).join('')}</div>${items.length>state.limit?`<button class="more" data-action="more">查看更多 <span>${state.limit} / ${items.length}</span></button>`:''}</div></div>`
    }
    const groups=new Map();matches.forEach(({show,session})=>{if(!groups.has(show.title))groups.set(show.title,{show,cities:new Set(),sessions:0});const group=groups.get(show.title);group.cities.add(show.city);group.sessions++})
    return `<div class="actor-page"><div class="detail-bar"><button class="back" data-action="actor-back" aria-label="返回">${icon('back')}</button><strong>演员</strong></div><div class="actor-profile"><div class="actor-avatar">${esc(name.slice(0,1))}</div><div class="actor-intro"><h1>${esc(name)}</h1><span>${groups.size} 部剧目 · ${matches.length} 场</span></div>${favoriteButton('actor',name,'关注演员')}</div><section class="section actor-works"><div class="result-head"><div><h2>参演剧目</h2></div></div>${groups.size?`<div class="work-list">${Array.from(groups.entries()).map(([title,g])=>`<button class="work-card" data-action="actor-work" data-value="${esc(title)}">${poster(g.show)}<span class="work-info"><strong>${esc(title)}</strong><span>${esc(Array.from(g.cities).join(' / '))}</span><small>${g.sessions} 场演出</small></span><span class="row-chevron">›</span></button>`).join('')}</div>`:empty('暂无参演剧目','当前数据中没有匹配的演出')}</section></div>`
  }
  function relatedPage(){
    const {type,value}=state.related
    if(type==='venue'){
      const venueShows=shows.filter(s=>venueKey(s)===value).map(s=>({show:s,first:s.schedules.slice().sort(byUpcoming)[0]})).sort((a,b)=>byUpcoming(a.first,b.first))
      const visible=venueShows.slice(0,state.limit), [city,name]=value.split('｜')
      return `<div class="related-page venue-page"><div class="detail-bar"><button class="back" data-action="related-back" aria-label="返回">${icon('back')}</button><strong>剧院详情</strong></div><div class="section"><div class="venue-page-heading"><div><h1>${esc(name)}</h1><p>${esc(city)}</p></div>${favoriteButton('venue',value,'关注剧院')}</div><div class="result-head"><h2>剧院演出</h2><span>${venueShows.length} 部</span></div>${visible.length?`<div class="work-list">${visible.map(({show:s,first})=>`<button class="work-card" data-action="detail" data-id="${esc(s.id)}" data-slot="${esc(first.slotId)}">${poster(s)}<span class="work-info"><strong>${esc(s.title)}</strong><span>${esc(format(first.date))}${first.date<today?' · 历史演出':'起'}</span><small>${s.schedules.length} 场演出</small></span><span class="row-chevron">›</span></button>`).join('')}</div>${venueShows.length>state.limit?`<button class="more" data-action="more">查看更多</button>`:''}`:empty('暂无相关演出','当前数据中没有该剧院的演出')}</div></div>`
    }
    const items=allSessions.filter(({show:s,session:x})=>type==='show'?s.title===value:type==='venue'?venueKey(s)===value:type==='actor'?actors(x.castSummary).includes(value):idFor(s,x)===value)
    const visible=items.slice(0,state.limit);let last=''
    return `<div class="related-page"><div class="detail-bar"><button class="back" data-action="related-back" aria-label="返回">${icon('back')}</button><strong>相关演出</strong></div><div class="section"><div class="related-heading"><div><h2>${esc(value)}</h2><p>${items.length} 场演出</p></div>${type==='show'?favoriteButton('show',value,'关注剧目'):''}</div>${items.length?`<div class="compact-list">${visible.map(({show,session})=>{const heading=last!==session.date?`<div class="group-heading">${esc(format(session.date))}</div>`:'';last=session.date;return heading+compactRow(show,session,true,true)}).join('')}</div>${items.length>state.limit?`<button class="more" data-action="more">查看更多 <span>${state.limit} / ${items.length}</span></button>`:''}`:empty('暂无相关场次','当前数据中没有匹配的场次')}</div></div>`
  }
  function favoritesPage(){
    const type=state.favTab, values=favorites[type]
    const entries=values.map(value=>{
      if(type==='session'){const found=allSessions.find(({show,session})=>idFor(show,session)===value);if(!found)return `<div class="saved-row"><span><strong>原场次已不在当前数据中</strong><small>${esc(value)}</small></span><button data-action="toggle" data-type="session" data-value="${esc(value)}">移除</button></div>`;return `<div class="saved-session">${compactRow(found.show,found.session,true,true)}</div>`}
      const count=allSessions.filter(({show:s,session:x})=>type==='show'?s.title===value:type==='venue'?venueKey(s)===value:actors(x.castSummary).includes(value)).length
      const cover=type==='show'?shows.find(s=>s.title===value):null
      return `<div class="saved-row"><button class="saved-open" data-action="${type==='actor'?'actor-open':'related'}" data-type="${type}" data-value="${esc(value)}">${cover?poster(cover):''}<span class="saved-info"><strong>${esc(type==='venue'?value.split('｜')[1]:value)}</strong><small>${type==='venue'?`${esc(value.split('｜')[0])} · `:''}${count} 场相关演出</small></span><span class="row-chevron" aria-hidden="true">›</span></button></div>`
    }).join('')
    return `<div class="favorites-page"><h1>我的想看</h1><div class="fav-tabs">${Object.keys(TYPES).map(t=>`<button class="fav-tab ${t===type?'active':''}" data-action="fav-tab" data-type="${t}">${TYPES[t]} <span>${favorites[t].length}</span></button>`).join('')}</div><div class="favorites-list">${values.length?entries:empty(`还没有关注${TYPES[type]}`,'在演出详情中选择感兴趣的内容')}</div></div>`
  }
  function render(options={}){
    const slotScroll=document.querySelector('.slot-picker')?.scrollLeft || 0
    const dateScroll=document.querySelector('.dates')?.scrollLeft || 0
    const sub=!!state.detail||!!state.related||!!state.actor;nav.hidden=sub;nav.style.display=sub?'none':''
    nav.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===state.tab);b.setAttribute('aria-current',b.dataset.tab===state.tab?'page':'false')})
    main.innerHTML=state.detail?detailPage():state.actor?actorPage():state.related?relatedPage():state.tab==='schedule'?homePage():state.tab==='diary'?diary.page():favoritesPage()
    if(state.detail && document.querySelector('.slot-picker')) document.querySelector('.slot-picker').scrollLeft=slotScroll
    if(document.querySelector('.dates')) document.querySelector('.dates').scrollLeft=dateScroll
    if(state.cityOpen) main.insertAdjacentHTML('beforeend',cityModal())
    if(state.castOpen) main.insertAdjacentHTML('beforeend',castModal())
    if(options.scrollTop) main.scrollTo(0,0)
  }
  nav.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon))
  function updateResults(){const node=document.querySelector('#results');if(node)node.innerHTML=resultMarkup();const clear=document.querySelector('.clear-search');if(clear)clear.hidden=!(state.searchDraft||state.query)}
  function updateSuggestions(){const panel=document.querySelector('#search-suggestions');if(!panel)return;const html=suggestions();panel.innerHTML=html;panel.hidden=!html}
  function submitSearch(query){query=query.trim();if(!state.query&&state.date)state.browseDate=state.date;state.searchCity='';state.searchDraft=query;state.query=query;state.date=query?null:state.browseDate;state.limit=12;document.querySelector('#search-input')?.blur();render()}
  function updateCastModal(){
    const s=shows.find(show=>show.id===state.detail), list=document.querySelector('#cast-options')
    if(!s||!list)return
    list.innerHTML=castChoices(s)
    document.querySelector('#cast-selected-count').textContent=state.castDraft.length
    document.querySelector('#cast-match-count').textContent=s.schedules.filter(slot=>matchCast(slot,state.castDraft)).length
  }
  document.addEventListener('click',e=>{
    if(diary.click(e))return
    const tab=e.target.closest('[data-tab]');if(tab){state.tab=tab.dataset.tab;state.detail=null;state.related=null;state.actor=null;state.actorWork=null;state.limit=12;render({scrollTop:true});return}
    const el=e.target.closest('[data-action]');if(!el)return
    const action=el.dataset.action
    if(action==='city-close' && e.target.closest('.city-sheet') && !e.target.closest('.sheet-head button'))return
    if(action==='cast-close' && e.target.closest('.cast-sheet') && !e.target.closest('.sheet-head button'))return
    if(action==='city-open'){state.cityOpen=true;state.cityQuery='';render();return}
    if(action==='city-close'){state.cityOpen=false;render();return}
    if(action==='city-select'){if(state.query)state.searchCity=el.dataset.city;else state.city=el.dataset.city;state.cityOpen=false;state.limit=12;render({scrollTop:true});return}
    if(action==='suggestion'){submitSearch(el.dataset.value);return}
    if(action==='clear-search'){state.query='';state.searchDraft='';state.searchCity='';state.date=state.browseDate;state.dateAnchor=state.date<today?state.date:today;state.limit=12;render();document.querySelector('#search-input')?.focus();return}
    if(action==='date'){state.date=el.dataset.date;if(!state.query)state.browseDate=state.date;state.limit=12;render();return}
    if(action==='all-dates'){state.date=null;state.limit=12;render();return}
    if(action==='more'){state.limit+=12;if(state.related||state.actor)render();else updateResults();return}
    if(action==='detail'){state.detail=el.dataset.id;state.slot=el.dataset.slot;state.castFilter=[];state.castOpen=false;render({scrollTop:true});const scroller=document.querySelector('.slot-picker'), selected=document.querySelector('.slot-chip.selected');if(scroller&&selected)scroller.scrollLeft=Math.max(0,selected.offsetLeft-scroller.offsetLeft-20);return}
    if(action==='slot'){state.slot=el.dataset.slot;render();document.querySelector('.slot-chip.selected')?.scrollIntoView({block:'nearest',inline:'nearest'});return}
    if(action==='cast-open'){state.castDraft=state.castFilter.slice();state.castQuery='';state.castOpen=true;render();return}
    if(action==='cast-close'){state.castOpen=false;render();return}
    if(action==='cast-pick'){const name=el.dataset.name,role=el.dataset.role,chosen=state.castDraft.some(item=>item.name===name&&item.role===role);state.castDraft=chosen?state.castDraft.filter(item=>item.name!==name||item.role!==role):state.castDraft.concat({name,role});updateCastModal();return}
    if(action==='cast-clear-draft'){state.castDraft=[];updateCastModal();return}
    if(action==='cast-apply'){state.castFilter=state.castDraft.slice();state.castOpen=false;const show=shows.find(item=>item.id===state.detail), matches=show.schedules.filter(slot=>matchCast(slot,state.castFilter));if(!matches.some(slot=>slot.slotId===state.slot))state.slot=matches[0]?.slotId||null;render();return}
    if(action==='cast-reset'){state.castFilter=[];render();return}
    if(action==='back'){state.detail=null;state.castOpen=false;state.castFilter=[];render({scrollTop:true});return}
    if(action==='actor-open'){state.actorHistory.push({detail:state.detail,slot:state.slot,related:state.related,actor:state.actor,actorWork:state.actorWork,castFilter:state.castFilter.slice()});state.actor=el.dataset.value;state.actorWork=null;state.detail=null;state.related=null;state.limit=12;render({scrollTop:true});return}
    if(action==='actor-work'){state.actorWork=el.dataset.value;state.limit=12;render({scrollTop:true});return}
    if(action==='actor-back'){if(state.actorWork){state.actorWork=null}else{const previous=state.actorHistory.pop()||{};state.actor=previous.actor||null;state.actorWork=previous.actorWork||null;state.detail=previous.detail||null;state.slot=previous.slot||null;state.related=previous.related||null;state.castFilter=previous.castFilter||[]}state.limit=12;render({scrollTop:true});return}
    if(action==='venue-open'){state.relatedOrigin={detail:state.detail,slot:state.slot,castFilter:state.castFilter.slice(),actor:state.actor,actorWork:state.actorWork,related:state.related};state.detail=null;state.actor=null;state.actorWork=null;state.related={type:'venue',value:el.dataset.value};state.limit=12;render({scrollTop:true});return}
    if(action==='related'){state.relatedOrigin=null;state.related={type:el.dataset.type,value:el.dataset.value};state.limit=12;render({scrollTop:true});return}
    if(action==='related-back'){const previous=state.relatedOrigin;state.related=previous?.related||null;state.detail=previous?.detail||null;state.slot=previous?.slot||null;state.castFilter=previous?.castFilter||[];state.actor=previous?.actor||null;state.actorWork=previous?.actorWork||null;state.relatedOrigin=null;state.limit=12;render({scrollTop:true});return}
    if(action==='fav-tab'){state.favTab=el.dataset.type;render();return}
    if(action==='toggle'){toggle(el.dataset.type,el.dataset.value);render();return}
  })
  document.addEventListener('change',e=>{if(diary.change(e))return;if(e.target.dataset.action==='calendar'&&e.target.value){state.date=e.target.value;if(!state.query)state.browseDate=state.date;state.dateAnchor=state.date<today?state.date:today;state.limit=12;render();const list=document.querySelector('.dates'),selected=list?.querySelector('.date.active');if(list&&selected)list.scrollLeft+=selected.getBoundingClientRect().left-list.getBoundingClientRect().left-20}})
  let composing=false
  document.addEventListener('submit',e=>{
    if(diary.submit(e))return
    if(e.target.id!=='search-form')return
    e.preventDefault()
    if(composing)return
    submitSearch(document.querySelector('#search-input').value)
  })
  document.addEventListener('compositionstart',()=>{composing=true})
  document.addEventListener('input',e=>{
    if(diary.input(e))return
    if(e.target.id==='search-input'){state.searchDraft=e.target.value;const clear=document.querySelector('.clear-search');if(clear)clear.hidden=!(state.searchDraft||state.query);if(!composing&&!e.isComposing)updateSuggestions()}
    if(e.target.id==='city-search'){state.cityQuery=e.target.value;if(!composing&&!e.isComposing)document.querySelector('#city-results').innerHTML=cityContent()}
    if(e.target.id==='cast-search'){state.castQuery=e.target.value;if(!composing&&!e.isComposing)updateCastModal()}
  })
  document.addEventListener('compositionend',e=>{composing=false;if(diary.compositionEnd(e))return;if(e.target.id==='search-input'){state.searchDraft=e.target.value;const clear=document.querySelector('.clear-search');if(clear)clear.hidden=!(state.searchDraft||state.query);updateSuggestions()}if(e.target.id==='city-search'){state.cityQuery=e.target.value;document.querySelector('#city-results').innerHTML=cityContent()}if(e.target.id==='cast-search'){state.castQuery=e.target.value;updateCastModal()}})
  document.addEventListener('focusin',e=>{if(e.target.id==='search-input')updateSuggestions()})
  document.addEventListener('click',e=>{if(!e.target.closest('.home-search')){const panel=document.querySelector('#search-suggestions');if(panel)panel.hidden=true}})
  document.addEventListener('error',e=>{if(e.target.matches?.('.poster img')){e.target.hidden=true;const placeholder=e.target.parentElement.querySelector('.poster-placeholder');if(placeholder)placeholder.hidden=false}},true)
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&(state.cityOpen||state.castOpen)){state.cityOpen=false;state.castOpen=false;render()}})
  render()
})()
