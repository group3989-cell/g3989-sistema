/* Ditado por voz em qualquer campo do Sistema G3989.
   Um botão flutuante (🎤) dita para o último campo de texto que recebeu foco. Atalho: Alt+V.
   Usa o reconhecimento do próprio navegador (Chrome, Edge, Safari). Nada sai para servidor nosso. */
(function(){
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var alvo = null, rec = null, ouvindo = false, parcial = "";
  var css = ".vozFlut{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:9999;border:0;border-radius:999px;padding:12px 16px;font:600 14px Manrope,Sora,system-ui,sans-serif;color:#fff;background:#002861;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer;display:flex;align-items:center;gap:8px}" +
    ".vozFlut:focus-visible{outline:3px solid #13bbf1;outline-offset:2px}" +
    ".vozFlut.on{background:#d1304a;animation:vozPulsa 1s infinite}@keyframes vozPulsa{50%{opacity:.75}}@media (prefers-reduced-motion:reduce){.vozFlut.on{animation:none}}" +
    ".vozFlut small{font-weight:500;opacity:.85}" +
    ".vozDica{position:fixed;right:16px;bottom:calc(68px + env(safe-area-inset-bottom,0px));z-index:9999;max-width:min(360px,calc(100vw - 32px));background:#0b1430;color:#e8eefc;font:13px/1.4 Manrope,Sora,system-ui,sans-serif;padding:10px 12px;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.25)}" +
    "[data-voz-alvo]{box-shadow:0 0 0 2px #13bbf1 inset!important}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var bt = document.createElement("button");
  bt.type = "button"; bt.className = "vozFlut"; bt.setAttribute("aria-pressed", "false"); bt.setAttribute("aria-label", "Ditar por voz no campo selecionado (Alt+V)");
  bt.innerHTML = "🎤 <span>Voz</span>";
  var dica = document.createElement("div"); dica.className = "vozDica"; dica.setAttribute("role", "status"); dica.setAttribute("aria-live", "polite"); dica.hidden = true;
  document.addEventListener("DOMContentLoaded", function(){ document.body.appendChild(bt); document.body.appendChild(dica); });
  if(document.body){ document.body.appendChild(bt); document.body.appendChild(dica); }

  function editavel(el){ if(!el) return false; var t = (el.tagName || "").toLowerCase(); if(t === "textarea") return true; if(t === "input") return /^(text|search|url|tel|email|number|)$/.test(el.type || "text"); return el.isContentEditable; }
  document.addEventListener("focusin", function(e){ if(editavel(e.target) && e.target !== bt){ if(alvo) alvo.removeAttribute("data-voz-alvo"); alvo = e.target; } });

  function avisar(t, ms){ dica.textContent = t; dica.hidden = false; clearTimeout(avisar.t); avisar.t = setTimeout(function(){ dica.hidden = true; }, ms || 4000); }
  function inserir(txt){
    if(!alvo || !document.contains(alvo)){ avisar("Toque primeiro no campo onde quer escrever."); return; }
    var sep = (alvo.value || alvo.textContent || "").length && !/\s$/.test(alvo.value || alvo.textContent || "") ? " " : "";
    if(alvo.isContentEditable){ alvo.focus(); document.execCommand("insertText", false, sep + txt); }
    else {
      var ini = alvo.selectionStart, fim = alvo.selectionEnd;
      if(typeof ini === "number"){ alvo.setRangeText(sep + txt, ini, fim, "end"); } else { alvo.value += sep + txt; }
      alvo.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  function estado(on){ ouvindo = on; bt.classList.toggle("on", on); bt.setAttribute("aria-pressed", on ? "true" : "false"); bt.innerHTML = on ? "🎤 <span>Ouvindo… <small>toque para parar</small></span>" : "🎤 <span>Voz</span>"; if(alvo){ if(on) alvo.setAttribute("data-voz-alvo", "1"); else alvo.removeAttribute("data-voz-alvo"); } }
  function alternar(){
    if(!Rec){ avisar("Este navegador não tem reconhecimento de voz. No celular, use o microfone do teclado.", 6000); return; }
    if(ouvindo){ rec.stop(); return; }
    if(!alvo || !document.contains(alvo)){ var cand = document.querySelector("textarea:not([disabled]), input[type=text]:not([disabled]), input:not([type]):not([disabled])"); if(cand){ alvo = cand; } else { avisar("Toque primeiro no campo onde quer escrever."); return; } }
    rec = new Rec(); rec.lang = "pt-BR"; rec.interimResults = true; rec.continuous = true; rec.maxAlternatives = 1;
    rec.onstart = function(){ estado(true); avisar("Pode falar. Diga \"ponto\" ou \"vírgula\" para pontuar. Toque de novo para parar.", 3500); };
    rec.onresult = function(ev){ var fim = "", tmp = ""; for(var i = ev.resultIndex; i < ev.results.length; i++){ var r = ev.results[i]; if(r.isFinal) fim += r[0].transcript; else tmp += r[0].transcript; }
      if(fim){ fim = fim.trim().replace(/\s+ponto final$/i, ".").replace(/\s+ponto$/i, ".").replace(/\s+vírgula$/i, ",").replace(/\s+interrogação$/i, "?"); inserir(fim); } else if(tmp){ dica.textContent = "Ouvindo: " + tmp; dica.hidden = false; } };
    rec.onerror = function(e){ avisar(e.error === "not-allowed" ? "O navegador bloqueou o microfone. Libere no cadeado da barra de endereço." : "Voz: " + e.error, 6000); };
    rec.onend = function(){ estado(false); };
    try { rec.start(); } catch(e){ avisar("Não consegui iniciar o microfone: " + e.message, 6000); }
  }
  bt.addEventListener("mousedown", function(e){ e.preventDefault(); }); /* não rouba o foco do campo */
  bt.addEventListener("click", alternar);
  document.addEventListener("keydown", function(e){ if(e.altKey && (e.key === "v" || e.key === "V")){ e.preventDefault(); alternar(); } });
  window.G3989Voz = { ditar: function(el){ if(el){ alvo = el; } alternar(); }, parar: function(){ if(ouvindo) rec.stop(); } };
})();
