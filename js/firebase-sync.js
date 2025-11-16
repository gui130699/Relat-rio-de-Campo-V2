// Funções de sincronização com Firebase

// Aguardar Firebase estar disponível
function waitForFirebase() {
  return new Promise((resolve) => {
    if (window.firebaseAuth && window.firebaseDb) {
      resolve();
    } else {
      const interval = setInterval(() => {
        if (window.firebaseAuth && window.firebaseDb) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    }
  });
}

// Sincronizar dados do usuário com Firebase
async function syncToFirebase(userId) {
  try {
    await waitForFirebase();
    
    const { doc, setDoc } = window.firebaseDbMethods;
    const db = window.firebaseDb;
    
    // Pegar dados locais
    const localState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    
    // Dados do usuário para sincronizar
    const userEntries = localState.entries?.filter(e => e.userId === userId) || [];
    const userRevisitas = localState.revisitas?.filter(r => r.userId === userId) || [];
    const userEstudos = localState.estudos?.filter(e => e.userId === userId) || [];
    const userConfig = localState.config?.[userId] || {};
    const userMetas = localState.metas?.[userId] || {};
    const userMetasAbertas = localState.metasAbertas?.[userId] || null;
    const userAnciaos = localState.anciaos?.filter(a => a.userId === userId) || [];
    
    // Salvar no Firestore
    await setDoc(doc(db, 'users', userId), {
      entries: userEntries,
      revisitas: userRevisitas,
      estudos: userEstudos,
      config: userConfig,
      metas: userMetas,
      metasAbertas: userMetasAbertas,
      anciaos: userAnciaos,
      lastSync: new Date().toISOString()
    }, { merge: true });
    
    console.log('✅ Dados sincronizados com Firebase');
    return true;
  } catch (error) {
    console.error('❌ Erro ao sincronizar com Firebase:', error);
    return false;
  }
}

// Carregar dados do Firebase
async function loadFromFirebase(userId) {
  try {
    await waitForFirebase();
    
    const { doc, getDoc } = window.firebaseDbMethods;
    const db = window.firebaseDb;
    
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Mesclar com dados locais
      const localState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      
      // Atualizar apenas os dados do usuário atual
      localState.entries = [
        ...(localState.entries?.filter(e => e.userId !== userId) || []),
        ...(data.entries || [])
      ];
      
      localState.revisitas = [
        ...(localState.revisitas?.filter(r => r.userId !== userId) || []),
        ...(data.revisitas || [])
      ];
      
      localState.estudos = [
        ...(localState.estudos?.filter(e => e.userId !== userId) || []),
        ...(data.estudos || [])
      ];
      
      if (!localState.config) localState.config = {};
      localState.config[userId] = data.config || {};
      
      if (!localState.metas) localState.metas = {};
      localState.metas[userId] = data.metas || {};
      
      if (!localState.metasAbertas) localState.metasAbertas = {};
      if (data.metasAbertas) {
        localState.metasAbertas[userId] = data.metasAbertas;
      }
      
      localState.anciaos = [
        ...(localState.anciaos?.filter(a => a.userId !== userId) || []),
        ...(data.anciaos || [])
      ];
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localState));
      
      console.log('✅ Dados carregados do Firebase');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Erro ao carregar do Firebase:', error);
    return false;
  }
}

// Ativar sincronização automática (salvar sempre que houver mudança)
function enableAutoSync(userId) {
  // Interceptar saveState para sincronizar automaticamente
  const originalSaveState = window.saveState;
  window.saveState = function() {
    originalSaveState();
    // Sincronizar em background sem bloquear
    syncToFirebase(userId).catch(err => console.error('Erro na sync automática:', err));
  };
}

// Exportar funções para o escopo global
window.waitForFirebase = waitForFirebase;
window.syncToFirebase = syncToFirebase;
window.loadFromFirebase = loadFromFirebase;
window.enableAutoSync = enableAutoSync;
