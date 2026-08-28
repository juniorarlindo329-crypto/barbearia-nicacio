// V4: sempre abre no topo, igual à referência
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.addEventListener('pageshow',()=>{ requestAnimationFrame(()=>window.scrollTo(0,0)); });
window.scrollTo(0,0);

const DEFAULT_SERVICES=[
{name:'Corte',price:30,duration:30,active:true},{name:'Barba',price:20,duration:30,active:true},{name:'Corte+Barba',price:45,duration:60,active:true},{name:'Corte+Sobrancelha',price:40,duration:30,active:true},{name:'Corte+Barba+Sobra',price:50,duration:60,active:true},{name:'Barba+Sobrancelha',price:30,duration:30,active:true},{name:'Corte +Alisante ou pintura',price:60,duration:60,active:true},{name:'Alisante ou pintura',price:30,duration:30,active:true},{name:'Closed',price:0,duration:60,active:false},{name:'CMT',price:38,duration:10,active:true},{name:'CS',price:12,duration:10,active:true}
];
const KEYS={bookings:'nicacio_bookings',blocked:'nicacio_blocked_days',settings:'nicacio_barber_settings',services:'nicacio_services',closedSlots:'nicacio_closed_slots',recurrence:'nicacio_barber_recurring',barber:'nicacio_barber_profile',linkConfig:'nicacio_link_config'};
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

function clientsPage(){const map={};bookings().forEach(b=>{const k=(b.clientPhone||b.clientName||'cliente').toLowerCase();if(!map[k])map[k]={name:b.clientName,phone:b.clientPhone,count:0};map[k].count++});const arr=Object.values(map);openModal('Clientes',arr.length?arr.map(c=>`<div class="list-card"><h3>${escapeHtml(c.name||'Cliente')}</h3><p>${escapeHtml(c.phone||'Sem telefone')} • ${c.count} agendamento(s)</p></div>`).join(''):'<p>Nenhum cliente ainda.</p>')}
function cancelledPage(){const data=bookings().filter(b=>b.status==='cancelado').sort((a,b)=>(b.cancelledAt||'').localeCompare(a.cancelledAt||''));openModal('Cancelados',data.length?data.map(b=>`<div class="list-card"><h3>${escapeHtml(b.clientName||'Cliente')}</h3><p>${escapeHtml(b.serviceName)} • ${b.dateLabel||b.date} às ${b.time}</p></div>`).join(''):'<p>Nenhum cancelamento.</p>')}
function revenuePage(){const valid=bookings().filter(b=>b.status!=='cancelado'),done=bookings().filter(b=>b.status==='concluido'),total=valid.reduce((s,b)=>s+Number(b.price||0),0),doneTotal=done.reduce((s,b)=>s+Number(b.price||0),0);openModal('Faturamento',`<div class="summary-box"><p>Agendado</p><div class="big">${money(total)}</div><p>${valid.length} agendamento(s)</p></div><div class="summary-box"><p>Concluído</p><div class="big">${money(doneTotal)}</div><p>${done.length} atendimento(s)</p></div>`)}
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
   <div id="qrPanel" class="qr-panel hidden">
     <div class="qr-card">
       <button id="closeQr" class="qr-close" type="button" aria-label="Fechar QR Code">✕</button>
       <h3>QR Code do agendamento</h3>
       <p>Aponte a câmera do celular para abrir o aplicativo do cliente.</p>
       <img id="qrImage" alt="QR Code para o aplicativo da Barbearia Nicácio">
       <strong>Barbearia Nicácio</strong>
       <small>${clientUrl}</small>
     </div>
   </div>
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
 $('#showQr').onclick=()=>{$('#qrImage').src='https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=18&data='+encodeURIComponent(clientUrl);$('#qrPanel').classList.remove('hidden')};
 $('#closeQr').onclick=()=>$('#qrPanel').classList.add('hidden');
 $('#qrPanel').addEventListener('click',e=>{if(e.target.id==='qrPanel')$('#qrPanel').classList.add('hidden')});
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
