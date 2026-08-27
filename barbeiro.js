
const SERVICES = [
  {name:'Corte',price:30,duration:30},{name:'Barba',price:20,duration:30},{name:'Corte+Barba',price:45,duration:60},
  {name:'Corte+Sobrancelha',price:40,duration:30},{name:'Corte+Barba+Sobra',price:50,duration:60},
  {name:'Barba+Sobrancelha',price:30,duration:30},{name:'Corte +Alisante ou pintura',price:60,duration:60},
  {name:'Alisante ou pintura',price:30,duration:30},{name:'Closed',price:0,duration:60},{name:'CMT',price:38,duration:10},{name:'CS',price:12,duration:10}
];

let currentWeekStart = startOfWeek(new Date());
let selectedDate = new Date();
let valuesHidden = false;
const $ = s => document.querySelector(s);

function bookings(){ return JSON.parse(localStorage.getItem('nicacio_bookings')||'[]'); }
function saveBookings(v){ localStorage.setItem('nicacio_bookings',JSON.stringify(v)); }
function blockedDays(){ return JSON.parse(localStorage.getItem('nicacio_blocked_days')||'[]'); }
function saveBlockedDays(v){ localStorage.setItem('nicacio_blocked_days',JSON.stringify(v)); }
function settings(){ return JSON.parse(localStorage.getItem('nicacio_barber_settings')||'{"start":"09:00","end":"18:00"}'); }
function saveSettings(v){ localStorage.setItem('nicacio_barber_settings',JSON.stringify(v)); }
function key(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function money(v){ return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function startOfWeek(d){ const x=new Date(d); x.setHours(0,0,0,0); const day=(x.getDay()+6)%7; x.setDate(x.getDate()-day); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }

function renderWeek(){
  const end=addDays(currentWeekStart,6);
  $('#weekRange').textContent=`${currentWeekStart.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})} a ${end.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}`;
  const names=['SEG','TER','QUA','QUI','SEX','SAB','DOM'];
  const wrap=$('#weekDays'); wrap.innerHTML='';
  for(let i=0;i<7;i++){
    const d=addDays(currentWeekStart,i);
    const b=document.createElement('button'); b.className='day-btn';
    if(key(d)===key(selectedDate)) b.classList.add('active');
    const blocked=d.getDay()===0 || blockedDays().includes(key(d));
    if(blocked) b.classList.add('blocked');
    b.innerHTML=`<span>${names[i]}</span><strong>${String(d.getDate()).padStart(2,'0')}</strong><small>${blocked?'BLOQ.':''}</small>`;
    b.onclick=()=>{ selectedDate=d; renderWeek(); renderAll(); };
    wrap.appendChild(b);
  }
}

function dayBookings(d){
  return bookings().filter(b=>b.date===key(d) && b.status!=='cancelado');
}
function weekBookings(){
  const end=addDays(currentWeekStart,6);
  return bookings().filter(b=>b.status!=='cancelado' && b.date>=key(currentWeekStart) && b.date<=key(end));
}

function renderStats(){
  const today=dayBookings(new Date());
  const week=weekBookings();
  $('#todayCount').textContent=today.length;
  $('#weekCount').textContent=week.length;
  const tRev=today.reduce((s,b)=>s+Number(b.price||0),0);
  const wRev=week.reduce((s,b)=>s+Number(b.price||0),0);
  $('#todayRevenue').textContent=valuesHidden?'••••':money(tRev);
  $('#weekRevenue').textContent=valuesHidden?'••••':money(wRev);
}

function renderTimeline(){
  const s=settings();
  $('#hoursText').textContent=`${s.start} às ${s.end}`;
  $('#selectedDayTitle').textContent=selectedDate.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});
  const list=dayBookings(selectedDate).sort((a,b)=>a.time.localeCompare(b.time));
  const startHour=parseInt(s.start.split(':')[0],10), endHour=parseInt(s.end.split(':')[0],10);
  const wrap=$('#timeline'); wrap.innerHTML='';
  for(let h=startHour; h<=endHour; h++){
    const row=document.createElement('div'); row.className='hour-row';
    const hh=String(h).padStart(2,'0')+':00';
    row.innerHTML=`<div class="hour-label">${hh}</div>`;
    const appts=list.filter(b=>parseInt(b.time.split(':')[0],10)===h);
    if(!appts.length){
      const e=document.createElement('div'); e.className='empty-hour'; e.textContent='Sem agendamentos'; row.appendChild(e);
    }else{
      appts.forEach(b=>{
        const card=document.createElement('div'); card.className='appointment';
        card.innerHTML=`<strong>${b.time} • ${b.clientName||'Cliente'}</strong>
          <p>${b.serviceName} • ${money(b.price)}</p>
          <p>${b.clientPhone?b.clientPhone+' • ':''}${b.clientEmail||''}</p>
          <div class="appointment-actions">
            <button class="done-btn">Concluir</button>
            <button class="cancel-btn">Cancelar</button>
          </div>`;
        card.querySelector('.cancel-btn').onclick=()=>cancelBooking(b.id);
        card.querySelector('.done-btn').onclick=()=>completeBooking(b.id);
        row.appendChild(card);
      });
    }
    wrap.appendChild(row);
  }
}

function cancelBooking(id){
  if(!confirm('Cancelar este agendamento?')) return;
  const all=bookings(); const b=all.find(x=>x.id===id);
  if(b){ b.status='cancelado'; b.cancelledAt=new Date().toISOString(); saveBookings(all); renderAll(); }
}
function completeBooking(id){
  const all=bookings(); const b=all.find(x=>x.id===id);
  if(b){ b.status='concluido'; b.completedAt=new Date().toISOString(); saveBookings(all); renderAll(); }
}

function openModal(title,html){
  $('#modalTitle').textContent=title; $('#modalContent').innerHTML=html; $('#modal').classList.remove('hidden');
}
function closeModal(){ $('#modal').classList.add('hidden'); }

function newBookingModal(){
  const services=SERVICES.map((s,i)=>`<option value="${i}">${s.name} — ${money(s.price)}</option>`).join('');
  const today=key(new Date());
  openModal('Novo Agendamento',`
    <form id="manualForm" class="form-grid">
      <div class="field full"><label>Nome do cliente</label><input id="mName" required placeholder="Nome da pessoa"></div>
      <div class="field"><label>Telefone</label><input id="mPhone" placeholder="(00) 00000-0000"></div>
      <div class="field"><label>E-mail</label><input id="mEmail" type="email"></div>
      <div class="field full"><label>Serviço</label><select id="mService">${services}</select></div>
      <div class="field"><label>Data</label><input id="mDate" type="date" min="${today}" value="${key(selectedDate)}" required></div>
      <div class="field"><label>Horário</label><input id="mTime" type="time" required></div>
      <button class="primary-btn full" type="submit">SALVAR AGENDAMENTO</button>
    </form>`);
  $('#manualForm').onsubmit=e=>{
    e.preventDefault();
    const s=SERVICES[Number($('#mService').value)];
    const item={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),clientName:$('#mName').value.trim(),clientPhone:$('#mPhone').value.trim(),clientEmail:$('#mEmail').value.trim(),serviceName:s.name,price:s.price,duration:s.duration,date:$('#mDate').value,dateLabel:new Date($('#mDate').value+'T12:00:00').toLocaleDateString('pt-BR'),time:$('#mTime').value,status:'confirmado',createdAt:new Date().toISOString(),source:'barbeiro'};
    const all=bookings();
    const conflict=all.some(b=>b.date===item.date && b.time===item.time && b.status!=='cancelado');
    if(conflict){ alert('Já existe agendamento nesse horário.'); return; }
    all.push(item); saveBookings(all); closeModal(); selectedDate=new Date(item.date+'T12:00:00'); currentWeekStart=startOfWeek(selectedDate); renderAll();
  };
}

function clientsPage(){
  const data=bookings().filter(b=>b.status!=='cancelado');
  const map={};
  data.forEach(b=>{ const k=(b.clientEmail||b.clientPhone||b.clientName||'cliente').toLowerCase(); if(!map[k])map[k]=b; });
  openModal('Clientes',Object.values(map).length?Object.values(map).map(b=>`<div class="client-row"><strong>${b.clientName||'Cliente'}</strong><br>${b.clientPhone||''}<br>${b.clientEmail||''}</div>`).join(''):'<p>Nenhum cliente ainda.</p>');
}
function cancelledPage(){
  const data=bookings().filter(b=>b.status==='cancelado').sort((a,b)=>(b.cancelledAt||'').localeCompare(a.cancelledAt||''));
  openModal('Cancelados',data.length?data.map(b=>`<div class="cancelled-row"><strong>${b.clientName||'Cliente'} • ${b.dateLabel} ${b.time}</strong><br>${b.serviceName}</div>`).join(''):'<p>Nenhum cancelamento.</p>');
}
function revenuePage(){
  const done=bookings().filter(b=>b.status!=='cancelado');
  const total=done.reduce((s,b)=>s+Number(b.price||0),0);
  openModal('Faturamento',`<div class="revenue-row"><strong>Total registrado</strong><h2>${money(total)}</h2><p>${done.length} agendamento(s)</p></div>`);
}
function settingsPage(){
  const s=settings();
  openModal('Configurações',`<form id="settingsForm">
    <div class="field"><label>Início</label><input id="setStart" type="time" value="${s.start}"></div>
    <div class="field"><label>Fim</label><input id="setEnd" type="time" value="${s.end}"></div>
    <button class="primary-btn" type="submit">SALVAR HORÁRIOS</button>
  </form>`);
  $('#settingsForm').onsubmit=e=>{e.preventDefault();saveSettings({start:$('#setStart').value,end:$('#setEnd').value});closeModal();renderAll();};
}

function toggleDayBlock(){
  const k=key(selectedDate);
  if(selectedDate.getDay()===0){ alert('Domingo já é bloqueado automaticamente.'); return; }
  let all=blockedDays();
  if(all.includes(k)) all=all.filter(x=>x!==k); else all.push(k);
  saveBlockedDays(all); renderWeek();
}

function renderAll(){ renderWeek(); renderStats(); renderTimeline(); }

$('#prevWeek').onclick=()=>{currentWeekStart=addDays(currentWeekStart,-7);selectedDate=new Date(currentWeekStart);renderAll();};
$('#nextWeek').onclick=()=>{currentWeekStart=addDays(currentWeekStart,7);selectedDate=new Date(currentWeekStart);renderAll();};
$('#togglePrivacy').onclick=()=>{valuesHidden=!valuesHidden;renderStats();};
$('#newBookingBtn').onclick=newBookingModal;
$('#lockDayBtn').onclick=toggleDayBlock;
$('#editDayBtn').onclick=toggleDayBlock;
$('#editHoursBtn').onclick=settingsPage;
$('#openMenu').onclick=()=>{$('#sideMenu').classList.remove('hidden');$('#menuOverlay').classList.remove('hidden');};
$('#closeMenu').onclick=$('#menuOverlay').onclick=()=>{$('#sideMenu').classList.add('hidden');$('#menuOverlay').classList.add('hidden');};
$('#closeModal').onclick=closeModal;

document.querySelectorAll('.menu-list button').forEach(btn=>btn.onclick=()=>{
  $('#sideMenu').classList.add('hidden');$('#menuOverlay').classList.add('hidden');
  const p=btn.dataset.page;
  if(p==='clients') clientsPage();
  else if(p==='cancelled') cancelledPage();
  else if(p==='revenue') revenuePage();
  else if(p==='settings') settingsPage();
  else if(p==='link') openModal('Meu link',`<p>Compartilhe este link com seus clientes:</p><input style="width:100%;padding:13px;border-radius:12px;border:1px solid #ffffff22;background:#0e141c;color:#fff" value="https://barbearia-nicacio.onrender.com" readonly><button class="primary-btn" onclick="navigator.clipboard.writeText('https://barbearia-nicacio.onrender.com')">COPIAR LINK</button>`);
  else openModal(btn.textContent,'<p>Esta área está pronta para receber mais configurações depois.</p>');
});

renderAll();
