(() => {
  const style = document.createElement('style');
  style.textContent = `
    .world {isolation:isolate}
    .world.travel .mountains {animation:scenery 0.45s linear infinite}
    .world.travel .cloud {animation:scenery 2s linear infinite}
    .world.travel #train {animation:ride .14s ease-in-out infinite alternate}
    .world.battle #train {animation:attack .75s ease-in-out}
    .world.battle #monster {animation:hit .75s ease-in-out}
    .effect {position:absolute;left:68%;bottom:65px;font-size:56px;z-index:5;pointer-events:none;animation:burst .8s forwards}
    .world .sign {position:absolute;right:14px;bottom:12px;background:#fff9d4;color:#5a482c;padding:5px 12px;border-radius:12px;font-weight:800;font-size:13px}
    @keyframes scenery {from{transform:translateX(45px)}to{transform:translateX(-45px)}}
    @keyframes ride {to{transform:translateY(-6px) rotate(-2deg)}}
    @keyframes attack {0%,100%{transform:translateX(0)}40%{transform:translateX(100px) scale(1.1)}70%{transform:translateX(60px)}}
    @keyframes hit {0%,30%{transform:scale(1)}45%{transform:translateX(25px) rotate(18deg) scale(.8)}75%{transform:translateX(-10px) rotate(-12deg)}100%{transform:scale(1)}}
    @keyframes burst {0%{opacity:0;transform:scale(.2)}30%{opacity:1;transform:scale(1.4)}100%{opacity:0;transform:translateY(-55px) scale(1.1)}}
    @media(prefers-reduced-motion:reduce){.world.travel .mountains,.world.travel .cloud,.world.travel #train,.world.battle #train,.world.battle #monster,.effect{animation:none}}
  `;
  document.head.appendChild(style);
  const world=document.querySelector('.world'), message=document.getElementById('message'), next=document.getElementById('next');
  const sign=document.createElement('div'); sign.className='sign'; world.appendChild(sign);
  function travel(){
    sign.textContent='🚂 모험을 떠나요!'; world.classList.add('travel');
    setTimeout(()=>{world.classList.remove('travel');sign.textContent='👾 몬스터 발견!';},1400);
  }
  function battle(){
    world.classList.remove('battle'); void world.offsetWidth; world.classList.add('battle');
    sign.textContent='✨ 한글 마법 공격!';
    const effect=document.createElement('div');effect.className='effect';effect.textContent='💥✨';world.appendChild(effect);
    setTimeout(()=>{effect.remove();world.classList.remove('battle');sign.textContent='🏅 몬스터를 물리쳤어요!';},850);
    message.textContent='정답! 한글 마법으로 몬스터를 물리쳤어요! ⭐';
    document.getElementById('monster').textContent='💫';
  }
  new MutationObserver(()=>{if(message.textContent.startsWith('정답! 몬스터와')) battle();}).observe(message,{childList:true,characterData:true,subtree:true});
  next.addEventListener('click',()=>{if(next.textContent.includes('다음 지역')) travel();},true);
  travel();
})();
