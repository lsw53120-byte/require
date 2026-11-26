(() => {
  const consonants = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const fullConsonants = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const syllables = ['가','나','다','라','마','바','사','아','자','차','카','타','파','하'];
  const words = [['🍎','사과'],['🐰','토끼'],['🐟','물고기'],['🍌','바나나'],['🌳','나무'],['🐶','강아지'],['🚗','자동차'],['☁️','구름'],['🌙','달'],['🐱','고양이'],['🍇','포도'],['🦋','나비'],['🍓','딸기'],['🐘','코끼리'],['🌻','해바라기'],['🐢','거북이'],['🍉','수박'],['🐝','벌'],['🌈','무지개'],['🐣','병아리']];
  const vowels = ['ㅏ','ㅓ','ㅗ','ㅜ','ㅡ','ㅣ'];
  const base = [0,2,3,5,6,7,9,11,12,14,15,16,17,18];
  const vowelIndex = [0,4,8,13,18,20];
  const compose = (c,v) => String.fromCharCode(0xac00+(base[c]*21+vowelIndex[v])*28);
  const allSyllables = Array.from({length:14},(_,c)=>Array.from({length:6},(_,v)=>compose(c,v))).flat();
  const shuffle = a => {const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;};
  let mode = 0, activeMode = 0, index = 0, locked = false, current = null, order = [], mixSequence = [], mixOrders = {}, nextTimer = null;
  let stars = Number(localStorage.getItem('soriStars') || 0);
  let journeyStep = Number(localStorage.getItem('soriJourneyStep') || 0), travelling = false, travelTimer = 0;
  const zone = document.querySelector('#playZone'), card = zone.querySelector('.play-card');
  const worldStage = document.querySelector('#worldStage');
  const worldTitle = document.querySelector('#worldTitle');
  const worldNote = document.querySelector('#worldNote');
  const travelTag = document.querySelector('#travelTag');
  const travelStatus = document.querySelector('#travelStatus');
  const destinationSign = document.querySelector('#destination');
  const enemy3d = document.querySelector('#enemy3d');
  const enemyFace = document.querySelector('#enemyFace');
  const enemyName = document.querySelector('#enemyName');
  const enemyHpBar = document.querySelector('#enemyHp');
  const enemyHpText = document.querySelector('#enemyHpText');
  const battleMessage = document.querySelector('#battleMessage');
  const damagePop = document.querySelector('#damagePop');
  const monsterMaxHp = 5;
  let monsterHp = monsterMaxHp;
  const path = document.querySelector('.path');
  const buttons = [...document.querySelectorAll('.level')];
  for (let i=3;i<9;i++) { const b=document.createElement('button'); b.className='level'; path.appendChild(b); buttons.push(b); }
  const stats = document.querySelector('.stats');
  const progress = document.querySelector('.section-head > span');
  const meter = document.querySelector('#meter');
  const labels = [['🔊','소리 찾기'],['🧩','글자 만들기'],['🎨','그림 낱말'],['✍️','따라 쓰기'],['🎲','랜덤 읽기'],['👂','소리 탐정'],['🚂','낱말 기차'],['🎁','빈칸 보물'],['🌈','오늘의 모험']];
  const journeyStops = [
    {country:'대한민국',name:'서울',icon:'🇰🇷',monster:'👾',monsterName:'김치 도둑 몽글',monsterColor:'#8758d8',monsterLight:'#e6d6ff',monsterDark:'#483078',gameMode:0,line:'김밥과 한복 낱말의 첫소리를 찾아요!',words:[['🥁','북소리'],['🍙','김밥'],['🧦','버선'],['🏠','한옥'],['🥬🫙','김치'],['👘','한복'],['🪁','연날리기'],['🍲','떡국']]},
    {country:'일본',name:'도쿄',icon:'🇯🇵',monster:'👹',monsterName:'벚꽃 몬스터',monsterColor:'#e96b81',monsterLight:'#ffd5dd',monsterDark:'#984056',gameMode:2,line:'그림을 보고 일본의 낱말을 찾아요!',words:[['🍣','초밥'],['🌸','벚꽃'],['🗻','후지산'],['🚄','신칸센'],['🐱','고양이'],['🍜','라면'],['🎏','잉어깃발'],['🥢','젓가락']]},
    {country:'프랑스',name:'파리',icon:'🇫🇷',monster:'👻',monsterName:'빵집 유령',monsterColor:'#5da9db',monsterLight:'#d8f3ff',monsterDark:'#315d92',gameMode:3,line:'천천히 손가락으로 글자를 따라 써요!',words:[['🥐','크루아상'],['🧀','치즈'],['🗼','에펠탑'],['🌹','장미'],['🍇','포도'],['🎨','그림'],['🎩','모자'],['🚲','자전거']]},
    {country:'이탈리아',name:'로마',icon:'🇮🇹',monster:'🐉',monsterName:'파스타 슬라임',monsterColor:'#e8924e',monsterLight:'#ffe0a8',monsterDark:'#925126',gameMode:6,line:'낱말 기차에 글자를 차례로 태워요!',words:[['🍕','피자'],['🍝','파스타'],['🍦','젤라토'],['🚤','곤돌라'],['🏛️','콜로세움'],['🍅','토마토'],['🎭','가면'],['🎶','오페라']]},
    {country:'이집트',name:'카이로',icon:'🇪🇬',monster:'🦂',monsterName:'모래 몬스터',monsterColor:'#c99a43',monsterLight:'#ffedb3',monsterDark:'#7c5527',gameMode:5,line:'소리를 듣고 사막의 글자 보물을 찾아요!',words:[['🐪','낙타'],['🏜️','사막'],['🔺','피라미드'],['🏞️','나일강'],['🐈','고양이'],['☀️','태양'],['🪲','풍뎅이'],['🪨','돌기둥']]},
    {country:'브라질',name:'리우',icon:'🇧🇷',monster:'🐸',monsterName:'리듬 몬스터',monsterColor:'#38a877',monsterLight:'#caffad',monsterDark:'#205d47',gameMode:7,line:'낱말의 마지막 글자를 채워 축제를 열어요!',words:[['⚽','축구'],['🦜','앵무새'],['🌴','야자수'],['🥁','북소리'],['🌊','바다'],['🐒','원숭이'],['🌳','열대숲'],['🎉','축제']]},
    {country:'캐나다',name:'밴쿠버',icon:'🇨🇦',monster:'🐻‍❄️',monsterName:'눈꽃 몬스터',monsterColor:'#55a9c3',monsterLight:'#d9faff',monsterDark:'#356c92',gameMode:4,line:'새로운 글자를 소리 내어 읽어봐요!',words:[['🍁','단풍잎'],['🐻','북극곰'],['🛶','카누'],['⛄','눈사람'],['🦫','비버'],['🐋','고래'],['🛷','썰매'],['🏞️','호수']]},
    {country:'호주',name:'시드니',icon:'🇦🇺',monster:'🦖',monsterName:'산호 몬스터',monsterColor:'#65ad68',monsterLight:'#dbffab',monsterDark:'#3b704a',gameMode:1,line:'자음과 모음을 합쳐 글자를 만들어요!',words:[['🐨','코알라'],['🦘','캥거루'],['🐊','악어'],['🪸','산호초'],['🐑','양털'],['⭐','별빛'],['🌊','바다'],['🏖️','해변']]}
  ];
  buttons.forEach((b,i) => {
    b.className = 'level' + (i===0?' current':'');
    b.innerHTML = '<span class="level-icon l'+(i%3+1)+'">'+labels[i][0]+'</span><b>'+labels[i][1]+'</b><small>자유롭게 놀기</small>';
    b.onclick = () => start(i);
  });
  document.querySelector('.avatar span:last-child').textContent='소리섬 탐험대';
  document.querySelector('.mission b').textContent=' 나라별 한글 미션을 완료해요';
  document.querySelector('.quest p').textContent='미션을 마칠 때마다 다른 나라로 떠나요!';
  function resetMonster(){monsterHp=monsterMaxHp;enemy3d.classList.remove('hit','defeated');enemyHpBar.style.width='100%';enemyHpText.textContent=monsterHp+' / '+monsterMaxHp;battleMessage.textContent='정답을 맞히면 몬스터가 데미지를 입어요!';damagePop.classList.remove('show');}
  function damageMonster(){if(monsterHp<=0)resetMonster();monsterHp=Math.max(0,monsterHp-1);enemyHpBar.style.width=(monsterHp/monsterMaxHp*100)+'%';enemyHpText.textContent=monsterHp+' / '+monsterMaxHp;enemy3d.classList.remove('hit');void enemy3d.offsetWidth;enemy3d.classList.add('hit');damagePop.classList.remove('show');void damagePop.offsetWidth;damagePop.textContent='💥 −1';damagePop.classList.add('show');if(monsterHp===0){enemy3d.classList.add('defeated');battleMessage.textContent=enemyName.textContent+' 퇴치! 보너스 별 2개 ⭐⭐';stars+=2;localStorage.setItem('soriStars',String(stars));update();}else{battleMessage.textContent='명중! 몬스터 에너지가 줄었어요!';}}
  function paintWorld(){const stop=journeyStops[journeyStep%journeyStops.length];travelTag.textContent='🧭 세계 여행 '+(journeyStep+1)+' · '+stop.country;worldTitle.textContent=journeyStep?stop.country+' '+stop.name+'에 도착했어요!':stop.country+'에서 출발해요!';worldNote.textContent=stop.line;destinationSign.textContent=stop.icon+' '+stop.name;travelStatus.textContent=journeyStep?stop.icon+' '+stop.country+' 한글 미션 · 별 '+stars+'개':'나라별 한글 미션을 시작해요!';enemyFace.textContent=stop.monster;enemyName.textContent=stop.monsterName;document.documentElement.style.setProperty('--monster-color',stop.monsterColor);document.documentElement.style.setProperty('--monster-light',stop.monsterLight);document.documentElement.style.setProperty('--monster-dark',stop.monsterDark);resetMonster();}
  paintWorld();
  document.querySelector('#start').onclick=()=>start(journeyStops[journeyStep%journeyStops.length].gameMode);
  const voiceMapScript = document.createElement('script');
  voiceMapScript.src = 'audio/voice-map.js';
  document.head.appendChild(voiceMapScript);
  const recordedVoice = new Audio('audio/voice.mp3');
  recordedVoice.preload = 'metadata';
  let speechToken = 0, clipEnd = 0, clipTimer = 0, clipSeekTimer = 0;
  function stopSpeech() {
    speechToken++;
    clearInterval(clipTimer);
    clearTimeout(clipSeekTimer);
    recordedVoice.onseeked = null;
    recordedVoice.pause();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
  function speakRecording(text, token) {
    if (token !== speechToken) return;
    const clip = window.SORI_VOICE_MAP && window.SORI_VOICE_MAP[text];
    if (!clip) {
      const feedback = card.querySelector('.feedback');
      if (feedback) feedback.textContent = '이 글자의 녹음 음성이 없어요. 휴대폰 한국어 음성을 확인해 주세요.';
      return;
    }
    let started = false;
    const startClip = () => {
      if (started || token !== speechToken) return;
      started = true;
      recordedVoice.onseeked = null;
      clearTimeout(clipSeekTimer);
      clipEnd = clip[0] + clip[1];
      const play = recordedVoice.play();
      clipTimer = setInterval(() => {
        if (token !== speechToken || recordedVoice.currentTime >= clipEnd) {
          recordedVoice.pause(); clearInterval(clipTimer);
        }
      }, 40);
      if (play && play.catch) play.catch(() => {
        clearInterval(clipTimer);
        if (token === speechToken) {
          const feedback = card.querySelector('.feedback');
          if (feedback) feedback.textContent = '음성을 재생하지 못했어요. 소리 듣기를 다시 눌러 주세요.';
        }
      });
    };
    try {
      recordedVoice.pause();
      const alreadyThere = recordedVoice.readyState >= 2 && Math.abs(recordedVoice.currentTime - clip[0]) < .02;
      recordedVoice.onseeked = startClip;
      if (alreadyThere) startClip();
      else recordedVoice.currentTime = clip[0];
      clipSeekTimer = setTimeout(() => {
        if (!started && token === speechToken) {
          recordedVoice.onseeked = null;
          const feedback = card.querySelector('.feedback');
          if (feedback) feedback.textContent = '음성을 불러오지 못했어요. 다시 눌러 주세요.';
        }
      }, 3500);
    } catch (_) {
      recordedVoice.onseeked = null;
      clearTimeout(clipSeekTimer);
      const feedback = card.querySelector('.feedback');
      if (feedback) feedback.textContent = '음성을 재생하지 못했어요. 다시 눌러 주세요.';
    }
  }
  let koreanVoiceCache = [];
  function refreshKoreanVoices() {
    if (!('speechSynthesis' in window)) return;
    const voices = speechSynthesis.getVoices();
    koreanVoiceCache = voices.filter(v => /^ko(?:[-_]|$)/i.test(v.lang));
  }
  if ('speechSynthesis' in window) {
    refreshKoreanVoices();
    speechSynthesis.addEventListener?.('voiceschanged', refreshKoreanVoices);
  }
  function speak(value) {
    stopSpeech();
    const token = speechToken;
    const text = String(value).trim();
    if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
      refreshKoreanVoices();
      const synth = window.speechSynthesis;
      const korean = koreanVoiceCache.find(v => /^ko[-_]kr$/i.test(v.lang) && /google/i.test(v.name))
        || koreanVoiceCache.find(v => /^ko[-_]kr$/i.test(v.lang))
        || koreanVoiceCache[0];
      if (korean) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ko-KR'; u.voice = korean; u.rate = .9; u.pitch = 1; u.volume = 1;
        u.onerror = () => { if (token === speechToken) speakRecording(text, token); };
        try { synth.speak(u); return; } catch (_) { /* Try the recorded voice below. */ }
      }
      const hasRecordedWord = !!(window.SORI_VOICE_MAP && window.SORI_VOICE_MAP[text]);
      if (!hasRecordedWord) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ko-KR'; u.rate = .9; u.pitch = 1; u.volume = 1;
        u.onerror = () => { if (token === speechToken) speakRecording(text, token); };
        try { synth.speak(u); return; } catch (_) { /* Show the audio fallback message below. */ }
      }
    }
    speakRecording(text, token);
  }
  function update() {
    stats.innerHTML='<span class="stat">⭐ '+stars+'</span><span class="stat">🎮 자유 놀이</span>';
    progress.textContent=journeyStops[journeyStep%journeyStops.length].country+' · '+Math.min(index+1,limit())+' / '+limit();
    meter.style.width=Math.min(100,index/limit()*100)+'%';
    buttons.forEach((b,i)=>b.classList.toggle('current',i===mode));
  }
  function poolSize(which){const count=journeyStops[journeyStep%journeyStops.length].words.length;return [count,84,count,14,allSyllables.length,allSyllables.length,count,count][which]||0;}
  function limit(){return mode===8?mixSequence.length:poolSize(mode);}
  function start(which){clearTimeout(nextTimer);clearTimeout(travelTimer);travelling=false;worldStage.classList.remove('traveling','arrived');stopSpeech();resetMonster();mode=which;index=0;locked=false;activeMode=which;if(mode===8){mixSequence=shuffle([0,1,2,3,4,5,6,7]);mixOrders={};for(let m=0;m<8;m++)mixOrders[m]=shuffle(Array.from({length:poolSize(m)},(_,i)=>i));}const pool=mode===8?mixSequence.length:poolSize(mode);order=shuffle(Array.from({length:pool},(_,i)=>i));render();zone.scrollIntoView({behavior:'smooth',block:'start'});}
  function beginJourney(){if(travelling)return;travelling=true;const nextStep=journeyStep+1,stop=journeyStops[nextStep%journeyStops.length];worldStage.classList.remove('arrived');worldStage.classList.add('traveling');travelTag.textContent='🚩 다음 나라 · '+stop.country;worldTitle.textContent='다음 나라로 출발해요!';worldNote.textContent=stop.icon+' '+stop.country+' '+stop.name+'으로 떠나요!';destinationSign.textContent='→ '+stop.name;travelStatus.textContent='🧳 여권을 챙기고 출발!';travelTimer=setTimeout(()=>{worldStage.classList.remove('traveling');worldStage.classList.add('arrived');journeyStep=nextStep;localStorage.setItem('soriJourneyStep',String(journeyStep));paintWorld();travelStatus.textContent='🎉 '+stop.country+' 도착! '+labels[stop.gameMode][1]+' 미션을 해봐요!';travelTimer=setTimeout(()=>{travelling=false;start(stop.gameMode);},1100);},1850);}
  function makeQuestion(){
    activeMode=mode===8?mixSequence[index]:mode;
    const n=mode===8?mixOrders[activeMode].pop():(order[index] ?? index);
    const travelStop=journeyStops[journeyStep%journeyStops.length], countryWords=travelStop.words;
    if(activeMode===0){const [emoji,word]=countryWords[n];const firstIndex=Math.floor((word.charCodeAt(0)-0xac00)/588),answer=fullConsonants[firstIndex]||'ㅇ';return {title:travelStop.country+' 첫소리를 찾아요!',display:emoji,sound:word,answer,options:shuffle([answer,...shuffle(fullConsonants.filter(x=>x!==answer)).slice(0,2)])};}
    if(activeMode===1){const c=Math.floor(n/6),v=n%6, target=compose(c,v); return {title:'글자 조각을 골라요!', display:consonants[c]+' + ?', sound:target, hint:'“'+target+'”를 만들려면 어떤 모음이 필요할까요?', answer:vowels[v],options:shuffle([vowels[v],...shuffle(vowels.filter(x=>x!==vowels[v])).slice(0,2)])};}
    if(activeMode===2){const [emoji,word]=countryWords[n]; return {title:travelStop.country+' 그림 낱말 찾기!',display:emoji,sound:word,answer:word,options:shuffle([word,...shuffle(countryWords.map(x=>x[1]).filter(x=>x!==word)).slice(0,2)])};}
    if(activeMode===5){const target=allSyllables[n];const others=shuffle(allSyllables.filter(x=>x!==target));return {title:'소리를 듣고 글자를 찾아요!',display:'👂',sound:target,hint:'소리 듣기를 눌러봐요',answer:target,options:shuffle([target,...others.slice(0,2)])};}
    if(activeMode===6||activeMode===7){const [emoji,word]=countryWords[n];return {display:emoji,sound:word,word};}
    const target=allSyllables[n%allSyllables.length];
    return {title:activeMode===3?'손가락으로 따라 써요!':'어떤 글자일까요?',display:activeMode===3?syllables[n%syllables.length]:target,sound:activeMode===3?syllables[n%syllables.length]:target};
  }
  function render(){
    update();
    if(index>=limit()){const nextStop=journeyStops[(journeyStep+1)%journeyStops.length];card.innerHTML='<div class="reward"><div class="stars">⭐️🧭⭐️</div><h2>미션 완료!</h2><p>'+limit()+'개를 해냈어요! 다음 목적지는 '+nextStop.country+' '+nextStop.name+'이에요.</p><button class="again next-stage">🧭 '+nextStop.country+'로 출발!</button> <button class="again replay">다시 도전하기</button></div>';card.querySelector('.next-stage').onclick=()=>beginJourney();card.querySelector('.replay').onclick=()=>start(mode);return;}
    if(monsterHp<=0)resetMonster();
    current=makeQuestion(); locked=false;
    if(activeMode===3||activeMode===4){renderPractice();return;}
    if(activeMode===6){renderTrain();return;}
    if(activeMode===7){renderMissing();return;}
    card.innerHTML='<span class="eyebrow">'+labels[activeMode][1]+' · '+(index+1)+' / '+limit()+'</span><h2>'+current.title+'</h2><div class="sound-letter">'+current.display+'</div><p>'+(current.hint||'소리를 듣고 정답을 골라요')+'</p><button class="listen">🔊 소리 듣기</button><div class="choices"></div><div class="feedback" aria-live="polite">천천히 골라봐요!</div>';
    card.querySelector('.listen').onclick=()=>speak(current.sound);
    current.options.forEach(option=>{const b=document.createElement('button');b.className='choice';b.textContent=option;b.onclick=()=>choose(b,option);card.querySelector('.choices').append(b);});
  }
  function choose(button,answer){
    if(locked)return;
    if(answer!==current.answer){button.classList.add('bad');card.querySelector('.feedback').textContent='괜찮아요! 다시 골라봐요 🌱';return;}
    locked=true;button.classList.add('good');stars++;localStorage.setItem('soriStars',String(stars));card.querySelector('.feedback').textContent='딩동댕! 별 하나를 얻었어요 ⭐';damageMonster();index++;update();nextTimer=setTimeout(render,monsterHp===0?700:250);
  }
  function renderTrain(){
    const letters=Array.from(current.word);let placed=[];current.answer=current.word;
    card.innerHTML='<span class="eyebrow">🚂 낱말 기차 · '+(index+1)+' / '+limit()+'</span><h2>글자를 차례대로 태워요!</h2><div class="sound-letter">'+current.display+'</div><button class="listen sound">🔊 낱말 듣기</button><p class="slots" style="font:32px Jua;min-height:44px;letter-spacing:8px">기차가 기다려요</p><div class="choices"></div><p><button class="listen reset">다시 놓기</button></p><div class="feedback" aria-live="polite">낱말을 듣고 첫 글자부터 골라요!</div>';
    const choices=card.querySelector('.choices'), slots=card.querySelector('.slots');
    shuffle(letters.map((letter,id)=>({letter,id}))).forEach(item=>{const b=document.createElement('button');b.className='choice';b.textContent=item.letter;b.onclick=()=>{if(locked)return;const next=letters[placed.length];if(item.letter!==next){card.querySelector('.feedback').textContent='괜찮아요. 다음 글자를 다시 골라요 🌱';return;}placed.push(item);b.disabled=true;b.style.opacity='.35';slots.textContent=placed.map(x=>x.letter).join('');if(placed.length===letters.length)choose(b,current.word);};choices.appendChild(b);});
    card.querySelector('.sound').onclick=()=>speak(current.word);card.querySelector('.reset').onclick=()=>{if(!locked)renderTrain();};
  }
  function renderMissing(){
    const letters=Array.from(current.word),missing=letters.length-1,answer=letters[missing],others=shuffle(syllables.filter(x=>x!==answer)).slice(0,2);
    card.innerHTML='<span class="eyebrow">🎁 빈칸 보물 · '+(index+1)+' / '+limit()+'</span><h2>빈칸에 들어갈 글자는?</h2><div class="sound-letter" style="font-size:58px">'+current.display+'</div><p style="font:36px Jua">'+letters.slice(0,missing).join('')+' □</p><button class="listen">🔊 낱말 듣기</button><div class="choices"></div><div class="feedback" aria-live="polite">소리를 듣고 마지막 글자를 골라요!</div>';
    current.answer=answer;card.querySelector('.listen').onclick=()=>speak(current.word);shuffle([answer,...others]).forEach(x=>{const b=document.createElement('button');b.className='choice';b.textContent=x;b.onclick=()=>choose(b,x);card.querySelector('.choices').appendChild(b);});
  }
  // Each path is one teaching stroke in a 100×100 box. Numbers mark stroke starts.
  const writingStrokes={
    '가':['M15 25 H48 V67'],'나':['M15 25 V67 H49'],
    '다':['M16 25 H49','M16 25 V67 H49'],
    '라':['M15 22 H49 V42','M49 42 H16 V64','M16 64 H50'],
    '마':['M15 24 V67','M15 24 H49 V67','M15 67 H49'],
    '바':['M15 23 V67','M49 23 V67','M15 45 H49','M15 67 H49'],
    '사':['M33 25 Q31 50 14 68','M32 43 Q41 55 51 64'],
    '아':['M33 23 C9 23 9 68 33 68 C57 68 57 23 33 23'],
    '자':['M15 25 H50','M33 25 Q32 50 15 67','M33 42 Q42 55 51 65'],
    '차':['M27 19 H40','M15 29 H50','M33 29 Q32 51 15 67','M33 44 Q42 56 51 65'],
    '카':['M15 24 H49 V66','M15 45 H49'],
    '타':['M16 24 H50','M16 24 V67 H50','M16 45 H47'],
    '파':['M14 25 H51','M22 25 V65','M43 25 V65','M14 66 H51'],
    '하':['M27 19 H40','M15 27 H51','M33 36 C15 36 15 68 33 68 C51 68 51 36 33 36']
  };
  function writingGuide(letter){
    const strokes=[...writingStrokes[letter],'M68 14 V82','M68 48 H85'];
    const lines=strokes.map((d,i)=>{const start=d.match(/^M([0-9]+) ([0-9]+)/);return '<path d="'+d+'" class="guide-stroke"/><path d="'+d+'" class="guide-arrow"/><circle cx="'+start[1]+'" cy="'+start[2]+'" r="4.8" fill="#ff7950"/><text x="'+start[1]+'" y="'+(Number(start[2])+2)+'" text-anchor="middle" font-size="6" font-weight="bold" fill="white">'+(i+1)+'</text>';}).join('');
    return '<svg viewBox="0 0 100 100" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"><defs><marker id="arrowhead" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0 L5 2.5 L0 5 Z" fill="#ff7950"/></marker></defs><style>.guide-stroke{fill:none;stroke:#c4dfed;stroke-width:7;stroke-linecap:round;stroke-linejoin:round}.guide-arrow{fill:none;stroke:#ff7950;stroke-width:1;stroke-dasharray:2 2;marker-end:url(#arrowhead)}</style>'+lines+'</svg>';
  }
  function renderPractice(){
    if(activeMode===4){
      card.innerHTML='<span class="eyebrow">🎲 랜덤 읽기 · '+(index+1)+' / '+limit()+'</span><h2>소리 내어 읽어볼까요?</h2><div class="sound-letter">'+current.display+'</div><p>먼저 읽어보고 소리를 확인해요!</p><button class="listen">🔊 소리 듣기</button><p><button class="again next">다음 글자 →</button></p><div class="feedback" aria-live="polite"></div>';
      card.querySelector('.listen').onclick=()=>speak(current.sound);card.querySelector('.next').onclick=nextPractice;return;
    }
    card.innerHTML='<span class="eyebrow">✍️ 따라 쓰기 · '+(index+1)+' / '+limit()+'</span><h2>손가락으로 따라 써요!</h2><p>연한 글자를 따라 그려보세요</p><div style="position:relative;width:min(100%,260px);aspect-ratio:1;margin:12px auto;background:#f1f9ff;border:3px dashed #a5d4ef;border-radius:18px;overflow:hidden"><span style="position:absolute;inset:0;display:grid;place-items:center;font:bold 190px sans-serif;color:#d3e7f1;pointer-events:none">'+current.display+'</span><canvas aria-label="글자 따라 쓰기" width="520" height="520" style="position:absolute;inset:0;width:100%;height:100%;touch-action:none"></canvas></div><button class="listen">🔊 소리 듣기</button> <button class="listen clear">지우기</button> <button class="again next">다 썼어요 →</button><p class="feedback">쓴 모양은 직접 확인해 주세요.</p>';
    const guideElement=card.querySelector('canvas').previousElementSibling;
    if (writingStrokes[current.display]) {
      guideElement.outerHTML=writingGuide(current.display);
      card.querySelector('.feedback').textContent='숫자 순서대로 시작점에서 화살표 방향으로 따라 써요. 모양은 직접 확인해 주세요.';
    } else {
      card.querySelector('.feedback').textContent='연한 글자를 따라 써요. 쓴 모양은 직접 확인해 주세요.';
    }
    const canvas=card.querySelector('canvas'),ctx=canvas.getContext('2d');let drawing=false,hasInk=false;
    function point(e){const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)*canvas.width/r.width,(e.clientY-r.top)*canvas.height/r.height];}
    canvas.onpointerdown=e=>{e.preventDefault();drawing=true;canvas.setPointerCapture(e.pointerId);const [x,y]=point(e);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+.1,y+.1);ctx.lineWidth=16;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#187bd0';ctx.stroke();hasInk=true;};
    canvas.onpointermove=e=>{if(!drawing)return;const [x,y]=point(e);ctx.lineTo(x,y);ctx.stroke();};canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false};
    card.querySelector('.listen').onclick=()=>speak(current.sound);card.querySelector('.clear').onclick=()=>{ctx.clearRect(0,0,520,520);hasInk=false;};card.querySelector('.next').onclick=()=>{if(!hasInk){card.querySelector('.feedback').textContent='먼저 글자를 따라 써볼까요?';return;}nextPractice();};
  }
  function nextPractice(){if(locked)return;locked=true;stars++;localStorage.setItem('soriStars',String(stars));damageMonster();index++;update();nextTimer=setTimeout(render,monsterHp===0?700:250);}
  order=shuffle(Array.from({length:limit()},(_,i)=>i));render();
})();

