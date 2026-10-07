/* Sistema G3989 · painel interno (versão 1, 05/10/2026) */
(function(){
  "use strict";
  var C = window.G3989, sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey);
  var $ = function(id){ return document.getElementById(id); };
  var app = $("app");
  var est = { sessao:null, clientes:[], progresso:{}, atual:null, view:"hoje", aba:"checklist", filtro:"todos", busca:"", min:false };
  try { est.min = localStorage.getItem("g3989:lado-min") === "1"; } catch(e){}
  /* tema: segue o sistema até a pessoa escolher; a escolha fica neste navegador */
  function temaAtual(){ var t = null; try { t = localStorage.getItem("g3989:tema"); } catch(e){} return t || (window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "claro" : "escuro"); }
  function aplicarTema(){ document.documentElement.setAttribute("data-tema", temaAtual()); }
  function trocarTema(){ var n = temaAtual() === "claro" ? "escuro" : "claro"; try { localStorage.setItem("g3989:tema", n); } catch(e){} aplicarTema(); var b = document.querySelectorAll(".tema"); b.forEach(function(x){ x.innerHTML = rotTema(); }); }
  function rotTema(){ return temaAtual() === "claro" ? "☾ Escuro" : "☀ Claro"; }
  aplicarTema();

  var TIPOS = [["ecommerce","E-commerce"],["mensagem","Mensagem"],["lead","Lead de site"],["servicos","Serviços"],["avulso","Avulso"]];
  var STATUS = [["entrada","Entrada"],["teste","Teste 30 dias"],["ativo","Ativo"],["pausado","Pausado"],["saiu","Saiu"]];
  var IDS = [["bm","BM"],["conta_anuncio","Conta de anúncio (act_)"],["pixel","Pixel"],["pagina","Página do Facebook"],["instagram","Instagram"],["waba","WABA (WhatsApp API)"],["ga4","Propriedade GA4"],["loja_url","URL da loja"]];
  var ROT_CAD = {responsavel:"Responsável", empresa:"Nome da empresa", razao_social:"Razão social", cnpj:"CNPJ", endereco:"Endereço", telefone:"Telefone", email:"E-mail", site:"Site", instagram:"Instagram", segmento:"Segmento", plataforma_loja:"Plataforma da loja", erp:"Sistema de gestão (ERP)", crm:"CRM", whatsapp:"WhatsApp", time_tamanho:"Tamanho do time", time_responsaveis:"Responsáveis", horario:"Horário de atendimento", registro_vendas:"Como registra as vendas", faturamento_6m:"Faturamento dos últimos 6 meses", ticket_medio:"Ticket médio", ja_anuncia:"Já anuncia", investimento:"Investimento mensal em anúncios", acesso:"Forma de acesso", objetivo:"Objetivo principal", observacoes:"Observações", consentimento:"Consentimento LGPD"};

  var FORM = [["Empresa",["responsavel","empresa","razao_social","cnpj","endereco","telefone","email","instagram","site","segmento"]],
    ["Loja e sistemas",["plataforma_loja","erp","crm","whatsapp","registro_vendas"]],["Time",["time_tamanho","horario","time_responsaveis"]],
    ["Vendas e anúncios",["faturamento_6m","ticket_medio","ja_anuncia","investimento","objetivo"]],["Acesso",["acesso"]],["Para fechar",["observacoes"]]];
  /* o que a ficha já sabe vira sugestão de preenchido */
  function daFicha(c, k){ var ids = c.ids || {}; return {responsavel:c.responsavel, empresa:c.nome, razao_social:c.razao_social, cnpj:c.cnpj, segmento:c.segmento, plataforma_loja:c.plataforma_loja, erp:c.erp, site:ids.loja_url, instagram:ids.instagram}[k] || ""; }
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function ini(n){ var p = String(n || "?").trim().split(/\s+/); return ((p[0] || "")[0] + ((p[1] || "")[0] || "")).toUpperCase(); }
  function rotStatus(s){ for(var i = 0; i < STATUS.length; i++) if(STATUS[i][0] === s) return STATUS[i][1]; return s; }
  function rotTipos(t){ return (t || []).map(function(k){ for(var i = 0; i < TIPOS.length; i++) if(TIPOS[i][0] === k) return TIPOS[i][1]; return k; }).join(", "); }
  function dataBR(iso){ if(!iso) return ""; var d = new Date(iso); return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"}); }
  function autor(){ var e = est.sessao && est.sessao.user && est.sessao.user.email; return e === C.email ? "Thiago" : (e || "Equipe"); }
  function linkForm(c){ var base = location.origin + location.pathname.replace(/index\.html$/, ""); if(!/\/$/.test(base)) base += "/"; return base + "cadastro/?t=" + c.token_formulario; }
  /* mensagem pronta para mandar o formulário ao cliente pelo WhatsApp */
  function msgForm(c){ return "Olá" + (c.responsavel ? ", " + c.responsavel.split(" ")[0] : "") + "! Para começarmos com segurança, preencha o cadastro da " + c.nome + " neste link. Leva uns 5 minutos e não pede nenhuma senha: " + linkForm(c); }
  function copiar(txt, el, ok){
    function fim(b){ if(el){ el.textContent = b ? ok : "Não deu para copiar"; el.className = "msg " + (b ? "ok" : "erro"); setTimeout(function(){ el.textContent = ""; }, 2500); } }
    if(navigator.clipboard) navigator.clipboard.writeText(txt).then(function(){ fim(true); }, function(){ fim(false); }); else fim(false);
  }
  function erroMsg(e){ return (e && (e.message || e.error_description)) || "Algo deu errado. Tente de novo."; }

  /* ---------- sessão ---------- */
  sb.auth.getSession().then(function(r){ est.sessao = r.data.session; inicio(); });
  sb.auth.onAuthStateChange(function(_, s){ var antes = !!est.sessao; est.sessao = s; if(antes !== !!s) inicio(); });

  function inicio(){ if(!est.sessao) return telaLogin(); carregar().then(function(){ est.atualizadoEm = new Date(); render(); }); }

  function telaLogin(){
    app.innerHTML = '<div class="login"><form id="fLogin"><img src="assets/logo-azul.png" alt="GROUP3989"><h1>Sistema G3989</h1><p>Acesso da equipe</p>' +
      '<div class="campo"><label for="lEmail">E-mail</label><input id="lEmail" type="email" autocomplete="username" required></div>' +
      '<div class="campo" style="margin-top:10px"><label for="lSenha">Senha</label><input id="lSenha" type="password" autocomplete="current-password" required></div>' +
      '<button class="bt pri" style="width:100%;justify-content:center;margin-top:16px" type="submit">Entrar</button><div id="lMsg" class="msg erro" style="text-align:center;margin-top:10px"></div>' +
      '<div style="text-align:center;margin-top:14px"><button type="button" class="tema" id="bTema">' + rotTema() + '</button></div></form></div>';
    $("bTema").onclick = trocarTema;
    $("fLogin").onsubmit = function(ev){
      ev.preventDefault(); $("lMsg").textContent = "";
      sb.auth.signInWithPassword({email:$("lEmail").value.trim(), password:$("lSenha").value}).then(function(r){
        if(r.error) $("lMsg").textContent = r.error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : erroMsg(r.error);
      });
    };
  }

  /* ---------- dados ---------- */
  function carregar(){
    return Promise.all([
      sb.from("clientes").select("*").order("nome"),
      sb.from("checklist_cliente").select("cliente_id,feito"),
      sb.from("fechamentos").select("*"),
      sb.from("relatorios_meta").select("*"),
      sb.from("tarefas").select("*").order("prioridade").order("grupo").order("ordem").order("criado_em")
    ]).then(function(r){
      est.tarefas = r[4].error ? null : (r[4].data || []);
      est.fech = r[2].error ? [] : (r[2].data || []);
      est.metaRel = r[3].error ? [] : (r[3].data || []);
      if(r[0].error){ app.innerHTML = '<div class="vazio">Sem acesso aos dados: ' + esc(erroMsg(r[0].error)) + '. Confira se o seu e-mail está na tabela admins.</div>'; throw r[0].error; }
      est.clientes = r[0].data || [];
      est.progresso = {};
      (r[1].data || []).forEach(function(x){ var p = est.progresso[x.cliente_id] = est.progresso[x.cliente_id] || {f:0, t:0}; p.t++; if(x.feito) p.f++; });
      if(est.atual) est.atual = est.clientes.filter(function(c){ return c.id === est.atual.id; })[0] || null;
    });
  }
  function pct(id){ var p = est.progresso[id]; return p && p.t ? Math.round(100 * p.f / p.t) : 0; }

  /* ---------- casca ---------- */
  /* atualizar: busca de novo no banco tudo o que o Claude ou a equipe mudou */
  function atualizar(){
    var b = document.getElementById("bAtualizar"); if(b){ b.disabled = true; b.textContent = "Atualizando…"; }
    return carregar().then(function(){ est.atualizadoEm = new Date(); render(); }).catch(function(e){ alertaErro(e); render(); });
  }
  document.addEventListener("keydown", function(e){ var a = e.target; if((e.key === "r" || e.key === "R") && !e.ctrlKey && !e.metaKey && !(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) && est.sessao){ e.preventDefault(); atualizar(); } });
  document.addEventListener("visibilitychange", function(){ if(document.visibilityState === "visible" && est.sessao && (!est.atualizadoEm || Date.now() - est.atualizadoEm > 60000)) atualizar(); });
  function render(){
    var lista = est.clientes.filter(function(c){ return !est.busca || (c.nome + " " + (c.razao_social || "")).toLowerCase().indexOf(est.busca.toLowerCase()) >= 0; });
    app.innerHTML = '<div class="app' + (est.min ? " min" : "") + '"><aside class="lado">' +
      '<div class="marca"><img src="assets/logo-branca.png" alt="GROUP3989"><div><b>Sistema G3989</b><small>Gestão interna</small></div><button class="rec" id="bMin" title="Minimizar barra" aria-label="Minimizar barra">' + (est.min ? "›" : "‹") + '</button></div>' +
      '<input class="busca" id="busca" placeholder="Buscar cliente" value="' + esc(est.busca) + '">' +
      '<div class="lista"><div class="rot" style="padding:6px 8px">Menu</div>' +
      '<button class="cli" data-v="hoje" aria-current="' + (est.view === "hoje") + '"><span class="ini">✓</span><span class="tx"><span class="nm">Hoje</span><span class="mt">' + (est.tarefas ? est.tarefas.filter(function(t){ return !t.feito; }).length + ' tarefas abertas' : 'Tarefas do dia') + '</span></span></button>' +
      '<button class="cli" data-v="central" aria-current="' + (est.view === "central") + '"><span class="ini">▦</span><span class="tx"><span class="nm">Central de fechamentos</span><span class="mt">Mensal, cartões e Meta</span></span></button>' +
      '<button class="cli" data-v="registro" aria-current="' + (est.view === "registro") + '"><span class="ini">✎</span><span class="tx"><span class="nm">Registro da carteira</span><span class="mt">Ajustes, decisões e alertas</span></span></button>' +
      '<button class="cli" data-v="inicio" aria-current="' + (est.view === "inicio") + '"><span class="ini">☰</span><span class="tx"><span class="nm">Checklists de entrada</span><span class="mt">Clientes novos</span></span></button>' +
      '<div class="rot" style="padding:12px 8px 6px">Clientes · ' + est.clientes.length + '</div>' +
      lista.map(function(c){ return '<button class="cli" data-c="' + c.id + '" aria-current="' + (est.atual && est.atual.id === c.id && est.view === "cliente") + '" title="' + esc(c.nome) + '"><span class="ini">' + esc(ini(c.nome)) + '</span><span class="tx"><span class="nm">' + esc(c.nome) + '</span><span class="mt">' + esc(rotStatus(c.status)) + ' · ' + (est.progresso[c.id] ? pct(c.id) + '% do checklist' : esc(rotTipos(c.tipos))) + '</span></span></button>'; }).join("") +
      '<button class="cli" data-v="novo" aria-current="' + (est.view === "novo") + '"><span class="ini">+</span><span class="tx"><span class="nm">Novo cliente</span></span></button></div>' +
      '<div class="ferr"><div class="rot" style="padding:4px 8px">Ferramentas</div>' + C.ferramentas.map(function(f){ return '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.nome) + ' ↗</a>'; }).join("") + '</div>' +
      '<div class="pe"><button class="sair" id="bSair">⎋ <span>Sair (' + esc(autor()) + ')</span></button><span style="flex:1"></span><button class="tema" id="bTema" title="Trocar tema claro ou escuro">' + rotTema() + '</button></div></aside>' +
      '<main id="main"></main></div>' +
      '<button class="bt pri" id="bAtualizar" title="Atualizar (R)" style="position:fixed;right:16px;bottom:16px;z-index:9;box-shadow:0 10px 24px -10px rgba(0,0,0,.5)">↻ Atualizar' + (est.atualizadoEm ? ' <small style="opacity:.8;font-weight:400">' + est.atualizadoEm.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"}) + '</small>' : '') + '</button>';
    $("bMin").onclick = function(){ est.min = !est.min; try { localStorage.setItem("g3989:lado-min", est.min ? "1" : "0"); } catch(e){} render(); };
    $("busca").oninput = function(){ est.busca = this.value; var p = this.selectionStart; render(); var b = $("busca"); b.focus(); b.setSelectionRange(p, p); };
    $("bSair").onclick = function(){ sb.auth.signOut(); };
    $("bAtualizar").onclick = atualizar;
    $("bTema").onclick = trocarTema;
    app.querySelectorAll("[data-c]").forEach(function(b){ b.onclick = function(){ est.atual = est.clientes.filter(function(c){ return c.id === b.dataset.c; })[0]; est.view = "cliente"; render(); }; });
    app.querySelectorAll("[data-v]").forEach(function(b){ b.onclick = function(){ est.view = b.dataset.v; est.atual = null; render(); }; });
    if(est.view === "novo") return telaNovo();
    if(est.view === "hoje") return telaHoje();
    if(est.view === "central") return telaCentral();
    if(est.view === "registro") return telaRegistro();
    if(est.view === "cliente" && est.atual) return telaCliente();
    telaInicio();
  }

  /* ---------- início ---------- */
  function telaInicio(){
    var n = function(s){ return est.clientes.filter(function(c){ return c.status === s; }).length; };
    $("main").innerHTML = '<div class="topo"><div><div class="mig">GROUP3989</div><h2>Checklists de entrada</h2></div><span class="esp"></span><button class="bt pri" id="bNovo">+ Novo cliente</button></div><div class="conteudo">' +
      '<div class="kpis"><div class="kpi"><b>' + n("entrada") + '</b><span>Em entrada</span></div><div class="kpi"><b>' + n("teste") + '</b><span>Em teste</span></div><div class="kpi"><b>' + n("ativo") + '</b><span>Ativos</span></div><div class="kpi"><b>' + n("pausado") + '</b><span>Pausados</span></div></div>' +
      (est.clientes.length ? '<div class="cx"><h3>Checklists de entrada</h3><div class="dica">Progresso de cada cliente no checklist.</div>' + est.clientes.filter(function(c){ return c.status !== "saiu"; }).map(function(c){
        return '<div style="margin-top:12px"><div class="linha"><b style="font-family:var(--ui)">' + esc(c.nome) + '</b><span class="selo ' + c.status + '">' + esc(rotStatus(c.status)) + '</span><span class="esp" style="flex:1"></span><span class="msg">' + pct(c.id) + '%</span></div><div class="prog"><span style="width:' + pct(c.id) + '%"></span></div></div>';
      }).join("") + '</div>' : '<div class="vazio"><h3 style="color:var(--tx)">Nenhum cliente ainda</h3><p>Cadastre o primeiro cliente para gerar o checklist de entrada e o link do formulário.</p></div>') + '</div>';
    $("bNovo").onclick = function(){ est.view = "novo"; render(); };
  }



  /* ---------- Hoje: tarefas que o Claude cria e o Thiago marca ---------- */
  function diaLocal(mais){ var d = new Date(); d.setDate(d.getDate() + mais); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  /* seções da tela Hoje: urgentes no topo, depois atrasadas, hoje e o futuro; dentro de cada uma, a ordem que o Thiago arrastou e depois o prazo */
  function secoesHoje(abertas){
    var hoje = diaLocal(0), amanha = diaLocal(1), limite = diaLocal(7), S = [];
    function add(k, titulo, filtro, cor){ var L = abertas.filter(filtro); S.push({k:k, titulo:titulo, itens:L, cor:cor}); }
    function ord(a, b){ return ((a.ordem || 0) - (b.ordem || 0)) || String(a.prazo || "9999").localeCompare(String(b.prazo || "9999")) || (a.prioridade - b.prioridade); }
    add("urg", "Urgentes", function(t){ return t.prioridade === 1; }, "al");
    var resto = function(t){ return t.prioridade !== 1; };
    add("atr", "Atrasadas", function(t){ return resto(t) && t.prazo && t.prazo < hoje; }, "al");
    add(hoje, "Hoje", function(t){ return resto(t) && t.prazo === hoje; }, "ciano");
    add(amanha, "Amanhã", function(t){ return resto(t) && t.prazo === amanha; });
    add("sem7", "Próximos 7 dias", function(t){ return resto(t) && t.prazo && t.prazo > amanha && t.prazo <= limite; });
    add("dep", "Mais pra frente", function(t){ return resto(t) && t.prazo && t.prazo > limite; });
    add("sem", "Sem prazo", function(t){ return resto(t) && !t.prazo; });
    S.forEach(function(x){ x.itens.sort(ord); });
    return S.filter(function(x){ return x.itens.length; });
  }
  function ehPessoal(t){ return /^pessoal$/i.test(String(t.grupo || "").trim()); }
  function lerAbertos(){ try { return JSON.parse(localStorage.getItem("g3989:hoje-abertos") || "{}"); } catch(e){ return {}; } }
  function gravarAbertos(m){ try { localStorage.setItem("g3989:hoje-abertos", JSON.stringify(m)); } catch(e){} }
  function telaHoje(){
    var T = est.tarefas;
    if(T === null){ $("main").innerHTML = '<div class="topo"><div><div class="mig">GROUP3989</div><h2>Hoje</h2></div></div><div class="conteudo"><div class="vazio">A tabela de tarefas ainda não existe. Rode o SQL 004 no Supabase.</div></div>'; return; }
    var hoje = diaLocal(0);
    if(!est.filtroHoje){ try { est.filtroHoje = localStorage.getItem("g3989:hoje-filtro") || "tudo"; } catch(e){ est.filtroHoje = "tudo"; } }
    var filtro = est.filtroHoje, aberto = lerAbertos();
    var passa = function(t){ return filtro === "tudo" || (filtro === "pessoal" ? ehPessoal(t) : !ehPessoal(t)); };
    var abertas = T.filter(function(t){ return !t.feito && passa(t); }), feitasHoje = T.filter(function(t){ return t.feito && passa(t) && String(t.feito_em || "").slice(0, 10) === hoje; });
    function chave(t){ return (t.feito ? "1" : "0") + String(t.ordem || 0).padStart(4, "0") + (t.prazo || "9999-12-31") + t.prioridade; }
    var vis = abertas.slice().sort(function(a, b){ return chave(a).localeCompare(chave(b)); });
    var grupos = []; T.forEach(function(t){ if(grupos.indexOf(t.grupo) < 0) grupos.push(t.grupo); });
    var secoes = secoesHoje(vis);
    var urg = abertas.filter(function(t){ return t.prioridade === 1; }).length, atrasadas = abertas.filter(function(t){ return t.prioridade !== 1 && t.prazo && t.prazo < hoje; }).length, deHoje = abertas.filter(function(t){ return t.prioridade !== 1 && t.prazo === hoje; }).length;
    var tot = abertas.length + feitasHoje.length, p = tot ? Math.round(100 * feitasHoje.length / tot) : 0;
    var dataTxt = new Date().toLocaleDateString("pt-BR", {weekday:"long", day:"2-digit", month:"long"});
    var nP = T.filter(function(t){ return !t.feito && ehPessoal(t); }).length, nE = T.filter(function(t){ return !t.feito && !ehPessoal(t); }).length;
    function chip(v, rot, n){ return '<button class="chipf" data-filtro="' + v + '" aria-pressed="' + (filtro === v) + '">' + rot + ' <small>' + n + '</small></button>'; }
    function abertoPadrao(k){ return k === "urg" || k === "atr" || k === hoje; }
    function itemHTML(t){
      var cli = t.cliente_id ? cliPorId(t.cliente_id) : null;
      if(est.editT === t.id) return '<form class="item" data-fe="' + t.id + '" style="grid-template-columns:1fr;gap:8px">' +
        '<div class="g2"><div class="campo"><label>Tarefa</label><input name="texto" value="' + esc(t.texto) + '" required></div><div class="campo"><label>Grupo</label><input name="grupo" value="' + esc(t.grupo) + '" list="gruposT"></div></div>' +
        '<div class="campo"><label>Detalhe</label><input name="detalhe" value="' + esc(t.detalhe || "") + '"></div>' +
        '<div class="campo"><label>Observação ou motivo de não ter feito</label><input name="observacao" value="' + esc(t.observacao || "") + '"></div>' +
        '<div class="g2"><div class="campo"><label>Prazo</label><input name="prazo" type="date" value="' + esc(t.prazo || "") + '"></div><div class="campo"><label>Prioridade</label><select name="prioridade"><option value="1"' + (t.prioridade === 1 ? " selected" : "") + '>Urgente</option><option value="2"' + (t.prioridade === 2 ? " selected" : "") + '>Normal</option><option value="3"' + (t.prioridade === 3 ? " selected" : "") + '>Sem pressa</option></select></div></div>' +
        '<div class="quando">' + esc(/^virada:/.test(t.origem || "") ? "Veio da Virada" : "Criada por " + (t.criado_por || "")) + '</div>' +
        '<div class="linha"><button class="bt pri p" type="submit">Salvar</button><button class="bt p" type="button" data-cancela="1">Cancelar</button><span style="flex:1"></span><button class="bt p perigo" type="button" data-apaga="' + t.id + '">Excluir tarefa</button></div></form>';
      var atras = t.prazo && t.prazo < hoje;
      var quando = t.prazo ? (atras ? "atrasada, " : t.prazo === hoje ? "hoje, " : "") + t.prazo.split("-").reverse().slice(0, 2).join("/") : "sem prazo";
      return '<div class="item arrastavel compacto" data-id="' + t.id + '"><div class="pega"><span class="alca" title="Arraste para mudar a ordem ou o prazo" aria-label="Arrastar">⋮⋮</span><button class="tick" role="checkbox" aria-checked="false" aria-label="Marcar como feita" data-tf="' + t.id + '"></button></div>' +
        '<div><div class="itx">' + esc(t.texto) + '</div>' +
        '<div class="quando"><span' + (atras ? ' style="color:var(--al)"' : "") + '>' + esc(quando) + '</span>' + (cli ? ' · <button class="lk" data-abre="' + cli.id + '">' + esc(cli.nome) + '</button>' : "") + (t.detalhe ? ' · ' + esc(t.detalhe) : "") + (t.observacao ? ' · <i>' + esc(t.observacao) + '</i>' : "") + '</div></div>' +
        '<div class="tags"><button class="selo manual" style="border:0;cursor:pointer" data-edita="' + t.id + '" title="Editar, mudar prazo, prioridade ou observação">✎</button></div></div>';
    }
    function corpoSecao(sec){
      var porG = {}, ordemG = [];
      sec.itens.forEach(function(t){ if(!porG[t.grupo]){ porG[t.grupo] = []; ordemG.push(t.grupo); } porG[t.grupo].push(t); });
      if(ordemG.length <= 1 || sec.itens.length <= 4) return '<div class="arrasta" data-secao="' + esc(sec.k) + '">' + sec.itens.map(itemHTML).join("") + '</div>';
      return ordemG.map(function(g){
        var id = sec.k + "|" + g, L = porG[g], ab = aberto[id] !== undefined ? aberto[id] : L.length <= 2;
        return '<details class="sub" data-ab="' + esc(id) + '"' + (ab ? " open" : "") + '><summary>' + esc(g) + ' <small>' + L.length + '</small></summary><div class="arrasta" data-secao="' + esc(sec.k) + '">' + L.map(itemHTML).join("") + '</div></details>';
      }).join("");
    }
    $("main").innerHTML = '<div class="topo"><div><div class="mig">' + esc(dataTxt) + '</div><h2>Hoje</h2></div><span class="esp"></span>' +
      '<button class="bt p" id="bVerFeitas">' + (est.verFeitas ? "← Voltar para as abertas" : "Feitas (" + T.filter(function(t){ return t.feito; }).length + ")") + '</button><button class="bt p" id="bNova">+ Nova</button><button class="bt p pri" id="bClaudeHoje">Copiar para o Claude</button><span id="hMsg" class="msg"></span></div>' +
      '<div class="conteudo"><div class="cx"><div class="linha" style="gap:6px">' + chip("tudo", "Tudo", nP + nE) + chip("empresa", "Empresa", nE) + chip("pessoal", "Pessoal", nP) + '</div>' +
      '<div class="resumoHoje">' + (urg ? '<span class="r al">' + urg + ' urgentes</span>' : "") + (atrasadas ? '<span class="r al">' + atrasadas + ' atrasadas</span>' : "") + '<span class="r ci">' + deHoje + ' para hoje</span><span class="r">' + feitasHoje.length + ' feitas hoje</span><span class="r">' + abertas.length + ' abertas</span></div><div class="prog"><span style="width:' + p + '%"></span></div>' +
      '<form class="linha" id="fTarefa" style="margin-top:12px' + (est.novaAberta ? "" : ";display:none") + '"><input class="busca" id="tTexto" style="margin:0;flex:2 1 240px" placeholder="Nova tarefa" required><input class="busca" id="tGrupo" style="margin:0;flex:1 1 140px" placeholder="Grupo (ex.: Trendyce ou Pessoal)" list="gruposT"><datalist id="gruposT">' + grupos.map(function(g){ return '<option value="' + esc(g) + '">'; }).join("") + '</datalist>' +
      '<input class="busca" id="tPrazo" type="date" style="margin:0;width:auto" value="' + hoje + '" title="Prazo"><select class="busca" id="tPri" style="margin:0;width:auto"><option value="1">Urgente</option><option value="2" selected>Normal</option><option value="3">Sem pressa</option></select><button class="bt pri" type="submit">Adicionar</button></form></div>' +
      (vis.length ? secoes.map(function(sec){
        var ab = aberto[sec.k] !== undefined ? aberto[sec.k] : abertoPadrao(sec.k);
        return '<details class="bloco secao" data-ab="' + esc(sec.k) + '"' + (ab ? " open" : "") + '><summary><h4' + (sec.cor ? ' style="color:var(--' + sec.cor + ')"' : "") + '>' + esc(sec.titulo) + ' <small>' + sec.itens.length + '</small></h4></summary>' + corpoSecao(sec) + '</details>';
      }).join("") : '<div class="vazio">Nenhuma tarefa aberta' + (filtro !== "tudo" ? " neste filtro" : "") + '.</div>') + '</div>';
    document.querySelectorAll("details[data-ab]").forEach(function(d){ d.addEventListener("toggle", function(){ var m = lerAbertos(); m[d.dataset.ab] = d.open; gravarAbertos(m); }); });
    document.querySelectorAll("[data-filtro]").forEach(function(b){ b.onclick = function(){ est.filtroHoje = b.dataset.filtro; try { localStorage.setItem("g3989:hoje-filtro", est.filtroHoje); } catch(e){} telaHoje(); }; });
    $("bNova").onclick = function(){ est.novaAberta = !est.novaAberta; telaHoje(); if(est.novaAberta) $("tTexto").focus(); };
    $("bVerFeitas").onclick = function(){ est.verFeitas = !est.verFeitas; telaHoje(); };
    ligarArrastar(T);
    if(est.verFeitas) return historicoFeitas(T);
    document.querySelectorAll("[data-abre]").forEach(function(b){ b.onclick = function(){ abrirCliente(b.dataset.abre); }; });
    document.querySelectorAll("[data-tf]").forEach(function(b){ b.onclick = function(){
      var t = T.filter(function(x){ return x.id === b.dataset.tf; })[0], novo = !t.feito; b.disabled = true;
      var u = {feito:novo, feito_em:novo ? new Date().toISOString() : null, feito_por:novo ? autor() : null};
      sb.from("tarefas").update(u).eq("id", t.id).then(function(r){ if(r.error){ b.disabled = false; return alertaErro(r.error); } Object.assign(t, u); render(); });
    }; });
    document.querySelectorAll("[data-tp]").forEach(function(inp){ inp.onchange = function(){
      var t = T.filter(function(x){ return x.id === inp.dataset.tp; })[0], v = inp.value || null;
      sb.from("tarefas").update({prazo:v, editado:true}).eq("id", t.id).then(function(r){ if(r.error) return alertaErro(r.error); t.prazo = v; telaHoje(); });
    }; });
    document.querySelectorAll("[data-edita]").forEach(function(b){ b.onclick = function(){ est.editT = b.dataset.edita; telaHoje(); }; });
    document.querySelectorAll("[data-cancela]").forEach(function(b){ b.onclick = function(){ est.editT = null; telaHoje(); }; });
    document.querySelectorAll("[data-apaga]").forEach(function(b){ var conf = false; b.onclick = function(){
      if(!conf){ conf = true; b.textContent = "Clique de novo para excluir"; return; }
      sb.from("tarefas").delete().eq("id", b.dataset.apaga).then(function(r){ if(r.error) return alertaErro(r.error); est.tarefas = T.filter(function(x){ return x.id !== b.dataset.apaga; }); est.editT = null; render(); });
    }; });
    document.querySelectorAll("[data-fe]").forEach(function(f){ f.onsubmit = function(ev){
      ev.preventDefault();
      var t = T.filter(function(x){ return x.id === f.dataset.fe; })[0], el = f.elements;
      var u = {texto:el.texto.value.trim(), grupo:el.grupo.value.trim() || "Geral", detalhe:el.detalhe.value.trim() || null, observacao:el.observacao.value.trim() || null, prazo:el.prazo.value || null, prioridade:+el.prioridade.value, editado:true};
      sb.from("tarefas").update(u).eq("id", t.id).then(function(r){ if(r.error) return alertaErro(r.error); Object.assign(t, u); est.editT = null; telaHoje(); });
    }; });
    document.querySelectorAll("[data-to]").forEach(function(inp){ inp.onchange = function(){
      var t = T.filter(function(x){ return x.id === inp.dataset.to; })[0], v = inp.value.trim() || null;
      sb.from("tarefas").update({observacao:v}).eq("id", t.id).then(function(r){ inp.style.borderColor = r.error ? "var(--al)" : "var(--ok)"; if(!r.error) t.observacao = v; });
    }; });
    $("fTarefa").onsubmit = function(ev){
      ev.preventDefault();
      var d = {texto:$("tTexto").value.trim(), grupo:$("tGrupo").value.trim() || "Geral", prioridade:+$("tPri").value, prazo:$("tPrazo").value || null, criado_por:autor()};
      sb.from("tarefas").insert(d).select().single().then(function(r){ if(r.error) return alertaErro(r.error); T.push(r.data); render(); });
    };
    $("bClaudeHoje").onclick = function(){
      var feitas = T.filter(function(t){ return t.feito && String(t.feito_em || "").slice(0, 10) === hoje; }), L = ["Claude, situação das tarefas de hoje no Sistema G3989:", "", "FEITAS HOJE (" + feitas.length + "):"];
      feitas.forEach(function(t){ L.push("- " + t.texto + (t.observacao ? " (obs.: " + t.observacao + ")" : "")); });
      L.push("", "ABERTAS (" + abertas.length + "):");
      abertas.slice().sort(function(a, b){ return chave(a).localeCompare(chave(b)); }).forEach(function(t){ L.push("- " + (t.prazo ? t.prazo.split("-").reverse().slice(0, 2).join("/") + " " : "sem prazo ") + "[" + t.grupo + "] " + t.texto + (t.observacao ? " | motivo: " + t.observacao : "")); });
      L.push("", "Lê a tabela de tarefas no Supabase, registra o que precisa e me diz o próximo passo de cada aberta.");
      copiar(L.join("\n"), $("hMsg"), "Copiado. Cole no chat do Claude.");
    };
  }

  /* arrastar: muda a ordem dentro da seção; levar para outra seção muda o prazo (Hoje, Amanhã, dia) ou a prioridade (Urgentes) */
  function ligarArrastar(T){
    if(!window.Sortable || est.verFeitas) return;
    document.querySelectorAll(".arrasta").forEach(function(lista){
      Sortable.create(lista, {group:"tarefas", handle:".alca", animation:150, ghostClass:"fantasma", delay:120, delayOnTouchOnly:true,
        onEnd:function(ev){
          var destino = ev.to, origem = ev.from, mudancas = [];
          var movida = ev.item && ev.item.dataset.id, k = destino.dataset.secao;
          [destino].concat(origem !== destino ? [origem] : []).forEach(function(el){
            Array.from(el.querySelectorAll(":scope > .item[data-id]")).forEach(function(it, i){
              var t = T.filter(function(x){ return x.id === it.dataset.id; })[0]; if(!t) return;
              var u = {ordem:i + 1};
              if(origem !== destino && t.id === movida && el === destino){
                u.editado = true;
                if(k === "urg") u.prioridade = 1;
                else {
                  if(t.prioridade === 1) u.prioridade = 2;
                  if(/^\d{4}-\d{2}-\d{2}$/.test(k)) u.prazo = k;
                  else if(k === "sem") u.prazo = null;
                }
              }
              var mudou = Object.keys(u).some(function(c){ return t[c] !== u[c]; });
              if(mudou){ Object.assign(t, u); mudancas.push([t.id, u]); }
            });
          });
          Promise.all(mudancas.map(function(m){ return sb.from("tarefas").update(m[1]).eq("id", m[0]); })).then(function(r){
            var erro = r.filter(function(x){ return x.error; })[0]; if(erro) alertaErro(erro.error);
            if(origem !== destino) telaHoje();
          });
        }});
    });
  }

  /* histórico: tudo o que foi feito, do mais recente para o mais antigo, agrupado por dia; dá para desfazer */
  function historicoFeitas(T){
    var F = T.filter(function(t){ return t.feito; }).sort(function(a, b){ return String(b.feito_em).localeCompare(String(a.feito_em)); }), dias = [];
    F.forEach(function(t){ var d = String(t.feito_em || "").slice(0, 10); if(dias.indexOf(d) < 0) dias.push(d); });
    var c = document.querySelector(".conteudo");
    c.innerHTML = '<div class="cx"><h3>Histórico de feitas</h3><div class="dica">' + F.length + ' tarefas concluídas. Desfazer devolve a tarefa para a lista de abertas.</div></div>' +
      (F.length ? dias.map(function(d){
        var L = F.filter(function(t){ return String(t.feito_em || "").slice(0, 10) === d; });
        return '<div class="bloco"><h4>' + esc(d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {weekday:"long", day:"2-digit", month:"2-digit"}) : "Sem data") + ' <small>' + L.length + '</small></h4>' + L.map(function(t){
          return '<div class="item feito" style="grid-template-columns:minmax(0,1fr) auto;align-items:center"><div><div class="itx">' + esc(t.texto) + '</div><div class="quando">' + esc(t.grupo) + ' · ' + esc(t.feito_por || "") + ' às ' + new Date(t.feito_em).toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"}) + (t.observacao ? ' · ' + esc(t.observacao) : "") + '</div></div><button class="bt p" data-desfaz="' + t.id + '">Desfazer</button></div>';
        }).join("") + '</div>';
      }).join("") : '<div class="vazio">Nada concluído ainda.</div>');
    c.querySelectorAll("[data-desfaz]").forEach(function(b){ b.onclick = function(){
      var t = T.filter(function(x){ return x.id === b.dataset.desfaz; })[0]; b.disabled = true;
      sb.from("tarefas").update({feito:false, feito_em:null, feito_por:null}).eq("id", t.id).then(function(r){ if(r.error){ b.disabled = false; return alertaErro(r.error); } t.feito = false; t.feito_em = null; t.feito_por = null; render(); });
    }; });
  }

  /* ---------- Central de fechamentos (migrada do claude.ai em 06/10/2026) ---------- */
  var MESES_PT = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  var ST_F = {ok:"Pronto", parcial:"Parcial", pend:"Pendente"};
  var GRUPO = {ecommerce:"E-commerce", mensagem:"Mensagens", lead:"Leads", servicos:"Serviços", avulso:"Avulso"};
  function mesPassado(){ var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
  function rotMes(k){ var n = MESES_PT[+k.split("-")[1] - 1]; return n.charAt(0).toUpperCase() + n.slice(1) + " " + k.split("-")[0]; }
  function nomeMes(k){ return MESES_PT[+k.split("-")[1] - 1]; }
  function grupoDe(c){ var t = (c.tipos || [])[0]; return GRUPO[t] || "Outros"; }
  function cliPorId(id){ return est.clientes.filter(function(c){ return c.id === id; })[0]; }
  function abrirCliente(id, aba){ est.atual = cliPorId(id); est.view = "cliente"; if(aba) est.aba = aba; render(); }

  function telaCentral(){
    var mp = mesPassado(), meses = {};
    (est.fech || []).forEach(function(f){ meses[f.mes] = 1; }); meses[mp] = 1;
    var ks = Object.keys(meses).sort().reverse();
    if(!est.mesC || !meses[est.mesC]) est.mesC = (est.fech || []).some(function(f){ return f.mes === mp; }) ? mp : ks[0];
    var doMes = (est.fech || []).filter(function(f){ return f.mes === est.mesC; }).map(function(f){ return Object.assign({c:cliPorId(f.cliente_id)}, f); }).filter(function(f){ return f.c; });
    var grupos = ["Todos"].concat(Object.keys(GRUPO).map(function(k){ return GRUPO[k]; }).filter(function(g){ return doMes.some(function(f){ return grupoDe(f.c) === g; }); }));
    est.grupoC = grupos.indexOf(est.grupoC) >= 0 ? est.grupoC : "Todos";
    var q = (est.buscaC || "").toLowerCase();
    var vis = doMes.filter(function(f){ return (est.grupoC === "Todos" || grupoDe(f.c) === est.grupoC) && (!q || (f.c.nome + " " + (f.c.descricao || "")).toLowerCase().indexOf(q) >= 0); })
      .sort(function(a, b){ return a.c.nome.localeCompare(b.c.nome, "pt-BR"); });
    var n = function(fn){ return doMes.filter(fn).length; };
    var meta = (est.metaRel || []).filter(function(x){ return x.mes === mp; })[0], antigos = (est.metaRel || []).filter(function(x){ return x.mes !== mp; }).sort(function(a, b){ return b.mes.localeCompare(a.mes); });
    var vir = C.ferramentas.filter(function(f){ return /Virada/.test(f.nome); })[0], sem = C.ferramentas.filter(function(f){ return /Semanal/.test(f.nome); })[0];
    $("main").innerHTML = '<div class="topo"><div><div class="mig">GROUP3989 · Central</div><h2>Fechamentos de ' + esc(nomeMes(est.mesC)) + '</h2></div><span class="esp"></span>' +
      '<select class="busca" id="cMes" style="margin:0;width:auto">' + ks.map(function(k){ return '<option value="' + k + '"' + (k === est.mesC ? " selected" : "") + '>' + esc(rotMes(k)) + (k === mp ? " · mês passado" : "") + '</option>'; }).join("") + '</select></div>' +
      '<div class="conteudo"><div class="kpis"><div class="kpi"><b>' + n(function(f){ return f.url; }) + '</b><span>Cartões publicados</span></div><div class="kpi"><b>' + n(function(f){ return f.status === "parcial"; }) + '</b><span>Parciais</span></div><div class="kpi"><b>' + n(function(f){ return f.status === "pend"; }) + '</b><span>Pendentes</span></div><div class="kpi"><b>' + n(function(f){ return f.enviado; }) + ' de ' + doMes.length + '</b><span>Enviados ao cliente</span></div></div>' +
      '<div class="cx"><div class="linha"><input class="busca" id="cBusca" style="margin:0;flex:1 1 220px" placeholder="Buscar cliente" value="' + esc(est.buscaC || "") + '"><div class="opcoes">' + grupos.map(function(g){ return '<label class="op"><input type="radio" name="grupoC" value="' + esc(g) + '"' + (g === est.grupoC ? " checked" : "") + '><span>' + esc(g) + '</span></label>'; }).join("") + '</div></div>' +
      (doMes.length ? vis.map(function(f){
        return '<div class="item" style="grid-template-columns:minmax(0,2fr) minmax(0,1.3fr) auto;align-items:center;margin-top:8px;border-left:4px solid ' + (f.status === "ok" ? "var(--ok)" : f.status === "parcial" ? "var(--av)" : "var(--linha2)") + '">' +
          '<div><button class="bt p" style="border:0;background:none;padding:0;font-weight:600;font-family:var(--ui);font-size:14px" data-abre="' + f.c.id + '">' + esc(f.c.nome) + '</button><div class="quando">' + esc(f.c.descricao || grupoDe(f.c)) + '</div></div>' +
          '<div><b style="font-family:var(--ui);font-size:17px">' + esc(f.destaque || "") + '</b><div class="quando">' + esc(f.rotulo || "") + '</div></div>' +
          '<div class="linha" style="justify-content:flex-end"><span class="selo ' + (f.status === "ok" ? "ativo" : f.status === "parcial" ? "teste" : "pausado") + '">' + ST_F[f.status] + '</span>' +
          (f.url ? '<label class="op"><input type="checkbox" data-env="' + f.id + '"' + (f.enviado ? " checked" : "") + '><span>Enviado</span></label><a class="bt p pri" href="' + esc(f.url) + '" target="_blank" rel="noopener">Abrir cartão</a>' : '<span class="quando">Sem cartão</span>') + '</div>' +
          (f.nota ? '<div class="quando" style="grid-column:1/-1;border-top:1px dashed var(--linha);padding-top:6px">' + esc(f.nota) + '</div>' : "") + '</div>';
      }).join("") || '<div class="dica" style="margin-top:12px">Nenhum cliente com esse filtro.</div>' : '<div class="vazio">Os fechamentos de ' + esc(nomeMes(est.mesC)) + ' ainda não foram montados. Peça ao Claude: "monta os fechamentos de ' + esc(nomeMes(est.mesC)) + '".</div>') + '</div>' +
      '<div class="cx"><h3>Ferramentas</h3><div class="g3" style="margin-top:12px">' +
        (vir ? '<a class="kpi" style="text-decoration:none;color:inherit" href="' + esc(vir.url) + '" target="_blank" rel="noopener"><b style="font-size:15px">Virada de Mês ↗</b><span>Planejamento mensal por cliente</span></a>' : "") +
        (sem ? '<a class="kpi" style="text-decoration:none;color:inherit" href="' + esc(sem.url) + '" target="_blank" rel="noopener"><b style="font-size:15px">Relatório semanal ↗</b><span>Semana a semana por cliente</span></a>' : "") +
        (meta ? '<a class="kpi" style="text-decoration:none;color:inherit" href="' + esc(meta.url) + '" target="_blank" rel="noopener"><b style="font-size:15px">Relatório Meta de ' + esc(nomeMes(mp)) + ' ↗</b><span>Todas as contas da BM1</span></a>' : '<div class="kpi" style="border-style:dashed"><b style="font-size:15px">Relatório Meta de ' + esc(nomeMes(mp)) + '</b><span>Ainda não montado. Peça ao Claude.</span></div>') +
      '</div>' + (antigos.length ? '<div class="dica" style="margin-top:10px">Relatórios Meta anteriores: ' + antigos.map(function(x){ return '<a href="' + esc(x.url) + '" target="_blank" rel="noopener" style="color:var(--ciano)">' + esc(rotMes(x.mes)) + '</a>'; }).join(" · ") + '</div>' : "") + '</div>' +
      '<div class="dica">Regra dos cartões: investimento é o gasto da Meta mais 13% (Kelly 8%). Custo de cada resultado sempre pela campanha dele.</div></div>';
    $("cMes").onchange = function(){ est.mesC = this.value; telaCentral(); };
    $("cBusca").oninput = function(){ est.buscaC = this.value; var p = this.selectionStart; telaCentral(); var b = $("cBusca"); b.focus(); b.setSelectionRange(p, p); };
    document.querySelectorAll('input[name="grupoC"]').forEach(function(x){ x.onchange = function(){ est.grupoC = x.value; telaCentral(); }; });
    document.querySelectorAll("[data-abre]").forEach(function(b){ b.onclick = function(){ abrirCliente(b.dataset.abre, "fechamentos"); }; });
    document.querySelectorAll("[data-env]").forEach(function(x){ x.onchange = function(){
      var v = x.checked, f = (est.fech || []).filter(function(y){ return y.id === x.dataset.env; })[0];
      sb.from("fechamentos").update({enviado:v, enviado_em:v ? new Date().toISOString() : null}).eq("id", x.dataset.env).then(function(u){ if(u.error){ x.checked = !v; return alertaErro(u.error); } if(f) f.enviado = v; telaCentral(); });
    }; });
  }

  function abaFechamentos(c){
    var L = (est.fech || []).filter(function(f){ return f.cliente_id === c.id; }).sort(function(a, b){ return b.mes.localeCompare(a.mes); });
    $("corpo").innerHTML = '<div class="cx"><h3>Fechamentos mensais</h3><div class="dica">Um cartão por mês. O semanal deste cliente fica no Relatório Semanal.</div>' +
      (L.length ? L.map(function(f){ return '<div class="item" style="grid-template-columns:minmax(0,1fr) auto;align-items:center"><div><b style="font-family:var(--ui);font-size:16px">' + esc(f.destaque || "") + '</b> <span class="quando">' + esc(f.rotulo || "") + '</span><div class="quando">' + esc(rotMes(f.mes)) + ' · ' + ST_F[f.status] + (f.enviado ? " · enviado" : "") + '</div>' + (f.nota ? '<div class="quando">' + esc(f.nota) + '</div>' : "") + '</div>' +
        (f.url ? '<a class="bt p pri" href="' + esc(f.url) + '" target="_blank" rel="noopener">Abrir cartão</a>' : '<span class="quando">Sem cartão</span>') + '</div>'; }).join("") : '<div class="dica">Ainda sem fechamento mensal.</div>') + '</div>';
  }

  function telaRegistro(){
    $("main").innerHTML = '<div class="topo"><div><div class="mig">Central</div><h2>Registro da carteira</h2></div></div><div class="conteudo" id="corpoReg"><div class="carregando">Carregando…</div></div>';
    sb.from("registro").select("*").order("criado_em", {ascending:false}).limit(500).then(function(r){
      var L = r.data || [], TIP = [["todos","Todos"],["nota","Nota"],["ajuste","Ajuste"],["decisao","Decisão"],["resultado","Resultado"],["alerta","Alerta"],["pendencia","Pendência"]];
      est.tipoR = est.tipoR || "todos";
      function pinta(){
        var q = (est.buscaR || "").toLowerCase();
        var vis = L.filter(function(x){ var c = cliPorId(x.cliente_id); return (est.tipoR === "todos" || x.tipo === est.tipoR) && (!q || (x.texto + " " + (c ? c.nome : "")).toLowerCase().indexOf(q) >= 0); });
        $("corpoReg").innerHTML = '<div class="cx"><div class="linha"><input class="busca" id="rBusca" style="margin:0;flex:1 1 220px" placeholder="Buscar no registro" value="' + esc(est.buscaR || "") + '"><div class="opcoes">' + TIP.map(function(t){ return '<label class="op"><input type="radio" name="tipoR" value="' + t[0] + '"' + (est.tipoR === t[0] ? " checked" : "") + '><span>' + t[1] + '</span></label>'; }).join("") + '</div></div>' +
          (vis.length ? vis.map(function(x){ var c = cliPorId(x.cliente_id); return '<div class="reg ' + x.tipo + '"><div class="cab"><b>' + esc(x.autor) + '</b><span>' + esc(x.tipo) + '</span><span>' + dataBR(x.criado_em) + '</span>' + (c ? '<button class="bt p" style="padding:0 6px;border:0;background:none;color:var(--ciano)" data-abre="' + c.id + '">' + esc(c.nome) + '</button>' : "") + '</div>' + esc(x.texto) + '</div>'; }).join("") : '<div class="dica" style="margin-top:12px">Nada encontrado.</div>') + '</div>';
        $("rBusca").oninput = function(){ est.buscaR = this.value; var p = this.selectionStart; pinta(); var b = $("rBusca"); b.focus(); b.setSelectionRange(p, p); };
        document.querySelectorAll('input[name="tipoR"]').forEach(function(x){ x.onchange = function(){ est.tipoR = x.value; pinta(); }; });
        document.querySelectorAll("[data-abre]").forEach(function(b){ b.onclick = function(){ abrirCliente(b.dataset.abre, "registro"); }; });
      }
      pinta();
    });
  }

  /* ---------- novo cliente ---------- */
  function opcoesTipos(sel){ return '<div class="opcoes">' + TIPOS.map(function(t){ return '<label class="op"><input type="checkbox" name="tipo" value="' + t[0] + '"' + ((sel || []).indexOf(t[0]) >= 0 ? " checked" : "") + '><span>' + t[1] + '</span></label>'; }).join("") + '</div>'; }
  function lerTipos(){ return Array.from(document.querySelectorAll('input[name="tipo"]:checked')).map(function(x){ return x.value; }); }
  function telaNovo(){
    $("main").innerHTML = '<div class="topo"><div><div class="mig">Clientes</div><h2>Novo cliente</h2></div></div><div class="conteudo"><form class="cx" id="fNovo">' +
      '<div class="g2"><div class="campo"><label for="nNome">Nome da marca ou loja</label><input id="nNome" required></div>' +
      '<div class="campo"><label for="nResp">Responsável</label><input id="nResp"></div>' +
      '<div class="campo"><label for="nSeg">Segmento</label><input id="nSeg" placeholder="Moda feminina, estética, colchões"></div>' +
      '<div class="campo"><label for="nStatus">Status</label><select id="nStatus">' + STATUS.map(function(s){ return '<option value="' + s[0] + '"' + (s[0] === "teste" ? " selected" : "") + '>' + s[1] + '</option>'; }).join("") + '</select></div></div>' +
      '<div class="campo" style="margin-top:12px"><label>Tipo de cliente (gera o checklist certo)</label>' + opcoesTipos([]) + '</div>' +
      '<div class="linha" style="margin-top:16px"><button class="bt pri" type="submit">Cadastrar e gerar checklist</button><span id="nMsg" class="msg"></span></div></form></div>';
    $("fNovo").onsubmit = function(ev){
      ev.preventDefault();
      var tipos = lerTipos(), m = $("nMsg");
      if(!tipos.length){ m.className = "msg erro"; m.textContent = "Marque pelo menos um tipo."; return; }
      m.className = "msg"; m.textContent = "Salvando…";
      var dados = {nome:$("nNome").value.trim(), responsavel:$("nResp").value.trim() || null, segmento:$("nSeg").value.trim() || null, status:$("nStatus").value, tipos:tipos};
      if(dados.status === "teste") dados.inicio_teste = new Date().toISOString().slice(0, 10);
      sb.from("clientes").insert(dados).select().single().then(function(r){
        if(r.error) throw r.error;
        return sb.rpc("gerar_checklist", {p_cliente:r.data.id}).then(function(g){ if(g.error) throw g.error; return r.data; });
      }).then(function(c){
        return sb.from("registro").insert({cliente_id:c.id, autor:autor(), tipo:"nota", texto:"Cliente cadastrado (" + rotTipos(c.tipos) + ")."}).then(function(){ return c; });
      }).then(function(c){ return carregar().then(function(){ est.atual = est.clientes.filter(function(x){ return x.id === c.id; })[0]; est.view = "cliente"; est.aba = "checklist"; render(); }); })
        .catch(function(e){ m.className = "msg erro"; m.textContent = erroMsg(e); });
    };
  }

  /* ---------- cliente ---------- */
  function telaCliente(){
    var c = est.atual, ABAS = [["checklist","Checklist"],["fechamentos","Fechamentos"],["ficha","Ficha e IDs"],["cadastro","Formulário"],["registro","Registro"]];
    $("main").innerHTML = '<div class="topo"><div><div class="mig">' + esc(rotTipos(c.tipos) || "Cliente") + '</div><h2>' + esc(c.nome) + ' <span class="selo ' + c.status + '">' + esc(rotStatus(c.status)) + '</span></h2></div><span class="esp"></span>' +
      '<div class="abas">' + ABAS.map(function(a){ return '<button class="aba" data-a="' + a[0] + '" aria-selected="' + (est.aba === a[0]) + '">' + a[1] + '</button>'; }).join("") + '</div></div><div class="conteudo" id="corpo"><div class="carregando">Carregando…</div></div>';
    document.querySelectorAll("[data-a]").forEach(function(b){ b.onclick = function(){ est.aba = b.dataset.a; telaCliente(); }; });
    ({checklist:abaChecklist, fechamentos:abaFechamentos, ficha:abaFicha, cadastro:abaCadastro, registro:abaRegistro})[est.aba](c);
  }

  function abaChecklist(c){
    sb.from("checklist_cliente").select("*").eq("cliente_id", c.id).order("bloco").order("ordem").then(function(r){
      var itens = r.data || [], corpo = $("corpo");
      if(r.error){ corpo.innerHTML = '<div class="vazio">' + esc(erroMsg(r.error)) + '</div>'; return; }
      var FILTROS = [["todos","Todos"],["pendentes","Pendentes"],["Thiago","Meus"],["Claude","Claude"],["Cliente","Cliente"]];
      var feitos = itens.filter(function(x){ return x.feito; }).length, p = itens.length ? Math.round(100 * feitos / itens.length) : 0;
      var vis = itens.filter(function(x){ return est.filtro === "todos" || (est.filtro === "pendentes" ? !x.feito : x.quem === est.filtro); });
      var blocos = {}; vis.forEach(function(x){ (blocos[x.bloco] = blocos[x.bloco] || []).push(x); });
      var pendApi = itens.filter(function(x){ return !x.feito && x.execucao === "api" && x.quem === "Claude"; });
      corpo.innerHTML = '<div class="cx"><div class="linha"><h3>Checklist de entrada</h3><span style="flex:1"></span><span class="msg">' + feitos + ' de ' + itens.length + ' · ' + p + '%</span></div><div class="prog"><span style="width:' + p + '%"></span></div>' +
        '<div class="linha" style="margin-top:12px"><div class="opcoes">' + FILTROS.map(function(f){ return '<label class="op"><input type="radio" name="filtro" value="' + f[0] + '"' + (est.filtro === f[0] ? " checked" : "") + '><span>' + f[1] + '</span></label>'; }).join("") + '</div><span style="flex:1"></span>' +
        '<button class="bt p" id="bClaude"' + (pendApi.length ? "" : " disabled") + '>Copiar pedido para o Claude (' + pendApi.length + ')</button><span id="cMsg" class="msg"></span></div></div>' +
        (itens.length ? Object.keys(blocos).map(function(b){
          var L = blocos[b], f = L.filter(function(x){ return x.feito; }).length;
          return '<div class="bloco"><h4>' + esc(b) + ' <small>' + f + '/' + L.length + '</small></h4>' + L.map(function(x){
            return '<div class="item' + (x.feito ? " feito" : "") + '"><button class="tick" role="checkbox" aria-checked="' + x.feito + '" aria-label="Marcar como feito" data-t="' + x.id + '">' + (x.feito ? "✓" : "") + '</button>' +
              '<div><div class="itx">' + esc(x.item) + '</div>' + (/link do formul/i.test(x.item) ? '<div class="linha" style="margin-top:6px"><button class="bt p" data-copia-link="1">Copiar link</button><a class="bt p" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(msgForm(c)) + '">Enviar no WhatsApp</a><span class="msg" id="lkMsg"></span></div>' : "") + (x.feito && x.feito_em ? '<div class="quando">Feito por ' + esc(x.feito_por || "") + ' em ' + dataBR(x.feito_em) + '</div>' : "") + '</div>' +
              '<div class="tags"><span class="selo ' + (x.execucao === "api" ? "api" : "manual") + '">' + (x.execucao === "api" ? "API" : "Manual") + '</span><span class="selo manual">' + esc(x.quem) + '</span></div>' +
              '<input class="obs" data-o="' + x.id + '" value="' + esc(x.observacao || "") + '" placeholder="Observação (o motivo, se não fizer)"></div>';
          }).join("") + '</div>';
        }).join("") : '<div class="vazio">Checklist vazio. Marque o tipo do cliente na ficha e salve para gerar.</div>');
      corpo.querySelectorAll('input[name="filtro"]').forEach(function(x){ x.onchange = function(){ est.filtro = x.value; abaChecklist(c); }; });
      corpo.querySelectorAll("[data-t]").forEach(function(b){ b.onclick = function(){
        var it = itens.filter(function(x){ return x.id === b.dataset.t; })[0], novo = !it.feito; b.disabled = true;
        sb.from("checklist_cliente").update({feito:novo, feito_em:novo ? new Date().toISOString() : null, feito_por:novo ? autor() : null}).eq("id", it.id).then(function(u){
          if(u.error){ b.disabled = false; alertaErro(u.error); return; }
          var pr = est.progresso[c.id] = est.progresso[c.id] || {f:0, t:itens.length}; pr.f += novo ? 1 : -1; abaChecklist(c);
        });
      }; });
      corpo.querySelectorAll("[data-copia-link]").forEach(function(b){ b.onclick = function(){ copiar(linkForm(c), $("lkMsg"), "Link copiado"); }; });
      corpo.querySelectorAll("[data-o]").forEach(function(inp){ inp.onchange = function(){ sb.from("checklist_cliente").update({observacao:inp.value.trim() || null}).eq("id", inp.dataset.o).then(function(u){ inp.style.borderColor = u.error ? "var(--al)" : "var(--ok)"; }); }; });
      $("bClaude").onclick = function(){
        var t = ["Claude, executa no Sistema G3989 o que é seu no checklist de entrada do cliente " + c.nome + " (id " + c.id + "):"].concat(pendApi.map(function(x){ return "- " + x.bloco + ": " + x.item + (x.observacao ? " (obs.: " + x.observacao + ")" : ""); }));
        t.push("Lê a ficha e o formulário dele no Supabase, faz o que der via API, marca como feito e grava no registro o que fez e o que ficou pendente.");
        copiar(t.join("\n"), $("cMsg"), "Copiado. Cole no chat do Claude.");
      };
    });
  }
  function alertaErro(e){ var x = document.createElement("div"); x.className = "msg erro"; x.style.cssText = "position:fixed;bottom:16px;right:16px;background:#2a0f16;padding:10px 14px;border-radius:9px;z-index:9"; x.textContent = erroMsg(e); document.body.appendChild(x); setTimeout(function(){ x.remove(); }, 4000); }

  function abaFicha(c){
    var ids = c.ids || {}, f = function(id, rot, v, ph){ return '<div class="campo"><label for="' + id + '">' + rot + '</label><input id="' + id + '" value="' + esc(v || "") + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : "") + '></div>'; };
    $("corpo").innerHTML = '<div class="cx"><h3>Link do formulário do cliente</h3><div class="dica">Mande este link para o cliente preencher. Cada cliente tem o seu; ele não vê nada além do próprio formulário.</div>' +
      '<div class="linha"><div class="link" style="flex:1" id="lnk">' + esc(linkForm(c)) + '</div><button class="bt p" id="bLink">Copiar link</button><span id="lMsg2" class="msg"></span></div></div>' +
      cardFormulario(c) +
      '<form class="cx" id="fFicha"><h3>Dados do cliente</h3><div class="g3" style="margin-top:12px">' +
      f("fNome", "Nome da marca", c.nome) + f("fRazao", "Razão social", c.razao_social) + f("fCnpj", "CNPJ", c.cnpj) +
      f("fResp", "Responsável", c.responsavel) + f("fSeg", "Segmento", c.segmento) + f("fCid", "Cidade", c.cidade) +
      '<div class="campo"><label for="fStatus">Status</label><select id="fStatus">' + STATUS.map(function(s){ return '<option value="' + s[0] + '"' + (s[0] === c.status ? " selected" : "") + '>' + s[1] + '</option>'; }).join("") + '</select></div>' +
      '<div class="campo"><label for="fIni">Início do teste</label><input id="fIni" type="date" value="' + esc(c.inicio_teste || "") + '"></div>' +
      f("fPlat", "Plataforma da loja", c.plataforma_loja, "Nuvemshop, Shopify") + f("fErp", "ERP", c.erp, "Bling, Phibo") + '</div>' +
      '<div class="campo" style="margin-top:12px"><label>Tipo de cliente</label>' + opcoesTipos(c.tipos) + '</div>' +
      '<h3 style="margin-top:20px">IDs para eu executar via API</h3><div class="g3" style="margin-top:12px">' + IDS.map(function(x){ return f("id_" + x[0], x[1], ids[x[0]]); }).join("") + '</div>' +
      '<div class="campo" style="margin-top:12px"><label for="fObs">Observações</label><textarea id="fObs">' + esc(c.observacoes || "") + '</textarea></div>' +
      '<div class="linha" style="margin-top:16px"><button class="bt pri" type="submit">Salvar ficha</button><span id="fMsg" class="msg"></span><span style="flex:1"></span><button class="bt perigo p" type="button" id="bExcluir">Excluir cliente</button></div></form>';
    $("bLink").onclick = function(){ copiar(linkForm(c), $("lMsg2"), "Link copiado"); };
    ligarFormulario(c);
    $("fFicha").onsubmit = function(ev){
      ev.preventDefault();
      var m = $("fMsg"), novosIds = {}; IDS.forEach(function(x){ var v = $("id_" + x[0]).value.trim(); if(v) novosIds[x[0]] = v; });
      var tipos = lerTipos(), mudouTipo = tipos.slice().sort().join() !== (c.tipos || []).slice().sort().join();
      var dados = {nome:$("fNome").value.trim() || c.nome, razao_social:$("fRazao").value.trim() || null, cnpj:$("fCnpj").value.trim() || null, responsavel:$("fResp").value.trim() || null,
        segmento:$("fSeg").value.trim() || null, cidade:$("fCid").value.trim() || null, status:$("fStatus").value, inicio_teste:$("fIni").value || null,
        plataforma_loja:$("fPlat").value.trim() || null, erp:$("fErp").value.trim() || null, tipos:tipos, ids:novosIds, observacoes:$("fObs").value.trim() || null, atualizado_em:new Date().toISOString()};
      m.className = "msg"; m.textContent = "Salvando…";
      sb.from("clientes").update(dados).eq("id", c.id).then(function(u){
        if(u.error) throw u.error;
        return mudouTipo ? sb.rpc("gerar_checklist", {p_cliente:c.id}) : null;
      }).then(function(){ return carregar(); }).then(function(){ render(); var x = $("fMsg"); if(x){ x.className = "msg ok"; x.textContent = "Ficha salva" + (mudouTipo ? " e checklist completado com o novo tipo" : ""); } })
        .catch(function(e){ m.className = "msg erro"; m.textContent = erroMsg(e); });
    };
    var conf = false;
    $("bExcluir").onclick = function(){
      if(!conf){ conf = true; this.textContent = "Clique de novo para excluir de vez"; return; }
      sb.from("clientes").delete().eq("id", c.id).then(function(u){ if(u.error) return alertaErro(u.error); est.atual = null; est.view = "inicio"; carregar().then(render); });
    };
  }

  /* moderar o formulário: valor que você já tem aparece preenchido para o cliente conferir; marcado como "não perguntar", some do formulário */
  function cardFormulario(c){
    var f = c.formulario || {}, pre = f.preenchido || {}, oc = f.ocultos || [];
    return '<form class="cx" id="fForm"><h3>O que perguntar no formulário</h3><div class="dica">Preencha o que você já tem: o cliente recebe preenchido e só confere. Marque "Não perguntar" para o campo nem aparecer. O que veio da ficha já está sugerido.</div>' +
      FORM.map(function(sec){ return '<div class="bloco"><h4>' + esc(sec[0]) + '</h4>' + sec[1].map(function(k){
        var v = pre[k] != null ? pre[k] : daFicha(c, k);
        return '<div class="item" style="grid-template-columns:minmax(140px,220px) minmax(0,1fr) auto;align-items:center"><span class="itx" style="font-size:13px">' + esc(ROT_CAD[k] || k) + '</span>' +
          '<input class="obs" style="grid-column:auto;border-style:solid" data-fv="' + k + '" value="' + esc(v) + '" placeholder="Em branco: o cliente responde">' +
          '<label class="op"><input type="checkbox" data-fo="' + k + '"' + (oc.indexOf(k) >= 0 ? " checked" : "") + '><span>Não perguntar</span></label></div>';
      }).join("") + '</div>'; }).join("") +
      '<div class="linha" style="margin-top:14px"><button class="bt pri" type="submit">Salvar formulário</button><span id="foMsg" class="msg"></span></div></form>';
  }
  function ligarFormulario(c){
    $("fForm").onsubmit = function(ev){
      ev.preventDefault();
      var pre = {}, oc = [];
      document.querySelectorAll("[data-fv]").forEach(function(i){ var v = i.value.trim(); if(v) pre[i.dataset.fv] = v; });
      document.querySelectorAll("[data-fo]:checked").forEach(function(i){ oc.push(i.dataset.fo); });
      var m = $("foMsg"); m.className = "msg"; m.textContent = "Salvando…";
      sb.from("clientes").update({formulario:{preenchido:pre, ocultos:oc}, atualizado_em:new Date().toISOString()}).eq("id", c.id).then(function(u){
        if(u.error){ m.className = "msg erro"; m.textContent = erroMsg(u.error); return; }
        c.formulario = {preenchido:pre, ocultos:oc}; m.className = "msg ok"; m.textContent = "Salvo. " + Object.keys(pre).length + " preenchidos, " + oc.length + " fora do formulário.";
      });
    };
  }
  function abaCadastro(c){
    sb.from("cadastros_cliente").select("*").eq("cliente_id", c.id).order("enviado_em", {ascending:false}).then(function(r){
      var L = r.data || [], corpo = $("corpo");
      if(!L.length){ corpo.innerHTML = '<div class="vazio">O cliente ainda não enviou o formulário.<br>O link está na aba Ficha e IDs.</div>'; return; }
      var d = L[0].dados || {};
      corpo.innerHTML = '<div class="cx"><div class="linha"><h3>Formulário enviado</h3><span style="flex:1"></span><span class="msg">' + dataBR(L[0].enviado_em) + (L.length > 1 ? " · " + L.length + " envios" : "") + '</span></div>' +
        '<dl class="dados" style="margin-top:14px">' + Object.keys(d).map(function(k){ var v = d[k]; if(Array.isArray(v)) v = v.join(", "); else if(v && typeof v === "object") v = JSON.stringify(v); return '<dt>' + esc(ROT_CAD[k] || k) + '</dt><dd>' + esc(v) + '</dd>'; }).join("") + '</dl>' +
        '<div class="linha" style="margin-top:16px"><button class="bt pri" id="bAplicar">Levar para a ficha</button><span id="aMsg" class="msg"></span></div><div class="dica" style="margin-top:6px">Preenche razão social, CNPJ, responsável, segmento, plataforma, ERP e a URL da loja. O que já estiver na ficha é trocado pelo que o cliente mandou.</div></div>';
      $("bAplicar").onclick = function(){
        var ids = Object.assign({}, c.ids || {}); if(d.site) ids.loja_url = d.site; if(d.instagram) ids.instagram = d.instagram;
        var u = {ids:ids, atualizado_em:new Date().toISOString()};
        [["razao_social","razao_social"],["cnpj","cnpj"],["responsavel","responsavel"],["segmento","segmento"],["plataforma_loja","plataforma_loja"],["erp","erp"]].forEach(function(p){ if(d[p[0]]) u[p[1]] = d[p[0]]; });
        sb.from("clientes").update(u).eq("id", c.id).then(function(x){ var m = $("aMsg"); if(x.error){ m.className = "msg erro"; m.textContent = erroMsg(x.error); return; } m.className = "msg ok"; m.textContent = "Ficha atualizada"; carregar(); });
      };
    });
  }

  function abaRegistro(c){
    sb.from("registro").select("*").eq("cliente_id", c.id).order("criado_em", {ascending:false}).limit(200).then(function(r){
      var L = r.data || [];
      $("corpo").innerHTML = '<form class="cx" id="fReg"><h3>Novo registro</h3><div class="dica">Decisão, ajuste, alerta ou pendência. Eu leio isto antes de mexer no cliente e gravo aqui o que fiz.</div>' +
        '<div class="g2" style="grid-template-columns:180px 1fr"><div class="campo"><label for="rTipo">Tipo</label><select id="rTipo"><option value="nota">Nota</option><option value="decisao">Decisão</option><option value="ajuste">Ajuste</option><option value="alerta">Alerta</option><option value="pendencia">Pendência</option><option value="resultado">Resultado</option></select></div>' +
        '<div class="campo"><label for="rTexto">Texto</label><textarea id="rTexto" required></textarea></div></div><div class="linha" style="margin-top:10px"><button class="bt pri" type="submit">Registrar</button><span id="rMsg" class="msg"></span></div></form>' +
        '<div class="cx"><h3>Histórico</h3>' + (L.length ? L.map(function(x){ return '<div class="reg ' + x.tipo + '"><div class="cab"><b>' + esc(x.autor) + '</b><span>' + esc(x.tipo) + '</span><span>' + dataBR(x.criado_em) + '</span></div>' + esc(x.texto) + '</div>'; }).join("") : '<div class="dica">Nada registrado ainda.</div>') + '</div>';
      $("fReg").onsubmit = function(ev){
        ev.preventDefault();
        sb.from("registro").insert({cliente_id:c.id, autor:autor(), tipo:$("rTipo").value, texto:$("rTexto").value.trim()}).then(function(u){ if(u.error){ $("rMsg").className = "msg erro"; $("rMsg").textContent = erroMsg(u.error); return; } abaRegistro(c); });
      };
    });
  }
})();
