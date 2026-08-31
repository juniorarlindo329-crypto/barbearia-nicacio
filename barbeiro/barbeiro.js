// V4: sempre abre no topo, igual à referência
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('pageshow',()=>{ requestAnimationFrame(()=>window.scrollTo(0,0)); });
window.scrollTo(0,0);

const DEFAULT_SERVICES=[
{name:'Corte',price:30,duration:30,active:true},{name:'Barba',price:20,duration:30,active:true},{name:'Corte+Barba',price:45,duration:60,active:true},{name:'Corte+Sobrancelha',price:40,duration:30,active:true},{name:'Corte+Barba+Sobra',price:50,duration:60,active:true},{name:'Barba+Sobrancelha',price:30,duration:30,active:true},{name:'Corte +Alisante ou pintura',price:60,duration:60,active:true},{name:'Alisante ou pintura',price:30,duration:30,active:true},{name:'Closed',price:0,duration:60,active:false},{name:'CMT',price:38,duration:10,active:true},{name:'CS',price:12,duration:10,active:true}
];
const KEYS={bookings:'nicacio_bookings',blocked:'nicacio_blocked_days',settings:'nicacio_barber_settings',services:'nicacio_services',closedSlots:'nicacio_closed_slots',recurrence:'nicacio_barber_recurring',barber:'nicacio_barber_profile',linkConfig:'nicacio_link_config',clients:'nicacio_barber_clients'};
const $=s=>document.querySelector(s);
let currentWeekStart=startOfWeek(new Date()),selectedDate=new Date(),valuesHidden=false;

function load(k,fallback){try{return JSON.parse(localStorage.getItem(k))??fallback}catch{return fallback}}
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}
function bookings(){return load(KEYS.bookings,[])} function saveBookings(v){save(KEYS.bookings,v)}
function blockedDays(){return load(KEYS.blocked,[])} function saveBlockedDays(v){save(KEYS.blocked,v)}
function settings(){return {...{start:'08:00',end:'18:00',interval:30},...load(KEYS.settings,{})}} function saveSettings(v){save(KEYS.settings,v)}
function services(){let s=load(KEYS.services,null);if(!s){s=DEFAULT_SERVICES;save(KEYS.services,s)}return s} function saveServices(v){save(KEYS.services,v)}
function closedSlots(){return load(KEYS.closedSlots,{})} function saveClosedSlots(v){save(KEYS.closedSlots,v)}
function recurrings(){return load(KEYS.recurrence,[])} function saveRecurrings(v){save(KEYS.recurrence,v)}
function key(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function startOfWeek(d){const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-((x.getDay()+6)%7));return x}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function uuid(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.add('hidden'),2200)}
function mins(t){const [h,m]=t.split(':').map(Number);return h*60+m} function timeFromMins(m){return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`}
function slotsForDay(){const s=settings(),arr=[];for(let m=mins(s.start);m<mins(s.end);m+=Number(s.interval||30))arr.push(timeFromMins(m));return arr}
function isSlotClosed(date,time){return (closedSlots()[date]||[]).includes(time)}
function dayBookings(d){return bookings().filter(b=>b.date===key(d)&&b.status!=='cancelado')}
function weekBookings(){const end=addDays(currentWeekStart,6);return bookings().filter(b=>b.status!=='cancelado'&&b.date>=key(currentWeekStart)&&b.date<=key(end))}
function activeBookings(data){return data.filter(b=>b.status!=='cancelado')}

function renderProfile(){const p=load(KEYS.barber,{name:'Nicácio'});$('#barberName').textContent=p.name||'Nicácio'}
function renderWeek(){
 const end=addDays(currentWeekStart,6);$('#weekRange').textContent=`${currentWeekStart.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})} a ${end.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}`;
 const names=['SEG','TER','QUA','QUI','SEX','SAB','DOM'],wrap=$('#weekDays');wrap.innerHTML='';
 for(let i=0;i<7;i++){const d=addDays(currentWeekStart,i),k=key(d),b=document.createElement('button');b.className='day-btn';if(k===key(selectedDate))b.classList.add('active');const blocked=d.getDay()===0||blockedDays().includes(k);if(blocked)b.classList.add('blocked');if(!dayBookings(d).length)b.classList.add('no-work');b.innerHTML=`<span>${names[i]}</span><strong>${String(d.getDate()).padStart(2,'0')}</strong><small>${blocked?'BLOQ.':''}</small>`;b.addEventListener('click',()=>{selectedDate=d;renderAll()});wrap.appendChild(b)}
}
function renderStats(){const today=dayBookings(new Date()),week=weekBookings(),tRev=today.reduce((s,b)=>s+Number(b.price||0),0),wRev=week.reduce((s,b)=>s+Number(b.price||0),0);$('#todayCount').textContent=today.length;$('#weekCount').textContent=week.length;$('#todayRevenue').textContent=valuesHidden?'••••':money(tRev);$('#weekRevenue').textContent=valuesHidden?'••••':money(wRev)}
function renderTimeline(){
 const dkey=key(selectedDate),list=dayBookings(selectedDate).sort((a,b)=>a.time.localeCompare(b.time)),wrap=$('#timeline');
 $('#selectedDayTitle').textContent=selectedDate.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});
 wrap.innerHTML='';
 const fullBlocked=selectedDate.getDay()===0||blockedDays().includes(dkey);
 const slots=slotsForDay();
 const interval=Number(settings().interval||30);
 const consumed=new Set();
 slots.forEach(time=>{
   if(consumed.has(time)) return;
   const row=document.createElement('div');
   row.className='slot-row';
   row.innerHTML=`<div class="slot-time">${time}</div>`;
   const appt=list.find(b=>b.time===time);
   const closed=fullBlocked||isSlotClosed(dkey,time);
   if(closed){
     row.classList.add('has-card');
     const c=document.createElement('div');c.className='slot-card closed';
     c.innerHTML=`<div class="slot-head"><span>${time} - ${timeFromMins(mins(time)+interval)}</span><button class="mini-icon" title="Abrir horário">▣</button></div><strong>Horário fechado</strong>`;
     c.querySelector('button').addEventListener('click',()=>toggleSlot(dkey,time));row.appendChild(c);
   } else if(appt){
     row.classList.add('has-card');
     const span=Math.max(1,Math.ceil(Number(appt.duration||interval)/interval));
     if(span>1) row.classList.add(`span-${Math.min(span,3)}`);
     for(let i=1;i<span;i++){
       const t=timeFromMins(mins(time)+interval*i);
       if(slots.includes(t)) consumed.add(t);
     }
     const c=document.createElement('div');c.className='slot-card';
     c.innerHTML=`<div class="slot-head"><span>${appt.time} - ${timeFromMins(mins(appt.time)+Number(appt.duration||interval))}</span><div><button class="mini-icon more-btn">•••</button></div></div><div><div class="client-name">${escapeHtml(appt.clientName||'Cliente')}</div><div class="service-name">${escapeHtml(appt.serviceName||'Serviço')}</div></div><div class="slot-price">${valuesHidden?'••••':money(appt.price)}</div>`;
     c.querySelector('.more-btn').addEventListener('click',()=>bookingActions(appt.id));row.appendChild(c);
   } else {
     const e=document.createElement('div');e.className='empty-slot';e.textContent='Sem agendamento';
     e.addEventListener('click',()=>newBookingModal(time));row.appendChild(e);
   }
   wrap.appendChild(row);
 });
}
function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function renderAll(){renderProfile();renderWeek();renderStats();renderTimeline()}

function openModal(title,html){$('#modalTitle').textContent=title;$('#modalContent').innerHTML=html;$('#modal').classList.remove('hidden');$('#modal').setAttribute('aria-hidden','false')}
function closeModal(){$('#modal').classList.add('hidden');$('#modal').setAttribute('aria-hidden','true')}
function closeMenu(){$('#sideMenu').classList.add('hidden');$('#menuOverlay').classList.add('hidden');$('#sideMenu').setAttribute('aria-hidden','true')}

function bookingActions(id){const b=bookings().find(x=>x.id===id);if(!b)return;openModal('Agendamento',`<div class="summary-box"><strong>${escapeHtml(b.clientName||'Cliente')}</strong><p>${escapeHtml(b.serviceName||'')} • ${money(b.price)} • ${b.dateLabel||b.date} às ${b.time}</p><p>${escapeHtml(b.clientPhone||'')}</p></div><div class="inline-actions"><button id="doneBooking" class="primary-btn">Concluir</button><button id="cancelBooking" class="danger-btn">Cancelar</button></div>`);$('#doneBooking').onclick=()=>{changeStatus(id,'concluido');closeModal()};$('#cancelBooking').onclick=()=>{if(confirm('Cancelar este agendamento?')){changeStatus(id,'cancelado');closeModal()}}}
function changeStatus(id,status){const all=bookings(),b=all.find(x=>x.id===id);if(b){b.status=status;b[status==='cancelado'?'cancelledAt':'completedAt']=new Date().toISOString();saveBookings(all);renderAll();toast(status==='cancelado'?'Agendamento cancelado':'Atendimento concluído')}}

function newBookingModal(prefillTime=''){
 const opts=services().filter(s=>s.active!==false).map((s,i)=>`<option value="${encodeURIComponent(s.name)}">${escapeHtml(s.name)} — ${money(s.price)}</option>`).join('');
 openModal('Novo Agendamento',`<form id="manualForm" class="form-grid"><div class="field full"><label>Nome do cliente</label><input id="mName" required placeholder="Nome da pessoa"></div><div class="field"><label>Telefone</label><input id="mPhone" inputmode="tel" placeholder="(00) 00000-0000"></div><div class="field"><label>Serviço</label><select id="mService" required>${opts}</select></div><div class="field"><label>Data</label><input id="mDate" type="date" value="${key(selectedDate)}" required></div><div class="field"><label>Horário</label><input id="mTime" type="time" step="600" value="${prefillTime}" required></div><div class="field full"><label>Observação</label><textarea id="mNote" placeholder="Opcional"></textarea></div><button class="primary-btn full" type="submit">SALVAR AGENDAMENTO</button></form>`);
 $('#manualForm').onsubmit=e=>{e.preventDefault();const srv=services().find(s=>s.name===decodeURIComponent($('#mService').value));if(!srv)return;const date=$('#mDate').value,time=$('#mTime').value;if(blockedDays().includes(date)||new Date(date+'T12:00:00').getDay()===0||isSlotClosed(date,time)){alert('Esse horário está fechado.');return}const all=bookings();if(all.some(b=>b.date===date&&b.time===time&&b.status!=='cancelado')){alert('Já existe agendamento nesse horário.');return}const item={id:uuid(),clientName:$('#mName').value.trim(),clientPhone:$('#mPhone').value.trim(),serviceName:srv.name,price:Number(srv.price),duration:Number(srv.duration),date,dateLabel:new Date(date+'T12:00:00').toLocaleDateString('pt-BR'),time,status:'confirmado',note:$('#mNote').value.trim(),createdAt:new Date().toISOString(),source:'barbeiro'};all.push(item);saveBookings(all);selectedDate=new Date(date+'T12:00:00');currentWeekStart=startOfWeek(selectedDate);closeModal();renderAll();toast('Agendamento criado')}
}

function toggleDayBlock(){const k=key(selectedDate);if(selectedDate.getDay()===0){toast('Domingo já é bloqueado');return}let all=blockedDays();const nowBlocked=all.includes(k);all=nowBlocked?all.filter(x=>x!==k):[...all,k];saveBlockedDays(all);renderAll();toast(nowBlocked?'Dia liberado':'Dia bloqueado')}
function toggleSlot(date,time){const all=closedSlots(),arr=all[date]||[];all[date]=arr.includes(time)?arr.filter(x=>x!==time):[...arr,time];saveClosedSlots(all);renderTimeline()}
function editDayPage(){const date=key(selectedDate),checks=slotsForDay().map(t=>`<button type="button" class="slot-check ${isSlotClosed(date,t)?'closed':''}" data-time="${t}">${t}<br><small>${isSlotClosed(date,t)?'Fechado':'Aberto'}</small></button>`).join('');openModal('Modificar este dia',`<div class="summary-box"><strong>${selectedDate.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}</strong><p>Toque nos horários para abrir ou fechar.</p></div><div class="slot-checks">${checks}</div><button id="toggleFullDay" class="secondary-btn">${blockedDays().includes(date)?'LIBERAR DIA INTEIRO':'BLOQUEAR DIA INTEIRO'}</button>`);document.querySelectorAll('.slot-check').forEach(b=>b.onclick=()=>{toggleSlot(date,b.dataset.time);editDayPage()});$('#toggleFullDay').onclick=()=>{toggleDayBlock();editDayPage()}}

function servicesPage(){const list=services();openModal('Serviços e preços',`<p style="color:#aeb5bf">Edite os serviços que aparecem no agendamento.</p><div id="serviceList">${list.map((s,i)=>`<div class="list-card"><div class="service-admin"><div><h3>${escapeHtml(s.name)}</h3><p>${s.duration} min • <span class="badge ${s.active===false?'off':''}">${s.active===false?'OCULTO':'ATIVO'}</span></p></div><div class="service-price">${money(s.price)}</div></div><div class="service-actions"><button class="small-btn edit-service" data-i="${i}">Editar</button><button class="small-btn toggle-service" data-i="${i}">${s.active===false?'Ativar':'Ocultar'}</button><button class="small-btn danger delete-service" data-i="${i}">Excluir</button></div></div>`).join('')}</div><button id="addService" class="primary-btn">+ NOVO SERVIÇO</button>`);document.querySelectorAll('.edit-service').forEach(b=>b.onclick=()=>serviceEditor(Number(b.dataset.i)));document.querySelectorAll('.toggle-service').forEach(b=>b.onclick=()=>{const a=services();a[Number(b.dataset.i)].active=a[Number(b.dataset.i)].active===false?true:false;saveServices(a);servicesPage()});document.querySelectorAll('.delete-service').forEach(b=>b.onclick=()=>{if(confirm('Excluir este serviço?')){const a=services();a.splice(Number(b.dataset.i),1);saveServices(a);servicesPage()}});$('#addService').onclick=()=>serviceEditor(-1)}
function serviceEditor(i){const s=i>=0?services()[i]:{name:'',price:'',duration:30,active:true};openModal(i>=0?'Editar serviço':'Novo serviço',`<form id="serviceForm"><div class="field"><label>Nome</label><input id="sName" required value="${escapeHtml(s.name)}"></div><div class="field"><label>Preço (R$)</label><input id="sPrice" type="number" min="0" step="0.01" required value="${s.price}"></div><div class="field"><label>Duração em minutos</label><input id="sDuration" type="number" min="5" step="5" required value="${s.duration}"></div><button class="primary-btn" type="submit">SALVAR SERVIÇO</button></form>`);$('#serviceForm').onsubmit=e=>{e.preventDefault();const a=services(),item={name:$('#sName').value.trim(),price:Number($('#sPrice').value),duration:Number($('#sDuration').value),active:s.active!==false};if(i>=0)a[i]=item;else a.push(item);saveServices(a);servicesPage();toast('Serviço salvo')}}

function normalizePhone(v){return String(v||'').replace(/\D/g,'')}
function clientIdFrom(name,phone){const p=normalizePhone(phone);return p?'p_'+p:'n_'+String(name||'cliente').trim().toLowerCase().replace(/\s+/g,'_')}
function storedClients(){return load(KEYS.clients,[])}
function saveClients(v){save(KEYS.clients,v)}
function syncClientsFromBookings(){
 const current=storedClients(), byId=new Map(current.map(c=>[c.id,c]));
 bookings().forEach(b=>{
  const name=(b.clientName||'Cliente').trim(), phone=(b.clientPhone||'').trim(), id=clientIdFrom(name,phone);
  const existing=byId.get(id)||{id,name,phone,favorite:false,notes:'',createdAt:b.createdAt||new Date().toISOString()};
  if(name&&name!=='Cliente')existing.name=name;
  if(phone)existing.phone=phone;
  byId.set(id,existing);
 });
 const arr=[...byId.values()];saveClients(arr);return arr;
}
function clientBookingCount(c){return bookings().filter(b=>clientMatchesBooking(c,b)).length}
function clientMatchesBooking(c,b){const cp=normalizePhone(c.phone),bp=normalizePhone(b.clientPhone);if(cp&&bp)return cp===bp;return String(c.name||'').trim().toLowerCase()===String(b.clientName||'').trim().toLowerCase()}
function clientLastBooking(c){return bookings().filter(b=>clientMatchesBooking(c,b)).sort((a,b)=>(b.date+' '+b.time).localeCompare(a.date+' '+a.time))[0]||null}
function phoneForWhatsApp(v){let p=normalizePhone(v);if(!p)return'';if(p.length===10||p.length===11)p='55'+p;return p}
function clientsPage(){
 syncClientsFromBookings();
 openModal('',`<div class="clients-screen">
   <button id="clientsBack" class="clients-back" type="button" aria-label="Voltar">←</button>
   <div class="clients-eyebrow">Lista de</div><h2>Clientes</h2>
   <div class="clients-tools">
    <input id="clientSearch" type="search" placeholder="Pesquisar" autocomplete="off">
    <button id="clientFilterBtn" class="tool-square" type="button" aria-label="Filtros">⌕</button>
    <button id="clientDateBtn" class="tool-square" type="button" aria-label="Filtrar por data">▣</button>
    <button id="clientFavBtn" class="tool-square" type="button" aria-label="Favoritos">★</button>
   </div>
   <div id="clientFilterPanel" class="client-filter-panel hidden">
    <button data-filter="all" type="button" class="active">Todos</button><button data-filter="phone" type="button">Com telefone</button><button data-filter="no-phone" type="button">Sem telefone</button>
   </div>
   <div id="clientDatePanel" class="client-date-panel hidden"><label>Mostrar clientes com agendamento em</label><input id="clientDateFilter" type="date"><button id="clearClientDate" type="button">Limpar data</button></div>
   <div id="clientList" class="client-list"></div>
   <button id="addClientBtn" class="client-add-btn" type="button" aria-label="Adicionar cliente">+</button>
  </div>`);
 $('#modal').classList.add('clients-modal');
 let filter='all',favoritesOnly=false,dateFilter='';
 const closeClients=()=>{$('#modal').classList.remove('clients-modal');closeModal()};
 $('#clientsBack').onclick=closeClients;
 const render=()=>{
  const q=$('#clientSearch').value.trim().toLowerCase();
  let arr=syncClientsFromBookings();
  arr=arr.filter(c=>!q||String(c.name||'').toLowerCase().includes(q)||String(c.phone||'').toLowerCase().includes(q));
  if(filter==='phone')arr=arr.filter(c=>normalizePhone(c.phone));
  if(filter==='no-phone')arr=arr.filter(c=>!normalizePhone(c.phone));
  if(favoritesOnly)arr=arr.filter(c=>c.favorite);
  if(dateFilter)arr=arr.filter(c=>bookings().some(b=>clientMatchesBooking(c,b)&&b.date===dateFilter));
  arr.sort((a,b)=>Number(!!b.favorite)-Number(!!a.favorite)||String(a.name||'').localeCompare(String(b.name||''),'pt-BR'));
  const list=$('#clientList');
  if(!arr.length){list.innerHTML='<div class="clients-empty">Nenhum cliente encontrado.</div>';return}
  list.innerHTML=arr.map(c=>{const cnt=clientBookingCount(c),phone=escapeHtml(c.phone||'Sem telefone');return `<article class="client-card" data-id="${escapeHtml(c.id)}"><div class="client-main"><strong>${escapeHtml(c.name||'Cliente')}</strong><span>${phone}</span>${c.favorite?'<small>★ Favorito</small>':''}</div><div class="client-actions">${normalizePhone(c.phone)?`<button class="client-wa" type="button" title="WhatsApp" aria-label="Abrir WhatsApp"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.52 3.48A11.76 11.76 0 0 0 12.06 0C5.49 0 .14 5.35.14 11.93c0 2.1.55 4.16 1.6 5.97L.04 24l6.25-1.64a11.9 11.9 0 0 0 5.76 1.47h.01c6.57 0 11.92-5.35 11.92-11.93 0-3.19-1.23-6.18-3.46-8.42ZM12.06 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.71.98.99-3.62-.24-.37a9.84 9.84 0 0 1-1.52-5.27c0-5.45 4.44-9.89 9.9-9.89a9.82 9.82 0 0 1 7 2.9 9.83 9.83 0 0 1 2.89 7c0 5.45-4.44 9.88-9.91 9.88Zm5.42-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47a8.9 8.9 0 0 1-1.65-2.05c-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.08-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.09 3.2 5.07 4.49.7.3 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35Z"/></svg></button>`:''}<button class="client-history" type="button" title="Analisar cliente" aria-label="Analisar cliente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V10h4v11H4Zm6 0V3h4v18h-4Zm6 0v-7h4v7h-4Z"/></svg><small>${cnt}</small></button><button class="client-edit" type="button" title="Editar" aria-label="Editar cliente">✎</button></div></article>`}).join('');
  list.querySelectorAll('.client-card').forEach(card=>{
   const c=syncClientsFromBookings().find(x=>x.id===card.dataset.id);if(!c)return;
   const wa=card.querySelector('.client-wa');if(wa)wa.onclick=()=>{const p=phoneForWhatsApp(c.phone);if(p)window.open('https://wa.me/'+p,'_blank','noopener')};
   card.querySelector('.client-history').onclick=()=>clientHistoryPage(c.id);
   card.querySelector('.client-edit').onclick=()=>clientEditor(c.id);
  });
 };
 $('#clientSearch').addEventListener('input',render);
 $('#clientFilterBtn').onclick=()=>{$('#clientFilterPanel').classList.toggle('hidden');$('#clientDatePanel').classList.add('hidden')};
 $('#clientDateBtn').onclick=()=>{$('#clientDatePanel').classList.toggle('hidden');$('#clientFilterPanel').classList.add('hidden')};
 $('#clientFavBtn').onclick=()=>{favoritesOnly=!favoritesOnly;$('#clientFavBtn').classList.toggle('active',favoritesOnly);render()};
 $('#clientFilterPanel').querySelectorAll('button').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;$('#clientFilterPanel').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));render()});
 $('#clientDateFilter').onchange=e=>{dateFilter=e.target.value;render()};
 $('#clearClientDate').onclick=()=>{dateFilter='';$('#clientDateFilter').value='';render()};
 $('#addClientBtn').onclick=()=>clientEditor();
 render();
}
function clientEditor(id=''){
 const all=syncClientsFromBookings(),c=all.find(x=>x.id===id)||{name:'',phone:'',favorite:false,notes:'',birthMonth:'',subscriber:false,subscriberValue:0,address:'',addressNumber:'',addressComplement:'',neighborhood:'',city:''};
 document.querySelector('.client-editor-overlay')?.remove();
 const months=['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
 const monthOptions=months.map((m,i)=>`<option value="${i||''}" ${String(c.birthMonth||'')===String(i||'')?'selected':''}>${m||'Mês de aniversário'}</option>`).join('');
 const overlay=document.createElement('div');
 overlay.className='client-editor-overlay';
 overlay.innerHTML=`<div class="client-editor-sheet" role="dialog" aria-modal="true" aria-label="${id?'Editar cliente':'Novo cliente'}">
  <div class="client-sheet-handle"></div>
  <div class="client-sheet-head"><h2>${id?'Editar cliente':'Novo cliente'}</h2><p>${id?'Edite os dados do cliente se necessário.':'Preencha os dados do novo cliente.'}</p></div>
  <form id="clientEditForm" class="client-sheet-form">
   <input id="ceName" class="sheet-input" required maxlength="80" value="${escapeHtml(c.name||'')}" placeholder="Nome do cliente" aria-label="Nome do cliente">
   <div class="sheet-phone"><span class="flag-br">🇧🇷</span><span class="flag-arrow">⌄</span><input id="cePhone" inputmode="tel" maxlength="20" value="${escapeHtml(c.phone||'')}" placeholder="+55 33 98835-1853" aria-label="Telefone"></div>
   <select id="ceBirthMonth" class="sheet-input sheet-select" aria-label="Mês de aniversário">${monthOptions}</select>
   <textarea id="ceNotes" class="sheet-input sheet-textarea" maxlength="500" placeholder="Observação" aria-label="Observação">${escapeHtml(c.notes||'')}</textarea>
   <label class="subscriber-card"><span class="subscriber-title"><span class="sheet-switch"><input id="ceSubscriber" type="checkbox" ${c.subscriber?'checked':''}><i></i></span>Cliente assinante?</span><small>Este cliente é um assinante recorrente do seu estabelecimento?</small></label>
   <div class="money-sheet-field"><span>R$</span><input id="ceSubscriberValue" inputmode="decimal" value="${Number(c.subscriberValue||0).toFixed(2).replace('.',',')}" aria-label="Valor da assinatura"></div>
   <h3 class="address-title">Endereço do cliente</h3>
   <input id="ceAddress" class="sheet-input" maxlength="120" value="${escapeHtml(c.address||'')}" placeholder="Endereço" aria-label="Endereço">
   <div class="address-grid"><input id="ceAddressNumber" class="sheet-input" maxlength="20" value="${escapeHtml(c.addressNumber||'')}" placeholder="Número" aria-label="Número"><input id="ceAddressComplement" class="sheet-input" maxlength="60" value="${escapeHtml(c.addressComplement||'')}" placeholder="Complemento" aria-label="Complemento"></div>
   <input id="ceNeighborhood" class="sheet-input" maxlength="80" value="${escapeHtml(c.neighborhood||'')}" placeholder="Bairro" aria-label="Bairro">
   <input id="ceCity" class="sheet-input" maxlength="80" value="${escapeHtml(c.city||'')}" placeholder="Cidade" aria-label="Cidade">
   <div class="sheet-actions"><button class="sheet-save" type="submit">SALVAR</button>${id?'<button id="deleteClient" class="sheet-delete" type="button">EXCLUIR CLIENTE</button>':''}<button id="closeClientEditor" class="sheet-cancel" type="button">CANCELAR</button></div>
  </form>
 </div>`;
 document.body.appendChild(overlay);
 document.body.classList.add('client-editor-open');
 const closeEditor=()=>{overlay.remove();document.body.classList.remove('client-editor-open')};
 overlay.addEventListener('click',e=>{if(e.target===overlay)closeEditor()});
 $('#closeClientEditor').onclick=closeEditor;
 $('#clientEditForm').onsubmit=e=>{
  e.preventDefault();
  const name=$('#ceName').value.trim(),phone=$('#cePhone').value.trim();if(!name){toast('Digite o nome do cliente');return}
  const rawValue=$('#ceSubscriberValue').value.replace(/\./g,'').replace(',','.').replace(/[^0-9.]/g,'');
  let arr=storedClients();
  const obj={...c,id:id||clientIdFrom(name,phone),name,phone,favorite:!!c.favorite,notes:$('#ceNotes').value.trim(),birthMonth:$('#ceBirthMonth').value,subscriber:$('#ceSubscriber').checked,subscriberValue:Number(rawValue||0),address:$('#ceAddress').value.trim(),addressNumber:$('#ceAddressNumber').value.trim(),addressComplement:$('#ceAddressComplement').value.trim(),neighborhood:$('#ceNeighborhood').value.trim(),city:$('#ceCity').value.trim(),updatedAt:new Date().toISOString()};
  if(id)arr=arr.filter(x=>x.id!==id);
  const duplicate=arr.findIndex(x=>x.id===obj.id);if(duplicate>=0)arr[duplicate]={...arr[duplicate],...obj};else arr.push(obj);
  saveClients(arr);closeEditor();clientsPage();toast(id?'Cliente atualizado':'Cliente cadastrado');
 };
 if(id)$('#deleteClient').onclick=()=>{if(confirm('Excluir este cliente da lista? Os agendamentos não serão apagados.')){saveClients(storedClients().filter(x=>x.id!==id));closeEditor();clientsPage();toast('Cliente excluído')}};
}
function clientHistoryPage(id){
 const c=syncClientsFromBookings().find(x=>x.id===id);if(!c){clientsPage();return}
 const bs=bookings().filter(b=>clientMatchesBooking(c,b)&&b.status!=='cancelado').sort((a,b)=>(b.date+' '+(b.time||'')).localeCompare(a.date+' '+(a.time||'')));
 const total=bs.reduce((sum,b)=>sum+Number(b.price||0),0);
 const avg=bs.length?total/bs.length:0;
 const minutes=bs.reduce((sum,b)=>sum+Number(b.duration||0),0);
 const hours=minutes/60;
 const byService={};bs.forEach(b=>{const n=b.serviceName||'Serviço';byService[n]=(byService[n]||0)+1});
 const topServices=Object.entries(byService).sort((a,b)=>b[1]-a[1]);
 const serviceCards=topServices.length?topServices.map(([name,count])=>`<div class="analysis-service-card"><strong>${count}</strong><span>${escapeHtml(name)}</span></div>`).join(''):'<div class="analysis-empty">Nenhum serviço realizado.</div>';
 const apptCards=bs.length?bs.map(b=>`<article class="analysis-booking-card" data-booking-id="${escapeHtml(b.id||'')}"><div class="analysis-booking-top"><span>${escapeHtml(b.time||'--:--')} - ${formatAnalysisDate(b.date)}</span><button class="analysis-more" type="button" aria-label="Opções do agendamento">•••</button></div><strong>${escapeHtml(c.name||b.clientName||'Cliente')}</strong><div class="analysis-booking-bottom"><span>${escapeHtml((b.serviceName||'Serviço').toUpperCase())}</span><b>${money(b.price)}</b></div></article>`).join(''):'<div class="analysis-empty">Nenhum agendamento deste cliente.</div>';
 openModal('',`<div class="client-analysis-screen">
   <button id="analysisBack" class="analysis-back" type="button" aria-label="Voltar">←</button>
   <div class="analysis-eyebrow">Analisar</div>
   <h2>${escapeHtml(c.name||'Cliente')}</h2>
   <div class="analysis-phone">${escapeHtml(c.phone||'Sem telefone')}</div>
   <div class="analysis-kpis">
     <div class="analysis-kpi accent"><strong>${money(avg)}</strong><span>TICKET MÉDIO</span></div>
     <div class="analysis-kpi"><strong>${formatActivityHours(hours)}</strong><span>EM ATIVIDADE</span></div>
   </div>
   <div class="analysis-section-label">SERVIÇOS REALIZADOS</div>
   <div class="analysis-service-scroller">${serviceCards}</div>
   ${topServices.length>2?'<div class="analysis-drag-hint">ARRESTE PARA O LADO PARA VER MAIS →</div>':''}
   <div class="analysis-bookings">${apptCards}</div>
  </div>`);
 $('#modal').classList.add('clients-modal','analysis-modal');
 $('#analysisBack').onclick=()=>{$('#modal').classList.remove('analysis-modal');clientsPage()};
 document.querySelectorAll('.analysis-booking-card').forEach(card=>{const btn=card.querySelector('.analysis-more');if(btn)btn.onclick=()=>{const bid=card.dataset.bookingId;if(bid)bookingActions(bid)}});
}
function formatAnalysisDate(dateStr){
 if(!dateStr)return'';const [y,m,d]=String(dateStr).split('-').map(Number);if(!y||!m||!d)return escapeHtml(dateStr);
 return new Date(y,m-1,d).toLocaleDateString('pt-BR',{day:'numeric',month:'short',year:'numeric'}).replace('.','');
}
function formatActivityHours(hours){
 if(!Number.isFinite(hours)||hours<=0)return'0 hrs';
 if(Math.abs(hours-Math.round(hours))<0.01)return`${Math.round(hours)} hrs`;
 return`${hours.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})} hrs`;
}
function cancelledSourceLabel(b){return ['barbeiro','manual','cliente'].includes(String(b.source||'').toLowerCase())?'CLIENTE':'APP'}
function cancelledDateLabel(dateStr){
 if(!dateStr)return'';const [y,m,d]=String(dateStr).split('-').map(Number);if(!y||!m||!d)return escapeHtml(dateStr);
 return new Date(y,m-1,d).toLocaleDateString('pt-BR',{day:'numeric',month:'short',year:'numeric'}).replaceAll('.','');
}
function whatsappNumber(v){let n=normalizePhone(v);if(n.length===10||n.length===11)n='55'+n;return n}
function whatsappSvg(){return `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.04 3C8.85 3 3 8.73 3 15.78c0 2.25.6 4.45 1.74 6.37L3 28.5l6.55-1.7a13.18 13.18 0 0 0 6.48 1.68h.01C23.23 28.48 29 22.75 29 15.7 29 8.67 23.23 3 16.04 3Zm0 23.3c-2.06 0-4.08-.55-5.83-1.58l-.42-.25-3.89 1.01 1.04-3.72-.27-.43a10.4 10.4 0 0 1-1.62-5.55c0-5.85 4.93-10.6 10.99-10.6 6.05 0 10.92 4.72 10.92 10.52 0 5.85-4.87 10.6-10.92 10.6Zm6.02-7.92c-.33-.16-1.95-.94-2.25-1.05-.3-.1-.52-.16-.74.16-.22.32-.85 1.05-1.04 1.27-.19.21-.38.24-.71.08-.33-.16-1.39-.5-2.65-1.6-.98-.85-1.64-1.9-1.83-2.22-.19-.32-.02-.5.14-.66.15-.14.33-.37.49-.56.16-.18.22-.32.33-.53.11-.21.05-.4-.03-.56-.08-.16-.74-1.74-1.01-2.38-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.4-.3.32-1.15 1.1-1.15 2.68s1.18 3.11 1.34 3.32c.16.21 2.32 3.47 5.62 4.87.79.33 1.4.53 1.88.68.79.24 1.5.21 2.07.13.63-.09 1.95-.78 2.22-1.53.27-.75.27-1.39.19-1.53-.08-.13-.3-.21-.63-.37Z"/></svg>`}
function renderCancelledCards(filter='all'){
 const wrap=$('#cancelledList');if(!wrap)return;
 let data=bookings().filter(b=>b.status==='cancelado').sort((a,b)=>(b.date+' '+(b.time||'')).localeCompare(a.date+' '+(a.time||'')));
 if(filter==='app')data=data.filter(b=>cancelledSourceLabel(b)==='APP');
 if(filter==='client')data=data.filter(b=>cancelledSourceLabel(b)==='CLIENTE');
 wrap.innerHTML=data.length?data.map(b=>{const phone=whatsappNumber(b.clientPhone);return `<article class="cancelled-card">
   <div class="cancelled-card-top"><b>${escapeHtml(b.time||'--:--')} - ${cancelledDateLabel(b.date)}</b><strong>${cancelledSourceLabel(b)}</strong></div>
   <div class="cancelled-card-main"><div class="cancelled-person"><h3>${escapeHtml(b.clientName||'Cliente')}</h3><span>${escapeHtml(String(b.serviceName||'Serviço').toUpperCase())}</span></div>
   <div class="cancelled-side">${phone?`<button class="cancelled-wa" data-phone="${phone}" aria-label="Abrir WhatsApp">${whatsappSvg()}</button>`:'<span class="cancelled-wa-placeholder"></span>'}<span class="cancelled-price">${money(b.price)}</span></div></div>
  </article>`}).join(''):`<div class="cancelled-empty">Nenhum cancelamento encontrado.</div>`;
 wrap.querySelectorAll('.cancelled-wa').forEach(btn=>btn.onclick=()=>window.open('https://wa.me/'+btn.dataset.phone,'_blank','noopener'));
}
function cancelledPage(){
 openModal('',`<div class="cancelled-screen"><button id="cancelledBack" class="cancelled-back" aria-label="Voltar">←</button>
  <div class="cancelled-eyebrow">Agendamentos</div><div class="cancelled-title-row"><h2>Cancelados</h2><select id="cancelledFilter" aria-label="Filtrar cancelados"><option value="all">MEUS CANCELADOS</option><option value="client">CLIENTE</option><option value="app">APP</option></select></div>
  <div id="cancelledList" class="cancelled-list"></div></div>`);
 $('#modal').classList.add('cancelled-modal');
 $('#cancelledBack').onclick=()=>{$('#modal').classList.remove('cancelled-modal');closeModal()};
 $('#cancelledFilter').onchange=e=>renderCancelledCards(e.target.value);
 renderCancelledCards('all');
}
function revenuePage(){
 const now=new Date();
 const monthKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
 const monthLabel=d=>['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][d.getMonth()];
 const months=Array.from({length:12},(_,i)=>{const d=new Date(now.getFullYear(),i,1);return {key:monthKey(d),label:monthLabel(d),date:d}})
 let selected=monthKey(now), balanceMode='meu', customStart='', customEnd='';
 const statusOk=(b,mode)=>{if(b.status==='cancelado')return false;if(mode==='realizados')return b.status==='concluido'||(b.date&&b.date<key(new Date()));if(mode==='agendados')return b.status!=='concluido';return b.status==='concluido'||(b.date&&b.date<=key(new Date()))};
 const getMonthRows=()=>bookings().filter(b=>String(b.date||'').slice(0,7)===selected && statusOk(b,balanceMode));
 const getRows=()=>{let a=getMonthRows();if(customStart)a=a.filter(b=>b.date>=customStart);if(customEnd)a=a.filter(b=>b.date<=customEnd);return a};
 const daysInMonth=(y,m)=>new Date(y,m+1,0).getDate();
 const calcHours=(rows)=>{const [y,m]=selected.split('-').map(Number),s=settings();const dayMins=Math.max(0,mins(s.end)-mins(s.start));let scheduled=0,closed=0;for(let d=1;d<=daysInMonth(y,m-1);d++){const dt=new Date(y,m-1,d),dk=key(dt);if(dt.getDay()===0)continue;scheduled+=dayMins;if(blockedDays().includes(dk))closed+=dayMins}const worked=rows.reduce((a,b)=>a+Number(b.duration||0),0);const available=Math.max(0,scheduled-closed);const idle=Math.max(0,available-worked);return{scheduled,closed,available,worked,idle}};
 const fmtHours=m=>`${Math.round(m/60)} hrs`;
 const percent=(n,d)=>d?Math.round(n/d*100):0;
 const escapeAttr=v=>escapeHtml(String(v??'')).replace(/\"/g,'&quot;');
 function render(){
  const rows=getRows(); const total=rows.reduce((a,b)=>a+Number(b.price||0),0); const count=rows.length;
  const byDay={};rows.forEach(b=>{const d=Number(String(b.date||'').slice(8,10));if(d)byDay[d]=(byDay[d]||0)+Number(b.price||0)});const maxDay=Math.max(1,...Object.values(byDay));
  const [yy,mm]=selected.split('-').map(Number),dim=daysInMonth(yy,mm-1);const chartDays=Array.from({length:dim},(_,i)=>i+1);
  const serviceMap={};rows.forEach(b=>{const n=b.serviceName||'Serviço';if(!serviceMap[n])serviceMap[n]={count:0,total:0};serviceMap[n].count++;serviceMap[n].total+=Number(b.price||0)});const svc=Object.entries(serviceMap).sort((a,b)=>b[1].count-a[1].count);
  const hrs=calcHours(rows),workedH=hrs.worked/60,ticket=count?total/count:0,occup=percent(hrs.worked,hrs.available);
  const unique=new Set(rows.map(b=>(b.clientPhone||'').replace(/\D/g,'')||String(b.clientName||'').trim().toLowerCase()).filter(Boolean)).size;
  const perClient=unique?count/unique:0;
  const monthAll=bookings().filter(b=>String(b.date||'').slice(0,7)===selected);const cancelled=monthAll.filter(b=>b.status==='cancelado').length;const performance=(count+cancelled)?count/(count+cancelled):0;
  const pending=monthAll.filter(b=>['pendente','pending'].includes(String(b.status||'').toLowerCase())).length;
  const top=svc[0];
  const paymentMap={};rows.forEach(b=>{const p=(b.paymentMethod||b.payment||'Não detalhados');if(!paymentMap[p])paymentMap[p]=0;paymentMap[p]+=Number(b.price||0)});const pays=Object.entries(paymentMap).sort((a,b)=>b[1]-a[1]);
  const monthTabs=months.map(m=>`<button class="rev-month ${m.key===selected?'active':''}" data-month="${m.key}">${m.label}</button>`).join('');
  const chart=chartDays.map(d=>`<div class="rev-bar-col"><div class="rev-bar-zone"><i style="height:${Math.max(0,(byDay[d]||0)/maxDay*100)}%"></i></div><b>${String(d).padStart(2,'0')}</b></div>`).join('');
  const servicesHtml=svc.length?svc.map(([name,v])=>`<article class="rev-service-card"><div><strong>${v.count}</strong><span>${percent(v.count,count)}%</span></div><b>${escapeHtml(name)}</b></article>`).join(''):`<article class="rev-service-card empty"><div><strong>0</strong><span>0%</span></div><b>Sem serviços</b></article>`;
  const payHtml=pays.map(([name,val])=>`<div class="rev-payment-row"><div><b>${escapeHtml(name)}</b><strong>${money(val)}</strong></div><div><span>${percent(val,total)}%</span>${name==='Não detalhados'?'<button class="rev-more-pay">VER MAIS</button>':''}</div></div>`).join('');
  $('#modal').classList.add('revenue-mode');
  $('#modalTitle').textContent='';
  $('#modalContent').innerHTML=`<section class="revenue-page">
   <button class="rev-back" id="revBack">←</button><div class="rev-kicker">Analisar</div><h1>Faturamento</h1>
   <div class="rev-months">${monthTabs}</div>
   <div class="rev-balance-head"><span>BALANÇO SERVIÇOS</span><select id="revBalance"><option value="meu" ${balanceMode==='meu'?'selected':''}>MEU BALANÇO</option><option value="realizados" ${balanceMode==='realizados'?'selected':''}>REALIZADOS</option><option value="agendados" ${balanceMode==='agendados'?'selected':''}>AGENDADOS</option></select></div>
   <div class="rev-total">${money(total)}</div><div class="rev-count"><b>${count}</b> atendimentos</div>
   <div class="rev-chart">${chart}</div><div class="rev-drag">→ <span>ARRASTE PARA O LADO PARA VER MAIS</span></div>
   <div class="rev-filter-row"><span>FILTRO:</span><button id="revDateBtn">DATA</button><button id="revPdf">GERAR PDF</button></div>
   <div id="revDateBox" class="rev-date-box ${customStart||customEnd?'show':''}"><label>De <input id="revStart" type="date" value="${escapeAttr(customStart)}"></label><label>Até <input id="revEnd" type="date" value="${escapeAttr(customEnd)}"></label><button id="revApplyDate">APLICAR</button><button id="revClearDate">LIMPAR</button></div>
   <h3 class="rev-section-title">SERVIÇOS REALIZADOS</h3><div class="rev-services">${servicesHtml}</div><div class="rev-drag">→ <span>ARRASTE PARA O LADO PARA VER MAIS</span></div>
   <div class="rev-duo"><article class="rev-metric accent"><strong>${money(ticket)}</strong><span>TICKET MÉDIO</span></article><article class="rev-metric"><strong>${occup}%</strong><span>TAXA DE OCUPAÇÃO</span></article></div>
   <h3 class="rev-section-title">PAGAMENTOS</h3><div class="rev-payments">${payHtml||'<div class="rev-payment-row"><div><b>Não detalhados</b><strong>R$ 0,00</strong></div><div><span>0%</span></div></div>'}</div>
   <h3 class="rev-section-title">DISTRIBUIÇÃO DE HORAS</h3><article class="rev-hours"><strong>${fmtHours(hrs.available)} disponíveis</strong><div class="rev-hourbar"><i class="worked" style="width:${percent(hrs.worked,Math.max(1,hrs.available))}%"><span>${fmtHours(hrs.worked)}</span></i><i class="idle" style="width:${percent(hrs.idle,Math.max(1,hrs.available))}%"><span>${fmtHours(hrs.idle)}</span></i></div><div class="rev-legend"><span>● Trabalhadas</span><span>● Ocioso</span><span>● Fechada</span></div></article>
   <h3 class="rev-section-title">MAIS DADOS</h3><div class="rev-more-data">
    <div><span>CLIENTES ÚNICOS</span><b>${unique} ⓘ</b></div><div><span>ATENDIMENTOS POR<br>CLIENTE</span><b>${perClient.toFixed(2).replace('.',',')} ⓘ</b></div><div><span>PERFORMANCE</span><b>${performance.toFixed(2).replace('.',',')} ⓘ</b></div><div><span>RECEITA POR HORA</span><b>${money(workedH?total/workedH:0)} ⓘ</b></div><div><span>UPSELL PRODUTO</span><b>0% ⓘ</b></div><div><span>PENDÊNCIAS</span><b>${pending?pending:'0%'} ⓘ</b></div><div><span>TOP SERVIÇO</span><b>${top?escapeHtml(top[0].toUpperCase())+' ('+percent(top[1].count,count)+'%)':'—'} ⓘ</b></div><div><span>HORAS DISPONÍVEIS</span><b>${fmtHours(hrs.available)} ⓘ</b></div><div><span>HORAS TRABALHADAS</span><b>${fmtHours(hrs.worked)} ⓘ</b></div><div><span>TEMPO OCIOSO</span><b>${fmtHours(hrs.idle)} ⓘ</b></div>
   </div><div class="rev-bottom-space"></div></section>`;
  document.querySelectorAll('.rev-month').forEach(b=>b.onclick=()=>{selected=b.dataset.month;customStart='';customEnd='';render()});
  $('#revBalance').onchange=e=>{balanceMode=e.target.value;render()};
  $('#revBack').onclick=()=>{closeModal();$('#modal').classList.remove('revenue-mode')};
  $('#revDateBtn').onclick=()=>$('#revDateBox').classList.toggle('show');
  $('#revApplyDate').onclick=()=>{customStart=$('#revStart').value;customEnd=$('#revEnd').value;render()};
  $('#revClearDate').onclick=()=>{customStart='';customEnd='';render()};
  $('#revPdf').onclick=()=>generateRevenuePdf(rows,total,count,selected,ticket,occup,svc,hrs,unique,perClient);
 }
 function generateRevenuePdf(rows,total,count,month,ticket,occup,svc,hrs,unique,perClient){
   const [y,m]=month.split('-').map(Number),title=`Faturamento ${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][m-1]} de ${y}`;
   const w=window.open('','_blank');if(!w){alert('Permita pop-ups para gerar o PDF.');return}
   w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial;padding:32px;color:#111}h1{font-size:30px}h2{margin-top:28px}.big{font-size:42px;font-weight:700}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.card{border:1px solid #ddd;border-radius:12px;padding:16px}table{width:100%;border-collapse:collapse}td,th{padding:9px;border-bottom:1px solid #ddd;text-align:left}@media print{button{display:none}}</style></head><body><h1>${title}</h1><div class="big">${money(total)}</div><p>${count} atendimentos</p><div class="grid"><div class="card"><b>Ticket médio</b><br>${money(ticket)}</div><div class="card"><b>Taxa de ocupação</b><br>${occup}%</div><div class="card"><b>Clientes únicos</b><br>${unique}</div><div class="card"><b>Atendimentos por cliente</b><br>${perClient.toFixed(2).replace('.',',')}</div></div><h2>Serviços realizados</h2><table><tr><th>Serviço</th><th>Qtd.</th><th>Total</th></tr>${svc.map(([n,v])=>`<tr><td>${escapeHtml(n)}</td><td>${v.count}</td><td>${money(v.total)}</td></tr>`).join('')}</table><h2>Distribuição de horas</h2><p>Disponíveis: ${fmtHours(hrs.available)} • Trabalhadas: ${fmtHours(hrs.worked)} • Ocioso: ${fmtHours(hrs.idle)}</p><h2>Atendimentos</h2><table><tr><th>Data</th><th>Cliente</th><th>Serviço</th><th>Valor</th></tr>${rows.map(b=>`<tr><td>${escapeHtml(b.date||'')} ${escapeHtml(b.time||'')}</td><td>${escapeHtml(b.clientName||'')}</td><td>${escapeHtml(b.serviceName||'')}</td><td>${money(b.price||0)}</td></tr>`).join('')}</table><script>setTimeout(()=>window.print(),300)<\/script></body></html>`);w.document.close();
 }
 openModal('', '<div></div>');render();
}
function recurrencePage(){const rs=recurrings();openModal('Minhas recorrências',`${rs.length?rs.map((r,i)=>`<div class="list-card"><h3>${escapeHtml(r.clientName)}</h3><p>${escapeHtml(r.serviceName)} • toda ${r.frequency} semana(s) • ${r.time}</p><button class="small-btn danger del-rec" data-i="${i}">Excluir</button></div>`).join(''):'<p>Nenhuma recorrência.</p>'}<button id="addRec" class="primary-btn">+ NOVA RECORRÊNCIA</button>`);document.querySelectorAll('.del-rec').forEach(b=>b.onclick=()=>{const a=recurrings();a.splice(Number(b.dataset.i),1);saveRecurrings(a);recurrencePage()});$('#addRec').onclick=recurrenceEditor}
function recurrenceEditor(){const opts=services().filter(s=>s.active!==false).map(s=>`<option>${escapeHtml(s.name)}</option>`).join('');openModal('Nova recorrência',`<form id="recForm"><div class="field"><label>Cliente</label><input id="rName" required></div><div class="field"><label>Telefone</label><input id="rPhone"></div><div class="field"><label>Serviço</label><select id="rService">${opts}</select></div><div class="field"><label>Primeira data</label><input id="rDate" type="date" required></div><div class="field"><label>Horário</label><input id="rTime" type="time" required></div><div class="field"><label>Repetir a cada</label><select id="rFreq"><option value="1">1 semana</option><option value="2">2 semanas</option><option value="4">4 semanas</option></select></div><button class="primary-btn">SALVAR RECORRÊNCIA</button></form>`);$('#recForm').onsubmit=e=>{e.preventDefault();const item={id:uuid(),clientName:$('#rName').value.trim(),phone:$('#rPhone').value.trim(),serviceName:$('#rService').value,startDate:$('#rDate').value,time:$('#rTime').value,frequency:Number($('#rFreq').value)};const a=recurrings();a.push(item);saveRecurrings(a);generateRecurring(item,8);recurrencePage();toast('Recorrência criada')}}
function generateRecurring(r,count){const srv=services().find(s=>s.name===r.serviceName);if(!srv)return;const all=bookings(),base=new Date(r.startDate+'T12:00:00');for(let i=0;i<count;i++){const d=addDays(base,i*r.frequency*7),date=key(d);if(d.getDay()===0||blockedDays().includes(date)||all.some(b=>b.date===date&&b.time===r.time&&b.status!=='cancelado'))continue;all.push({id:uuid(),clientName:r.clientName,clientPhone:r.phone,serviceName:srv.name,price:srv.price,duration:srv.duration,date,dateLabel:d.toLocaleDateString('pt-BR'),time:r.time,status:'confirmado',source:'recorrencia',recurrenceId:r.id})}saveBookings(all);renderAll()}
function settingsPage(){const s=settings(),p=load(KEYS.barber,{name:'Nicácio'});openModal('Configurações',`<form id="settingsForm"><div class="field"><label>Nome exibido</label><input id="setName" value="${escapeHtml(p.name||'Nicácio')}"></div><div class="field"><label>Início do expediente</label><input id="setStart" type="time" value="${s.start}"></div><div class="field"><label>Fim do expediente</label><input id="setEnd" type="time" value="${s.end}"></div><div class="field"><label>Intervalo da agenda</label><select id="setInterval"><option value="10" ${s.interval==10?'selected':''}>10 minutos</option><option value="20" ${s.interval==20?'selected':''}>20 minutos</option><option value="30" ${s.interval==30?'selected':''}>30 minutos</option><option value="60" ${s.interval==60?'selected':''}>60 minutos</option></select></div><button class="primary-btn">SALVAR CONFIGURAÇÕES</button></form>`);$('#settingsForm').onsubmit=e=>{e.preventDefault();saveSettings({start:$('#setStart').value,end:$('#setEnd').value,interval:Number($('#setInterval').value)});save(KEYS.barber,{name:$('#setName').value.trim()||'Nicácio'});closeModal();renderAll();toast('Configurações salvas')}}
function linkConfig(){
 const base={
  enabled:true,slug:'',maxDays:90,minLead:10,accent:'#c67d59',anonymous:true,waitlist:false,
  allowCancel:true,cancelLead:15,gif:true,extraText:'AVISO DE ATRASOS.\n\nTOLERÂNCIA MÁXIMA DE ATRASO SERÁ DE 5 MINUTOS APENAS.\nCANCELE OU AVISE ANTES DO HORÁRIO MARCADO.'
 };
 return {...base,...load(KEYS.linkConfig,{})};
}
function saveLinkConfig(v){save(KEYS.linkConfig,v)}
function publicClientUrl(){
 const c=linkConfig(),base='https://barbearia-nicacio.onrender.com/';
 return c.slug?base+'?agenda='+encodeURIComponent(c.slug):base;
}
function linkPage(){
 const cfg=linkConfig(),clientUrl=publicClientUrl();
 const shareText='Agende seu horário na Barbearia Nicácio:';
 openModal('',`<div class="link-screen">
   <button id="linkBack" class="link-back" type="button" aria-label="Voltar">←</button>
   <div class="link-eyebrow">Compartilhar</div>
   <h2 class="link-title">Meu link</h2>
   <section class="share-card">
     <h3>Fale de sua agenda para seus clientes.</h3>
     <p>Compartilhe seu link com seus clientes para que eles possam realizar o agendamento dos serviços.</p>
     <div class="link-box">
       <div id="clientLinkText" class="link-url">${clientUrl}</div>
       <button id="copyLink" class="copy-link-btn" type="button">Copiar link</button>
     </div>
     <div class="link-status-row">
       <span><i class="online-dot ${cfg.enabled?'':'offline-dot'}"></i> ${cfg.enabled?'Seu link está online':'Seu link está desativado'}</span>
       <button id="configureLink" type="button">Configurar link</button>
     </div>
     <div class="share-actions">
       <button id="shareWhats" type="button"><span class="share-icon whatsapp">☎</span><b>WhatsApp</b></button>
       <button id="showQr" type="button"><span class="share-icon qr">▦</span><b>QRCode</b></button>
       <button id="shareFacebook" type="button"><span class="share-icon facebook">f</span><b>Facebook</b></button>
       <button id="shareMore" type="button"><span class="share-icon more">•••</span><b>Mais</b></button>
     </div>
   </section>
 </div>`);
 $('#modal').classList.add('link-modal');
 const closeLink=()=>{$('#modal').classList.remove('link-modal');closeModal()};
 $('#linkBack').onclick=closeLink;
 const copyClientLink=async()=>{
   try{await navigator.clipboard.writeText(clientUrl);toast('Link copiado')}
   catch{const ta=document.createElement('textarea');ta.value=clientUrl;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast('Link copiado')}catch{toast('Não foi possível copiar')}ta.remove()}
 };
 $('#copyLink').onclick=copyClientLink;
 $('#configureLink').onclick=openLinkConfig;
 $('#shareWhats').onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent(shareText+' '+clientUrl),'_blank','noopener');
 $('#shareFacebook').onclick=()=>window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(clientUrl),'_blank','noopener');
 $('#shareMore').onclick=async()=>{if(navigator.share){try{await navigator.share({title:'Barbearia Nicácio',text:shareText,url:clientUrl})}catch(e){if(e&&e.name!=='AbortError')toast('Não foi possível compartilhar')}}else copyClientLink()};
 $('#showQr').onclick=()=>openQrExport(clientUrl);
}

function downloadQrFile(format){
 const ext=format==='svg'?'svg':'png';
 const filename='qrcode-barbearia-nicacio.'+ext;
 const asset=ext==='svg'?'qrcode-cliente.svg':'qrcode-cliente.png';
 const a=document.createElement('a');
 a.href=asset;
 a.download=filename;
 document.body.appendChild(a);
 a.click();
 a.remove();
 toast('QR Code exportado em '+ext.toUpperCase());
}
function openQrExport(clientUrl){
 const content=$('#modalContent');
 content.innerHTML=`<div class="qr-export-screen">
   <button id="qrExportBack" class="qr-export-back" type="button" aria-label="Voltar">←</button>
   <h2>Seu QRCode</h2>
   <div class="qr-export-image-wrap">
     <img id="qrExportImage" alt="QR Code do aplicativo da Barbearia Nicácio" src="qrcode-cliente.png">
   </div>
   <div class="qr-export-actions">
     <button id="exportQrSvg" type="button">Exportar como SVG</button>
     <button id="exportQrPng" type="button">Exportar como PNG</button>
   </div>
 </div>`;
 $('#qrExportBack').onclick=linkPage;
 $('#exportQrSvg').onclick=()=>downloadQrFile('svg');
 $('#exportQrPng').onclick=()=>downloadQrFile('png');
}

function openLinkConfig(){
 const cfg=linkConfig();
 const content=$('#modalContent');
 content.innerHTML=`<form id="linkConfigForm" class="link-config-form">
  <div class="config-topbar"><button id="configBack" class="link-back" type="button" aria-label="Voltar">←</button><div><div class="link-eyebrow">Meu link</div><h2 class="link-title">Configurar link</h2><p>Ajuste os campos abaixo para configurar parâmetros de seu link.</p></div></div>

  <section class="config-switch-card"><label class="switch-row"><span class="switch"><input id="lcEnabled" type="checkbox" ${cfg.enabled?'checked':''}><i></i></span><b>Receber agendamentos pelo link</b></label><p>Desativando essa função você estará desligando seu link de agendamento.</p></section>

  <label class="config-label">LINK PERSONALIZADO</label>
  <div class="slug-row"><span>barbearia-nicacio.onrender.com/?agenda=</span><input id="lcSlug" maxlength="30" placeholder="seu-link-de-agendamento" value="${escapeHtml(cfg.slug||'')}"></div>
  <p class="config-help">Escolha um nome único para o seu link e torne sua página mais profissional.</p>

  <label class="config-label">PERÍODO MÁXIMO PARA AGENDAR</label>
  <select id="lcMaxDays" class="config-select">
   ${[30,60,90,120,180].map(n=>`<option value="${n}" ${Number(cfg.maxDays)===n?'selected':''}>Até ${n} dias corridos no futuro</option>`).join('')}
  </select>
  <p class="config-help">O tempo máximo futuro em que a agenda fica disponível para o cliente agendar um horário.</p>

  <label class="config-label">ANTECEDÊNCIA MÍNIMA PARA AGENDAR</label>
  <select id="lcMinLead" class="config-select">
   ${[0,10,15,30,60,120,240,1440].map(n=>`<option value="${n}" ${Number(cfg.minLead)===n?'selected':''}>${n===0?'Sem antecedência':n<60?n+' min antes':n===60?'1 hora antes':n===120?'2 horas antes':n===240?'4 horas antes':'1 dia antes'}</option>`).join('')}
  </select>
  <div class="config-help strong-help"><b>EVITE AGENDAMENTO EM CIMA DA HORA:</b><br>Configure um tempo mínimo para agendar, ou seja, o tempo mínimo necessário entre seu cliente agendar e o início do atendimento.</div>

  <label class="config-label">COR PRINCIPAL DA PÁGINA DE AGENDAMENTO</label>
  <div class="color-picker-row"><input id="lcAccent" type="color" value="${escapeHtml(cfg.accent||'#c67d59')}"><span id="colorPreview" style="background:${escapeHtml(cfg.accent||'#c67d59')}"></span></div>
  <div class="config-help strong-help"><b>PERSONALIZE SUA PÁGINA DE AGENDAMENTO:</b><br>Configure uma cor principal para a caixa de texto do seu link de agendamento.</div>

  <section class="config-switch-card"><label class="switch-row"><span class="switch"><input id="lcAnonymous" type="checkbox" ${cfg.anonymous?'checked':''}><i></i></span><b>Agendamento em modo anônimo</b></label><p>Seus clientes poderão agendar com navegador em modo anônimo ou privado?</p></section>
  <section class="config-switch-card"><label class="switch-row"><span class="switch"><input id="lcWaitlist" type="checkbox" ${cfg.waitlist?'checked':''}><i></i></span><b>Lista de espera</b></label><p>Permitir que clientes se inscrevam em uma lista de espera quando todos os horários estiverem ocupados?</p></section>
  <section class="config-switch-card"><label class="switch-row"><span class="switch"><input id="lcCancel" type="checkbox" ${cfg.allowCancel?'checked':''}><i></i></span><b>Cancelar agendamento pelo chat</b></label><p>Seus clientes poderão cancelar os agendamentos ainda em aberto em nome deles?</p></section>

  <label class="config-label">ANTECEDÊNCIA PARA CANCELAMENTO</label>
  <select id="lcCancelLead" class="config-select">
    ${[0,10,15,30,60,120,240,1440].map(n=>`<option value="${n}" ${Number(cfg.cancelLead)===n?'selected':''}>${n===0?'A qualquer momento':n<60?'Até '+n+' min antes':n===60?'Até 1 hora antes':n===120?'Até 2 horas antes':n===240?'Até 4 horas antes':'Até 1 dia antes'}</option>`).join('')}
  </select>
  <div class="config-help strong-help"><b>EVITE CANCELAMENTOS EM CIMA DA HORA:</b><br>O tempo mínimo de antecedência para o cliente cancelar um agendamento.</div>

  <section class="config-switch-card"><label class="switch-row"><span class="switch"><input id="lcGif" type="checkbox" ${cfg.gif?'checked':''}><i></i></span><b>GIF no final do chat</b></label><p>Seus clientes verão um GIF de comemoração após a confirmação do agendamento?</p></section>

  <label class="config-label config-counter-label">TEXTO ADICIONAL <span id="textCounter">${String(cfg.extraText||'').length}/120</span></label>
  <textarea id="lcExtraText" class="config-textarea" maxlength="120" rows="7">${escapeHtml(cfg.extraText||'')}</textarea>
  <div class="save-bar-wrap"><button class="config-save-btn" type="submit">SALVAR</button></div>
 </form>`;
 $('#configBack').onclick=linkPage;
 const color=$('#lcAccent'),preview=$('#colorPreview');color.oninput=()=>preview.style.background=color.value;
 const ta=$('#lcExtraText'),counter=$('#textCounter');ta.oninput=()=>counter.textContent=ta.value.length+'/120';
 $('#lcSlug').addEventListener('input',e=>{e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')});
 $('#linkConfigForm').onsubmit=e=>{
   e.preventDefault();
   const next={enabled:$('#lcEnabled').checked,slug:$('#lcSlug').value.trim(),maxDays:Number($('#lcMaxDays').value),minLead:Number($('#lcMinLead').value),accent:$('#lcAccent').value,anonymous:$('#lcAnonymous').checked,waitlist:$('#lcWaitlist').checked,allowCancel:$('#lcCancel').checked,cancelLead:Number($('#lcCancelLead').value),gif:$('#lcGif').checked,extraText:$('#lcExtraText').value.trim()};
   saveLinkConfig(next);toast('Configurações do link salvas');setTimeout(linkPage,350);
 };
}
function helpPage(){openModal('Ajuda p/ configurar',`<div class="list-card"><h3>Configuração rápida</h3><p>Use <b>Serviços e preços</b> para alterar valores e duração. Em <b>Configurações</b>, ajuste o expediente e o intervalo dos horários. Para fechar um dia, selecione a data na agenda e toque em <b>Modificar este dia</b>.</p></div>`)}
function reportPage(){openModal('Reportar erro',`<div class="list-card"><h3>Encontrou algum problema?</h3><p>Anote o que aconteceu, o horário e a tela onde ocorreu. Assim fica mais fácil corrigir sem perder seus agendamentos.</p><textarea id="errorText" class="field-input" rows="5" placeholder="Descreva o erro aqui..."></textarea></div><button id="saveError" class="primary-btn">SALVAR RELATO</button>`);$('#saveError').onclick=()=>{const t=$('#errorText').value.trim();if(!t)return toast('Descreva o erro');localStorage.setItem('nicacio_last_error_report',t);toast('Relato salvo neste aparelho');closeModal()}}
function ratePage(){openModal('Avaliar app',`<div class="list-card" style="text-align:center"><h3>Como está o aplicativo?</h3><p>Escolha uma nota para registrar sua avaliação neste aparelho.</p><div id="rateStars" style="font-size:36px;letter-spacing:8px;margin:18px 0">☆ ☆ ☆ ☆ ☆</div></div>`);const box=$('#rateStars');box.innerHTML=[1,2,3,4,5].map(n=>`<button type="button" data-rate="${n}" style="border:0;background:transparent;color:#e5a16f;font-size:36px;padding:4px">☆</button>`).join('');box.querySelectorAll('button').forEach(b=>b.onclick=()=>{localStorage.setItem('nicacio_barber_rating',b.dataset.rate);box.querySelectorAll('button').forEach((x,i)=>x.textContent=i<Number(b.dataset.rate)?'★':'☆');toast('Avaliação registrada')})}

$('#prevWeek').onclick=()=>{currentWeekStart=addDays(currentWeekStart,-7);selectedDate=new Date(currentWeekStart);renderAll()};$('#nextWeek').onclick=()=>{currentWeekStart=addDays(currentWeekStart,7);selectedDate=new Date(currentWeekStart);renderAll()};$('#togglePrivacy').onclick=()=>{valuesHidden=!valuesHidden;renderStats();renderTimeline()};$('#newBookingBtn').onclick=()=>newBookingModal();$('#lockDayBtn').onclick=toggleDayBlock;$('#editDayBtn').onclick=editDayPage;$('#openMenu').onclick=()=>{$('#sideMenu').classList.remove('hidden');$('#menuOverlay').classList.remove('hidden');$('#sideMenu').setAttribute('aria-hidden','false')};$('#closeMenu').onclick=closeMenu;$('#menuOverlay').onclick=closeMenu;$('#closeModal').onclick=closeModal;
document.querySelectorAll('.menu-list button').forEach(btn=>btn.onclick=()=>{closeMenu();const p=btn.dataset.page;if(p==='link')linkPage();else if(p==='services')servicesPage();else if(p==='clients')clientsPage();else if(p==='cancelled')cancelledPage();else if(p==='recurrence')recurrencePage();else if(p==='revenue')revenuePage();else if(p==='help')helpPage();else if(p==='report')reportPage();else if(p==='rate')ratePage();else if(p==='settings')settingsPage()});
services();renderAll();

/* V19 — Configurações estilo referência */
const V19_COMPANY_KEY='nicacio_company_profile';
const V19_PROS_KEY='nicacio_professionals';
const V19_EXTRA_KEY='nicacio_extra_settings';
function v19Company(){return {...{name:'Barbearia Nicacio',street:'Rua São José',number:'197',complement:'Ao lado do Bradesco',district:'Centro',city:'São José do jacuri',state:'MG',cep:'39665-000',phone:'(33) 98886-9797'},...load(V19_COMPANY_KEY,{})}}
function v19Pros(){let a=load(V19_PROS_KEY,null);if(!a){a=[{id:uuid(),name:'Gustavo Nicacio Nascimento'}];save(V19_PROS_KEY,a)}return a}
function v19Extra(){return {...{notifications:true,messages:false},...load(V19_EXTRA_KEY,{})}}
function v19Open(html){$('#modal').classList.add('settings-mode');$('#modalContent').innerHTML=html;$('#modal').classList.remove('hidden');$('#modal').setAttribute('aria-hidden','false');window.scrollTo(0,0)}
const _v19CloseModal=closeModal; closeModal=function(){ $('#modal').classList.remove('settings-mode'); _v19CloseModal(); };
function v19BackBtn(){return `<button class="settings-back" type="button" data-v19-back>‹</button>`}
function settingsPage(){
 const c=v19Company(),list=services().filter(s=>s.active!==false),pros=v19Pros(),ex=v19Extra();
 v19Open(`<div class="settings-screen">${v19BackBtn()}<div class="settings-kicker">Minhas</div><h1 class="settings-title">Configurações</h1>
 <section class="settings-section"><div class="settings-section-head"><span>DADOS DA EMPRESA</span><button class="settings-edit" id="v19EditCompany">EDITAR</button></div><h2 class="company-name">${escapeHtml(c.name)}</h2><div class="company-meta">${escapeHtml(c.street)}, ${escapeHtml(c.number)} - ${escapeHtml(c.complement)}<br>${escapeHtml(c.district)} - ${escapeHtml(c.city)} / ${escapeHtml(c.state)}</div><div class="company-phone">+55 ${escapeHtml(c.phone)}</div></section>
 <section class="settings-section"><div class="settings-section-head"><span>SERVIÇOS</span><button class="settings-edit" id="v19EditServices">EDITAR</button></div><div class="settings-services-row"><button class="settings-add-square" id="v19AddService">+</button>${list.slice(0,8).map(s=>`<div class="settings-service-card"><b>${escapeHtml(s.name)}</b><span>${money(s.price)}</span></div>`).join('')}</div></section>
 <section class="settings-section"><div class="settings-section-head"><span>PROFISSIONAIS</span></div><div class="pro-card"><button class="pro-add" id="v19AddPro">+</button><div class="pro-info"><span>${escapeHtml((pros[0]||{}).name||'Nicácio')}</span><button id="v19EditPro">EDITAR</button></div></div></section>
 <section class="settings-section"><div class="settings-section-head"><span>ASSINATURA</span><button class="settings-edit" type="button">EDITAR</button></div><div class="subscription-card"><div class="subscription-icon">▦</div><div class="subscription-text"><span class="active">Ativo</span> - Mensal 1 profissionais<br>Próxima fatura: 09/09 | XXXX 0648</div></div></section>
 <section class="settings-section"><div class="settings-section-head"><span>CONFIGURAÇÕES ADICIONAIS</span></div><div class="settings-list">
 <button data-extra="general"><span class="sicon">⚙</span><span>CONFIGURAÇÕES GERAIS</span><span></span><span class="arrow">›</span></button>
 <button data-extra="link"><span class="sicon">▣</span><span>LINK DE AGENDAMENTO</span><span class="settings-pill">ONLINE</span><span class="arrow">›</span></button>
 <button data-extra="products"><span class="sicon">▤</span><span>PRODUTOS</span><span></span><span class="arrow">›</span></button>
 <button data-extra="messages"><span class="sicon">◉</span><span>MENSAGENS MANUAIS</span><span>${ex.messages?'●':''}</span><span class="arrow">›</span></button>
 <button data-extra="banned"><span class="sicon">♙</span><span>CLIENTES BANIDOS</span><span></span><span class="arrow">›</span></button>
 <button data-extra="local"><span class="sicon">◎</span><span>CONFIGURAÇÕES LOCAIS</span><span></span><span class="arrow">›</span></button>
 <button data-extra="notifications"><span class="sicon">♟</span><span>NOTIFICAÇÕES</span><span class="settings-pill">${ex.notifications?'HABILITADAS':'DESATIVADAS'}</span><span class="arrow">›</span></button>
 <button data-extra="account"><span class="sicon">ⓘ</span><span>CONTA</span><span></span><span class="arrow">›</span></button></div></section>
 <div class="settings-footer"><div>${escapeHtml((pros[0]||{}).name||'Nicácio')}<br><small>nicaciobarbearia@gmail.com</small></div><button type="button" id="v19Exit">Sair →</button></div></div>`);
 document.querySelector('[data-v19-back]').onclick=closeModal;$('#v19EditCompany').onclick=v19CompanyEditor;$('#v19EditServices').onclick=v19ServicesPage;$('#v19AddService').onclick=()=>v19ServiceEditor(-1);$('#v19AddPro').onclick=()=>v19ProEditor(-1);$('#v19EditPro').onclick=()=>v19ProEditor(0);
 document.querySelectorAll('[data-extra]').forEach(b=>b.onclick=()=>{const x=b.dataset.extra;if(x==='link')return linkPage();if(x==='general')return v19GeneralSettings();if(x==='products')return v22ProductsPage();if(x==='banned')return v24BannedClientsPage();if(x==='notifications'){const e=v19Extra();e.notifications=!e.notifications;save(V19_EXTRA_KEY,e);settingsPage();toast('Notificações atualizadas');return}openModal('Configuração',`<div class="summary-box"><strong>${b.children[1].textContent}</strong><p>Opção disponível no painel do barbeiro.</p></div>`)});$('#v19Exit').onclick=()=>toast('Sessão mantida neste aparelho');
}
function v19CompanyEditor(){const c=v19Company();v19Open(`<div class="editor-screen">${v19BackBtn()}<h1 class="editor-title">Editar empresa</h1><form id="v19CompanyForm"><div class="editor-field"><div class="editor-label">NOME FANTASIA</div><input class="editor-input" id="vcName" value="${escapeHtml(c.name)}"></div><div class="editor-field"><div class="editor-label">ENDEREÇO</div><input class="editor-input" id="vcStreet" value="${escapeHtml(c.street)}"></div><div class="editor-grid2"><div class="editor-field"><div class="editor-label">NÚMERO</div><input class="editor-input" id="vcNumber" value="${escapeHtml(c.number)}"></div><div class="editor-field"><div class="editor-label">COMPLEMENTO</div><input class="editor-input" id="vcComp" value="${escapeHtml(c.complement)}"></div></div><div class="editor-field"><div class="editor-label">BAIRRO</div><input class="editor-input" id="vcDistrict" value="${escapeHtml(c.district)}"></div><div class="editor-field"><div class="editor-label">CIDADE</div><input class="editor-input" id="vcCity" value="${escapeHtml(c.city)}"></div><div class="editor-grid2"><div class="editor-field"><div class="editor-label">ESTADO</div><input class="editor-input" id="vcState" value="${escapeHtml(c.state)}"></div><div class="editor-field"><div class="editor-label">CEP</div><input class="editor-input" id="vcCep" value="${escapeHtml(c.cep)}"></div></div><div class="editor-field"><div class="editor-label">TELEFONE</div><input class="editor-input" id="vcPhone" value="${escapeHtml(c.phone)}"></div><button class="editor-save">SALVAR</button></form></div>`);document.querySelector('[data-v19-back]').onclick=settingsPage;$('#v19CompanyForm').onsubmit=e=>{e.preventDefault();save(V19_COMPANY_KEY,{name:$('#vcName').value,street:$('#vcStreet').value,number:$('#vcNumber').value,complement:$('#vcComp').value,district:$('#vcDistrict').value,city:$('#vcCity').value,state:$('#vcState').value,cep:$('#vcCep').value,phone:$('#vcPhone').value});toast('Dados da empresa salvos');settingsPage()}}
function v19ServicesPage(){const a=services();v19Open(`<div class="editor-screen">${v19BackBtn()}<h1 class="editor-title">Serviços</h1><p class="editor-sub">Cadastre e edite os serviços<br>fornecidos pela empresa.</p><div class="editor-label">INSIRA UM NOVO SERVIÇO</div><div class="service-create-grid"><div><div class="editor-label">FOTO</div><div class="editor-photo">📷</div></div><div><div class="editor-label">NOME DO SERVIÇO</div><input class="editor-input" id="newSvcName" placeholder="Ex: CORTE SOCIAL"></div></div><div class="service-create-row2"><div><div class="editor-label">DURAÇÃO (MIN)</div><select class="editor-select" id="newSvcDur">${v19DurationOptions(30)}</select></div><div><div class="editor-label">PREÇO</div><input class="editor-input" id="newSvcPrice" inputmode="decimal" placeholder="R$ 0,00"></div></div><button class="orange-wide" id="v19AddToList">ADICIONAR À LISTA</button><div class="editor-label">LISTA DE SERVIÇOS</div><div class="service-list-ref">${a.map((s,i)=>`<div class="service-row-ref"><span class="drag">⋮</span><div><b>${escapeHtml(s.name)}</b><br><small>${s.duration} min - ${money(s.price)}</small></div><button class="v19-edit-svc" data-i="${i}">✎</button><button class="v19-del-svc" data-i="${i}">⌫</button></div>`).join('')}</div><button class="editor-save" id="v19SaveServices">SALVAR SERVIÇOS</button></div>`);document.querySelector('[data-v19-back]').onclick=settingsPage;$('#v19AddToList').onclick=()=>{const n=$('#newSvcName').value.trim(),p=Number(String($('#newSvcPrice').value).replace(',','.').replace(/[^0-9.]/g,'')),d=Number($('#newSvcDur').value);if(!n)return alert('Digite o nome do serviço.');const x=services();x.push({name:n,price:p||0,duration:d||30,active:true});saveServices(x);v19ServicesPage();toast('Serviço adicionado')};document.querySelectorAll('.v19-edit-svc').forEach(b=>b.onclick=()=>v19ServiceEditor(Number(b.dataset.i)));document.querySelectorAll('.v19-del-svc').forEach(b=>b.onclick=()=>{if(confirm('Excluir este serviço?')){const x=services();x.splice(Number(b.dataset.i),1);saveServices(x);v19ServicesPage()}});$('#v19SaveServices').onclick=()=>{toast('Serviços salvos');settingsPage()}}
function v19DurationOptions(sel){return [10,20,25,30,35,40,45,50,55,60,70,75,80,90,120,150].map(v=>`<option value="${v}" ${Number(sel)===v?'selected':''}>${v<60?v+' Min':(Math.floor(v/60)+':'+String(v%60).padStart(2,'0')+' Hs')}</option>`).join('')}
function v19ServiceEditor(i){const s=i>=0?services()[i]:{name:'',price:0,duration:30,active:true};v19Open(`<div class="editor-screen">${v19BackBtn()}<h1 class="editor-title">Editar serviços</h1><p class="editor-sub">Edite o serviço selecionado<br>e salve ao terminar.</p><div class="service-create-grid"><div><div class="editor-label">FOTO</div><div class="editor-photo">📷</div></div><div><div class="editor-label">NOME DO SERVIÇO</div><input class="editor-input" id="veName" value="${escapeHtml(s.name)}"></div></div><div class="service-create-row2"><div><div class="editor-label">DURAÇÃO (MIN)</div><select class="editor-select" id="veDur">${v19DurationOptions(s.duration)}</select></div><div><div class="editor-label">PREÇO</div><input class="editor-input" id="vePrice" type="number" step="0.01" value="${Number(s.price||0)}"></div></div><button class="orange-wide" id="veConfirm">CONFIRMAR EDIÇÃO</button><button class="orange-wide" style="background:transparent;margin-top:0" id="veBack">VOLTAR</button></div>`);document.querySelector('[data-v19-back]').onclick=v19ServicesPage;$('#veBack').onclick=v19ServicesPage;$('#veConfirm').onclick=()=>{const a=services(),item={...s,name:$('#veName').value.trim()||'Serviço',price:Number($('#vePrice').value||0),duration:Number($('#veDur').value||30),active:s.active!==false};if(i>=0)a[i]=item;else a.push(item);saveServices(a);toast('Serviço atualizado');v19ServicesPage()}}
function v19ProEditor(i){const a=v19Pros(),p=i>=0?a[i]:{id:uuid(),name:''};v19Open(`<div class="editor-screen">${v19BackBtn()}<h1 class="editor-title">Profissionais</h1><p class="editor-sub">Cadastre e edite os profissionais<br>da empresa.</p><div class="service-create-grid"><div><div class="editor-label">FOTO</div><div class="editor-photo">📷</div></div><div><div class="editor-label">NOME DO PROFISSIONAL</div><input class="editor-input" id="vpName" value="${escapeHtml(p.name)}" placeholder="Ex: João da Silva"></div></div><button class="orange-wide" id="vpSave">${i>=0?'SALVAR PROFISSIONAL':'ADICIONAR À LISTA'}</button><div class="service-list-ref">${a.map((x,j)=>`<div class="service-row-ref"><span class="drag">•</span><div><b>${escapeHtml(x.name)}</b></div><button class="vpEdit" data-i="${j}">✎</button><button class="vpDel" data-i="${j}">⌫</button></div>`).join('')}</div></div>`);document.querySelector('[data-v19-back]').onclick=settingsPage;$('#vpSave').onclick=()=>{const n=$('#vpName').value.trim();if(!n)return alert('Digite o nome.');const x=v19Pros();if(i>=0)x[i]={...p,name:n};else x.push({...p,name:n});save(V19_PROS_KEY,x);toast('Profissional salvo');settingsPage()};document.querySelectorAll('.vpEdit').forEach(b=>b.onclick=()=>v19ProEditor(Number(b.dataset.i)));document.querySelectorAll('.vpDel').forEach(b=>b.onclick=()=>{const x=v19Pros();if(x.length<=1)return alert('Mantenha pelo menos um profissional.');if(confirm('Excluir profissional?')){x.splice(Number(b.dataset.i),1);save(V19_PROS_KEY,x);v19ProEditor(-1)}})}
function v19GeneralSettings(){const s=settings();v19Open(`<div class="editor-screen">${v19BackBtn()}<h1 class="editor-title">Configurações gerais</h1><div class="editor-field"><div class="editor-label">INÍCIO DO EXPEDIENTE</div><input class="editor-input" id="vgStart" type="time" value="${s.start}"></div><div class="editor-field"><div class="editor-label">FIM DO EXPEDIENTE</div><input class="editor-input" id="vgEnd" type="time" value="${s.end}"></div><div class="editor-field"><div class="editor-label">INTERVALO DA AGENDA</div><select class="editor-select" id="vgInt"><option value="10" ${s.interval==10?'selected':''}>10 minutos</option><option value="20" ${s.interval==20?'selected':''}>20 minutos</option><option value="30" ${s.interval==30?'selected':''}>30 minutos</option><option value="60" ${s.interval==60?'selected':''}>60 minutos</option></select></div><button class="editor-save" id="vgSave">SALVAR</button></div>`);document.querySelector('[data-v19-back]').onclick=settingsPage;$('#vgSave').onclick=()=>{saveSettings({start:$('#vgStart').value,end:$('#vgEnd').value,interval:Number($('#vgInt').value)});toast('Configurações salvas');settingsPage();renderAll()}}


/* V20 — força a tela Configurações da referência no menu */
(function(){
  const settingsBtn=document.querySelector('.menu-list button[data-page="settings"]');
  if(settingsBtn){
    settingsBtn.onclick=()=>{ closeMenu(); settingsPage(); };
  }
})();

/* V21 — Configurações gerais idênticas à referência */
const V21_GENERAL_KEY='nicacio_general_settings';
function v21General(){return {...{scale:'smart',currency:'BRL',timezone:'America/Sao_Paulo'},...load(V21_GENERAL_KEY,{})}}
const V21_SCALES=[['smart','Inteligente'],['10','De 10 em 10 minutos'],['15','De 15 em 15 minutos'],['20','De 20 em 20 minutos'],['30','De 30 em 30 minutos'],['40','De 40 em 40 minutos'],['60','De 60 em 60 minutos']];
const V21_CURRENCIES=[['BRL','Real (R$) BRL'],['USD','Dólar americano ($) USD'],['EUR','Euro (€) EUR'],['ARS','Peso argentino (ARS) ARS'],['PYG','Guarani (PYG) PYG'],['AOA','Kwanza (Kz) AOA'],['CLP','Peso chileno ($) CLP'],['UYU','Peso uruguaio ($U) UYU'],['GBP','Libra esterlina (£) GBP'],['COP','Peso colombiano ($) COP'],['PEN','Sol peruano (S/) PEN'],['BOB','Boliviano (Bs) BOB']];
const V21_TIMEZONES=[['America/Sao_Paulo','Brasília (UTC-3:00)'],['America/Argentina/Buenos_Aires','Buenos Aires (UTC-3:00)'],['America/Montevideo','Montevidéu (UTC-3:00)'],['Atlantic/South_Georgia','South Georgia/Sandwich Islands (UTC-2:00)'],['Atlantic/Azores','Azores (UTC-1:00)'],['Europe/London','London (UTC+0:00)'],['Europe/Lisbon','Lisboa (UTC+0:00)'],['Europe/Berlin','Berlin (UTC+1:00)'],['Europe/Paris','Paris (UTC+1:00)'],['Africa/Cairo','Cairo (UTC+2:00)'],['Europe/Moscow','Moscow (UTC+3:00)'],['Asia/Riyadh','Riyadh (UTC+3:00)'],['Asia/Dubai','Dubai (UTC+4:00)']];
function v21Label(list,val){return (list.find(x=>x[0]===val)||list[0])[1]}
function v21GeneralSettings(){
 const g=v21General();
 v19Open(`<div class="general-ref-screen">
  <button class="general-ref-back" type="button" id="v21GeneralBack">‹</button>
  <h1>Configurações</h1>
  <p class="general-ref-sub">Ajuste os campos abaixo para<br>configurar parâmetros de seu app ou link.</p>
  <div class="general-ref-field"><div class="general-ref-label">ESCALA DE HORÁRIOS</div><button class="general-ref-select" id="v21Scale"><span>${escapeHtml(v21Label(V21_SCALES,g.scale))}</span><b>▾</b></button><div class="general-ref-help">Modo inteligente: ajusta os horários automaticamente com base<br>na duração dos serviços. É a opção recomendada para aproveitar<br>melhor a agenda.</div></div>
  <div class="general-ref-field"><div class="general-ref-label">QUAL SUA MOEDA?</div><button class="general-ref-select" id="v21Currency"><span>${escapeHtml(v21Label(V21_CURRENCIES,g.currency))}</span><b>▾</b></button></div>
  <div class="general-ref-field"><div class="general-ref-label">QUAL O SEU HORÁRIO LOCAL?</div><button class="general-ref-select" id="v21Timezone"><span>${escapeHtml(v21Label(V21_TIMEZONES,g.timezone))}</span><b>▾</b></button></div>
  <button class="general-ref-save" id="v21GeneralSave">SALVAR</button>
 </div>`);
 $('#v21GeneralBack').onclick=settingsPage;
 $('#v21Scale').onclick=()=>v21Picker('scale','Escala de horários',V21_SCALES,g.scale,v21GeneralSettings);
 $('#v21Currency').onclick=()=>v21Picker('currency','Moeda',V21_CURRENCIES,g.currency,v21GeneralSettings);
 $('#v21Timezone').onclick=()=>v21Picker('timezone','Horário local',V21_TIMEZONES,g.timezone,v21GeneralSettings);
 $('#v21GeneralSave').onclick=()=>{const x=v21General();save(V21_GENERAL_KEY,x);if(x.scale!=='smart')saveSettings({interval:Number(x.scale)});toast('Configurações salvas');settingsPage();renderAll()};
}
function v21Picker(key,title,items,current,back){
 v19Open(`<div class="general-ref-picker-screen"><button class="general-ref-back" type="button" id="v21PickBack">‹</button><div class="general-ref-picker">${items.map(([v,l])=>`<button type="button" class="general-ref-option ${v===current?'active':''}" data-v="${escapeHtml(v)}"><span>${escapeHtml(l)}</span><i></i></button>`).join('')}</div></div>`);
 $('#v21PickBack').onclick=back;
 document.querySelectorAll('.general-ref-option').forEach(b=>b.onclick=()=>{const x=v21General();x[key]=b.dataset.v;save(V21_GENERAL_KEY,x);back()});
}
/* substitui apenas o destino de CONFIGURAÇÕES GERAIS */
v19GeneralSettings=v21GeneralSettings;


/* V22 — Produtos igual à referência */
const V22_PRODUCTS_KEY='nicacio_products';
function v22Products(){return load(V22_PRODUCTS_KEY,[])}
function v22SaveProducts(v){save(V22_PRODUCTS_KEY,v)}
function v22MoneyInput(v){return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
function v22ProductsPage(){
 const list=v22Products();
 v19Open(`<div class="products-ref-screen">
  <button class="products-ref-back" type="button" id="v22ProductsBack">‹</button>
  <h1>Produtos</h1>
  <p class="products-ref-sub"><span class="products-ref-dot"></span><span>Cadastre e edite os produtos<br>fornecidos pela empresa.</span></p>
  <div class="products-ref-section-title"><span>INSIRA UM NOVO PRODUTO</span><i></i></div>
  <form id="v22ProductForm" autocomplete="off">
   <div class="products-ref-grid">
    <label><span>NOME DO PRODUTO</span><input id="v22ProductName" placeholder="Ex: POMADA" required></label>
    <label><span>COMISSÃO (%)</span><input id="v22ProductCommission" inputmode="decimal" placeholder="Ex: 20%"></label>
    <label><span>QUANTIDADE (ESTOQUE)</span><input id="v22ProductStock" inputmode="numeric" placeholder="Ex: 100"></label>
    <label><span>PREÇO</span><input id="v22ProductPrice" inputmode="decimal" placeholder="R$ 0,00"></label>
   </div>
   <button class="products-ref-add" type="submit">ADICIONAR À LISTA</button>
  </form>
  <div id="v22ProductList" class="products-ref-list">${list.length?`<div class="products-ref-list-title">LISTA DE PRODUTOS</div>${list.map(p=>`<div class="products-ref-item" data-id="${escapeHtml(p.id)}"><div><b>${escapeHtml(p.name)}</b><small>${Number(p.stock||0)} un. · R$ ${v22MoneyInput(p.price)} · Comissão ${Number(p.commission||0)}%</small></div><button type="button" data-product-edit="${escapeHtml(p.id)}">✎</button><button type="button" data-product-delete="${escapeHtml(p.id)}">⌫</button></div>`).join('')}`:''}</div>
  <button class="products-ref-save" type="button" id="v22ProductsSave">SALVAR PRODUTOS</button>
 </div>`);
 document.getElementById('v22ProductsBack').onclick=settingsPage;
 const parseNum=v=>Number(String(v||'').replace(/[^0-9,.-]/g,'').replace(',','.'))||0;
 document.getElementById('v22ProductForm').onsubmit=e=>{
   e.preventDefault();
   const name=document.getElementById('v22ProductName').value.trim();
   if(!name)return toast('Informe o nome do produto');
   const arr=v22Products();
   arr.push({id:uuid(),name,commission:parseNum(document.getElementById('v22ProductCommission').value),stock:Math.max(0,Math.floor(parseNum(document.getElementById('v22ProductStock').value))),price:Math.max(0,parseNum(document.getElementById('v22ProductPrice').value))});
   v22SaveProducts(arr);toast('Produto adicionado');v22ProductsPage();
 };
 document.querySelectorAll('[data-product-delete]').forEach(b=>b.onclick=()=>{const id=b.dataset.productDelete;v22SaveProducts(v22Products().filter(p=>p.id!==id));toast('Produto removido');v22ProductsPage()});
 document.querySelectorAll('[data-product-edit]').forEach(b=>b.onclick=()=>{const p=v22Products().find(x=>x.id===b.dataset.productEdit);if(!p)return;v22EditProduct(p.id)});
 document.getElementById('v22ProductsSave').onclick=()=>{toast('Produtos salvos');setTimeout(settingsPage,300)};
}
function v22EditProduct(id){
 const p=v22Products().find(x=>x.id===id);if(!p)return v22ProductsPage();
 v19Open(`<div class="products-ref-screen products-ref-edit"><button class="products-ref-back" type="button" id="v22EditBack">‹</button><h1>Editar produto</h1><p class="products-ref-sub">Edite o produto selecionado<br>e salve ao terminar.</p><form id="v22EditForm"><div class="products-ref-grid"><label><span>NOME DO PRODUTO</span><input id="v22EditName" value="${escapeHtml(p.name)}" required></label><label><span>COMISSÃO (%)</span><input id="v22EditCommission" inputmode="decimal" value="${Number(p.commission||0)}"></label><label><span>QUANTIDADE (ESTOQUE)</span><input id="v22EditStock" inputmode="numeric" value="${Number(p.stock||0)}"></label><label><span>PREÇO</span><input id="v22EditPrice" inputmode="decimal" value="${v22MoneyInput(p.price)}"></label></div><button class="products-ref-add" type="submit">CONFIRMAR EDIÇÃO</button></form></div>`);
 document.getElementById('v22EditBack').onclick=v22ProductsPage;
 const parseNum=v=>Number(String(v||'').replace(/[^0-9,.-]/g,'').replace(',','.'))||0;
 document.getElementById('v22EditForm').onsubmit=e=>{e.preventDefault();const arr=v22Products();const x=arr.find(z=>z.id===id);if(!x)return;x.name=document.getElementById('v22EditName').value.trim();x.commission=parseNum(document.getElementById('v22EditCommission').value);x.stock=Math.max(0,Math.floor(parseNum(document.getElementById('v22EditStock').value)));x.price=Math.max(0,parseNum(document.getElementById('v22EditPrice').value));v22SaveProducts(arr);toast('Produto atualizado');v22ProductsPage()};
}

/* V23 — Mensagens manuais editáveis igual à referência */
const V23_MESSAGES_KEY='nicacio_manual_messages';
const V23_MESSAGE_DEFAULTS={
 reminder:`Olá, {nome_cliente} tudo bem?\n\nSeu horário *{data_agendamento} às {hora_agendamento}* está confirmado!\n\n*{servicos} - {valor_servicos}*\n\nFAVOR, NÃO ATRASAR\nA TOLERÂNCIA PARA ATRASOS\nSERA DE 5 MINUTOS.`,
 confirmation:`*Agendamento realizado com sucesso pelo estabelecimento!*\n\nOlá {nome_cliente}, tudo bem?\n\nSeu horário *{data_agendamento} às {hora_agendamento}* está confirmado!\n\nFAVOR, NÃO ATRASAR\nCHEGAR 5 MINUTOS DE ANTECEDÊNCIA.\nA TOLERÂNCIA PARA ATRASOS SERÁ DE 5 MINUTOS.`,
 cancellation:`*Agendamento cancelado pelo estabelecimento!*\n\nOlá {nome_cliente}, tudo bem?\n\nSeu horário *{data_agendamento} às {hora_agendamento}* foi cancelado!\n\nEm caso de dúvidas, responda a essa mensagem!`,
 remarketing:`Olá, {nome_cliente}! Tudo bem?\n\nJá faz um tempinho desde o seu último atendimento. Que tal reservar seu próximo horário?\n\n✅ {link_agendamento}\n\nAguardamos você na(o) {nome_estabelecimento}!`,
 bookingLink:`Olá, tudo bem?\n\nSe deseja *agendar algum de nossos serviços* use nosso novo assistente pessoal abaixo, é rápido e fácil.\n\n✅ {link_agendamento}\n\nAguardo você aqui na(o) {nome_estabelecimento}\n👊👊`,
 waitlist:`Olá, {nome_cliente}! O espaço na nossa agenda foi liberado e você pode agendar seu horário agora mesmo. Não perca essa oportunidade!\n\nClique no link para garantir seu atendimento:\n{link_agendamento}\n\nEstamos ansiosos para recebê-lo!`
};
function v23Messages(){return {...V23_MESSAGE_DEFAULTS,...load(V23_MESSAGES_KEY,{})}}
function v23MessageSections(){return [
 ['reminder','LEMBRETE RÁPIDO DE AGENDAMENTO','O texto personalizado será preparado para o cliente ao confirmar um agendamento.'],
 ['confirmation','CONFIRMAÇÃO DE AGENDAMENTO','Mensagem preparada para o cliente confirmando que o agendamento foi realizado com sucesso.'],
 ['cancellation','CONFIRMAÇÃO DE CANCELAMENTO','Mensagem preparada para o cliente informando que o agendamento foi cancelado.'],
 ['remarketing','MENSAGEM DE REMARKETING','Mensagem para convidar o cliente a realizar um novo agendamento.'],
 ['bookingLink','MENSAGEM DE LINK DE AGENDAMENTO','Mensagem para compartilhar um link direto para o cliente agendar um serviço.'],
 ['waitlist','MENSAGEM DE FILA DE ESPERA','Mensagem para informar o cliente sobre uma vaga liberada na agenda.']
]}
function v23MessagesPage(){
 const m=v23Messages();
 v19Open(`<div class="messages-ref-screen">
  <button class="messages-ref-back" type="button" id="v23MessagesBack">‹</button>
  <h1>Mensagens manuais</h1>
  <p class="messages-ref-sub">Ajuste os campos abaixo para personalizar<br>parâmetros e mensagens enviadas.</p>
  <div class="messages-ref-vars">Use: <b>{nome_cliente}</b> <b>{data_agendamento}</b> <b>{hora_agendamento}</b> <b>{servicos}</b> <b>{valor_servicos}</b> <b>{link_agendamento}</b></div>
  <form id="v23MessagesForm">
   ${v23MessageSections().map(([key,title,help])=>`<section class="messages-ref-section">
     <div class="messages-ref-head"><span>${title}</span><button type="button" data-msg-reset="${key}">Resetar para o padrão</button></div>
     <textarea data-msg-key="${key}" spellcheck="true">${escapeHtml(m[key]||'')}</textarea>
     <p>${help}</p>
   </section>`).join('')}
   <button class="messages-ref-save" type="submit">SALVAR</button>
  </form>
 </div>`);
 document.getElementById('v23MessagesBack').onclick=settingsPage;
 document.querySelectorAll('[data-msg-reset]').forEach(b=>b.onclick=()=>{
   const key=b.dataset.msgReset;
   const ta=document.querySelector(`[data-msg-key="${key}"]`);
   ta.value=V23_MESSAGE_DEFAULTS[key]||'';
   toast('Mensagem restaurada');
 });
 document.getElementById('v23MessagesForm').onsubmit=e=>{
   e.preventDefault();
   const out={};document.querySelectorAll('[data-msg-key]').forEach(ta=>out[ta.dataset.msgKey]=ta.value.trim());
   save(V23_MESSAGES_KEY,out);
   const ex=v19Extra();ex.messages=true;save(V19_EXTRA_KEY,ex);
   toast('Mensagens salvas');setTimeout(settingsPage,300);
 };
}
function v23FillMessage(type,b={}){
 const m=v23Messages()[type]||'';
 const c=v19Company();
 const replacements={
  nome_cliente:b.clientName||b.name||'cliente',
  data_agendamento:b.dateLabel||b.date||'',
  hora_agendamento:b.time||'',
  servicos:b.serviceName||'',
  valor_servicos:b.price!=null?money(b.price):'',
  link_agendamento:publicClientUrl(),
  nome_estabelecimento:c.name||'Barbearia Nicácio'
 };
 return m.replace(/\{([a-z_]+)\}/g,(all,k)=>replacements[k]??all);
}
function v23OpenWhatsAppMessage(type,b){
 const phone=String(b?.clientPhone||'').replace(/\D/g,'');
 if(!phone){toast('Cliente sem WhatsApp cadastrado');return}
 const br=phone.startsWith('55')?phone:'55'+phone;
 window.open(`https://wa.me/${br}?text=${encodeURIComponent(v23FillMessage(type,b))}`,'_blank');
}

/* envia a opção Mensagens manuais para a nova tela */
const _v23SettingsPage=settingsPage;
settingsPage=function(){
 _v23SettingsPage();
 const btn=document.querySelector('[data-extra="messages"]');
 if(btn) btn.onclick=()=>v23MessagesPage();
};


/* V24 — Clientes banidos igual à referência */
const V24_BANNED_KEY='nicacio_banned_clients';
function v24BannedClients(){return load(V24_BANNED_KEY,[])}
function v24NormalizePhone(v){return String(v||'').replace(/\D/g,'')}
function v24BannedClientsPage(){
 const a=v24BannedClients().slice().sort((x,y)=>String(y.bannedAt||'').localeCompare(String(x.bannedAt||'')));
 v19Open(`<div class="banned-ref-screen">
   <button class="banned-ref-back" id="v24BannedBack">‹</button>
   <h1>Clientes banidos</h1><p class="banned-ref-sub">Lista de clientes banidos</p>
   <button class="banned-ref-add" id="v24AddBanned">+ BANIR CLIENTE</button>
   <div class="banned-ref-list">${a.length?a.map(x=>`<article class="banned-ref-card"><div><b>${escapeHtml(x.name||'Cliente')} - ${new Date((x.bannedAt||new Date().toISOString()).slice(0,10)+'T12:00:00').toLocaleDateString('pt-BR')}</b><span>${escapeHtml(x.phone||'Sem telefone')}</span></div><button class="banned-ref-delete" data-id="${x.id}" aria-label="Remover dos banidos">⌫</button></article>`).join(''):`<div class="banned-ref-empty">Nenhum cliente banido.</div>`}</div>
 </div>`);
 $('#v24BannedBack').onclick=settingsPage; $('#v24AddBanned').onclick=v24BanClientPicker;
 document.querySelectorAll('.banned-ref-delete').forEach(b=>b.onclick=()=>{const x=v24BannedClients().filter(i=>i.id!==b.dataset.id);save(V24_BANNED_KEY,x);toast('Cliente liberado para agendar');v24BannedClientsPage()});
}
function v24BanClientPicker(){
 const existing=v24BannedClients(); const bannedPhones=new Set(existing.map(x=>v24NormalizePhone(x.phone)));
 const known=clients().filter(c=>!bannedPhones.has(v24NormalizePhone(c.phone)));
 v19Open(`<div class="banned-ref-screen banned-ref-picker"><button class="banned-ref-back" id="v24PickerBack">‹</button><h1>Banir cliente</h1><p class="banned-ref-sub">Escolha um cliente ou cadastre abaixo.</p>
 <div class="banned-ref-known">${known.map(c=>`<button data-ban-client="${escapeHtml(c.id||'')}" data-name="${escapeHtml(c.name||'Cliente')}" data-phone="${escapeHtml(c.phone||'')}"><b>${escapeHtml(c.name||'Cliente')}</b><span>${escapeHtml(c.phone||'Sem telefone')}</span></button>`).join('')}</div>
 <div class="banned-ref-form"><label>NOME DO CLIENTE<input id="v24BanName" placeholder="Nome completo"></label><label>TELEFONE<input id="v24BanPhone" inputmode="tel" placeholder="(33) 99999-9999"></label><button id="v24BanSave">BANIR CLIENTE</button></div></div>`);
 $('#v24PickerBack').onclick=v24BannedClientsPage;
 document.querySelectorAll('[data-ban-client]').forEach(b=>b.onclick=()=>v24SaveBanned(b.dataset.name,b.dataset.phone));
 $('#v24BanSave').onclick=()=>v24SaveBanned($('#v24BanName').value.trim(),$('#v24BanPhone').value.trim());
}
function v24SaveBanned(name,phone){
 if(!name)return alert('Digite o nome do cliente.'); if(!phone)return alert('Digite o telefone do cliente.');
 const a=v24BannedClients(), np=v24NormalizePhone(phone); if(a.some(x=>v24NormalizePhone(x.phone)===np)){toast('Este cliente já está banido');return v24BannedClientsPage()}
 a.push({id:uuid(),name,phone,bannedAt:new Date().toISOString()});save(V24_BANNED_KEY,a);toast('Cliente banido');v24BannedClientsPage();
}
function v24IsBanned(phone){const p=v24NormalizePhone(phone);return !!p&&v24BannedClients().some(x=>v24NormalizePhone(x.phone)===p)}

/* V25 — Configurações locais igual à referência */
const V25_LOCAL_KEY='nicacio_local_settings';
const V25_LOCAL_DEFAULTS={language:'pt'};
const V25_LANGUAGES=[
 {id:'pt',label:'Português'},
 {id:'en',label:'English'},
 {id:'es',label:'Español'}
];
function v25LocalSettings(){return {...V25_LOCAL_DEFAULTS,...load(V25_LOCAL_KEY,{})}}
function v25LanguageLabel(id){return (V25_LANGUAGES.find(x=>x.id===id)||V25_LANGUAGES[0]).label}
function v25LocalSettingsPage(){
 const s=v25LocalSettings();
 v19Open(`<div class="local-ref-screen">
   <button class="local-ref-back" id="v25LocalBack">‹</button>
   <h1>Configurações locais</h1>
   <p class="local-ref-sub">Ajustes que valem somente neste aparelho.<br>Não alteram nada para os outros usuários da agenda.</p>
   <section class="local-ref-section">
     <div class="local-ref-label">IDIOMA DO APLICATIVO</div>
     <button class="local-ref-select" type="button" id="v25LanguageSelect"><span>${escapeHtml(v25LanguageLabel(s.language))}</span><b>▼</b></button>
     <div class="local-ref-help">Define o idioma dos textos do aplicativo apenas para você, neste aparelho.</div>
   </section>
   <button class="local-ref-save" id="v25LocalSave">SALVAR</button>
 </div>`);
 $('#v25LocalBack').onclick=settingsPage;
 $('#v25LanguageSelect').onclick=()=>v25LanguagePicker(s.language);
 $('#v25LocalSave').onclick=()=>{save(V25_LOCAL_KEY,s);toast('Configurações locais salvas');settingsPage()};
}
function v25LanguagePicker(selected){
 v19Open(`<div class="local-ref-screen local-ref-picker-screen">
   <button class="local-ref-back" id="v25LangBack">‹</button>
   <h1>Configurações locais</h1>
   <p class="local-ref-sub">Ajustes que valem somente neste aparelho.<br>Não alteram nada para os outros usuários da agenda.</p>
   <div class="local-ref-label">IDIOMA DO APLICATIVO</div>
   <button class="local-ref-select" type="button" id="v25FakeSelect"><span>${escapeHtml(v25LanguageLabel(selected))}</span><b>▼</b></button>
   <div class="local-ref-help">Define o idioma dos textos do aplicativo apenas para você, neste aparelho.</div>
   <div class="local-ref-overlay"></div>
   <div class="local-ref-picker">
     ${V25_LANGUAGES.map(x=>`<button class="local-ref-option ${x.id===selected?'active':''}" data-v25-lang="${x.id}"><span>${x.label}</span><i></i></button>`).join('')}
   </div>
   <button class="local-ref-save dim" type="button">SALVAR</button>
 </div>`);
 $('#v25LangBack').onclick=v25LocalSettingsPage;
 document.querySelectorAll('[data-v25-lang]').forEach(b=>b.onclick=()=>{save(V25_LOCAL_KEY,{...v25LocalSettings(),language:b.dataset.v25Lang});v25LocalSettingsPage()});
}

/* envia a opção Configurações locais para a nova tela */
const _v25SettingsPage=settingsPage;
settingsPage=function(){
 _v25SettingsPage();
 const btn=document.querySelector('[data-extra="local"]');
 if(btn) btn.onclick=()=>v25LocalSettingsPage();
};

/* V26 — Notificações estilo referência + controles funcionais da PWA */
const V26_NOTIF_KEY='nicacio_notification_settings';
function v26NotifSettings(){
 return {...{
   master:true,highlight:true,badges:true,floating:true,lockscreen:true,sound:true,vibrate:true,persistent:false,
   all:true,appointments:true
 },...load(V26_NOTIF_KEY,{})};
}
function v26SaveNotif(v){save(V26_NOTIF_KEY,v);const ex=v19Extra();ex.notifications=!!v.master;save(V19_EXTRA_KEY,ex)}
function v26ToggleRow(key,label,sub=''){
 const n=v26NotifSettings();
 return `<button class="notif-ref-row" type="button" data-v26-toggle="${key}"><span class="notif-ref-copy"><b>${label}</b>${sub?`<small>${sub}</small>`:''}</span><span class="notif-ref-switch ${n[key]?'on':''}"><i></i></span></button>`;
}
function v26NotificationsPage(){
 const perm=('Notification' in window)?Notification.permission:'unsupported';
 v19Open(`<div class="notif-ref-screen">
   <button class="notif-ref-back" id="v26NotifBack" type="button">‹</button>
   <h1>Nicácio</h1>
   <div class="notif-ref-topcard">
     ${v26ToggleRow('master','Mostrar notificações')}
   </div>
   <div class="notif-ref-topcard">
     ${v26ToggleRow('highlight','Destaque de notificações','Utilizar formato de notificação personalizado para destacar informações importantes')}
   </div>
   <h2>Permissões de notificação</h2>
   <div class="notif-ref-card">
     ${v26ToggleRow('badges','Emblemas de notificação','Permitir a exibição de um ponto numerado nos ícones da tela inicial para indicar notificações ou novos conteúdos')}
     ${v26ToggleRow('floating','Notificações flutuantes','Permitir notificações flutuantes')}
     ${v26ToggleRow('lockscreen','Notificações na Tela de bloqueio','Permitir notificações na Tela de bloqueio')}
     ${v26ToggleRow('sound','Som')}
     ${v26ToggleRow('vibrate','Vibração')}
     ${v26ToggleRow('persistent','Notificações permanentes','Permitir notificações que só podem ser excluídas manualmente')}
   </div>
   <h2>Categorias de notificação</h2>
   <div class="notif-ref-card notif-ref-categories">
     <button type="button" data-v26-toggle="all"><span><b>Nicácio</b><small>Todas as notificações</small></span><em>›</em></button>
     <button type="button" data-v26-toggle="appointments"><span><b>Atualizações de agendamentos</b><small>Novos agendamentos, mudanças ou cancelamentos</small></span><em>›</em></button>
   </div>
   <div class="notif-ref-actions">
     <button id="v26PermissionBtn" type="button">${perm==='granted'?'PERMISSÃO DO CELULAR ATIVADA':'ATIVAR PERMISSÃO DO CELULAR'}</button>
     <button id="v26TestBtn" type="button">ENVIAR NOTIFICAÇÃO DE TESTE</button>
     <small>${perm==='denied'?'A permissão foi bloqueada no navegador. Abra as permissões do site para liberar.':perm==='unsupported'?'Este navegador não oferece notificações da web.':'As opções acima ficam salvas neste aparelho.'}</small>
   </div>
 </div>`);
 $('#v26NotifBack').onclick=settingsPage;
 document.querySelectorAll('[data-v26-toggle]').forEach(btn=>btn.onclick=()=>{
   const key=btn.dataset.v26Toggle,n=v26NotifSettings(); n[key]=!n[key];
   if(key==='all' && !n.all) n.appointments=false;
   if(key==='appointments' && n.appointments) n.all=true;
   v26SaveNotif(n); v26NotificationsPage();
 });
 $('#v26PermissionBtn').onclick=async()=>{
   if(!('Notification' in window)) return alert('Este navegador não suporta notificações.');
   try{const p=await Notification.requestPermission(); if(p==='granted'){const n=v26NotifSettings();n.master=true;v26SaveNotif(n);toast('Notificações permitidas');}else toast('Permissão não concedida');v26NotificationsPage()}catch(e){alert('Não foi possível abrir a permissão de notificações.')}
 };
 $('#v26TestBtn').onclick=()=>v26SendNotification('Barbearia Nicácio','Notificações funcionando ✅','appointments');
}
async function v26SendNotification(title,body,category='all'){
 const n=v26NotifSettings();
 if(!n.master || !n.all || (category==='appointments'&&!n.appointments)) return false;
 if(!('Notification' in window)){toast('Notificações não são suportadas neste navegador');return false}
 if(Notification.permission!=='granted'){const p=await Notification.requestPermission();if(p!=='granted'){toast('Ative a permissão de notificações');return false}}
 const options={body,tag:'nicacio-'+category,renotify:!!n.highlight,requireInteraction:!!n.persistent,silent:!n.sound};
 if(n.vibrate) options.vibrate=[180,80,180];
 try{
   if('serviceWorker' in navigator){
     const reg=await navigator.serviceWorker.ready; await reg.showNotification(title,options);
   }else new Notification(title,options);
   if(n.badges && navigator.setAppBadge){try{await navigator.setAppBadge(1)}catch{}}
   return true;
 }catch(e){try{new Notification(title,options);return true}catch{return false}}
}
window.nicacioNotify=v26SendNotification;
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));}

/* envia a opção Notificações para a tela completa V26 */
const _v26SettingsPage=settingsPage;
settingsPage=function(){
 _v26SettingsPage();
 const btn=document.querySelector('[data-extra="notifications"]');
 if(btn){
   const n=v26NotifSettings();
   const pill=btn.querySelector('.settings-pill');
   if(pill) pill.textContent=n.master?'HABILITADAS':'DESATIVADAS';
   btn.onclick=v26NotificationsPage;
 }
};

// ================= V27: MODIFICAR APENAS ESTE DIA =================
const V27_DAY_OVERRIDES_KEY='nicacio_day_overrides';
function v27DayOverrides(){return load(V27_DAY_OVERRIDES_KEY,{})}
function v27SaveDayOverrides(v){save(V27_DAY_OVERRIDES_KEY,v)}
function v27DayHours(d=selectedDate){
  const base=settings(), ov=v27DayOverrides()[key(d)]||{};
  return {start:ov.start||base.start,end:ov.end||base.end,interval:Number(base.interval||30)};
}

// Agenda respeita o horário especial daquele dia.
slotsForDay=function(d=selectedDate){
  const s=v27DayHours(d),arr=[];
  for(let m=mins(s.start);m<mins(s.end);m+=Number(s.interval||30))arr.push(timeFromMins(m));
  return arr;
};

const _v27RenderTimeline=renderTimeline;
renderTimeline=function(){
  _v27RenderTimeline();
  const el=document.getElementById('businessHoursText');
  if(el){const h=v27DayHours(selectedDate);el.innerHTML=`Seu horário de funcionamento cadastrado<br>é das <b>${h.start}hrs</b> às <b>${h.end}hrs</b>.`;}
};

function v27TimesFor(mode){
  const base=settings(), a=[];
  if(mode==='open'){
    for(let m=0;m<mins(base.start);m+=10)a.push(timeFromMins(m));
  }else{
    for(let m=mins(base.end)+10;m<24*60;m+=10)a.push(timeFromMins(m));
  }
  return a;
}
function v27OpenTimeList(mode,current,onPick){
  const overlay=document.createElement('div');overlay.className='day-time-overlay';
  const list=document.createElement('div');list.className='day-time-list';
  const times=v27TimesFor(mode);
  list.innerHTML=times.map(t=>`<button type="button" class="day-time-option ${t===current?'selected':''}" data-time="${t}"><span>${t}</span><i class="day-time-radio"></i></button>`).join('');
  overlay.appendChild(list);document.body.appendChild(overlay);
  overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
  list.querySelectorAll('.day-time-option').forEach(b=>b.onclick=()=>{const t=b.dataset.time;overlay.remove();onPick(t)});
  // Abre a lista próximo do horário comercial, como na referência.
  requestAnimationFrame(()=>{const target=list.querySelector(current?`.day-time-option[data-time="${current}"]`:mode==='open'?'.day-time-option:last-child':'.day-time-option:first-child');if(target)target.scrollIntoView({block:'center'});});
}

editDayPage=function(){
  const date=key(selectedDate), base=settings(), current=v27DayOverrides()[date]||{};
  let mode='open'; let chosen=current.start&&current.start!==base.start?current.start:'';
  $('#modal').classList.remove('settings-mode');$('#modal').classList.add('day-only-mode');
  $('#modalContent').innerHTML=`<div class="day-only-sheet">
    <h2>Modifique apenas o dia ${selectedDate.toLocaleDateString('pt-BR')}</h2>
    <div class="day-only-tabs"><button id="v27OpenTab" class="active" type="button">ABRIR ANTES</button><button id="v27CloseTab" type="button">FECHAR DEPOIS</button></div>
    <button id="v27TimeSelect" class="day-only-select" type="button"><span id="v27TimeText">Selecione um horário para começar seu dia</span><span class="caret">⌄</span></button>
    <div class="day-only-actions"><button id="v27No" class="day-only-no" type="button">NÃO</button><button id="v27Yes" class="day-only-yes" type="button">SIM</button></div>
    <button id="v27Clear" class="day-only-clear" type="button">Restaurar horário normal deste dia</button>
  </div>`;
  $('#modal').classList.remove('hidden');$('#modal').setAttribute('aria-hidden','false');
  const timeText=$('#v27TimeText');
  const setMode=(m)=>{mode=m;chosen=m==='open'?(current.start&&current.start!==base.start?current.start:''):(current.end&&current.end!==base.end?current.end:'');$('#v27OpenTab').classList.toggle('active',m==='open');$('#v27CloseTab').classList.toggle('active',m==='close');timeText.textContent=chosen|| (m==='open'?'Selecione um horário para começar seu dia':'Selecione um horário para terminar seu dia');};
  $('#v27OpenTab').onclick=()=>setMode('open'); $('#v27CloseTab').onclick=()=>setMode('close');
  $('#v27TimeSelect').onclick=()=>v27OpenTimeList(mode,chosen,t=>{chosen=t;timeText.textContent=t});
  $('#v27No').onclick=()=>closeModal();
  $('#v27Yes').onclick=()=>{if(!chosen){toast('Selecione um horário');return}const all=v27DayOverrides(),item={...(all[date]||{})};if(mode==='open')item.start=chosen;else item.end=chosen;all[date]=item;v27SaveDayOverrides(all);closeModal();renderAll();toast('Horário deste dia atualizado')};
  $('#v27Clear').onclick=()=>{const all=v27DayOverrides();delete all[date];v27SaveDayOverrides(all);closeModal();renderAll();toast('Horário normal restaurado')};
};

// Garante que o fechamento do modal remova o modo branco.
const _v27CloseModal=closeModal;
closeModal=function(){$('#modal').classList.remove('day-only-mode');_v27CloseModal()};

const v27Bottom=document.getElementById('editDayBtnBottom');if(v27Bottom)v27Bottom.onclick=editDayPage;
const v27Hours=document.getElementById('editHoursLink');if(v27Hours)v27Hours.onclick=v21GeneralSettings;
const v27Top=document.getElementById('scrollTopRef');if(v27Top)v27Top.onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
renderTimeline();

// ================= V28: EDITAR HORÁRIOS / PROFISSIONAL COMPLETO =================
const V28_PRO_KEY='nicacio_professional_v28';
const V28_DAYS=[
  ['0','DOMINGO'],['1','SEGUNDA-FEIRA'],['2','TERÇA-FEIRA'],['3','QUARTA-FEIRA'],['4','QUINTA-FEIRA'],['5','SEXTA-FEIRA'],['6','SÁBADO']
];
function v28Defaults(){
  const pro=(v19Pros&&v19Pros()[0])||{};
  const sv=services();
  const schedule={};V28_DAYS.forEach(([d])=>schedule[d]={active:d!=='0',start:d==='0'?'09:00':'08:00',lunchStart:d==='0'?'12:00':'11:30',lunchEnd:'13:00',end:'18:00'});
  return {name:pro.name||'Gustavo Nicacio Nascimento',phone:'+55 33 98886-9797',email:'nicaciobarbearia@gmail.com',commission:100,leader:true,photo:'',schedule,serviceIds:sv.map((s,i)=>String(s.id||s.name||i))};
}
function v28Pro(){const d=v28Defaults(),x=load(V28_PRO_KEY,null);if(!x)return d;return {...d,...x,schedule:{...d.schedule,...(x.schedule||{})},serviceIds:Array.isArray(x.serviceIds)?x.serviceIds:d.serviceIds}}
function v28SavePro(x){save(V28_PRO_KEY,x)}
function v28ServiceId(s,i){return String(s.id||s.name||i)}
function v28TimePicker(current,cb){
  const overlay=document.createElement('div');overlay.className='v28-time-overlay';
  const list=document.createElement('div');list.className='v28-time-list';let arr=[];for(let m=0;m<1440;m+=10)arr.push(timeFromMins(m));
  list.innerHTML=arr.map(t=>`<button class="v28-time-option ${t===current?'selected':''}" data-t="${t}" type="button"><span>${t}</span><i></i></button>`).join('');
  overlay.appendChild(list);document.body.appendChild(overlay);overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};
  list.querySelectorAll('button').forEach(b=>b.onclick=()=>{const t=b.dataset.t;overlay.remove();cb(t)});
  requestAnimationFrame(()=>{const e=list.querySelector(`[data-t="${current}"]`);if(e)e.scrollIntoView({block:'center'})});
}
function v28ProfessionalPage(){
  const p=v28Pro();
  let sv=services();
  // V31: garante que a lista de serviços sempre apareça logo abaixo do título,
  // mesmo se o armazenamento local estiver vazio ou incompleto.
  if(!Array.isArray(sv)||!sv.length){
    sv=DEFAULT_SERVICES.map(x=>({...x,active:x.active!==false}));
    saveServices(sv);
  }
  const days=V28_DAYS.map(([d,label])=>{const x=p.schedule[d];return `<section class="v28-day ${x.active?'':'off'}" data-day="${d}">
    <div class="v28-day-head"><span class="v28-day-name">${label}</span><i class="v28-day-line"></i><span class="v28-day-status">${x.active?'ATENDENDO':'NÃO ATENDENDO'}</span><button class="v28-switch ${x.active?'on':''}" data-day-switch="${d}" type="button"></button></div>
    <div class="v28-day-times">
      <div class="v28-time-field"><button data-time-day="${d}" data-field="start" type="button">${x.start}</button><small>INÍCIO</small></div>
      <div class="v28-time-field"><button data-time-day="${d}" data-field="lunchStart" type="button">${x.lunchStart}</button><small></small></div>
      <div class="v28-time-field"><button data-time-day="${d}" data-field="lunchEnd" type="button">${x.lunchEnd}</button><small></small></div>
      <div class="v28-time-field"><button data-time-day="${d}" data-field="end" type="button">${x.end}</button><small>FIM</small></div>
      <div></div><div class="v28-lunch-label">⌞ &nbsp;&nbsp; ALMOÇO &nbsp;&nbsp; ⌟</div><div></div>
    </div></section>`}).join('');
  v19Open(`<div class="v28-pro-screen"><button class="v28-pro-back" id="v28Back" type="button">‹</button>
    <div class="v28-avatar-wrap"><button class="v28-avatar" id="v28Avatar" type="button" ${p.photo?`style="background-image:url('${p.photo}')"`:''}></button><button class="v28-avatar-btn" id="v28PhotoBtn" type="button">●</button><input class="v28-hidden-file" id="v28Photo" type="file" accept="image/*"></div>
    <label class="v28-label">NOME (APARECERÁ NA AGENDA)</label><input class="v28-input" id="v28Name" value="${escapeHtml(p.name)}">
    <label class="v28-label">TELEFONE</label><div class="v28-phone"><span>🇧🇷</span><input id="v28Phone" value="${escapeHtml(p.phone)}"></div>
    <label class="v28-label">E-MAIL</label><input class="v28-input" id="v28Email" type="email" value="${escapeHtml(p.email)}" readonly>
    <label class="v28-label">COMISSÃO (%)</label><input class="v28-input" id="v28Commission" type="number" min="0" max="100" value="${Number(p.commission||0)}">
    <div class="v28-leader-card"><div class="v28-row"><button class="v28-switch ${p.leader?'on':''}" id="v28Leader" type="button"></button><span>Este profissional é um líder?</span></div><p>Um líder pode visualizar, agendar e gerenciar a agenda de outros profissionais.</p></div>
    <h2 class="v28-schedule-title">Configure o horário de funcionamento deste profissional</h2>${days}
    <section class="v31-services-section">
      <h2 class="v28-service-question">Quais dos serviços oferecidos este profissional realiza em seus clientes?</h2>
      <div class="v30-services-list">${sv.map((s,i)=>{const id=v28ServiceId(s,i),on=p.serviceIds.includes(id);return `<div class="v28-service-toggle"><span>${escapeHtml(s.name)}</span><button class="v28-switch ${on?'on':''}" data-service-id="${escapeHtml(id)}" type="button" aria-label="${on?'Desativar':'Ativar'} ${escapeHtml(s.name)}"></button></div>`}).join('')}</div>
    </section>
    <button class="v28-savebar" id="v28Save" type="button">SALVAR</button></div>`);
  const draft=JSON.parse(JSON.stringify(p));
  $('#v28Back').onclick=()=>{closeModal();renderAll()};
  const file=$('#v28Photo');$('#v28PhotoBtn').onclick=()=>file.click();$('#v28Avatar').onclick=()=>file.click();file.onchange=()=>{const f=file.files&&file.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{draft.photo=String(r.result);$('#v28Avatar').style.backgroundImage=`url('${draft.photo}')`};r.readAsDataURL(f)};
  $('#v28Leader').onclick=()=>{draft.leader=!draft.leader;$('#v28Leader').classList.toggle('on',draft.leader)};
  document.querySelectorAll('[data-day-switch]').forEach(b=>b.onclick=()=>{const d=b.dataset.day;draft.schedule[d].active=!draft.schedule[d].active;b.classList.toggle('on',draft.schedule[d].active);const sec=b.closest('.v28-day');sec.classList.toggle('off',!draft.schedule[d].active);sec.querySelector('.v28-day-status').textContent=draft.schedule[d].active?'ATENDENDO':'NÃO ATENDENDO'});
  document.querySelectorAll('[data-time-day]').forEach(b=>b.onclick=()=>{const d=b.dataset.timeDay,f=b.dataset.field;v28TimePicker(draft.schedule[d][f],t=>{draft.schedule[d][f]=t;b.textContent=t})});
  document.querySelectorAll('[data-service-id]').forEach(b=>b.onclick=()=>{const id=b.dataset.serviceId,idx=draft.serviceIds.indexOf(id);if(idx>=0)draft.serviceIds.splice(idx,1);else draft.serviceIds.push(id);b.classList.toggle('on',idx<0)});
  $('#v28Save').onclick=()=>{draft.name=$('#v28Name').value.trim()||'Profissional';draft.phone=$('#v28Phone').value.trim();draft.commission=Math.max(0,Math.min(100,Number($('#v28Commission').value||0)));v28SavePro(draft);const pros=v19Pros();if(pros[0]){pros[0]={...pros[0],name:draft.name};save(V19_PROS_KEY,pros)};toast('Horários do profissional salvos');closeModal();renderAll()};
}

// Faz a agenda usar os horários semanais do profissional e pausa de almoço.
v27DayHours=function(d=selectedDate){
  const p=v28Pro(),base=settings(),day=String(d.getDay()),w=p.schedule[day]||{};const ov=v27DayOverrides()[key(d)]||{};
  return {active:w.active!==false,start:ov.start||w.start||base.start,end:ov.end||w.end||base.end,lunchStart:w.lunchStart||'',lunchEnd:w.lunchEnd||'',interval:Number(base.interval||30)};
};
slotsForDay=function(d=selectedDate){
  const s=v27DayHours(d),arr=[];if(!s.active)return arr;
  for(let m=mins(s.start);m<mins(s.end);m+=Number(s.interval||30)){const t=timeFromMins(m);if(s.lunchStart&&s.lunchEnd&&m>=mins(s.lunchStart)&&m<mins(s.lunchEnd))continue;arr.push(t)}return arr;
};

// "Editar horários" abre a tela completa do profissional.
const v28Hours=document.getElementById('editHoursLink');if(v28Hours)v28Hours.onclick=v28ProfessionalPage;
// O EDITAR do profissional em Configurações também abre a tela completa.
v19ProEditor=v28ProfessionalPage;
renderTimeline();
