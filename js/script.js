// Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, doc, getDoc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Variáveis globais do Firebase (fornecidas pelo ambiente Canvas)
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

// Elementos do DOM
const notificationModalOverlay = document.getElementById('notification-modal-overlay');
const modalStartButton = document.getElementById('modal-start-button');
const chatAndInputArea = document.getElementById('chat-and-input-area'); // ID correto agora
const initialScreen = document.getElementById('initial-screen'); // Novo elemento da tela inicial
const startChatButton = document.getElementById('start-chat-button'); // Novo botão para iniciar chat
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
const homeButton = document.getElementById('home-button'); // Novo: Botão de Início no cabeçalho

// Novo: Botão único de alternância de idioma
const languageToggleButton = document.getElementById('language-toggle-button');
const currentLanguageText = document.getElementById('current-language-text'); // Novo: Elemento para o texto do idioma


// Elementos para o modal de confirmação de reiniciar conversa (ainda existem, mas não são usados pelo botão)
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
const userIdText = document.getElementById('user-id-text');
const mainSidebarToggleButton = document.getElementById('main-sidebar-toggle-button'); // Novo botão no header principal
const contentArea = document.getElementById('content-area'); // Adicionado para controlar classe no content-area

// Variável para armazenar o ID do timeout da digitação, permitindo cancelá-lo.
let typingTimeoutId = null;

// Flag para controlar se a conversa está ativa ou foi reiniciada.
let isConversationActive = true;

// Variável para armazenar o nome do cliente atual
let currentClientName = null;

// Variável para armazenar o idioma atual e o idioma pendente de confirmação
let currentLanguage = 'pt-BR'; // Padrão
// let pendingLanguage = null; // Armazena o idioma selecionado antes da confirmação - REMOVIDO
const availableLanguages = ['pt-BR', 'en', 'es']; // Idiomas disponíveis

// Variável para armazenar o ID da conversa atual no Firestore
let currentConversationId = null;

// Variável para controlar o estado da sidebar
let isSidebarVisible = true; // Inicialmente visível em desktop. Em mobile, será controlada.

// Objeto de traduções
const translations = {
    'pt-BR': {
        appTitle: 'Almail Suporte IA - Cartões',
        creditsModalTitle: 'Créditos', // Título do modal de créditos
        creditsModalSubtitle: 'Uma ferramenta de suporte inteligente para o time de Cartões do Mercado Pago.', // Subtitulo
        creditsModalDescription: `
            <ul class="list-none p-0 text-center">
                <li class="mb-2"><strong>Desenvolvedores:</strong></li>
                <li class="mb-1">Lucas Carneiro</li>
                <li class="mb-1">Lucas Candido</li>
                <li class="mb-2 mt-3"><strong>Apoio e Colaboração:</strong></li>
                <li class="mb-1">Time de Cartões (Concentrix)</li>
            </ul>
        `, // Descrição detalhada dos créditos
        creditsModalButton: 'Entendi', // Texto do botão
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
        headerSubtitle: 'Suporte IA - Cartões',
        tutorialButtonAria: 'Abrir Tutorial',
        themeToggleButtonAria: 'Alternar Tema',
        homeButtonAria: 'Voltar para o Início', // Adicionado para o novo botão de Início
        typingIndicator: 'Almail está digitando...',
        inputPlaceholder: 'Pergunte à Almail...',
        sendButtonAria: 'Enviar Mensagem',
        footerCopyright: '© 2025 Almail Suporte IA. Todos os direitos reservados.',
        footerDisclaimer: 'Esta IA utiliza dados públicos e não armazena informações do Mercado Pago.',
        welcomeMessage: "Olá! Sou a Almail, sua assistente virtual especializada em suporte para Cartões do Mercado Pago. Estou aqui para te ajudar a atender seus clientes. Para otimizar nosso atendimento, por favor, me informe o *nome do cliente* que você está atendendo. Se não for para um cliente específico, podemos seguir normalmente. Estou aqui para ajudar!",
        historyTitle: 'Histórico de Conversas',
        userIdDisplay: 'ID do Usuário:',
        homeButton: 'Início', // Novo texto para o botão "Início"
        newChat: 'Nova Conversa',
        deleteConfirm: 'Tem certeza que deseja excluir esta conversa?', // Adicionado para exclusão
        deleteConfirmYes: 'Sim, Excluir', // Novo: Texto para o botão de confirmação de exclusão
        deleteConfirmNo: 'Não, Manter', // Novo: Texto para o botão de cancelamento de exclusão
        confirmYesDefault: 'Sim', // Novo: Texto padrão para o botão "Sim" em confirmações genéricas
        confirmNoDefault: 'Não', // Novo: Texto padrão para o botão "Não" em confirmações genéricas
        editTitle: 'Editar Título', // Novo: Texto para o tooltip do botão de editar
        saveTitle: 'Salvar Título', // Novo: Texto para o tooltip do botão de salvar
        cancelEdit: 'Cancelar Edição', // Novo: Texto para o tooltip do botão de cancelar
        errorMessage: 'Ocorreu um erro. Por favor, tente novamente.',
        systemInstructions: `Você é a Almail, uma assistente virtual especializada em suporte para Cartões do Mercado Pago.
Seu objetivo principal é **auxiliar o colaborador** a fornecer um atendimento de excelência aos clientes.
Você deve agir como um **agente de suporte para o colaborador**, fornecendo informações precisas e estruturadas para que ele possa, por sua vez, ajudar o cliente.

**É CRÍTICO que você responda SEMPRE e SOMENTE em Português (Brasil).**

**Pense e aja como um modelo de linguagem avançado:**
* **Fluidez e Naturalidade:** Suas respostas devem ser conversacionais, claras e diretas, evitando jargões desnecessários. Pense em como você explicaria algo a um colega de trabalho.
* **Compreensão Contextual:** Analise o histórico da conversa para entender a intenção por trás da pergunta do colaborador, mesmo que não seja explicitamente formulada.
* **Raciocínio Lógico:** Processe as informações de forma lógica para fornecer a solução mais relevante e eficiente.
* **Adaptação:** Ajuste o nível de detalhe e a complexidade da resposta com base na pergunta do colaborador, sem sobrecarregar com informações irrelevantes.

**Diretrizes operacionais:**
1.  **Foco e Escopo:** Seu conhecimento é exclusivo sobre Cartões Mercado Pago e serviços relacionados (emissão, bloqueio, transações, limites, faturas, etc.). **Não responda a perguntas fora deste escopo.** Se a pergunta não for clara ou estiver fora do escopo, peça ao colaborador para reformular ou esclarecer.
2.  **Linguagem:** Formal, profissional, clara, concisa e direta. **Nunca use emojis.** Utilize uma linguagem que seja útil para o colaborador, como se estivesse fornecendo um "roteiro" ou "base de conhecimento".
3.  **Personalização e Identificação:**
    * **Sempre se dirija ao colaborador.** Use termos como "você", "colaborador", "sua dúvida".
    * **Nunca confunda o colaborador com o cliente.** Se o nome do cliente for fornecido pelo colaborador (ex: "O cliente [Nome do Cliente] perguntou..."), use-o para personalizar a *resposta que o colaborador dará ao cliente*. Ex: "Para o cliente [Nome do Cliente], você pode informar que...".
    * Se o nome do cliente não for fornecido, use termos neutros como "o cliente" ou "o usuário" ao se referir a ele, mas sempre no contexto de como o *colaborador* deve interagir.
4.  **Objetividade e Clareza:** Responda apenas ao que foi perguntado, fornecendo informações precisas e baseadas em políticas e procedimentos do Mercado Pago. Evite divagações.
5.  **Segurança e Dados Sensíveis:** **NUNCA solicite ou processe informações sensíveis do cliente** (senhas, números completos de cartão, CVV, dados bancários completos, etc.). Se tais informações forem mencionadas pelo colaborador, instrua-o a lidar com elas de forma segura e offline, sem que a IA as processe ou as armazene.
6.  **Resolução e Aprofundamento:** Seu objetivo é ajudar o colaborador a resolver o problema do cliente. Se a resposta inicial não for suficiente, reformule ou aprofunde a explicação, sempre pensando em como o colaborador pode usar essa informação.
7.  **Estrutura da Resposta:** Utilize Markdown para organizar as informações (negrito, itálico, listas, blocos de código se necessário) para facilitar a leitura e o uso pelo colaborador. Considere usar títulos e subtítulos para respostas mais complexas.
8.  **Contexto e Continuidade:** Baseie-se no histórico da conversa para manter a coerência e a relevância. Se o colaborador fizer uma pergunta de acompanhamento, use o contexto anterior para fornecer uma resposta mais completa.
9.  **Proatividade (Opcional):** Se apropriado, sugira ao colaborador próximos passos ou informações adicionais que possam ser relevantes para o atendimento do cliente.`,
        tutorialText: `
            <h3 class="2xl font-bold text-center mb-5 text-blue-700">Desvende a Almail: Sua Plataforma de Suporte Inteligente</h3>
            <p class="mb-4 text-lg leading-relaxed">Abaixo, explore os principais botões e suas funções:</p>
            <ul class="list-none pl-0">
                <li class="mb-3 flex items-center">
                    <i data-feather="home" class="text-green-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Botão de Início:</strong> Localizado no canto superior esquerdo do cabeçalho, clique neste ícone <i data-feather="home" class="inline-block"></i> para retornar à tela inicial a qualquer momento e iniciar uma nova interação.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="help-circle" class="text-blue-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Botão de Guia Rápido:</strong> No canto superior direito do cabeçalho, clique neste ícone <i data-feather="help-circle" class="inline-block"></i> a qualquer momento para acessar este guia e relembrar as funcionalidades da Almail.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="moon" class="text-purple-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Alternar Tema:</strong> No canto superior direito do cabeçalho, ao lado do botão de idioma, use este botão <i data-feather="moon" class="inline-block"></i> (ou <i data-feather="sun" class="inline-block"></i>) para mudar entre o tema claro e o tema escuro, personalizando sua experiência visual.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="globe" class="text-indigo-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Alternar Idioma:</strong> Ao lado do botão de Guia Rápido, use este botão (<i data-feather="globe" class="inline-block"></i> PT, EN, ES) para alternar entre os idiomas disponíveis (Português, Inglês, Espanhol). A troca de idioma reiniciará a conversa atual.</p>
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
        initialScreenTitle: 'Bem-vindo(a) à Almail Suporte IA!',
        initialScreenSubtitle: 'Sua assistente inteligente para otimizar o suporte no time de Cartões do Mercado Pago.',
        initialScreenDescription: 'Aqui você pode obter informações rápidas e precisas sobre diversos tópicos relacionados a cartões. Clique em "Nova Conversa" para começar a interagir com a IA.',
        startChatButton: 'Iniciar Nova Conversa'
    },
    'en': {
        appTitle: 'Almail AI Support - Cards',
        creditsModalTitle: 'Credits', // Title for credits modal
        creditsModalSubtitle: 'An intelligent support tool for the Mercado Pago Cards team.', // Subtitle
        creditsModalDescription: `
            <ul class="list-none p-0 text-center">
                <li class="mb-2"><strong>Developers:</strong></li>
                <li class="mb-1">Lucas Carneiro</li>
                <li class="mb-1">Lucas Candido</li>
                <li class="mb-2 mt-3"><strong>Support and Collaboration:</strong></li>
                <li class="mb-1">Cards Team (Concentrix)</li>
            </ul>
        `, // Detailed credits description
        creditsModalButton: 'Understood', // Button text
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
        headerSubtitle: 'AI Support - Cards',
        tutorialButtonAria: 'Open Tutorial',
        themeToggleButtonAria: 'Toggle Theme',
        homeButtonAria: 'Back to Home', // Added for the new Home button
        typingIndicator: 'Almail is typing...',
        inputPlaceholder: 'Ask Almail...',
        sendButtonAria: 'Send Message',
        footerCopyright: '© 2025 Almail AI Support. All rights reserved.',
        footerDisclaimer: 'This AI uses public data and does not store Mercado Pago information.',
        welcomeMessage: "Hello! I'm Almail, your virtual assistant specialized in support for Mercado Pago Cards. I'm here to help you serve your customers. To optimize our service, please inform me the *customer's name* you are assisting. If it's not for a specific customer, we can proceed normally. I'm here to help!",
        historyTitle: 'Conversation History',
        userIdDisplay: 'User ID:',
        homeButton: 'Home', // New text for "Home" button
        newChat: 'New Chat',
        deleteConfirm: 'Are you sure you want to delete this conversation?', // Adicionado para exclusão
        deleteConfirmYes: 'Yes, Delete', // Novo: Texto para o botão de confirmação de exclusão
        deleteConfirmNo: 'No, Keep', // Novo: Texto para o botão de cancelamento de exclusão
        confirmYesDefault: 'Yes', // Novo: Texto padrão para o botão "Sim" em confirmações genéricas
        confirmNoDefault: 'No', // Novo: Texto padrão para o botão "Não" em confirmações genéricas
        editTitle: 'Edit Title', // Novo: Texto para o tooltip do botão de editar
        saveTitle: 'Save Title', // Novo: Texto para o tooltip do botão de salvar
        cancelEdit: 'Cancel Edit', // Novo: Texto para o tooltip do botão de cancelar
        errorMessage: 'An error occurred. Please try again.',
        systemInstructions: `You are Almail, a virtual assistant specialized in support for Mercado Pago Cards.
Your main objective is to **assist the collaborator** in providing excellent customer service.
You should act as a **support agent for the collaborator**, providing accurate and structured information so that they, in turn, can help the customer.

**It is CRITICAL that you respond ALWAYS and ONLY in English.**

**Think and act as an advanced language model:**
* **Fluency and Naturalness:** Your responses should be conversational, clear, and direct, avoiding unnecessary jargon. Think about how you would explain something to a colleague.
* **Contextual Understanding:** Analyze the conversation history to understand the intent behind the collaborator's question, even if not explicitly formulated.
* **Logical Reasoning:** Process information logically to provide the most relevant and efficient solution.
* **Adaptation:** Adjust the level of detail and the complexity of the response based on the collaborator's question, without overwhelming them with irrelevant information.

**Operational guidelines:**
1.  **Focus and Scope:** Your knowledge is exclusive to Mercado Pago Cards and related services (issuance, blocking, transactions, limits, invoices, etc.). **Do not answer questions outside this scope.** If the question is unclear or out of scope, ask the collaborator to rephrase or clarify.
2.  **Language:** Formal, professional, clear, concise, and direct. **Never use emojis.** Use language that is helpful to the collaborator, as if providing a "script" or "knowledge base."
3.  **Personalization and Identification:**
    * **Always address the collaborator.** Use terms like "you", "colaborador", "your question".
    * **Never confuse the collaborator with the customer.** If the customer's name is provided by the collaborator (e.g., "The customer [Customer Name] asked..."), use it to personalize the *response the collaborator will give to the customer*. Ex: "For customer [Customer Name], you can inform that...".
    * If the customer's name is not provided, use neutral terms like "the customer" or "the user" when referring to them, but always in the context of how the *colaborador* should interact.
4.  **Objetivity and Clarity:** Respond only to what was asked, providing accurate information based on Mercado Pago policies and procedures. Evite divagações.
5.  **Security and Sensitive Data:** **NEVER request or process sensitive customer information** (passwords, full card numbers, CVV, full bank details, etc.). If such information is mentioned by the collaborator, instruct them to handle it securely and offline, without the AI processing or storing it.
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
                    <i data-feather="help-circle" class="text-blue-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Quick Guide Button:</strong> In the upper right corner of the header, click this icon <i data-feather="help-circle" class="inline-block"></i> at any time to access this guide and review Almail's functionalities.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="moon" class="text-purple-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Toggle Theme:</strong> In the upper right corner of the header, next to the language button, use this button <i data-feather="moon" class="inline-block"></i> (or <i data-feather="sun" class="inline-block"></i>) to switch between light and dark themes, customizing your visual experience.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="globe" class="text-indigo-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Toggle Language:</strong> Next to the Quick Guide button, use this button (<i data-feather="globe" class="inline-block"></i> PT, EN, ES) to switch between available languages (Portuguese, English, Spanish). Changing the language will restart the current conversation.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="send" class="text-indigo-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Send Message:</strong> Located in the text input area, after typing your question or request, click this button <i data-feather="send" class="inline-block"></i> or press <strong>Enter</strong> to send your message to Almail.</p>
                </li>
            </ul>
            <p class="mt-6 text-lg leading-relaxed">With these resources, you will have full control over your interaction with Almail. We are here to simplify your daily life and offer the best support!</p>
        `,
        likeFeedback: 'Great that the answer was helpful! I will continue to improve to better serve you.',
        dislikeFeedback: 'Thank you for your feedback! I am learning and will try to generate a more useful, structured, and personalized response for you.',
        dislikePrompt: `The previous response was not satisfactory. Please generate a new, more useful response, with better argumentation and text structuring, and personalize it for the customer if their name is available. Remember to help me solve the customer's problem.`,
        initialScreenTitle: 'Welcome to Almail AI Support!',
        initialScreenSubtitle: 'Your intelligent assistant to optimize support for the Mercado Pago Cards team.',
        initialScreenDescription: 'Here you can get quick and accurate information on various card-related topics. Click "New Chat" to start interacting with the AI.',
        startChatButton: 'Start New Chat'
    },
    'es': {
        appTitle: 'Almail Soporte IA - Tarjetas',
        creditsModalTitle: 'Créditos',
        creditsModalSubtitle: 'Una herramienta de soporte inteligente para el equipo de Tarjetas de Mercado Pago.',
        creditsModalDescription: `
            <ul class="list-none p-0 text-center">
                <li class="mb-2"><strong>Desarrolladores:</strong></li>
                <li class="mb-1">Lucas Carneiro</li>
                <li class="mb-1">Lucas Candido</li>
                <li class="mb-2 mt-3"><strong>Apoyo y Colaboración:</strong></li>
                <li class="mb-1">Equipo de Tarjetas (Concentrix)</li>
            </ul>
        `,
        creditsModalButton: 'Entendido',
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
        headerSubtitle: 'Soporte IA - Tarjetas',
        tutorialButtonAria: 'Abrir Tutorial',
        themeToggleButtonAria: 'Alternar Tema',
        homeButtonAria: 'Volver al Inicio',
        typingIndicator: 'Almail está escribiendo...',
        inputPlaceholder: 'Pregunta a Almail...',
        sendButtonAria: 'Enviar Mensagem',
        footerCopyright: '© 2025 Almail Soporte IA. Todos los derechos reservados.',
        footerDisclaimer: 'Esta IA utiliza datos públicos y no almacena información de Mercado Pago.',
        welcomeMessage: "¡Hola! Soy Almail, tu asistente virtual especializada en soporte para Tarjetas de Mercado Pago. Estoy aquí para ayudarte a atender a tus clientes. Para optimizar nuestro servicio, por favor, infórmame el *nombre del cliente* al que estás atendiendo. Si no es para un cliente específico, podemos continuar normalmente. ¡Estoy aquí para ayudar!",
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
        systemInstructions: `Eres Almail, una asistente virtual especializada en soporte para Tarjetas de Mercado Pago.
Tu objetivo principal es **ayudar al colaborador** a proporcionar un excelente servicio al cliente.
Debes actuar como un **agente de soporte para el colaborador**, proporcionando información precisa y estructurada para que él, a su vez, pueda ayudar al cliente.

**Es CRÍTICO que respondas SEMPRE e SOMENTE em Español.**

**Piensa y actúa como um modelo de lenguaje avanzado:**
* **Fluidez y Naturalidad:** Tus respuestas deben ser conversacionales, claras y directas, evitando jerga innecesaria. Piensa en cómo le explicarías algo a un compañero de trabajo.
* **Comprehensión Contextual:** Analiza el historial de la conversación para entender la intención detrás de la pregunta del colaborador, incluso si no está formulada explícitamente.
* **Raciocínio Lógico:** Procesa la información de forma lógica para proporcionar la solución más relevante y eficiente.
* **Adaptación:** Ajusta el nivel de detalle y la complejidad de la respuesta según la pregunta del colaborador, sin abrumar con información irrelevante.

**Directrices operacionales:**
1.  **Enfoque y Alcance:** Tu conocimiento es exclusivo sobre Tarjetas Mercado Pago y servicios relacionados (emissão, bloqueo, transacciones, límites, facturas, etc.). **No respondas preguntas fuera de este alcance.** Si la pregunta no es clara o está fuera de alcance, pide al colaborador que la reformule o aclare.
2.  **Linguagem:** Formal, profesional, clara, concisa y directa. **Nunca uses emojis.** Utiliza un lenguaje que sea útil para el colaborador, como si estuvieras proporcionando um "guion" o uma "base de conocimiento".
3.  **Personalização e Identificação:**
    * **Dirígete siempre al colaborador.** Usa términos como "tú", "colaborador", "tu pregunta".
    * **Nunca confundas al colaborador com o cliente.** Si o nome do cliente é fornecido pelo colaborador (ex: "El cliente [Nome do Cliente] preguntó..."), úsalo para personalizar a *resposta que o colaborador le dará ao cliente*. Ex: "Para o cliente [Nome do Cliente], puedes informar que...".
    * Si el nome do cliente não se proporciona, usa termos neutros como "el cliente" o "el usuario" ao referirte a ele, pero siempre en el contexto de cómo o *colaborador* deve interagir.
4.  **Objetividade e Clareza:** Responde solo a lo que se preguntó, proporcionando información precisa e baseada en las políticas y procedimentos de Mercado Pago. Evita divagações.
5.  **Segurança e Dados Sensíveis:** **NUNCA solicites ni proceses informação sensível do cliente** (contraseñas, números completos de tarjeta, CVV, detalles bancarios completos, etc.). Si el colaborador menciona dicha informação, instrúyelo a manejarla de forma segura y fora de linha, sin que la IA la procese o armazene.
6.  **Resolução e Profundização:** Tu objetivo es ajudar al colaborador a resolver o problema do cliente. Si la resposta inicial não é suficiente, reformula ou profundiza a explicação, sempre pensando em como o colaborador pode usar esta informação.
7.  **Estructura de la Resposta:** Utiliza Markdown para organizar la informação (negrita, cursiva, listas, blocos de código se é necessário) para facilitar a leitura e o uso por parte do colaborador. Considera usar títulos e subtítulos para respostas mais complexas.
8.  **Contexto e Continuidade:** Basa tus respuestas en el historial de la conversación para mantener la coerência y la relevancia. Si el colaborador hace una pregunta de seguimiento, utiliza el contexto anterior para proporcionar uma resposta mais completa.
9.  **Proatividade (Opcional):** Si es apropriado, sugiere al colaborador los próximos passos o informação adicional que possa ser relevante para o serviço al cliente.`,
        tutorialText: `
            <h3 class="text-2xl font-bold text-center mb-5 text-blue-700">Descubre Almail: Tu Plataforma de Soporte Inteligente</h3>
            <p class="mb-4 text-lg leading-relaxed">A continuación, explora los principales botones y sus funciones:</p>
            <ul class="list-none pl-0">
                <li class="mb-3 flex items-center">
                    <i data-feather="home" class="text-green-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Botón de Inicio:</strong> Ubicado en la esquina superior izquierda del encabezado, haz clic en este icono <i data-feather="home" class="inline-block"></i> para regresar a la pantalla de inicio en cualquier momento y comenzar una nueva interacción.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="help-circle" class="text-blue-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Botón de Guía Rápida:</strong> En la esquina superior derecha del encabezado, haz clic en este icono <i data-feather="help-circle" class="inline-block"></i> en cualquier momento para acceder a esta guía y recordar las funcionalidades de Almail.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="moon" class="text-purple-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Alternar Tema:</strong> En la esquina superior derecha del encabezado, al lado del botón de idioma, usa este botón <i data-feather="moon" class="inline-block"></i> (o <i data-feather="sun" class="inline-block"></i>) para cambiar entre el tema claro y el tema oscuro, personalizando tu experiencia visual.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="globe" class="text-indigo-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Alternar Idioma:</strong> Al lado del botón de Guía Rápida, usa este botón (<i data-feather="globe" class="inline-block"></i> PT, EN, ES) para alternar entre los idiomas disponibles (Português, Inglês, Espanhol). El cambio de idioma reiniciará la conversación actual.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="send" class="text-indigo-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Enviar Mensagem:</strong> Ubicado en el área de entrada de texto, después de escribir tu pregunta o solicitud, haz clic en este botón <i data-feather="send" class="inline-block"></i> o presiona <strong>Enter</strong> para enviar tu mensaje a Almail.</p>
                </li>
            </ul>
            <p class="mt-6 text-lg leading-relaxed">Con estos recursos, tendrás control total sobre tu interacción con Almail. ¡Estamos aquí para simplificar tu día a día y ofrecerte el mejor soporte!</p>
        `,
        likeFeedback: '¡Qué bien que la respuesta fue útil! Seguiré mejorando para atenderte mejor.',
        dislikeFeedback: '¡Agradezco tus comentarios! Estoy aprendiendo e intentaré generar una respuesta más útil, estructurada y personalizada para ti.',
        dislikePrompt: `La respuesta anterior no fue satisfactoria. Por favor, genera una nueva respuesta más útil, con mejor argumentación y estructuración de texto, y personalízala para el cliente si su nombre está disponible. Recuerda ayudarme a resolver el problema del cliente.`,
        initialScreenTitle: '¡Bienvenido(a) a Almail Soporte IA!',
        initialScreenSubtitle: 'Tu asistente inteligente para optimizar el soporte para el equipo de Tarjetas de Mercado Pago.',
        initialScreenDescription: 'Aquí puedes obtener información rápida y precisa sobre diversos temas relacionados con tarjetas. Haz clic en "Nueva Conversación" para comenzar a interactuar con la IA.',
        startChatButton: 'Iniciar Nueva Conversação'
    }
};

// Histórico do chat. Agora, ele armazena apenas as mensagens visíveis da conversa.
let chatHistory = [];
let initialUserMessage = null; // Armazena a primeira mensagem do usuário para gerar o título

// Função para aplicar as traduções
function setLanguage(lang) { // Removido o parâmetro skipConfirmation
    // Defensive check: ensure the language exists in translations
    if (!translations[lang]) {
        console.error("Erro: Idioma selecionado ('" + lang + "') não encontrado nas traduções. Revertendo para pt-BR.");
        lang = 'pt-BR'; // Fallback to default language
        // Optionally, display a user-facing error message
    }

    currentLanguage = lang;
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem('preferredLanguage', lang);

    // Atualiza o texto do botão de idioma
    currentLanguageText.textContent = lang.substring(0, 2).toUpperCase(); // Ex: PT, EN, ES

    // Atualiza o título da página
    document.title = translations[lang].appTitle;

    // Atualiza elementos com data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) { // Adicionado verificação para translations[lang]
            if (element.tagName === 'TEXTAREA' && element.hasAttribute('placeholder')) {
                element.setAttribute('placeholder', translations[lang][key]);
            } else if (element.hasAttribute('aria-label')) {
                element.setAttribute('aria-label', translations[lang][key]);
            } else if (element.classList.contains('credits-list')) { // Adicionado para a lista de créditos
                element.innerHTML = translations[lang][key]; // Usa innerHTML para conteúdo HTML
            }
            else {
                element.textContent = translations[lang][key];
            }
        }
    });

    // Atualiza o conteúdo do tutorial
    if (translations[lang] && translations[lang].tutorialText) { // Adicionado verificação
        document.getElementById('tutorial-content').innerHTML = translations[lang].tutorialText; // Use o ID direto
    }


    // Se estiver na tela inicial, atualiza o texto da tela inicial
    if (initialScreen.classList.contains('show') || !chatAndInputArea.classList.contains('show')) {
        if (translations[lang]) { // Adicionado verificação
            document.querySelector('#initial-screen h2').textContent = translations[lang].initialScreenTitle;
            document.querySelector('#initial-screen p:nth-of-type(1)').textContent = translations[lang].initialScreenSubtitle;
            document.querySelector('#initial-screen p:nth-of-type(2)').textContent = translations[lang].initialScreenDescription;
            startChatButton.textContent = translations[lang].startChatButton;
        }
    }

    // Always call loadConversationHistory to refresh the sidebar after language change
    // This will update the "New Chat" button text and delete button tooltips.
    if (isAuthReady) { // Only if Firebase is ready
        loadConversationHistory();
    }

    feather.replace(); // Renderiza novamente os ícones Feather

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
function appendMessageToUI(sender, text, addFeedbackButtons = false) {
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');

    messageBubble.innerHTML = renderMarkdown(text);

    if (sender === 'user') {
        messageBubble.classList.add('user-message');
    } else {
        messageBubble.classList.add('ai-message');
        if (addFeedbackButtons) {
            const feedbackContainer = document.createElement('div');
            feedbackContainer.classList.add('feedback-buttons');

            const likeButton = document.createElement('button');
            likeButton.classList.add('feedback-button', 'like-button');
            likeButton.innerHTML = '<i data-feather="thumbs-up"></i>';
            likeButton.title = translations[currentLanguage].likeFeedback;
            likeButton.addEventListener('click', () => handleFeedback(messageBubble, 'like', text));

            const dislikeButton = document.createElement('button');
            dislikeButton.classList.add('feedback-button', 'dislike-button');
            dislikeButton.innerHTML = '<i data-feather="thumbs-down"></i>';
            dislikeButton.title = translations[currentLanguage].dislikeFeedback;
            dislikeButton.addEventListener('click', () => handleFeedback(messageBubble, 'dislike', text));

            feedbackContainer.appendChild(likeButton);
            feedbackContainer.appendChild(dislikeButton);
            messageBubble.appendChild(feedbackContainer);
        }
    }
    chatMessages.appendChild(messageBubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    feather.replace();
}

// Simula o efeito de digitação para a mensagem da IA
function typeMessage(text, addFeedbackButtons = false) {
    loadingIndicator.style.display = 'flex';
    loadingIndicator.classList.add('show'); // Adiciona a classe 'show'
    userInput.disabled = true;
    sendButton.disabled = true;
    userInput.classList.add('disabled');
    sendButton.classList.add('disabled');
    historyList.classList.add('disabled'); // Desabilita o histórico de conversas

    // Desabilita os botões de controle (exceto mainSidebarToggleButton, themeToggleButton, tutorialButton)
    // themeToggleButton.disabled = true; // Mantido habilitado
    // themeToggleButton.classList.add('disabled'); // Mantido habilitado
    // tutorialButton.disabled = true; // Mantido habilitado
    // tutorialButton.classList.add('disabled'); // Mantido habilitado
    languageToggleButton.disabled = true; // Desabilita o botão de idioma
    languageToggleButton.classList.add('disabled'); // Adiciona a classe disabled
    homeButton.disabled = true;
    homeButton.classList.add('disabled');
    // mainSidebarToggleButton.disabled = true; // Removido para manter habilitado
    // mainSidebarToggleButton.classList.add('disabled'); // Removido para manter habilitado


    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble', 'ai-message');
    chatMessages.appendChild(messageBubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    let i = 0;
    const typingSpeed = 20;
    let currentRawText = '';

    function typeCharacter() {
        if (!isConversationActive) {
            clearTimeout(typingTimeoutId);
            typingTimeoutId = null;
            loadingIndicator.classList.remove('show'); // Remove a classe 'show'
            loadingIndicator.style.display = 'none';
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.classList.remove('disabled');
            sendButton.classList.remove('disabled');
            historyList.classList.remove('disabled'); // Habilita o histórico de conversas

            // Habilita os botões de controle (exceto mainSidebarToggleButton, themeToggleButton, tutorialButton)
            // themeToggleButton.disabled = false; // Mantido habilitado
            // themeToggleButton.classList.remove('disabled'); // Mantido habilitado
            // tutorialButton.disabled = false; // Mantido habilitado
            // tutorialButton.classList.remove('disabled'); // Mantido habilitado
            languageToggleButton.disabled = false; // Habilita o botão de idioma
            languageToggleButton.classList.remove('disabled'); // Remove a classe disabled
            homeButton.disabled = false;
            homeButton.classList.remove('disabled');
            // mainSidebarToggleButton.disabled = false; // Removido para manter habilitado
            // mainSidebarToggleButton.classList.remove('disabled'); // Removido para manter habilitado
            return;
        }

        if (i < text.length) {
            currentRawText += text.charAt(i);
            messageBubble.innerHTML = renderMarkdown(currentRawText);
            i++;
            chatMessages.scrollTop = chatMessages.scrollHeight;
            typingTimeoutId = setTimeout(typeCharacter, typingSpeed);
        } else {
            loadingIndicator.classList.remove('show'); // Remove a classe 'show'
            loadingIndicator.style.display = 'none';
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.classList.remove('disabled');
            sendButton.classList.remove('disabled');
            historyList.classList.remove('disabled'); // Habilita o histórico de conversas

            // Habilita os botões de controle (exceto mainSidebarToggleButton, themeToggleButton, tutorialButton)
            // themeToggleButton.disabled = false; // Mantido habilitado
            // themeToggleButton.classList.remove('disabled'); // Mantido habilitado
            // tutorialButton.disabled = false; // Mantido habilitado
            // tutorialButton.classList.remove('disabled'); // Mantido habilitado
            languageToggleButton.disabled = false; // Habilita o botão de idioma
            languageToggleButton.classList.remove('disabled'); // Remove a classe disabled
            homeButton.disabled = false;
            homeButton.classList.remove('disabled');
            // mainSidebarToggleButton.disabled = false; // Removido para manter habilitado
            // mainSidebarToggleButton.classList.remove('disabled'); // Removido para manter habilitado

            if (chatAndInputArea.classList.contains('show')) { // Use o ID correto
                 userInput.focus();
            }
            if (addFeedbackButtons) {
                const feedbackContainer = document.createElement('div');
                feedbackContainer.classList.add('feedback-buttons');

                const likeButton = document.createElement('button');
                likeButton.classList.add('feedback-button', 'like-button');
                likeButton.innerHTML = '<i data-feather="thumbs-up"></i>';
                likeButton.title = translations[currentLanguage].likeFeedback;
                likeButton.addEventListener('click', () => handleFeedback(messageBubble, 'like', text));

                const dislikeButton = document.createElement('button');
                dislikeButton.classList.add('feedback-button', 'dislike-button');
                dislikeButton.innerHTML = '<i data-feather="thumbs-down"></i>';
                dislikeButton.title = translations[currentLanguage].dislikeFeedback;
                dislikeButton.addEventListener('click', () => handleFeedback(messageBubble, 'dislike', text));

                feedbackContainer.appendChild(likeButton);
                feedbackContainer.appendChild(dislikeButton);
                messageBubble.appendChild(feedbackContainer);
                feather.replace();
            }
            typingTimeoutId = null;
        }
    }
    typeCharacter();
}

// Lida com o feedback do usuário
async function handleFeedback(messageBubble, feedbackType, originalAiText) {
    const feedbackButtons = messageBubble.querySelectorAll('.feedback-button');
    feedbackButtons.forEach(button => {
        button.disabled = true;
        button.classList.add('disabled');
    });

    if (feedbackType === 'like') {
        messageBubble.querySelector('.like-button').classList.add('liked');
        appendMessageToUI('ai', translations[currentLanguage].likeFeedback);
    } else if (feedbackType === 'dislike') {
        messageBubble.querySelector('.dislike-button').classList.add('disliked');
        appendMessageToUI('ai', translations[currentLanguage].dislikeFeedback);

        chatHistory.pop();

        chatHistory.push({
            role: "user",
            parts: [{ text: translations[currentLanguage].dislikePrompt }]
        });

        await sendMessage(true);
    }
}

/**
 * Salva a conversa atual no Firestore.
 * @param {string} title O título da conversa.
 */
async function saveConversation(title) {
    if (!db || !userId || !isAuthReady || chatHistory.length <= 1) { // Não salva se não houver mensagens além da inicial da IA
        console.warn("Firebase ou userId não prontos para salvar conversa, ou histórico muito curto.");
        return;
    }

    try {
        const conversationsCol = collection(db, `artifacts/${appId}/users/${userId}/conversations`);
        await addDoc(conversationsCol, {
            title: title,
            messages: JSON.stringify(chatHistory), // Armazena o histórico como JSON string
            timestamp: Date.now()
        });
        console.log("Conversa salva com sucesso!");
        loadConversationHistory(); // Recarrega o histórico na sidebar
    } catch (error) {
        console.error("Erro ao salvar conversa:", error);
    }
}

/**
 * Carrega uma conversa do Firestore e a exibe no chat.
 * @param {string} conversationId O ID do documento da conversa.
 */
async function loadConversation(conversationId) {
    // Adiciona a verificação para impedir a troca de conversa enquanto a IA estiver digitando
    if (!isConversationActive) {
        console.log("IA está digitando. Não é possível trocar de conversa agora.");
        return;
    }

    if (!db || !userId || !isAuthReady) {
        console.error("Firebase não inicializado ou userId não disponível.");
        return;
    }

    // Esconde a tela inicial e mostra a área de chat
    showChatArea(); // Usa a função para garantir que os inputs sejam habilitados

    isConversationActive = false; // Pausa a digitação atual, se houver
    if (typingTimeoutId) {
        clearTimeout(typingTimeoutId);
        typingTimeoutId = null;
    }

    chatMessages.innerHTML = '';
    currentClientName = null;
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

    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/conversations`, conversationId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            chatHistory = JSON.parse(data.messages); // Carrega o histórico de volta do JSON
            currentConversationId = conversationId; // Define a conversa atual

            // Renderiza as mensagens na UI
            chatHistory.forEach((msg, index) => {
                // A última mensagem do assistente deve ter botões de feedback
                const addFeedback = (msg.role === 'assistant' && index === chatHistory.length - 1);
                appendMessageToUI(msg.role, msg.parts[0].text, addFeedback);
            });

            // Atualiza o item ativo na sidebar
            document.querySelectorAll('.history-item').forEach(item => {
                item.classList.remove('active');
            });
            document.getElementById(`history-item-${conversationId}`).classList.add('active');
            homeButton.classList.remove('active'); // Desativa o botão de Início

        } else {
            console.log("Nenhuma conversa encontrada com o ID:", conversationId);
            // Se a conversa não for encontrada, inicia uma nova
            startNewConversation();
        }
    } catch (error) {
        console.error("Erro ao carregar conversa:", error);
        startNewConversation(); // Em caso de erro, inicia uma nova conversa
    } finally {
        userInput.disabled = false;
        sendButton.disabled = false;
        userInput.classList.remove('disabled');
        sendButton.classList.remove('disabled');
        userInput.focus();
        isConversationActive = true;
    }
}

/**
 * Inicia uma nova conversa, salvando a anterior se houver.
 */
async function startNewConversation() {
    // Salva a conversa anterior se houver um histórico e não for uma conversa recém-carregada
    if (chatHistory.length > 1 && currentConversationId !== null) { // Garante que há mais de uma mensagem além da de boas-vindas
        // Gera um título para a conversa anterior com base na primeira mensagem do usuário
        const title = await generateConversationTitle(initialUserMessage || chatHistory[1]?.parts[0]?.text || "Conversa sem Título");
        await saveConversation(title);
    }

    // Esconde a tela inicial e mostra a área de chat
    showChatArea(); // Usa a função para garantir que os inputs sejam habilitados

    isConversationActive = false;
    if (typingTimeoutId) {
        clearTimeout(typingTimeoutId);
        typingTimeoutId = null;
    }

    chatMessages.innerHTML = '';
    currentClientName = null;
    currentConversationId = null; // Zera o ID da conversa atual
    initialUserMessage = null; // Zera a primeira mensagem do usuário

    // Inicia um novo histórico com a mensagem de boas-vindas
    chatHistory = [
        { role: "assistant", parts: [{ text: translations[currentLanguage].welcomeMessage }] }
    ];
    appendMessageToUI('ai', translations[currentLanguage].welcomeMessage, false);
    userInput.value = '';
    userInput.style.height = 'auto';
    userInput.focus();
    errorMessage.classList.add('hidden');
    errorMessage.classList.remove('show');
    loadingIndicator.classList.remove('show');
    loadingIndicator.style.display = 'none';

    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.classList.remove('disabled');
    sendButton.classList.remove('disabled');

    isConversationActive = true;

    // Atualiza o item ativo na sidebar para "Início"
    document.querySelectorAll('.history-item').forEach(item => {
        item.classList.remove('active');
    });
    homeButton.classList.add('active'); // Ativa o botão de Início
}


// Reinicia a conversa (agora chama startNewConversation) - FUNÇÃO REMOVIDA, POIS O BOTÃO FOI REMOVIDO
// function restartConversation() {
//     showConfirmationModal(); // Mantém o modal de confirmação
// }

// Alterna entre tema claro e escuro
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);

    if (currentTheme === 'dark') {
        themeIcon.innerHTML = '<i data-feather="moon"></i>';
    } else {
        themeIcon.innerHTML = '<i data-feather="sun"></i>';
    }
    feather.replace();
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

// Mostra o modal de confirmação de reiniciar conversa (ainda existe, mas não é mais acionado pelo botão)
function showConfirmationModal() {
    confirmationModalOverlay.classList.add('show');
}

// Esconde o modal de confirmação de reiniciar conversa
function hideConfirmationModal() {
    confirmationModalOverlay.classList.remove('show');
}

// REMOVIDA: Função showLanguageConfirmationModal()
// REMOVIDA: Função hideLanguageConfirmationModal()

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
                temperature: 0.3, // Baixa temperatura para respostas mais diretas
                maxOutputTokens: 20 // Limita o tamanho da resposta
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
            // Remove aspas ou outros caracteres indesejados que o modelo possa adicionar
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

    // Defensive check: ensure the current language exists in translations
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

    // Verifica se o Firebase e o userId estão prontos antes de continuar
    if (!db || !userId || !isAuthReady) {
        console.error("Firebase não inicializado ou usuário não autenticado. Não é possível enviar mensagem.");
        errorMessage.textContent = `${translations[currentLanguage].errorMessage}: Firebase não está pronto.`;
        errorMessage.classList.remove('hidden');
        errorMessage.classList.add('show');
        setTimeout(() => {
            errorMessage.classList.add('hidden');
            errorMessage.classList.remove('show');
        }, 7000);
        return; // Sai da função se o Firebase não estiver pronto
    }


    // Se for a primeira mensagem do usuário em uma nova conversa, armazena-a
    if (!isRegeneration && chatHistory.length === 1 && chatHistory[0].role === "assistant" && chatHistory[0].parts[0].text === translations[currentLanguage].welcomeMessage) {
        initialUserMessage = prompt;
    }

    if (!currentClientName && !isRegeneration) {
        const clientNameMatch = prompt.match(/(?:cliente|para|para o|o cliente|nome do cliente|customer|for|for the|the customer|client|para el|para la|el cliente|la cliente)\s+([a-zA-ZÀ-ÿ\s]+)/i);
        if (clientNameMatch && clientNameMatch[1]) {
            currentClientName = clientNameMatch[1].trim();
            chatHistory.push({
                role: "user",
                parts: [{ text: `O nome do cliente que você está ajudando é ${currentClientName}. Por favor, use este nome ao se referir ao cliente em suas respostas, mas sempre se dirija a mim (o colaborador).` }]
            });
            chatHistory.push({ role: "user", parts: [{ text: prompt }] });
            appendMessageToUI('user', prompt);
        } else {
            appendMessageToUI('user', prompt);
            chatHistory.push({ role: "user", parts: [{ text: prompt }] });
        }
    } else if (!isRegeneration) {
        appendMessageToUI('user', prompt);
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });
    }

    userInput.value = '';
    userInput.style.height = 'auto';
    errorMessage.classList.add('hidden');
    errorMessage.classList.remove('show');

    userInput.disabled = true;
    sendButton.disabled = true;
    userInput.classList.add('disabled');
    sendButton.classList.add('disabled');
    loadingIndicator.style.display = 'flex';
    loadingIndicator.classList.add('show'); // Adiciona a classe 'show'

    try {
        const apiKey = "AIzaSyDsJZuixotkHJPxpLmdnMeLnKxdOC7ykLQ";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const contentsToSend = [
            // Inclui as instruções de sistema no idioma atual, com a diretriz de resposta no idioma da aplicação
            { role: "user", parts: [{ text: translations[currentLanguage].systemInstructions }] },
            ...chatHistory
        ];

        // DEBUGGING: Log system instructions being sent
        console.log("Sending system instructions for language:", currentLanguage);
        console.log("System Instructions being sent:", translations[currentLanguage].systemInstructions);


        const payload = {
            contents: contentsToSend,
            generationConfig: {}
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

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
            console.log("Resposta da API recebida após o reset da conversa. Descartando.");
            return;
        }

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            let aiResponseText = result.candidates[0].content.parts[0].text;

            if (currentClientName) {
                aiResponseText = aiResponseText.replace(/\b(cliente|o usuário|o cliente|customer|the user|the customer|client|para el|para la|el cliente|la cliente)\b/gi, currentClientName);
                aiResponseText = aiResponseText.replace(/\[Nome do Cliente\]/gi, currentClientName);
            }

            typeMessage(aiResponseText, true);
            chatHistory.push({ role: "assistant", parts: [{ text: aiResponseText }] });

            // Se for uma nova conversa, salva o primeiro estado
            if (currentConversationId === null && chatHistory.length > 2) { // Pelo menos 1 user + 1 AI + welcome
                const title = await generateConversationTitle(initialUserMessage || prompt);
                const conversationsCol = collection(db, `artifacts/${appId}/users/${userId}/conversations`);
                const newDocRef = await addDoc(conversationsCol, {
                    title: title,
                    messages: JSON.stringify(chatHistory),
                    timestamp: Date.now()
                });
                currentConversationId = newDocRef.id;
                // Não ativamos o item recém-criado automaticamente.
                loadConversationHistory(); // Atualiza a sidebar para mostrar o novo item
            } else if (currentConversationId !== null) {
                // Atualiza a conversa existente no Firestore
                const docRef = doc(db, `artifacts/${appId}/users/${userId}/conversations`, currentConversationId);
                await setDoc(docRef, {
                    messages: JSON.stringify(chatHistory),
                    // REMOVIDO: timestamp: Date.now() - Não atualiza o timestamp para manter a ordem fixa
                }, { merge: true });
                // Não é necessário recarregar o histórico aqui, pois a ordem não mudou
                // loadConversationHistory(); // Comentado para evitar reordenamento
            }

        } else {
            console.error('Estrutura de resposta inesperada da API Gemini:', result);
            typeMessage(translations[currentLanguage].errorMessage, false);
        }

    } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        errorMessage.textContent = `${translations[currentLanguage].errorMessage}: ${error.message || ""}`;
        errorMessage.classList.remove('hidden');
        errorMessage.classList.add('show');
        if (loadingIndicator.style.display === 'flex') {
            loadingIndicator.classList.remove('show'); // Remove a classe 'show' em caso de erro
            loadingIndicator.style.display = 'none';
        }
        setTimeout(() => {
            errorMessage.classList.add('hidden');
            errorMessage.classList.remove('show');
        }, 7000);
    } finally {
        loadingIndicator.classList.remove('show'); // Remove a classe 'show' no final
        loadingIndicator.style.display = 'none';
    }
}

/**
 * Exclui uma conversa do Firestore.
 * @param {string} conversationId O ID do documento da conversa a ser excluída.
 */
async function deleteConversation(conversationId) {
    // Substituído window.confirm por um modal customizado
    showCustomConfirm(
        translations[currentLanguage].deleteConfirm,
        async () => {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/conversations`, conversationId));
                console.log(`Conversa ${conversationId} excluída.`);
                // Se a conversa excluída for a atual, inicia uma nova conversa
                if (currentConversationId === conversationId) {
                    // Agora, ao invés de iniciar uma nova conversa diretamente, volta para a tela inicial
                    showInitialScreen();
                    currentConversationId = null; // Garante que não há conversa ativa
                    chatHistory = []; // Limpa o histórico do chat
                }
                loadConversationHistory(); // Recarrega o histórico na sidebar
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
        translations[currentLanguage].deleteConfirmYes, // Texto para o botão "Sim"
        translations[currentLanguage].deleteConfirmNo // Texto para o botão "Não"
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

    // Limpa listeners anteriores para evitar múltiplos disparos
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
        console.log(`Título da conversa ${conversationId} atualizado para: ${newTitle}`);
        // Não recarrega loadConversationHistory aqui para evitar reordenamento
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
 * Carrega o histórico de conversas do Firestore e renderiza na sidebar.
 */
async function loadConversationHistory() {
    if (!db || !userId || !isAuthReady) {
        console.log("Firestore ou userId não prontos para carregar histórico.");
        return;
    }

    try {
        // Altera a ordem para ascendente (mais antiga primeiro)
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/conversations`), orderBy("timestamp", "asc"), limit(10)); // Limita a 10 conversas
        const querySnapshot = await getDocs(q);

        historyList.innerHTML = ''; // Limpa a lista atual

        // Adiciona as conversas do Firestore
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const li = document.createElement('li');
            li.classList.add('history-item');
            li.id = `history-item-${doc.id}`;

            // Contêiner para o título e botões de ação
            const titleAndActions = document.createElement('div');
            titleAndActions.classList.add('title-and-actions');
            li.appendChild(titleAndActions);

            // Cria um span para o título da conversa
            const titleSpan = document.createElement('span');
            titleSpan.textContent = data.title;
            titleSpan.classList.add('conversation-title'); // Adiciona uma classe para estilização
            titleSpan.contentEditable = false; // Não editável por padrão
            titleSpan.spellcheck = false; // Desativa correção ortográfica
            titleAndActions.appendChild(titleSpan);

            // Contêiner para os botões de ação (editar e excluir)
            const actionButtons = document.createElement('div');
            actionButtons.classList.add('action-buttons');
            actionButtons.style.display = 'none'; // Esconde os botões por padrão
            titleAndActions.appendChild(actionButtons);

            // Adiciona o botão de editar
            const editButton = document.createElement('button');
            editButton.classList.add('edit-conversation-button');
            editButton.innerHTML = '<i data-feather="edit-2"></i>'; // Ícone de lápis
            editButton.title = translations[currentLanguage].editTitle; // Tooltip
            actionButtons.appendChild(editButton);

            // Adiciona o botão de excluir
            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-conversation-button');
            deleteButton.innerHTML = '<i data-feather="x"></i>'; // Ícone de "X"
            deleteButton.title = translations[currentLanguage].deleteConfirm; // Adiciona tooltip
            actionButtons.appendChild(deleteButton);

            historyList.appendChild(li);

            // Mostra os botões de ação ao passar o mouse sobre o item da lista
            li.addEventListener('mouseenter', () => {
                actionButtons.style.display = 'flex';
            });

            // Esconde os botões de ação ao tirar o mouse do item da lista
            li.addEventListener('mouseleave', () => {
                // Só esconde se não estiver no modo de edição
                if (titleSpan.contentEditable !== 'true') {
                    actionButtons.style.display = 'none';
                }
            });

            // Marca a conversa atual como ativa SOMENTE se for a conversa atualmente carregada
            if (currentConversationId === doc.id) {
                li.classList.add('active');
            }

            // Event Listeners para os botões e título
            li.addEventListener('click', () => {
                // Se estiver no modo de edição, não carrega a conversa
                if (titleSpan.contentEditable === 'true') {
                    return;
                }
                loadConversation(doc.id);
            });

            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Impede que o clique se propague para o item da lista
                deleteConversation(doc.id);
            });

            editButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Impede que o clique se propague para o item da lista
                toggleEditMode(doc.id, titleSpan, editButton, deleteButton, actionButtons); // Passa actionButtons
            });
        });

        // Gerencia o estado ativo do botão "Início" e dos itens do histórico
        if (currentConversationId === null) {
            homeButton.classList.add('active'); // Ativa o botão de Início se não houver conversa ativa
        } else {
            homeButton.classList.remove('active'); // Desativa o botão de Início se uma conversa estiver ativa
        }

        // Atualiza o texto do botão de idioma
        currentLanguageText.textContent = currentLanguage.substring(0, 2).toUpperCase();
        feather.replace(); // Garante que os ícones Feather sejam renderizados
    } catch (error) {
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
 */
function toggleEditMode(conversationId, titleElement, editButton, deleteButton, actionButtonsContainer) {
    const isEditing = titleElement.contentEditable === 'true';

    // Se já estiver editando, salva e sai do modo de edição
    if (isEditing) {
        const newTitle = titleElement.textContent.trim();
        if (newTitle === "") {
            // Se o título estiver vazio, reverte para o título anterior (se houver) ou um padrão
            titleElement.textContent = titleElement.dataset.originalTitle || "Conversa sem Título";
        } else {
            updateConversationTitleInFirestore(conversationId, newTitle);
        }
        titleElement.contentEditable = false;
        titleElement.classList.remove('editing');
        editButton.innerHTML = '<i data-feather="edit-2"></i>';
        editButton.title = translations[currentLanguage].editTitle;
        deleteButton.style.display = 'flex'; // Mostra o botão de excluir
        actionButtonsContainer.style.display = 'flex'; // Garante que os botões permaneçam visíveis após a edição
        feather.replace();
    } else { // Entra no modo de edição
        titleElement.contentEditable = true;
        titleElement.classList.add('editing');
        titleElement.dataset.originalTitle = titleElement.textContent; // Armazena o título original
        editButton.innerHTML = '<i data-feather="check"></i>'; // Ícone de salvar
        editButton.title = translations[currentLanguage].saveTitle; // Tooltip
        deleteButton.style.display = 'none'; // Esconde o botão de excluir durante a edição
        actionButtonsContainer.style.display = 'flex'; // Mantém os botões visíveis durante a edição
        titleElement.focus();
        // Seleciona todo o texto para facilitar a edição
        const range = document.createRange();
        range.selectNodeContents(titleElement);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        feather.replace();

        // Adiciona listener para Enter e Escape
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Impede nova linha
                toggleEditMode(conversationId, titleElement, editButton, deleteButton, actionButtonsContainer); // Salva
                titleElement.removeEventListener('keydown', handleKeyDown);
            } else if (e.key === 'Escape') {
                e.preventDefault(); // Impede comportamento padrão
                titleElement.textContent = titleElement.dataset.originalTitle; // Reverte
                toggleEditMode(conversationId, titleElement, editButton, deleteButton, actionButtonsContainer); // Sai do modo de edição
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
    // Certifica-se de que nenhum item do histórico está ativo
    document.querySelectorAll('.history-item').forEach(item => {
        item.classList.remove('active');
    });
    currentConversationId = null; // Zera o ID da conversa atual
    initialUserMessage = null; // Zera a primeira mensagem do usuário
    chatHistory = []; // Limpa o histórico do chat
    userInput.disabled = true; // Desabilita input na tela inicial
    sendButton.disabled = true;
    userInput.classList.add('disabled');
    sendButton.classList.add('disabled');

    // Marca o botão "Início" como ativo no cabeçalho
    homeButton.classList.add('active');
}

// Função para mostrar a área de chat e esconder a tela inicial
function showChatArea() {
    initialScreen.classList.add('hidden');
    chatAndInputArea.classList.remove('hidden');
    userInput.disabled = false; // Habilita input no chat
    sendButton.disabled = false;
    userInput.classList.remove('disabled');
    sendButton.classList.remove('disabled');
    userInput.focus();
    // Desativa o botão "Início" quando o chat está ativo
    homeButton.classList.remove('active');
}

// Listeners de Eventos

// Modal de boas-vindas
modalStartButton.addEventListener('click', () => {
    notificationModalOverlay.classList.remove('show');
    showInitialScreen(); // Agora mostra a tela inicial após o modal de boas-vindas
});

// Botão "Iniciar Nova Conversa" da tela inicial
startChatButton.addEventListener('click', () => {
    showChatArea(); // Mostra a área de chat
    startNewConversation(); // Inicia uma nova conversa
});

// Botão de enviar mensagem
sendButton.addEventListener('click', () => sendMessage(false));

// Botões do modal de confirmação de reiniciar (ainda existem, mas não são usados pelo botão)
confirmRestartYesButton.addEventListener('click', () => {
    hideConfirmationModal();
    startNewConversation(); // Chama a nova função para iniciar conversa
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
    setLanguage(nextLanguage); // Chama setLanguage diretamente sem confirmação
});


// REMOVIDOS: Botões do modal de confirmação de troca de idioma
// confirmLanguageYesButton.addEventListener('click', () => {
//     hideLanguageConfirmationModal();
//     if (pendingLanguage) {
//         setLanguage(pendingLanguage, true); // Confirma a troca de idioma, pulando a confirmação
//         pendingLanguage = null; // Limpa o idioma pendente
//         // Sempre volta para a tela inicial após a troca de idioma
//         showInitialScreen();
//     }
// });

// confirmLanguageNoButton.addEventListener('click', () => {
//     hideLanguageConfirmationModal();
//     // Atualiza o texto do botão para o idioma atual, caso o usuário cancele
//     currentLanguageText.textContent = currentLanguage.substring(0, 2).toUpperCase();
//     pendingLanguage = null; // Limpa o idioma pendente
// });

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

// Toggle da sidebar (agora usando o novo botão no header principal)
mainSidebarToggleButton.addEventListener('click', () => {
    isSidebarVisible = !isSidebarVisible; // Inverte o estado
    conversationHistorySidebar.classList.toggle('hidden', !isSidebarVisible); // Adiciona/remove a classe 'hidden'

    // Altere o ícone do botão para indicar a ação de abrir/fechar
    mainSidebarToggleButton.innerHTML = isSidebarVisible ? '<i data-feather="chevron-left"></i>' : '<i data-feather="chevron-right"></i>';
    feather.replace(); // Atualiza os ícones
});

// Novo: Listener para o botão de Início no cabeçalho
homeButton.addEventListener('click', showInitialScreen);

// Ao carregar a página
window.addEventListener('load', async () => {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
    notificationModalOverlay.classList.add('show');

    const storedLanguage = localStorage.getItem('preferredLanguage') || 'pt-BR';
    setLanguage(storedLanguage); // Carrega o idioma sem o segundo parâmetro (skipConfirmation)

    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        themeIcon.innerHTML = '<i data-feather="moon"></i>';
    } else {
        themeIcon.innerHTML = '<i data-feather="sun"></i>';
    }
    feather.replace();

    loadingIndicator.style.display = 'none';

    // Desabilita o input e o botão de enviar por padrão até o Firebase estar pronto
    userInput.disabled = true;
    sendButton.disabled = true;
    userInput.classList.add('disabled');
    sendButton.classList.add('disabled');


    // Inicializa Firebase e autentica
    try {
        // Verifica se firebaseConfig.projectId está definido (agora com fallback)
        if (!firebaseConfig.projectId || firebaseConfig.projectId === "YOUR_PROJECT_ID_PLACEHOLDER") {
            const errorMsg = "Erro de configuração do Firebase: 'projectId' não fornecido ou é um placeholder. O histórico de conversas não estará disponível. Por favor, verifique a configuração do ambiente.";
            console.error(errorMsg);
            errorMessage.textContent = errorMsg;
            errorMessage.classList.remove('hidden');
            errorMessage.classList.add('show');
            // Não retorna, permite que o app continue, mas sem Firebase
        }

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                userIdText.textContent = userId;
                isAuthReady = true;
                console.log("Usuário autenticado:", userId);
                // Carrega o histórico apenas se o Firebase estiver configurado corretamente
                if (firebaseConfig.projectId && firebaseConfig.projectId !== "YOUR_PROJECT_ID_PLACEHOLDER") {
                    await loadConversationHistory();
                }
                // Habilita o input e o botão de enviar após a autenticação
                userInput.disabled = false;
                sendButton.disabled = false;
                userInput.classList.remove('disabled');
                sendButton.classList.remove('disabled');
                userInput.focus(); // Foca no input após estar pronto

            } else {
                console.log("Nenhum usuário logado. Tentando autenticação anônima...");
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (anonError) {
                    console.error("Erro na autenticação anônima:", anonError);
                    userIdText.textContent = "Erro de Autenticação";
                    // Em caso de erro de autenticação, o input e o botão permanecem desabilitados
                }
            }
        });
    } catch (firebaseInitError) {
        console.error("Erro ao inicializar Firebase:", firebaseInitError);
        errorMessage.textContent = `${translations[currentLanguage].errorMessage}: ${firebaseInitError.message}`;
        errorMessage.classList.remove('hidden');
        errorMessage.classList.add('show');
        // Em caso de erro de inicialização, o input e o botão permanecem desabilitados
    }
});
