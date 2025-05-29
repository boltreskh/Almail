// Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, doc, getDoc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Variáveis globais do Firebase
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Inicializa firebaseConfig de forma mais robusta
let firebaseConfig = {};
try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
        const parsedConfig = JSON.parse(__firebase_config);
        // Garante que parsedConfig é um objeto e não nulo/array
        if (typeof parsedConfig === 'object' && parsedConfig !== null && !Array.isArray(parsedConfig)) {
            firebaseConfig = parsedConfig;
        }
    }
} catch (e) {
    console.warn("Não foi possível analisar __firebase_config. Usando configuração padrão vazia.", e);
}

// Se firebaseConfig ainda estiver vazia ou faltando projectId, forneça um mínimo padrão
if (!firebaseConfig.projectId) {
    console.warn("projectId do Firebase não encontrado na configuração fornecida. Os recursos do Firebase serão desativados.");
    firebaseConfig = {
        apiKey: "AIzaSyBLyIuKHL1QGtixLrvkwb-SvWrwcD7zRxA",
        authDomain: "almail-9b8d9.firebaseapp.com",
        projectId: "almail-9b8d9",
        storageBucket: "almail-9b8d9.firebasestorage.app",
        messagingSenderId: "842016603414",
        appId: "1:842016603414:web:1fb43568432d8b7e9ba437",
        measurementId: "G-YFJTNHDHGP"
    };
}

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Inicializa o Firebase
let app;
let db;
let auth;
let userId = null; // ID do usuário autenticado ou anônimo
let isAuthReady = false; // Flag para indicar que a autenticação foi concluída

// NOVO: Elementos do DOM para o modal de versão e atualizações
const versionInfoModalOverlay = document.getElementById('version-info-modal-overlay');
const versionInfoUseButton = document.getElementById('version-info-use-button');

// Elementos do DOM
const creditsModalOverlay = document.getElementById('credits-modal-overlay');
const creditsCloseButton = document.getElementById('credits-close-button');
const creditsOkButton = document.getElementById('credits-ok-button');

// Novos elementos para o modal de dados iniciais
const initialDataModalOverlay = document.getElementById('initial-data-modal-overlay');
const collaboratorNameInput = document.getElementById('collaborator-name-input');
const clientNameInput = document.getElementById('client-name-input');
const serviceChannelSelect = document.getElementById('service-channel-select');
const ecosystemSelect = document.getElementById('ecosystem-select');
const initialDataConfirmButton = document.getElementById('initial-data-confirm-button');
const initialDataCloseButton = document.getElementById('initial-data-close-button');

const chatAndInputArea = document.getElementById('chat-and-input-area');
const initialScreen = document.getElementById('initial-screen');
const startChatButton = document.getElementById('start-chat-button');
const appWrapper = document.getElementById('app-wrapper');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessage = document.getElementById('error-message');
const themeToggleButton = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const tutorialButton = document.getElementById('tutorial-button');
const tutorialModalOverlay = document.getElementById('tutorial-modal-overlay');
const tutorialCloseButton = document.getElementById('tutorial-close-button');
const tutorialOkButton = document.getElementById('tutorial-ok-button');
const homeButton = document.getElementById('home-button');

// NOVO: Botão de Créditos no cabeçalho
const creditsButton = document.getElementById('credits-button');

// Novo: Botão único de alternância de idioma
const languageToggleButton = document.getElementById('language-toggle-button');
const currentLanguageText = document.getElementById('current-language-text');

// Elementos para o modal de confirmação de reiniciar conversa
const confirmationModalOverlay = document.getElementById('confirmation-modal-overlay');
const confirmRestartYesButton = document.getElementById('confirm-restart-yes');
const confirmRestartNoButton = document.getElementById('confirm-restart-no');

// Novos elementos para o modal de confirmação de troca de idioma
const languageConfirmationModalOverlay = document.getElementById('language-confirmation-modal-overlay');
const confirmLanguageYesButton = document.getElementById('confirm-language-yes');
const confirmLanguageNoButton = document.getElementById('confirm-language-no');

// Elementos do histórico de conversas
const conversationHistorySidebar = document.getElementById('conversation-history-sidebar');
const historyList = document.getElementById('history-list');
const favoritesList = document.getElementById('favorites-list'); // NOVO: Lista de favoritos
const mainSidebarToggleButton = document.getElementById('main-sidebar-toggle-button');
const contentArea = document.getElementById('content-area');

// NOVO: Elementos para os botões de sentimento
const sentimentButtonsContainer = document.getElementById('sentiment-buttons-container');

// NOVO: Elementos para os botões de tom da IA
const aiToneButtonsContainer = document.getElementById('ai-tone-buttons-container');

// Variável para armazenar o ID do timeout da digitação, permitindo cancelá-lo.
let typingTimeoutId = null;

// Flag para controlar se a conversa está ativa ou foi reiniciada.
let isConversationActive = true;

// Variável para armazenar o nome do cliente atual
let currentClientName = null;
// Nova variável para armazenar o nome do colaborador
let collaboratorName = null;
// Nova variável para armazenar o canal de atendimento
let serviceChannel = null;
// Nova variável para armazenar o Ecossistema de atendimento
let ecosystem = null;

// NOVO: Variável para armazenar o sentimento do cliente
let currentClientSentiment = null; // Pode ser 'satisfeito', 'neutro', 'frustrado' ou null

// NOVO: Variável para armazenar o tom da IA
let currentAiTone = null; // Pode ser 'formal', 'empathetic', 'direct' ou null

// Variável para armazenar o idioma atual e o idioma pendente de confirmação
let currentLanguage = 'pt-BR'; // Padrão
const availableLanguages = ['pt-BR', 'en', 'es']; // Idiomas disponíveis

// Variável para armazenar o ID da conversa atual no Firestore
let currentConversationId = null;

// Variável para controlar o estado da sidebar. Inicia como 'false' para vir fechada por padrão.
let isSidebarVisible = false;

// Objeto de traduções
const translations = {
    'pt-BR': {
        appTitle: 'Almail Suporte IA - Ecossistema MELI',
        // NOVO: Traduções para o modal de versão e atualizações
        versionInfoTitle: 'Bem-vindo(a) à Almail Suporte IA!',
        versionInfoSubtitle: 'Versão: Beta 1.4.0',
        latestUpdatesTitle: 'Últimas Atualizações:',
        latestUpdatesContent: `
            <li><strong>Performance:</strong> A inteligência artificial agora opera com maior agilidade.</li>
            <li><strong>Visual:</strong> Agora é possível adicionar conversas aos favoritos na seção de Histórico de Conversas.</li>
            <li><strong>Escolhas e Aprimoramento:</strong> Adição de escolhas de sentimentos para aprimorar as respostas da IA de acordo com a dúvida do usuário e qual tom a IA deve usar na resposta, adicionando qual tom a IA pode agir.</li>
        `,
        versionInfoUseButton: 'Utilizar',
        creditsModalTitle: 'Créditos',
        creditsModalSubtitle: 'Uma ferramenta de suporte inteligente para o time de Mercado Livre e Mercado Pago.',
        creditsModalDescription: `
            <ul class="list-none p-0 text-center">
                <li class="mb-2"><strong>Desenvolvedores:</strong></li>
                <li class="mb-1">Lucas Carneiro</li>
                <li class="mb-1">Lucas Candido</li>
                <li class="mb-1">Vitória Pinheiro</li>
                <li class="mb-2 mt-3"><strong>Apoio e Colaboração:</strong></li>
                <li class="mb-1">Time de Mercado Livre e Mercado Pago (Concentrix)</li>
                <li class="mb-2 mt-3"><strong>Links:</strong></li>
                <li class="mb-1"><a href="https://github.com/boltreskh" target="_blank" class="text-blue-500 hover:underline">Candido GitHub</a></li>
                <li class="mb-1"><a href="https://github.com/boltreskh/Almail" target="_blank" class="text-blue-500 hover:underline">Repositório do Projeto</a></li>
            </ul>
        `,
        creditsModalButton: 'Entendi',
        creditsButtonAria: 'Ver Créditos',
        initialDataModalTitle: 'Informações Iniciais',
        initialDataModalSubtitle: 'Por favor, preencha os dados para otimizar o atendimento.',
        collaboratorNameLabel: 'Seu Nome:',
        collaboratorNamePlaceholder: 'Ex: Ana Silva',
        clientNameLabel: 'Nome do Cliente:',
        clientNamePlaceholder: 'Ex: João Souza',
        serviceChannelLabel: 'Canal de Atendimento:',
        channelChat: 'Chat',
        channelEmail: 'Email',
        channelC2C: 'C2C (Voz)',
        ecosystemLabel: 'Ecossistema:',
        ecosystemMercadoLivre: 'Mercado Livre',
        ecosystemMercadoPago: 'Mercado Pago',
        initialDataConfirmButton: 'Confirmar',

        tutorialModalTitle: 'Guia Rápido: Almail Suporte IA',
        tutorialModalButton: 'Entendido!',
        restartConfirmTitle: 'Reiniciar Conversa?',
        restartConfirmSubtitle: 'Tem certeza que deseja reiniciar a conversa? Todo o histórico será apagado.',
        restartConfirmYes: 'Sim, Reiniciar',
        restartConfirmNo: 'Não, Cancelar',
        languageConfirmTitle: 'Trocar Idioma?',
        languageConfirmSubtitle: 'Ao trocar o idioma, a conversa atual será apagada. Deseja continuar?',
        languageConfirmYes: 'Sim, Trocar',
        languageConfirmNo: 'Não, Cancelar',
        headerSubtitle: 'Suporte IA - Ecossistema MELI',
        tutorialButtonAria: 'Abrir Tutorial',
        themeToggleButtonAria: 'Alternar Tema',
        homeButtonAria: 'Voltar para o Início',
        typingIndicator: 'Almail está digitando...',
        thinkingMessage: 'Almail está analisando a sua pergunta...',
        inputPlaceholder: 'Pergunte à Almail...',
        sendButtonAria: 'Enviar Mensagem',
        footerCopyright: '© 2025 Almail Suporte IA. Todos os direitos reservados.',
        footerDisclaimer: 'Esta IA utiliza dados públicos e não armazena informações do Mercado Livre ou Mercado Pago.',
        welcomeMessage: "Olá {COLLABORATOR_NAME}! Sou a Almail, sua assistente virtual especializada em suporte para o Ecossistema Mercado Livre e Mercado Pago. Estou aqui para te ajudar a atender {CLIENT_NAME_ADAPTED} via {SERVICE_CHANNEL_ADAPTED}.",
        historyTitle: 'Histórico de Conversas',
        userIdDisplay: 'ID do Usuário:',
        homeButton: 'Início',
        newChat: 'Nova Conversa',
        deleteConfirm: 'Tem certeza que deseja excluir esta conversa?',
        deleteConfirmYes: 'Sim, Excluir',
        deleteConfirmNo: 'No, Manter',
        confirmYesDefault: 'Sim',
        confirmNoDefault: 'Não',
        editTitle: 'Editar Título',
        saveTitle: 'Salvar Título',
        cancelEdit: 'Cancelar Edição',
        errorMessage: 'Ocorreu um erro. Por favor, tente novamente.',
        systemInstructions: `Você é a Almail, uma assistente virtual especializada em suporte para o **Ecossistema Mercado Livre e Mercado Pago**.
Seu objetivo principal é **auxiliar o colaborador** a fornecer um atendimento de excelência aos clientes.
Você deve agir como um **agente de suporte para o colaborador**, fornecendo informações precisas e estruturadas para que ele possa, por sua vez, ajudar o cliente.

**É CRÍTICO que você responda SEMPRE e SOMENTE em Português (Brasil).**
**Nunca utilize palavras negativas como: infelizmente, frustração, decepção, desapontamento, desgosto, decepcionado.**

**Informações do Atendimento Atual:**
* **Nome do Colaborador:** {COLLABORATOR_NAME}
* **Nome do Cliente Final:** {CLIENT_NAME} (Se o cliente não tiver um nome específico, este campo será "Não Informado")
* **Canal de Atendimento:** {SERVICE_CHANNEL} (Pode ser "Chat", "Email" ou "C2C (Voz)")
* **Ecossistema de Atendimento:** {ECOSYSTEM}
* **Sentimento do Cliente:** {CLIENT_SENTIMENT} (Este é o sentimento que o colaborador indicou para o cliente: "Satisfeito", "Neutro", "Frustrado" ou "Não Informado". Leve isso em consideração para adaptar o tone e a profundidade da sua resposta, focando em soluções e empatia.)
* **Tom da Resposta da IA:** {AI_TONE} (Este é o tom que a IA deve usar na sua resposta: "Formal", "Empático" ou "Direto". Adapte a linguagem e a estrutura da sua resposta para refletir este tom.)

**Adaptação da Resposta com base no Canal de Atendimento:**

{SERVICE_CHANNEL_INSTRUCTIONS}

**Adaptação da Resposta com base no Ecossistema:**

{ECOSYSTEM_INSTRUCTIONS}

**Diretrizes operacionais:**
1.  **Foco e Escopo:** Seu conhecimento é exclusivo sobre o **Ecossistema Mercado Livre e Mercado Pago** (vendas, compras, pagamentos, envios, contas, etc.). **Não responda a perguntas fora deste escopo.** Se a pergunta não for clara ou estiver fora do escopo, peça ao colaborador para reformular ou esclarecer.
2.  **Linguagem:** Formal, profissional, clara, concisa e direta. **Nunca use emojis.** Utilize uma linguagem que seja útil para o colaborador, como se estivesse fornecendo um "roteiro" ou "base de conhecimento".
3.  **Personalização e Identificação:**
    * **Sempre se dirija ao colaborador pelo nome, se disponível.** Ex: "Olá, {COLLABORATOR_NAME}! Para a sua dúvida..."
    * **Nunca confunda o colaborador com o cliente.** Se o nome do cliente for fornecido, use-o para personalizar a *resposta que o colaborador dará ao cliente*. Ex: "Para o cliente {CLIENT_NAME}, você pode informar que...".
    * Se o nome do cliente não for fornecido, use termos neutros como "o cliente" ou "o usuário" ao se referir a ele, mas sempre no contexto de como o *colaborador* deve interagir.
3.  **Objetividade e Clareza:** Responda apenas ao que foi perguntado, fornecendo informações precisas e baseadas em políticas e procedimentos do Mercado Livre/Mercado Pago. Evite divagações.
4.  **Segurança e Dados Sensíveis:** **NUNCA solicite ou processe informações sensíveis do cliente** (senhas, dados bancários completos, etc.). Se tais informações forem mencionadas pelo colaborador, instrua-o a lidar com elas de forma segura e offline, sem que a IA as processe ou as armazene.
5.  **Resolução e Aprofundamento:** Seu objetivo é ajudar o colaborador a resolver o problema do cliente. Se a resposta inicial não for suficiente, reformule ou aprofunde a explicação, sempre pensando em como o colaborador pode usar essa informação.
6.  **Estrutura da Resposta:** Utilize Markdown para organizar as informações (negrito, itálico, listas, blocos de código se necessário) para facilitar a leitura e o uso pelo colaborador. Considere usar títulos e subtítulos para respostas mais complexas.
7.  **Contexto e Continuidade:** Baseie-se no histórico da conversa para manter a coerência e a relevância. Se o colaborador fizer uma pergunta de acompanhamento, use o contexto anterior para fornecer uma resposta mais completa.
8.  **Proatividade (Opcional):** Se apropriado, sugira ao colaborador próximos passos ou informações adicionais que possam ser relevantes para o atendimento do cliente.`,
        tutorialText: `
            <h3 class="2xl font-bold text-center mb-5 text-blue-700">Desvende a Almail: Sua Plataforma de Suporte Inteligente</h3>
            <p class="mb-4 text-lg leading-relaxed">Abaixo, explore os principais botões e suas funções:</p>
            <ul class="list-none pl-0">
                <li class="mb-3 flex items-center">
                    <i data-feather="home" class="text-green-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Botão de Início:</strong> Localizado no canto superior esquerdo do cabeçalho, clique neste ícone <i data-feather="home" class="inline-block"></i> para retornar à tela inicial a qualquer momento e iniciar uma nova interação.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="globe" class="text-indigo-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Alternar Idioma:</strong> Ao lado do botão de Guia Rápido, use este botão (<i data-feather="globe" class="inline-block"></i> PT, EN, ES) para alternar entre os idiomas disponíveis (Português, Inglês, Espanhol). A troca de idioma reiniciará a conversa atual.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="help-circle" class="text-blue-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Botão de Guia Rápido:</strong> No canto superior direito do cabeçalho, clique neste ícone <i data-feather="help-circle" class="inline-block"></i> a qualquer momento para acessar este guia e relembrar as funcionalidades da Almail.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="info" class="text-yellow-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Botão de Créditos:</strong> Ao lado do botão de Tema, clique neste ícone <i data-feather="info" class="inline-block"></i> para visualizar os créditos dos desenvolvedores e colaboradores da Almail.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="moon" class="text-purple-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Alternar Tema:</strong> No canto superior direito do cabeçalho, ao lado do botão de idioma, use este botão <i data-feather="moon" class="inline-block"></i> (ou <i data-feather="sun" class="inline-block"></i>) para mudar entre o tema claro e o tema escuro, personalizando sua experiência visual.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="send" class="text-indigo-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Enviar Mensagem:</strong> Localizado na área de entrada de texto, após digitar sua pergunta ou solicitação, clique neste botão <i data-feather="send" class="inline-block"></i> ou pressione <strong>Enter</strong> para enviar sua mensagem à Almail.</p>
                </li>
            </ul>
            <p class="mt-6 text-lg leading-relaxed">Com estes recursos, você terá total controle sobre sua interação com a Almail. Estamos aqui para simplificar seu dia a dia e oferecer o melhor suporte!</p>
        `,
        likeFeedback: 'Que ótimo que a resposta foi útil! Continuarei aprimorando para melhor te atender.',
        dislikeFeedback: 'Agradeço seu feedback! Estou aprendendo e vou tentar gerar uma resposta mais útil, estruturada e personalizada para você.',
        dislikePrompt: `A resposta anterior não foi satisfatória. Por favor, gere uma nova resposta mais útil, com melhor argumentação e estruturação de texto, e personalize-a para o cliente se o nome dele estiver disponível. Lembre-se de me ajudar a resolver o problema do problema do cliente.`,
        initialScreenTitle: 'Almail Suporte IA!', // Título alterado aqui
        initialScreenSubtitle: 'Sua assistente inteligente para otimizar o suporte no Ecossistema Mercado Livre e Mercado Pago.',
        initialScreenDescription: 'Aqui você pode obter informações rápidas e precisas sobre diversos tópicos relacionados ao Mercado Livre e Mercado Pago. Clique em "Iniciar Nova Conversa" para começar a interagir com a IA.',
        startChatButton: 'Iniciar Nova Conversa',
        collaboratorNameRequired: 'Por favor, informe seu nome.',
        clientNameRequired: 'Por favor, informe o nome do cliente.',
        sentimentQuestion: 'Como você percebe o sentimento do usuário no contato?',
        sentimentSatisfied: 'Satisfeito',
        sentimentNeutral: 'Neutro',
        sentimentFrustrated: 'Frustrado',
        sentimentSelected: 'Sentimento registrado: {SENTIMENT}.',
        aiToneQuestion: 'Qual tom a IA deve usar na resposta?',
        aiToneFormal: 'Formal',
        aiToneEmpathetic: 'Empático',
        aiToneDirect: 'Direto',
        aiToneSelected: 'Tom da IA registrado: {TONE}.',
        allConversations: 'Todas as Conversas', // NOVO: Tradução para "Todas as Conversas"
        favoriteConversations: 'Conversas Favoritas', // NOVO: Tradução para "Conversas Favoritas"
        favoriteButtonAria: 'Marcar/Desmarcar como favorito', // NOVO: Tradução para aria-label do botão de favorito
    },
    'en': {
        appTitle: 'Almail AI Support - MELI Ecosystem',
        // NOVO: Traduções para o modal de versão e atualizações
        versionInfoTitle: 'Welcome to Almail AI Support!',
        versionInfoSubtitle: 'Version: Beta 1.4.0',
        latestUpdatesTitle: 'Latest Updates:',
        latestUpdatesContent: `
            <li><strong>Performance:</strong> The artificial intelligence now operates with greater agility.</li>
            <li><strong>Visual:</strong> It's now possible to add conversations to favorites in the Conversation History section.</li>
            <li><strong>Choices and Enhancement:</strong> Added sentiment choices to enhance AI responses according to user queries and "What tone should the AI use in the response?", allowing the AI to act with a specific tone.</li>
        `,
        versionInfoUseButton: 'Use Application',
        creditsModalTitle: 'Credits',
        creditsModalSubtitle: 'An intelligent support tool for the Mercado Livre and Mercado Pago team.',
        creditsModalDescription: `
            <ul class="list-none p-0 text-center">
                <li class="mb-2"><strong>Developers:</strong></li>
                <li class="mb-1">Lucas Carneiro</li>
                <li class="mb-1">Lucas Candido</li>
                <li class="mb-1">Vitória Pinheiro</li>
                <li class="mb-2 mt-3"><strong>Support and Collaboration:</strong></li>
                <li class="mb-1">Mercado Livre and Mercado Pago Team (Concentrix)</li>
                <li class="mb-2 mt-3"><strong>Links:</strong></li>
                <li class="mb-1"><a href="https://github.com/boltreskh" target="_blank" class="text-blue-500 hover:underline">Candido GitHub</a></li>
                <li class="mb-1"><a href="https://github.com/boltreskh/Almail" target="_blank" class="text-blue-500 hover:underline">Project Repository</a></li>
            </ul>
        `,
        creditsModalButton: 'Understood',
        creditsButtonAria: 'View Credits',
        initialDataModalTitle: 'Initial Information',
        initialDataModalSubtitle: 'Please fill in the details to optimize the service.',
        collaboratorNameLabel: 'Your Name:',
        collaboratorNamePlaceholder: 'Ex: Anna Smith',
        clientNameLabel: 'Client Name:',
        clientNamePlaceholder: 'Ex: John Doe',
        serviceChannelLabel: 'Service Channel:',
        channelChat: 'Chat',
        channelEmail: 'Email',
        channelC2C: 'C2C (Voice)',
        ecosystemLabel: 'Ecosystem:',
        ecosystemMercadoLivre: 'Mercado Libre',
        ecosystemMercadoPago: 'Mercado Pago',
        initialDataConfirmButton: 'Confirm',

        tutorialModalTitle: 'Quick Guide: Almail AI Support',
        tutorialModalButton: 'Got it!',
        restartConfirmTitle: 'Restart Conversation?',
        restartConfirmSubtitle: 'Are you sure you want to restart the conversation? All history will be erased.',
        restartConfirmYes: 'Yes, Restart',
        restartConfirmNo: 'No, Cancel',
        languageConfirmTitle: 'Change Language?',
        languageConfirmSubtitle: 'Changing the language will clear the current conversation. Do you want to continue?',
        languageConfirmYes: 'Yes, Change',
        languageConfirmNo: 'No, Cancel',
        headerSubtitle: 'AI Support - MELI Ecosystem',
        tutorialButtonAria: 'Open Tutorial',
        themeToggleButtonAria: 'Toggle Theme',
        homeButtonAria: 'Back to Home',
        typingIndicator: 'Almail is typing...',
        thinkingMessage: 'Almail is analyzing your question...',
        inputPlaceholder: 'Ask Almail...',
        sendButtonAria: 'Send Message',
        footerCopyright: '© 2025 Almail AI Support. All rights reserved.',
        footerDisclaimer: 'This AI uses public data and does not store Mercado Livre or Mercado Pago information.',
        welcomeMessage: "Hello {COLLABORATOR_NAME}! I'm Almail, your virtual assistant specialized in support for the Mercado Livre and Mercado Pago Ecosystem. I'm here to help you assist {CLIENT_NAME_ADAPTED} via {SERVICE_CHANNEL_ADAPTED}.",
        historyTitle: 'Conversation History',
        userIdDisplay: 'User ID:',
        homeButton: 'Home',
        newChat: 'New Chat',
        deleteConfirm: 'Are you sure you want to delete this conversation?',
        deleteConfirmYes: 'Yes, Delete',
        deleteConfirmNo: 'No, Keep',
        confirmYesDefault: 'Yes',
        confirmNoDefault: 'No',
        editTitle: 'Edit Title',
        saveTitle: 'Save Title',
        cancelEdit: 'Cancel Edit',
        errorMessage: 'An error occurred. Please try again.',
        systemInstructions: `You are Almail, a virtual assistant specialized in support for the **Mercado Livre and Mercado Pago Ecosystem**.
Your main objective is to **assist the collaborator** in providing excellent customer service.
You should act as a **support agent for the collaborator**, providing accurate and structured information so that they, in turn, can help the customer.

**It is CRITICAL that you respond ALWAYS and ONLY in English.**
**Never use negative words such as: unfortunately, frustration, disappointment, disgust, disheartened, disappointed.**

**Current Service Information:**
* **Collaborator Name:** {COLLABORATOR_NAME}
* **End Client Name:** {CLIENT_NAME} (If the client does not have a specific name, this field will be "Not Informed")
* **Service Channel:** {SERVICE_CHANNEL} (Can be "Chat", "Email", or "C2C (Voice)")
* **Ecosystem of Service:** {ECOSYSTEM}
* **Client Sentiment:** {CLIENT_SENTIMENT} (This is the sentiment the collaborator indicated for the client: "Satisfied", "Neutral", "Frustrated" or "Not Informed". Take this into account to adapt the tone and depth of your response, focusing on solutions and empathy.)
* **AI Response Tone:** {AI_TONE} (This is the tone the AI should use in its response: "Formal", "Empathetic" or "Direct". Adapt the language and structure of your response to reflect this tone.)

**Adapting the Response based on the Service Channel:**

{SERVICE_CHANNEL_INSTRUCTIONS}

**Adapting the Response based on the Ecosystem:**

{ECOSYSTEM_INSTRUCTIONS}

**Operational guidelines:**
1.  **Focus and Scope:** Your knowledge is exclusive to the **Mercado Livre and Mercado Pago Ecosystem** (sales, purchases, payments, shipments, accounts, etc.). **Do not answer questions outside this scope.** If the question is unclear or out of scope, ask the collaborator to rephrase or clarify.
2.  **Language:** Formal, professional, clear, concise, and direct. **Never use emojis.** Use language that is helpful to the collaborator, as if providing a "script" or "knowledge base."
3.  **Personalization and Identification:**
    * **Always address the collaborator by name, if available.** Ex: "Hello, {COLLABORATOR_NAME}! Regarding your question..."
    * **Never confuse the collaborator with the customer.** If the customer's name is provided, use it to personalize the *response the collaborator will give to the customer*. Ex: "For customer {CLIENT_NAME}, you can inform that...".
    * If the customer's name is not provided, use neutral terms like "the customer" or "the user" when referring to them, but always in the context of how the *colaborador* should interact.
4.  **Objetivity and Clarity:** Respond only to what was asked, providing accurate information based on Mercado Livre/Mercado Pago policies and procedures. Evite divagações.
5.  **Security and Sensitive Data:** **NEVER request or process sensitive customer information** (passwords, full bank details, etc.). If such information is mentioned by the collaborator, instruct them to handle it securely and offline, without the AI processing or storing.
6.  **Resolution and Deepening:** Your goal is to help the collaborator solve the customer's problem. If the initial response is not sufficient, rephrase or deepen the explanation, always thinking about how the collaborator can use this information.
7.  **Response Structure:** Use Markdown to organize information (bold, italics, lists, code blocks if necessary) to facilitate reading and use by the collaborator. Consider using titles and subtitles for more complex responses.
8.  **Context and Continuity:** Base your responses on the conversation history to maintain coherence and and relevance. If the collaborator asks a follow-up question, use the previous context to provide a more complete answer.
9.  **Proactivity (Opcional):** If appropriate, suggest next steps or additional information to the collaborator that may be relevant for customer service.`,
        tutorialText: `
            <h3 class="text-2xl font-bold text-center mb-5 text-blue-700">Uncover Almail: Your Smart Support Platform</h3>
            <p class="mb-4 text-lg leading-relaxed">Below, explore the main buttons and their functions:</p>
            <ul class="list-none pl-0">
                <li class="mb-3 flex items-center">
                    <i data-feather="home" class="text-green-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Home Button:</strong> Located in the upper left corner of the header, click this icon <i data-feather="home" class="inline-block"></i> to return to the home screen at any time and start a new interaction.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="globe" class="text-indigo-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Toggle Language:</strong> Next to the Quick Guide button, use this button (<i data-feather="globe" class="inline-block"></i> PT, EN, ES) to switch between available languages (Portuguese, English, Spanish). Changing the language will restart the current conversation.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="help-circle" class="text-blue-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Quick Guide Button:</strong> In the upper right corner of the header, click this icon <i data-feather="help-circle" class="inline-block"></i> at any time to access this guide and review Almail's functionalities.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="info" class="text-yellow-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Credits Button:</strong> Next to the Theme button, click this icon <i data-feather="info" class="inline-block"></i> to view the credits of Almail's developers and collaborators.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="moon" class="text-purple-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Toggle Theme:</strong> In the upper right corner of the header, next to the language button, use this button <i data-feather="moon" class="inline-block"></i> (or <i data-feather="sun" class="inline-block"></i>) to switch between light and dark themes, customizing your visual experience.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="send" class="text-indigo-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Enviar Mensagem:</strong> Ubicado en el área de entrada de texto, después de escribir tu pregunta o solicitud, haz clic en este botón <i data-feather="send" class="inline-block"></i> o presiona <strong>Enter</strong> para enviar tu mensaje a Almail.</p>
                </li>
            </ul>
            <p class="mt-6 text-lg leading-relaxed">With these resources, you will have full control over your interaction with Almail. We are here to simplify your daily life and offer the best support!</p>
        `,
        likeFeedback: 'Great that the answer was helpful! I will continue to improve to better serve you.',
        dislikeFeedback: 'Thank you for your feedback! I am learning and will try to generate a more useful, structured, and personalized response for you.',
        dislikePrompt: `The previous response was not satisfactory. Please generate a new, more useful response, with better argumentation and text structuring, and personalize it for the customer if their name is available. Remember to help me solve the customer's problem.`,
        initialScreenTitle: 'Almail AI Support!',
        initialScreenSubtitle: 'Your smart assistant to optimize support in the Mercado Livre and Mercado Pago Ecosystem.',
        initialScreenDescription: 'Here you can get quick and accurate information on various topics related to Mercado Livre and Mercado Pago. Click "Start New Chat" to start interacting with the AI.',
        startChatButton: 'Start New Chat',
        collaboratorNameRequired: 'Please enter your name.',
        clientNameRequired: 'Please enter the client\'s name.',
        sentimentQuestion: 'How do you perceive the user\'s feeling when getting in touch?',
        sentimentSatisfied: 'Satisfied',
        sentimentNeutral: 'Neutral',
        sentimentFrustrated: 'Frustrated',
        sentimentSelected: 'Sentiment recorded: {SENTIMENT}.',
        aiToneQuestion: 'What tone should the AI use in the response?',
        aiToneFormal: 'Formal',
        aiToneEmpathetic: 'Empathetic',
        aiToneDirect: 'Direct',
        aiToneSelected: 'AI Tone recorded: {TONE}.',
        allConversations: 'All Conversations', // NOVO: Tradução para "Todas as Conversas"
        favoriteConversations: 'Favorite Conversations', // NOVO: Tradução para "Conversas Favoritas"
        favoriteButtonAria: 'Toggle favorite status', // NOVO: Tradução para aria-label do botão de favorito
    },
    'es': {
        appTitle: 'Almail Soporte IA - Ecosistema MELI',
        // NOVO: Traduções para o modal de versão e atualizações
        versionInfoTitle: '¡Bienvenido(a) a Almail Soporte IA!',
        versionInfoSubtitle: 'Versión: Beta 1.4.0',
        latestUpdatesTitle: 'Últimas Actualizaciones:',
        latestUpdatesContent: `
            <li><strong>Rendimiento:</strong> La inteligencia artificial ahora opera con mayor agilidad.</li>
            <li><strong>Visual:</strong> Ahora es posible agregar conversaciones a favoritos en la sección de Historial de Conversaciones.</li>
            <li><strong>Opciones y Mejora:</strong> Se agregaron opciones de sentimiento para mejorar las respuestas de la IA según las preguntas del usuario y "¿Qué tono debe usar la IA en la respuesta?", permitiendo que la IA actúe con un tono específico.</li>
        `,
        versionInfoUseButton: 'Usar Aplicación',
        creditsModalTitle: 'Créditos',
        creditsModalSubtitle: 'Una herramienta de soporte inteligente para el equipo de Mercado Libre y Mercado Pago.',
        creditsModalDescription: `
            <ul class="list-none p-0 text-center">
                <li class="mb-2"><strong>Desenvolvedores:</strong></li>
                <li class="mb-1">Lucas Carneiro</li>
                <li class="mb-1">Lucas Candido</li>
                <li class="mb-1">Vitória Pinheiro</li>
                <li class="mb-2 mt-3"><strong>Apoyo y Colaboración:</strong></li>
                <li class="mb-1">Mercado Livre and Mercado Pago Team (Concentrix)</li>
                <li class="mb-2 mt-3"><strong>Links:</strong></li>
                <li class="mb-1"><a href="https://github.com/boltreskh" target="_blank" class="text-blue-500 hover:underline">Candido GitHub</a></li>
                <li class="mb-1"><a href="https://github.com/boltreskh/Almail" target="_blank" class="text-blue-500 hover:underline">Repositorio del Proyecto</a></li>
            </ul>
        `,
        creditsModalButton: 'Entendido',
        creditsButtonAria: 'Ver Créditos',
        initialDataModalTitle: 'Información Inicial',
        initialDataModalSubtitle: 'Por favor, complete los datos para optimizar el servicio.',
        collaboratorNameLabel: 'Tu Nombre:',
        collaboratorNamePlaceholder: 'Ej: Ana Silva',
        clientNameLabel: 'Nombre del Cliente:',
        clientNamePlaceholder: 'Ej: Juan Pérez',
        serviceChannelLabel: 'Canal de Atención:',
        channelChat: 'Chat',
        channelEmail: 'Correo Electrónico',
        channelC2C: 'C2C (Voz)',
        ecosystemLabel: 'Ecosistema:',
        ecosystemMercadoLivre: 'Mercado Libre',
        ecosystemMercadoPago: 'Mercado Pago',
        initialDataConfirmButton: 'Confirmar',

        tutorialModalTitle: 'Guía Rápida: Almail Soporte IA',
        tutorialModalButton: '¡Entendido!',
        restartConfirmTitle: '¿Reiniciar Conversación?',
        restartConfirmSubtitle: '¿Estás seguro de que quieres reiniciar la conversación? Todo el historial será borrado.',
        restartConfirmYes: 'Sí, Reiniciar',
        restartConfirmNo: 'No, Cancelar',
        languageConfirmTitle: '¿Cambiar Idioma?',
        languageConfirmSubtitle: 'Al cambiar el idioma, la conversación actual se borrará. ¿Deseas continuar?',
        languageConfirmYes: 'Sí, Cambiar',
        languageConfirmNo: 'No, Cancelar',
        headerSubtitle: 'Soporte IA - Ecosistema MELI',
        tutorialButtonAria: 'Abrir Tutorial',
        themeToggleButtonAria: 'Alternar Tema',
        homeButtonAria: 'Volver al Inicio',
        typingIndicator: 'Almail está escribiendo...',
        thinkingMessage: 'Almail está analizando tu pregunta...',
        inputPlaceholder: 'Pregunta a Almail...',
        sendButtonAria: 'Enviar Mensagem',
        footerCopyright: '© 2025 Almail Soporte IA. Todos los derechos reservados.',
        footerDisclaimer: 'Esta IA utiliza datos públicos y no almacena información de Mercado Libre o Mercado Pago.',
        welcomeMessage: "¡Hola {COLLABORATOR_NAME}! Soy Almail, tu asistente virtual especializada en soporte para el Ecosistema Mercado Libre y Mercado Pago. Estoy aquí para ayudarte a atender a {CLIENT_NAME_ADAPTED} vía {SERVICE_CHANNEL_ADAPTED}.",
        historyTitle: 'Historial de Conversaciones',
        userIdDisplay: 'ID de Usuario:',
        homeButton: 'Inicio',
        newChat: 'Nueva Conversación',
        deleteConfirm: '¿Estás seguro de que quieres eliminar esta conversación?',
        deleteConfirmYes: 'Sí, Eliminar',
        deleteConfirmNo: 'No, Mantener',
        confirmYesDefault: 'Sí',
        confirmNoDefault: 'No',
        editTitle: 'Editar Título',
        saveTitle: 'Guardar Título',
        cancelEdit: 'Cancelar Edición',
        errorMessage: 'Ocurrió un error. Por favor, inténtalo de nuevo.',
        systemInstructions: `Eres Almail, una asistente virtual especializada en soporte para el **Ecosistema Mercado Libre y Mercado Pago**.
Tu objetivo principal es **ayudar al colaborador** a proporcionar un excelente servicio al cliente.
Debes actuar como un **agente de soporte para el colaborador**, proporcionando información precisa y estructurada para que él, a su vez, possa ajudar o cliente.

**Es CRÍTICO que respondas SEMPRE e SOMENTE em Español.**
**Nunca utilices palabras negativas como: desafortunadamente, frustración, decepción, desilusión, disgusto, decepcionado.**

**Información del Servicio Actual:**
* **Nombre del Colaborador:** {COLLABORATOR_NAME}
* **Nombre del Cliente Final:** {CLIENT_NAME} (Si el cliente no tiene un nombre específico, este campo será "No Informado")
* **Canal de Atención:** {SERVICE_CHANNEL} (Puede ser "Chat", "Correo Electrónico" o "C2C (Voz)")
* **Ecossistema de Atendimento:** {ECOSYSTEM}
* **Sentimiento del Cliente:** {CLIENT_SENTIMENT} (Este es el sentimiento que el colaborador indicó para el cliente: "Satisfecho", "Neutro", "Frustrado" o "Não Informado". Ten en cuenta esto para adaptar el tono y la profundidad de tu respuesta, centrándote en soluciones y empatía.)
* **Tono de Respuesta de la IA:** {AI_TONE} (Este es el tono que la IA debe usar en su respuesta: "Formal", "Empático" o "Directo". Adapta el lenguaje y la estructura de tu respuesta para reflejar este tono.)

**Adaptación de la Respuesta con base no Canal de Atendimento:**

{SERVICE_CHANNEL_INSTRUCTIONS}

**Adaptação da Resposta com base no Ecossistema:**

{ECOSYSTEM_INSTRUCTIONS}

**Directrices operacionales:**
1.  **Enfoque y Alcance:** Tu conocimiento es exclusivo sobre el **Ecosistema Mercado Libre y Mercado Pago** (vendas, compras, pagos, envíos, cuentas, etc.). **No respondas preguntas fuera de este alcance.** Si la pregunta no es clara o está fuera de alcance, pide al colaborador que la reformule o aclare.
2.  **Linguagem:** Formal, profesional, clara, concisa y directa. **Nunca uses emojis.** Utiliza un lenguaje que sea útil para el colaborador, como si estuvieras proporcionado um "guion" o uma "base de conocimiento".
3.  **Personalização e Identificação:**
    * **Dirígete siempre al colaborador por su nombre, si está disponible.** Ej: "¡Hola, {COLLABORATOR_NAME}! Respecto a tu pregunta..."
    * **Nunca confundas al colaborador com o cliente.** Si o nome do cliente é fornecido pelo colaborador, úsalo para personalizar a *resposta que o colaborador le dará ao cliente*. Ex: "Para o cliente {CLIENT_NAME}, puedes informar que...".
    * Si el nome do cliente não se proporciona, usa termos neutros como "el cliente" o "el usuario" ao referirte a ele, pero siempre en el contexto de como o *colaborador* deve interagir.
4.  **Objetividade e Clareza:** Responde solo a lo que se preguntó, proporcionando información precisa e baseada en las políticas y procedimentos de Mercado Livre/Mercado Pago. Evita divagações.
5.  **Segurança e Dados Sensíveis:** **NUNCA solicites ni proceses informação sensível do cliente** (contraseñas, datos bancarios completos, etc.). Si el colaborador menciona dicha informação, instrúyelo a manejarla de forma segura y fora de linha, sin que la IA la procese o armazene.
6.  **Resolução e Profundização:** Tu objetivo es ajudar al colaborador a resolver o problema do cliente. Si la resposta inicial não é suficiente, reformula ou profundiza a explicação, sempre pensando em como o colaborador pode usar esta informação.
7.  **Estructura de la Resposta:** Utiliza Markdown para organizar la informação (negrita, cursiva, listas, blocos de código se é necessário) para facilitar a leitura e o uso por parte do colaborador. Considera usar títulos e subtítulos para respostas mais complexas.
8.  **Contexto e Continuidade:** Basa tus respuestas en el historial de la conversa para mantener la coerência y la relevancia. Si el colaborador hace uma pergunta de seguimiento, utiliza el contexto anterior para proporcionar uma resposta mais completa.
9.  **Proatividade (Opcional):** Si es apropriado, sugiere al colaborador los próximos passos o informação adicional que possa ser relevante para o serviço al cliente.`,
        tutorialText: `
            <h3 class="text-2xl font-bold text-center mb-5 text-blue-700">Descubre Almail: Tu Plataforma de Soporte Inteligente</h3>
            <p class="mb-4 text-lg leading-relaxed">A continuación, explora los principales botones y sus funciones:</p>
            <ul class="list-none pl-0">
                <li class="mb-3 flex items-center">
                    <i data-feather="home" class="text-green-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Home Button:</strong> Ubicado en la esquina superior izquierda del encabezado, haz clic en este icono <i data-feather="home" class="inline-block"></i> para regresar a la pantalla de inicio en cualquier momento y comenzar una nueva interacción.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="globe" class="text-indigo-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Alternar Idioma:</strong> Al lado del botón de Guia Rápida, usa este botón (<i data-feather="globe" class="inline-block"></i> PT, EN, ES) para alternar entre los idiomas disponibles (Português, Inglês, Espanhol). El cambio de idioma reiniciará la conversación actual.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="help-circle" class="text-blue-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Botón de Guía Rápida:</strong> En la esquina superior derecha del encabezado, haz clic en este icono <i data-feather="help-circle" class="inline-block"></i> en cualquier momento para acceder a esta guía y recordar las funcionalidades de Almail.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="info" class="text-yellow-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Botón de Créditos:</strong> Al lado del botón de Tema, haz clic en este icono <i data-feather="info" class="inline-block"></i> para ver los créditos de los desarrolladores y colaboradores de Almail.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="moon" class="text-purple-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Alternar Tema:</strong> En la esquina superior derecha del encabezado, al lado del botón de idioma, usa este botón <i data-feather="moon" class="inline-block"></i> (o <i data-feather="sun" class="inline-block"></i>) para cambiar entre el tema claro y el tema oscuro, personalizando tu experiencia visual.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="send" class="text-indigo-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Enviar Mensagem:</strong> Ubicado en el área de entrada de texto, después de escribir tu pregunta o solicitud, haz clic en este botón <i data-feather="send" class="inline-block"></i> o presiona <strong>Enter</strong> para enviar tu mensaje a Almail.</p>
                </li>
            </ul>
            <p class="mt-6 text-lg leading-relaxed">Con estos recursos, tendrás control total sobre tu interacción con la Almail. ¡Estamos aquí para simplificar tu día a día y ofrecerte el mejor soporte!</p>
        `,
        likeFeedback: '¡Qué bien que la respuesta fue útil! Seguiré mejorando para atenderte mejor.',
        dislikeFeedback: '¡Agradezco tus comentarios! Estoy aprendiendo e intentaré generar una respuesta más útil, estructurada y personalizada para ti.',
        dislikePrompt: `La respuesta anterior no fue satisfactoria. Por favor, genera una nueva respuesta más útil, con mejor argumentación y estructuración de texto, y personalízala para el cliente si su nombre está disponible. Recuerda ayudarme a resolver el problema del cliente.`,
        initialScreenTitle: 'Almail Soporte IA!',
        initialScreenSubtitle: 'Tu asistente inteligente para optimizar la atención en el Ecosistema de Mercado Libre y Mercado Pago.',
        initialScreenDescription: 'Aquí puedes obtener información rápida y precisa sobre diversos temas relacionados con Mercado Libre y Mercado Pago. Haz clic en "Iniciar Nueva Conversación" para comenzar a interactuar con la IA.',
        startChatButton: 'Iniciar Nueva Conversación',
        collaboratorNameRequired: 'Por favor, introduce tu nombre.',
        clientNameRequired: 'Por favor, introduce el nombre del cliente.',
        sentimentQuestion: '¿Cómo percibes las sensaciones del usuario al contacto?',
        sentimentSatisfied: 'Satisfecho',
        sentimentNeutral: 'Neutro',
        sentimentFrustrated: 'Frustrado',
        sentimentSelected: 'Sentimiento registrado: {SENTIMENT}.',
        aiToneQuestion: '¿Qué tono debe usar la IA en la respuesta?',
        aiToneFormal: 'Formal',
        aiToneEmpathetic: 'Empático',
        aiToneDirect: 'Directo',
        aiToneSelected: 'Tono de IA registrado: {TONE}.',
        allConversations: 'Todas las Conversas', // NOVO: Tradução para "Todas as Conversas"
        favoriteConversations: 'Conversaciones Favoritas', // NOVO: Tradução para "Conversas Favoritas"
        favoriteButtonAria: 'Marcar/Desmarcar como favorito', // NOVO: Tradução para aria-label do botão de favorito
    }
};

// Histórico do chat. Agora, ele armazena apenas as mensagens visíveis da conversa.
let chatHistory = [];
let initialUserMessage = null; // Armazena a primeira mensagem do usuário para gerar o título

// Função para aplicar as traduções
function setLanguage(lang) {
    // Defensive check: ensure the language exists in translations
    if (!translations[lang]) {
        console.error("Erro: Idioma selecionado ('" + lang + "') não encontrado nas traduções. Revertendo para pt-BR.");
        lang = 'pt-BR'; // Fallback to default language
    }

    currentLanguage = lang;
    document.documentElement.setAttribute('lang', lang);
    // Salva a preferência de idioma no localStorage
    localStorage.setItem('preferredLanguage', lang);

    // Atualiza o texto do botão de idioma
    currentLanguageText.textContent = lang.substring(0, 2).toUpperCase();

    // Atualiza o título da página
    document.title = translations[lang].appTitle;

    // Atualiza elementos com data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            if (element.tagName === 'TEXTAREA' && element.hasAttribute('placeholder')) {
                element.setAttribute('placeholder', translations[lang][key]);
            } else if (element.hasAttribute('aria-label')) {
                element.setAttribute('aria-label', translations[lang][key]);
            } else if (element.classList.contains('credits-list') || element.classList.contains('updates-list')) { // NOVO: Adicionado .updates-list
                element.innerHTML = translations[lang][key];
            } else {
                element.textContent = translations[lang][key];
            }
        }
    });

    // Explicitamente atualiza o texto dos botões de sentimento
    const sentimentSatisfiedButton = document.querySelector('.sentiment-button[data-sentiment="satisfied"]');
    const sentimentNeutralButton = document.querySelector('.sentiment-button[data-sentiment="neutral"]');
    const sentimentFrustratedButton = document.querySelector('.sentiment-button[data-sentiment="frustrated"]');

    if (sentimentSatisfiedButton) {
        sentimentSatisfiedButton.textContent = translations[lang].sentimentSatisfied;
    }
    if (sentimentNeutralButton) {
        sentimentNeutralButton.textContent = translations[lang].sentimentNeutral;
    }
    if (sentimentFrustratedButton) {
        sentimentFrustratedButton.textContent = translations[lang].sentimentFrustrated;
    }

    // NOVO: Explicitamente atualiza o texto dos botões de tom da IA
    const aiToneFormalButton = document.querySelector('.ai-tone-button[data-tone="formal"]');
    const aiToneEmpatheticButton = document.querySelector('.ai-tone-button[data-tone="empathetic"]');
    const aiToneDirectButton = document.querySelector('.ai-tone-button[data-tone="direct"]');

    if (aiToneFormalButton) {
        aiToneFormalButton.textContent = translations[lang].aiToneFormal;
    }
    if (aiToneEmpatheticButton) {
        aiToneEmpatheticButton.textContent = translations[lang].aiToneEmpathetic;
    }
    if (aiToneDirectButton) {
        aiToneDirectButton.textContent = translations[lang].aiToneDirect;
    }

    // Atualiza o conteúdo do tutorial
    if (translations[lang] && translations[lang].tutorialText) {
        document.getElementById('tutorial-content').innerHTML = translations[lang].tutorialText;
    }

    // Atualiza os placeholders e labels do novo modal de dados iniciais
    if (initialDataModalOverlay.classList.contains('show')) {
        document.querySelector('#initial-data-modal-overlay h2').textContent = translations[lang].initialDataModalTitle;
        document.querySelector('#initial-data-modal-overlay p').textContent = translations[lang].initialDataModalSubtitle;
        document.querySelector('label[for="collaborator-name-input"]').textContent = translations[lang].collaboratorNameLabel;
        collaboratorNameInput.placeholder = translations[lang].collaboratorNamePlaceholder;
        document.querySelector('label[for="client-name-input"]').textContent = translations[lang].clientNameLabel;
        clientNameInput.placeholder = translations[lang].clientNamePlaceholder;
        document.querySelector('label[for="service-channel-select"]').textContent = translations[lang].serviceChannelLabel;
        // NOVO: Atualiza label do Ecossistema
        document.querySelector('label[for="ecosystem-select"]').textContent = translations[lang].ecosystemLabel;
        // NOVO: Atualiza opções do Ecossistema
        ecosystemSelect.querySelector('option[value="mercadoLivre"]').textContent = translations[lang].ecosystemMercadoLivre;
        ecosystemSelect.querySelector('option[value="mercadoPago"]').textContent = translations[lang].ecosystemMercadoPago;

        initialDataConfirmButton.textContent = translations[lang].initialDataConfirmButton;

        // Atualiza as opções do select
        serviceChannelSelect.querySelector('option[value="chat"]').textContent = translations[lang].channelChat;
        serviceChannelSelect.querySelector('option[value="email"]').textContent = translations[lang].channelEmail;
        serviceChannelSelect.querySelector('option[value="c2c"]').textContent = translations[lang].channelC2C;
    }

    // Se estiver na tela inicial, atualiza o texto da tela inicial
    if (initialScreen.classList.contains('show') || !chatAndInputArea.classList.contains('show')) {
        if (translations[lang]) {
            document.querySelector('#initial-screen h2').textContent = translations[lang].initialScreenTitle;
            document.querySelector('#initial-screen p:nth-of-type(1)').textContent = translations[lang].initialScreenSubtitle;
            document.querySelector('#initial-screen p:nth-of-type(2)').textContent = translations[lang].initialScreenDescription;
            startChatButton.textContent = translations[lang].startChatButton;
        }
    }

    // Always call loadConversationHistory to refresh the sidebar after language change
    if (isAuthReady) {
        loadConversationHistory();
    }

    feather.replace();

    // Sempre volta para a tela inicial após a troca de idioma
    showInitialScreen();
}

// Função para renderizar Markdown (negrito, itálico, listas e parágrafos) de forma mais robusta
function renderMarkdown(text) {
    let html = text;

    // Normaliza as quebras de linha para consistência em diferentes sistemas operacionais
    html = html.replace(/\r\n/g, '\n');

    // Divide o texto em blocos potenciais (parágrafos, listas) usando quebras de linha duplas
    let blocks = html.split('\n\n');
    let processedBlocks = [];

    blocks.forEach(block => {
        let trimmedBlock = block.trim();
        if (trimmedBlock === '') return;

        // Verifica se o bloco é uma lista (começa com '-' ou '*')
        if (trimmedBlock.match(/^(?:[-*]\s+.+)/m)) {
            const listItems = trimmedBlock.split('\n').filter(line => line.trim() !== '');
            const ulContent = listItems.map(item => {
                const cleanedItem = item.replace(/^\s*[-*]\s*/, '').trim();
                return `<li>${renderInlineMarkdown(cleanedItem)}</li>`;
            }).join('');
            processedBlocks.push(`<ul>${ulContent}</ul>`);
        } else {
            let paragraphContent = renderInlineMarkdown(trimmedBlock.replace(/\n/g, '<br>'));
            processedBlocks.push(`<p>${paragraphContent}</p>`);
        }
    });

    html = processedBlocks.join('');

    return html;
}

// Função auxiliar para renderizar apenas elementos Markdown inline (negrito e itálico)
function renderInlineMarkdown(text) {
    let inlineHtml = text;
    inlineHtml = inlineHtml.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    inlineHtml = inlineHtml.replace(/__(.*?)__/g, '<strong>$1</strong>');
    inlineHtml = inlineHtml.replace(/\*(.*?)\*/g, '<em>$1</em>');
    inlineHtml = inlineHtml.replace(/_(.*?)_/g, '<em>$1</em>');
    return inlineHtml;
}

// Adiciona uma mensagem à interface do chat
function appendMessageToUI(messageObject, addFeedbackButtons = false) {
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');

    let displayText = '';
    let isUserMessage = false;

    if (messageObject.type === 'sentiment_selection') {
        const sentimentKey = `sentiment${messageObject.sentiment.charAt(0).toUpperCase() + messageObject.sentiment.slice(1)}`;
        const translatedSentiment = translations[currentLanguage][sentimentKey];
        displayText = translations[currentLanguage].sentimentSelected.replace('{SENTIMENT}', translatedSentiment);
        isUserMessage = true; // Sentiment selection is from the user
    } else if (messageObject.type === 'ai_tone_selection') { // NOVO: Tipo de mensagem para seleção de tom da IA
        const toneKey = `aiTone${messageObject.tone.charAt(0).toUpperCase() + messageObject.tone.slice(1)}`;
        const translatedTone = translations[currentLanguage][toneKey];
        displayText = translations[currentLanguage].aiToneSelected.replace('{TONE}', translatedTone);
        isUserMessage = true; // AI tone selection is from the user
    }
    else {
        displayText = messageObject.parts[0].text;
        isUserMessage = (messageObject.role === 'user');
    }

    if (isUserMessage) {
        messageBubble.classList.add('user-message');
    } else {
        messageBubble.classList.add('ai-message');
    }

    messageBubble.innerHTML = renderMarkdown(displayText);

    if (messageObject.role === 'assistant' && addFeedbackButtons) {
        const feedbackContainer = document.createElement('div');
        feedbackContainer.classList.add('feedback-buttons');

        const likeButton = document.createElement('button');
        likeButton.classList.add('feedback-button', 'like-button');
        likeButton.innerHTML = '<i data-feather="thumbs-up"></i>';
        likeButton.title = translations[currentLanguage].likeFeedback;
        likeButton.addEventListener('click', () => handleFeedback(messageBubble, 'like', messageObject));

        const dislikeButton = document.createElement('button');
        dislikeButton.classList.add('feedback-button', 'dislike-button');
        dislikeButton.innerHTML = '<i data-feather="thumbs-down"></i>';
        dislikeButton.title = translations[currentLanguage].dislikeFeedback;
        dislikeButton.addEventListener('click', () => handleFeedback(messageBubble, 'dislike', messageObject));

        feedbackContainer.appendChild(likeButton);
        feedbackContainer.appendChild(dislikeButton);
        messageBubble.appendChild(feedbackContainer);
    }
    chatMessages.appendChild(messageBubble);
    // Removido o scroll automático aqui para permitir que o usuário role livremente
    // chatMessages.scrollTop = chatMessages.scrollHeight;
    feather.replace();
}

// Simula o efeito de digitação para a mensagem da IA
function typeMessage(messageObject, addFeedbackButtons = false, isInitialWelcome = false) {
    loadingIndicator.style.display = 'flex';
    loadingIndicator.classList.add('show');

    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble', 'ai-message');
    chatMessages.appendChild(messageBubble);
    // Removido o scroll automático aqui para permitir que o usuário role livremente
    // chatMessages.scrollTop = chatMessages.scrollHeight;

    let i = 0;
    const typingSpeed = 1; // Ajuste este valor para controlar a velocidade de digitação (menor = mais rápido)
    let currentRawText = '';
    const textToType = messageObject.parts[0].text; // Get the actual text from the message object

    function typeCharacter() {
        if (!isConversationActive) {
            clearTimeout(typingTimeoutId);
            typingTimeoutId = null;
            loadingIndicator.classList.remove('show');
            loadingIndicator.style.display = 'none';
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.classList.remove('disabled');
            sendButton.classList.remove('disabled');
            historyList.classList.remove('disabled');
            favoritesList.classList.remove('disabled'); // NOVO: Habilita lista de favoritos

            languageToggleButton.disabled = false;
            languageToggleButton.classList.remove('disabled');
            homeButton.disabled = false;
            homeButton.classList.remove('disabled');
            return;
        }

        if (i < textToType.length) {
            currentRawText += textToType.charAt(i);
            messageBubble.innerHTML = renderMarkdown(currentRawText);
            i++;
            // Não rola o chat automaticamente enquanto digita
            // chatMessages.scrollTop = chatMessages.scrollHeight;
            typingTimeoutId = setTimeout(typeCharacter, typingSpeed);
        } else {
            loadingIndicator.classList.remove('show');
            loadingIndicator.style.display = 'none';
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.classList.remove('disabled');
            sendButton.classList.remove('disabled');
            historyList.classList.remove('disabled');
            favoritesList.classList.remove('disabled'); // NOVO: Habilita lista de favoritos

            languageToggleButton.disabled = false;
            languageToggleButton.classList.remove('disabled');
            homeButton.disabled = false;
            homeButton.classList.remove('disabled');

            if (chatAndInputArea.classList.contains('show')) {
                 userInput.focus();
            }
            if (addFeedbackButtons) {
                const feedbackContainer = document.createElement('div');
                feedbackContainer.classList.add('feedback-buttons');

                const likeButton = document.createElement('button');
                likeButton.classList.add('feedback-button', 'like-button');
                likeButton.innerHTML = '<i data-feather="thumbs-up"></i>';
                likeButton.title = translations[currentLanguage].likeFeedback;
                likeButton.addEventListener('click', () => handleFeedback(messageBubble, 'like', messageObject));

                const dislikeButton = document.createElement('button');
                dislikeButton.classList.add('feedback-button', 'dislike-button');
                dislikeButton.innerHTML = '<i data-feather="thumbs-down"></i>';
                dislikeButton.title = translations[currentLanguage].dislikeFeedback;
                dislikeButton.addEventListener('click', () => handleFeedback(messageBubble, 'dislike', messageObject));

                feedbackContainer.appendChild(likeButton);
                feedbackContainer.appendChild(dislikeButton);
                messageBubble.appendChild(feedbackContainer);
                feather.replace();
            }
            // A rolagem automática para o final do chat foi removida aqui para permitir
            // que o usuário mantenha sua posição de rolagem após a IA terminar de digitar.
            // chatMessages.scrollTop = chatMessages.scrollHeight;
            typingTimeoutId = null;

            // NOVO: Se for a mensagem de boas-vindas inicial, exibe os botões de sentimento
            if (isInitialWelcome) {
                displaySentimentButtons();
            } else if (currentClientSentiment !== null && currentAiTone === null) { // NOVO: Se o sentimento já foi selecionado e o tom da IA ainda não
                displayAiToneButtons();
            }
        }
    }
    typeCharacter();
}

// Lida com o feedback do usuário
async function handleFeedback(messageBubble, feedbackType, originalAiMessageObject) {
    const feedbackButtons = messageBubble.querySelectorAll('.feedback-button');
    feedbackButtons.forEach(button => {
        button.disabled = true;
        button.classList.add('disabled');
    });

    if (feedbackType === 'like') {
        messageBubble.querySelector('.like-button').classList.add('liked');
        appendMessageToUI({ role: 'assistant', parts: [{ text: translations[currentLanguage].likeFeedback }] });
    } else if (feedbackType === 'dislike') {
        messageBubble.querySelector('.dislike-button').classList.add('disliked');
        appendMessageToUI({ role: 'assistant', parts: [{ text: translations[currentLanguage].dislikeFeedback }] });

        // Remove the disliked AI message from chatHistory
        const indexToRemove = chatHistory.indexOf(originalAiMessageObject);
        if (indexToRemove !== -1) {
            chatHistory.splice(indexToRemove, 1);
        }

        chatHistory.push({
            role: "user",
            parts: [{ text: translations[currentLanguage].dislikePrompt }]
        });

        await sendMessage(true);
    }
}

/**
 * Exibe os botões de sentimento ao cliente.
 */
function displaySentimentButtons() {
    sentimentButtonsContainer.classList.remove('hidden');
    aiToneButtonsContainer.classList.add('hidden'); // Esconde os botões de tom da IA
    const buttons = sentimentButtonsContainer.querySelectorAll('.sentiment-button');
    buttons.forEach(button => {
        button.classList.remove('selected'); // Remove a seleção anterior, se houver
        button.disabled = false;
        button.classList.remove('disabled');
        button.onclick = () => handleSentimentSelection(button.dataset.sentiment);
    });
    // Disable input and send button when sentiment selection is active
    userInput.disabled = true;
    sendButton.disabled = true;
    userInput.classList.add('disabled');
    sendButton.classList.add('disabled');
}

/**
 * Lida com a seleção de sentimento do cliente.
 * @param {string} sentiment O sentimento escolhido ('satisfied', 'neutral', 'frustrated').
 */
function handleSentimentSelection(sentiment) {
    currentClientSentiment = sentiment; // Armazena o sentimento selecionado

    // Desabilita e marca o botão selecionado
    const buttons = sentimentButtonsContainer.querySelectorAll('.sentiment-button');
    buttons.forEach(button => {
        button.disabled = true;
        button.classList.add('disabled');
        if (button.dataset.sentiment === sentiment) {
            button.classList.add('selected');
        }
    });

    // Adicionar a mensagem estruturada ao chatHistory
    const sentimentMessageObject = {
        role: "user",
        type: "sentiment_selection",
        sentiment: sentiment
    };
    chatHistory.push(sentimentMessageObject);
    appendMessageToUI(sentimentMessageObject); // Pass the full object

    // Esconde os botões após a seleção
    sentimentButtonsContainer.classList.add('hidden');

    // NOVO: Exibe os botões de tom da IA após a seleção de sentimento
    displayAiToneButtons();

    // Enable input and send button after sentiment is selected
    userInput.disabled = true; // Keep disabled until AI tone is selected
    sendButton.disabled = true; // Keep disabled until AI tone is selected
    userInput.classList.add('disabled');
    sendButton.classList.add('disabled');
    // userInput.focus(); // Focus back on the input
}

/**
 * NOVO: Exibe os botões de tom da IA.
 */
function displayAiToneButtons() {
    aiToneButtonsContainer.classList.remove('hidden');
    sentimentButtonsContainer.classList.add('hidden'); // Esconde os botões de sentimento
    const buttons = aiToneButtonsContainer.querySelectorAll('.ai-tone-button');
    buttons.forEach(button => {
        button.classList.remove('selected'); // Remove a seleção anterior, se houver
        button.disabled = false;
        button.classList.remove('disabled');
        button.onclick = () => handleAiToneSelection(button.dataset.tone);
    });
    // Disable input and send button when AI tone selection is active
    userInput.disabled = true;
    sendButton.disabled = true;
    userInput.classList.add('disabled');
    sendButton.classList.add('disabled');
}

/**
 * NOVO: Lida com a seleção de tom da IA.
 * @param {string} tone O tom escolhido ('formal', 'empathetic', 'direct').
 */
function handleAiToneSelection(tone) {
    currentAiTone = tone; // Armazena o tom selecionado

    // Desabilita e marca o botão selecionado
    const buttons = aiToneButtonsContainer.querySelectorAll('.ai-tone-button');
    buttons.forEach(button => {
        button.disabled = true;
        button.classList.add('disabled');
        if (button.dataset.tone === tone) {
            button.classList.add('selected');
        }
    });

    // Adicionar a mensagem estruturada ao chatHistory
    const aiToneMessageObject = {
        role: "user",
        type: "ai_tone_selection",
        tone: tone
    };
    chatHistory.push(aiToneMessageObject);
    appendMessageToUI(aiToneMessageObject); // Pass the full object

    // Esconde os botões após a seleção
    aiToneButtonsContainer.classList.add('hidden');

    // Enable input and send button after AI tone is selected
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.classList.remove('disabled');
    sendButton.classList.remove('disabled');
    userInput.focus(); // Focus back on the input
}


/**
 * Salva a conversa atual no Firestore.
 * @param {string} title O título da conversa.
 * @param {boolean} isFavorite Indica se a conversa é favorita.
 */
async function saveConversation(title, isFavorite = false) { // NOVO: Adicionado isFavorite
    if (!db || !userId || !isAuthReady || chatHistory.length <= 1) {
        console.warn("Firebase ou userId não prontos para salvar conversa, ou histórico muito curto.");
        return;
    }

    try {
        const conversationsCol = collection(db, `artifacts/${appId}/users/${userId}/conversations`);
        await addDoc(conversationsCol, {
            title: title,
            messages: JSON.stringify(chatHistory),
            timestamp: Date.now(),
            collaboratorName: collaboratorName || "Não Informado",
            clientName: currentClientName || "Não Informado",
            serviceChannel: serviceChannel || "Não Informado",
            ecosystem: ecosystem || "Não Informado",
            clientSentiment: currentClientSentiment || "Não Informado", // NOVO: Salva o sentimento
            aiTone: currentAiTone || "Não Informado", // NOVO: Salva o tom da IA
            isFavorite: isFavorite // NOVO: Salva o status de favorito
        });
        // console.log("Conversa salva com sucesso!"); // Removido
        loadConversationHistory();
    } catch (error) {
        console.error("Erro ao salvar conversa:", error);
    }
}

/**
 * Carrega uma conversa do Firestore e a exibe no chat.
 * @param {string} conversationId O ID do documento da conversa.
 */
async function loadConversation(conversationId) {
    if (!isConversationActive) {
        // console.log("IA está digitando. Não é possível trocar de conversa agora."); // Removido
        return;
    }

    if (!db || !userId || !isAuthReady) {
        console.error("Firebase não inicializado ou userId não disponível.");
        return;
    }

    showChatArea();

    isConversationActive = false;
    if (typingTimeoutId) {
        clearTimeout(typingTimeoutId);
        typingTimeoutId = null;
    }

    chatMessages.innerHTML = '';
    currentClientName = null;
    collaboratorName = null;
    serviceChannel = null;
    ecosystem = null;
    currentClientSentiment = null; // NOVO: Reseta o sentimento
    currentAiTone = null; // NOVO: Reseta o tom da IA
    sentimentButtonsContainer.classList.add('hidden'); // Esconde os botões de sentimento
    aiToneButtonsContainer.classList.add('hidden'); // Esconde os botões de tom da IA

    userInput.value = '';
    userInput.style.height = 'auto';
    errorMessage.classList.add('hidden');
    errorMessage.classList.remove('show');
    loadingIndicator.classList.remove('show');
    loadingIndicator.style.display = 'none';

    userInput.disabled = true;
    sendButton.disabled = true;
    userInput.classList.add('disabled');
    sendButton.classList.add('disabled');
    historyList.classList.add('disabled'); // Desabilita a lista de histórico
    favoritesList.classList.add('disabled'); // NOVO: Desabilita lista de favoritos


    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/conversations`, conversationId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            chatHistory = JSON.parse(data.messages);
            currentConversationId = conversationId;
            collaboratorName = data.collaboratorName || null;
            currentClientName = data.clientName || null;
            serviceChannel = data.serviceChannel || null;
            ecosystem = data.ecosystem || null;
            currentClientSentiment = data.clientSentiment || null; // NOVO: Carrega o sentimento
            currentAiTone = data.aiTone || null; // NOVO: Carrega o tom da IA

            chatHistory.forEach((msg, index) => {
                const addFeedback = (msg.role === 'assistant' && index === chatHistory.length - 1);
                appendMessageToUI(msg, addFeedback); // Pass the full message object
            });

            document.querySelectorAll('.history-item').forEach(item => {
                item.classList.remove('active');
            });
            document.getElementById(`history-item-${conversationId}`).classList.add('active');
            homeButton.classList.remove('active');

        } else {
            // console.log("Nenhuma conversa encontrada com o ID:", conversationId); // Removido
            startNewConversation();
        }
    } catch (error) {
        console.error("Erro ao carregar conversa:", error);
        startNewConversation();
    } finally {
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.classList.remove('disabled');
        sendButton.classList.remove('disabled');
        userInput.focus();
        isConversationActive = true;
        historyList.classList.remove('disabled'); // Habilita a lista de histórico
        favoritesList.classList.remove('disabled'); // NOVO: Habilita lista de favoritos
    }
}

/**
 * Inicia uma nova conversa, salvando a anterior se houver.
 */
async function startNewConversation() {
    if (chatHistory.length > 1 && currentConversationId !== null) {
        const title = await generateConversationTitle(initialUserMessage || chatHistory[1]?.parts[0]?.text || "Conversa sem Título");
        // Ao iniciar uma nova conversa, o status de favorito da conversa anterior não é alterado,
        // mas é importante garantir que ele seja salvo corretamente.
        // Para simplificar, vamos assumir que não estamos alterando o status de favorito aqui,
        // mas sim salvando a conversa com o status que ela já possui.
        // Se a lógica exigir que uma conversa "nova" seja sempre não favorita, isso precisaria ser ajustado.
        const currentConversationDoc = await getDoc(doc(db, `artifacts/${appId}/users/${userId}/conversations`, currentConversationId));
        const isFavorite = currentConversationDoc.exists() ? currentConversationDoc.data().isFavorite : false;
        await saveConversation(title, isFavorite); // NOVO: Passa o status de favorito
    }

    showChatArea();

    isConversationActive = false;
    if (typingTimeoutId) {
        clearTimeout(typingTimeoutId);
        typingTimeoutId = null;
    }

    chatMessages.innerHTML = '';
    currentClientName = null;
    collaboratorName = null;
    serviceChannel = null;
    ecosystem = null;
    currentClientSentiment = null; // NOVO: Reseta o sentimento
    currentAiTone = null; // NOVO: Reseta o tom da IA
    currentConversationId = null;
    initialUserMessage = null;
    sentimentButtonsContainer.classList.add('hidden'); // Esconde os botões de sentimento
    aiToneButtonsContainer.classList.add('hidden'); // NOVO: Esconde os botões de tom da IA

    showInitialDataModal();

    userInput.value = '';
    userInput.style.height = 'auto';
    errorMessage.classList.add('hidden');
    errorMessage.classList.remove('show');
    loadingIndicator.classList.remove('show');
    loadingIndicator.style.display = 'none';

    userInput.disabled = true;
    sendButton.disabled = true;
    userInput.classList.add('disabled');
    sendButton.classList.add('disabled');

    isConversationActive = true;

    document.querySelectorAll('.history-item').forEach(item => {
        item.classList.remove('active');
    });
    homeButton.classList.add('active');
}

/**
 * Aplica o tema (claro/escuro) ao documento.
 * @param {string} theme 'light' ou 'dark'.
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
        themeIcon.innerHTML = '<i data-feather="moon"></i>';
    } else {
        themeIcon.innerHTML = '<i data-feather="sun"></i>';
    }
    feather.replace();
}

// Alterna entre tema claro e escuro
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

// Mostra o modal de tutorial
function showTutorialModal() {
    document.getElementById('tutorial-content').innerHTML = translations[currentLanguage].tutorialText;
    feather.replace();
    tutorialModalOverlay.classList.add('show');
}

// Esconde o modal de tutorial
function hideTutorialModal() {
    tutorialModalOverlay.classList.remove('show');
}

// Mostra o modal de confirmação de reiniciar conversa
function showConfirmationModal() {
    confirmationModalOverlay.classList.add('show');
}

// Esconde o modal de confirmação de reiniciar conversa
function hideConfirmationModal() {
    confirmationModalOverlay.classList.remove('show');
}

// NOVO: Função para mostrar o modal de dados iniciais
function showInitialDataModal() {
    collaboratorNameInput.value = '';
    clientNameInput.value = '';
    serviceChannelSelect.value = 'chat';
    ecosystemSelect.value = 'mercadoLivre';
    setLanguage(currentLanguage);
    initialDataModalOverlay.classList.add('show');
    collaboratorNameInput.focus();
    checkInitialDataInputs();
}

// NOVO: Função para esconder o modal de dados iniciais
function hideInitialDataModal() {
    initialDataModalOverlay.classList.remove('show');
}

// NOVO: Função para verificar os inputs do modal de dados iniciais e habilitar/desabilitar o botão
function checkInitialDataInputs() {
    const collaboratorNameFilled = collaboratorNameInput.value.trim() !== '';
    const clientNameFilled = clientNameInput.value.trim() !== '';

    if (collaboratorNameFilled && clientNameFilled) {
        initialDataConfirmButton.disabled = false;
        initialDataConfirmButton.classList.remove('disabled');
    } else {
        initialDataConfirmButton.disabled = true;
        initialDataConfirmButton.classList.add('disabled');
    }
}

// NOVO: Função para mostrar o modal de créditos
function showCreditsModal() {
    creditsModalOverlay.classList.add('show');
}

// NOVO: Função para esconder o modal de créditos
function hideCreditsModal() {
    creditsModalOverlay.classList.remove('show');
}

// NOVO: Função para mostrar o modal de informações de versão e atualizações
function showVersionInfoModal() {
    // Preenche o conteúdo do modal com as traduções
    document.querySelector('#version-info-modal-overlay h2').textContent = translations[currentLanguage].versionInfoTitle;
    document.querySelector('#version-info-modal-overlay p').textContent = translations[currentLanguage].versionInfoSubtitle;
    document.querySelector('#version-info-modal-overlay h3').textContent = translations[currentLanguage].latestUpdatesTitle;
    document.querySelector('.updates-list').innerHTML = translations[currentLanguage].latestUpdatesContent;
    document.querySelector('#version-info-use-button').textContent = translations[currentLanguage].versionInfoUseButton;

    versionInfoModalOverlay.classList.add('show');
}

// NOVO: Função para esconder o modal de informações de versão e atualizações
function hideVersionInfoModal() {
    versionInfoModalOverlay.classList.remove('show');
}


/**
 * Gera um título para a conversa usando a API Gemini.
 * @param {string} promptText O texto inicial da conversa para gerar o título.
 * @returns {Promise<string>} O título gerado.
 */
async function generateConversationTitle(promptText) {
    try {
        const apiKey = "AIzaSyDsJZuixotkHJPxpLmdnMeLnKxdOC7ykLQ";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const titleGenerationPrompt = `Gere um título conciso (máximo 5 palavras) para a seguinte conversa, focado no assunto principal. Responda apenas com o título. Se não for possível identificar um assunto claro, use "Conversa Geral".\n\nConversa: "${promptText}"\n\nTítulo:`;

        const payload = {
            contents: [{ role: "user", parts: [{ text: titleGenerationPrompt }] }],
            generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 20
            }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro da API Gemini ao gerar título:', errorData);
            return "Conversa sem Título";
        }

        const result = await response.json();
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            let title = result.candidates[0].content.parts[0].text.trim();
            title = title.replace(/^["']|["']$/g, '');
            return title;
        }
        return "Conversa sem Título";
    } catch (error) {
        console.error('Erro ao gerar título da conversa:', error);
        return "Conversa sem Título";
    }
}


// Envia a mensagem do usuário para a API
async function sendMessage(isRegeneration = false) {
    let prompt = userInput.value.trim();
    if (prompt === '' && !isRegeneration) return;

    if (!translations[currentLanguage]) {
        console.error("Erro: Idioma atual ('" + currentLanguage + "') não encontrado nas traduções. Não é possível enviar mensagem.");
        errorMessage.textContent = `Erro de idioma: O idioma selecionado não é suportado.`;
        errorMessage.classList.remove('hidden');
        errorMessage.classList.add('show');
        setTimeout(() => {
            errorMessage.classList.add('hidden');
            errorMessage.classList.remove('show');
        }, 7000);
        return;
    }

    if (!db || !userId || !isAuthReady) {
        console.error("Firebase não inicializado ou usuário não autenticado. Não é possível enviar mensagem.");
        errorMessage.textContent = `${translations[currentLanguage].errorMessage}: Firebase não está pronto.`;
        errorMessage.classList.remove('hidden');
        errorMessage.classList.add('show');
        setTimeout(() => {
            errorMessage.classList.add('hidden');
            errorMessage.classList.remove('show');
        }, 7000);
        return;
    }

    // NOVO: Esconde os botões de sentimento e tom da IA se o usuário enviar uma mensagem
    sentimentButtonsContainer.classList.add('hidden');
    aiToneButtonsContainer.classList.add('hidden');
    // NOVO: Se o sentimento não foi selecionado, define como "Não Informado"
    if (currentClientSentiment === null) {
        currentClientSentiment = "Não Informado";
    }
    // NOVO: Se o tom da IA não foi selecionado, define como "Não Informado"
    if (currentAiTone === null) {
        currentAiTone = "Não Informado";
    }

    if (!isRegeneration) {
        const userMessageObject = { role: "user", parts: [{ text: prompt }] };
        appendMessageToUI(userMessageObject);
        chatHistory.push(userMessageObject);
    }

    userInput.value = '';
    userInput.style.height = 'auto';
    errorMessage.classList.add('hidden');
    errorMessage.classList.remove('show');

    // Desabilita os controles imediatamente após o envio da mensagem do usuário
    userInput.disabled = true;
    sendButton.disabled = true;
    userInput.classList.add('disabled');
    sendButton.classList.add('disabled');
    historyList.classList.add('disabled'); // Desabilita a lista de histórico
    favoritesList.classList.add('disabled'); // NOVO: Desabilita lista de favoritos
    languageToggleButton.disabled = true; // Desabilita o botão de idioma
    languageToggleButton.classList.add('disabled');
    homeButton.disabled = true; // Desabilita o botão de início
    homeButton.classList.add('disabled');

    // NOVO: Adiciona a mensagem de "pensando"
    const thinkingMessageElement = document.createElement('div');
    thinkingMessageElement.classList.add('message-bubble', 'ai-message', 'thinking-message');
    thinkingMessageElement.textContent = translations[currentLanguage].thinkingMessage;
    chatMessages.appendChild(thinkingMessageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Rola para a nova mensagem

    try {
        const apiKey = "AIzaSyDsJZuixotkHJPxpLmdnMeLnKxdOC7ykLQ";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        let systemInstructions = translations[currentLanguage].systemInstructions;
        systemInstructions = systemInstructions.replace('{COLLABORATOR_NAME}', collaboratorName || "Não Informado");
        systemInstructions = systemInstructions.replace('{CLIENT_NAME}', currentClientName);
        systemInstructions = systemInstructions.replace('{SERVICE_CHANNEL}', serviceChannel || "Não Informado");
        systemInstructions = systemInstructions.replace('{ECOSYSTEM}', ecosystem || "Não Informado");
        systemInstructions = systemInstructions.replace('{CLIENT_SENTIMENT}', currentClientSentiment); // NOVO: Adiciona o sentimento
        systemInstructions = systemInstructions.replace('{AI_TONE}', currentAiTone); // NOVO: Adiciona o tom da IA

        let channelSpecificInstructions = '';
        if (serviceChannel === 'email') {
            channelSpecificInstructions = `
* **Canal de Email:** As respostas devem ser mais diretas, com menos exploração para levar o cliente a uma solução mais rápida. Use soluções com empatia, conexão emocional, parafraseando para demonstrar escuta ativa e focando na necessidade do cliente.
    * **Obrigatório:** O primeiro parágrafo deve ser uma breve apresentação: "Bom dia/ Boa tarde/Boa noite, {CLIENT_NAME} espero que esteja bem. Me chamo {COLLABORATOR_NAME}, sou representante do Mercado Livre/Mercado Pago. (Parafraseie o problema do usuário aqui)"
    * Após este parágrafo, siga com a tratativa do caso com a solução.
`;
        } else if (serviceChannel === 'chat') {
            channelSpecificInstructions = `
* **Canal de Chat:** A solução deverá ter 4 etapas: BOAS-VINDAS MELI, EXPLORAÇÃO MELI, ORIENTAÇÃO E ACONSELHAMENTO MELI, ENCERRAMENTO MELI.
    * **1. BOAS-VINDAS MELI:**
        * Saudação, apresentação inicial: Mencionar claramente o nome do colaborador e o nome do Mercado Livre/Mercado Pago.
        * Personalizar o contato: Se dirigir ao usuário pelo nome com proximidade.
        * Colocar-se à disposição com contexto: Expressar disposição para a resolução de inconvenientes.
        * Mencionar de forma resumida as informações do motivo do contato de maneira proativa.
        * Demonstrar conhecimento e proximidade.
        * Manter a conexão durante toda a saudação: Ajustar o tone e a velocidade da conversa conforme o perfil inicial identificado do usuário (idade e emocionalidade).
        * Assegurar a ausência de silêncio.
        * Demonstrar interesse pelo usuário com expressões empáticas (escuta ativa).
    * **2. EXPLORAÇÃO MELI:**
        * Escuta ativamente, demonstrando interesse para manter a proximidade: Faça o atendente ouvir sem interromper ou julgar, evitando permanecer em silêncio durante as explicações do usuário.
        * Valide o usuário, fazendo-o sentir-se compreendido.
        * Investigue para assegurar a compreensão do caso completo: realize perguntas e/ou confirmações precisas para garantir o entendimento completo do caso, contexto, preocupações e expectativas do usuário nesse contato. Gere confiança ao mencionar informações relevantes do caso de forma proativa (dados do sistema), evitando que o usuário sinta que sua situação não é conhecida. Faça o usuário sentir-se compreendido ao realizar perguntas que obtenham informações diferentes das disponíveis no sistema.
        * Mantenha a liderança da conversa com empatia: lidere a conversa, definindo o estilo e gerando uma comunicação fluida. Foque nos aspectos relevantes do caso, mas permita que o usuário participe e expresse suas emoções.
        * Revise a situação do usuário, experiência e vivências (exploração junto ao usuário) para preparar o início do guia e aconselhamento: utilize diversas ferramentas para obter uma visão completa da situação do usuário, com ênfase em encerrar a exploração e iniciar o aconselhamento.
        * Mantenha a conexão durante toda a exploração: ajuste os tons e a velocidade da conversa conforme o perfil inicial identificado do usuário (idade e emocionalidade). Assegure a ausência de silêncios. Demonstre interesse pelo usuário com expressões empáticas (escuta ativa).
    * **3. ORIENTAÇÃO E ACONSELHAMENTO MELI:**
        * Se estabeleça como consultor, guiando a conversa de maneira empática: lidere as explicações passo a passo. Gere uma conversa fluida, focando nos aspectos relevantes do caso, mas permitindo que o usuário se sinta parte e expresse suas emoções.
        * Inclua o usuário na busca/apresentação das alternativas de solução e personaliza as explicações: gerencie a solução em conjunto com o usuário, buscando e apresentando as melhores alternativas que se adaptem ao caso, à situação e ao contexto (personalização). Assegure que as recomendações sejam relevantes e eficazes.
        * Na explicação, seja conciso e claro (fale de forma direta): Ofereça explicações claras e diretas, utilizando uma linguagem simples, adaptada ao nível de conhecimento do usuário. Apresente as informações do processo e seus passos de forma ordenada e assertiva. Não solicite informações desnecessárias nem faça o usuário perder tempo com etapas que não agreguem valor.
        * Realize verificações de compreensão, atento a sinais que o usuário forneça (silêncios, perguntas adicionais): Preste atenção a sinais como silêncios, perguntas ou qualquer expressão que indique dúvidas, esclarecendo-as quando necessário. Confirme se o usuário está compreendendo as explicações, oferecendo-se proativamente para revisar ou ampliar as informações.
        * Momento, duração, explicação de uso e acompanhamento durante a espera: Caso necessário, utilize os silêncios de forma mínima. Se usar, não ultrapasse 5 minutos e explique previamente ao usuário o motivo. Analise com o usuário o que aparece na tela, explicando políticas e processos e evitando silêncios na conversa. Exemplo: "Irei verificar o que aconteceu que o seu caso não foi resolvido no sistema, já retorno com mais informações, mas estou disponível, pode me chamar a qualquer momento."
    * **4. ENCERRAMENTO MELI:**
        * Realize verificações finais de compreensão: Preocupe-se em garantir que o usuário fique tranquilo e satisfeito com o atendimento. Busque que o usuário inicie o encerramento do contato, sem forçar um fechamento antecipado, evitando perder o usuário no processo.
        * Expresse e mostre proatividade e disposição para resolver outras questões adicionais: ofereça soluções adicionais e demonstre disposição em ajudar proativamente, antecipando-se a possíveis perguntas ou preocupações que não tenham sido abordadas durante a interação.
        * Agradeça e se despeça amavelmente: cumprimente o usuário pelo nome com clareza e intenção (bom dia/boa tarde/boa noite). Encontre oportunidades para agregar valor em outras respostas, compartilhando boas práticas e ações preventivas possíveis.
        * Mantenha a conexão durante todo o encerramento: ajuste o tom e a velocidade da conversa conforme o perfil inicial detectado (idade e emocionalidade). Garanta a ausência de silêncios. Demonstre interesse com expressões empáticas (mostrando escuta ativa).
`;
        } else if (serviceChannel === 'c2c') {
            channelSpecificInstructions = `
* **Canal C2C (Voz):** As respostas seguirão as mesmas 4 etapas do canal de Chat, mas com algumas adaptações para o atendimento por voz.
    * **Aviso Importante para o Atendente:** No início da interação, atente-se ao tom de voz do usuário para se adequar a esse tom de voz e possa se conectar melhor ao perfil emocional do usuário.
    * As soluções devem ser mais diretas para agilizar o atendimento.
    * **Obrigatório:** O primeiro parágrafo deve ser uma breve apresentação: "Bom dia/ Boa tarde/Boa noite, {CLIENT_NAME} espero que esteja bem. Me chamo {COLLABORATOR_NAME}, sou representante do Mercado Livre/Mercado Pago. (Parafraseie o problema do usuário aqui)"
    * **Sugestões de Perguntas:** Sempre inclua sugestões de perguntas para guiar o atendente para soluções direcionadas, similar ao canal de chat.
    * **1. BOAS-VINDAS MELI:** (Mesmas subetapas do Chat)
        * Saudação, apresentação inicial: Mencionar claramente o nome do colaborador e o nome do Mercado Livre/Mercado Pago.
        * Personalizar o contato: Se dirigir ao usuário pelo nome com proximidade.
        * Colocar-se à disposição com contexto: Expressar disposição para a resolução de inconvenientes.
        * Mencionar de forma resumida as informações do motivo do contato de maneira proativa.
        * Demonstrar conhecimento e proximidade.
        * Manter a conexão durante toda a saudação: Ajustar o tom e a velocidade da conversa conforme o perfil inicial identificado do usuário (idade e emocionalidade).
        * Assegurar a ausência de silêncio.
        * Demonstrar interesse pelo usuário com expressões empáticas (escuta ativa).
    * **2. EXPLORAÇÃO MELI:** (Mesmas subetapas do Chat)
        * Escuta ativamente, demonstrando interesse para manter a proximidade: Faça o atendente ouvir sem interromper ou julgar, evitando permanecer em silêncio durante as explicações do usuário.
        * Valide o usuário, fazendo-o sentir-se compreendido.
        * Investigue para assegurar a compreensão do caso completo: realize perguntas e/ou confirmações precisas para garantir o entendimento completo do caso, contexto, preocupações e expectativas do usuário nesse contato. Gere confiança ao mencionar informações relevantes do caso de forma proativa (dados do sistema), evitando que o usuário sinta que sua situação não é conhecida. Faça o usuário sentir-se compreendido ao realizar perguntas que obtenham informações diferentes das disponíveis no sistema.
        * Mantenha a liderança da conversa com empatia: lidere a conversa, definindo o estilo e gerando uma comunicação fluida. Foque nos aspectos relevantes do caso, mas permita que o usuário participe e expresse suas emoções.
        * Revise a situação do usuário, experiência e vivências (exploração junto ao usuário) para preparar o início do guia e aconselhamento: utilize diversas ferramentas para obter uma visão completa da situação do usuário, com ênfase em encerrar a exploração e iniciar o aconselhamento.
        * Mantenha a conexão durante toda a exploração: ajuste os tons e a velocidade da conversa conforme o perfil inicial identificado do usuário (idade e emocionalidade). Assegure a ausência de silêncios. Demonstre interesse pelo usuário com expressões empáticas (escuta ativa).
    * **3. ORIENTAÇÃO E ACONSELHAMENTO MELI:** (Mesmas subetapas do Chat)
        * Se estabeleça como consultor, guiando a conversa de maneira empática: lidere as explicações passo a passo. Gere uma conversa fluida, focando nos aspectos relevantes do caso, mas permitindo que o usuário se sinta parte e expresse suas emoções.
        * Inclua o usuário na busca/apresentação das alternativas de solução e personaliza as explicações: gerencie a solução em conjunto com o usuário, buscando e apresentando as melhores alternativas que se adaptem ao caso, à situação e ao contexto (personalização). Assegure que as recomendações sejam relevantes e eficazes.
        * Na explicação, seja conciso e claro (fale de forma direta): Ofereça explicações claras e diretas, utilizando uma linguagem simples, adaptada ao nível de conhecimento do usuário. Apresente as informações do processo e seus passos de forma ordenada e assertiva. Não solicite informações desnecessárias nem faça o usuário perder tempo com etapas que não agreguem valor.
        * Realize verificações de compreensão, atento a sinais que o usuário forneça (silêncios, perguntas adicionais): Preste atenção a sinais como silêncios, perguntas ou qualquer expressão que indique dúvidas, esclarecendo-as quando necessário. Confirme se o usuário está compreendendo as explicações, oferecendo-se proativamente para revisar ou ampliar as informações.
        * Momento, duração, explicação de uso e acompanhamento durante a espera: Caso necessário, utilize os silêncios de forma mínima. Se usar, não ultrapasse 5 minutos e explique previamente ao usuário o motivo. Analise com o usuário o que aparece na tela, explicando políticas e processos e evitando silêncios na conversa. Exemplo: "Irei verificar o que aconteceu que o seu caso não foi resolvido no sistema, já retorno com mais informações, mas estou disponível, pode me chamar a qualquer momento."
    * **4. ENCERRAMENTO MELI:** (Mesmas subetapas do Chat)
        * Realize verificações finais de compreensão: Preocupe-se em garantir que o usuário fique tranquilo e satisfeito com o atendimento. Busque que o usuário inicie o encerramento do contato, sem forçar um fechamento antecipado, evitando perder o usuário no processo.
        * Expresse e mostre proatividade e disposição para resolver outras questões adicionais: ofereça soluções adicionais e demonstre disposição em ajudar proativamente, antecipando-se a possíveis perguntas ou preocupações que não tenham sido abordadas durante a interação.
        * Agradeça e se despeça amavelmente: cumprimente o usuário pelo nome com clareza e intenção (bom dia/boa tarde/boa noite). Encontre oportunidades para agregar valor em outras respostas, compartilhando boas práticas e ações preventivas possíveis.
        * Mantenha a conexão durante todo o encerramento: ajuste o tom e a velocidade da conversa conforme o perfil inicial detectado (idade e emocionalidade). Garanta a ausência de silêncios. Demonstre interesse com expressões empáticas (mostrando escuta ativa).
`;
        } else {
            channelSpecificInstructions = `
* **Canal de Atendimento Desconhecido:** Forneça respostas padrão, claras e objetivas.
`;
        }

        let ecosystemSpecificInstructions = '';
        if (ecosystem === 'mercadoLivre') {
            ecosystemSpecificInstructions = `
* **Foco no Mercado Livre:** Priorize informações e procedimentos relacionados a vendas, compras, anúncios, reputação, envios (Mercado Envios) e problemas gerais da plataforma Mercado Livre.
`;
        } else if (ecosystem === 'mercadoPago') {
            ecosystemSpecificInstructions = `
* **Foco no Mercado Pago:** Priorize informações e procedimentos relacionados a pagamentos, recebimentos, Pix, transferências, conta digital, rendimentos, maquininhas de cartão (Point) e ferramentas financeiras do Mercado Pago.
`;
        } else {
            ecosystemSpecificInstructions = `
* **Foco Geral no Ecossistema MELI:** Forneça informações gerais que englobem tanto Mercado Livre quanto Mercado Pago, ou peça ao colaborador para especificar se a dúvida se refere a um ou outro.
`;
        }

        systemInstructions = systemInstructions.replace('{SERVICE_CHANNEL_INSTRUCTIONS}', channelSpecificInstructions);
        systemInstructions = systemInstructions.replace('{ECOSYSTEM_INSTRUCTIONS}', ecosystemSpecificInstructions);

        // Filter chatHistory to only include messages suitable for the API
        const filteredChatHistory = chatHistory.filter(msg => msg.role && msg.parts && msg.parts[0] && msg.parts[0].text);

        const contentsToSend = [
            { role: "user", parts: [{ text: systemInstructions }] },
            ...filteredChatHistory
        ];

        // console.log("Sending system instructions for language:", currentLanguage); // Removido
        // console.log("System Instructions being sent:", systemInstructions); // Removido


        const payload = {
            contents: contentsToSend,
            generationConfig: {}
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // NOVO: Remove a mensagem de "pensando" antes de começar a digitar
        if (thinkingMessageElement && thinkingMessageElement.parentNode) {
            thinkingMessageElement.parentNode.removeChild(thinkingMessageElement);
        }

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro da API Gemini:', errorData);
            let errorMessageText = `Requisição à API Gemini falhou com status ${response.status}.`;
            if (errorData && errorData.error && errorData.error.message) {
                errorMessageText += ` Detalhes: ${errorData.error.message}`;
            } else if (response.statusText) {
                errorMessageText += ` Detalhes: ${response.statusText}`;
            }
            throw new Error(errorMessageText);
        }

        const result = await response.json();

        if (!isConversationActive) {
            // console.log("Resposta da API recebida após o reset da conversa. Descartando."); // Removido
            return;
        }

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            let aiResponseText = result.candidates[0].content.parts[0].text;

            const aiMessageObject = { role: "assistant", parts: [{ text: aiResponseText }] }; // Create the object here

            // NOVO: Verifica se é a primeira mensagem da IA para exibir os botões de sentimento
            const isInitialWelcomeMessage = chatHistory.length === 0 || (chatHistory.length === 1 && chatHistory[0].role === "assistant" && chatHistory[0].parts[0].text.startsWith(translations[currentLanguage].welcomeMessage.split('{')[0]));

            typeMessage(aiMessageObject, true, isInitialWelcomeMessage); // Pass the object
            chatHistory.push(aiMessageObject); // Push the same object to history

            if (currentConversationId === null && chatHistory.length > 2) {
                const title = await generateConversationTitle(initialUserMessage || prompt);
                const conversationsCol = collection(db, `artifacts/${appId}/users/${userId}/conversations`);
                const newDocRef = await addDoc(conversationsCol, {
                    title: title,
                    messages: JSON.stringify(chatHistory),
                    timestamp: Date.now(),
                    collaboratorName: collaboratorName || "Não Informado",
                    clientName: currentClientName || "Não Informado",
                    serviceChannel: serviceChannel || "Não Informado",
                    ecosystem: ecosystem || "Não Informado",
                    clientSentiment: currentClientSentiment || "Não Informado",
                    aiTone: currentAiTone || "Não Informado", // NOVO: Salva o tom da IA
                    isFavorite: false // NOVO: Define como não favorito por padrão
                });
                currentConversationId = newDocRef.id;
                loadConversationHistory();
            } else if (currentConversationId !== null) {
                const docRef = doc(db, `artifacts/${appId}/users/${userId}/conversations`, currentConversationId);
                await setDoc(docRef, {
                    messages: JSON.stringify(chatHistory),
                    clientSentiment: currentClientSentiment,
                    aiTone: currentAiTone // NOVO: Atualiza o tom da IA
                }, { merge: true });
            }

        } else {
            console.error('Estrutura de resposta inesperada da API Gemini:', result);
            typeMessage({ role: 'assistant', parts: [{ text: translations[currentLanguage].errorMessage }] }, false); // Pass object for error
        }

    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        errorMessage.textContent = `${translations[currentLanguage].errorMessage}: ${error.message || ""}`;
        errorMessage.classList.remove('hidden');
        errorMessage.classList.add('show');
        // NOVO: Remove a mensagem de "pensando" em caso de erro
        if (thinkingMessageElement && thinkingMessageElement.parentNode) {
            thinkingMessageElement.parentNode.removeChild(thinkingMessageElement);
        }
        if (loadingIndicator.style.display === 'flex') {
            loadingIndicator.classList.remove('show');
            loadingIndicator.style.display = 'none';
        }
        setTimeout(() => {
            errorMessage.classList.add('hidden');
            errorMessage.classList.remove('show');
        }, 7000);
    } finally {
        // Removed loading indicator hiding from here.
        // It is now solely handled by the typeMessage function.
    }
}

/**
 * Exclui uma conversa do Firestore.
 * @param {string} conversationId O ID do documento da conversa a ser excluída.
 */
async function deleteConversation(conversationId) {
    showCustomConfirm(
        translations[currentLanguage].deleteConfirm,
        async () => {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/conversations`, conversationId));
                // console.log(`Conversa ${conversationId} excluída.`); // Removido
                if (currentConversationId === conversationId) {
                    showInitialScreen();
                    currentConversationId = null;
                    chatHistory = [];
                    currentClientSentiment = null; // NOVO: Reseta o sentimento
                    currentAiTone = null; // NOVO: Reseta o tom da IA
                    sentimentButtonsContainer.classList.add('hidden'); // Esconde os botões de sentimento
                    aiToneButtonsContainer.classList.add('hidden'); // NOVO: Esconde os botões de tom da IA
                }
                loadConversationHistory();
            } catch (error) {
                console.error("Erro ao excluir conversa:", error);
                errorMessage.textContent = `${translations[currentLanguage].errorMessage}: ${error.message}`;
                errorMessage.classList.remove('hidden');
                errorMessage.classList.add('show');
                setTimeout(() => {
                    errorMessage.classList.add('hidden');
                    errorMessage.classList.remove('show');
                }, 7000);
            }
        },
        translations[currentLanguage].deleteConfirmYes,
        translations[currentLanguage].deleteConfirmNo
    );
}

/**
 * Exibe um modal de confirmação customizado.
 * @param {string} message A mensagem a ser exibida no modal.
 * @param {function} onConfirm Callback a ser executado se o usuário confirmar.
 * @param {string} [yesButtonText] Texto opcional para o botão "Sim".
 * @param {string} [noButtonText] Texto opcional para o botão "Não".
 */
function showCustomConfirm(message, onConfirm, yesButtonText, noButtonText) {
    const customConfirmOverlay = document.getElementById('custom-confirm-overlay');
    const customConfirmMessage = document.getElementById('custom-confirm-message');
    const customConfirmYes = document.getElementById('custom-confirm-yes');
    const customConfirmNo = document.getElementById('custom-confirm-no');

    customConfirmMessage.textContent = message;
    customConfirmYes.textContent = yesButtonText || translations[currentLanguage].confirmYesDefault;
    customConfirmNo.textContent = noButtonText || translations[currentLanguage].confirmNoDefault;

    customConfirmYes.onclick = null;
    customConfirmNo.onclick = null;

    customConfirmYes.onclick = () => {
        onConfirm();
        customConfirmOverlay.classList.remove('show');
    };
    customConfirmNo.onclick = () => {
        customConfirmOverlay.classList.remove('show');
    };

    customConfirmOverlay.classList.add('show');
}

/**
 * Atualiza o título de uma conversa no Firestore.
 * @param {string} conversationId O ID do documento da conversa.
 * @param {string} newTitle O novo título a ser salvo.
 */
async function updateConversationTitleInFirestore(conversationId, newTitle) {
    if (!db || !userId || !isAuthReady) {
        console.error("Firebase ou userId não prontos para atualizar título.");
        return;
    }
    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/conversations`, conversationId);
        await setDoc(docRef, { title: newTitle }, { merge: true });
        // console.log(`Título da conversa ${conversationId} atualizado para: ${newTitle}`); // Removido
    } catch (error) {
        console.error("Erro ao atualizar título da conversa no Firestore:", error);
        errorMessage.textContent = `${translations[currentLanguage].errorMessage}: ${error.message}`;
        errorMessage.classList.remove('hidden');
        errorMessage.classList.add('show');
        setTimeout(() => {
            errorMessage.classList.add('hidden');
            errorMessage.classList.remove('show');
        }, 7000);
    }
}

/**
 * Alterna o status de favorito de uma conversa no Firestore.
 * @param {string} conversationId O ID do documento da conversa.
 * @param {boolean} currentFavoriteStatus O status atual de favorito da conversa.
 */
async function toggleFavoriteStatus(conversationId, currentFavoriteStatus) {
    if (!db || !userId || !isAuthReady) {
        console.error("Firebase ou userId não prontos para atualizar favorito.");
        return;
    }
    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/conversations`, conversationId);
        await setDoc(docRef, { isFavorite: !currentFavoriteStatus }, { merge: true });
        loadConversationHistory(); // Recarrega o histórico para atualizar as listas
    } catch (error) {
        console.error("Erro ao alternar status de favorito:", error);
        errorMessage.textContent = `${translations[currentLanguage].errorMessage}: ${error.message}`;
        errorMessage.classList.remove('hidden');
        errorMessage.classList.add('show');
        setTimeout(() => {
            errorMessage.classList.add('hidden');
            errorMessage.classList.remove('show');
        }, 7000);
    }
}


/**
 * Carrega o histórico de conversas do Firestore e renderiza na sidebar.
 */
async function loadConversationHistory() {
    if (!db || !userId || !isAuthReady) {
        // console.log("Firestore ou userId não prontos para carregar histórico."); // Removido
        return;
    }

    try {
        // Removendo orderBy para evitar problemas de índice, e ordenando no cliente
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/conversations`), limit(10));
        const querySnapshot = await getDocs(q);

        const conversations = [];
        querySnapshot.forEach((doc) => {
            conversations.push({ id: doc.id, ...doc.data() });
        });

        // Ordenar as conversas pelo timestamp no cliente
        conversations.sort((a, b) => b.timestamp - a.timestamp); // Ordena do mais recente para o mais antigo

        historyList.innerHTML = '';
        favoritesList.innerHTML = ''; // Limpa a lista de favoritos

        conversations.forEach((data) => {
            const li = document.createElement('li');
            li.classList.add('history-item');
            li.id = `history-item-${data.id}`;

            const titleAndActions = document.createElement('div');
            titleAndActions.classList.add('title-and-actions');
            li.appendChild(titleAndActions);

            const titleSpan = document.createElement('span');
            titleSpan.textContent = data.title;
            titleSpan.classList.add('conversation-title');
            titleSpan.contentEditable = false;
            titleSpan.spellcheck = false;
            titleAndActions.appendChild(titleSpan);

            const actionButtons = document.createElement('div');
            actionButtons.classList.add('action-buttons');
            actionButtons.style.display = 'none';
            titleAndActions.appendChild(actionButtons);

            // Botão de Favorito
            const favoriteButton = document.createElement('button');
            favoriteButton.classList.add('favorite-conversation-button');
            favoriteButton.innerHTML = data.isFavorite ? '<i data-feather="star" class="filled"></i>' : '<i data-feather="star"></i>';
            favoriteButton.title = translations[currentLanguage].favoriteButtonAria;
            if (data.isFavorite) {
                favoriteButton.classList.add('favorited');
            }
            actionButtons.appendChild(favoriteButton);


            const editButton = document.createElement('button');
            editButton.classList.add('edit-conversation-button');
            editButton.innerHTML = '<i data-feather="edit-2"></i>';
            editButton.title = translations[currentLanguage].editTitle;
            actionButtons.appendChild(editButton);

            const deleteButton = document.createElement('button'); // Create the button element
            deleteButton.classList.add('delete-conversation-button'); // Add the class to the button
            deleteButton.innerHTML = '<i data-feather="x"></i>';
            deleteButton.title = translations[currentLanguage].deleteConfirm;
            actionButtons.appendChild(deleteButton);

            if (data.isFavorite) {
                favoritesList.appendChild(li); // Adiciona à lista de favoritos
            } else {
                historyList.appendChild(li); // Adiciona à lista de todas as conversas
            }


            li.addEventListener('mouseenter', () => {
                actionButtons.style.display = 'flex';
            });

            li.addEventListener('mouseleave', () => {
                if (titleSpan.contentEditable !== 'true') {
                    actionButtons.style.display = 'none';
                }
            });

            if (currentConversationId === data.id) {
                li.classList.add('active');
            }

            li.addEventListener('click', (event) => {
                // Previne que o clique nos botões de ação propague para o item da lista
                if (event.target.closest('.action-buttons')) {
                    return;
                }
                if (titleSpan.contentEditable === 'true') {
                    return;
                }
                loadConversation(data.id);
            });

            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation();
                deleteConversation(data.id);
            });

            editButton.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleEditMode(data.id, titleSpan, editButton, deleteButton, actionButtons, favoriteButton);
            });

            favoriteButton.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleFavoriteStatus(data.id, data.isFavorite);
            });
        });

        if (currentConversationId === null) {
            homeButton.classList.add('active');
        } else {
            homeButton.classList.remove('active');
        }

        currentLanguageText.textContent = currentLanguage.substring(0, 2).toUpperCase();
        feather.replace();
    }
    catch (error) {
        console.error("Erro ao carregar histórico de conversas:", error);
    }
}

/**
 * Alterna o modo de edição para o título da conversa.
 * @param {string} conversationId O ID do documento da conversa.
 * @param {HTMLElement} titleElement O elemento span que contém o título.
 * @param {HTMLElement} editButton O botão de editar/salvar.
 * @param {HTMLElement} deleteButton O botão de excluir.
 * @param {HTMLElement} actionButtonsContainer O contêiner dos botões de ação.
 * @param {HTMLElement} favoriteButton O botão de favorito. // NOVO: Adicionado favoriteButton
 */
function toggleEditMode(conversationId, titleElement, editButton, deleteButton, actionButtonsContainer, favoriteButton) {
    const isEditing = titleElement.contentEditable === 'true';

    if (isEditing) {
        const newTitle = titleElement.textContent.trim();
        if (newTitle === "") {
            titleElement.textContent = titleElement.dataset.originalTitle || "Conversa sem Título";
        } else {
            updateConversationTitleInFirestore(conversationId, newTitle);
        }
        titleElement.contentEditable = false;
        titleElement.classList.remove('editing');
        editButton.innerHTML = '<i data-feather="edit-2"></i>';
        editButton.title = translations[currentLanguage].editTitle;
        deleteButton.style.display = 'flex';
        favoriteButton.style.display = 'flex'; // NOVO: Mostra o botão de favorito
        actionButtonsContainer.style.display = 'flex';
        feather.replace();
    } else {
        titleElement.contentEditable = true;
        titleElement.classList.add('editing');
        titleElement.dataset.originalTitle = titleElement.textContent;
        editButton.innerHTML = '<i data-feather="check"></i>';
        editButton.title = translations[currentLanguage].saveTitle;
        deleteButton.style.display = 'none';
        favoriteButton.style.display = 'none'; // NOVO: Esconde o botão de favorito
        actionButtonsContainer.style.display = 'flex';
        titleElement.focus();
        const range = document.createRange();
        range.selectNodeContents(titleElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        feather.replace();

        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                toggleEditMode(conversationId, titleElement, editButton, deleteButton, actionButtonsContainer, favoriteButton);
                titleElement.removeEventListener('keydown', handleKeyDown);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                titleElement.textContent = titleElement.dataset.originalTitle;
                toggleEditMode(conversationId, titleElement, editButton, deleteButton, actionButtonsContainer, favoriteButton);
                titleElement.removeEventListener('keydown', handleKeyDown);
            }
        };
        titleElement.addEventListener('keydown', handleKeyDown);
    }
}


// Função para mostrar a tela inicial e esconder o chat
function showInitialScreen() {
    initialScreen.classList.remove('hidden');
    chatAndInputArea.classList.add('hidden');
    document.querySelectorAll('.history-item').forEach(item => {
        item.classList.remove('active');
    });
    currentConversationId = null;
    initialUserMessage = null;
    chatHistory = [];
    currentClientSentiment = null; // NOVO: Reseta o sentimento
    currentAiTone = null; // NOVO: Reseta o tom da IA
    sentimentButtonsContainer.classList.add('hidden'); // Esconde os botões de sentimento
    aiToneButtonsContainer.classList.add('hidden'); // NOVO: Esconde os botões de tom da IA

    userInput.disabled = true;
    sendButton.disabled = true;
    userInput.classList.add('disabled');
    sendButton.classList.add('disabled');

    homeButton.classList.add('active');
}

// Função para mostrar a área de chat e esconder a tela inicial
function showChatArea() {
    initialScreen.classList.add('hidden');
    chatAndInputArea.classList.remove('hidden');
    // Initially disable them until sentiment is chosen
    userInput.disabled = true;
    sendButton.disabled = true;
    userInput.classList.add('disabled');
    sendButton.classList.add('disabled');
    userInput.focus(); // Still focus, but it will be disabled
    homeButton.classList.remove('active');
}

// Listeners de Eventos

// Modal de créditos
creditsOkButton.addEventListener('click', () => {
    hideCreditsModal();
});
creditsCloseButton.addEventListener('click', () => {
    hideCreditsModal();
});

// NOVO: Listener para o botão de créditos no cabeçalho
creditsButton.addEventListener('click', showCreditsModal);

// NOVO: Listener para o botão "Utilizar" do modal de versão
versionInfoUseButton.addEventListener('click', () => {
    hideVersionInfoModal();
    // A linha abaixo foi removida para que o modal de dados iniciais não seja aberto automaticamente
    // showInitialDataModal();
});


// NOVO: Listeners para os inputs do modal de dados iniciais para habilitar/desabilitar o botão
collaboratorNameInput.addEventListener('input', checkInitialDataInputs);
clientNameInput.addEventListener('input', checkInitialDataInputs);

// NOVO: Listener para o botão de confirmação do modal de dados iniciais
initialDataConfirmButton.addEventListener('click', () => {
    collaboratorName = collaboratorNameInput.value.trim();
    currentClientName = clientNameInput.value.trim();
    serviceChannel = serviceChannelSelect.value;
    ecosystem = ecosystemSelect.value;
    currentClientSentiment = null; // Garante que o sentimento é resetado ao iniciar uma nova conversa
    currentAiTone = null; // NOVO: Garante que o tom da IA é resetado ao iniciar uma nova conversa

    if (!collaboratorName) {
        collaboratorNameInput.classList.add('input-error');
        errorMessage.textContent = translations[currentLanguage].collaboratorNameRequired;
        errorMessage.classList.remove('hidden');
        errorMessage.classList.add('show');
        setTimeout(() => {
            errorMessage.classList.add('hidden');
            errorMessage.classList.remove('show');
            collaboratorNameInput.classList.remove('input-error');
        }, 5000);
        return;
    }

    if (!currentClientName) {
        clientNameInput.classList.add('input-error');
        errorMessage.textContent = translations[currentLanguage].clientNameRequired;
        errorMessage.classList.remove('hidden');
        errorMessage.classList.add('show');
        setTimeout(() => {
            errorMessage.classList.add('hidden');
            errorMessage.classList.remove('show');
            clientNameInput.classList.remove('input-error');
        }, 5000);
        return;
    }

    hideInitialDataModal();
    showChatArea();

    let baseWelcomeMessage = translations[currentLanguage].welcomeMessage;

    let clientNameAdapted = "";
    if (currentClientName) {
        if (currentLanguage === 'pt-BR') {
            clientNameAdapted = `o(a) cliente *${currentClientName}*`;
        } else if (currentLanguage === 'en') {
            clientNameAdapted = `the customer *${currentClientName}*`;
        } else if (currentLanguage === 'es') {
            clientNameAdapted = `el/la cliente *${currentClientName}*`;
        }
    } else {
        if (currentLanguage === 'pt-BR') {
            clientNameAdapted = `o(a) cliente`;
        } else if (currentLanguage === 'en') {
            clientNameAdapted = `the customer`;
        } else if (currentLanguage === 'es') {
            clientNameAdapted = `el/la cliente`;
        }
    }

    let serviceChannelDisplay = "";
    let finalHelpPhrase = "";
    let ecosystemDisplay = "";

    if (currentLanguage === 'pt-BR') {
        switch (serviceChannel) {
            case 'chat':
                serviceChannelDisplay = 'chat';
                break;
            case 'email':
                serviceChannelDisplay = 'e-mail';
                break;
            case 'c2c':
                serviceChannelDisplay = 'C2C (voz)';
                break;
            default:
                serviceChannelDisplay = 'um canal de atendimento';
        }
        switch (ecosystem) {
            case 'mercadoLivre':
                ecosystemDisplay = 'Mercado Livre';
                finalHelpPhrase = `Estou aqui para te ajudar com agilidade nas suas dúvidas e resolver os problemas de ${clientNameAdapted} no **Mercado Livre**. Como posso te auxiliar hoje?`;
                break;
            case 'mercadoPago':
                ecosystemDisplay = 'Mercado Pago';
                finalHelpPhrase = `Estou aqui para te ajudar com agilidade nas suas dúvidas e resolver os problemas de ${clientNameAdapted} no **Mercado Pago**. Como posso te auxiliar hoje?`;
                break;
            default:
                ecosystemDisplay = 'Ecossistema MELI';
                finalHelpPhrase = `Estou aqui para te ajudar com agilidade nas suas dúvidas e resolver os problemas de ${clientNameAdapted} no **Ecossistema Mercado Livre e Mercado Pago**. Como posso te auxiliar hoje?`;
        }
    } else if (currentLanguage === 'en') {
        switch (serviceChannel) {
            case 'chat':
                serviceChannelDisplay = 'chat';
                break;
            case 'email':
                serviceChannelDisplay = 'email';
                break;
            case 'c2c':
                serviceChannelDisplay = 'C2C (voice)';
                break;
            default:
                serviceChannelDisplay = 'a service channel';
        }
        switch (ecosystem) {
            case 'mercadoLivre':
                ecosystemDisplay = 'Mercado Libre';
                finalHelpPhrase = `I'm here to help you quickly with your questions and solve the problems of ${clientNameAdapted} on **Mercado Libre**. How can I assist you today?`;
                break;
            case 'mercadoPago':
                ecosystemDisplay = 'Mercado Pago';
                finalHelpPhrase = `I'm here to help you quickly with your questions and solve the problems of ${clientNameAdapted} on **Mercado Pago**. How can I assist you today?`;
                break;
            default:
                ecosystemDisplay = 'MELI Ecosystem';
                finalHelpPhrase = `I'm here to help you quickly with your questions and solve the problems of ${clientNameAdapted} in the **Mercado Libre and Mercado Pago Ecosystem**. How can I assist you today?`;
        }
    } else if (currentLanguage === 'es') {
        switch (serviceChannel) {
            case 'chat':
                serviceChannelDisplay = 'chat';
                break;
            case 'email':
                serviceChannelDisplay = 'correo electrónico';
                break;
            case 'c2c':
                serviceChannelDisplay = 'C2C (voz)';
                break;
            default:
                serviceChannelDisplay = 'un canal de atención';
        }
        switch (ecosystem) {
            case 'mercadoLivre':
                ecosystemDisplay = 'Mercado Libre';
                finalHelpPhrase = `Estoy aquí para ayudarte rápidamente con tus dudas y resolver los problemas de ${clientNameAdapted} en **Mercado Libre**. ¿Cómo puedo asistirte hoy?`;
                break;
            case 'mercadoPago':
                ecosystemDisplay = 'Mercado Pago';
                finalHelpPhrase = `Estoy aquí para ayudarte rápidamente con tus dudas y resolver los problemas de ${clientNameAdapted} en **Mercado Pago**. ¿Cómo puedo asistirte hoy?`;
                break;
                break;
            default:
                ecosystemDisplay = 'Ecosistema MELI';
                finalHelpPhrase = `Estoy aquí para ayudarte rápidamente con tus dudas y resolver los problemas de ${clientNameAdapted} en el **Ecosistema Mercado Libre y Mercado Pago**. ¿Cómo puedo asistirte hoy?`;
        }
    }

    let fullWelcomeMessage = baseWelcomeMessage
        .replace('{COLLABORATOR_NAME}', collaboratorName)
        .replace(/{CLIENT_NAME_ADAPTED}/g, clientNameAdapted)
        .replace('{SERVICE_CHANNEL_ADAPTED}', serviceChannelDisplay) + " " + finalHelpPhrase;

    const welcomeMessageObject = { role: "assistant", parts: [{ text: fullWelcomeMessage }] };
    chatHistory = [welcomeMessageObject]; // Store the object
    typeMessage(welcomeMessageObject, false, true); // Pass the object
    userInput.focus();
});

// NOVO: Listener para o botão de fechar do modal de dados iniciais
initialDataCloseButton.addEventListener('click', () => {
    hideInitialDataModal();
    showInitialScreen();
});


// Botão "Iniciar Nova Conversa" da tela inicial
startChatButton.addEventListener('click', () => {
    startNewConversation();
});

// Botão de enviar mensagem
sendButton.addEventListener('click', () => sendMessage(false));

// Botões do modal de confirmação de reiniciar
confirmRestartYesButton.addEventListener('click', () => {
    hideConfirmationModal();
    startNewConversation();
});
confirmRestartNoButton.addEventListener('click', hideConfirmationModal);

// Botão de alternar tema
themeToggleButton.addEventListener('click', toggleTheme);

// Botões do modal de tutorial
tutorialButton.addEventListener('click', showTutorialModal);
tutorialCloseButton.addEventListener('click', hideTutorialModal);
tutorialOkButton.addEventListener('click', hideTutorialModal);

// Listener para o novo botão de alternância de idioma
languageToggleButton.addEventListener('click', () => {
    const currentIndex = availableLanguages.indexOf(currentLanguage);
    const nextIndex = (currentIndex + 1) % availableLanguages.length;
    const nextLanguage = availableLanguages[nextIndex];
    setLanguage(nextLanguage);
});

// Enviar mensagem com Enter (sem Shift)
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage(false);
    }
});

// Auto-ajuste da altura do textarea
userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
});

// Toggle da sidebar
mainSidebarToggleButton.addEventListener('click', () => {
    isSidebarVisible = !isSidebarVisible;
    conversationHistorySidebar.classList.toggle('hidden', !isSidebarVisible);

    mainSidebarToggleButton.innerHTML = isSidebarVisible ? '<i data-feather="chevron-left"></i>' : '<i data-feather="chevron-right"></i>';
    feather.replace();
});

// Novo: Listener para o botão de Início no cabeçalho
homeButton.addEventListener('click', showInitialScreen);

// Ao carregar a página
window.addEventListener('load', async () => {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';

    // Carrega a preferência de idioma do localStorage
    const storedLanguage = localStorage.getItem('preferredLanguage') || 'pt-BR';
    setLanguage(storedLanguage);

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }

    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
                applyTheme(event.matches ? 'dark' : 'light');
        });
    }

    feather.replace();

    loadingIndicator.style.display = 'none';

    userInput.disabled = true;
    sendButton.disabled = true;
    userInput.classList.add('disabled');
    sendButton.classList.add('disabled');

    isSidebarVisible = false;
    conversationHistorySidebar.classList.add('hidden');
    mainSidebarToggleButton.innerHTML = '<i data-feather="chevron-right"></i>';
    feather.replace();

    // NOVO: Exibe o modal de informações de versão ao carregar a página
    showVersionInfoModal();


    try {
        if (!firebaseConfig.projectId || firebaseConfig.projectId === "YOUR_PROJECT_ID_PLACEHOLDER") {
            const errorMsg = "Erro de configuração do Firebase: 'projectId' não fornecido ou é um placeholder. O histórico de conversas não estará disponível. Por favor, verifique a configuração do ambiente.";
            console.error(errorMsg);
            errorMessage.textContent = errorMsg;
            errorMessage.classList.remove('hidden');
            errorMessage.classList.add('show');
        }

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                isAuthReady = true;
                // console.log("Usuário autenticado:", userId); // Removido
                if (firebaseConfig.projectId && firebaseConfig.projectId !== "YOUR_PROJECT_ID_PLACEHOLDER") {
                    await loadConversationHistory();
                }
                userInput.disabled = false;
                sendButton.disabled = false;
                userInput.classList.remove('disabled');
                sendButton.classList.remove('disabled');
                userInput.focus();

            } else {
                // console.log("Nenhum usuário logado. Tentando autenticação anônima..."); // Removido
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (anonError) {
                    console.error("Erro na autenticação anônima:", anonError);
                }
            }
        });
    } catch (firebaseInitError) {
        console.error("Erro ao inicializar Firebase:", firebaseInitError);
        errorMessage.textContent = `${translations[currentLanguage].errorMessage}: ${firebaseInitError.message}`;
        errorMessage.classList.remove('hidden');
        errorMessage.classList.add('show');
    }
});
