(() => {
  const letters = '가사나도노고차마바';
  let current;
  function play(file) {
    if (current) { current.pause(); current.currentTime = 0; }
    current = new Audio('hangul_voice/' + file + '.mp3');
    current.play().catch(() => { document.getElementById('message').textContent = '음성 파일을 재생할 수 없어요. 파일과 음성 폴더가 함께 있는지 확인해 주세요.'; });
  }
  document.getElementById('listen').addEventListener('click', event => {
    event.stopImmediatePropagation();
    const stage = document.getElementById('stage').textContent;
    const n = /^([123])\./.exec(stage);
    if (n) play('q' + n[1]);
  }, true);
  function addListenButtons() {
    const choices = document.getElementById('choices');
    for (const choice of [...choices.children]) {
      if (choice.dataset.voiceAdded) continue;
      const idx = letters.indexOf(choice.textContent.trim());
      if (idx < 0) continue;
      choice.dataset.voiceAdded = '1';
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'secondary';
      button.textContent = '🔊 ' + choice.textContent + ' 듣기';
      button.setAttribute('aria-label', choice.textContent + ' 발음 듣기');
      button.onclick = () => play('letter_' + idx);
      choices.appendChild(button);
    }
  }
  new MutationObserver(addListenButtons).observe(document.getElementById('choices'), {childList:true});
  addListenButtons();
})();
