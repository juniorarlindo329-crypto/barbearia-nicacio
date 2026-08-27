
const SERVICES = [
  { id:'corte', name:'Corte', price:30, duration:30 },
  { id:'barba', name:'Barba', price:20, duration:30 },
  { id:'corte_barba', name:'Corte+Barba', price:45, duration:60 },
  { id:'corte_sobrancelha', name:'Corte+Sobrancelha', price:40, duration:30 },
  { id:'corte_barba_sobra', name:'Corte+Barba+Sobra', price:50, duration:60 },
  { id:'barba_sobrancelha', name:'Barba+Sobrancelha', price:30, duration:30 },
  { id:'corte_alisante_pintura', name:'Corte +Alisante ou pintura', price:60, duration:60 },
  { id:'alisante_pintura', name:'Alisante ou pintura', price:30, duration:30 },
  { id:'closed', name:'Closed', price:0, duration:60 },
  { id:'cmt', name:'CMT', price:38, duration:10 },
  { id:'cs', name:'CS', price:12, duration:10 }
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

function blockedDays(){ return JSON.parse(localStorage.getItem('nicacio_blocked_days')||'[]'); }
function isBlockedDay(key){ return blockedDays().includes(key); }


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

  // Ex.: 27/08 -> 28/08 -> 29/08 -> 30/08 -> 31/08 -> 01/09...
  // Vai até o último dia do terceiro mês seguinte.
  const end = new Date(now.getFullYear(), now.getMonth()+4, 0);
  end.setHours(23,59,59,999);

  const cursor = new Date(now);
  let index = 0;

  while(cursor <= end){
    const copy = new Date(cursor);

    out.push({
      d: copy,
      key: localDateKey(copy),
      dow: names[copy.getDay()],
      month: months[copy.getMonth()],
      label: index === 0 ? 'HOJE' : String(copy.getDate()).padStart(2,'0'),
      disabled: copy.getDay() === 0 || isBlockedDay(localDateKey(copy))
    });

    cursor.setDate(cursor.getDate()+1);
    index++;
  }

  return out;
}

function renderDates(){
  datesEl.innerHTML='';
  dateChoices().forEach(x=>{
    const el=document.createElement('button');
    el.className='card date-card'+(x.disabled?' disabled':'');
    el.disabled=x.disabled;
    const blockText = x.disabled ? '<div class="blocked-tag">BLOQUEADO</div>' : '';
    el.innerHTML=`<div class="dow">${x.dow}</div><div class="day">${x.label}</div><div class="month">${x.month}</div>${blockText}`;
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
  if(selectedDate && selectedDate.disabled){
    $('#timesMessage').textContent='ESTE DIA ESTÁ BLOQUEADO.';
    $('#confirmBooking').disabled=true;
    return;
  }
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



function playIntro(){
  const intro1 = document.getElementById('intro1');
  const intro2 = document.getElementById('intro2');
  const stepService = document.getElementById('stepService');

  setTimeout(()=> intro1?.classList.add('show'), 250);
  setTimeout(()=> intro2?.classList.add('show'), 950);
  setTimeout(()=>{
    if(stepService){
      stepService.classList.remove('intro-step-hidden');
      stepService.classList.add('intro-step-show');
    }
  }, 1650);
}

renderServices();
playIntro();

