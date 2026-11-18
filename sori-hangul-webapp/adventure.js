(() => {
  const consonants = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const syllables = ['가','나','다','라','마','바','사','아','자','차','카','타','파','하'];
  const words = [['🍎','사과'],['🐰','토끼'],['🐟','물고기'],['🍌','바나나'],['🌳','나무'],['🐶','강아지'],['🚗','자동차'],['☁️','구름'],['🌙','달'],['🐱','고양이'],['🍇','포도'],['🦋','나비'],['🍓','딸기'],['🐘','코끼리'],['🌻','해바라기'],['🐢','거북이'],['🍉','수박'],['🐝','벌'],['🌈','무지개'],['🐣','병아리']];
  const vowels = ['ㅏ','ㅓ','ㅗ','ㅜ','ㅡ','ㅣ'];
  const base = [0,2,3,5,6,7,9,11,12,14,15,16,17,18];
  const vowelIndex = [0,4,8,13,18,20];
  const compose = (c,v) => String.fromCharCode(0xac00+(base[c]*21+vowelIndex[v])*28);
  const shuffle = a => [...a].sort(() => Math.random()-.5);
  let mode = 0, index = 0, locked = false, current = null, order = [], nextTimer = null;
  let stars = Number(localStorage.getItem('soriStars') || 0);
  const zone = document.querySelector('#playZone'), card = zone.querySelector('.play-card');
  const path = document.querySelector('.path');
  const buttons = [...document.querySelectorAll('.level')];
  for (let i=3;i<8;i++) { const b=document.createElement('button'); b.className='level'; path.appendChild(b); buttons.push(b); }
  const stats = document.querySelector('.stats');
  const progress = document.querySelector('.section-head > span');
  const meter = document.querySelector('#meter');
  const labels = [['🔊','소리 찾기'],['🧩','글자 만들기'],['🎨','그림 낱말'],['✍️','따라 쓰기'],['🎲','랜덤 읽기'],['👂','소리 탐정'],['🚂','낱말 기차'],['🎁','빈칸 보물']];
  buttons.forEach((b,i) => {
    b.className = 'level' + (i===0?' current':'');
    b.innerHTML = '<span class="level-icon l'+(i%3+1)+'">'+labels[i][0]+'</span><b>'+labels[i][1]+'</b><small>자유롭게 놀기</small>';
    b.onclick = () => start(i);
  });
  document.querySelector('.avatar span:last-child').textContent='소리섬 탐험대';
  document.querySelector('.mission b').textContent=' 놀이를 골라 보물을 모아요';
  document.querySelector('.quest p').textContent='여덟 가지 놀이를 마음껏 즐겨요!';
  document.querySelector('#start').onclick=()=>start(0);
  function speak(value) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(value); u.lang='ko-KR'; u.rate=.85; speechSynthesis.speak(u);
  }
  function update() {
    stats.innerHTML='<span class="stat">⭐ '+stars+'</span><span class="stat">🎮 자유 놀이</span>';
    progress.textContent=Math.min(index+1,limit())+' / '+limit()+' 문제';
    meter.style.width=Math.min(100,index/limit()*100)+'%';
    buttons.forEach((b,i)=>b.classList.toggle('current',i===mode));
  }
  function limit(){ return [14,84,20,30,30,30,20,20][mode]; }
  function start(which){clearTimeout(nextTimer);mode=which;index=0;locked=false;order=shuffle(Array.from({length:[3,4,5].includes(mode)?84:limit()},(_,i)=>i));render();zone.scrollIntoView({behavior:'smooth',block:'start'});}
  function makeQuestion(){
    const n=order[index] ?? index;
    if(mode===0){return {title:'첫소리를 찾아요!', display:syllables[n], sound:syllables[n], answer:consonants[n], options:shuffle([consonants[n],...shuffle(consonants.filter(x=>x!==consonants[n])).slice(0,2)])};}
    if(mode===1){const c=Math.floor(n/6),v=n%6, target=compose(c,v); return {title:'글자 조각을 골라요!', display:consonants[c]+' + ?', sound:target, hint:'“'+target+'”를 만들려면 어떤 모음이 필요할까요?', answer:vowels[v],options:shuffle([vowels[v],...shuffle(vowels.filter(x=>x!==vowels[v])).slice(0,2)])};}
    if(mode===2){const [emoji,word]=words[n]; return {title:'그림에 맞는 낱말은?',display:emoji,sound:word,answer:word,options:shuffle([word,...shuffle(words.map(x=>x[1]).filter(x=>x!==word)).slice(0,2)])};}
    if(mode===5){const target=compose(Math.floor(n/6),n%6);const others=shuffle(Array.from({length:84},(_,i)=>compose(Math.floor(i/6),i%6)).filter(x=>x!==target));return {title:'소리를 듣고 글자를 찾아요!',display:'👂',sound:target,hint:'소리 듣기를 눌러봐요',answer:target,options:shuffle([target,...others.slice(0,2)])};}
    if(mode===6||mode===7){const [emoji,word]=words[n];return {display:emoji,sound:word,word};}
    const target=mode===3 ? syllables[n%syllables.length] : compose(Math.floor(n/6),n%6);
    return {title:mode===3?'손가락으로 따라 써요!':'어떤 글자일까요?',display:target,sound:target};
  }
  function render(){
    update();
    if(index>=limit()){card.innerHTML='<div class="reward"><div class="stars">⭐️⭐️⭐️</div><h2>모험 완료!</h2><p>'+limit()+'개의 문제를 풀었어요!</p><button class="again">다시 놀기</button></div>';card.querySelector('button').onclick=()=>start(mode);return;}
    current=makeQuestion(); locked=false;
    if(mode===3||mode===4){renderPractice();return;}
    if(mode===6){renderTrain();return;}
    if(mode===7){renderMissing();return;}
    card.innerHTML='<span class="eyebrow">'+labels[mode][1]+' · '+(index+1)+' / '+limit()+'</span><h2>'+current.title+'</h2><div class="sound-letter">'+current.display+'</div><p>'+(current.hint||'소리를 듣고 정답을 골라요')+'</p><button class="listen">🔊 소리 듣기</button><div class="choices"></div><div class="feedback" aria-live="polite">천천히 골라봐요!</div>';
    card.querySelector('.listen').onclick=()=>speak(current.sound);
    current.options.forEach(option=>{const b=document.createElement('button');b.className='choice';b.textContent=option;b.onclick=()=>choose(b,option);card.querySelector('.choices').append(b);});
  }
  function choose(button,answer){
    if(locked)return;
    if(answer!==current.answer){button.classList.add('bad');card.querySelector('.feedback').textContent='괜찮아요! 다시 골라봐요 🌱';return;}
    locked=true;button.classList.add('good');stars++;localStorage.setItem('soriStars',String(stars));card.querySelector('.feedback').textContent='딩동댕! 별 하나를 얻었어요 ⭐';speak(current.sound);index++;update();nextTimer=setTimeout(render,1000);
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
    const lines=strokes.map((d,i)=>{const start=d.match(/^M(\\d+) (\\d+)/);return '<path d="'+d+'" class="guide-stroke"/><path d="'+d+'" class="guide-arrow"/><circle cx="'+start[1]+'" cy="'+start[2]+'" r="4.8" fill="#ff7950"/><text x="'+start[1]+'" y="'+(Number(start[2])+2)+'" text-anchor="middle" font-size="6" font-weight="bold" fill="white">'+(i+1)+'</text>';}).join('');
    return '<svg viewBox="0 0 100 100" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"><defs><marker id="arrowhead" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0 L5 2.5 L0 5 Z" fill="#ff7950"/></marker></defs><style>.guide-stroke{fill:none;stroke:#c4dfed;stroke-width:7;stroke-linecap:round;stroke-linejoin:round}.guide-arrow{fill:none;stroke:#ff7950;stroke-width:1;stroke-dasharray:2 2;marker-end:url(#arrowhead)}</style>'+lines+'</svg>';
  }
  function renderPractice(){
    if(mode===4){
      card.innerHTML='<span class="eyebrow">🎲 랜덤 읽기 · '+(index+1)+' / '+limit()+'</span><h2>소리 내어 읽어볼까요?</h2><div class="sound-letter">'+current.display+'</div><p>먼저 읽어보고 소리를 확인해요!</p><button class="listen">🔊 소리 듣기</button><p><button class="again next">다음 글자 →</button></p><div class="feedback" aria-live="polite"></div>';
      card.querySelector('.listen').onclick=()=>speak(current.sound);card.querySelector('.next').onclick=nextPractice;return;
    }
    card.innerHTML='<span class="eyebrow">✍️ 따라 쓰기 · '+(index+1)+' / '+limit()+'</span><h2>손가락으로 따라 써요!</h2><p>연한 글자를 따라 그려보세요</p><div style="position:relative;width:min(100%,260px);aspect-ratio:1;margin:12px auto;background:#f1f9ff;border:3px dashed #a5d4ef;border-radius:18px;overflow:hidden"><span style="position:absolute;inset:0;display:grid;place-items:center;font:bold 190px sans-serif;color:#d3e7f1;pointer-events:none">'+current.display+'</span><canvas aria-label="글자 따라 쓰기" width="520" height="520" style="position:absolute;inset:0;width:100%;height:100%;touch-action:none"></canvas></div><button class="listen">🔊 소리 듣기</button> <button class="listen clear">지우기</button> <button class="again next">다 썼어요 →</button><p class="feedback">쓴 모양은 직접 확인해 주세요.</p>';
    const guideElement=card.querySelector('canvas').previousElementSibling;
    guideElement.outerHTML=writingGuide(current.display);
    card.querySelector('.feedback').textContent='숫자 순서대로 시작점에서 화살표 방향으로 따라 써요. 모양은 직접 확인해 주세요.';
    const canvas=card.querySelector('canvas'),ctx=canvas.getContext('2d');let drawing=false,hasInk=false;
    function point(e){const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)*canvas.width/r.width,(e.clientY-r.top)*canvas.height/r.height];}
    canvas.onpointerdown=e=>{e.preventDefault();drawing=true;canvas.setPointerCapture(e.pointerId);const [x,y]=point(e);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+.1,y+.1);ctx.lineWidth=16;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#187bd0';ctx.stroke();hasInk=true;};
    canvas.onpointermove=e=>{if(!drawing)return;const [x,y]=point(e);ctx.lineTo(x,y);ctx.stroke();};canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false};
    card.querySelector('.listen').onclick=()=>speak(current.sound);card.querySelector('.clear').onclick=()=>{ctx.clearRect(0,0,520,520);hasInk=false;};card.querySelector('.next').onclick=()=>{if(!hasInk){card.querySelector('.feedback').textContent='먼저 글자를 따라 써볼까요?';return;}nextPractice();};
  }
  function nextPractice(){if(locked)return;locked=true;stars++;localStorage.setItem('soriStars',String(stars));index++;render();}
  order=shuffle(Array.from({length:limit()},(_,i)=>i));render();
})();

