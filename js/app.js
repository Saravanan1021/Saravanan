/* ══════════ CITIES ══════════ */
var CITIES=['Madurai','Chennai','Coimbatore','Tiruchirappalli','Salem',
  'Tirunelveli','Erode','Vellore','Thoothukudi','Thanjavur',
  'Dindigul','Karur','Cuddalore','Kanchipuram','Nagercoil',
  'Hosur','Kumbakonam','Pollachi','Udhagamandalam','Sivakasi',
  'Virudhunagar','Namakkal','Dharmapuri','Krishnagiri','Ramanathapuram',
  'Pudukkottai','Nagapattinam','Ariyalur','Perambalur','Villupuram'];

/* ══════════ AVATAR ══════════ */
var AV_PAL=[
  {bg:'#EEE9E2',fg:'#5C4A38'},{bg:'#E2EAF0',fg:'#354C62'},
  {bg:'#E6F0E8',fg:'#345840'},{bg:'#F0E6E8',fg:'#5C3844'},
  {bg:'#EDE8F4',fg:'#483464'},{bg:'#F0EEE2',fg:'#5A5434'},
  {bg:'#E2F0EE',fg:'#32585A'},{bg:'#F0E8E2',fg:'#5C4234'}
];
function avColor(s){return AV_PAL[((s||'?').toUpperCase().charCodeAt(0)||65)%8];}
function avEl(name,size,rad){
  size=size||36;rad=rad||'50%';
  var c=avColor(name);var l=(name||'?').trim()[0].toUpperCase();
  return '<div style="width:'+size+'px;height:'+size+'px;border-radius:'+rad+';background:'+c.bg+';color:'+c.fg+';display:flex;align-items:center;justify-content:center;font-size:'+Math.round(size*.42)+'px;font-weight:800;flex-shrink:0;letter-spacing:-.5px;font-family:inherit">'+l+'</div>';
}

/* ══════════ STORAGE ══════════ */
var SK='thozhil4';
var API_BASE='/api';
async function apiFetch(path, options){
  options = options || {};
  options.headers = Object.assign({'Content-Type':'application/json'}, options.headers || {});
  if (options.body && typeof options.body !== 'string') options.body = JSON.stringify(options.body);
  var res = await fetch(path, options);
  var data = null;
  try{ data = await res.json(); } catch(e){}
  if (!res.ok) {
    throw new Error((data && data.error) || res.statusText || 'API error');
  }
  return data;
}
function normalizePhoneValue(v){
  var raw = String(v||'').replace(/\D/g,'');
  if (!raw) return '';
  if (raw.length === 10) return '+91' + raw;
  if (raw.length === 12 && raw.indexOf('91')===0) return '+' + raw;
  if (raw.length === 11 && raw[0]==='0') return '+91' + raw.slice(1);
  return raw[0] === '+' ? raw : '+' + raw;
}
async function loadJobs(){
  try{
    var result = await apiFetch(API_BASE + '/jobs');
    if(result && Array.isArray(result.jobs)){
      S.jobs = sanitizeJobs(result.jobs);
      updateDistances();
      lsSave();
      if(document.getElementById('jobs-list')) renderJobs();
    }
  } catch(err){
    console.warn('Could not load jobs from backend:', err);
  }
}
function saveProfile(profile){
  if(!profile || !profile.phone) return Promise.reject(new Error('Profile phone missing'));
  return apiFetch(API_BASE + '/profile', { method:'POST', body: profile });
}
function sanitizeText(v,max){var s=(v==null?'':String(v)).replace(/[<>]/g,'').trim();return max? s.slice(0,max) : s;}
function sanitizeProfile(v){var p=typeof v==='object'&&v?v:{};return {
  name:sanitizeText(p.name,60),
  phone:sanitizeText(p.phone,24),
  email:sanitizeText(p.email,120),
  skills:sanitizeText(p.skills,120),
  bio:sanitizeText(p.bio,200),
  city:sanitizeText(p.city,60)||'Madurai',
  userType:['seeker','employer','both'].indexOf(p.userType)>=0?p.userType:'seeker'
};}
function sanitizeJobs(v){return Array.isArray(v)?v.filter(function(j){return j&&typeof j==='object';}).map(function(j){return {
  id:sanitizeText(j.id,80)||'j'+Date.now(),
  title:sanitizeText(j.title,80),
  company:sanitizeText(j.company,80),
  cat:['delivery','teaching','computer','retail','services','food','other'].indexOf(j.cat)>=0?j.cat:'other',
  city:sanitizeText(j.city,60)||'Madurai',
  dist:Math.max(0,Number(j.dist)||0),
  lat:j.lat == null ? null : Number(j.lat),
  lng:j.lng == null ? null : Number(j.lng),
  salary:Math.max(0,Number(j.salary)||0),
  period:sanitizeText(j.period,20) || '/month',
  hours:sanitizeText(j.hours,80),
  desc:sanitizeText(j.desc,500),
  contact:sanitizeText(j.contact,24),
  openings:Math.max(1,Math.min(99,Number(j.openings)||1)),
  badge:['new','hot','urgent'].indexOf(j.badge)>=0?j.badge:'new',
  tags:Array.isArray(j.tags)?j.tags.slice(0,8).map(function(t){return sanitizeText(t,30);}).filter(Boolean):[],
  status:['active','paused'].indexOf(j.status)>=0?j.status:'active',
  postedAt:sanitizeText(j.postedAt,30),
  postedBy:sanitizeText(j.postedBy,60),
  applicants:Math.max(0,Number(j.applicants)||0),
  distLabel:sanitizeText(j.distLabel,10)
};}):[];}
function sanitizeApplications(v){var out={};if(!v||typeof v!=='object')return out;Object.keys(v).forEach(function(k){var a=v[k];if(a&&typeof a==='object'){out[k]={status:['review','interview','hired','rejected'].indexOf(a.status)>=0?a.status:'review',date:sanitizeText(a.date,30),note:sanitizeText(a.note,300)};}});return out;}
function sanitizeSavedJobs(v){var out={};if(!v||typeof v!=='object')return out;Object.keys(v).forEach(function(k){if(v[k]===true||v[k]===1)out[k]=true;});return out;}
function sanitizeNotifs(v){return Array.isArray(v)?v.filter(function(n){return n&&typeof n==='object';}).map(function(n){return {id:Number(n.id)||Date.now(),title:sanitizeText(n.title,80),sub:sanitizeText(n.sub,160),type:['ok','err','info'].indexOf(n.type)>=0?n.type:'info',time:sanitizeText(n.time,30)||'Just now',unread:!!n.unread};}).slice(0,30):[];}
function lsLoad(){try{var d=localStorage.getItem(SK);if(!d)return null;var parsed=JSON.parse(d);if(!parsed||typeof parsed!=='object')return null;return {
  city:sanitizeText(parsed.city,60)||'Madurai',
  lang:['en','ta'].indexOf(parsed.lang)>=0?parsed.lang:'en',
  notif:typeof parsed.notif==='boolean'?parsed.notif:true,
  profileReady:!!parsed.profileReady,
  profile:sanitizeProfile(parsed.profile),
  jobs:sanitizeJobs(parsed.jobs),
  applications:sanitizeApplications(parsed.applications),
  savedJobs:sanitizeSavedJobs(parsed.savedJobs),
  notifs:sanitizeNotifs(parsed.notifs)
};}catch(e){console.warn('Storage load failed, using defaults.',e);return null;}}
function lsSave(){try{localStorage.setItem(SK,JSON.stringify({
  city:S.city,lang:S.lang,notif:S.notif,profileReady:S.profileReady,profile:S.profile,
  jobs:S.jobs,applications:S.applications,savedJobs:S.savedJobs,notifs:S.notifs
}));}catch(e){console.warn('Storage save failed',e);}}

var raw=lsLoad();
var S={
  city:raw?raw.city:'Madurai',
  lang:raw?raw.lang:'en',
  notif:raw?raw.notif:true,
  profileReady:raw?raw.profileReady:false,
  cat:'all',radius:0,
  location:raw?raw.location:null,
  profile:raw?raw.profile:{name:'',phone:'',email:'',skills:'',bio:'',city:'Madurai',userType:'seeker'},
  jobs:raw?raw.jobs:[],
  applications:raw?raw.applications:{},
  savedJobs:raw?raw.savedJobs:{},
  notifs:raw?raw.notifs:[]
};

function getCurrentPositionPromise(){
  return new Promise(function(resolve,reject){
    if(!navigator.geolocation) return reject(new Error('Geolocation not supported in this browser'));
    navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:10000,maximumAge:60000});
  });
}
function calculateDistance(lat1, lon1, lat2, lon2){
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
function updateDistances(){
  if(!S.location || S.location.lat == null || S.location.lng == null) return;
  S.jobs.forEach(function(j){
    if(j.lat != null && j.lng != null){
      j.dist = Math.round(calculateDistance(S.location.lat, S.location.lng, j.lat, j.lng) * 10) / 10;
    }
  });
}
async function requestLocation(){
  try{
    var pos = await getCurrentPositionPromise();
    setUserLocation(pos.coords.latitude, pos.coords.longitude, 'Near me');
    toast('Location set. Nearby jobs updated.', 'ok');
  }catch(err){
    console.error(err);
    toast('Unable to get location. Please allow location access.', 'err');
  }
}
function setUserLocation(lat,lng,label){
  S.location = {lat:lat,lng:lng,label:label||'Near me'};
  lsSave();
  updateDistances();
  renderJobs();
}

/* ══════════ I18N ══════════ */
var T={
  en:{
    onbSub:"Tamil Nadu's part-time job platform",
    obName:'Full Name',obPhone:'Phone',obCity:'City',obTypeLabel:'I am a',
    obSeeker:'Job Seeker',obEmployer:'Employer',obBoth:'Both',obStart:'Get Started →',
    catAll:'All',catDelivery:'Delivery',catTeaching:'Teaching',catComputer:'Computer',catRetail:'Retail',catServices:'Services',catFood:'Food',
    distAny:'Any distance',dist5:'Within 5 km',dist10:'Within 10 km',dist20:'Within 20 km',dist50:'Within 50 km',
    tbFind:'Part-time jobs near you',locCta:'Change',
    nFind:'Find Work',nPost:'Post Work',nProfile:'Profile',
    langBtn:'தமிழ்',langVal:'English',
    postBrand:'Post a',postBrandEm:' Job',postSub:'Find the right person quickly',
    lT:'Job Title',lC:'Company / Your Name',lCat:'Category',lCi:'City',
    lSal:'Salary (₹)',lPer:'Period',lHr:'Working Hours',lDesc:'Description',
    lCon:'Contact Number',lOp:'Openings',
    postBtn:'Publish Job',postedSec:'Your Jobs',newJobSec:'New Job',
    cityTitle:'Select City',search:'Search jobs, companies…',
    showing:'Jobs',apply:'Apply',applied:'Applied',save:'Save',saved:'Saved',
    call:'Call',share:'Share',about:'About this role',reqs:'Requirements',
    hours:'Working Hours',cancel:'Cancel',submit:'Submit Application',
    notifNone:'No notifications yet.',
    emptyTitle:'No jobs yet',emptySub:'Jobs posted by employers will appear here.',
    emptySavedTitle:'No saved jobs',emptySavedSub:'Tap save on any job listing.',
    emptyAppliedTitle:'No applications yet',emptyAppliedSub:'Apply to jobs to track them here.',
  },
  ta:{
    onbSub:'தமிழ்நாட்டின் பகுதி நேர வேலை தளமாகும்',
    obName:'முழுப் பெயர்',obPhone:'தொலைபேசி',obCity:'நகரம்',obTypeLabel:'நான் ஒரு',
    obSeeker:'வேலை தேடுபவர்',obEmployer:'வேலை வழங்குபவர்',obBoth:'இரண்டும்',obStart:'தொடங்குங்கள் →',
    catAll:'அனைத்தும்',catDelivery:'டெலிவரி',catTeaching:'பயிற்றுவித்தல்',catComputer:'கணினி',catRetail:'சில்லறை',catServices:'சேவைகள்',catFood:'உணவு',
    distAny:'எந்த தூரமும்',dist5:'5 கிமீ வரை',dist10:'10 கிமீ வரை',dist20:'20 கிமீ வரை',dist50:'50 கிமீ வரை',
    tbFind:'உங்களுக்கு அருகில் வேலைகள்',locCta:'மாற்று',
    nFind:'வேலை தேடு',nPost:'வேலை போடு',nProfile:'சுயவிவரம்',
    langBtn:'English',langVal:'தமிழ்',
    postBrand:'வேலை',postBrandEm:' போடுங்கள்',postSub:'சரியான நபரை விரைவாக கண்டுபிடிக்கவும்',
    lT:'வேலை பெயர்',lC:'நிறுவனம் / உங்கள் பெயர்',lCat:'வகை',lCi:'நகரம்',
    lSal:'சம்பளம் (₹)',lPer:'காலம்',lHr:'வேலை நேரம்',lDesc:'விளக்கம்',
    lCon:'தொடர்பு எண்',lOp:'காலியிடங்கள்',
    postBtn:'வேலை வெளியிடு',postedSec:'உங்கள் வேலைகள்',newJobSec:'புதிய வேலை',
    cityTitle:'நகரத்தை தேர்ந்தெடுக்கவும்',search:'வேலைகள் தேடுங்கள்…',
    showing:'வேலைகள்',apply:'விண்ணப்பிக்கவும்',applied:'விண்ணப்பிக்கப்பட்டது',
    save:'சேமி',saved:'சேமிக்கப்பட்டது',
    call:'அழைக்கவும்',share:'பகிர்',about:'இந்த பணியைப் பற்றி',reqs:'தேவைகள்',
    hours:'வேலை நேரம்',cancel:'ரத்து செய்',submit:'விண்ணப்பம் அனுப்பு',
    notifNone:'அறிவிப்புகள் இல்லை.',
    emptyTitle:'வேலைகள் இல்லை',emptySub:'தொழில் வழங்குவோர் போட்ட வேலைகள் இங்கே தோன்றும்.',
    emptySavedTitle:'சேமிக்கப்பட்ட வேலைகள் இல்லை',emptySavedSub:'எந்த வேலையிலும் சேமி என்பதை தட்டவும்.',
    emptyAppliedTitle:'விண்ணப்பங்கள் இல்லை',emptyAppliedSub:'வேலைகளுக்கு விண்ணப்பித்து இங்கே கண்காணிக்கவும்.',
  }
};
function tx(k){return T[S.lang][k]||k;}

/* ══════════ BACKEND OTP ══════════ */
function getOtpPhone(){return (document.getElementById('otp-phone').value||'').trim();}
function showOtpStatus(msg,type){toast(msg,type||'info');}
function resetOtpUI(){
  var wrap=document.getElementById('otp-code-wrap');
  if(wrap)wrap.style.display='none';
  var code=document.getElementById('otp-code');
  if(code)code.value='';
}
async function sendOtp(){
  var phone=getOtpPhone();
  var normalized = normalizePhoneValue(phone);
  if(!normalized || !/^\+\d{10,15}$/.test(normalized)){
    showOtpStatus('Enter a valid mobile number with country code.', 'err');
    return;
  }
  try{
    await apiFetch(API_BASE + '/otp/request', { method:'POST', body: { phone: normalized } });
    document.getElementById('otp-code-wrap').style.display='block';
    showOtpStatus('OTP sent successfully. Check your phone.', 'ok');
  } catch(err){
    console.error(err);
    showOtpStatus(err.message || 'Could not send OTP.', 'err');
  }
}
async function verifyOtp(){
  var phone=getOtpPhone();
  var code=(document.getElementById('otp-code').value||'').trim();
  var normalized = normalizePhoneValue(phone);
  if(!normalized){showOtpStatus('Enter your mobile number.', 'err');return;}
  if(!/^\d{6}$/.test(code)){showOtpStatus('Enter the 6-digit OTP code.', 'err');return;}
  try{
    var result = await apiFetch(API_BASE + '/otp/verify', { method:'POST', body: { phone: normalized, code: code } });
    if(result && result.profile){
      S.profile = sanitizeProfile(result.profile);
      S.profileReady = true;
      S.city = S.profile.city || S.city || 'Madurai';
      lsSave();
      resetOtpUI();
      startApp();
      showOtpStatus('Logged in with mobile OTP.', 'ok');
      await loadJobs();
    } else {
      showOtpStatus('OTP verification failed.', 'err');
    }
  } catch(err){
    console.error(err);
    showOtpStatus(err.message || 'Invalid OTP. Please try again.', 'err');
  }
}

/* ══════════ INIT ══════════ */
document.addEventListener('DOMContentLoaded',async function(){
  populateCityDropdowns();
  resetOtpUI();
  await loadJobs();
  if(S.profileReady){startApp();}
  applyLang();
});

function populateCityDropdowns(){
  ['ob-city','f-city'].forEach(function(id){
    var el=document.getElementById(id);
    if(!el)return;
    CITIES.forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;el.appendChild(o);});
  });
  document.getElementById('ob-city').value='';
  document.getElementById('f-city').value=S.city||'Madurai';
}

function startApp(){
  document.getElementById('bnav').classList.add('show');
  showScreen('find');
  applyProfileToUI();
  updateNotifDot();
}

/* ══════════ SCREEN NAV ══════════ */
function showScreen(n){
  document.querySelectorAll('.sc').forEach(function(s){s.classList.remove('on');});
  document.querySelectorAll('.nav-btn').forEach(function(b){b.classList.remove('on');});
  document.getElementById('s-'+n).classList.add('on');
  var nb=document.getElementById('nav-'+n);if(nb)nb.classList.add('on');
  if(n==='find')renderJobs();
  if(n==='profile'){renderProfile();refreshEmpDash();}
  if(n==='post')refreshPostedSection();
  window.scrollTo(0,0);
}

/* ══════════ ONBOARDING ══════════ */
function obType(t){
  S.ob_type=t;
  ['seeker','employer','both'].forEach(function(x){
    document.getElementById('obt-'+x).classList.toggle('on',x===t);
  });
}
S.ob_type='seeker';

async function obSubmit(){
  var name=document.getElementById('ob-name').value.trim();
  var phone=document.getElementById('ob-phone').value.trim();
  var city=document.getElementById('ob-city').value;
  var ok=true;
  ['ob-name','ob-phone','ob-city'].forEach(function(id){document.getElementById(id).classList.remove('err');});
  if(!isValidName(name)){document.getElementById('ob-name').classList.add('err');ok=false;}
  if(!isValidPhone(phone)){document.getElementById('ob-phone').classList.add('err');ok=false;}
  if(!city){document.getElementById('ob-city').classList.add('err');ok=false;}
  if(!ok){toast('Please fix the highlighted fields','err');return;}
  var profile={name:name,phone:normalizePhoneValue(phone)||phone,email:'',skills:'',bio:'',city:city,userType:S.ob_type||'seeker'};
  try{
    var result = await saveProfile(profile);
    if(result && result.profile){
      S.profile = sanitizeProfile(result.profile);
    } else {
      S.profile = sanitizeProfile(profile);
    }
    S.city=city;S.profileReady=true;
    lsSave();
    startApp();
    setTimeout(function(){toast('Welcome, '+name.split(' ')[0]+'!','ok');},300);
  } catch(err){
    console.error(err);
    toast('Could not save profile. Please try again.','err');
  }
}

/* ══════════ JOBS — RENDER ══════════ */
function renderJobs(){
  var list=document.getElementById('jobs-list');
  var q=(document.getElementById('search-box').value||'').toLowerCase();
  var filtered=S.jobs.filter(function(j){
    if(S.cat!=='all'&&j.cat!==S.cat)return false;
    if(!S.location && S.city && j.city !== S.city) return false;
    if(S.radius>0&&j.dist>S.radius)return false;
    if(q&&j.title.toLowerCase().indexOf(q)<0&&j.company.toLowerCase().indexOf(q)<0)return false;
    return true;
  });
  document.getElementById('res-num').textContent=filtered.length+' '+tx('showing');
  document.getElementById('res-label').textContent=tx('showing');
  if(!filtered.length){
    list.innerHTML='<div class="empty"><div class="empty-line"></div><div class="empty-title">'+tx('emptyTitle')+'</div><div class="empty-sub">'+tx('emptySub')+'</div></div>';
    return;
  }
  list.innerHTML=filtered.map(function(j,i){
    var isApplied=!!S.applications[j.id];
    var isSaved=!!S.savedJobs[j.id];
    var bdg='';
    if(j.badge==='new')bdg='<div class="badge b-new">New</div>';
    else if(j.badge==='hot')bdg='<div class="badge b-hot">Hot</div>';
    else if(j.badge==='urgent')bdg='<div class="badge b-urgent">Urgent</div>';
    return '<div class="jcard" style="animation-delay:'+(i*.045)+'s" onclick="openDetail(\''+j.id+'\')">'+
      '<div class="jcard-top">'+
        avEl(j.company,40,'10px')+
        '<div class="jcard-body">'+
          '<div class="jcard-title">'+esc(j.title)+'</div>'+
          '<div class="jcard-co">'+esc(j.company)+'</div>'+
          '<div class="jcard-meta">'+
            '<span class="jcard-mi">'+esc(j.city)+' · '+j.dist+' km</span>'+
            (j.hours?'<span class="jcard-mi">'+esc(j.hours)+'</span>':'')+
            (j.openings?'<span class="jcard-mi">'+j.openings+' opening'+(j.openings!=1?'s':'')+'</span>':'')+
          '</div>'+
          (bdg?'<div style="margin-top:5px">'+bdg+'</div>':'')+
        '</div>'+
      '</div>'+
      '<div class="jcard-bot">'+
        '<div><div class="jcard-sal">₹'+fmtN(j.salary)+'</div><div class="jcard-per">'+j.period+'</div></div>'+
        '<div class="jcard-actions">'+
          '<button class="save-btn'+(isSaved?' saved':'')+'" onclick="event.stopPropagation();toggleSave(\''+j.id+'\',this)">'+(isSaved?'♥':'♡')+'</button>'+
          '<button class="apply-btn'+(isApplied?' done':'')+'" onclick="event.stopPropagation();'+(isApplied?'toast(\'Already applied\',\'info\')':'openApply(\''+j.id+'\')')+'">'+(isApplied?tx('applied'):tx('apply'))+'</button>'+
        '</div>'+
      '</div>'+
    '</div>';
  }).join('');
}

function onSearch(){renderJobs();}

/* ══════════ SEARCH SUGGESTIONS ══════════ */
var sugT=null;
function showSug(){
  clearTimeout(sugT);
  var q=(document.getElementById('search-box').value||'').toLowerCase();
  if(!q||!S.jobs.length){document.getElementById('sug-box').style.display='none';return;}
  var terms=[];
  S.jobs.forEach(function(j){
    if(j.title.toLowerCase().indexOf(q)>=0&&terms.indexOf(j.title)<0)terms.push(j.title);
    if(j.company.toLowerCase().indexOf(q)>=0&&terms.indexOf(j.company)<0)terms.push(j.company);
  });
  terms=terms.slice(0,4);
  var el=document.getElementById('sug-box');
  if(!terms.length){el.style.display='none';return;}
  el.innerHTML=terms.map(function(t){return '<div class="sug-item" onmousedown="pickSug(\''+t+'\')">'+esc(t)+'</div>';}).join('');
  el.style.display='block';
}
function hideSug(){sugT=setTimeout(function(){document.getElementById('sug-box').style.display='none';},200);}
function pickSug(v){document.getElementById('search-box').value=v;document.getElementById('sug-box').style.display='none';renderJobs();}

/* ══════════ FILTERS ══════════ */
function setCat(el){
  document.querySelectorAll('#cat-row .chip').forEach(function(c){c.classList.remove('on');});
  el.classList.add('on');S.cat=el.getAttribute('data-cat');renderJobs();
}
function setRad(el){
  document.querySelectorAll('.chips.sm .chip').forEach(function(c){c.classList.remove('on');});
  el.classList.add('on');S.radius=parseInt(el.getAttribute('data-km'))||0;renderJobs();
}

/* ══════════ SAVE ══════════ */
function toggleSave(id,btn){
  if(S.savedJobs[id]){delete S.savedJobs[id];btn.textContent='♡';btn.classList.remove('saved');toast(tx('save')+' removed','info');}
  else{S.savedJobs[id]=true;btn.textContent='♥';btn.classList.add('saved');toast(tx('saved'),'ok');}
  lsSave();updateStats();
}

/* ══════════ APPLY ══════════ */
function openApply(id){
  var j=getJob(id);if(!j)return;
  var sh=document.getElementById('apply-sheet');
  sh.innerHTML='<div class="sh"></div>'+
    '<div style="display:flex;gap:11px;align-items:center;margin-bottom:12px">'+
      avEl(j.company,42,'10px')+
      '<div><div style="font-size:15px;font-weight:800;letter-spacing:-.3px">'+esc(j.title)+'</div><div style="font-size:12px;color:var(--t2)">'+esc(j.company)+' · '+esc(j.city)+'</div></div>'+
    '</div>'+
    '<div class="apply-profile-box">'+
      '<div style="font-size:9px;font-weight:800;color:var(--t4);text-transform:uppercase;letter-spacing:.9px;margin-bottom:7px">Your Profile</div>'+
      '<div style="font-size:13px;font-weight:700">'+esc(S.profile.name)+'</div>'+
      '<div style="font-size:12px;color:var(--t2);margin-top:2px">'+esc(S.profile.phone)+'</div>'+
      (S.profile.skills?'<div style="font-size:11px;color:var(--t3);margin-top:4px">'+esc(S.profile.skills)+'</div>':'')+
    '</div>'+
    '<div class="fg" style="margin-bottom:12px"><label class="flabel">Cover Note (Optional)</label><textarea class="fi" id="apply-note" maxlength="300" placeholder="Why are you a good fit?" style="min-height:68px"></textarea></div>'+
    '<div style="display:flex;gap:8px">'+
      '<button class="btn-sec" style="flex:1" onclick="closeM(\'m-apply\')">'+tx('cancel')+'</button>'+
      '<button class="btn-primary" style="flex:2;margin-top:0" onclick="confirmApply(\''+id+'\')">'+tx('submit')+'</button>'+
    '</div>';
  document.getElementById('m-apply').classList.add('open');
}

function confirmApply(id){
  var j=getJob(id);if(!j)return;
  var note=(document.getElementById('apply-note')||{}).value||'';
  apiFetch(API_BASE + '/apply', { method:'POST', body: { jobId:id, phone:S.profile.phone, note:note } }).then(function(){
    S.applications[id]={status:'review',date:todayStr(),note:note};
    addNotif('Applied to '+j.title,'Your application was sent to '+j.company+'.','ok');
    lsSave();updateStats();renderJobs();
    document.getElementById('apply-sheet').innerHTML='<div class="sh"></div>'+ 
      '<div style="text-align:center;padding:28px 10px 10px">'+
        '<div style="font-size:48px;font-weight:800;color:var(--green);letter-spacing:-3px;margin-bottom:12px">✓</div>'+ 
        '<div style="font-size:17px;font-weight:800;letter-spacing:-.4px">Application Sent</div>'+ 
        '<div style="font-size:13px;color:var(--t2);margin-top:7px;line-height:1.65">'+esc(j.company)+' will contact you at <b>'+esc(S.profile.phone)+'</b>.</div>'+ 
        '<button class="btn-primary" style="margin-top:20px" onclick="closeM(\'m-apply\')">Done</button>'+ 
      '</div>';
  }).catch(function(err){
    console.error(err);
    toast(err.message || 'Could not submit application.', 'err');
  });
}
function openDetail(id){
  var j=getJob(id);if(!j)return;
  var safeTel=encodeURIComponent((j.contact||'').replace(/[^\d+]/g,''));
  var isApplied=!!S.applications[id];
  var isSaved=!!S.savedJobs[id];
  var tags=(j.tags||[]).map(function(t){return '<div class="det-tag">'+esc(t)+'</div>';}).join('');
  document.getElementById('detail-sheet').innerHTML=
    '<div class="sh"></div>'+
    '<div class="det-top">'+
      avEl(j.company,48,'11px')+
      '<div class="det-info"><div class="det-title">'+esc(j.title)+'</div><div class="det-co">'+esc(j.company)+' · '+esc(j.city)+'</div></div>'+
    '</div>'+
    '<div class="det-sal">₹'+fmtN(j.salary)+'</div>'+
    '<div class="det-per">'+j.period+' · '+j.dist+' km away · '+(j.openings||1)+' opening'+(j.openings!=1?'s':'')+'</div>'+
    '<div class="det-pills">'+
      (j.hours?'<div class="det-pill">'+esc(j.hours)+'</div>':'')+
      '<div class="det-pill">'+esc(j.city)+'</div>'+
      '<div class="det-pill">'+capFirst(j.cat)+'</div>'+
    '</div>'+
    (j.desc?'<div class="det-sec"><div class="det-sec-lbl">'+tx('about')+'</div><div class="det-desc">'+esc(j.desc)+'</div></div>':'')+
    (tags?'<div class="det-sec"><div class="det-sec-lbl">'+tx('reqs')+'</div><div class="det-tags">'+tags+'</div></div>':'')+
    '<div class="det-btns">'+
      '<button class="det-btn sec" id="det-save-btn" onclick="detToggleSave(\''+id+'\',this)">'+(isSaved?tx('saved'):tx('save'))+'</button>'+
      '<button class="det-btn '+(isApplied?'grn':'pri')+'" id="det-apply-btn" onclick="'+(isApplied?'':  'detApply(\''+id+'\')')+'">'+  (isApplied?'✓ '+tx('applied'):tx('apply'))+'</button>'+
    '</div>'+
    '<div style="margin-top:8px">'+
      '<button class="det-btn sec" style="width:100%" onclick="window.location.href=\'tel:'+safeTel+'\'">'+tx('call')+' — '+esc(j.contact)+'</button>'+
    '</div>';
  document.getElementById('m-detail').classList.add('open');
}

function detToggleSave(id,btn){
  if(S.savedJobs[id]){delete S.savedJobs[id];btn.textContent=tx('save');toast(tx('save')+' removed','info');}
  else{S.savedJobs[id]=true;btn.textContent=tx('saved');toast(tx('saved'),'ok');}
  lsSave();updateStats();renderJobs();
}
function detApply(id){closeM('m-detail');setTimeout(function(){openApply(id);},200);}

/* ══════════ POST JOB ══════════ */
function submitJob(){
  var req=['f-title','f-company','f-salary','f-contact'];
  var ok=true;
  req.forEach(function(id){document.getElementById(id).classList.remove('err');});
  var title=document.getElementById('f-title').value.trim();
  var company=document.getElementById('f-company').value.trim();
  var salary=document.getElementById('f-salary').value.trim();
  var contact=document.getElementById('f-contact').value.trim();
  if(!isValidName(title)){document.getElementById('f-title').classList.add('err');ok=false;}
  if(!isValidName(company)){document.getElementById('f-company').classList.add('err');ok=false;}
  if(!salary||Number(salary)<0){document.getElementById('f-salary').classList.add('err');ok=false;}
  if(!isValidPhone(contact)){document.getElementById('f-contact').classList.add('err');ok=false;}
  if(!ok){toast('Please fix the highlighted fields','err');return;}
  var btn=document.getElementById('post-btn');
  btn.disabled=true;
  document.getElementById('post-btn-txt').innerHTML='<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle"></span>';
setTimeout(async function(){
    var j={
      id:'j'+Date.now(),
      title:title,
      company:company,
      cat:document.getElementById('f-cat').value,
      city:document.getElementById('f-city').value||S.city,
      dist:0,
      lat:S.location && S.location.lat != null ? S.location.lat : null,
      lng:S.location && S.location.lng != null ? S.location.lng : null,
      salary:parseInt(salary,10)||0,
      period:document.getElementById('f-period').value,
      hours:document.getElementById('f-hours').value.trim(),
      desc:document.getElementById('f-desc').value.trim(),
      contact:contact,
      openings:parseInt(document.getElementById('f-openings').value)||1,
      badge:'new',tags:[],status:'active',
      postedAt:todayStr(),postedBy:S.profile.name,postedByPhone:S.profile.phone,applicants:0
    };
    if(j.lat != null && j.lng != null){
      j.dist = Math.round(calculateDistance(S.location.lat, S.location.lng, j.lat, j.lng) * 10) / 10;
    } else {
      j.dist = +(Math.random()*4+0.5).toFixed(1);
    }
    try{
      var result = await apiFetch(API_BASE + '/jobs', { method:'POST', body: j });
      if(result && result.job){
        S.jobs.unshift(result.job);
      } else {
        S.jobs.unshift(j);
      }
      addNotif('"'+j.title+'" posted','Your listing is now live and visible to job seekers.','ok');
      lsSave();
      ['f-title','f-company','f-hours','f-desc','f-contact'].forEach(function(id){document.getElementById(id).value='';});
      document.getElementById('f-salary').value='';document.getElementById('f-openings').value='1';
      document.getElementById('cc-desc').textContent='0 / 500';
      btn.disabled=false;document.getElementById('post-btn-txt').textContent=tx('postBtn');
      refreshPostedSection();toast(tx('postBtn')+' — live!','ok');
    } catch(err){
      console.error(err);
      btn.disabled=false;document.getElementById('post-btn-txt').textContent=tx('postBtn');
      toast(err.message || 'Could not post job.','err');
    }
  },900);
}

function refreshPostedSection(){
  var myJobs=S.jobs.filter(function(j){return j.postedBy===S.profile.name;});
  var sec=document.getElementById('my-jobs-sec');
  if(!myJobs.length){sec.style.display='none';return;}
  sec.style.display='block';
  document.getElementById('posted-sec-title').textContent=tx('postedSec');
  document.getElementById('new-job-title').textContent=tx('newJobSec');
  var list=document.getElementById('my-jobs-list');
  list.innerHTML=myJobs.slice(0,3).map(function(j){
    return '<div class="ai">'+
      avEl(j.company,36,'9px')+
      '<div class="ai-body">'+
        '<div class="ai-title">'+esc(j.title)+'</div>'+
        '<div class="ai-sub">'+j.applicants+' applicant'+(j.applicants!=1?'s':'')+' · '+j.postedAt+'</div>'+
        '<div class="ai-meta"><span class="pill '+(j.status==='active'?'p-active':'p-paused')+'">'+capFirst(j.status)+'</span></div>'+
      '</div>'+
      '<div class="ai-right">'+
        '<div class="ai-amt">₹'+fmtN(j.salary)+'</div>'+
        '<div class="ai-date">'+j.period+'</div>'+
        '<button class="ai-action" onclick="event.stopPropagation();toggleJobStatus(\''+j.id+'\',this)">'+(j.status==='active'?'Pause':'Resume')+'</button>'+
      '</div>'+
    '</div>';
  }).join('');
}

function toggleJobStatus(id,btn){
  var j=getJob(id);if(!j)return;
  j.status=j.status==='active'?'paused':'active';
  btn.textContent=j.status==='active'?'Pause':'Resume';
  lsSave();refreshPostedSection();refreshEmpDash();toast(j.status==='active'?'Job resumed':'Job paused','info');
}

/* ══════════ PROFILE ══════════ */
function applyProfileToUI(){
  var p=S.profile;
  var sz=56;
  document.getElementById('p-avatar-wrap').innerHTML=avEl(p.name||'?',sz,'14px');
  document.getElementById('p-name').textContent=p.name||'—';
  var rmap={seeker:'Job Seeker',employer:'Employer',both:'Job Seeker & Employer'};
  document.getElementById('p-role').textContent=rmap[p.userType]||'Job Seeker';
  var locLabel = S.location && S.location.label ? S.location.label : (S.city||p.city||'—') + ', Tamil Nadu';
  document.getElementById('p-loc-txt').textContent = locLabel;
  document.getElementById('p-phone').textContent=p.phone||'Not set';
  document.getElementById('p-email').textContent=p.email||'Not set';
  document.getElementById('p-skills').textContent=p.skills||'Not set';
  document.getElementById('p-city-disp').textContent=S.city||p.city||'—';
  document.getElementById('loc-city').textContent = S.location && S.location.label ? S.location.label : (S.city||'Madurai');
  updateStats();
  updateCompletion();
}

function renderProfile(){
  applyProfileToUI();renderAppliedList();renderSavedList();
}

function updateCompletion(){
  var p=S.profile;
  var steps=[
    {label:'Name',done:!!p.name},{label:'Phone',done:!!p.phone},
    {label:'Email',done:!!p.email},{label:'City',done:!!(S.city||p.city)},
    {label:'Skills',done:!!p.skills},{label:'Bio',done:!!p.bio},
    {label:'Applied',done:Object.keys(S.applications).length>0},
    {label:'Saved',done:Object.keys(S.savedJobs).length>0}
  ];
  var pct=Math.round(steps.filter(function(s){return s.done;}).length/steps.length*100);
  var el=document.getElementById('compl-pct');if(el)el.textContent=pct+'%';
  var bar=document.getElementById('compl-bar');if(bar)bar.style.width=pct+'%';
  var chips=document.getElementById('compl-steps');
  if(chips)chips.innerHTML=steps.map(function(s){return '<div class="cstep'+(s.done?' done':'')+'">'+s.label+'</div>';}).join('');
}

function updateStats(){
  var apps=Object.keys(S.applications);
  var interviews=apps.filter(function(id){return S.applications[id].status==='interview';}).length;
  var hired=apps.filter(function(id){return S.applications[id].status==='hired';}).length;
  txt('st-applied',apps.length);txt('st-interview',interviews);
  txt('st-hired',hired);txt('st-saved',Object.keys(S.savedJobs).length);
  txt('earn-jobs',hired);
}

function renderAppliedList(){
  var list=document.getElementById('applied-list');if(!list)return;
  var apps=Object.keys(S.applications).slice(0,3);
  if(!apps.length){list.innerHTML=emptyBlock(tx('emptyAppliedTitle'),tx('emptyAppliedSub'));return;}
  list.innerHTML=apps.map(function(id){return appItem(id);}).join('');
}

function renderSavedList(){
  var list=document.getElementById('saved-list');if(!list)return;
  var ids=Object.keys(S.savedJobs).slice(0,3);
  if(!ids.length){list.innerHTML=emptyBlock(tx('emptySavedTitle'),tx('emptySavedSub'));return;}
  list.innerHTML=ids.map(function(id){
    var j=getJob(id);if(!j)return '';
    return '<div class="ai" onclick="openDetail(\''+id+'\')">'+
      avEl(j.company,36,'9px')+
      '<div class="ai-body"><div class="ai-title">'+esc(j.title)+'</div><div class="ai-sub">'+esc(j.company)+' · '+j.dist+' km</div><div class="ai-meta"><span class="pill p-saved">Saved</span></div></div>'+
      '<div class="ai-right"><div class="ai-amt">₹'+fmtN(j.salary)+'</div><div class="ai-date">'+j.period+'</div></div>'+
    '</div>';
  }).join('');
}

function appItem(id){
  var j=getJob(id);if(!j)return '';
  var d=S.applications[id];var st=d.status||'review';
  var smap={review:'p-review',interview:'p-interview',hired:'p-hired',rejected:'p-rejected'};
  var slabel={review:'Under Review',interview:'Interview',hired:'Hired',rejected:'Rejected'};
  return '<div class="ai">'+
    avEl(j.company,36,'9px')+
    '<div class="ai-body"><div class="ai-title">'+esc(j.title)+'</div><div class="ai-sub">'+esc(j.company)+'</div><div class="ai-meta"><span class="pill '+smap[st]+'">'+slabel[st]+'</span></div></div>'+
    '<div class="ai-right"><div class="ai-amt">₹'+fmtN(j.salary)+'</div><div class="ai-date">'+d.date+'</div></div>'+
  '</div>';
}

/* ══════════ EMPLOYER DASH ══════════ */
function refreshEmpDash(){
  var myJobs=S.jobs.filter(function(j){return j.postedBy===S.profile.name;});
  var active=myJobs.filter(function(j){return j.status==='active';});
  var paused=myJobs.filter(function(j){return j.status==='paused';});
  var totalApps=myJobs.reduce(function(a,j){return a+j.applicants;},0);
  txt('emp-posted',myJobs.length);txt('emp-active',active.length);
  txt('emp-apps',totalApps);txt('emp-paused',paused.length);
  // Employer completion
  var p=S.profile;
  var esteps=[
    {label:'Name',done:!!p.name},{label:'Phone',done:!!p.phone},
    {label:'City',done:!!(S.city||p.city)},{label:'Email',done:!!p.email},
    {label:'Skills',done:!!p.skills},{label:'Job Posted',done:myJobs.length>0}
  ];
  var epct=Math.round(esteps.filter(function(s){return s.done;}).length/esteps.length*100);
  txt('emp-pct',epct+'%');
  var eb=document.getElementById('emp-bar');if(eb)eb.style.width=epct+'%';
  var es=document.getElementById('emp-steps');
  if(es)es.innerHTML=esteps.map(function(s){return '<div class="cstep'+(s.done?' done':'')+'">'+s.label+'</div>';}).join('');
  var empList=document.getElementById('emp-list');
  if(!empList)return;
  if(!myJobs.length){empList.innerHTML=emptyBlock('No jobs posted','Post your first job above.');return;}
  empList.innerHTML=myJobs.slice(0,5).map(function(j){
    return '<div class="ai">'+
      avEl(j.company,36,'9px')+
      '<div class="ai-body"><div class="ai-title">'+esc(j.title)+'</div><div class="ai-sub">'+j.applicants+' applicant'+(j.applicants!=1?'s':'')+' · '+j.postedAt+'</div><div class="ai-meta"><span class="pill '+(j.status==='active'?'p-active':'p-paused')+'">'+capFirst(j.status)+'</span></div></div>'+
      '<div class="ai-right"><div class="ai-amt">₹'+fmtN(j.salary)+j.period+'</div><button class="ai-action" onclick="event.stopPropagation();toggleJobStatus(\''+j.id+'\',this)">'+(j.status==='active'?'Pause':'Resume')+'</button></div>'+
    '</div>';
  }).join('');
}

/* ══════════ EDIT PROFILE ══════════ */
function openEditModal(){
  var p=S.profile;
  document.getElementById('ep-name').value=p.name||'';
  document.getElementById('ep-phone').value=p.phone||'';
  document.getElementById('ep-email').value=p.email||'';
  document.getElementById('ep-skills').value=p.skills||'';
  document.getElementById('ep-bio').value=p.bio||'';
  charCount(document.getElementById('ep-bio'),'bio-cc',200);
  document.getElementById('m-edit').classList.add('open');
}
function saveProfile(){
  var p=S.profile;
  var n=document.getElementById('ep-name').value.trim();
  var phone=document.getElementById('ep-phone').value.trim();
  var email=document.getElementById('ep-email').value.trim();
  if(!isValidName(n)){toast('Please enter a valid name','err');document.getElementById('ep-name').classList.add('err');return;}
  if(phone&&!isValidPhone(phone)){toast('Please enter a valid phone number','err');document.getElementById('ep-phone').classList.add('err');return;}
  if(email&&!isValidEmail(email)){toast('Please enter a valid email address','err');document.getElementById('ep-email').classList.add('err');return;}
  if(n)p.name=n;
  p.phone=phone||p.phone;
  p.email=email;
  p.skills=document.getElementById('ep-skills').value.trim();
  p.bio=document.getElementById('ep-bio').value.trim();
  p.city=S.city||p.city;
  S.profileReady=true;
  lsSave();applyProfileToUI();closeM('m-edit');toast('Profile saved','ok');
}

/* ══════════ CITY MODAL ══════════ */
function openCityModal(){
  document.getElementById('city-search').value='';
  document.getElementById('city-title').textContent=tx('cityTitle');
  renderCityGrid();
  document.getElementById('m-city').classList.add('open');
}
function renderCityGrid(){
  var q=(document.getElementById('city-search').value||'').toLowerCase();
  var list=CITIES.filter(function(c){return !q||c.toLowerCase().indexOf(q)>=0;});
  document.getElementById('city-grid').innerHTML=list.map(function(c){
    return '<button class="city-btn'+(c===S.city?' sel':'')+'" onclick="pickCity(\''+c+'\')">'+c+'</button>';
  }).join('');
}
function pickCity(c){
  S.city=c;S.profile.city=c;lsSave();
  txt('loc-city',c);txt('p-loc-txt',c+', Tamil Nadu');txt('p-city-disp',c);
  document.getElementById('f-city').value=c;
  closeM('m-city');renderJobs();
}

/* ══════════ NOTIFICATIONS ══════════ */
function addNotif(title,sub,type){
  S.notifs.unshift({id:Date.now(),title:title,sub:sub,type:type,time:'Just now',unread:true});
  updateNotifDot();lsSave();
}
function updateNotifDot(){
  var n=S.notifs.filter(function(x){return x.unread;}).length;
  var dot=document.getElementById('notif-dot');if(dot)dot.style.display=n?'block':'none';
}
function openNotif(){
  var list=document.getElementById('notif-list');
  if(!list)return;
  if(!S.notifs.length){list.innerHTML='<div class="empty" style="padding:32px 20px"><div class="empty-line"></div><div class="empty-sub">'+tx('notifNone')+'</div></div>';}
  else{list.innerHTML=S.notifs.map(function(n){
    return '<div class="notif-item'+(n.unread?' unread':'')+'" onclick="closeM(\'m-notif\')">'+
      avEl(n.title,34,'9px')+
      '<div class="notif-body"><div class="notif-title">'+esc(n.title)+'</div><div class="notif-sub">'+esc(n.sub)+'</div><div class="notif-time">'+esc(n.time)+'</div></div>'+
    '</div>';
  }).join('');}
  S.notifs.forEach(function(n){n.unread=false;});
  lsSave();updateNotifDot();
  document.getElementById('m-notif').classList.add('open');
}

/* ══════════ APPLIED MODAL ══════════ */
function openAppliedSheet(){
  renderAppliedModal('all');
  document.getElementById('m-applied').classList.add('open');
}
function applyTab(filter,el){
  document.querySelectorAll('#m-applied .tab').forEach(function(t){t.classList.remove('on');});
  el.classList.add('on');renderAppliedModal(filter);
}
function renderAppliedModal(filter){
  var ids=Object.keys(S.applications);
  if(filter!=='all')ids=ids.filter(function(id){return S.applications[id].status===filter;});
  var list=document.getElementById('applied-modal-list');
  if(!ids.length){list.innerHTML=emptyBlock(tx('emptyAppliedTitle'),'');return;}
  list.innerHTML='<div class="act-list">'+ids.map(function(id){return appItem(id);}).join('')+'</div>';
}

/* ══════════ MODE TOGGLE ══════════ */
function switchMode(mode){
  var sk=mode==='seeker';
  document.getElementById('m-seeker').classList.toggle('on',sk);
  document.getElementById('m-employer').classList.toggle('on',!sk);
  document.getElementById('dash-seeker').style.display=sk?'block':'none';
  document.getElementById('dash-employer').style.display=sk?'none':'block';
  if(!sk)refreshEmpDash();
}

/* ══════════ LANG ══════════ */
function toggleLang(){S.lang=S.lang==='en'?'ta':'en';applyLang();lsSave();renderJobs();if(document.getElementById('s-profile').classList.contains('on'))renderProfile();}
function applyLang(){
  var ta=S.lang==='ta';
  function s(id,k){var e=document.getElementById(id);if(!e)return;e.textContent=tx(k);
    e.className=e.className.replace(/ tamil/g,'')+(ta?' tamil':'');}
  document.querySelectorAll('[data-i18n]').forEach(function(el){var k=el.getAttribute('data-i18n');if(k&&tx(k))el.textContent=tx(k);});
  s('tb-sub-find','tbFind');
  s('loc-cta','locCta');
  ['lbtn','lbtn2'].forEach(function(id){s(id,'langBtn');});
  s('nlbl-find','nFind');s('nlbl-post','nPost');s('nlbl-profile','nProfile');
  s('lang-disp','langVal');
  s('lbl-t','lT');s('lbl-c','lC');s('lbl-cat','lCat');s('lbl-ci','lCi');
  s('lbl-sal','lSal');s('lbl-per','lPer');s('lbl-hr','lHr');s('lbl-desc','lDesc');
  s('lbl-con','lCon');s('lbl-op','lOp');
  s('post-btn-txt','postBtn');
  s('posted-sec-title','postedSec');s('new-job-title','newJobSec');
  s('city-title','cityTitle');
  var sb=document.getElementById('search-box');if(sb)sb.placeholder=tx('search');
  var pb=document.getElementById('post-brand');
  if(pb)pb.innerHTML=tx('postBrand')+'<em>'+tx('postBrandEm')+'</em>';
  s('tb-sub-post','postSub');
}

/* ══════════ NOTIF TOGGLE ══════════ */
function toggleNotif(){
  S.notif=!S.notif;
  var t=document.getElementById('sw-track');if(t)t.className='sw-track'+(S.notif?'':' off');
  var th=document.getElementById('sw-thumb');if(th)th.className='sw-thumb'+(S.notif?'':' off');
  lsSave();
  toast(S.notif?'Notifications on':'Notifications off','info');
}

/* ══════════ LOGOUT ══════════ */
function logOut(){if(!confirm('Log out?'))return;localStorage.removeItem(SK);location.reload();}

/* ══════════ OVERLAY ══════════ */
function closeM(id){document.getElementById(id).classList.remove('open');}
function onOverlay(e,id){if(e.target===document.getElementById(id))closeM(id);}

/* ══════════ TOAST ══════════ */
var _tt=null;
function toast(msg,type){
  var el=document.getElementById('toast');
  el.textContent=msg;el.className='toast show '+(type||'ok');
  clearTimeout(_tt);_tt=setTimeout(function(){el.classList.remove('show');},2600);
}

/* ══════════ HELPERS ══════════ */
function txt(id,v){var e=document.getElementById(id);if(e)e.textContent=v;}
function esc(s){var d=document.createElement('div');d.textContent=s||'';return d.innerHTML;}
function isValidName(v){return /^[A-Za-zÀ-ÿ\u0B80-\u0BFF\s.'-]{2,60}$/.test((v||'').trim());}
function isValidPhone(v){return /^\+?[0-9\s()-]{10,15}$/.test((v||'').trim());}
function isValidEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v||'').trim());}
function fmtN(n){return (n||0).toLocaleString('en-IN');}
function capFirst(s){return (s||'').charAt(0).toUpperCase()+(s||'').slice(1);}
function todayStr(){return new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});}
function charCount(el,ccId,max){var l=el.value.length;var cc=document.getElementById(ccId);if(!cc)return;cc.textContent=l+' / '+max;cc.className='cc'+(l>max*.8?' warn':'')+(l>=max?' over':'');}
function getJob(id){return S.jobs.find(function(j){return j.id==id;});}
function emptyBlock(title,sub){return '<div class="empty" style="padding:28px 20px"><div class="empty-line"></div><div class="empty-title">'+esc(title)+'</div><div class="empty-sub">'+esc(sub)+'</div></div>';}