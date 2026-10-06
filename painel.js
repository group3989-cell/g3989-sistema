/* Sistema G3989 · painel interno (versão 1, 05/10/2026) */
(function(){
  "use strict";
  var C = window.G3989, sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey);
  var $ = function(id){ return document.getElementById(id); };
  var app = $("app");
  var est = { sessao:null, clientes:[], progresso:{}, atual:null, view:"inicio", aba:"checklist", filtro:"todos", busca:"", min:false };
  try { est.min = localStorage.getItem("g3989:lado-min") === "1"; } catch(e){}
  /* tema: segue o sistema até a pessoa escolher; a escolha fica neste navegador */
  function temaAtual(){ var t = null; try { t = localStorage.getItem("g3989:tema"); } catch(e){} return t || (window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "claro" : "escuro"); }
  function aplicarTema(){ document.documentElement.setAttribute("data-tema", temaAtual()); }
  function trocarTema(){ var n = temaAtual() === "claro" ? "escuro" : "claro"; try { localStorage.setItem("g3989:tema", n); } catch(e){} aplicarTema(); var b = document.querySelectorAll(".tema"); b.forEach(function(x){ x.innerHTML = rotTema(); }); }
  function rotTema(){ return temaAtual() === "claro" ? "☾ Escuro" : "☀ Claro"; }
  aplicarTema();

  var TIPOS = [["ecommerce","E-commerce"],["mensagem","Mensagem"],["lead","Lead de site"],["avulso","Avulso"]];
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

  function inicio(){ if(!est.sessao) return telaLogin(); carregar().then(render); }

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
      sb.from("checklist_cliente").select("cliente_id,feito")
    ]).then(function(r){
      if(r[0].error){ app.innerHTML = '<div class="vazio">Sem acesso aos dados: ' + esc(erroMsg(r[0].error)) + '. Confira se o seu e-mail está na tabela admins.</div>'; throw r[0].error; }
      est.clientes = r[0].data || [];
      est.progresso = {};
      (r[1].data || []).forEach(function(x){ var p = est.progresso[x.cliente_id] = est.progresso[x.cliente_id] || {f:0, t:0}; p.t++; if(x.feito) p.f++; });
      if(est.atual) est.atual = est.clientes.filter(function(c){ return c.id === est.atual.id; })[0] || null;
    });
  }
  function pct(id){ var p = est.progresso[id]; return p && p.t ? Math.round(100 * p.f / p.t) : 0; }

  /* ---------- casca ---------- */
  function render(){
    var lista = est.clientes.filter(function(c){ return !est.busca || (c.nome + " " + (c.razao_social || "")).toLowerCase().indexOf(est.busca.toLowerCase()) >= 0; });
    app.innerHTML = '<div class="app' + (est.min ? " min" : "") + '"><aside class="lado">' +
      '<div class="marca"><img src="assets/logo-branca.png" alt="GROUP3989"><div><b>Sistema G3989</b><small>Gestão interna</small></div><button class="rec" id="bMin" title="Minimizar barra" aria-label="Minimizar barra">' + (est.min ? "›" : "‹") + '</button></div>' +
      '<input class="busca" id="busca" placeholder="Buscar cliente" value="' + esc(est.busca) + '">' +
      '<div class="rot">Clientes · ' + est.clientes.length + '</div><div class="lista">' +
      '<button class="cli" data-v="inicio" aria-current="' + (est.view === "inicio") + '"><span class="ini">⌂</span><span class="tx"><span class="nm">Início</span></span></button>' +
      lista.map(function(c){ return '<button class="cli" data-c="' + c.id + '" aria-current="' + (est.atual && est.atual.id === c.id && est.view === "cliente") + '" title="' + esc(c.nome) + '"><span class="ini">' + esc(ini(c.nome)) + '</span><span class="tx"><span class="nm">' + esc(c.nome) + '</span><span class="mt">' + esc(rotStatus(c.status)) + ' · ' + pct(c.id) + '% do checklist</span></span></button>'; }).join("") +
      '<button class="cli" data-v="novo" aria-current="' + (est.view === "novo") + '"><span class="ini">+</span><span class="tx"><span class="nm">Novo cliente</span></span></button></div>' +
      '<div class="ferr"><div class="rot" style="padding:4px 8px">Ferramentas</div>' + C.ferramentas.map(function(f){ return '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.nome) + ' ↗</a>'; }).join("") + '</div>' +
      '<div class="pe"><button class="sair" id="bSair">⎋ <span>Sair (' + esc(autor()) + ')</span></button><span style="flex:1"></span><button class="tema" id="bTema" title="Trocar tema claro ou escuro">' + rotTema() + '</button></div></aside>' +
      '<main id="main"></main></div>';
    $("bMin").onclick = function(){ est.min = !est.min; try { localStorage.setItem("g3989:lado-min", est.min ? "1" : "0"); } catch(e){} render(); };
    $("busca").oninput = function(){ est.busca = this.value; var p = this.selectionStart; render(); var b = $("busca"); b.focus(); b.setSelectionRange(p, p); };
    $("bSair").onclick = function(){ sb.auth.signOut(); };
    $("bTema").onclick = trocarTema;
    app.querySelectorAll("[data-c]").forEach(function(b){ b.onclick = function(){ est.atual = est.clientes.filter(function(c){ return c.id === b.dataset.c; })[0]; est.view = "cliente"; render(); }; });
    app.querySelectorAll("[data-v]").forEach(function(b){ b.onclick = function(){ est.view = b.dataset.v; est.atual = null; render(); }; });
    if(est.view === "novo") return telaNovo();
    if(est.view === "cliente" && est.atual) return telaCliente();
    telaInicio();
  }

  /* ---------- início ---------- */
  function telaInicio(){
    var n = function(s){ return est.clientes.filter(function(c){ return c.status === s; }).length; };
    $("main").innerHTML = '<div class="topo"><div><div class="mig">GROUP3989</div><h2>Início</h2></div><span class="esp"></span><button class="bt pri" id="bNovo">+ Novo cliente</button></div><div class="conteudo">' +
      '<div class="kpis"><div class="kpi"><b>' + n("entrada") + '</b><span>Em entrada</span></div><div class="kpi"><b>' + n("teste") + '</b><span>Em teste</span></div><div class="kpi"><b>' + n("ativo") + '</b><span>Ativos</span></div><div class="kpi"><b>' + n("pausado") + '</b><span>Pausados</span></div></div>' +
      (est.clientes.length ? '<div class="cx"><h3>Checklists de entrada</h3><div class="dica">Progresso de cada cliente no checklist.</div>' + est.clientes.filter(function(c){ return c.status !== "saiu"; }).map(function(c){
        return '<div style="margin-top:12px"><div class="linha"><b style="font-family:var(--ui)">' + esc(c.nome) + '</b><span class="selo ' + c.status + '">' + esc(rotStatus(c.status)) + '</span><span class="esp" style="flex:1"></span><span class="msg">' + pct(c.id) + '%</span></div><div class="prog"><span style="width:' + pct(c.id) + '%"></span></div></div>';
      }).join("") + '</div>' : '<div class="vazio"><h3 style="color:var(--tx)">Nenhum cliente ainda</h3><p>Cadastre o primeiro cliente para gerar o checklist de entrada e o link do formulário.</p></div>') + '</div>';
    $("bNovo").onclick = function(){ est.view = "novo"; render(); };
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
    var c = est.atual, ABAS = [["checklist","Checklist"],["ficha","Ficha e IDs"],["cadastro","Formulário"],["registro","Registro"]];
    $("main").innerHTML = '<div class="topo"><div><div class="mig">' + esc(rotTipos(c.tipos) || "Cliente") + '</div><h2>' + esc(c.nome) + ' <span class="selo ' + c.status + '">' + esc(rotStatus(c.status)) + '</span></h2></div><span class="esp"></span>' +
      '<div class="abas">' + ABAS.map(function(a){ return '<button class="aba" data-a="' + a[0] + '" aria-selected="' + (est.aba === a[0]) + '">' + a[1] + '</button>'; }).join("") + '</div></div><div class="conteudo" id="corpo"><div class="carregando">Carregando…</div></div>';
    document.querySelectorAll("[data-a]").forEach(function(b){ b.onclick = function(){ est.aba = b.dataset.a; telaCliente(); }; });
    ({checklist:abaChecklist, ficha:abaFicha, cadastro:abaCadastro, registro:abaRegistro})[est.aba](c);
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
        '<div class="g2" style="grid-template-columns:180px 1fr"><div class="campo"><label for="rTipo">Tipo</label><select id="rTipo"><option value="nota">Nota</option><option value="decisao">Decisão</option><option value="ajuste">Ajuste</option><option value="alerta">Alerta</option><option value="pendencia">Pendência</option></select></div>' +
        '<div class="campo"><label for="rTexto">Texto</label><textarea id="rTexto" required></textarea></div></div><div class="linha" style="margin-top:10px"><button class="bt pri" type="submit">Registrar</button><span id="rMsg" class="msg"></span></div></form>' +
        '<div class="cx"><h3>Histórico</h3>' + (L.length ? L.map(function(x){ return '<div class="reg ' + x.tipo + '"><div class="cab"><b>' + esc(x.autor) + '</b><span>' + esc(x.tipo) + '</span><span>' + dataBR(x.criado_em) + '</span></div>' + esc(x.texto) + '</div>'; }).join("") : '<div class="dica">Nada registrado ainda.</div>') + '</div>';
      $("fReg").onsubmit = function(ev){
        ev.preventDefault();
        sb.from("registro").insert({cliente_id:c.id, autor:autor(), tipo:$("rTipo").value, texto:$("rTexto").value.trim()}).then(function(u){ if(u.error){ $("rMsg").className = "msg erro"; $("rMsg").textContent = erroMsg(u.error); return; } abaRegistro(c); });
      };
    });
  }
})();
