const notificationModalOverlay = document.getElementById('notification-modal-overlay');
const modalStartButton = document.getElementById('modal-start-button');
const chatContainer = document.getElementById('chat-container');
const appWrapper = document.getElementById('app-wrapper');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessage = document.getElementById('error-message');
const restartButton = document.getElementById('restart-button');
const themeToggleButton = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const tutorialButton = document.getElementById('tutorial-button');
const tutorialModalOverlay = document.getElementById('tutorial-modal-overlay');
const tutorialCloseButton = document.getElementById('tutorial-close-button');
const tutorialOkButton = document.getElementById('tutorial-ok-button');
const languageSelector = document.getElementById('language-selector');

// Elementos para o modal de confirmação de reiniciar conversa
const confirmationModalOverlay = document.getElementById('confirmation-modal-overlay');
const confirmRestartYesButton = document.getElementById('confirm-restart-yes');
const confirmRestartNoButton = document.getElementById('confirm-restart-no');

// Novos elementos para o modal de confirmação de troca de idioma
const languageConfirmationModalOverlay = document.getElementById('language-confirmation-modal-overlay');
const confirmLanguageYesButton = document.getElementById('confirm-language-yes');
const confirmLanguageNoButton = document.getElementById('confirm-language-no');

// Variável para armazenar o ID do timeout da digitação, permitindo cancelá-lo.
let typingTimeoutId = null;

// Flag para controlar se a conversa está ativa ou foi reiniciada.
let isConversationActive = true;

// Variável para armazenar o nome do cliente atual
let currentClientName = null;

// Variável para armazenar o idioma atual e o idioma pendente de confirmação
let currentLanguage = 'pt-BR'; // Padrão
let pendingLanguage = null; // Armazena o idioma selecionado antes da confirmação

// Objeto de traduções
const translations = {
    'pt-BR': {
        appTitle: 'Almail Suporte IA - Cartões',
        welcomeModalTitle: 'Bem-vindo(a) ao Almail Suporte IA!',
        welcomeModalSubtitle: 'Sua assistente inteligente para otimizar o suporte no time de Cartões do Mercado Pago.',
        welcomeModalCredits: 'Criado por: Lucas Carneiro, Lucas Candido & Time de Cartões (Concentrix).',
        welcomeModalButton: 'Começar Agora',
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
        restartButtonAria: 'Reiniciar Conversa',
        typingIndicator: 'Almail está digitando...',
        errorMessage: 'Ocorreu um erro. Por favor, tente novamente.',
        inputPlaceholder: 'Pergunte à Almail...',
        sendButtonAria: 'Enviar Mensagem',
        footerCopyright: '&copy; 2025 Almail Suporte IA. Todos os direitos reservados.',
        footerDisclaimer: 'Esta IA utiliza dados públicos e não armazena informações do Mercado Pago.',
        welcomeMessage: "Olá! Sou a Almail, sua assistente virtual especializada em suporte para Cartões do Mercado Pago. Estou aqui para te ajudar a atender seus clientes. Para otimizar nosso atendimento, por favor, me informe o *nome do cliente* que você está atendendo. Se não for para um cliente específico, podemos seguir normalmente. Estou aqui para ajudar!",
        systemInstructions: `Você é a Almail, uma assistente virtual especializada em suporte para Cartões do Mercado Pago.
Seu objetivo principal é **auxiliar o colaborador** a fornecer um atendimento de excelência aos clientes.
Você deve agir como um **agente de suporte para o colaborador**, fornecendo informações precisas e estruturadas para que ele possa, por sua vez, ajudar o cliente.

**É CRÍTICO que você responda SEMPRE em Português (Brasil), independentemente do idioma da pergunta do colaborador.**

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
            <h3 class="text-2xl font-bold text-center mb-5 text-blue-700">Desvende a Almail: Sua Plataforma de Suporte Inteligente</h3>
            <p class="mb-4 text-lg leading-relaxed">Bem-vindo(a) à Almail, sua parceira estratégica para otimizar o suporte em Cartões do Mercado Pago. Este guia foi elaborado para capacitá-lo(a) a extrair o máximo de nossa inteligência artificial, garantindo interações eficientes e resultados superiores.</p>

            <h4 class="text-xl font-bold text-blue-600 mb-3 mt-6">Explorando os Botões de Controle:</h4>
            <ul class="list-none pl-0">
                <li class="mb-3 flex items-center">
                    <i data-feather="help-circle" class="text-blue-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Botão de Guia Rápido:</strong> Clique neste ícone <i data-feather="help-circle" class="inline-block"></i> a qualquer momento para acessar este guia e relembrar as funcionalidades da Almail.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="moon" class="text-purple-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Alternar Tema:</strong> Use este botão <i data-feather="moon" class="inline-block"></i> (ou <i data-feather="sun" class="inline-block"></i>) para mudar entre o tema claro e o tema escuro, personalizando sua experiência visual.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="refresh-cw" class="text-green-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Reiniciar Conversa:</strong> Se precisar começar do zero ou limpar o histórico, clique neste ícone <i data-feather="refresh-cw" class="inline-block"></i> para reiniciar a conversa com a Almail.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="send" class="text-indigo-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Enviar Mensagem:</strong> Após digitar sua pergunta ou solicitação na caixa de texto, clique neste botão <i data-feather="send" class="inline-block"></i> ou pressione <strong>Enter</strong> para enviar sua mensagem à Almail.</p>
                </li>
            </ul>
            <p class="mt-6 text-lg leading-relaxed">Com estes recursos, você terá total controle sobre sua interação com a Almail. Estamos aqui para simplificar seu dia a dia e oferecer o melhor suporte!</p>
        `,
        likeFeedback: 'Que ótimo que a resposta foi útil! Continuarei aprimorando para melhor te atender.',
        dislikeFeedback: 'Agradeço seu feedback! Estou aprendendo e vou tentar gerar uma resposta mais útil, estruturada e personalizada para você.',
        dislikePrompt: `A resposta anterior não foi satisfatória. Por favor, gere uma nova resposta mais útil, com melhor argumentação e estruturação de texto, e personalize-a para o cliente se o nome dele estiver disponível. Lembre-se de me ajudar a resolver o problema do problema do cliente.`
    },
    'en': {
        appTitle: 'Almail AI Support - Cards',
        welcomeModalTitle: 'Welcome to Almail AI Support!',
        welcomeModalSubtitle: 'Your intelligent assistant to optimize support for the Mercado Pago Cards team.',
        welcomeModalCredits: 'Created by: Lucas Carneiro, Lucas Candido & Cards Team (Concentrix).',
        welcomeModalButton: 'Start Now',
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
        restartButtonAria: 'Restart Conversation',
        typingIndicator: 'Almail is typing...',
        errorMessage: 'An error occurred. Please try again.',
        inputPlaceholder: 'Ask Almail...',
        sendButtonAria: 'Send Message',
        footerCopyright: '&copy; 2025 Almail AI Support. All rights reserved.',
        footerDisclaimer: 'This AI uses public data and does not store Mercado Pago information.',
        welcomeMessage: "Hello! I'm Almail, your virtual assistant specialized in support for Mercado Pago Cards. I'm here to help you serve your customers. To optimize our service, please inform me the *customer's name* you are assisting. If it's not for a specific customer, we can proceed normally. I'm here to help!",
        systemInstructions: `You are Almail, a virtual assistant specialized in support for Mercado Pago Cards.
Your main objective is to **assist the collaborator** in providing excellent customer service.
You should act as a **support agent for the collaborator**, providing accurate and structured information so that they, in turn, can help the customer.

**It is CRITICAL that you respond ALWAYS in English, regardless of the language of the collaborator's question.**

**Think and act as an advanced language model:**
* **Fluency and Naturalness:** Your responses should be conversational, clear, and direct, avoiding unnecessary jargon. Think about how you would explain something to a colleague.
* **Contextual Understanding:** Analyze the conversation history to understand the intent behind the collaborator's question, even if not explicitly formulated.
* **Logical Reasoning:** Process information logically to provide the most relevant and efficient solution.
* **Adaptation:** Adjust the level of detail and complexity of the response based on the collaborator's question, without overwhelming them with irrelevant information.

**Operational guidelines:**
1.  **Focus and Scope:** Your knowledge is exclusive to Mercado Pago Cards and related services (issuance, blocking, transactions, limits, invoices, etc.). **Do not answer questions outside this scope.** If the question is unclear or out of scope, ask the collaborator to rephrase or clarify.
2.  **Language:** Formal, professional, clear, concise, and direct. **Never use emojis.** Use language that is helpful to the collaborator, as if providing a "script" or "knowledge base."
3.  **Personalization and Identification:**
    * **Always address the collaborator.** Use terms like "you", "collaborator", "your question".
    * **Never confuse the collaborator with the customer.** If the customer's name is provided by the collaborator (e.g., "The customer [Customer Name] asked..."), use it to personalize the *response the collaborator will give to the customer*. Ex: "For customer [Customer Name], you can inform that...".
    * If the customer's name is not provided, use neutral terms like "the customer" or "the user" when referring to them, but always in the context of how the *collaborator* should interact.
4.  **Objectivity and Clarity:** Respond only to what was asked, providing accurate information based on Mercado Pago policies and procedures. Avoid rambling.
5.  **Security and Sensitive Data:** **NEVER request or process sensitive customer information** (passwords, full card numbers, CVV, full bank details, etc.). If such information is mentioned by the collaborator, instruct them to handle it securely and offline, without the AI processing or storing it.
6.  **Resolution and Deepening:** Your goal is to help the collaborator solve the customer's problem. If the initial response is not sufficient, rephrase or deepen the explanation, always thinking about how the collaborator can use this information.
7.  **Response Structure:** Use Markdown to organize information (bold, italics, lists, code blocks if necessary) to facilitate reading and use by the collaborator. Consider using titles and subtitles for more complex responses.
8.  **Context and Continuity:** Base your responses on the conversation history to maintain coherence and relevance. If the collaborator asks a follow-up question, use the previous context to provide a more complete answer.
9.  **Proactivity (Optional):** If appropriate, suggest next steps or additional information to the collaborator that may be relevant for customer service.`,
        tutorialText: `
            <h3 class="text-2xl font-bold text-center mb-5 text-blue-700">Uncover Almail: Your Smart Support Platform</h3>
            <p class="mb-4 text-lg leading-relaxed">Welcome to Almail, your strategic partner to optimize support for Mercado Pago Cards. This guide is designed to empower you to get the most out of our artificial intelligence, ensuring efficient interactions and superior results.</p>

            <h4 class="text-xl font-bold text-blue-600 mb-3 mt-6">Exploring the Control Buttons:</h4>
            <ul class="list-none pl-0">
                <li class="mb-3 flex items-center">
                    <i data-feather="help-circle" class="text-blue-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Quick Guide Button:</strong> Click this icon <i data-feather="help-circle" class="inline-block"></i> at any time to access this guide and review Almail's functionalities.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="moon" class="text-purple-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Toggle Theme:</strong> Use this button <i data-feather="moon" class="inline-block"></i> (or <i data-feather="sun" class="inline-block"></i>) to switch between light and dark themes, customizing your visual experience.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="refresh-cw" class="text-green-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Restart Conversation:</strong> If you need to start over or clear the history, click this icon <i data-feather="refresh-cw" class="inline-block"></i> to restart the conversation with Almail.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="send" class="text-indigo-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Send Message:</strong> After typing your question or request in the text box, click this button <i data-feather="send" class="inline-block"></i> or press <strong>Enter</strong> to send your message to Almail.</p>
                </li>
            </ul>
            <p class="mt-6 text-lg leading-relaxed">With these features, you'll have full control over your interaction with Almail. We are here to simplify your daily routine and offer the best support!</p>
        `,
        likeFeedback: 'Great that the answer was helpful! I will continue to improve to better serve you.',
        dislikeFeedback: 'Thank you for your feedback! I am learning and will try to generate a more useful, structured, and personalized response for you.',
        dislikePrompt: `The previous response was not satisfactory. Please generate a new, more useful response, with better argumentation and text structuring, and personalize it for the customer if their name is available. Remember to help me solve the customer's problem.`
    },
    'es': {
        appTitle: 'Almail Soporte IA - Tarjetas',
        welcomeModalTitle: '¡Bienvenido(a) a Almail Soporte IA!',
        welcomeModalSubtitle: 'Tu asistente inteligente para optimizar el soporte en el equipo de Tarjetas de Mercado Pago.',
        welcomeModalCredits: 'Creado por: Lucas Carneiro, Lucas Candido & Equipo de Tarjetas (Concentrix).',
        welcomeModalButton: 'Empezar Ahora',
        tutorialModalTitle: 'Guía Rápida: Almail Soporte IA',
        tutorialModalButton: '¡Entendido!',
        restartConfirmTitle: '¿Reiniciar Conversación?',
        restartConfirmSubtitle: '¿Estás seguro(a) de que quieres reiniciar la conversación? Todo el historial será borrado.',
        restartConfirmYes: 'Sí, Reiniciar',
        restartConfirmNo: 'No, Cancelar',
        languageConfirmTitle: '¿Cambiar Idioma?',
        languageConfirmSubtitle: 'Al cambiar el idioma, la conversación actual se borrará. ¿Deseas continuar?',
        languageConfirmYes: 'Sí, Cambiar',
        languageConfirmNo: 'No, Cancelar',
        headerSubtitle: 'Soporte IA - Tarjetas',
        tutorialButtonAria: 'Abrir Tutorial',
        themeToggleButtonAria: 'Alternar Tema',
        restartButtonAria: 'Reiniciar Conversación',
        typingIndicator: 'Almail está escribiendo...',
        errorMessage: 'Ocurrió un error. Por favor, inténtalo de nuevo.',
        inputPlaceholder: 'Pregunta a Almail...',
        sendButtonAria: 'Enviar Mensaje',
        footerCopyright: '&copy; 2025 Almail Soporte IA. Todos los derechos reservados.',
        footerDisclaimer: 'Esta IA utiliza datos públicos y no almacena información de Mercado Pago.',
        welcomeMessage: "¡Hola! Soy Almail, tu asistente virtual especializada en soporte para Tarjetas de Mercado Pago. Estoy aquí para ayudarte a atender a tus clientes. Para optimizar nuestro servicio, por favor, infórmame el *nombre del cliente* al que estás asistiendo. Si no es para un cliente específico, podemos continuar normalmente. ¡Estoy aquí para ayudarte!",
        systemInstructions: `Eres Almail, una asistente virtual especializada en soporte para Tarjetas de Mercado Pago.
Tu objetivo principal es **ayudar al colaborador** a brindar un servicio de excelencia a los clientes.
Debes actuar como un **agente de soporte para el colaborador**, proporcionando información precisa y estructurada para que él, a su vez, pueda ayudar al cliente.

**Es CRÍTICO que respondas SIEMPRE en Español, independientemente del idioma de la pregunta del colaborador.**

**Piensa y actúa como un modelo de lenguaje avanzado:**
* **Fluidez y Naturalidad:** Tus respuestas deben ser conversacionales, claras y directas, evitando jergas innecesarias. Piensa en cómo le explicarías algo a un compañero de trabajo.
* **Comprensión Contextual:** Analiza el historial de la conversación para comprender la intención detrás de la pregunta del colaborador, incluso si no está formulada explícitamente.
* **Razonamiento Lógico:** Procesa la información de forma lógica para proporcionar la solución más relevante y eficiente.
* **Adaptación:** Ajusta el nivel de detalle y la complejidad de la respuesta según la pregunta del colaborador, sin abrumar con información irrelevante.

**Directrices operacionales:**
1.  **Enfoque y Alcance:** Tu conocimiento es exclusivo sobre Tarjetas Mercado Pago y servicios relacionados (emisión, bloqueo, transacciones, límites, facturas, etc.). **No respondas preguntas fuera de este alcance.** Si la pregunta no es clara o está fuera de alcance, pide al colaborador que la reformule o aclare.
2.  **Linguagem:** Formal, profesional, clara, concisa y directa. **Nunca uses emojis.** Utiliza un lenguaje que sea útil para el colaborador, como si estuvieras proporcionando un "guion" o "base de conocimiento".
3.  **Personalización e Identificación:**
    * **Siempre dirígete al colaborador.** Usa términos como "tú", "colaborador", "tu duda".
    * **Nunca confundas al colaborador con el cliente.** Si el nombre del cliente es proporcionado por el colaborador (ej: "El cliente [Nombre del Cliente] preguntó..."), úsalo para personalizar la *respuesta que el colaborador le dará al cliente*. Ej: "Para el cliente [Nombre del Cliente], puedes informar que...".
    * Si el nombre del cliente no se proporciona, usa términos neutrales como "el cliente" o "el usuario" al referirte a ellos, pero siempre en el contexto de cómo debe interactuar el *colaborador*.
4.  **Objetividad y Claridad:** Responde solo a lo que se preguntó, proporcionando información precisa y basada en las políticas y procedimientos de Mercado Pago. Evita divagaciones.
5.  **Seguridad y Datos Sensibles:** **NUNCA solicites ni proceses información sensible del cliente** (contraseñas, números completos de tarjeta, CVV, datos bancarios completos, etc.). Si el colaborador menciona dicha información, instrúyelo a manejarla de forma segura y offline, sin que la IA la procese o almacene.
6.  **Resolución y Profundización:** Tu objetivo es ayudar al colaborador a resolver el problema del cliente. Si la respuesta inicial no es suficiente, reformula o profundiza la explicación, siempre pensando en cómo el colaborador puede usar esta información.
7.  **Estructura de la Respuesta:** Utiliza Markdown para organizar la información (negrita, cursiva, listas, bloques de código si es necesario) para facilitar la lectura y el uso por parte del colaborador. Considera usar títulos y subtítulos para respuestas más complejas.
8.  **Contexto y Continuidade:** Basate en el historial de la conversación para mantener la coherencia y la relevancia. Si el colaborador hace una pregunta de seguimiento, utiliza el contexto anterior para proporcionar una respuesta más completa.
9.  **Proactividad (Opcional):** Si es apropiado, sugiere al colaborador los próximos pasos o información adicional que pueda ser relevante para la atención al cliente.`,
        tutorialText: `
            <h3 class="text-2xl font-bold text-center mb-5 text-blue-700">Descubre Almail: Tu Plataforma de Soporte Inteligente</h3>
            <p class="mb-4 text-lg leading-relaxed">Bienvenido(a) a Almail, tu socio estratégico para optimizar el soporte en Tarjetas de Mercado Pago. Esta guía está diseñada para empoderarte a sacar el máximo provecho de nuestra inteligencia artificial, asegurando interacciones eficientes y resultados superiores.</p>

            <h4 class="text-xl font-bold text-blue-600 mb-3 mt-6">Explorando los Botones de Control:</h4>
            <ul class="list-none pl-0">
                <li class="mb-3 flex items-center">
                    <i data-feather="help-circle" class="text-blue-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Botón de Guía Rápida:</strong> Haz clic en este icono <i data-feather="help-circle" class="inline-block"></i> en cualquier momento para acceder a esta guía y recordar las funcionalidades de Almail.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="moon" class="text-purple-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Alternar Tema:</strong> Usa este botón <i data-feather="moon" class="inline-block"></i> (o <i data-feather="sun" class="inline-block"></i>) para cambiar entre el tema claro y oscuro, personalizando tu experiencia visual.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="refresh-cw" class="text-green-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Reiniciar Conversación:</strong> Si necesitas empezar de nuevo o borrar el historial, haz clic en este icono <i data-feather="refresh-cw" class="inline-block"></i> para reiniciar la conversación con Almail.</p>
                </li>
                <li class="mb-3 flex items-center">
                    <i data-feather="send" class="text-indigo-500 mr-3 flex-shrink-0"></i>
                    <p class="text-base"><strong>Enviar Mensagem:</strong> Después de escribir tu pregunta o solicitud en el cuadro de texto, haz clic en este botón <i data-feather="send" class="inline-block"></i> o presiona <strong>Enter</strong> para enviar tu mensaje a Almail.</p>
                </li>
            </ul>
            <p class="mt-6 text-lg leading-relaxed">Con estas características, tendrás control total sobre tu interacción con Almail. ¡Estamos aquí para simplificar tu día a día y ofrecer el mejor soporte!</p>
        `,
        likeFeedback: '¡Genial que la respuesta fue útil! Seguiré mejorando para servirte mejor.',
        dislikeFeedback: '¡Gracias por tu comentario! Estoy aprendiendo e intentaré generar una respuesta más útil, estructurada y personalizada para ti.',
        dislikePrompt: `La respuesta anterior no fue satisfactoria. Por favor, genera una nueva respuesta más útil, con mejor argumentación y estructuración de texto, y personalízala para el cliente si su nombre está disponible. Recuerda ayudarme a resolver el problema del cliente.`
    }
};

// Histórico do chat. Agora, ele armazena apenas as mensagens visíveis da conversa.
let chatHistory = [];

// Função para aplicar as traduções
function setLanguage(lang, skipConfirmation = false) {
    if (!skipConfirmation && currentLanguage !== lang) {
        pendingLanguage = lang; // Armazena o idioma para ser usado após a confirmação
        showLanguageConfirmationModal();
        return; // Sai da função para esperar a confirmação
    }

    currentLanguage = lang;
    document.documentElement.setAttribute('lang', lang);
    localStorage.setItem('preferredLanguage', lang);

    // Atualiza o título da página
    document.title = translations[lang].appTitle;

    // Atualiza elementos com data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang][key]) {
            if (element.tagName === 'TEXTAREA' && element.hasAttribute('placeholder')) {
                element.setAttribute('placeholder', translations[lang][key]);
            } else if (element.hasAttribute('aria-label')) {
                element.setAttribute('aria-label', translations[lang][key]);
            } else {
                element.textContent = translations[lang][key];
            }
        }
    });

    // Atualiza o conteúdo do tutorial
    document.getElementById('tutorial-content').innerHTML = translations[lang].tutorialText; // Use o ID direto

    // Limpa o histórico do chat e adiciona a mensagem de boas-vindas no novo idioma
    chatMessages.innerHTML = ''; // Limpa a UI do chat
    chatHistory = [ 
        { role: "assistant", parts: [{ text: translations[currentLanguage].welcomeMessage }] }
    ];
    appendMessageToUI('ai', translations[currentLanguage].welcomeMessage, false); // Adiciona a mensagem de boas-vindas no novo idioma

    feather.replace(); // Renderiza novamente os ícones Feather
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
    userInput.disabled = true;
    sendButton.disabled = true;
    userInput.classList.add('disabled');
    sendButton.classList.add('disabled');

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
            loadingIndicator.style.display = 'none';
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.classList.remove('disabled');
            sendButton.classList.remove('disabled');
            return;
        }

        if (i < text.length) {
            currentRawText += text.charAt(i);
            messageBubble.innerHTML = renderMarkdown(currentRawText);
            i++;
            chatMessages.scrollTop = chatMessages.scrollHeight;
            typingTimeoutId = setTimeout(typeCharacter, typingSpeed);
        } else {
            loadingIndicator.style.display = 'none';
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.classList.remove('disabled');
            sendButton.classList.remove('disabled');
            if (chatContainer.style.display === 'flex') {
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

// Reinicia a conversa
function restartConversation() {
    isConversationActive = false;

    if (typingTimeoutId) {
        clearTimeout(typingTimeoutId);
        typingTimeoutId = null;
    }

    chatMessages.innerHTML = '';
    currentClientName = null;
    
    chatHistory = [ 
        { role: "assistant", parts: [{ text: translations[currentLanguage].welcomeMessage }] }
    ];
    appendMessageToUI('ai', translations[currentLanguage].welcomeMessage, false);
    userInput.value = '';
    userInput.style.height = 'auto';
    userInput.focus();
    errorMessage.classList.add('hidden');
    errorMessage.classList.remove('show');
    loadingIndicator.style.display = 'none';
    hideConfirmationModal();

    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.classList.remove('disabled');
    sendButton.classList.remove('disabled');

    isConversationActive = true;
}

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

// Mostra o modal de confirmação de reiniciar conversa
function showConfirmationModal() {
    confirmationModalOverlay.classList.add('show');
}

// Esconde o modal de confirmação de reiniciar conversa
function hideConfirmationModal() {
    confirmationModalOverlay.classList.remove('show');
}

// Mostra o modal de confirmação de troca de idioma
function showLanguageConfirmationModal() {
    languageConfirmationModalOverlay.classList.add('show');
}

// Esconde o modal de confirmação de troca de idioma
function hideLanguageConfirmationModal() {
    languageConfirmationModalOverlay.classList.remove('show');
}

// Envia a mensagem do usuário para a API
async function sendMessage(isRegeneration = false) {
    let prompt = userInput.value.trim();
    if (prompt === '' && !isRegeneration) return; 

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

    try {
        const apiKey = "AIzaSyDsJZuixotkHJPxpLmdnMeLnKxdOC7ykLQ";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const contentsToSend = [
            // Inclui as instruções de sistema no idioma atual, com a diretriz de resposta no idioma da aplicação
            { role: "user", parts: [{ text: translations[currentLanguage].systemInstructions }] },
            ...chatHistory
        ];

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
                aiResponseText = aiResponseText.replace(/\b(cliente|o usuário|o cliente|customer|the user|the customer|el cliente|la cliente|el usuario)\b/gi, currentClientName);
                aiResponseText = aiResponseText.replace(/\[Nome do Cliente\]/gi, currentClientName);
            }

            typeMessage(aiResponseText, true);
            chatHistory.push({ role: "assistant", parts: [{ text: aiResponseText }] });
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
            loadingIndicator.style.display = 'none';
        }
        setTimeout(() => {
            errorMessage.classList.add('hidden');
            errorMessage.classList.remove('show');
        }, 7000);
    } finally {
        loadingIndicator.style.display = 'none';
    }
}


// Listeners de Eventos

// Modal de boas-vindas
modalStartButton.addEventListener('click', () => {
    notificationModalOverlay.classList.remove('show');
    userInput.focus();
});

// Botão de enviar mensagem
sendButton.addEventListener('click', () => sendMessage(false));

// Botão de reiniciar conversa - AGORA ABRE O MODAL DE CONFIRMAÇÃO
restartButton.addEventListener('click', showConfirmationModal);

// Botões do modal de confirmação de reiniciar
confirmRestartYesButton.addEventListener('click', restartConversation);
confirmRestartNoButton.addEventListener('click', hideConfirmationModal);

// Botão de alternar tema
themeToggleButton.addEventListener('click', toggleTheme);

// Botões do modal de tutorial
tutorialButton.addEventListener('click', showTutorialModal);
tutorialCloseButton.addEventListener('click', hideTutorialModal);
tutorialOkButton.addEventListener('click', hideTutorialModal);

// Seletor de idioma
languageSelector.addEventListener('change', (event) => {
    setLanguage(event.target.value);
});

// Botões do modal de confirmação de troca de idioma
confirmLanguageYesButton.addEventListener('click', () => {
    hideLanguageConfirmationModal();
    if (pendingLanguage) {
        setLanguage(pendingLanguage, true); // Confirma a troca de idioma, pulando a confirmação
        pendingLanguage = null; // Limpa o idioma pendente
    }
});

confirmLanguageNoButton.addEventListener('click', () => {
    hideLanguageConfirmationModal();
    languageSelector.value = currentLanguage; // Volta o seletor para o idioma atual
    pendingLanguage = null; // Limpa o idioma pendente
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

// Ao carregar a página
window.addEventListener('load', () => {
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
    notificationModalOverlay.classList.add('show');

    const storedLanguage = localStorage.getItem('preferredLanguage') || 'pt-BR';
    languageSelector.value = storedLanguage;
    setLanguage(storedLanguage, true); // Carrega o idioma sem pedir confirmação no carregamento

    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        themeIcon.innerHTML = '<i data-feather="moon"></i>';
    } else {
        themeIcon.innerHTML = '<i data-feather="sun"></i>';
    }
    feather.replace();

    loadingIndicator.style.display = 'none';
});
