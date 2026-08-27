
const SERVICES = [
  { id:'corte', name:'Corte', price:30, duration:30 },
  { id:'barba', name:'Barba', price:20, duration:30 },
  { id:'corte_barba', name:'Corte + Barba', price:45, duration:60 },
  { id:'sobrancelha', name:'Sobrancelha', price:15, duration:15 }
];

const OPEN_TIMES = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'];

let selectedService = null;
let selectedDate = null;
let selectedTime = null;

const $ = (s)=>document.querySelector(s);
const servicesEl = $('#services');
const datesEl = $('#dates');
const timesEl = $('#times');

function money(v){ return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
function localDateKey(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function bookings(){ return JSON.parse(localStorage.getItem('nicacio_bookings')||'[]'); }
function saveBookings(v){ localStorage.setItem('nicacio_bookings',JSON.stringify(v)); }

function renderServices(){
  servicesEl.innerHTML='';
  SERVICES.forEach(s=>{
    const el=document.createElement('button');
    el.className='card';
    el.innerHTML=`<span class="check"></span>
      <div class="service-name">${s.name}</div>
      <div class="service-meta"><span>${money(s.price)}</span><span>${s.duration}min</span></div>`;
    el.onclick=()=>{
      selectedService=s;
      [...servicesEl.children].forEach(c=>c.classList.remove('selected'));
      el.classList.add('selected');
      $('#serviceNext').disabled=false;
    };
    servicesEl.appendChild(el);
  });
}

function dateChoices(){
  const out=[];
  const names=['DOM','SEG','TER','QUA','QUI','SEX','SAB'];
  const months=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

  const now=new Date();
  now.setHours(0,0,0,0);

  // Vai de hoje até o ÚLTIMO DIA do 3º mês à frente.
  // Exemplo: 27/08/2026 -> 30/11/2026.
  const end=new Date(now.getFullYear(), now.getMonth()+4, 0);
  end.setHours(23,59,59,999);

  let i=0;
  for(let d=new Date(now); d<=end; d.setDate(d.getDate()+1), i++){
    const copy=new Date(d);
    out.push({
      d:copy,
      key:localDateKey(copy),
      dow:names[copy.getDay()],
      month:months[copy.getMonth()],
      label:i===0?'HOJE':String(copy.getDate()).padStart(2,'0'),
      disabled:copy.getDay()===0
    });
  }

  return out;
}

function renderDates(){
  datesEl.innerHTML='';
  dateChoices().forEach(x=>{
    const el=document.createElement('button');
    el.className='card date-card'+(x.disabled?' disabled':'');
    el.disabled=x.disabled;
    el.innerHTML=`<div class="dow">${x.dow}</div><div class="day">${x.label}</div><div class="month">${x.month}</div>`;
    el.onclick=()=>{
      selectedDate=x;
      selectedTime=null;
      [...datesEl.children].forEach(c=>c.classList.remove('selected'));
      el.classList.add('selected');
      $('#selectedDateLabel').textContent=x.d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'long',year:'numeric'});
      renderTimes();
    };
    datesEl.appendChild(el);
  });
}

function renderTimes(){
  timesEl.innerHTML='';
  const taken = bookings().filter(b=>b.date===selectedDate.key && b.status!=='cancelado').map(b=>b.time);
  const free = OPEN_TIMES.filter(t=>!taken.includes(t));
  if(!free.length){
    $('#timesMessage').textContent='NESTE DIA, TODOS OS HORÁRIOS JÁ FORAM RESERVADOS.';
    $('#confirmBooking').disabled=true;
    return;
  }
  $('#timesMessage').textContent='Escolha um horário disponível:';
  free.forEach(t=>{
    const b=document.createElement('button');
    b.className='time-btn';
    b.textContent=t;
    b.onclick=()=>{
      selectedTime=t;
      [...timesEl.children].forEach(c=>c.classList.remove('selected'));
      b.classList.add('selected');
      $('#confirmBooking').disabled=false;
    };
    timesEl.appendChild(b);
  });
}

$('#serviceNext').onclick=()=>{
  $('#stepService').classList.add('hidden');
  $('#stepDate').classList.remove('hidden');
  $('#chosenServiceBubble').textContent=selectedService.name;
  renderDates();
  window.scrollTo({top:0,behavior:'smooth'});
};

$('#backToService').onclick=()=>{
  $('#stepDate').classList.add('hidden');
  $('#stepService').classList.remove('hidden');
  selectedDate=null; selectedTime=null;
};

$('#confirmBooking').onclick=()=>{
  if(!selectedService || !selectedDate || !selectedTime) return;
  const data=bookings();
  const conflict=data.some(b=>b.date===selectedDate.key && b.time===selectedTime && b.status!=='cancelado');
  if(conflict){ renderTimes(); alert('Esse horário acabou de ser reservado. Escolha outro.'); return; }
  const item={
    id:crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    serviceId:selectedService.id,
    serviceName:selectedService.name,
    price:selectedService.price,
    duration:selectedService.duration,
    date:selectedDate.key,
    dateLabel:selectedDate.d.toLocaleDateString('pt-BR'),
    time:selectedTime,
    status:'confirmado',
    createdAt:new Date().toISOString()
  };
  data.push(item); saveBookings(data);
  $('#stepDate').classList.add('hidden');
  $('#stepDone').classList.remove('hidden');
  $('#bookingSummary').innerHTML=`<strong>${item.serviceName}</strong><br>${item.dateLabel} às ${item.time}<br>${money(item.price)} • ${item.duration} min`;
  window.scrollTo({top:0,behavior:'smooth'});
};

$('#newBooking').onclick=()=>location.reload();

function renderBookings(){
  const list=$('#bookingsList');
  const data=bookings().filter(b=>b.status!=='cancelado').sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  if(!data.length){ list.innerHTML='<div class="empty">Você ainda não possui agendamentos.</div>'; return; }
  list.innerHTML='';
  data.forEach(b=>{
    const el=document.createElement('div');
    el.className='booking-item';
    el.innerHTML=`<strong>${b.serviceName}</strong>${b.dateLabel} às ${b.time}<br>${money(b.price)} • ${b.duration} min
    <br><button class="cancel">Cancelar agendamento</button>`;
    el.querySelector('.cancel').onclick=()=>{
      if(confirm('Deseja cancelar este agendamento?')){
        const all=bookings(); const item=all.find(x=>x.id===b.id); if(item)item.status='cancelado'; saveBookings(all); renderBookings();
      }
    };
    list.appendChild(el);
  });
}
$('#myBookingsBtn').onclick=()=>{ renderBookings(); $('#bookingsModal').classList.remove('hidden'); };
$('#closeModal').onclick=()=>$('#bookingsModal').classList.add('hidden');

renderServices();

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
