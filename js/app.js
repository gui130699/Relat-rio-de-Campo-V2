// Estado principal (armazenado em localStorage)
const STORAGE_KEY = "relatorioCampoState_v1";

let state = {
  users: [],
  currentUserId: null,
  config: {},
  metas: {},
  metasAbertas: {},  // {userId: {tipo, inicio, horasEsperadas}}
  anciaos: [],  // {id, userId, nome, telefone}
  entries: [],
  revisitas: [],
  estudos: [],
  modalidades: [
    "Campo",
    "Revisitas",
    "Cartas",
    "Estudo Bíblico",
    "Carrinho",
    "Testemunho informal"
  ],
  // Estado do timer
  timerState: null  // {userId, start, pause, modalidades[], pausedTime}
};

// ------------- Persistência ----------------

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      state = JSON.parse(raw);
      // Garantir que estruturas novas existam
      if (!state.timerState) state.timerState = null;
      if (!state.revisitas) state.revisitas = [];
      if (!state.estudos) state.estudos = [];
      if (!state.metasAbertas) state.metasAbertas = {};
      if (!state.anciaos) state.anciaos = [];
    } catch (e) {
      console.error("Erro ao ler state:", e);
    }
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getCurrentUser() {
  return state.users.find(u => u.id === state.currentUserId) || null;
}

// ------------- Toast Notifications ----------------

function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('toast-show'), 10);
  
  // Remove after duration
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => container.removeChild(toast), 300);
  }, duration);
}

// ------------- Utilidades ----------------

function uuid() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthYearKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMesAno(key) {
  const [y, m] = key.split("-");
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${meses[Number(m) - 1]} de ${y}`;
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

// ------------- Navegação / Views ----------------

function showView(name) {
  const views = document.querySelectorAll(".view");
  views.forEach(v => v.classList.remove("active"));
  const view = document.querySelector(`.view[data-view="${name}"]`);
  if (view) {
    view.classList.add("active");
  }

  const bottomNav = document.getElementById("bottom-nav");
  if (name === "login") {
    bottomNav.style.display = "none";
  } else {
    bottomNav.style.display = "flex";
  }

  document.querySelectorAll(".nav-button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.nav === name);
  });

  const headerTitle = document.getElementById("header-title");
  const titles = {
    dashboard: "Relatório de Campo",
    lancamento: "Novo lançamento",
    revisitas: "Revisitas",
    estudos: "Estudos bíblicos",
    metas: "Metas",
    relatorio: "Relatório",
    config: "Configurações",
    login: "Relatório de Campo"
  };
  headerTitle.textContent = titles[name] || "Relatório de Campo";

  if (name === "dashboard") renderDashboard();
  if (name === "lancamento") initLancamentoView();
  if (name === "revisitas") renderRevisitas();
  if (name === "estudos") renderEstudos();
  if (name === "metas") initMetasView();
  if (name === "config") initConfigView();
}

// ------------- Modals ----------------

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("hidden");
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("hidden");
  }
}

function closeAllModals() {
  document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden"));
}

// Fechar modal ao clicar fora
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) {
    closeAllModals();
  }
});

// ------------- Tema (claro/escuro) ----------------

function initThemeToggle() {
  const btn = document.getElementById("btn-theme-toggle");
  const pref = localStorage.getItem("relatorioCampoTheme");
  if (pref === "light") {
    document.body.classList.add("theme-light");
  }
  btn.addEventListener("click", () => {
    document.body.classList.toggle("theme-light");
    localStorage.setItem(
      "relatorioCampoTheme",
      document.body.classList.contains("theme-light") ? "light" : "dark"
    );
  });
}

// ------------- Instalação PWA ----------------

let deferredPrompt;

function initInstallButton() {
  const btnInstall = document.getElementById("btn-install-app");
  
  // Verificar se já está instalado
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    btnInstall.style.display = 'none';
    return;
  }

  // Escutar evento beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btnInstall.style.display = 'flex';
  });

  // Click no botão de instalar
  btnInstall.addEventListener('click', async () => {
    if (!deferredPrompt) {
      showToast('Instalação não disponível neste momento.', 'info');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      showToast('Aplicativo instalado com sucesso!', 'success');
      btnInstall.style.display = 'none';
    }
    
    deferredPrompt = null;
  });

  // Escutar evento de instalação concluída
  window.addEventListener('appinstalled', () => {
    showToast('Aplicativo instalado!', 'success');
    btnInstall.style.display = 'none';
    deferredPrompt = null;
  });
}

// ------------- Autenticação ----------------

function initAuth() {
  const tabs = document.querySelectorAll(".tab-button");
  const formLogin = document.getElementById("form-login");
  const formSignup = document.getElementById("form-signup");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const mode = tab.dataset.authTab;
      if (mode === "login") {
        formLogin.classList.remove("hidden");
        formSignup.classList.add("hidden");
      } else {
        formLogin.classList.add("hidden");
        formSignup.classList.remove("hidden");
      }
    });
  });

  formSignup.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = document.getElementById("signup-nome").value.trim();
    const congregacao = document.getElementById("signup-congregacao").value.trim();
    const tipo = document.getElementById("signup-tipo").value;
    const email = document.getElementById("signup-email").value.trim().toLowerCase();
    const senha = document.getElementById("signup-password").value;

    // Verificar se já existe localmente
    if (state.users.some(u => u.email === email)) {
      showToast("Já existe um usuário com esse e-mail.", "error");
      return;
    }

    try {
      // MODO LOCAL: Firebase temporariamente desabilitado
      // Para habilitar: Ative "Email/Password" em console.firebase.google.com > Authentication > Sign-in method
      
      const id = uuid();
      state.users.push({ id, nome, congregacao, tipo, email, senha });
      state.config[id] = { nome, congregacao, tipo, anciao: "" };
      state.metas[id] = {
        tipo,
        pubMensal: null,
        auxMensal: null,
        regTipo: "mensal",
        regMensal: null,
        regAnual: null
      };
      state.currentUserId = id;
      saveState();
      formSignup.reset();
      populateModalidades();
      showToast("Conta criada com sucesso!", "success");
      showView("dashboard");
      
      /* Firebase Auth - Descomente após configurar
      if (window.firebaseAuth && window.firebaseAuthMethods) {
        const { createUserWithEmailAndPassword } = window.firebaseAuthMethods;
        const auth = window.firebaseAuth;
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        const firebaseUser = userCredential.user;
        const id = firebaseUser.uid;
        
        state.users.push({ id, nome, congregacao, tipo, email, senha });
        state.config[id] = { nome, congregacao, tipo, anciao: "" };
        state.metas[id] = { tipo, pubMensal: null, auxMensal: null, regTipo: "mensal", regMensal: null, regAnual: null };
        state.currentUserId = id;
        saveState();
        
        if (window.syncToFirebase) {
          await syncToFirebase(id);
          if (window.enableAutoSync) enableAutoSync(id);
        }
        
        formSignup.reset();
        populateModalidades();
        showToast("Conta criada com sucesso!", "success");
        showView("dashboard");
      }
      */
    } catch (error) {
      console.error("Erro ao criar conta:", error);
      showToast("Erro ao criar conta. Tente novamente.", "error");
    }
  });

  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const senha = document.getElementById("login-password").value;
    
    try {
      // MODO LOCAL: Autenticação local apenas
      const user = state.users.find(u => u.email === email && u.senha === senha);
      if (!user) {
        showToast("E-mail ou senha inválidos.", "error");
        return;
      }
      
      state.currentUserId = user.id;
      saveState();
      populateModalidades();
      checkTimerStatus();
      showToast("Login realizado com sucesso!", "success");
      showView("dashboard");
      
      /* Firebase Auth - Descomente após configurar
      if (window.firebaseAuth && window.firebaseAuthMethods) {
        const { signInWithEmailAndPassword } = window.firebaseAuthMethods;
        const auth = window.firebaseAuth;
        
        const userCredential = await signInWithEmailAndPassword(auth, email, senha);
        const firebaseUser = userCredential.user;
        const userId = firebaseUser.uid;
        
        if (window.loadFromFirebase) {
          await loadFromFirebase(userId);
        }
        
        loadState();
        let user = state.users.find(u => u.id === userId);
        if (!user) {
          user = { id: userId, email, senha, nome: email.split('@')[0], congregacao: '', tipo: 'publicador' };
          state.users.push(user);
        }
        
        state.currentUserId = userId;
        saveState();
        if (window.enableAutoSync) enableAutoSync(userId);
        
        populateModalidades();
        checkTimerStatus();
        showToast("Login realizado com sucesso!", "success");
        showView("dashboard");
      }
      */
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      showToast("Erro ao fazer login. Tente novamente.", "error");
    }
  });
}

// ------------- Modalidades ----------------

function populateModalidades() {
  const sel = document.getElementById("lan-modalidade");
  if (!sel) return;
  sel.innerHTML = "";
  state.modalidades.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    sel.appendChild(opt);
  });
}

// ------------- TIMER / CRONÔMETRO ----------------

let timerInterval = null;

function initTimerModal() {
  const btnStartTimer = document.getElementById("btn-start-timer");
  const btnCancelTimer = document.getElementById("btn-cancel-timer");
  const btnConfirmTimer = document.getElementById("btn-confirm-timer");
  const btnPauseTimer = document.getElementById("btn-pause-timer");
  const btnStopTimer = document.getElementById("btn-stop-timer");
  
  // Abrir modal de seleção de modalidades
  btnStartTimer.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) return;
    
    // Verificar se já tem timer rodando
    if (state.timerState && state.timerState.userId === user.id) {
      openModal("modal-cronometro");
      updateCronometroDisplay();
      return;
    }
    
    // Abrir modal de seleção
    const checkboxList = document.getElementById("modalidades-checkbox-list");
    checkboxList.innerHTML = "";
    
    state.modalidades.forEach(mod => {
      const div = document.createElement("div");
      div.className = "checkbox-item";
      
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `modal-${mod}`;
      checkbox.value = mod;
      
      const label = document.createElement("label");
      label.setAttribute("for", `modal-${mod}`);
      label.textContent = mod;
      
      div.appendChild(checkbox);
      div.appendChild(label);
      
      div.addEventListener("click", (e) => {
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
        }
      });
      
      checkboxList.appendChild(div);
    });
    
    openModal("modal-timer");
  });
  
  btnCancelTimer.addEventListener("click", () => {
    closeModal("modal-timer");
  });
  
  btnConfirmTimer.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) return;
    
    const selectedModalidades = [];
    document.querySelectorAll("#modalidades-checkbox-list input:checked").forEach(cb => {
      selectedModalidades.push(cb.value);
    });
    
    if (selectedModalidades.length === 0) {
      showToast("Selecione pelo menos uma modalidade.", "warning");
      return;
    }
    
    const temRevisitas = selectedModalidades.includes("Revisitas");
    const temEstudo = selectedModalidades.includes("Estudo Bíblico");
    
    // Se tem revisitas ou estudos, pedir as pessoas antes de iniciar
    if (temRevisitas || temEstudo) {
      closeModal("modal-timer");
      pedirPessoasParaTimer(user, selectedModalidades, temRevisitas, temEstudo);
    } else {
      iniciarTimerDireto(user, selectedModalidades);
    }
  });
  
  function pedirPessoasParaTimer(user, selectedModalidades, temRevisitas, temEstudo) {
    let pessoasTimer = [];
    
    const iniciarAposSelecao = () => {
      state.timerState = {
        userId: user.id,
        start: new Date().toISOString(),
        pause: false,
        modalidades: selectedModalidades,
        pausedTime: 0,
        pessoas: pessoasTimer
      };
      
      saveState();
      openModal("modal-cronometro");
      startCronometro();
      
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    };
    
    if (temRevisitas) {
      abrirSelecaoRevisita((revisita) => {
        pessoasTimer.push({ tipo: 'revisita', id: revisita.id, nome: revisita.nome });
        
        if (temEstudo) {
          abrirSelecaoEstudo((estudo) => {
            pessoasTimer.push({ tipo: 'estudo', id: estudo.id, nome: estudo.nome });
            iniciarAposSelecao();
          }, false);
        } else {
          iniciarAposSelecao();
        }
      }, false);
    } else if (temEstudo) {
      abrirSelecaoEstudo((estudo) => {
        pessoasTimer.push({ tipo: 'estudo', id: estudo.id, nome: estudo.nome });
        iniciarAposSelecao();
      }, false);
    }
  }
  
  function iniciarTimerDireto(user, selectedModalidades) {
    state.timerState = {
      userId: user.id,
      start: new Date().toISOString(),
      pause: false,
      modalidades: selectedModalidades,
      pausedTime: 0,
      pessoas: []
    };
    
    saveState();
    closeModal("modal-timer");
    openModal("modal-cronometro");
    startCronometro();
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
  
  btnPauseTimer.addEventListener("click", () => {
    if (!state.timerState) return;
    
    if (state.timerState.pause) {
      // Retomar
      const pauseDuration = Date.now() - new Date(state.timerState.pauseStart).getTime();
      state.timerState.pausedTime += pauseDuration;
      state.timerState.pause = false;
      delete state.timerState.pauseStart;
      btnPauseTimer.textContent = "Pausar";
    } else {
      // Pausar
      state.timerState.pause = true;
      state.timerState.pauseStart = new Date().toISOString();
      btnPauseTimer.textContent = "Retomar";
    }
    
    saveState();
  });
  
  btnStopTimer.addEventListener("click", () => {
    if (!state.timerState) return;
    
    const user = getCurrentUser();
    if (!user || state.timerState.userId !== user.id) return;
    
    // Calcular tempo total
    const start = new Date(state.timerState.start);
    const end = new Date();
    let diffMs = end - start - (state.timerState.pausedTime || 0);
    
    if (state.timerState.pause) {
      const pauseDuration = Date.now() - new Date(state.timerState.pauseStart).getTime();
      diffMs -= pauseDuration;
    }
    
    const diffMin = Math.max(1, Math.round(diffMs / 1000 / 60));
    const horas = Math.floor(diffMin / 60);
    const minutos = diffMin % 60;
    
    const modalidadesArray = state.timerState.modalidades;
    const numModalidades = modalidadesArray.length;
    const pessoasTimer = state.timerState.pessoas || [];
    
    // Criar entrada com as pessoas já selecionadas
    const modalidadesTexto = modalidadesArray.join(", ");
    let obs = `Timer: ${formatDateTime(start)} - ${formatDateTime(end)}`;
    
    if (pessoasTimer.length > 0) {
      const nomesP = pessoasTimer.map(p => `${p.tipo === 'revisita' ? 'Revisita' : 'Estudo'}: ${p.nome}`);
      obs += ` | ${nomesP.join(", ")}`;
    }
    
    // Abrir modal de informações adicionais
    closeModal("modal-cronometro");
    abrirInfoAdicional((infoAdicional) => {
      state.entries.push({
        id: uuid(),
        userId: user.id,
        data: todayISO(),
        horas,
        minutos,
        modalidade: modalidadesTexto,
        obs,
        publicacoes: infoAdicional.publicacoes,
        revisitasAbertas: infoAdicional.revisitasAbertas,
        cartas: infoAdicional.cartas
      });
      
      // Limpar timer
      state.timerState = null;
      stopCronometro();
      saveState();
      
      showToast(`Serviço registrado: ${horas}h ${minutos}min em ${numModalidades} modalidade(s).`, "success");
      renderDashboard();
    });
  });
}

function startCronometro() {
  if (timerInterval) clearInterval(timerInterval);
  
  timerInterval = setInterval(() => {
    updateCronometroDisplay();
  }, 1000);
  
  updateCronometroDisplay();
}

function stopCronometro() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateCronometroDisplay() {
  if (!state.timerState) return;
  
  const start = new Date(state.timerState.start);
  let elapsed = Date.now() - start.getTime() - (state.timerState.pausedTime || 0);
  
  if (state.timerState.pause) {
    const pauseDuration = Date.now() - new Date(state.timerState.pauseStart).getTime();
    elapsed -= pauseDuration;
  }
  
  const totalSeconds = Math.floor(elapsed / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const display = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  const cronometroTempo = document.getElementById("cronometro-tempo");
  const cronometroInicio = document.getElementById("cronometro-inicio");
  const cronometroModalidades = document.getElementById("cronometro-modalidades");
  const btnPause = document.getElementById("btn-pause-timer");
  
  if (cronometroTempo) {
    cronometroTempo.textContent = display;
    // Adicionar classe 'paused' para animação visual
    if (state.timerState.pause) {
      cronometroTempo.classList.add('paused');
    } else {
      cronometroTempo.classList.remove('paused');
    }
  }
  if (cronometroInicio) cronometroInicio.textContent = `Início: ${formatDateTime(start)}`;
  if (cronometroModalidades) cronometroModalidades.textContent = `Modalidades: ${state.timerState.modalidades.join(", ")}`;
  if (btnPause) btnPause.textContent = state.timerState.pause ? "Retomar" : "Pausar";
  
  // Notificação a cada hora (somente se não estiver pausado)
  if (!state.timerState.pause && minutes === 0 && seconds === 0 && hours > 0) {
    if (!state.timerState.lastHourNotified || state.timerState.lastHourNotified !== hours) {
      state.timerState.lastHourNotified = hours;
      showToast(`⏰ ${hours} hora${hours > 1 ? 's' : ''} de serviço!`, 'info', 4000);
      
      // Tentar usar notificações nativas do browser
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Relatório de Campo", {
          body: `Você já está há ${hours} hora${hours > 1 ? 's' : ''} em serviço!`,
          icon: "/android-chrome-192x192.png"
        });
      }
    }
  }
}

function checkTimerStatus() {
  const user = getCurrentUser();
  if (!user) return;
  
  if (state.timerState && state.timerState.userId === user.id) {
    startCronometro();
    const status = document.getElementById("timer-status");
    if (status) {
      status.textContent = "⏱️ Timer ativo - Clique em 'Iniciar serviço' para gerenciar";
    }
  }
}

// ------------- Lançamentos ----------------

function initLancamentoView() {
  document.getElementById("lan-data").value = todayISO();
}

function initLancamentoForm() {
  const form = document.getElementById("form-lancamento");
  const selectModalidade = document.getElementById("lan-modalidade");
  const pessoaInfo = document.getElementById("lan-pessoa-info");
  const pessoaIdInput = document.getElementById("lan-pessoa-id");
  const pessoaNomeInput = document.getElementById("lan-pessoa-nome");

  // Interceptar mudança de modalidade
  selectModalidade.addEventListener("change", () => {
    const modalidade = selectModalidade.value;
    
    if (modalidade === "Revisitas") {
      abrirSelecaoRevisita((revisita) => {
        pessoaIdInput.value = revisita.id;
        pessoaNomeInput.value = revisita.nome;
        pessoaInfo.textContent = `📍 ${revisita.nome}`;
        pessoaInfo.style.display = "block";
      });
    } else if (modalidade === "Estudo Bíblico") {
      abrirSelecaoEstudo((estudo) => {
        pessoaIdInput.value = estudo.id;
        pessoaNomeInput.value = estudo.nome;
        pessoaInfo.textContent = `📖 ${estudo.nome}`;
        pessoaInfo.style.display = "block";
      });
    } else {
      pessoaIdInput.value = "";
      pessoaNomeInput.value = "";
      pessoaInfo.style.display = "none";
    }
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return;

    const data = document.getElementById("lan-data").value;
    const horas = Number(document.getElementById("lan-horas").value || 0);
    const minutos = Number(document.getElementById("lan-minutos").value || 0);
    const modalidade = document.getElementById("lan-modalidade").value;
    const obs = document.getElementById("lan-obs").value.trim();
    const pessoaNome = pessoaNomeInput.value;

    // Adicionar nome da pessoa na observação se for revisita ou estudo
    let obsCompleta = obs;
    if (pessoaNome && (modalidade === "Revisitas" || modalidade === "Estudo Bíblico")) {
      obsCompleta = `${pessoaNome}${obs ? ': ' + obs : ''}`;
    }

    // Abrir modal de informações adicionais
    abrirInfoAdicional((infoAdicional) => {
      state.entries.push({
        id: uuid(),
        userId: user.id,
        data,
        horas,
        minutos,
        modalidade,
        obs: obsCompleta,
        publicacoes: infoAdicional.publicacoes,
        revisitasAbertas: infoAdicional.revisitasAbertas,
        cartas: infoAdicional.cartas
      });
      saveState();
      form.reset();
      document.getElementById("lan-data").value = todayISO();
      pessoaIdInput.value = "";
      pessoaNomeInput.value = "";
      pessoaInfo.style.display = "none";
      showToast("Lançamento salvo.", "success");
      renderDashboard();
      showView("dashboard");
    });
  });

  const btnOpen = document.getElementById("btn-open-add-entry");
  if (btnOpen) {
    btnOpen.addEventListener("click", () => {
      showView("lancamento");
    });
  }
}

function abrirSelecaoRevisita(callback, permitirCancelar = true) {
  const user = getCurrentUser();
  if (!user) return;

  const revisitas = state.revisitas.filter(r => r.userId === user.id);
  
  const lista = document.getElementById("lista-selecao-revisitas");
  lista.innerHTML = "";

  if (revisitas.length === 0) {
    lista.innerHTML = '<p class="text-muted" style="padding: 20px; text-align: center;">Nenhuma revisita cadastrada.<br>Clique em "+ Nova revisita" abaixo.</p>';
  } else {
    revisitas.forEach(r => {
      const item = document.createElement("div");
      item.className = "select-item";
      item.innerHTML = `
        <div class="select-item-title">${r.nome}</div>
        <div class="select-item-sub">${r.endereco || 'Sem endereço'}</div>
      `;
      item.addEventListener("click", () => {
        callback(r);
        closeModal("modal-selecionar-revisita");
      });
      lista.appendChild(item);
    });
  }

  document.getElementById("btn-nova-revisita-rapida").onclick = () => {
    closeModal("modal-selecionar-revisita");
    abrirCadastroRapidoRevisita(callback, permitirCancelar);
  };

  document.getElementById("btn-cancel-selecionar-revisita").onclick = () => {
    closeModal("modal-selecionar-revisita");
    if (permitirCancelar && document.getElementById("lan-modalidade")) {
      document.getElementById("lan-modalidade").value = "";
    }
  };

  openModal("modal-selecionar-revisita");
}

function abrirCadastroRapidoRevisita(callback, permitirCancelar = true) {
  const user = getCurrentUser();
  if (!user) return;

  const form = document.getElementById("form-rapido-revisita");
  form.reset();

  const submitHandler = (e) => {
    e.preventDefault();
    
    const nome = document.getElementById("rapido-revisita-nome").value.trim();
    const endereco = document.getElementById("rapido-revisita-endereco").value.trim();

    const novaRevisita = {
      id: uuid(),
      userId: user.id,
      nome,
      endereco,
      telefone: "",
      publicacao: "",
      assunto: "",
      historico: []
    };

    state.revisitas.push(novaRevisita);
    saveState();
    renderRevisitas();
    
    closeModal("modal-rapido-revisita");
    showToast("Revisita cadastrada!", "success");
    callback(novaRevisita);
    
    form.removeEventListener("submit", submitHandler);
  };

  form.addEventListener("submit", submitHandler);

  document.getElementById("btn-cancel-rapido-revisita").onclick = () => {
    closeModal("modal-rapido-revisita");
    form.removeEventListener("submit", submitHandler);
    if (permitirCancelar && document.getElementById("lan-modalidade")) {
      document.getElementById("lan-modalidade").value = "";
    }
  };

  openModal("modal-rapido-revisita");
}

function abrirSelecaoEstudo(callback, permitirCancelar = true) {
  const user = getCurrentUser();
  if (!user) return;

  const estudos = state.estudos.filter(e => e.userId === user.id);
  
  const lista = document.getElementById("lista-selecao-estudos");
  lista.innerHTML = "";

  if (estudos.length === 0) {
    lista.innerHTML = '<p class="text-muted" style="padding: 20px; text-align: center;">Nenhum estudo cadastrado.<br>Clique em "+ Novo estudo" abaixo.</p>';
  } else {
    estudos.forEach(e => {
      const item = document.createElement("div");
      item.className = "select-item";
      item.innerHTML = `
        <div class="select-item-title">${e.nome}</div>
        <div class="select-item-sub">${e.diaHora || 'Sem horário definido'}</div>
      `;
      item.addEventListener("click", () => {
        callback(e);
        closeModal("modal-selecionar-estudo");
      });
      lista.appendChild(item);
    });
  }

  document.getElementById("btn-novo-estudo-rapido").onclick = () => {
    closeModal("modal-selecionar-estudo");
    abrirCadastroRapidoEstudo(callback, permitirCancelar);
  };

  document.getElementById("btn-cancel-selecionar-estudo").onclick = () => {
    closeModal("modal-selecionar-estudo");
    if (permitirCancelar && document.getElementById("lan-modalidade")) {
      document.getElementById("lan-modalidade").value = "";
    }
  };

  openModal("modal-selecionar-estudo");
}

function abrirCadastroRapidoEstudo(callback, permitirCancelar = true) {
  const user = getCurrentUser();
  if (!user) return;

  const form = document.getElementById("form-rapido-estudo");
  form.reset();

  const submitHandler = (e) => {
    e.preventDefault();
    
    const nome = document.getElementById("rapido-estudo-nome").value.trim();
    const diaHora = document.getElementById("rapido-estudo-diahora").value.trim();

    const novoEstudo = {
      id: uuid(),
      userId: user.id,
      nome,
      endereco: "",
      telefone: "",
      diaHora,
      historico: []
    };

    state.estudos.push(novoEstudo);
    saveState();
    renderEstudos();
    
    closeModal("modal-rapido-estudo");
    showToast("Estudo cadastrado!", "success");
    callback(novoEstudo);
    
    form.removeEventListener("submit", submitHandler);
  };

  form.addEventListener("submit", submitHandler);

  document.getElementById("btn-cancel-rapido-estudo").onclick = () => {
    closeModal("modal-rapido-estudo");
    form.removeEventListener("submit", submitHandler);
    if (permitirCancelar && document.getElementById("lan-modalidade")) {
      document.getElementById("lan-modalidade").value = "";
    }
  };

  openModal("modal-rapido-estudo");
}

function abrirInfoAdicional(callback) {
  const form = document.getElementById("form-info-adicional");
  form.reset();

  const submitHandler = (e) => {
    e.preventDefault();
    
    const publicacoes = Number(document.getElementById("info-publicacoes").value || 0);
    const revisitasAbertas = Number(document.getElementById("info-revisitas-abertas").value || 0);
    const cartas = Number(document.getElementById("info-cartas").value || 0);

    closeModal("modal-info-adicional");
    callback({ publicacoes, revisitasAbertas, cartas });
    
    form.removeEventListener("submit", submitHandler);
  };

  form.addEventListener("submit", submitHandler);

  document.getElementById("btn-cancel-info-adicional").onclick = () => {
    closeModal("modal-info-adicional");
    form.removeEventListener("submit", submitHandler);
    // Se cancelar, retorna zeros
    callback({ publicacoes: 0, revisitasAbertas: 0, cartas: 0 });
  };

  openModal("modal-info-adicional");
}

// ------------- Dashboard ----------------

function calcResumoMes(userId, keyMesAno) {
  const resumo = {
    horas: 0,
    minutos: 0
  };
  state.entries
    .filter(e => e.userId === userId)
    .forEach(e => {
      const d = new Date(e.data);
      const key = monthYearKey(d);
      if (key === keyMesAno) {
        resumo.horas += e.horas || 0;
        resumo.minutos += e.minutos || 0;
      }
    });

  resumo.horas += Math.floor(resumo.minutos / 60);
  resumo.minutos = resumo.minutos % 60;
  return resumo;
}

function calcResumoMesAnterior(userId, keyMesAno) {
  const [y, m] = keyMesAno.split("-");
  const ano = Number(y);
  const mes = Number(m);
  const anterior = new Date(ano, mes - 2, 1);
  const keyAnt = monthYearKey(anterior);
  return calcResumoMes(userId, keyAnt);
}

function getMetaAtual(userId, keyMesAno) {
  const user = state.users.find(u => u.id === userId);
  const metas = state.metas[userId];
  if (!user || !metas) return null;

  if (user.tipo === "publicador") {
    return metas.pubMensal || null;
  }
  if (user.tipo === "auxiliar") {
    return metas.auxMensal || null;
  }
  if (user.tipo === "regular") {
    if (metas.regTipo === "mensal") {
      return metas.regMensal || null;
    } else if (metas.regTipo === "anual" && metas.regAnual) {
      return metas.regAnual / 12;
    }
  }
  return null;
}

function renderDashboard() {
  const user = getCurrentUser();
  if (!user) {
    showView("login");
    return;
  }

  const hoje = new Date();
  const keyMes = monthYearKey(hoje);

  document.getElementById("dashboard-mes").textContent = formatMesAno(keyMes);

  const resumo = calcResumoMes(user.id, keyMes);
  const anterior = calcResumoMesAnterior(user.id, keyMes);
  const meta = getMetaAtual(user.id, keyMes);

  const totalHoras = resumo.horas + resumo.minutos / 60;
  document.getElementById("stat-horas").textContent =
    `${resumo.horas}h ${String(resumo.minutos).padStart(2, "0")}m`;
  document.getElementById("stat-meta").textContent =
    meta != null ? `${meta.toFixed(1)}h` : "—";

  let progresso = 0;
  if (meta && meta > 0) {
    progresso = Math.min(100, (totalHoras / meta) * 100);
  }
  document.getElementById("stat-progresso").textContent =
    `${progresso.toFixed(0)}%`;

  const horasAtual = totalHoras;
  const horasAnterior = anterior.horas + anterior.minutos / 60;
  let msg = "Sem dados do mês anterior.";
  if (horasAnterior > 0) {
    const diff = horasAtual - horasAnterior;
    const perc = (diff / horasAnterior) * 100;
    if (diff > 0) {
      msg = `Você fez ${diff.toFixed(1)}h a mais que o mês anterior (+${perc.toFixed(1)}%).`;
    } else if (diff < 0) {
      msg = `Você fez ${Math.abs(diff).toFixed(1)}h a menos que o mês anterior (${perc.toFixed(1)}%).`;
    } else {
      msg = "Você fez exatamente as mesmas horas do mês anterior.";
    }
  }
  document.getElementById("dashboard-comparativo").textContent = msg;

  // lançamentos recolhíveis
  renderLancamentos();
  
  checkTimerStatus();
  checkMetaStatus();
}

function checkMetaStatus() {
  const user = getCurrentUser();
  if (!user) return;
  
  const btnConfigurar = document.getElementById("btn-configurar-meta");
  const btnEncerrar = document.getElementById("btn-encerrar-meta");
  const metaStatusEl = document.getElementById("meta-status");
  
  const metaAberta = state.metasAbertas[user.id];
  
  if (metaAberta) {
    btnConfigurar.style.display = "none";
    btnEncerrar.style.display = "block";
    metaStatusEl.textContent = `Meta ativa: ${metaAberta.tipo} (iniciada em ${metaAberta.inicio})`;
  } else {
    btnConfigurar.style.display = "block";
    btnEncerrar.style.display = "none";
    metaStatusEl.textContent = "";
  }
}

function initToggleLancamentos() {
  const toggle = document.getElementById("toggle-lancamentos");
  const content = document.getElementById("lista-lancamentos");
  
  if (!toggle || !content) return;
  
  toggle.addEventListener("click", () => {
    toggle.classList.toggle("collapsed");
    content.classList.toggle("collapsed");
  });
}

function renderLancamentos() {
  const user = getCurrentUser();
  if (!user) return;

  const container = document.getElementById("lista-lancamentos");
  container.innerHTML = "";

  const lancamentos = state.entries
    .filter(e => e.userId === user.id)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 10);

  if (lancamentos.length === 0) {
    container.innerHTML = '<p class="text-muted" style="text-align: center; padding: 20px;">Nenhum lançamento ainda.</p>';
    return;
  }

  lancamentos.forEach(e => {
    const item = document.createElement("div");
    item.className = "lancamento-item";

    const header = document.createElement("div");
    header.className = "lancamento-header";

    const headerInfo = document.createElement("div");
    headerInfo.className = "lancamento-header-info";

    const data = document.createElement("span");
    data.className = "lancamento-data";
    data.textContent = formatDate(e.data);

    const resumo = document.createElement("span");
    resumo.className = "lancamento-resumo";
    resumo.textContent = `${e.horas}h ${String(e.minutos).padStart(2, "0")}m • ${e.modalidade}`;

    headerInfo.appendChild(data);
    headerInfo.appendChild(resumo);

    const chevron = document.createElement("span");
    chevron.className = "lancamento-chevron";
    chevron.textContent = "▼";

    header.appendChild(headerInfo);
    header.appendChild(chevron);

    const detalhes = document.createElement("div");
    detalhes.className = "lancamento-detalhes";

    const detalhesContent = document.createElement("div");
    detalhesContent.className = "lancamento-detalhes-content";

    // Tempo
    const linhaTempo = document.createElement("div");
    linhaTempo.className = "lancamento-detalhe-linha";
    linhaTempo.innerHTML = `
      <span class="lancamento-detalhe-label">Tempo:</span>
      <span class="lancamento-detalhe-valor">${e.horas}h ${String(e.minutos).padStart(2, "0")}m</span>
    `;
    detalhesContent.appendChild(linhaTempo);

    // Modalidade
    const linhaModalidade = document.createElement("div");
    linhaModalidade.className = "lancamento-detalhe-linha";
    linhaModalidade.innerHTML = `
      <span class="lancamento-detalhe-label">Modalidade:</span>
      <span class="lancamento-detalhe-valor">${e.modalidade}</span>
    `;
    detalhesContent.appendChild(linhaModalidade);

    // Publicações
    if (e.publicacoes && e.publicacoes > 0) {
      const linhaPublicacoes = document.createElement("div");
      linhaPublicacoes.className = "lancamento-detalhe-linha";
      linhaPublicacoes.innerHTML = `
        <span class="lancamento-detalhe-label">Publicações:</span>
        <span class="lancamento-detalhe-valor">${e.publicacoes}</span>
      `;
      detalhesContent.appendChild(linhaPublicacoes);
    }

    // Revisitas abertas
    if (e.revisitasAbertas && e.revisitasAbertas > 0) {
      const linhaRevisitasAbertas = document.createElement("div");
      linhaRevisitasAbertas.className = "lancamento-detalhe-linha";
      linhaRevisitasAbertas.innerHTML = `
        <span class="lancamento-detalhe-label">Revisitas abertas:</span>
        <span class="lancamento-detalhe-valor">${e.revisitasAbertas}</span>
      `;
      detalhesContent.appendChild(linhaRevisitasAbertas);
    }

    // Cartas
    if (e.cartas && e.cartas > 0) {
      const linhaCartas = document.createElement("div");
      linhaCartas.className = "lancamento-detalhe-linha";
      linhaCartas.innerHTML = `
        <span class="lancamento-detalhe-label">Cartas:</span>
        <span class="lancamento-detalhe-valor">${e.cartas}</span>
      `;
      detalhesContent.appendChild(linhaCartas);
    }

    // Observações
    if (e.obs) {
      const linhaObs = document.createElement("div");
      linhaObs.className = "lancamento-detalhe-linha";
      linhaObs.innerHTML = `
        <span class="lancamento-detalhe-label">Observações:</span>
        <span class="lancamento-detalhe-valor">${e.obs}</span>
      `;
      detalhesContent.appendChild(linhaObs);
    }

    // Ações
    const acoes = document.createElement("div");
    acoes.className = "lancamento-acoes";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn-small btn-edit";
    btnEdit.textContent = "✏️ Editar";
    btnEdit.addEventListener("click", (evt) => {
      evt.stopPropagation();
      editarLancamento(e.id);
    });

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn-small btn-delete";
    btnDelete.textContent = "🗑️ Deletar";
    btnDelete.addEventListener("click", (evt) => {
      evt.stopPropagation();
      deletarLancamento(e.id);
    });

    acoes.appendChild(btnEdit);
    acoes.appendChild(btnDelete);

    detalhesContent.appendChild(acoes);
    detalhes.appendChild(detalhesContent);

    item.appendChild(header);
    item.appendChild(detalhes);

    // Toggle expandir/recolher
    header.addEventListener("click", () => {
      item.classList.toggle("expanded");
    });

    container.appendChild(item);
  });
}

function formatDate(dateString) {
  const [y, m, d] = dateString.split("-");
  return `${d}/${m}/${y}`;
}

function editarLancamento(entryId) {
  const entry = state.entries.find(e => e.id === entryId);
  if (!entry) return;

  document.getElementById("edit-lan-id").value = entry.id;
  document.getElementById("edit-lan-data").value = entry.data;
  document.getElementById("edit-lan-horas").value = entry.horas || 0;
  document.getElementById("edit-lan-minutos").value = entry.minutos || 0;
  document.getElementById("edit-lan-modalidade").value = entry.modalidade;
  document.getElementById("edit-lan-publicacoes").value = entry.publicacoes || 0;
  document.getElementById("edit-lan-revisitas-abertas").value = entry.revisitasAbertas || 0;
  document.getElementById("edit-lan-cartas").value = entry.cartas || 0;
  document.getElementById("edit-lan-obs").value = entry.obs || "";

  openModal("modal-editar-lancamento");
}

function initEditarLancamento() {
  const form = document.getElementById("form-editar-lancamento");
  const btnCancel = document.getElementById("btn-cancel-editar-lancamento");

  btnCancel.addEventListener("click", () => {
    closeModal("modal-editar-lancamento");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const entryId = document.getElementById("edit-lan-id").value;
    const entry = state.entries.find(e => e.id === entryId);
    
    if (!entry) return;

    entry.data = document.getElementById("edit-lan-data").value;
    entry.horas = Number(document.getElementById("edit-lan-horas").value || 0);
    entry.minutos = Number(document.getElementById("edit-lan-minutos").value || 0);
    entry.publicacoes = Number(document.getElementById("edit-lan-publicacoes").value || 0);
    entry.revisitasAbertas = Number(document.getElementById("edit-lan-revisitas-abertas").value || 0);
    entry.cartas = Number(document.getElementById("edit-lan-cartas").value || 0);
    entry.obs = document.getElementById("edit-lan-obs").value.trim();

    saveState();
    closeModal("modal-editar-lancamento");
    showToast("Lançamento atualizado.", "success");
    renderDashboard();
  });
}

function deletarLancamento(entryId) {
  if (confirm("Deseja realmente deletar este lançamento?")) {
    const index = state.entries.findIndex(e => e.id === entryId);
    if (index !== -1) {
      state.entries.splice(index, 1);
      saveState();
      showToast("Lançamento deletado.", "success");
      renderDashboard();
    }
  }
}

// ------------- REVISITAS (REFATORADO) ----------------

function initRevisitas() {
  const btnAdd = document.getElementById("btn-add-revisita");
  const btnCancel = document.getElementById("btn-cancel-add-revisita");
  const form = document.getElementById("form-add-revisita");
  
  btnAdd.addEventListener("click", () => {
    // Limpar formulário
    form.reset();
    openModal("modal-add-revisita");
  });
  
  btnCancel.addEventListener("click", () => {
    closeModal("modal-add-revisita");
  });
  
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return;
    
    const nome = document.getElementById("revisita-nome").value.trim();
    const endereco = document.getElementById("revisita-endereco").value.trim();
    const telefone = document.getElementById("revisita-telefone").value.trim();
    const publicacao = document.getElementById("revisita-publicacao").value.trim();
    const assunto = document.getElementById("revisita-assunto").value.trim();
    
    state.revisitas.push({
      id: uuid(),
      userId: user.id,
      nome,
      endereco,
      telefone,
      publicacao,
      assunto,
      historico: []
    });
    
    saveState();
    renderRevisitas();
    closeModal("modal-add-revisita");
    showToast("Revisita cadastrada com sucesso!", "success");
  });
}

function renderRevisitas() {
  const user = getCurrentUser();
  if (!user) return;
  const ul = document.getElementById("lista-revisitas");
  ul.innerHTML = "";
  const lista = state.revisitas.filter(r => r.userId === user.id);
  if (lista.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhuma revisita cadastrada.";
    ul.appendChild(li);
    return;
  }
  
  lista.forEach(r => {
    const li = document.createElement("li");
    li.className = "list-item-with-action";
    
    const content = document.createElement("div");
    content.className = "list-item-content";
    
    const t1 = document.createElement("div");
    t1.className = "list-title";
    t1.textContent = r.nome;
    
    const t2 = document.createElement("div");
    t2.className = "list-sub";
    const info = [
      r.endereco || "",
      r.telefone || "",
      r.publicacao ? `Pub.: ${r.publicacao}` : "",
      r.assunto ? `Assunto: ${r.assunto}` : "",
      r.historico && r.historico.length > 0 ? `${r.historico.length} visita(s)` : "Nenhuma visita"
    ].filter(Boolean).join(" • ");
    t2.textContent = info;
    
    content.appendChild(t1);
    content.appendChild(t2);
    
    // Clicar abre histórico
    content.addEventListener("click", () => {
      abrirHistoricoRevisita(r.id);
    });
    
    li.appendChild(content);
    ul.appendChild(li);
  });
}

function abrirHistoricoRevisita(revisitaId) {
  const revisita = state.revisitas.find(r => r.id === revisitaId);
  if (!revisita) return;
  
  const nomeEl = document.getElementById("historico-revisita-nome");
  const listaEl = document.getElementById("historico-revisita-lista");
  const btnMover = document.getElementById("btn-mover-estudo");
  const btnFechar = document.getElementById("btn-fechar-historico-revisita");
  
  nomeEl.textContent = revisita.nome;
  
  listaEl.innerHTML = "";
  
  // Informações do cadastro
  const infoCadastro = document.createElement("div");
  infoCadastro.className = "card";
  infoCadastro.style.marginBottom = "16px";
  infoCadastro.style.background = "var(--color-accent-soft)";
  
  let infoHTML = '<h4 style="margin: 0 0 12px 0;">📋 Informações</h4>';
  
  if (revisita.endereco) {
    infoHTML += `<p style="margin: 4px 0;"><strong>📍 Endereço:</strong> ${revisita.endereco}</p>`;
  }
  
  if (revisita.telefone) {
    const telefone = revisita.telefone.replace(/\D/g, '');
    const whatsappLink = `https://wa.me/${telefone}`;
    infoHTML += `<p style="margin: 4px 0;"><strong>📱 Telefone:</strong> ${revisita.telefone} <a href="${whatsappLink}" target="_blank" style="color: #25D366; text-decoration: none; font-weight: bold;">💬 WhatsApp</a></p>`;
  }
  
  if (revisita.publicacao) {
    infoHTML += `<p style="margin: 4px 0;"><strong>📖 Publicação:</strong> ${revisita.publicacao}</p>`;
  }
  
  if (revisita.assunto) {
    infoHTML += `<p style="margin: 4px 0;"><strong>💬 Assunto:</strong> ${revisita.assunto}</p>`;
  }
  
  infoCadastro.innerHTML = infoHTML;
  listaEl.appendChild(infoCadastro);
  
  // Título do histórico
  const tituloHistorico = document.createElement("h4");
  tituloHistorico.textContent = "📅 Histórico de visitas";
  tituloHistorico.style.marginTop = "16px";
  tituloHistorico.style.marginBottom = "12px";
  listaEl.appendChild(tituloHistorico);
  
  if (!revisita.historico || revisita.historico.length === 0) {
    const vazio = document.createElement("div");
    vazio.className = "historico-vazio";
    vazio.textContent = "Nenhuma visita registrada ainda.";
    listaEl.appendChild(vazio);
  } else {
    revisita.historico.sort((a, b) => b.data.localeCompare(a.data)).forEach(h => {
      const item = document.createElement("div");
      item.className = "historico-item";
      
      const data = document.createElement("div");
      data.className = "historico-item-data";
      data.textContent = h.data;
      
      const obs = document.createElement("div");
      obs.className = "historico-item-obs";
      obs.textContent = h.observacoes || "(sem observações)";
      
      item.appendChild(data);
      item.appendChild(obs);
      listaEl.appendChild(item);
    });
  }
  
  // Botão para mover para estudos
  btnMover.onclick = () => {
    if (confirm(`Deseja mover "${revisita.nome}" para Estudos Bíblicos?`)) {
      const estudo = {
        id: uuid(),
        userId: revisita.userId,
        nome: revisita.nome,
        endereco: revisita.endereco,
        telefone: revisita.telefone,
        diaHora: "",
        historico: revisita.historico || []
      };
      
      state.estudos.push(estudo);
      state.revisitas = state.revisitas.filter(r => r.id !== revisitaId);
      saveState();
      
      closeModal("modal-historico-revisita");
      showToast(`"${revisita.nome}" foi movido para Estudos Bíblicos!`, "success");
      renderRevisitas();
    }
  };
  
  btnFechar.onclick = () => {
    closeModal("modal-historico-revisita");
  };
  
  openModal("modal-historico-revisita");
}

// Modal para registrar revisita (chamado do dashboard)
function initRegistrarRevisita() {
  const btn = document.getElementById("btn-registrar-revisita");
  btn.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) return;
    
    const lista = state.revisitas.filter(r => r.userId === user.id);
    if (lista.length === 0) {
      showToast("Você ainda não tem revisitas cadastradas. Vá para a aba Revisitas e adicione uma.", "info", 4000);
      return;
    }
    
    const listaEl = document.getElementById("lista-revisitas-select");
    listaEl.innerHTML = "";
    
    lista.forEach(r => {
      const item = document.createElement("div");
      item.className = "select-item";
      
      const title = document.createElement("div");
      title.className = "select-item-title";
      title.textContent = r.nome;
      
      const info = document.createElement("div");
      info.className = "select-item-info";
      info.textContent = r.endereco || "Sem endereço cadastrado";
      
      item.appendChild(title);
      item.appendChild(info);
      
      item.addEventListener("click", () => {
        closeModal("modal-registrar-revisita");
        abrirFormObsRevisita(r.id);
      });
      
      listaEl.appendChild(item);
    });
    
    openModal("modal-registrar-revisita");
  });
}

function abrirFormObsRevisita(revisitaId) {
  const revisita = state.revisitas.find(r => r.id === revisitaId);
  if (!revisita) return;
  
  const titulo = document.getElementById("modal-obs-titulo");
  const form = document.getElementById("form-obs-revisita");
  const dataInput = document.getElementById("obs-data");
  const textoInput = document.getElementById("obs-texto");
  const btnCancel = document.getElementById("btn-cancel-obs-revisita");
  
  titulo.textContent = `Registrar visita - ${revisita.nome}`;
  dataInput.value = todayISO();
  textoInput.value = "";
  
  form.onsubmit = (e) => {
    e.preventDefault();
    
    const data = dataInput.value;
    const observacoes = textoInput.value.trim();
    
    if (!revisita.historico) revisita.historico = [];
    
    revisita.historico.push({
      id: uuid(),
      data,
      observacoes
    });
    
    // Também adicionar lançamento
    state.entries.push({
      id: uuid(),
      userId: revisita.userId,
      data,
      horas: 0,
      minutos: 15,
      modalidade: "Revisitas",
      obs: `Revisita: ${revisita.nome}. ${observacoes}`
    });
    
    saveState();
    closeModal("modal-obs-revisita");
    showToast("Visita registrada com sucesso! (15min adicionados)", "success");
    renderRevisitas();
    renderDashboard();
  };
  
  btnCancel.onclick = () => {
    closeModal("modal-obs-revisita");
  };
  
  openModal("modal-obs-revisita");
}

// ------------- ESTUDOS (REFATORADO) ----------------

function initEstudos() {
  const btnAdd = document.getElementById("btn-add-estudo");
  const btnCancel = document.getElementById("btn-cancel-add-estudo");
  const form = document.getElementById("form-add-estudo");
  
  btnAdd.addEventListener("click", () => {
    // Limpar formulário
    form.reset();
    openModal("modal-add-estudo");
  });
  
  btnCancel.addEventListener("click", () => {
    closeModal("modal-add-estudo");
  });
  
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return;
    
    const nome = document.getElementById("estudo-nome").value.trim();
    const endereco = document.getElementById("estudo-endereco").value.trim();
    const telefone = document.getElementById("estudo-telefone").value.trim();
    const diaHora = document.getElementById("estudo-diahora").value.trim();
    
    state.estudos.push({
      id: uuid(),
      userId: user.id,
      nome,
      endereco,
      telefone,
      diaHora,
      historico: []
    });
    
    saveState();
    renderEstudos();
    closeModal("modal-add-estudo");
    showToast("Estudo cadastrado com sucesso!", "success");
  });
}

function renderEstudos() {
  const user = getCurrentUser();
  if (!user) return;
  const ul = document.getElementById("lista-estudos");
  ul.innerHTML = "";
  const lista = state.estudos.filter(e => e.userId === user.id);
  if (lista.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhum estudo bíblico cadastrado.";
    ul.appendChild(li);
    return;
  }
  
  lista.forEach(s => {
    const li = document.createElement("li");
    li.className = "list-item-with-action";
    
    const content = document.createElement("div");
    content.className = "list-item-content";
    
    const t1 = document.createElement("div");
    t1.className = "list-title";
    t1.textContent = s.nome;
    
    const t2 = document.createElement("div");
    t2.className = "list-sub";
    const info = [
      s.endereco || "",
      s.telefone || "",
      s.diaHora || "",
      s.historico && s.historico.length > 0 ? `${s.historico.length} estudo(s)` : "Nenhum estudo"
    ].filter(Boolean).join(" • ");
    t2.textContent = info;
    
    content.appendChild(t1);
    content.appendChild(t2);
    
    // Clicar abre histórico
    content.addEventListener("click", () => {
      abrirHistoricoEstudo(s.id);
    });
    
    li.appendChild(content);
    ul.appendChild(li);
  });
}

function abrirHistoricoEstudo(estudoId) {
  const estudo = state.estudos.find(e => e.id === estudoId);
  if (!estudo) return;
  
  const nomeEl = document.getElementById("historico-estudo-nome");
  const listaEl = document.getElementById("historico-estudo-lista");
  const btnFechar = document.getElementById("btn-fechar-historico-estudo");
  
  nomeEl.textContent = estudo.nome;
  
  listaEl.innerHTML = "";
  
  // Informações do cadastro
  const infoCadastro = document.createElement("div");
  infoCadastro.className = "card";
  infoCadastro.style.marginBottom = "16px";
  infoCadastro.style.background = "var(--color-accent-soft)";
  
  let infoHTML = '<h4 style="margin: 0 0 12px 0;">📋 Informações</h4>';
  
  if (estudo.diaHora) {
    infoHTML += `<p style="margin: 4px 0;"><strong>🕒 Horário:</strong> ${estudo.diaHora}</p>`;
  }
  
  if (estudo.endereco) {
    infoHTML += `<p style="margin: 4px 0;"><strong>📍 Endereço:</strong> ${estudo.endereco}</p>`;
  }
  
  if (estudo.telefone) {
    const telefone = estudo.telefone.replace(/\D/g, '');
    const whatsappLink = `https://wa.me/${telefone}`;
    infoHTML += `<p style="margin: 4px 0;"><strong>📱 Telefone:</strong> ${estudo.telefone} <a href="${whatsappLink}" target="_blank" style="color: #25D366; text-decoration: none; font-weight: bold;">💬 WhatsApp</a></p>`;
  }
  
  infoCadastro.innerHTML = infoHTML;
  listaEl.appendChild(infoCadastro);
  
  // Título do histórico
  const tituloHistorico = document.createElement("h4");
  tituloHistorico.textContent = "📅 Histórico de estudos";
  tituloHistorico.style.marginTop = "16px";
  tituloHistorico.style.marginBottom = "12px";
  listaEl.appendChild(tituloHistorico);
  
  if (!estudo.historico || estudo.historico.length === 0) {
    const vazio = document.createElement("div");
    vazio.className = "historico-vazio";
    vazio.textContent = "Nenhum estudo registrado ainda.";
    listaEl.appendChild(vazio);
  } else {
    estudo.historico.sort((a, b) => b.data.localeCompare(a.data)).forEach(h => {
      const item = document.createElement("div");
      item.className = "historico-item";
      
      const data = document.createElement("div");
      data.className = "historico-item-data";
      data.textContent = h.data;
      
      const obs = document.createElement("div");
      obs.className = "historico-item-obs";
      obs.textContent = h.observacoes || "(sem observações)";
      
      item.appendChild(data);
      item.appendChild(obs);
      listaEl.appendChild(item);
    });
  }
  
  btnFechar.onclick = () => {
    closeModal("modal-historico-estudo");
  };
  
  openModal("modal-historico-estudo");
}

// Modal para registrar estudo (chamado do dashboard)
function initRegistrarEstudo() {
  const btn = document.getElementById("btn-registrar-estudo");
  btn.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) return;
    
    const lista = state.estudos.filter(e => e.userId === user.id);
    if (lista.length === 0) {
      showToast("Você ainda não tem estudos cadastrados. Vá para a aba Estudos e adicione um.", "info", 4000);
      return;
    }
    
    const listaEl = document.getElementById("lista-estudos-select");
    listaEl.innerHTML = "";
    
    lista.forEach(e => {
      const item = document.createElement("div");
      item.className = "select-item";
      
      const title = document.createElement("div");
      title.className = "select-item-title";
      title.textContent = e.nome;
      
      const info = document.createElement("div");
      info.className = "select-item-info";
      info.textContent = e.diaHora || "Horário não definido";
      
      item.appendChild(title);
      item.appendChild(info);
      
      item.addEventListener("click", () => {
        closeModal("modal-registrar-estudo");
        abrirFormObsEstudo(e.id);
      });
      
      listaEl.appendChild(item);
    });
    
    openModal("modal-registrar-estudo");
  });
}

function abrirFormObsEstudo(estudoId) {
  const estudo = state.estudos.find(e => e.id === estudoId);
  if (!estudo) return;
  
  const titulo = document.getElementById("modal-obs-estudo-titulo");
  const form = document.getElementById("form-obs-estudo");
  const dataInput = document.getElementById("obs-estudo-data");
  const textoInput = document.getElementById("obs-estudo-texto");
  const btnCancel = document.getElementById("btn-cancel-obs-estudo");
  
  titulo.textContent = `Registrar estudo - ${estudo.nome}`;
  dataInput.value = todayISO();
  textoInput.value = "";
  
  form.onsubmit = (e) => {
    e.preventDefault();
    
    const data = dataInput.value;
    const observacoes = textoInput.value.trim();
    
    if (!estudo.historico) estudo.historico = [];
    
    estudo.historico.push({
      id: uuid(),
      data,
      observacoes
    });
    
    // Também adicionar lançamento (sem horas por padrão)
    state.entries.push({
      id: uuid(),
      userId: estudo.userId,
      data,
      horas: 0,
      minutos: 0,
      modalidade: "Estudo Bíblico",
      obs: `Estudo: ${estudo.nome}. ${observacoes}`
    });
    
    saveState();
    closeModal("modal-obs-estudo");
    showToast("Estudo registrado com sucesso!", "success");
    renderEstudos();
    renderDashboard();
  };
  
  btnCancel.onclick = () => {
    closeModal("modal-obs-estudo");
  };
  
  openModal("modal-obs-estudo");
}

// ------------- METAS (COM MODAL) ----------------

function initConfigMetaModal() {
  const btn = document.getElementById("btn-configurar-meta");
  const btnEncerrar = document.getElementById("btn-encerrar-meta");
  const form = document.getElementById("form-modal-meta");
  const tipoSelect = document.getElementById("meta-tipo-servico");
  const fieldsDiv = document.getElementById("meta-fields");
  const btnCancel = document.getElementById("btn-cancel-meta");
  
  btn.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) return;
    
    // Verificar se tem meta aberta
    if (state.metasAbertas[user.id]) {
      showToast("Você já tem uma meta ativa. Encerre-a primeiro antes de criar uma nova.", "warning", 4000);
      return;
    }
    
    tipoSelect.value = user.tipo;
    renderMetaFields();
    openModal("modal-meta");
  });
  
  btnEncerrar.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) return;
    
    const metaAberta = state.metasAbertas[user.id];
    if (!metaAberta) {
      showToast("Nenhuma meta ativa para encerrar.", "info");
      return;
    }
    
    if (confirm(`Encerrar meta ${metaAberta.tipo}?`)) {
      delete state.metasAbertas[user.id];
      saveState();
      showToast("Meta encerrada!", "success");
      renderDashboard();
    }
  });
  
  tipoSelect.addEventListener("change", renderMetaFields);
  
  function renderMetaFields() {
    const tipo = tipoSelect.value;
    const user = getCurrentUser();
    const metas = user ? state.metas[user.id] : {};
    
    fieldsDiv.innerHTML = "";
    
    if (tipo === "publicador") {
      const label = document.createElement("label");
      label.innerHTML = `
        Meta mensal (opcional, em horas)
        <input type="number" id="meta-pub-mensal-modal" min="0" value="${metas?.pubMensal || ''}" />
      `;
      fieldsDiv.appendChild(label);
    } else if (tipo === "auxiliar") {
      const label = document.createElement("label");
      label.innerHTML = `
        Meta deste mês (horas)
        <input type="number" id="meta-aux-mensal-modal" min="0" value="${metas?.auxMensal || ''}" />
      `;
      fieldsDiv.appendChild(label);
    } else if (tipo === "regular") {
      const labelTipo = document.createElement("label");
      labelTipo.innerHTML = `
        Tipo de meta
        <select id="meta-reg-tipo-modal">
          <option value="mensal" ${metas?.regTipo === 'mensal' ? 'selected' : ''}>Mensal</option>
          <option value="anual" ${metas?.regTipo === 'anual' ? 'selected' : ''}>Anual</option>
        </select>
      `;
      fieldsDiv.appendChild(labelTipo);
      
      const labelMensal = document.createElement("label");
      labelMensal.id = "lbl-meta-reg-mensal-modal";
      labelMensal.innerHTML = `
        Meta mensal (horas)
        <input type="number" id="meta-reg-mensal-modal" min="0" value="${metas?.regMensal || ''}" />
      `;
      fieldsDiv.appendChild(labelMensal);
      
      const labelAnual = document.createElement("label");
      labelAnual.id = "lbl-meta-reg-anual-modal";
      labelAnual.classList.add("hidden");
      labelAnual.innerHTML = `
        Meta anual (horas)
        <input type="number" id="meta-reg-anual-modal" min="0" value="${metas?.regAnual || ''}" />
      `;
      fieldsDiv.appendChild(labelAnual);
      
      const selTipoModal = document.getElementById("meta-reg-tipo-modal");
      selTipoModal.addEventListener("change", () => {
        if (selTipoModal.value === "mensal") {
          labelMensal.classList.remove("hidden");
          labelAnual.classList.add("hidden");
        } else {
          labelMensal.classList.add("hidden");
          labelAnual.classList.remove("hidden");
        }
      });
      
      if (metas?.regTipo === "anual") {
        labelMensal.classList.add("hidden");
        labelAnual.classList.remove("hidden");
      }
    }
  }
  
  btnCancel.addEventListener("click", () => {
    closeModal("modal-meta");
  });
  
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return;
    
    const tipo = tipoSelect.value;
    const metasUser = state.metas[user.id] || { tipo };
    
    if (tipo === "publicador") {
      const v = document.getElementById("meta-pub-mensal-modal")?.value;
      metasUser.pubMensal = v ? Number(v) : null;
      metasUser.tipo = "publicador";
    } else if (tipo === "auxiliar") {
      const v = document.getElementById("meta-aux-mensal-modal")?.value;
      metasUser.auxMensal = v ? Number(v) : null;
      metasUser.tipo = "auxiliar";
    } else if (tipo === "regular") {
      const tipoMeta = document.getElementById("meta-reg-tipo-modal")?.value || "mensal";
      metasUser.regTipo = tipoMeta;
      metasUser.tipo = "regular";
      if (tipoMeta === "mensal") {
        const v = document.getElementById("meta-reg-mensal-modal")?.value;
        metasUser.regMensal = v ? Number(v) : null;
        metasUser.regAnual = null;
      } else {
        const v = document.getElementById("meta-reg-anual-modal")?.value;
        metasUser.regAnual = v ? Number(v) : null;
        metasUser.regMensal = null;
      }
    }
    
    // Atualizar tipo do usuário também
    user.tipo = tipo;
    state.metas[user.id] = metasUser;
    
    // Criar meta aberta
    let horasEsperadas = 0;
    if (tipo === "publicador" && metasUser.pubMensal) horasEsperadas = metasUser.pubMensal;
    if (tipo === "auxiliar" && metasUser.auxMensal) horasEsperadas = metasUser.auxMensal;
    if (tipo === "regular") {
      if (metasUser.regTipo === "mensal" && metasUser.regMensal) horasEsperadas = metasUser.regMensal;
      if (metasUser.regTipo === "anual" && metasUser.regAnual) horasEsperadas = metasUser.regAnual;
    }
    
    state.metasAbertas[user.id] = {
      tipo: tipo === "publicador" ? "Publicador" : tipo === "auxiliar" ? "Pioneiro Auxiliar" : "Pioneiro Regular",
      inicio: todayISO(),
      horasEsperadas
    };
    
    saveState();
    closeModal("modal-meta");
    showToast("Meta criada e ativada!", "success");
    renderDashboard();
  });
}

function initMetasView() {
  const user = getCurrentUser();
  if (!user) return;
  const metas = state.metas[user.id];
  const tipo = user.tipo;

  document.getElementById("metas-tipo").textContent =
    `Tipo: ${tipo === "publicador" ? "Publicador" :
      tipo === "auxiliar" ? "Pioneiro Auxiliar" : "Pioneiro Regular"}`;

  document.querySelectorAll(".metas-bloco").forEach(b => b.style.display = "none");
  if (tipo === "publicador") {
    document.getElementById("metas-publicador").style.display = "block";
    document.getElementById("meta-pub-mensal").value = metas.pubMensal ?? "";
  } else if (tipo === "auxiliar") {
    document.getElementById("metas-auxiliar").style.display = "block";
    document.getElementById("meta-aux-mensal").value = metas.auxMensal ?? "";
  } else if (tipo === "regular") {
    document.getElementById("metas-regular").style.display = "block";
    document.getElementById("meta-reg-tipo").value = metas.regTipo || "mensal";
    document.getElementById("meta-reg-mensal").value = metas.regMensal ?? "";
    document.getElementById("meta-reg-anual").value = metas.regAnual ?? "";
    toggleMetaRegularCampos();
  }
}

function toggleMetaRegularCampos() {
  const tipo = document.getElementById("meta-reg-tipo").value;
  const lblMensal = document.getElementById("lbl-meta-reg-mensal");
  const lblAnual = document.getElementById("lbl-meta-reg-anual");
  if (tipo === "mensal") {
    lblMensal.classList.remove("hidden");
    lblAnual.classList.add("hidden");
  } else {
    lblMensal.classList.add("hidden");
    lblAnual.classList.remove("hidden");
  }
}

function initMetasForm() {
  const selTipo = document.getElementById("meta-reg-tipo");
  selTipo.addEventListener("change", toggleMetaRegularCampos);

  const form = document.getElementById("form-metas");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return;
    const metasUser = state.metas[user.id] || { tipo: user.tipo };

    if (user.tipo === "publicador") {
      const v = document.getElementById("meta-pub-mensal").value;
      metasUser.pubMensal = v ? Number(v) : null;
    } else if (user.tipo === "auxiliar") {
      const v = document.getElementById("meta-aux-mensal").value;
      metasUser.auxMensal = v ? Number(v) : null;
    } else if (user.tipo === "regular") {
      const tipoMeta = document.getElementById("meta-reg-tipo").value;
      metasUser.regTipo = tipoMeta;
      if (tipoMeta === "mensal") {
        const v = document.getElementById("meta-reg-mensal").value;
        metasUser.regMensal = v ? Number(v) : null;
        metasUser.regAnual = null;
      } else {
        const v = document.getElementById("meta-reg-anual").value;
        metasUser.regAnual = v ? Number(v) : null;
        metasUser.regMensal = null;
      }
    }

    state.metas[user.id] = metasUser;
    saveState();
    showToast("Metas salvas.", "success");
    renderDashboard();
  });
}

// ------------- Config ----------------

function initConfigView() {
  const user = getCurrentUser();
  if (!user) return;
  const cfg = state.config[user.id] || {
    nome: user.nome,
    congregacao: user.congregacao,
    tipo: user.tipo,
    anciao: ""
  };
  document.getElementById("cfg-nome").value = cfg.nome;
  document.getElementById("cfg-congregacao").value = cfg.congregacao;
  document.getElementById("cfg-tipo").value = cfg.tipo;
  document.getElementById("cfg-anciao").value = cfg.anciao || "";
}

function initConfigForm() {
  const form = document.getElementById("form-config");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return;
    const nome = document.getElementById("cfg-nome").value.trim();
    const congregacao = document.getElementById("cfg-congregacao").value.trim();
    const tipo = document.getElementById("cfg-tipo").value;
    const anciao = document.getElementById("cfg-anciao").value.trim();

    user.nome = nome;
    user.congregacao = congregacao;
    user.tipo = tipo;

    state.config[user.id] = { nome, congregacao, tipo, anciao };
    saveState();
    showToast("Configurações salvas.", "success");
    renderDashboard();
  });

  // Sincronização Firebase
  const btnSync = document.getElementById("btn-sync-firebase");
  const syncStatus = document.getElementById("sync-status");
  
  btnSync.addEventListener("click", async () => {
    const user = getCurrentUser();
    if (!user) return;
    
    btnSync.disabled = true;
    btnSync.textContent = "⏳ Sincronizando...";
    syncStatus.textContent = "";
    
    try {
      const success = await syncToFirebase(user.id);
      if (success) {
        showToast("Dados sincronizados com sucesso!", "success");
        syncStatus.textContent = `✅ Última sincronização: ${new Date().toLocaleString('pt-BR')}`;
      } else {
        showToast("Erro ao sincronizar. Tente novamente.", "error");
      }
    } catch (error) {
      showToast("Erro ao sincronizar com Firebase.", "error");
      console.error(error);
    } finally {
      btnSync.disabled = false;
      btnSync.textContent = "☁️ Sincronizar agora";
    }
  });

  // Logout
  const btnLogout = document.getElementById("btn-logout");
  btnLogout.addEventListener("click", async () => {
    if (confirm("Deseja realmente sair da conta?")) {
      try {
        await waitForFirebase();
        const { signOut } = window.firebaseAuthMethods;
        const auth = window.firebaseAuth;
        await signOut(auth);
        
        state.currentUserId = null;
        saveState();
        showToast("Você saiu da conta.", "info");
        location.reload();
      } catch (error) {
        console.error("Erro ao fazer logout:", error);
        state.currentUserId = null;
        saveState();
        location.reload();
      }
    }
  });

  // Backup e restauração
  const btnExport = document.getElementById("btn-export-data");
  const btnImport = document.getElementById("btn-import-data");
  const fileImport = document.getElementById("file-import-data");

  btnExport.addEventListener("click", exportarDados);
  btnImport.addEventListener("click", () => fileImport.click());
  fileImport.addEventListener("change", importarDados);

  // Gerenciar anciãos
  initGerenciarAnciaos();
}

function initGerenciarAnciaos() {
  const btnAdd = document.getElementById("btn-add-anciao");
  const form = document.getElementById("form-add-anciao");
  const btnCancel = document.getElementById("btn-cancel-add-anciao");

  btnAdd.addEventListener("click", () => {
    form.reset();
    openModal("modal-add-anciao");
  });

  btnCancel.addEventListener("click", () => {
    closeModal("modal-add-anciao");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) return;

    const nome = document.getElementById("anciao-nome").value.trim();
    const telefone = document.getElementById("anciao-telefone").value.trim();

    state.anciaos.push({
      id: uuid(),
      userId: user.id,
      nome,
      telefone
    });

    saveState();
    renderAnciaos();
    closeModal("modal-add-anciao");
    showToast("Ancião adicionado!", "success");
  });

  renderAnciaos();
}

function renderAnciaos() {
  const user = getCurrentUser();
  if (!user) return;

  const lista = document.getElementById("lista-anciaos");
  lista.innerHTML = "";

  const anciaos = state.anciaos.filter(a => a.userId === user.id);

  if (anciaos.length === 0) {
    lista.innerHTML = '<li>Nenhum ancião cadastrado.</li>';
    return;
  }

  anciaos.forEach(a => {
    const li = document.createElement("li");
    li.className = "list-item-with-action";

    const content = document.createElement("div");
    content.className = "list-item-content";

    const title = document.createElement("div");
    title.className = "list-title";
    title.textContent = a.nome;

    const sub = document.createElement("div");
    sub.className = "list-sub";
    sub.textContent = a.telefone;

    content.appendChild(title);
    content.appendChild(sub);

    const btnDel = document.createElement("button");
    btnDel.className = "btn-secondary list-item-btn";
    btnDel.textContent = "🗑️";
    btnDel.addEventListener("click", () => {
      if (confirm(`Remover ${a.nome}?`)) {
        state.anciaos = state.anciaos.filter(x => x.id !== a.id);
        saveState();
        renderAnciaos();
        showToast("Ancião removido.", "success");
      }
    });

    li.appendChild(content);
    li.appendChild(btnDel);
    lista.appendChild(li);
  });
}

function exportarDados() {
  const dataStr = JSON.stringify(state, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-campo-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Backup exportado com sucesso!", "success");
}

function importarDados(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedState = JSON.parse(event.target.result);
      
      // Validar estrutura básica
      if (!importedState.users || !Array.isArray(importedState.users)) {
        throw new Error("Arquivo de backup inválido");
      }

      // Confirmar importação
      if (confirm(`Importar backup? Isso irá SOBRESCREVER todos os dados atuais.\n\nUsuários no backup: ${importedState.users.length}`)) {
        state = importedState;
        saveState();
        showToast("Dados importados com sucesso! Recarregando...", "success");
        setTimeout(() => location.reload(), 1500);
      }
    } catch (error) {
      showToast("Erro ao importar backup: " + error.message, "error", 5000);
    }
  };
  reader.readAsText(file);
  
  // Limpar input para permitir reimportação do mesmo arquivo
  e.target.value = "";
}

// ------------- Relatório ----------------

function gerarResumoMes(userId, ano, mes) {
  const key = `${ano}-${String(mes).padStart(2, "0")}`;
  const resumo = {
    horas: 0,
    minutos: 0,
    revisitas: 0,
    estudos: 0,
    publicacoes: 0,
    revisitasAbertas: 0,
    cartas: 0
  };
  state.entries
    .filter(e => e.userId === userId)
    .forEach(e => {
      const d = new Date(e.data);
      const k = monthYearKey(d);
      if (k === key) {
        resumo.horas += e.horas || 0;
        resumo.minutos += e.minutos || 0;
        if (e.modalidade === "Revisitas") resumo.revisitas++;
        if (e.modalidade === "Estudo Bíblico") resumo.estudos++;
        resumo.publicacoes += e.publicacoes || 0;
        resumo.revisitasAbertas += e.revisitasAbertas || 0;
        resumo.cartas += e.cartas || 0;
      }
    });

  resumo.horas += Math.floor(resumo.minutos / 60);
  resumo.minutos = resumo.minutos % 60;
  return resumo;
}

function montarTextoRelatorio(userId, ano, mes) {
  const user = state.users.find(u => u.id === userId);
  const cfg = state.config[userId] || {};
  const resumo = gerarResumoMes(userId, ano, mes);
  const key = `${ano}-${String(mes).padStart(2, "0")}`;
  const tituloMes = formatMesAno(key);

  const totalHoras = resumo.horas + resumo.minutos / 60;
  const teveCampo = totalHoras > 0;

  let texto = `Relatório – ${tituloMes}\n`;
  texto += `Publicador: ${cfg.nome || user.nome}\n`;
  texto += `Congregação: ${cfg.congregacao || user.congregacao}\n\n`;

  // Publicadores: apenas informam se foram ao campo (sim/não)
  if (user.tipo === "publicador") {
    if (teveCampo) {
      texto += `Participei no ministério: Sim\n`;
      if (resumo.revisitas > 0) texto += `Revisitas: ${resumo.revisitas}\n`;
      if (resumo.estudos > 0) texto += `Estudos bíblicos: ${resumo.estudos}\n`;
      if (resumo.publicacoes > 0) texto += `Publicações: ${resumo.publicacoes}\n`;
      if (resumo.revisitasAbertas > 0) texto += `Revisitas abertas: ${resumo.revisitasAbertas}\n`;
      if (resumo.cartas > 0) texto += `Cartas: ${resumo.cartas}\n`;
    } else {
      texto += `Participei no ministério: Não\n`;
    }
  } 
  // Pioneiros: mostram horas completas
  else {
    texto += `Total de horas: ${resumo.horas}h ${String(resumo.minutos).padStart(2, "0")}m\n`;
    texto += `Revisitas: ${resumo.revisitas}\n`;
    texto += `Estudos bíblicos: ${resumo.estudos}\n`;
    if (resumo.publicacoes > 0) texto += `Publicações: ${resumo.publicacoes}\n`;
    if (resumo.revisitasAbertas > 0) texto += `Revisitas abertas: ${resumo.revisitasAbertas}\n`;
    if (resumo.cartas > 0) texto += `Cartas: ${resumo.cartas}\n`;
  }

  texto += `\nEnviado via app de relatório de campo.`;
  return texto;
}

function initRelatorio() {
  const form = document.getElementById("form-relatorio");
  const btnGerar = document.getElementById("btn-gerar-relatorio");
  const preview = document.getElementById("relatorio-preview");
  const boxResultado = document.getElementById("relatorio-resultado");
  const btnWhats = document.getElementById("btn-enviar-whatsapp");
  const btnEnviarAnciao = document.getElementById("btn-enviar-relatorio-anciao");
  const btnAlterarMes = document.getElementById("btn-alterar-mes");
  const selectAno = document.getElementById("rel-ano");

  // Preencher anos (últimos 5 anos + próximos 2 anos)
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;
  
  for (let i = anoAtual - 5; i <= anoAtual + 2; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i;
    if (i === anoAtual) option.selected = true;
    selectAno.appendChild(option);
  }
  
  document.getElementById("rel-mes").value = mesAtual;

  btnGerar.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) return;
    const mes = document.getElementById("rel-mes").value;
    const ano = document.getElementById("rel-ano").value;
    if (!mes || !ano) {
      showToast("Informe o mês e ano.", "warning");
      return;
    }
    const texto = montarTextoRelatorio(user.id, Number(ano), Number(mes));
    preview.textContent = texto;
    boxResultado.classList.remove("hidden");
  });

  btnAlterarMes.addEventListener("click", () => {
    boxResultado.classList.add("hidden");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  btnWhats.addEventListener("click", () => {
    const texto = preview.textContent;
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  });

  btnEnviarAnciao.addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) return;
    
    const anciaos = state.anciaos.filter(a => a.userId === user.id);
    
    if (anciaos.length === 0) {
      showToast("Você não tem anciãos cadastrados. Vá em Configurações para adicionar.", "warning", 4000);
      return;
    }
    
    abrirSelecaoAnciao((anciao) => {
      const texto = preview.textContent;
      const fone = anciao.telefone.replace(/\D/g, "");
      const url = `https://wa.me/${fone}?text=${encodeURIComponent(texto)}`;
      window.open(url, "_blank");
    });
  });

  form.addEventListener("submit", e => e.preventDefault());
}

function abrirSelecaoAnciao(callback) {
  const user = getCurrentUser();
  if (!user) return;

  const anciaos = state.anciaos.filter(a => a.userId === user.id);
  const lista = document.getElementById("lista-anciaos-select");
  lista.innerHTML = "";

  anciaos.forEach(a => {
    const item = document.createElement("div");
    item.className = "select-item";
    item.innerHTML = `
      <div class="select-item-title">${a.nome}</div>
      <div class="select-item-sub">${a.telefone}</div>
    `;
    item.addEventListener("click", () => {
      callback(a);
      closeModal("modal-selecionar-anciao");
    });
    lista.appendChild(item);
  });

  document.getElementById("btn-cancel-selecionar-anciao").onclick = () => {
    closeModal("modal-selecionar-anciao");
  };

  openModal("modal-selecionar-anciao");
}

// ------------- Navegação inferior ----------------

function initBottomNav() {
  const nav = document.getElementById("bottom-nav");
  nav.addEventListener("click", e => {
    const btn = e.target.closest("[data-nav]");
    if (!btn) return;
    const view = btn.dataset.nav;
    if (view === "dashboard" || view === "lancamento" || view === "revisitas" ||
        view === "relatorio" || view === "config" || view === "estudos") {
      showView(view);
    }
  });
}

// ------------- Init geral ----------------

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  initThemeToggle();
  initInstallButton();
  initAuth();
  initLancamentoForm();
  initEditarLancamento();
  initToggleLancamentos();
  initTimerModal();
  initBottomNav();
  initRevisitas();
  initRegistrarRevisita();
  initEstudos();
  initRegistrarEstudo();
  initMetasForm();
  initConfigMetaModal();
  initConfigForm();
  initRelatorio();
  populateModalidades();

  const user = getCurrentUser();
  if (user) {
    showView("dashboard");
  } else {
    showView("login");
  }
});
