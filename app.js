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

const OPEN_TIMES = [
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00',
  '13:00','13:30','14:00','14:30','15:00','15:30','16:00',
  '16:30','17:00','17:30','18:00'
];

let selectedService = null;
let selectedDate = null;
let selectedTime = null;

const $ = (s)=>document.querySelector(s);
const servicesEl = $('#services');
const datesEl = $('#dates');
const timesEl = $('#times');

function clientProfile(){
  return JSON.parse(localStorage.getItem('nicacio_profile') || 'null');
}
function bookings(){
  return JSON.parse(localStorage.getItem('nicacio_bookings') || '[]');
}
function saveBookings(v){
  localStorage.setItem('nicacio_bookings', JSON.stringify(v));
}
function blockedDays(){
  return JSON.parse(localStorage.getItem('nicacio_blocked_days') || '[]');
}
function isBlockedDay(key){
  return blockedDays().includes(key);
}
function money(v){
  return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}
function localDateKey(d){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function firstName(){
  const profile=clientProfile();
  if(!profile || !profile.name) return 'Cliente';
  return profile.name.trim().split(/\s+/)[0];
}

function playIntro(){
  const intro1=$('#intro1');
  const intro2=$('#intro2');
  const stepService=$('#stepService');

  if(intro1) intro1.textContent=`Olá, ${firstName()}! Que bom ter você aqui.`;
  if(intro2) intro2.textContent='Por qual serviço você está procurando?';

  setTimeout(()=>intro1?.classList.add('show'),180);
  setTimeout(()=>intro2?.classList.add('show'),850);
  setTimeout(()=>{
    if(stepService){
      stepService.classList.remove('intro-step-hidden');
      stepService.classList.add('intro-step-show');
    }
  },1450);
}

function renderServices(){
  if(!servicesEl) return;
  servicesEl.innerHTML='';
  SERVICES.forEach(s=>{
    const el=document.createElement('button');
    el.type='button';
    el.className='card';
    const durationLabel = s.duration===60 ? '1hr' : `${s.duration}min`;
    el.innerHTML=`
      <span class="check"></span>
      <div class="service-name">${s.name}</div>
      <div class="service-meta">
        <span>${money(s.price)}</span>
        <span>${durationLabel}</span>
      </div>`;
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

  // Hoje até o último dia do terceiro mês seguinte.
  const end=new Date(now.getFullYear(), now.getMonth()+4, 0);
  end.setHours(23,59,59,999);

  const cursor=new Date(now);
  let i=0;

  while(cursor<=end){
    const copy=new Date(cursor);
    const key=localDateKey(copy);
    const sunday=copy.getDay()===0;
    const manualBlock=isBlockedDay(key);

    out.push({
      d:copy,
      key,
      dow:names[copy.getDay()],
      month:months[copy.getMonth()],
      label:i===0 ? 'HOJE' : String(copy.getDate()).padStart(2,'0'),
      disabled:sunday || manualBlock,
      sunday,
      manualBlock
    });

    cursor.setDate(cursor.getDate()+1);
    i++;
  }
  return out;
}

function renderDates(){
  if(!datesEl) return;
  datesEl.innerHTML='';
  dateChoices().forEach(x=>{
    const el=document.createElement('button');
    el.type='button';
    el.className='card date-card'+(x.disabled?' disabled':'');
    el.disabled=x.disabled;

    const blockText=x.sunday?'DOMINGO':x.manualBlock?'BLOQUEADO':'';
    el.innerHTML=`
      <div class="dow">${x.dow}</div>
      <div class="day">${x.label}</div>
      <div class="month">${x.month}</div>
      ${blockText ? `<div class="blocked-tag">${blockText}</div>` : ''}`;

    el.onclick=()=>{
      selectedDate=x;
      selectedTime=null;
      [...datesEl.children].forEach(c=>c.classList.remove('selected'));
      el.classList.add('selected');
      $('#selectedDateLabel').textContent=x.d.toLocaleDateString('pt-BR',{
        weekday:'long',day:'2-digit',month:'long',year:'numeric'
      });
      renderTimes();
    };
    datesEl.appendChild(el);
  });
}

function renderTimes(){
  if(!selectedDate) return;
  timesEl.innerHTML='';

  if(selectedDate.disabled){
    $('#timesMessage').textContent='ESTE DIA ESTÁ BLOQUEADO.';
    $('#confirmBooking').disabled=true;
    return;
  }

  const taken=bookings()
    .filter(b=>b.date===selectedDate.key && b.status!=='cancelado')
    .map(b=>b.time);

  const free=OPEN_TIMES.filter(t=>!taken.includes(t));

  if(!free.length){
    $('#timesMessage').textContent='NESTE DIA, TODOS OS HORÁRIOS JÁ FORAM RESERVADOS.';
    $('#confirmBooking').disabled=true;
    return;
  }

  $('#timesMessage').textContent='Escolha um horário disponível:';
  free.forEach(t=>{
    const b=document.createElement('button');
    b.type='button';
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

$('#serviceNext')?.addEventListener('click',()=>{
  if(!selectedService) return;
  $('#stepService').classList.add('hidden');
  $('#stepDate').classList.remove('hidden');
  $('#chosenServiceBubble').textContent=selectedService.name;
  renderDates();
  window.scrollTo({top:0,behavior:'smooth'});
});

$('#backToService')?.addEventListener('click',()=>{
  $('#stepDate').classList.add('hidden');
  $('#stepService').classList.remove('hidden');
  selectedDate=null;
  selectedTime=null;
  $('#confirmBooking').disabled=true;
});

$('#confirmBooking')?.addEventListener('click',()=>{
  if(!selectedService || !selectedDate || !selectedTime) return;

  const data=bookings();
  const conflict=data.some(
    b=>b.date===selectedDate.key && b.time===selectedTime && b.status!=='cancelado'
  );

  if(conflict){
    renderTimes();
    alert('Esse horário acabou de ser reservado. Escolha outro.');
    return;
  }

  const profile=clientProfile() || {};
  const item={
    id:(crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    clientName:profile.name || 'Cliente',
    clientEmail:profile.email || '',
    clientPhone:profile.phone || '',
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

  data.push(item);
  saveBookings(data);

  $('#stepDate').classList.add('hidden');
  $('#stepDone').classList.remove('hidden');
  $('#bookingSummary').innerHTML=`
    <strong>${item.serviceName}</strong><br>
    ${item.dateLabel} às ${item.time}<br>
    ${money(item.price)} • ${item.duration===60?'1hr':item.duration+' min'}
  `;
  window.scrollTo({top:0,behavior:'smooth'});
});

$('#newBooking')?.addEventListener('click',()=>location.reload());

renderServices();
playIntro();
