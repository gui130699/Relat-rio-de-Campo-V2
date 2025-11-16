# 📱 Relatório de Campo - PWA v1

Progressive Web App para controle de relatório de campo com tema elegante inspirado em JW Library + iOS.

## ✨ Funcionalidades

- ✅ **Login e cadastro** simples (sem Google)
- ⏱️ **Registro de horas** (timer automático + manual)
- 🔁 **Revisitas** com histórico
- 📖 **Estudos bíblicos** com acompanhamento
- 🎯 **Metas personalizadas** por tipo (publicador / auxiliar / regular)
- 📤 **Relatório mensal** com envio por WhatsApp
- 🌓 **Tema claro/escuro** (roxo elegante + clean iOS)
- 📴 **Funciona offline** (PWA com service worker)
- 💾 **Dados salvos localmente** (localStorage)

## 🚀 Como usar

### No computador

1. Abra o arquivo `index.html` no seu navegador (Chrome, Edge, Firefox, Safari)
2. Crie uma conta ou faça login
3. Comece a registrar suas horas de campo!

### No celular (instalar como app)

#### Android (Chrome):
1. Abra o arquivo `index.html` no Chrome
2. Toque no menu (⋮) > **"Adicionar à tela inicial"** ou **"Instalar app"**
3. Confirme a instalação
4. O app aparecerá na tela inicial como um app nativo!

#### iOS (Safari):
1. Abra o arquivo `index.html` no Safari
2. Toque no botão **Compartilhar** (□↑)
3. Role e selecione **"Adicionar à Tela Inicial"**
4. Toque em **"Adicionar"**
5. O app aparecerá na tela inicial!

## 📁 Estrutura

```
pwa-relatorio-campo/
│
├── index.html              # Página principal
├── manifest.webmanifest    # Manifesto PWA
├── service-worker.js       # Cache offline
│
├── css/
│   └── style.css          # Estilos (tema roxo + iOS)
│
└── js/
    └── app.js             # Lógica do app
```

## 🎨 Tema Visual

- **Cores**: Roxo elegante (#8a6bff) inspirado em JW Library
- **Estilo**: Clean e arredondado (iOS-style)
- **Responsivo**: Otimizado para mobile (max-width 480px)
- **Animações**: Transições suaves e modernas

## 💡 Dicas de uso

- Use o **timer automático** para registrar horas em tempo real
- Cadastre suas **revisitas** para acompanhar as visitas
- Configure suas **metas** de acordo com seu tipo de serviço
- Envie o relatório por **WhatsApp** direto para o ancião
- Alterne entre **tema claro/escuro** com o botão 🌓

## 🔄 Próximos passos (v2)

- [ ] Notificações de revisitas agendadas
- [ ] Migração para IndexedDB + backend online
- [ ] Gráficos de evolução mensal
- [ ] Backup e sincronização na nuvem
- [ ] Modo colaborativo (grupo de serviço)

## 📝 Observações

- Os dados são salvos localmente no navegador
- Para não perder dados, não limpe o cache do navegador
- Funciona 100% offline após o primeiro acesso

---

**Feito com ❤️ para facilitar o registro do campo**
