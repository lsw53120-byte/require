(() => {
  const key='hangul-world-rpg-progress-v1';
  const note=document.querySelector('.note'); if(note)note.remove();
  const start=document.getElementById('start');
  const home=document.createElement('button');home.className='secondary';home.textContent='🏠 메인 화면';home.hidden=true;
  home.style.cssText='font-size:14px;padding:8px 12px;margin:8px auto';
  document.querySelector('.panel').prepend(home);
  let stored=null;
  try { stored=JSON.parse(localStorage.getItem(key)||'null'); } catch (_) {}
  const valid=s=>s&&s.version===1&&Number.isInteger(s.journey)&&s.journey>=0&&Number.isInteger(s.level)&&s.level>=0&&s.level<8&&Number.isInteger(s.stars)&&s.stars>=0&&Number.isInteger(s.energy)&&s.energy>=0&&s.energy<=3&&Array.isArray(s.levels)&&s.levels.length===8&&s.levels.every(p=>p&&typeof p.question==='string'&&typeof p.answer==='string');
  if(!valid(stored))stored=null;
  if(stored){
    start.textContent='🚂 이어서 모험하기';
    const destination=destinations[stored.journey%destinations.length];
    worldChip.textContent='Lv.'+(stored.journey+1)+' '+destination.landmark+' '+destination.country+' · 난이도 '+(Math.min(stored.journey,4)+1);
    $('stageCount').textContent='🌍 '+(stored.level+1)+' / '+stored.levels.length;
    $('stars').textContent='⭐ '+stored.stars;
    energyChip.textContent='에너지 '+'❤️'.repeat(stored.energy)+'🤍'.repeat(3-stored.energy);
  }
  let active=false;
  function save(){
    if(!active||state==='ready')return;
    try {localStorage.setItem(key,JSON.stringify({version:1,journey,level,stars,energy,state,levels,completed:[...completedLevels]}));return true;}
    catch(_){$('feedback').textContent='이 기기에서 기록을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.';return false;}
  }
  home.onclick=()=>{if(save())location.reload()};
  const oldSetState=setState;setState=function(s){oldSetState(s);queueMicrotask(save)};
  document.addEventListener('click',()=>queueMicrotask(save));
  const originalStart=start.onclick;
  start.onclick=()=>{
    active=true;
    home.hidden=false;
    if(!stored){originalStart();return}
    const data=stored;stored=null;journey=data.journey;level=data.level;stars=data.stars;energy=data.energy;completedLevels=new Set(data.completed||[]);
    levels.splice(0,levels.length,...data.levels);worldChip.textContent='Lv.'+(journey+1)+' '+destinations[journey%destinations.length].landmark+' '+destinations[journey%destinations.length].country+' · 난이도 '+(Math.min(journey,4)+1);
    $('stars').textContent='⭐ '+stars;showEnergy();
    if(energy===0){level=Math.max(0,level-1);energy=3;showEnergy();}
    if(data.state==='victory'){
      setState('victory');$('stageCount').textContent='🌍 '+(level+1)+' / '+levels.length;$('banner').textContent='⭐ 모험을 이어가요!';$('story').textContent='이전 미션을 완료했어요. 다음 모험을 떠나요!';$('controls').replaceChildren();
      if(level<levels.length-1){$('controls').appendChild(button('다음 지역으로 🚂','primary',()=>{level++;begin()}))}
      else {$('controls').appendChild(button('레벨 업! 다음 나라로 🚂','primary',()=>{journey++;level=0;energy=3;showEnergy();completedLevels.clear();applyDestination();begin()}))}
    }else begin();
  };
  if('serviceWorker' in navigator && location.protocol.startsWith('http')){
    navigator.serviceWorker.register('../service-worker.js',{scope:'../'}).catch(()=>{});
  }
  let installPrompt=null;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;install.hidden=false});
  window.addEventListener('appinstalled',()=>{install.hidden=true;installPrompt=null});
  const install=document.createElement('button');install.className='secondary';install.textContent='📲 앱으로 설치';install.hidden=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  install.style.cssText='margin:14px auto;font-size:15px';
  install.onclick=async()=>{if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice}else{alert(/iphone|ipad|ipod/i.test(navigator.userAgent)?'Safari에서 공유 버튼을 누른 뒤 홈 화면에 추가를 선택해 주세요.':'브라우저 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택해 주세요.')}};
  document.querySelector('main').appendChild(install);
})();
