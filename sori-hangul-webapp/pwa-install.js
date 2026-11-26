(() => {
  let installPrompt = null;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "pwa-install-button";
  button.textContent = "📲 앱 설치";
  button.setAttribute("aria-label", "소리한글 앱 설치");
  Object.assign(button.style, {
    position:"fixed", zIndex:"30", right:"max(14px, calc((100vw - 600px) / 2 + 14px))",
    bottom:"calc(14px + env(safe-area-inset-bottom))", border:"0", borderRadius:"999px",
    padding:"13px 18px", background:"#ff7b43", color:"#fff", font:"bold 16px sans-serif",
    boxShadow:"0 4px 0 #c6532d, 0 6px 18px #18324c33", cursor:"pointer"
  });
  document.body.append(button);
  const isInstalled = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (isInstalled()) button.hidden = true;
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
  });
  window.addEventListener("appinstalled", () => {
    button.hidden = true;
    installPrompt = null;
  });
  button.addEventListener("click", async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      return;
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    alert(ios
      ? "Safari 아래의 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하면 앱처럼 설치할 수 있어요."
      : "브라우저 오른쪽 위 ⋮ 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택해 주세요.");
  });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
  }
})();