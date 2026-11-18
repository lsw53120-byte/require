(() => {
  const consonants = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const syllables = ['가','나','다','라','마','바','사','아','자','차','카','타','파','하'];
  const words = [['🍎','사과'],['🐰','토끼'],['🐟','물고기'],['🍌','바나나'],['🌳','나무'],['🐶','강아지'],['🚗','자동차'],['☁️','구름'],['🌙','달'],['🐱','고양이'],['🍇','포도'],['🦋','나비'],['🍓','딸기'],['🐘','코끼리'],['🌻','해바라기'],['🐢','거북이'],['🍉','수박'],['🐝','벌'],['🌈','무지개'],['🐣','병아리']];
  const vowels = ['ㅏ','ㅓ','ㅗ','ㅜ','ㅡ','ㅣ'];
  const base = [0,2,3,5,6,7,9,11,12,14,15,16,17,18];
  const vowelIndex = [0,4,8,13,18,20];
  const compose = (c,v) => String.fromCharCode(0xac00+(base[c]*21+vowelIndex[v])*28);
  const shuffle = a => [...a].sort(() => Math.random()-.5);
  let mode = 0, index = 0, locked = false, current = null;
  let stars = Number(localStorage.getItem('soriStars') || 0);
  const zone = document.querySelector('#playZone'), card = zone.querySelector('.play-card');
  const buttons = [...document.querySelectorAll('.level')];
  const stats = document.querySelector('.stats');
  const progress = document.querySelector('.section-head > span');
  const meter = document.querySelector('#meter');
  const labels = [['🔊','소리 찾기'],['🧩','글자 만들기'],['🎨','그림 낱말']];
  buttons.forEach((b,i) => {
    b.className = 'level' + (i===0?' current':'');
    b.innerHTML = '<span class="level-icon l'+(i+1)+'">'+labels[i][0]+'</span><b>'+labels[i][1]+'</b><small>자유롭게 놀기</small>';
    b.onclick = () => start(i);
  });
  document.querySelector('.avatar span:last-child').textContent='소리섬 탐험대';
  document.querySelector('.mission b').textContent=' 놀이를 골라 보물을 모아요';
  document.querySelector('.quest p').textContent='세 가지 놀이를 마음껏 즐겨요!';
  document.querySelector('#start').onclick=()=>start(0);
  function speak(value) {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(value); u.lang='ko-KR'; u.rate=.85; speechSynthesis.speak(u);
  }
  function update() {
    stats.innerHTML='<span class="stat">⭐ '+stars+'</span><span class="stat">🎮 자유 놀이</span>';
    progress.textContent=(index+1)+' / '+limit()+' 문제';
    meter.style.width=Math.min(100,index/limit()*100)+'%';
    buttons.forEach((b,i)=>b.classList.toggle('current',i===mode));
  }
  function limit(){ return mode===0?14:mode===1?84:20; }
  function start(which){mode=which;index=0;locked=false;render();zone.scrollIntoView({behavior:'smooth',block:'start'});}
  function makeQuestion(){
    if(mode===0){const n=index%14; return {title:'첫소리를 찾아요!', display:syllables[n], sound:syllables[n], answer:consonants[n], options:shuffle([consonants[n],...shuffle(consonants.filter(x=>x!==consonants[n])).slice(0,2)])};}
    if(mode===1){const c=Math.floor(index/6)%14,v=index%6, target=compose(c,v); return {title:'글자 조각을 골라요!', display:consonants[c]+' + ?', sound:target, hint:'“'+target+'”를 만들려면 어떤 모음이 필요할까요?', answer:vowels[v],options:shuffle([vowels[v],...shuffle(vowels.filter(x=>x!==vowels[v])).slice(0,2)])};}
    const [emoji,word]=words[index%words.length]; return {title:'그림에 맞는 낱말은?',display:emoji,sound:word,answer:word,options:shuffle([word,...shuffle(words.map(x=>x[1]).filter(x=>x!==word)).slice(0,2)])};
  }
  function render(){
    update();
    if(index>=limit()){card.innerHTML='<div class="reward"><div class="stars">⭐️⭐️⭐️</div><h2>모험 완료!</h2><p>'+limit()+'개의 문제를 풀었어요!</p><button class="again">다시 놀기</button></div>';card.querySelector('button').onclick=()=>start(mode);return;}
    current=makeQuestion(); locked=false;
    card.innerHTML='<span class="eyebrow">'+labels[mode][1]+' · '+(index+1)+' / '+limit()+'</span><h2>'+current.title+'</h2><div class="sound-letter">'+current.display+'</div><p>'+(current.hint||'소리를 듣고 정답을 골라요')+'</p><button class="listen">🔊 소리 듣기</button><div class="choices"></div><div class="feedback" aria-live="polite">천천히 골라봐요!</div>';
    card.querySelector('.listen').onclick=()=>speak(current.sound);
    current.options.forEach(option=>{const b=document.createElement('button');b.className='choice';b.textContent=option;b.onclick=()=>choose(b,option);card.querySelector('.choices').append(b);});
  }
  function choose(button,answer){
    if(locked)return;
    if(answer!==current.answer){button.classList.add('bad');card.querySelector('.feedback').textContent='괜찮아요! 다시 골라봐요 🌱';return;}
    locked=true;button.classList.add('good');stars++;localStorage.setItem('soriStars',String(stars));card.querySelector('.feedback').textContent='딩동댕! 별 하나를 얻었어요 ⭐';speak(current.sound);index++;update();setTimeout(render,1000);
  }
  render();
})();

