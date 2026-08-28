const SERVICES=[
{id:'corte',name:'Corte',price:30,duration:30},{id:'barba',name:'Barba',price:20,duration:30},{id:'corte_barba',name:'Corte+Barba',price:45,duration:60},{id:'corte_sobrancelha',name:'Corte+Sobrancelha',price:40,duration:30},{id:'corte_barba_sobra',name:'Corte+Barba+Sobra',price:50,duration:60},{id:'barba_sobrancelha',name:'Barba+Sobrancelha',price:30,duration:30},{id:'corte_alisante_pintura',name:'Corte +Alisante ou pintura',price:60,duration:60},{id:'alisante_pintura',name:'Alisante ou pintura',price:30,duration:30},{id:'closed',name:'Closed',price:0,duration:60},{id:'cmt',name:'CMT',price:38,duration:10},{id:'cs',name:'CS',price:12,duration:10}
];
const OPEN_TIMES=['08:00','08:30','09:00','09:30','10:00','10:30','11:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'];
let selectedService=null,selectedDate=null,selectedTime=null,clientName='';
const $=s=>document.querySelector(s),servicesEl=$('#services'),datesEl=$('#dates'),timesEl=$('#times');
function bookings(){return JSON.parse(localStorage.getItem('nicacio_bookings')||'[]')}
function saveBookings(v){localStorage.setItem('nicacio_bookings',JSON.stringify(v))}
function blockedDays(){return JSON.parse(localStorage.getItem('nicacio_blocked_days')||'[]')}
function isBlockedDay(k){return blockedDays().includes(k)}
function money(v){return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function localDateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function show(id){$(id)?.classList.remove('hidden')}
function hide(id){$(id)?.classList.add('hidden')}
function scrollDown(){setTimeout(()=>window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'}),120)}

function playIntro(){
 const w=$('#welcomeBubble'),q=$('#nameQuestion'),s=$('#stepName');
 setTimeout(()=>w?.classList.add('show'),180);
 setTimeout(()=>q?.classList.add('show'),850);
 setTimeout(()=>{s?.classList.remove('intro-step-hidden');s?.classList.add('intro-step-show')},1450);
 const old=JSON.parse(localStorage.getItem('nicacio_profile')||'null');
 if(old?.name) $('#clientName').value=old.name;
 $('#sendName').disabled=$('#clientName').value.trim().split(/\s+/).length<2;
}
$('#clientName')?.addEventListener('input',e=>{$('#sendName').disabled=e.target.value.trim().split(/\s+/).length<2});
$('#sendName')?.addEventListener('click',()=>{
 clientName=$('#clientName').value.trim(); if(!clientName)return;
 hide('#stepName'); $('#nameReply').textContent=clientName; $('#howAreYou').textContent=`Como vai, ${clientName}, tudo bem?`; show('#stepNotify'); scrollDown();
});
async function notificationStep(){
 if('Notification' in window){
   try{const permission=await Notification.requestPermission();
     if(permission==='granted'){$('#enableNotifications').textContent='✓ NOTIFICAÇÕES ATIVADAS';}
     else{$('#enableNotifications').textContent='NOTIFICAÇÕES NÃO ATIVADAS';}
   }catch(e){}
 }
 setTimeout(()=>{hide('#stepNotify');show('#stepService');scrollDown()},500);
}
$('#enableNotifications')?.addEventListener('click',notificationStep);
$('#continueWithoutNotifications')?.addEventListener('click',()=>{hide('#stepNotify');show('#stepService');scrollDown()});

function renderServices(){servicesEl.innerHTML='';SERVICES.forEach(s=>{const el=document.createElement('button');el.type='button';el.className='card';el.innerHTML=`<span class="check"></span><div class="service-name">${s.name}</div><div class="service-meta"><span>${money(s.price)}</span><span>${s.duration===60?'1hr':s.duration+'min'}</span></div>`;el.onclick=()=>{selectedService=s;[...servicesEl.children].forEach(c=>c.classList.remove('selected'));el.classList.add('selected');$('#serviceNext').disabled=false};servicesEl.appendChild(el)})}
function dateChoices(){const out=[],names=['DOM','SEG','TER','QUA','QUI','SEX','SAB'],months=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];const now=new Date();now.setHours(0,0,0,0);const end=new Date(now.getFullYear(),now.getMonth()+4,0);const cursor=new Date(now);let i=0;while(cursor<=end){const d=new Date(cursor),key=localDateKey(d),sunday=d.getDay()===0,manualBlock=isBlockedDay(key);out.push({d,key,dow:names[d.getDay()],month:months[d.getMonth()],label:i===0?'HOJE':String(d.getDate()).padStart(2,'0'),disabled:sunday||manualBlock,sunday,manualBlock});cursor.setDate(cursor.getDate()+1);i++}return out}
function renderDates(){datesEl.innerHTML='';dateChoices().forEach(x=>{const el=document.createElement('button');el.type='button';el.className='card date-card'+(x.disabled?' disabled':'');el.disabled=x.disabled;const block=x.sunday?'DOMINGO':x.manualBlock?'BLOQUEADO':'';el.innerHTML=`<div class="dow">${x.dow}</div><div class="day">${x.label}</div><div class="month">${x.month}</div>${block?`<div class="blocked-tag">${block}</div>`:''}`;el.onclick=()=>{selectedDate=x;selectedTime=null;[...datesEl.children].forEach(c=>c.classList.remove('selected'));el.classList.add('selected');$('#selectedDateLabel').textContent=x.d.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});renderTimes()};datesEl.appendChild(el)})}
function renderTimes(){if(!selectedDate)return;timesEl.innerHTML='';const taken=bookings().filter(b=>b.date===selectedDate.key&&b.status!=='cancelado').map(b=>b.time),free=OPEN_TIMES.filter(t=>!taken.includes(t));if(!free.length){$('#timesMessage').textContent='NESTE DIA, TODOS OS HORÁRIOS JÁ FORAM RESERVADOS.';$('#confirmDate').disabled=true;return}$('#timesMessage').textContent='Escolha um horário disponível:';free.forEach(t=>{const b=document.createElement('button');b.type='button';b.className='time-btn';b.textContent=t;b.onclick=()=>{selectedTime=t;[...timesEl.children].forEach(c=>c.classList.remove('selected'));b.classList.add('selected');$('#confirmDate').disabled=false};timesEl.appendChild(b)})}
$('#serviceNext')?.addEventListener('click',()=>{if(!selectedService)return;hide('#stepService');show('#stepDate');$('#chosenServiceBubble').textContent=selectedService.name;renderDates();scrollDown()});
$('#backToService')?.addEventListener('click',()=>{hide('#stepDate');show('#stepService');selectedDate=null;selectedTime=null;$('#confirmDate').disabled=true});
$('#confirmDate')?.addEventListener('click',()=>{if(!selectedService||!selectedDate||!selectedTime)return;hide('#stepDate');show('#stepPhone');const old=JSON.parse(localStorage.getItem('nicacio_profile')||'null');if(old?.phone)$('#clientPhone').value=old.phone;$('#finishBooking').disabled=$('#clientPhone').value.replace(/\D/g,'').length<8;scrollDown()});
$('#clientPhone')?.addEventListener('input',e=>{$('#finishBooking').disabled=e.target.value.replace(/\D/g,'').length<8});
$('#finishBooking')?.addEventListener('click',()=>{
 const phone=$('#clientPhone').value.trim();if(!phone||!selectedService||!selectedDate||!selectedTime)return;
 const data=bookings();if(data.some(b=>b.date===selectedDate.key&&b.time===selectedTime&&b.status!=='cancelado')){alert('Esse horário acabou de ser reservado. Escolha outro.');hide('#stepPhone');show('#stepDate');renderTimes();return}
 const old=JSON.parse(localStorage.getItem('nicacio_profile')||'{}');localStorage.setItem('nicacio_profile',JSON.stringify({...old,name:clientName,phone}));
 const item={id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())),clientName,clientEmail:old.email||'',clientPhone:phone,serviceId:selectedService.id,serviceName:selectedService.name,price:selectedService.price,duration:selectedService.duration,date:selectedDate.key,dateLabel:selectedDate.d.toLocaleDateString('pt-BR'),time:selectedTime,status:'confirmado',createdAt:new Date().toISOString()};data.push(item);saveBookings(data);
 const fullDate=selectedDate.d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).replace(/\./g,'');
 hide('#stepPhone');show('#stepDone');$('#bookingSummary').innerHTML=`<div class="bubble bot final-bubble"><b>Perfeito...</b><br><br>Agendamento realizado: Um(a) <b>${item.serviceName}</b> - (${money(item.price)}), com o(a) <b>${clientName}</b> no(a) ${fullDate} às <b>${item.time}</b>.<br><br>O local é o de sempre: <b>Rua São José, 197 - Ao lado do Bradesco.</b><br><br><strong>EVITE ATRASOS. SE VOCÊ NÃO CONSEGUIR CHEGAR NO HORÁRIO, POR FAVOR, CANCELE OU AVISE ANTES.</strong><br><br>Muito obrigado, até mais!</div>`;scrollDown();
});
$('#newBooking')?.addEventListener('click',()=>location.reload());
renderServices();playIntro();
let deferredInstallPrompt=null;const installBtn=$('#installAppBtn');window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;installBtn?.classList.remove('hidden')});installBtn?.addEventListener('click',async()=>{if(!deferredInstallPrompt){alert('No Chrome, toque no menu ⋮ e escolha "Adicionar à tela inicial" ou "Instalar app".');return}deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;installBtn.classList.add('hidden')});window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;installBtn?.classList.add('hidden')});if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=19').catch(()=>{}));
