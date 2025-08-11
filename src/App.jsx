import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, onSnapshot, orderBy, doc, setDoc, deleteDoc, serverTimestamp, getDoc, getDocs, updateDoc } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Edit3, MessageSquareText, Plus, Send, Trash2, User, Loader2, Menu, Sun, Moon, Paperclip, AlertTriangle, Copy, Check, Settings, History, HelpCircle, RefreshCw, ThumbsUp, ThumbsDown, Lightbulb as ReasoningIcon, Sparkles, X, Building, MessageCircle, Mail, Zap, ShieldCheck, BrainCircuit, Award } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Definição de variáveis globais para evitar erros de referência
const __firebase_config = typeof window !== 'undefined' && window.__firebase_config ? window.__firebase_config : undefined;
const __app_id = typeof window !== 'undefined' && window.__app_id ? window.__app_id : undefined;
const __initial_auth_token = typeof window !== 'undefined' && window.__initial_auth_token ? window.__initial_auth_token : undefined;

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyBLyIuKHL1QGtixLrvkwb-SvWrwcD7zRxA",
  authDomain: "almail-9b8d9.firebaseapp.com",
  projectId: "almail-9b8d9",
  storageBucket: "almail-9b8d9.firebasestorage.app",
  messagingSenderId: "842016603414",
  appId: "1:842016603414:web:1fb43568432d8b7e9ba437",
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'almail-plus-preview';

let app;
let auth;
let db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Erro Crítico ao Inicializar Firebase: Verifique sua configuração.", error);
}

const LIST_FORMATTING_INSTRUCTIONS = `
**Instruções de formatação críticas, obrigatórias e inegociáveis para listas:**

* **Listas numeradas (Regra de ouro - Sem exceções - Siga estritamente para evitar erros de renderização):**
    * **Formato correto e único aceitável:** O item deve começar com \`número.\` (um número cardinal como 1, 2, 3, etc., seguido imediatamente por um ponto final ".", sem nenhum espaço entre o número e o ponto).
    * Após o ponto final (.), deve haver um único espaço.
    * Após este único espaço, o texto do item deve começar imediatamente.
    * **Crucial: O número, o ponto, o espaço único e o início do texto do item devem estar todos na mesma linha. Não pode haver nenhuma quebra de linha (como \\n ou um novo parágrafo) entre o "número." e o "texto do item".**
    * **Exemplo da estrutura correta na mesma linha:**
        \`1. Este é o texto do primeiro item e começa na mesma linha que "1. ".\`
        \`2. Este é o texto do segundo item.\`
    * **Exemplos corretos (Modelo a ser seguido):**
        * \`1. Este é o primeiro item.\`
        * \`2. Este é o segundo item, que pode ser um pouco mais longo e, por isso, o sistema de exibição poderá quebrá-lo visualmente em múltiplas linhas. No entanto, o início do texto ("Este é o segundo...") está na mesma linha que "2. ".\`
        * \`3. Item final.\`
    * **Exemplos absolutamente incorretos e proibidos (Nunca faça isto - Resultará em formatação quebrada e ilegível):**
        * **Não faça (Errado):** \`1 . Texto do item\`
            * (Motivo do erro: Há um espaço indesejado entre o número "1" e o ponto ".". O correto é \`1. Texto do item\`)
        * **Não faça (Errado gravíssimo):**
            \`1.
            Texto do item\`
            * (Motivo do erro: Quebra de linha (\\n) entre "1." e "Texto do item". O texto deve começar na mesma linha que "1.".)
        * **Não faça (Errado gravíssimo):**
            \`2. \` (linha contendo apenas o número, ponto e espaço, com o texto na linha seguinte)
            \`Texto do item começando na linha de baixo.\`
            * (Motivo do erro: O texto do item não está na mesma linha que "2. ". Deve ser \`2. Texto do item começando na linha de baixo.\`)
        * **Não faça (Errado):**
            \`* 1. Texto do item\`
            * (Motivo do erro: Mistura de marcador de bullet com lista numerada de forma não padrão. Se for uma lista numerada, comece diretamente com o número.)
    * **Quebra de linha dentro de um item longo:** Se o texto de um item de lista for muito extenso, ele deve fluir naturalmente para as linhas seguintes conforme renderizado. A única e crucial restrição é que o *início efetivo* do texto do item deve estar na mesma linha que o seu número, ponto e o espaço subsequente (ex: \`1. Texto longo que continua...\`).

* **Listas com marcadores (bullet points):**
    * Formato: \`* Texto do item aqui.\` (Marcador como '*', '-' ou '+', seguido de um espaço, seguido do texto).
    * Correto: \`* Item da lista.\`
    * Para sub-itens, use indentação (geralmente dois ou quatro espaços antes do marcador). Exemplo:
        \`* Item principal
          * Sub-item A (pode usar '*' ou '-' ou '+', desde que indentado)
          * Sub-item B\`
    * Evite marcadores de lista vazios (ex: \`* \` seguido de uma linha em branco ou outro marcador).
`;

const SYSTEM_PROMPT = `Você é Almail+, uma Inteligência Artificial altamente especializada e dedicada ao atendimento ao cliente, atuando como a principal ferramenta de suporte para os colaboradores do Ecossistema Mercado Pago e Mercado Livre. Sua missão primordial é capacitar os atendentes, permitindo que eles forneçam respostas e soluções que sejam não apenas rápidas e precisas, mas também profundamente empáticas e personalizadas para cada usuário. Você deve operar em estrita conformidade com os mais altos padrões de qualidade e os processos internos estabelecidos. Ao receber uma consulta do atendente, que incluirá a dúvida do usuário e o canal de atendimento, seu papel é analisar essas informações e gerar a orientação mais eficaz ou o texto base ideal para que o atendente possa aplicar na interação com o cliente final.

Seu objetivo central é ser um multiplicador da capacidade do atendente, fornecendo-lhe diretrizes claras, exemplos de comunicação, textos base adaptáveis e as perguntas-chave necessárias para que ele conduza a conversa com o cliente final de forma exemplar. Lembre-se, você é um assistente do colaborador, e sua linguagem deve refletir isso.

**REGRAS DE ECOSSISTEMA:**
Primeiro, identifique o ecossistema informado no contexto: "Mercado Pago", "Mercado Livre" ou "SOS - Mercado Livre". Aja de acordo com as regras específicas do ecossistema.

---

**SE o Ecossistema for "SOS - Mercado Livre":**
**ATENÇÃO: MODO DE OPERAÇÃO RESTRITO.** Sua única função neste ecossistema é atuar como um guia rápido para os casos de uso específicos listados abaixo. Você DEVE seguir o estilo de atendimento MELI para cada um. É CRÍTICO E OBRIGATÓRIO que você não forneça nenhuma tratativa, solução ou sugestão para qualquer outro cenário.

**Casos de Uso Tratados EXCLUSIVAMENTE pelo SOS - Mercado Livre (com Estilo MELI):**

1.  **Problemas com Acesso e Fatores:**
    * **Cenário: Usuário não consegue acessar a conta por problemas com métodos de verificação (reconhecimento facial, PIN, biometria).**
        * **Tratativa:**
            * **1. Boas-vindas:** "Inicie a conversa de forma cordial e informativa. Exemplo: 'Olá, [Nome do Cliente]! Meu nome é [Nome do Atendente] e sou especialista do nosso canal de emergência do Mercado Livre. Vi que você precisa de ajuda para acessar sua conta e estou aqui para te ajudar com isso.'"
            * **2. Exploração:** "Valide a necessidade do cliente. Exemplo: 'Para que eu possa te orientar melhor, [Nome do Cliente], qual método de verificação está apresentando o problema? É o reconhecimento facial, a sua senha, ou outro?'"
            * **3. Orientação:** "Com base na resposta, forneça a solução. **Se for Reconhecimento Facial:** 'Compreendi. Muitas vezes, alguns ajustes simples resolvem. Por favor, sugira ao [Nome do Cliente] as seguintes dicas: Verificar se a iluminação do ambiente está boa; Limpar a câmera do celular; Manter o celular estável na altura do rosto; Retirar óculos, chapéu ou qualquer acessório que cubra o rosto. Se o problema persistir, informe que ele pode tentar a validação por outro método, como SMS ou e-mail.' **Se for PIN ou Biometria:** 'Entendi. O método de desbloqueio geralmente se refere ao PIN do seu celular ou à biometria do aparelho. Você poderia verificar as configurações de segurança do seu próprio celular para garantir que estão ativas?'"
            * **4. Encerramento:** "Confirme a resolução: 'Alguma dessas dicas funcionou para você, [Nome do Cliente]? Quer que eu te ajude a encontrar a opção de validação por outro método?'"
    * **Cenário: Usuário quer saber como alterar um método de verificação (e-mail, reconhecimento facial, telefone, Google Authenticator, etc.).**
        * **Tratativa:**
            * **1. Boas-vindas:** "Olá, [Nome do Cliente], meu nome é [Nome do Atendente], especialista do canal de emergência do Mercado Livre. Vi que você quer gerenciar seus métodos de verificação e posso te ajudar com isso."
            * **2. Exploração:** "Confirme a necessidade: 'Só para ter certeza, [Nome do Cliente], você deseja adicionar, alterar ou remover algum método de verificação em duas etapas, correto?'"
            * **3. Orientação:** "Forneça o caminho exato. Exemplo: 'Entendido. O processo é feito na área de segurança da sua conta. Oriente o [Nome do Cliente] a: 1. Acessar 'Meus dados' > 'Segurança'. 2. Ir para a seção 'Verificação em duas etapas'. 3. Lá, ele poderá ver todos os métodos ativos e escolher qual desativar, ou adicionar um novo. Por segurança, o sistema vai pedir uma última validação para confirmar que é você mesmo.'"
            * **4. Encerramento:** "Finalize o suporte: 'Encontrou a opção, [Nome do Cliente]? Há mais algo em que posso te ajudar sobre a segurança da sua conta?'"

2.  **Configuração da Conta:**
    * **Cenário: Alteração de dados da conta (telefone, endereço, nome de usuário, nome/sobrenome, documento).**
        * **Tratativa:**
            * **1. Boas-vindas:** "Comece de forma prestativa. Exemplo: 'Olá, [Nome do Cliente], aqui é o(a) [Nome do Atendente], especialista do nosso canal de emergência do Mercado Livre. Vi que você precisa alterar seus dados cadastrais. Vamos resolver isso juntos.'"
            * **2. Exploração:** "Faça perguntas para entender o cenário. Exemplo: 'Claro, [Nome do Cliente]. Você consegue acessar sua conta normalmente no momento, certo? E qual dado específico você precisa alterar?'"
            * **3. Orientação:** "Forneça a solução. Exemplo: 'Perfeito. Como você tem acesso, o processo é bem seguro. No seu perfil, vá até 'Meus dados'. Lá, ao tentar alterar informações como telefone ou nome, o sistema pedirá uma validação de identidade para confirmar que é você mesmo. Após essa confirmação, o campo para edição será liberado.'"
            * **4. Encerramento:** "Finalize o atendimento. Exemplo: 'Conseguiu encontrar a seção 'Meus dados', [Nome do Cliente]? Se precisar de mais alguma ajuda, é só me chamar.'"

3.  **Cancelamento de Conta:**
    * **Cenário: Usuário quer cancelar ou excluir a conta.**
        * **Tratativa:**
            * **1. Boas-vindas:** "Seja direto e prestativo. Exemplo: 'Olá, [Nome do Cliente], sou [Nome do Atendente], especialista do nosso canal de emergência do Mercado Livre. Recebi sua solicitação sobre como excluir sua conta e vou te passar as instruções corretas.'"
            * **2. Exploração:** "Alinhe as expectativas com cuidado. Exemplo: 'Antes de prosseguirmos, [Nome do Cliente], é importante que você saiba que, ao excluir a conta, todos os seus dados e histórico, como compras e vendas, serão perdidos permanentemente. Você está ciente disso e deseja continuar?'"
            * **3. Orientação:** "Após a confirmação, forneça os passos. Exemplo: 'Certo. Para seguir com a exclusão, acesse 'Meus dados' e depois 'Privacidade'. Lá você encontrará a opção 'Cancelar a minha conta'. Apenas um detalhe importante: a conta não pode ter nenhuma pendência, como faturas em aberto ou reclamações ativas, para que o cancelamento seja concluído, ok?'"
            * **4. Encerramento:** "Ofereça uma última ajuda. Exemplo: 'Posso te ajudar em algo mais antes de você prosseguir com o cancelamento, [Nome do Cliente]?'"

4.  **Suspeita de Invasão / ATO (Account Takeover):**
    * **Cenário: Usuário suspeita que a conta foi invadida, roubada ou percebeu movimentação desconhecida.**
        * **Tratativa:**
            * **1. Boas-vindas:** "Aja com urgência e calma. Exemplo: 'Olá, [Nome do Cliente], sou [Nome do Atendente], especialista do nosso canal de emergência do Mercado Livre. Recebi sua mensagem sobre uma possível invasão de conta e sei o quanto isso é preocupante. Aja com calma, estou aqui para te ajudar a proteger sua conta imediatamente.'"
            * **2. Exploração:** "Avalie a situação rapidamente. Exemplo: 'Me diga, [Nome do Cliente], neste momento você ainda consegue acessar sua conta ou já perdeu o acesso?'"
            * **3. Orientação:** "Aja rapidamente com base na resposta. Exemplo: 'Certo, [Nome do Cliente], a agilidade é crucial. **Se você ainda tem acesso**, vá agora em 'Meus dados', depois 'Segurança', revise os dispositivos conectados e remova qualquer um que não reconheça. Em seguida, troque sua senha. **Se você já perdeu o acesso**, o caminho é recuperar a conta. Use a opção 'Não sei minha senha' e depois 'Não tenho mais acesso ao e-mail' para validar sua identidade com seus documentos.'"
            * **4. Encerramento:** "Reforce a segurança. Exemplo: 'Conseguiu iniciar o processo de proteção/recuperação, [Nome do Cliente]? É muito importante também alterar a senha do seu e-mail pessoal e nunca compartilhar suas senhas com ninguém.'"

5.  **Problemas com Cartão Mercado Pago:**
    * **Cenário: Usuário quer relatar roubo ou perda do cartão MP.**
        * **Tratativa:**
            * **1. Boas-vindas:** "Seja empático e direto. Exemplo: 'Olá, [Nome do Cliente], sou [Nome do Atendente], especialista do nosso canal de emergência do Mercado Pago. Lamento muito saber sobre o roubo/perda do seu cartão. Não se preocupe, vamos bloqueá-lo imediatamente para garantir sua segurança.'"
            * **2. Exploração:** "Aja rapidamente. Diga: 'Para agilizarmos, você consegue acessar o aplicativo do Mercado Pago agora?'"
            * **3. Orientação:** "Forneça a solução mais rápida. Exemplo: 'Perfeito. A forma mais rápida de se proteger é cancelando o cartão pelo app. Por favor, vá na seção 'Cartões', selecione o cartão físico e procure a opção 'Cancelar e pedir 2ª via'. Escolha o motivo 'Roubo ou perda'. Isso bloqueará o cartão instantaneamente. Se houver alguma compra que você não reconhece após o ocorrido, me informe para analisarmos.'"
            * **4. Encerramento:** "Confirme a ação e ofereça o próximo passo. Exemplo: 'Conseguiu solicitar o cancelamento, [Nome do Cliente]? Fique tranquilo(a) que um novo cartão já está a caminho. Há algo mais em que posso ajudar?'"

**REGRA FINAL E INEGOCIÁVEL PARA SOS - MERCADO LIVRE:**
**SE a dúvida do cliente NÃO se enquadrar PERFEITAMENTE em NENHUM dos casos acima (incluindo, mas não se limitando a: dúvidas sobre faturas, chargeback, problemas com a maquininha Point, envio de chip, devoluções, alteração de titularidade, etc.), sua ÚNICA resposta permitida é:**
"Para essa situação, a orientação correta está detalhada em nossa FAQ. Por favor, [Nome do Atendente], consulte o artigo correspondente para fornecer a tratativa adequada ao [Nome do Cliente]."
**NÃO desvie desta resposta. NÃO tente ajudar de outra forma. NÃO ofereça alternativas. Apenas direcione para a FAQ.**

---

**SE o Ecossistema for "Mercado Pago" ou "Mercado Livre" (NÃO SOS):**
Prossiga com as regras gerais e de negócio detalhadas abaixo.

**Regras Gerais (Mercado Pago / Mercado Livre):**

1.  **Linguagem Positiva e Construtiva:** Jamais utilize palavras ou frases com conotação negativa.
2.  **Foco no Atendente (Capacitação):** Suas respostas são sempre direcionadas ao colaborador.
3.  **Data Atual para Prazos:** Use a data atual: 03 de junho de 2025.

**Instruções por Canal (Mercado Pago / Mercado Livre):**

1.  **Canal: E-mail**
    * **Estrutura:** Apresentação cordial ("Meu nome é [Nome do Atendente] e sou especialista do [Ecossistema], aqui para te ajudar."), desenvolvimento da tratativa e solução.
2.  **Canal: Chat**
    * **Estrutura:** Siga as 4 Etapas MELI (Boas-vindas, Exploração, Orientação, Encerramento). A apresentação deve ser: "Olá, [Nome do Cliente]! Meu nome é [Nome do Atendente], especialista do [Ecossistema]."
3.  **Canal: C2C (Voz)**
    * **Estrutura:** Siga as 4 Etapas MELI com adaptações para comunicação verbal e foco no tom de voz. A apresentação deve ser: "Meu nome é [Nome do Atendente], sou especialista do [Ecossistema] e estou aqui para te ajudar."

**Tratamento de Casos Específicos (Mercado Pago / Mercado Livre):**

A.  **Desconhecimento de compras no cartão físico:** Verifique se há seguro. Se não, explique a impossibilidade de contestação para compras com chip e senha e oriente a solicitar 2ª via.
B.  **Pagamento desconhecido há mais de 90 dias:** Explique que o prazo para contestação expirou e sugira contato com o estabelecimento.
C.  **Cancelamento preventivo de cartão:** Ofereça proativamente o cancelamento e reemissão do cartão como medida de segurança em qualquer caso de desconhecimento.
D.  **Desconhecimento de assinatura:** Investigue se o cliente reconhece o estabelecimento. Se sim, oriente a contatar a empresa. Se não, e houver evidências de tentativa de cancelamento, avalie abrir disputa. Se o desconhecimento for total, siga o fluxo normal de contestação.
`;

const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textArea = document.createElement("textarea");
    textArea.value = value;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar texto do bloco de código: ', err);
      const modalContainer = document.createElement('div');
      const isDark = document.documentElement.classList.contains('dark');
      modalContainer.innerHTML = `<div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.65); display:flex; align-items:center; justify-content:center; z-index:10000; padding: 1 rem;">
                                    <div style="background:${isDark ? '#2d2f32' : '#ffffff'}; color:${isDark ? '#e8eaed' : '#202124'}; padding:1.75rem 2rem; border-radius:12px; text-align:center; box-shadow: 0 12px 20px -8px rgba(0,0,0,0.15), 0 4px 8px -4px rgba(0,0,0,0.1);">
                                      <h3 style="margin-bottom: 1rem; font-size: 1.125rem; font-weight: 500;">Erro ao Copiar</h3>
                                      <p style="margin-bottom: 1.5rem; font-size: 0.9rem;">Não foi possível copiar o código. Tente manualmente.</p>
                                      <button id="closeCopyErrorModal" style="padding:0.6rem 1.2rem; background-color:#1a73e8; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:500; font-size: 0.9rem;">OK</button>
                                    </div>
                                 </div>`;
      document.body.appendChild(modalContainer);
      document.getElementById('closeCopyErrorModal').onclick = () => document.body.removeChild(modalContainer);
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className="relative group bg-neutral-100 dark:bg-neutral-800/60 p-3.5 sm:p-4 rounded-lg my-3.5 shadow-sm text-neutral-800 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700/80">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300/80 dark:hover:bg-neutral-600/80 rounded-md text-neutral-600 dark:text-neutral-300 opacity-0 group-hover:opacity-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        title={copied ? "Copiado!" : "Copiar código"}
      >
        {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
      </button>
      <pre className="overflow-x-auto custom-scrollbar text-sm font-mono max-w-full whitespace-pre-wrap break-words leading-relaxed">
        <code className={`language-${language} break-words`}>
          {value}
        </code>
      </pre>
    </div>
  );
};

const MarkdownRenderer = ({ content }) => (
  <ReactMarkdown
    components={{
      code({ inline, className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        return !inline && match ? (
          <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
        ) : (
          <code className={`bg-neutral-100 dark:bg-neutral-700/60 text-neutral-700 dark:text-neutral-200 px-1.5 py-0.5 rounded-md text-xs font-mono ${className} break-words`} {...props}>
            {children}
          </code>
        );
      },
      ul: ({ children }) => <ul className="list-disc list-inside my-3 pl-5 text-inherit space-y-1.5 leading-relaxed">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal list-inside my-3 pl-5 text-inherit space-y-1.5 leading-relaxed">{children}</ol>,
      li: ({ children }) => <li className="my-1.5 text-inherit break-words">{children}</li>,
      p: ({ children }) => <p className="text-inherit my-2.5 leading-relaxed break-words">{children}</p>,
      strong: ({children}) => <strong className="font-medium text-inherit">{children}</strong>,
      h1: ({children}) => <h1 className="text-2xl sm:text-[1.7rem] font-medium mt-7 mb-4 pb-2.5 border-b border-neutral-200 dark:border-neutral-700/80 text-neutral-900 dark:text-neutral-50 break-words">{children}</h1>,
      h2: ({children}) => <h2 className="text-xl sm:text-[1.4rem] font-medium mt-6 mb-3.5 pb-2 border-b border-neutral-200 dark:border-neutral-700/80 text-neutral-800 dark:text-neutral-100 break-words">{children}</h2>,
      h3: ({children}) => <h3 className="text-lg sm:text-[1.2rem] font-medium mt-5 mb-3 text-neutral-700 dark:text-neutral-200 break-words">{children}</h3>,
      table: ({children}) => <div className="overflow-x-auto my-4 shadow-md rounded-lg border border-neutral-200 dark:border-neutral-700/80"><table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700/80 text-sm">{children}</table></div>,
      thead: ({children}) => <thead className="bg-neutral-50 dark:bg-neutral-700/40 text-neutral-600 dark:text-neutral-300">{children}</thead>,
      tbody: ({children}) => <tbody className="bg-white dark:bg-neutral-800/30 divide-y divide-neutral-200 dark:divide-neutral-700/80">{children}</tbody>,
      tr: ({children}) => <tr className="hover:bg-neutral-50/80 dark:hover:bg-neutral-700/40 transition-colors duration-150">{children}</tr>,
      th: ({children}) => <th scope="col" className="px-4 py-3 text-left font-medium tracking-wide text-neutral-600 dark:text-neutral-300 break-words text-xs sm:text-sm">{children}</th>,
      td: ({children}) => <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200 break-words text-xs sm:text-sm">{children}</td>,
      a: ({children, href}) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors duration-150 break-all">{children}</a>,
      blockquote: ({children}) => <blockquote className="border-l-4 border-neutral-300 dark:border-neutral-600 pl-4 italic my-4 text-neutral-600 dark:text-neutral-400 break-words">{children}</blockquote>,
    }}
  >
    {content}
  </ReactMarkdown>
);

const GeminiThinkingIndicator = () => (
  <div className="flex items-center justify-center space-x-1.5 h-7">
    <div className="w-2 h-2 bg-neutral-500 dark:bg-neutral-400 rounded-full animate-gemini-pulse-custom" style={{ animationDelay: '0s' }}></div>
    <div className="w-2 h-2 bg-neutral-500 dark:bg-neutral-400 rounded-full animate-gemini-pulse-custom" style={{ animationDelay: '0.15s' }}></div>
    <div className="w-2 h-2 bg-neutral-500 dark:bg-neutral-400 rounded-full animate-gemini-pulse-custom" style={{ animationDelay: '0.3s' }}></div>
  </div>
);

const Message = ({ message, theme, onRegenerateResponse, onFetchReasoning, currentConversationId, userId }) => {
  const isUser = message.role === 'user';
  const Icon = isUser ? User : Sparkles;
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [feedback, setFeedback] = useState(message.feedback || null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [reasoningText, setReasoningText] = useState(message.reasoningText || '');
  const [isLoadingReasoning, setIsLoadingReasoning] = useState(message.isLoadingReasoning || false);

  const showActionButtons = !isUser && !message.isLoading && message.content && !message.isRegenerating;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setFeedback(message.feedback || null);
    setReasoningText(message.reasoningText || '');
    setIsLoadingReasoning(message.isLoadingReasoning || false);
  }, [message.feedback, message.reasoningText, message.isLoadingReasoning]);

  const userBubbleClasses = 'bg-blue-50 dark:bg-blue-800/30 text-neutral-800 dark:text-neutral-100 rounded-2xl rounded-br-md';
  const assistantBubbleClasses = 'bg-neutral-100 dark:bg-neutral-700/50 text-neutral-800 dark:text-neutral-100 rounded-2xl rounded-bl-md';
  
  const iconContainerClasses = isUser
    ? 'bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300'
    : (theme === 'dark' ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white' : 'bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 text-white');

  const handleCopyMessage = () => {
    if (message.content) {
      const textArea = document.createElement("textarea");
      textArea.value = message.content;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) { console.error('Falha ao copiar mensagem: ', err); }
      document.body.removeChild(textArea);
    }
  };

  const handleFeedback = async (newFeedback) => {
    if (!db || !currentConversationId || !message.id || !userId || message.isRegenerating) return;
    const newFeedbackState = feedback === newFeedback ? null : newFeedback;
    setFeedback(newFeedbackState);
    const messageRef = doc(db, `artifacts/${appId}/users/${userId}/conversations/${currentConversationId}/messages`, message.id);
    try {
      await updateDoc(messageRef, { feedback: newFeedbackState });
    } catch (error) {
      console.error("Erro ao atualizar feedback no Firestore:", error);
      setFeedback(feedback);
    }
  };

  const handleRegenerate = () => {
    if (onRegenerateResponse && !message.isLoading && !message.isRegenerating) {
      onRegenerateResponse(message.id);
    }
  };

  const handleToggleReasoning = () => {
    if (message.isRegenerating) return;
    if (reasoningText && !isLoadingReasoning) {
      setShowReasoning(!showReasoning);
    } else if (!isLoadingReasoning && onFetchReasoning) {
      onFetchReasoning(message.id, message.content);
      setShowReasoning(true);
    }
  };
  
  const actionButtonClass = (disabled = false) => 
    `p-1.5 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-150 ${
      disabled 
        ? 'bg-neutral-200/60 dark:bg-neutral-600/60 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
        : 'bg-neutral-200/80 dark:bg-neutral-600/80 hover:bg-neutral-300/70 dark:hover:bg-neutral-500/70 text-neutral-500 dark:text-neutral-300'
    }`;

  const feedbackButtonClass = (type, disabled = false) => 
    `p-1.5 rounded-full focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-150 ${
      disabled
        ? 'text-neutral-400 dark:text-neutral-500 cursor-not-allowed ' + (feedback === type ? (type === 'liked' ? 'bg-blue-200/70 dark:bg-blue-600/70' : 'bg-red-200/70 dark:bg-red-600/70') : 'bg-neutral-200/60 dark:bg-neutral-600/60')
        : feedback === type 
          ? (type === 'liked' ? 'bg-blue-500 text-white dark:bg-blue-500' : 'bg-red-500 text-white dark:bg-red-500') 
          : 'bg-neutral-200/80 dark:bg-neutral-600/80 hover:bg-neutral-300/70 dark:hover:bg-neutral-500/70 text-neutral-500 dark:text-neutral-300'
    }`;

  return (
    <div className={`flex mb-4 sm:mb-5 text-sm sm:text-base group ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-start gap-2.5 sm:gap-3 max-w-[88%] sm:max-w-[80%] lg:max-w-[75%] ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`p-1.5 rounded-full ${iconContainerClasses} flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 shadow-sm`}>
          <Icon size={isUser ? 18 : 20} strokeWidth={Icon === User ? 2 : (Icon === Sparkles && isUser ? 2 : 1.5)} />
        </div>
        <div
          className={`relative p-3.5 sm:p-4 shadow-sm w-fit 
          ${isUser ? userBubbleClasses : assistantBubbleClasses}
          transition-all duration-300 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
        >
          <div className={`${message.isRegenerating ? 'opacity-60' : ''} break-words`}>
            {(message.isLoading && message.role === 'assistant' && !message.content && !message.isRegenerating) ? (
              <div className="flex items-center justify-center min-h-[2.8rem] sm:min-h-[3.2rem]"> 
                <GeminiThinkingIndicator />
              </div>
            ) : (
              <MarkdownRenderer content={message.content || ""} />
            )}
          </div>

          {message.isRegenerating && message.role === 'assistant' && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-100/40 dark:bg-neutral-700/40 rounded-2xl">
              <GeminiThinkingIndicator />
            </div>
          )}
          
          {showActionButtons && (
            <div className="mt-3 pt-2.5 border-t border-neutral-200/80 dark:border-neutral-600/60 flex flex-wrap justify-start items-center gap-1.5 sm:gap-2">
              <button onClick={handleCopyMessage} className={actionButtonClass()} title={copied ? "Copiado!" : "Copiar mensagem"}>
                {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
              </button>
              <button onClick={handleRegenerate} className={actionButtonClass()} title="Modificar resposta"> <RefreshCw size={15} /> </button>
              <button onClick={handleToggleReasoning} className={actionButtonClass()} title="Mostrar raciocínio"> <ReasoningIcon size={15} /> </button>
              <div className="flex-grow"></div>
              <button onClick={() => handleFeedback('liked')} className={feedbackButtonClass('liked')} title="Gostei"> <ThumbsUp size={15} /> </button>
              <button onClick={() => handleFeedback('disliked')} className={feedbackButtonClass('disliked')} title="Não gostei"> <ThumbsDown size={15} /> </button>
            </div>
          )}

          {showReasoning && !isUser && !message.isRegenerating && ( 
            <div className={`mt-3.5 pt-3 border-t ${theme === 'dark' ? 'border-neutral-600/60' : 'border-neutral-200/80'}`}>
              {isLoadingReasoning ? (
                <div className="flex justify-center items-center py-2.5">
                  <Loader2 className="animate-spin text-neutral-500 dark:text-neutral-400" size={18} />
                </div>
              ) : (
                <div className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">
                  <p className="font-medium mb-2 text-neutral-700 dark:text-neutral-200">Raciocínio:</p>
                  <MarkdownRenderer content={reasoningText} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MessageInput = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 144)}px`;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };
  
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['text/plain', 'text/markdown', 'text/javascript', 'application/json', 'text/x-python', 'text/html', 'text/css', 'text/csv', '.log'];
      const fileExtension = `.${file.name.split('.').pop().toLowerCase()}`;

      if (!allowedTypes.includes(file.type) && !allowedTypes.includes(fileExtension)) {
        const modalContainer = document.createElement('div');
        const isDark = document.documentElement.classList.contains('dark');
        modalContainer.innerHTML = `<div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.65); display:flex; align-items:center; justify-content:center; z-index:10000; padding: 1rem;">
                                      <div style="background: ${isDark ? '#2d2f32' : '#ffffff'}; padding:1.75rem 2rem; border-radius:12px; text-align:center; color:${isDark ? '#e8eaed' : '#202124'}; box-shadow: 0 12px 20px -8px rgba(0,0,0,0.15), 0 4px 8px -4px rgba(0,0,0,0.1); font-size: 0.9rem;">
                                        <h3 style="margin-bottom: 1rem; font-size: 1.125rem; font-weight: 500;">Erro de Arquivo</h3>
                                        <p style="margin-bottom: 1.25rem;">Tipo de arquivo não suportado (${file.name}). Por favor, selecione um arquivo de texto.</p>
                                        <button id="closeErrorModal" style="padding:0.6rem 1.2rem; background-color:#1a73e8; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:500; font-size: 0.9rem;">OK</button>
                                      </div>
                                   </div>`;
        document.body.appendChild(modalContainer);
        document.getElementById('closeErrorModal').onclick = () => document.body.removeChild(modalContainer);
        event.target.value = null;
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target.result;
        setInput(prevInput => `${prevInput}${prevInput ? '\n\n' : ''}Conteúdo do arquivo "${file.name}":\n\`\`\`\n${fileContent}\n\`\`\`\n`);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 144)}px`;
            textareaRef.current.focus();
        }
      };
      reader.onerror = () => {
        console.error("Erro ao ler arquivo.");
        const modalContainer = document.createElement('div');
        const isDark = document.documentElement.classList.contains('dark');
        modalContainer.innerHTML = `<div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.65); display:flex; align-items:center; justify-content:center; z-index:10000; padding: 1rem;">
                                      <div style="background:${isDark ? '#2d2f32' : '#ffffff'}; padding:1.75rem 2rem; border-radius:12px; text-align:center; color:${isDark ? '#e8eaed' : '#202124'}; box-shadow: 0 12px 20px -8px rgba(0,0,0,0.15), 0 4px 8px -4px rgba(0,0,0,0.1); font-size: 0.9rem;">
                                        <h3 style="margin-bottom: 1rem; font-size: 1.125rem; font-weight: 500;">Erro de Leitura</h3>
                                        <p style="margin-bottom: 1.25rem;">Ocorreu um erro ao tentar ler o arquivo "${file.name}".</p>
                                        <button id="closeErrorModalFile" style="padding:0.6rem 1.2rem; background-color:#1a73e8; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:500; font-size: 0.9rem;">OK</button>
                                      </div>
                                   </div>`;
        document.body.appendChild(modalContainer);
        document.getElementById('closeErrorModalFile').onclick = () => document.body.removeChild(modalContainer);
      }
      reader.readAsText(file);
    }
    event.target.value = null;
  };

  useEffect(() => {
    if (textareaRef.current && !input) {
        textareaRef.current.style.height = 'auto';
    }
  }, [input]);

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl lg:max-w-[900px] mx-auto">
      <div className="flex items-end bg-neutral-100 dark:bg-neutral-800/70 rounded-full px-2.5 py-2 sm:px-3 sm:py-2.5 shadow-lg ring-1 ring-neutral-200 dark:ring-neutral-700/60 focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-500 transition-all duration-200">
        <button type="button" onClick={() => fileInputRef.current && fileInputRef.current.click()} className="p-2 sm:p-2.5 text-neutral-500 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors duration-150" title="Anexar arquivo" disabled={isLoading}>
          <Paperclip size={19} />
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".txt,.md,.js,.json,.py,.html,.css,.csv,.log,text/plain,text/markdown,text/javascript,application/json,text/x-python,text/html,text/css,text/csv" />
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          placeholder="Digite sua mensagem aqui..."
          rows="1"
          className="flex-grow mx-2 px-2.5 py-2 bg-transparent text-neutral-800 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none resize-none max-h-[144px] overflow-y-auto text-base leading-relaxed custom-scrollbar"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          disabled={isLoading}
        />
        <button
          type="submit"
          className={`p-2 sm:p-2.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-neutral-100 dark:focus:ring-offset-neutral-800 focus:ring-blue-500
            ${isLoading || !input.trim()
              ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed scale-95'
              : 'bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105'
            }`}
          disabled={isLoading || !input.trim()}
          title="Enviar mensagem"
        >
          {isLoading ? <Loader2 className="animate-spin" size={19} /> : <Send size={19} />}
        </button>
      </div>
    </form>
  );
};

const ChatView = ({ currentConversation, messages, onSendMessage, isLoading, userId, onUpdateConversationTitle, theme, onRegenerateResponse, onFetchReasoning }) => {
  const messagesEndRef = useRef(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const prevMessagesLengthRef = useRef(messages.length);
  const prevCurrentConversationIdRef = useRef(currentConversation?.id);

  useEffect(() => {
    const newMessagesLength = messages.length;
    const newCurrentConversationId = currentConversation?.id;
    if (newCurrentConversationId !== prevCurrentConversationIdRef.current ||
        (newCurrentConversationId === prevCurrentConversationIdRef.current && newMessagesLength > prevMessagesLengthRef.current)) {
        const lastMessage = messages[messages.length -1];
        if (!(lastMessage && lastMessage.isRegenerating)) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }
    prevMessagesLengthRef.current = newMessagesLength;
    prevCurrentConversationIdRef.current = newCurrentConversationId;
  }, [messages, currentConversation]);

  useEffect(() => {
    if (currentConversation) setNewTitle(currentConversation.title);
    else setNewTitle('');
  }, [currentConversation]);

  const handleTitleSave = async () => {
    if (!currentConversation || !userId || !db) {
      setEditingTitle(false);
      return;
    }
    const trimmedTitle = newTitle.trim();
    if (trimmedTitle && trimmedTitle !== currentConversation.title) {
      try {
        const conversationRef = doc(db, `artifacts/${appId}/users/${userId}/conversations/${currentConversation.id}`);
        await setDoc(conversationRef, { title: trimmedTitle, updatedAt: serverTimestamp() }, { merge: true });
        onUpdateConversationTitle(currentConversation.id, trimmedTitle);
        setEditingTitle(false);
      } catch (error) {
        console.error("Erro ao atualizar título da conversa:", error);
        setEditingTitle(false);
      }
    } else {
      setEditingTitle(false);
      setNewTitle(currentConversation?.title || '');
    }
  };

  if (!currentConversation) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-900 p-6 text-center">
        <Sparkles size={60} className="mb-8 text-blue-500 dark:text-blue-400" /> 
        <p className={`text-3xl sm:text-4xl font-medium mb-4 
                       bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 
                       dark:from-blue-400 dark:via-purple-400 dark:to-pink-400
                       text-transparent bg-clip-text 
                       bg-[length:200%_auto] animate-[animated-gradient-text_8s_ease-in-out_infinite]`}>
          Como posso te ajudar hoje?
        </p>
        <p className="text-base text-neutral-500 dark:text-neutral-400 mt-2 max-w-md">
          Selecione uma conversa existente ou inicie uma nova para interagir com o Almail+.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 min-h-0">
      <div className={`flex items-center justify-between flex-shrink-0 bg-white dark:bg-neutral-900 h-[68px] border-b border-neutral-200 dark:border-neutral-700/70 px-4 sm:px-5 md:pl-6 pl-[4.75rem]`}>
        {editingTitle ? (
          <input
            type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') { setEditingTitle(false); setNewTitle(currentConversation.title); }}}
            className="text-lg font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-white p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none" autoFocus
          />
        ) : (
          <h2 className="text-lg font-medium truncate cursor-pointer text-neutral-700 dark:text-neutral-200 max-w-[calc(100%-3.5rem)]" title={currentConversation.title} onClick={() => setEditingTitle(true)}>
            {currentConversation.title}
          </h2>
        )}
        {!editingTitle && (
          <button onClick={() => setEditingTitle(true)} className="text-neutral-500 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 ml-2 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700/70 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-neutral-900 focus:ring-blue-500 transition-colors">
            <Edit3 size={18} />
          </button>
        )}
      </div>
      <div className="flex-grow px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 overflow-y-auto space-y-3.5 sm:space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <Message key={msg.id} message={msg} theme={theme} onRegenerateResponse={onRegenerateResponse} onFetchReasoning={onFetchReasoning} currentConversationId={currentConversation?.id} userId={userId} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex-shrink-0 px-4 py-3.5 sm:px-5 sm:py-4 border-t border-neutral-200 dark:border-neutral-700/70 bg-white dark:bg-neutral-900">
        <MessageInput onSendMessage={onSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

const Sidebar = ({ conversations, onSelectConversation, onCreateNewChat, currentConversationId, onDeleteConversation, isSidebarOpen, toggleSidebar, onToggleTheme, currentTheme, userId, onNavigateHome, isLoading }) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);

  const handleDelete = (conversationId) => {
    if (!conversationId) return;
    onDeleteConversation(conversationId);
    setShowConfirmDelete(null);
  };

  const SidebarButton = ({ 
    // eslint-disable-next-line no-unused-vars
    icon: Icon, 
    text, 
    onClick, 
    title, 
    isActive = false, 
    isCollapsed = false, 
    additionalClasses = "", 
    isDestructive = false, 
    isNewChatButton = false,
    disabled = false
  }) => {
    
    let iconClassName = '';
    let textClassName = 'text-sm font-medium';
  
    if (isNewChatButton) {
      iconClassName = 'text-white';
      textClassName = 'text-white font-medium text-base';
    } else if (isActive) {
      iconClassName = 'text-blue-700 dark:text-blue-300';
      textClassName = 'text-blue-700 dark:text-blue-300 font-medium text-sm';
    } else if (isDestructive) {
      iconClassName = 'text-red-600 dark:text-red-400 group-hover:text-red-500 dark:group-hover:text-red-300';
    } else {
      iconClassName = 'text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200';
    }
  
    return (
      <button
        onClick={onClick} title={title || text}
        disabled={disabled}
        className={`w-full p-2 sm:p-3 flex items-center rounded-full transition-all duration-200 ease-in-out group focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-1 focus:ring-offset-neutral-100 dark:focus:ring-offset-neutral-800
                    ${isCollapsed ? 'justify-center h-10 w-10 sm:h-12 sm:w-12 mx-auto' : 'justify-start space-x-2.5 sm:space-x-3.5 h-[42px] sm:h-[46px]'} 
                    ${isNewChatButton 
                        ? '' 
                        : isActive 
                            ? 'bg-blue-100 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 font-medium' 
                            : isDestructive 
                                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15'
                                : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/80 dark:hover:bg-neutral-700/60'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    ${additionalClasses}`}
      >
        <Icon 
          size={isCollapsed ? (window.innerWidth < 640 ? 18 : 20) : (window.innerWidth < 640 ? 17 : 19)} 
          className={iconClassName} 
        />
        {!isCollapsed && (
          <span className={`${textClassName} text-xs sm:text-sm truncate`}>
            {text}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className={`bg-neutral-100 dark:bg-neutral-800/90 text-neutral-700 dark:text-neutral-200 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-full sm:w-64 md:w-72 lg:w-[280px]' : 'w-0 sm:w-[60px] md:w-[76px]'} ${isSidebarOpen ? 'absolute sm:relative' : 'relative'} ${isSidebarOpen ? 'z-40 sm:z-auto' : ''} overflow-hidden h-full border-r border-neutral-200/80 dark:border-neutral-700/70 shadow-lg`}>
      <div className={`p-2 sm:p-3 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} border-b border-neutral-200/80 dark:border-neutral-700/70 flex-shrink-0 h-[60px] sm:h-[68px]`}>
        {isSidebarOpen && (
          <button onClick={onNavigateHome} className="flex items-center space-x-2 sm:space-x-2.5 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md -ml-1 px-1 py-0.5">
            <Sparkles size={20} className="sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-lg sm:text-xl font-semibold text-neutral-800 dark:text-white">Almail+</h1> 
          </button>
        )}
        <button onClick={toggleSidebar} className="text-neutral-500 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 p-1.5 sm:p-2 rounded-full hover:bg-neutral-200/80 dark:hover:bg-neutral-700/70 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
          {isSidebarOpen ? <ChevronLeft size={18} className="sm:w-5 sm:h-5" /> : <Menu size={18} className="sm:w-5 sm:h-5" />}
        </button>
      </div>

      <div className={`flex-grow flex flex-col overflow-y-auto custom-scrollbar py-2 sm:py-3.5 transition-opacity duration-200 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        <div className={`px-2 sm:px-3 ${isSidebarOpen ? 'mb-2.5 sm:mb-3.5' : 'mb-2 sm:mb-2.5'}`}>
          <SidebarButton
              icon={Plus} text="Nova Conversa" onClick={onCreateNewChat} title="Iniciar uma nova conversa" isCollapsed={!isSidebarOpen}
              isNewChatButton={true} 
              additionalClasses={'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium shadow-lg'}
              disabled={isLoading}
          />
        </div>

        <div className={`flex-grow px-2 sm:px-3 space-y-1 sm:space-y-1.5 ${!isSidebarOpen ? 'flex flex-col items-center mt-2 sm:mt-2.5 space-y-2 sm:space-y-3' : ''}`}>
          {isSidebarOpen ? (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`w-full p-3 flex items-center rounded-full cursor-pointer transition-colors duration-150 group focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400 focus-within:ring-offset-1 focus-within:ring-offset-neutral-100 dark:focus-within:ring-offset-neutral-800
                            ${currentConversationId === conv.id 
                              ? 'bg-blue-100 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 font-medium' 
                              : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/80 dark:hover:bg-neutral-700/60'}`}
                onClick={() => !isLoading && onSelectConversation(conv.id)} title={conv.title}
                tabIndex={0} 
                onKeyDown={(e) => { if (!isLoading && (e.key === 'Enter' || e.key === ' ')) onSelectConversation(conv.id); }}
              >
                <MessageSquareText size={18} className={`flex-shrink-0 mr-3 ${currentConversationId === conv.id ? 'text-blue-700 dark:text-blue-300' : 'text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200'}`} />
                <p className="truncate text-sm font-medium flex-grow">
                  {conv.title}
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(conv.id); }} 
                  className={`text-neutral-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-full hover:bg-neutral-300/50 dark:hover:bg-neutral-600/50 flex-shrink-0 focus:outline-none transition-opacity
                                opacity-0 group-hover:opacity-100 focus:opacity-100`} 
                  title="Excluir conversa"
                  disabled={isLoading}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          ) : ( 
            <>
              <SidebarButton icon={History} title="Ver Histórico (Expandir)" onClick={toggleSidebar} isCollapsed={true} disabled={isLoading} />
            </>
          )}
        </div>
      </div>

      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200 ease-in-out">
          <div className="bg-white dark:bg-neutral-800 p-6 sm:p-7 rounded-xl shadow-xl text-neutral-800 dark:text-neutral-100 max-w-md w-full ring-1 ring-black/5 dark:ring-white/10 transform transition-all duration-200 ease-in-out scale-100 opacity-100">
            <div className="flex flex-col items-center text-center">
              <AlertTriangle size={32} className="text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2.5">Excluir Conversa?</h3>
              <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                Tem certeza que deseja excluir esta conversa? Todas as mensagens serão removidas permanentemente. Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button 
                onClick={() => setShowConfirmDelete(null)} 
                className="w-full sm:w-auto px-5 py-2.5 bg-neutral-200 hover:bg-neutral-300/80 dark:bg-neutral-700 dark:hover:bg-neutral-600/80 text-neutral-700 dark:text-neutral-200 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleDelete(showConfirmDelete)} 
                className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`p-3 border-t border-neutral-200/80 dark:border-neutral-700/70 flex-shrink-0 ${isSidebarOpen ? 'space-y-2.5' : 'flex flex-col items-center space-y-2.5 py-2.5'}`}>
         <SidebarButton
            icon={currentTheme === 'dark' ? Sun : Moon} text={`Tema ${currentTheme === 'dark' ? 'Claro' : 'Escuro'}`}
            onClick={onToggleTheme} title={`Mudar para tema ${currentTheme === 'dark' ? 'Claro' : 'Escuro'}`} isCollapsed={!isSidebarOpen}
        />
        {isSidebarOpen && userId && ( 
          <div className="text-xs text-neutral-500 dark:text-neutral-400/80 truncate px-2 py-1" title={`ID do Usuário: ${userId}`}>
            ID: {userId.substring(0,12)}...
          </div>
        )}
         {isSidebarOpen && ( 
             <SidebarButton icon={Settings} text="Configurações" onClick={() => { }} title="Configurações (Em breve)" isCollapsed={!isSidebarOpen} additionalClasses="cursor-not-allowed opacity-70" />
         )}
      </div>
    </div>
  );
};

const HomePage = ({ onStartChat, theme, onToggleTheme, conversations, onSelectConversation, onOpenCredits }) => {
  const recentConversations = conversations.slice(0, 3);

  return (
    <div className={`relative flex flex-col items-center justify-between min-h-screen bg-white dark:bg-neutral-900 p-5 sm:p-6 text-neutral-800 dark:text-neutral-50 selection:bg-blue-100 dark:selection:bg-blue-800/40`}>
      <div className="absolute top-5 right-5 sm:top-6 sm:right-7 flex items-center gap-2">
        <button
          onClick={onOpenCredits} title="Créditos"
          className="p-2.5 rounded-full text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/70 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-150"
        >
          <Award size={20} />
        </button>
        <button
          onClick={onToggleTheme} title={`Mudar para tema ${theme === 'dark' ? 'Claro' : 'Escuro'}`}
          className="p-2.5 rounded-full text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/70 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-150"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center w-full max-w-2xl lg:max-w-3xl mx-auto text-center pt-10 sm:pt-12">
        <div className="mb-7 sm:mb-8">
          <Sparkles size={64} className="mx-auto text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        </div>
        <h1 className={`text-5xl sm:text-[3.5rem] font-medium mb-3.5 
                       bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 
                       dark:from-blue-400 dark:via-purple-400 dark:to-pink-400
                       text-transparent bg-clip-text 
                       bg-[length:200%_auto] animate-[animated-gradient-text_8s_ease-in-out_infinite]`}>
          Olá.
        </h1>
        <h2 className="text-5xl sm:text-[3.5rem] font-medium text-neutral-500 dark:text-neutral-400 mb-12 sm:mb-14">
          Como posso ajudar hoje?
        </h2>

        <button
          onClick={onStartChat}
          className="mb-12 sm:mb-14 px-7 py-3.5 sm:px-8 sm:py-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-full text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-500/50 flex items-center justify-center mx-auto group"
        >
          <Plus size={20} className="mr-2.5 group-hover:rotate-90 transition-transform duration-200" />
          Nova Conversa
        </button>

        {conversations && conversations.length > 0 && (
          <div className="w-full max-w-md sm:max-w-lg mt-8 sm:mt-10 mb-6">
            <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-3.5 text-left px-1.5">Recentes</h3>
            <div className="space-y-3">
              {recentConversations.map(conv => (
                <button
                  key={conv.id} onClick={() => onSelectConversation(conv.id)}
                  className="w-full p-4 text-left bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700/80 rounded-xl transition-colors duration-150 flex items-center space-x-3.5 group shadow-sm hover:shadow-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <MessageSquareText size={18} className="text-neutral-500 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{conv.title}</span>
                  <ChevronRight size={16} className="ml-auto text-neutral-400 dark:text-neutral-500 group-hover:text-blue-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
       <footer className="pb-7 text-xs text-neutral-500 dark:text-neutral-400/80 text-center">
        Almail+ pode cometer erros. Considere verificar informações importantes.
      </footer>
    </div>
  );
};

const NewChatModal = ({ isOpen, onClose, onStart, isLoading }) => {
    const [info, setInfo] = useState({
        agentName: '',
        customerName: '',
        channel: 'Chat',
        ecosystem: 'Mercado Pago'
    });
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setInfo(prev => ({ ...prev, [name]: value }));
        if (value.trim()) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!info.agentName.trim()) newErrors.agentName = "O nome do atendente é obrigatório.";
        if (!info.customerName.trim()) newErrors.customerName = "O nome do cliente é obrigatório.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            onStart(info);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 transition-opacity duration-300 ease-in-out">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[95vh] overflow-y-auto transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-fade-in-scale">
                <div className="flex justify-between items-center p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-700">
                    <h2 className="text-base sm:text-lg font-semibold text-neutral-800 dark:text-neutral-100">Iniciar Nova Conversa</h2>
                    <button onClick={onClose} className="p-1.5 sm:p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <X size={18} className="sm:w-5 sm:h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                        <div>
                            <label htmlFor="agentName" className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Seu Nome (Atendente)</label>
                            <input type="text" name="agentName" id="agentName" value={info.agentName} onChange={handleChange}
                                className={`w-full px-3 py-2 sm:py-2.5 bg-neutral-50 dark:bg-neutral-700/60 border ${errors.agentName ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-600'} rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-sm`}
                                placeholder="Ex: João Silva"
                            />
                            {errors.agentName && <p className="text-xs text-red-500 mt-1.5">{errors.agentName}</p>}
                        </div>
                        <div>
                            <label htmlFor="customerName" className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Nome do Cliente</label>
                            <input type="text" name="customerName" id="customerName" value={info.customerName} onChange={handleChange}
                                className={`w-full px-3 py-2 sm:py-2.5 bg-neutral-50 dark:bg-neutral-700/60 border ${errors.customerName ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-600'} rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-sm`}
                                placeholder="Ex: Maria Souza"
                            />
                            {errors.customerName && <p className="text-xs text-red-500 mt-1.5">{errors.customerName}</p>}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Canal de Atendimento</label>
                                <div className="flex flex-col space-y-2">
                                    {['Chat', 'Voz', 'E-mail'].map(channel => (
                                        <label key={channel} className="flex items-center p-2 sm:p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/60 cursor-pointer transition-colors duration-150 border border-transparent has-[:checked]:bg-blue-50 has-[:checked]:border-blue-400 dark:has-[:checked]:bg-blue-900/40 dark:has-[:checked]:border-blue-500">
                                            <input type="radio" name="channel" value={channel} checked={info.channel === channel} onChange={handleChange} className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 border-neutral-300 focus:ring-blue-500" />
                                            <span className="ml-2 sm:ml-3 text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200">{channel}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Ecossistema</label>
                                <div className="flex flex-col space-y-2">
                                    {['Mercado Pago', 'Mercado Livre', 'SOS - Mercado Livre'].map(ecosystem => (
                                         <label key={ecosystem} className="flex items-center p-2 sm:p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/60 cursor-pointer transition-colors duration-150 border border-transparent has-[:checked]:bg-blue-50 has-[:checked]:border-blue-400 dark:has-[:checked]:bg-blue-900/40 dark:has-[:checked]:border-blue-500">
                                            <input type="radio" name="ecosystem" value={ecosystem} checked={info.ecosystem === ecosystem} onChange={handleChange} className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 border-neutral-300 focus:ring-blue-500" />
                                            <span className="ml-2 sm:ml-3 text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200">{ecosystem}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="px-4 sm:px-6 py-3 sm:py-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700 rounded-b-2xl">
                        <button type="submit" disabled={isLoading}
                            className="w-full flex justify-center items-center px-4 py-2.5 sm:py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors duration-200 text-sm sm:text-base">
                            {isLoading ? <Loader2 className="animate-spin w-4 h-4 sm:w-5 sm:h-5" /> : 'Iniciar Conversa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const App = () => {
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem('chatTheme_geminiStyle_v3');
    return storedTheme || 'light';
  });
  const [currentPage, setCurrentPage] = useState('home');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Sempre mostrar o modal de boas-vindas ao carregar a aplicação
    setShowWelcomeModal(true);
  }, []);

  const handleCloseWelcomeModal = () => {
    setShowWelcomeModal(false);
    // Removido localStorage para sempre mostrar o modal ao carregar
  };

  useEffect(() => {
    localStorage.setItem('chatTheme_geminiStyle_v3', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.setProperty('color-scheme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.setProperty('color-scheme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    if (!auth || !db) {
      console.error("Firebase Auth ou DB não estão disponíveis.");
      setIsAuthReady(true); 
      return;
    }
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        try {
          const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
          if (token) {
            await signInWithCustomToken(auth, token);
          } else {
            await signInAnonymously(auth);
          }
        } catch (error) {
          console.error("Erro no login anônimo/customizado:", error);
        }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !userId || !db) return;
    const q = query(collection(db, `artifacts/${appId}/users/${userId}/conversations`), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setConversations(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => { console.error("Erro ao carregar conversas:", error); });
    return () => unsubscribe();
  }, [isAuthReady, userId]);

  useEffect(() => {
    if (!isAuthReady || !userId || !currentConversationId || !db) {
      setMessages([]);
      return;
    }
    const q = query(collection(db, `artifacts/${appId}/users/${userId}/conversations/${currentConversationId}/messages`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgsFromDb = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setMessages(prevMsgs => {
            const prevMsgsMap = new Map(prevMsgs.map(msg => [msg.id, msg]));
            const updatedMessages = msgsFromDb.map(newMsg => {
                const existingMsg = prevMsgsMap.get(newMsg.id);
                return { 
                    ...newMsg, 
                    reasoningText: existingMsg?.reasoningText || '', 
                    isLoadingReasoning: existingMsg?.isLoadingReasoning || false,
                    isRegenerating: existingMsg?.id === newMsg.id ? (existingMsg.isRegenerating || false) : false, 
                };
            });
            const appLevelLoadingMessage = prevMsgs.find(msg => msg.id.startsWith('loading-') && msg.isLoading);
            if (appLevelLoadingMessage && isLoading) { 
                const finalMessages = updatedMessages.filter(um => um.id !== appLevelLoadingMessage.id);
                return [...finalMessages, appLevelLoadingMessage];
            }
            return updatedMessages;
        });
    }, (error) => { console.error("Erro ao carregar mensagens:", error); });
    return () => unsubscribe();
  }, [isAuthReady, userId, currentConversationId, isLoading]);
  
  const handleNavigateHomeTransition = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentPage('home');
      setCurrentConversationId(null);
      setTimeout(() => { setIsTransitioning(false); }, 60);
    }, 280);
  };

  const handleCreateNewChat = () => {
      setIsNewChatModalOpen(true);
  };

  const handleStartChatWithContext = async (chatInfo) => {
    if (!userId || !db) return;
    setIsLoading(true);
    setIsNewChatModalOpen(false);
    try {
        const newConvRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/conversations`), {
            title: `Atendimento ${chatInfo.customerName}`,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            context: chatInfo
        });

        setCurrentConversationId(newConvRef.id);
        setMessages([]);
        setCurrentPage('chat');
        
        const welcomeMessageContent = `Olá, ${chatInfo.agentName}. Sou Almail+, sua assistente de IA. Estou pronta para te ajudar a encontrar a melhor solução para o(a) cliente ${chatInfo.customerName} no canal de ${chatInfo.channel} para o ecossistema ${chatInfo.ecosystem}.`;

        const welcomeMessage = {
            role: 'assistant',
            content: welcomeMessageContent,
            timestamp: serverTimestamp(),
            feedback: null,
            reasoningText: '',
            isLoadingReasoning: false
        };
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/conversations/${newConvRef.id}/messages`), welcomeMessage);

        if (window.innerWidth < 768) {
            setIsMobileMenuOpen(false);
            setIsSidebarOpen(false);
        } else {
            setIsSidebarOpen(true);
        }
    } catch (error) {
        console.error("Erro ao criar nova conversa com contexto:", error);
    } finally {
        setIsLoading(false);
    }
};


  const handleSelectConversation = (id) => {
    if (currentConversationId === id && currentPage === 'chat') {
       if (window.innerWidth < 768) setIsMobileMenuOpen(false); 
       return;
    }
    setCurrentConversationId(id);
    setCurrentPage('chat');
    if (window.innerWidth < 768) {
      setIsMobileMenuOpen(false);
      setIsSidebarOpen(false); 
    } else {
      setIsSidebarOpen(true);
    }
  };

  const handleDeleteConversation = async (id) => {
    if (!userId || !db || !id) return;
    try {
      const msgsRef = collection(db, `artifacts/${appId}/users/${userId}/conversations/${id}/messages`);
      const msgsSnap = await getDocs(msgsRef);
      const deletePromises = msgsSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/conversations`, id));
      if (currentConversationId === id) { 
        setCurrentConversationId(null);
        setMessages([]);
      }
    } catch (error) { 
      console.error("Erro ao excluir conversa:", error); 
    }
  };

  const handleUpdateConversationTitle = (id, newTitle) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle, updatedAt: new Date() } : c)
      .sort((a, b) => (b.updatedAt?.toDate?.() || b.updatedAt || 0) - (a.updatedAt?.toDate?.() || a.updatedAt || 0)) 
    );
  };

  const prepareChatHistoryForAPI = (chatMsgs) => {
    if (!Array.isArray(chatMsgs)) return [];
    return chatMsgs
    .filter(msg => msg && typeof msg.content === 'string' && !msg.isLoading && !msg.isRegenerating) 
    .map(msg => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] }));
  }

  const callGeminiAPI = async (prompt, chatHistory, options = {}, context = null) => {
    if (typeof prompt !== 'string' || !prompt.trim()) return "Erro: Pergunta inválida.";
    const apiKey = "AIzaSyDsJZuixotkHJPxpLmdnMeLnKxdOC7ykLQ"; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    
    let systemPromptWithContext = SYSTEM_PROMPT;
    if (context) {
        systemPromptWithContext = systemPromptWithContext
            .replace(/\[Nome do Atendente\]/g, context.agentName || 'Atendente')
            .replace(/\[Nome do Cliente\]/g, context.customerName || 'Cliente')
            .replace(/\[Canal\]/g, context.channel || 'não especificado')
            .replace(/\[Ecossistema\]/g, context.ecosystem || 'não especificado');
    }

    let processedHistory = [...chatHistory];
    if (!options.isTitleGeneration) {
      const isWelcomeMessagePresent = chatHistory.length > 0 && chatHistory[0].role === 'model' && chatHistory[0].parts[0].text.startsWith("Olá!");
      if (!isWelcomeMessagePresent && !(processedHistory.length > 0 && processedHistory[0].role === 'user' && processedHistory[0].parts[0].text === systemPromptWithContext)) {
        processedHistory.unshift(
          { role: "user", parts: [{ text: systemPromptWithContext }] },
          { role: "model", parts: [{ text: `Entendido. Sou Almail+, sua especialista dedicada. Atendendo como ${context?.agentName || 'Atendente'} para o cliente ${context?.customerName || 'Cliente'} no canal ${context?.channel || 'não especificado'}. Estou pronto para ajudar.` }] } 
        );
      }
    }
    
    const payload = { contents: [...processedHistory, { role: "user", parts: [{ text: prompt }] }] };
    
    try {
      const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) { 
        const errBody = await response.json().catch(() => ({ error: { message: "Erro desconhecido ao processar resposta da API."} }));
        console.error("API Error Body:", errBody);
        throw new Error(`API Error: ${response.status}. ${JSON.stringify(errBody.error?.message || errBody)}`);
      }
      const result = await response.json();
      if (result.candidates?.[0]?.content?.parts?.[0]?.text) return result.candidates[0].content.parts[0].text;
      if (result.promptFeedback?.blockReason) return `Minha resposta foi bloqueada: ${result.promptFeedback.blockReason}. Por favor, reformule sua pergunta.`;
      return options.isTitleGeneration ? null : "Não foi possível obter uma resposta do Almail+. Tente novamente."; 
    } catch (error) {
      console.error("Falha na chamada da API Gemini:", error);
      return options.isTitleGeneration ? null : `Erro ao contatar o Almail+: ${error.message}`;
    }
  };

  const handleRegenerateResponse = async (assistantMessageId) => {
    if (!userId || !currentConversationId || !db) return;
    
    const currentMessagesSnapshot = [...messages]; 
    const assistantMessageIndex = currentMessagesSnapshot.findIndex(m => m.id === assistantMessageId);

    if (assistantMessageIndex > 0) { 
        let userPromptMessage = null;
        for (let i = assistantMessageIndex - 1; i >= 0; i--) {
            if (currentMessagesSnapshot[i].role === 'user') {
                userPromptMessage = currentMessagesSnapshot[i];
                break;
            }
        }

        if (userPromptMessage && userPromptMessage.content) {
            setIsLoading(true); 
            setMessages(prev => prev.map(m => m.id === assistantMessageId ? {...m, isRegenerating: true, feedback: null, reasoningText: '', isLoadingReasoning: false } : m));
            
            try {
                const convRef = doc(db, `artifacts/${appId}/users/${userId}/conversations`, currentConversationId);
                const convSnap = await getDoc(convRef);
                const conversationContext = convSnap.exists() ? convSnap.data().context : null;

                const historyUpToUserPrompt = currentMessagesSnapshot.slice(0, currentMessagesSnapshot.indexOf(userPromptMessage));
                const historyForRegeneration = prepareChatHistoryForAPI(historyUpToUserPrompt);
                
                const newAssistantText = await callGeminiAPI(userPromptMessage.content, historyForRegeneration, {}, conversationContext);
                
                const messageRef = doc(db, `artifacts/${appId}/users/${userId}/conversations/${currentConversationId}/messages`, assistantMessageId);
                await updateDoc(messageRef, { 
                    content: newAssistantText, 
                    updatedAt: serverTimestamp(), 
                    feedback: null, 
                    reasoningText: '', 
                    isLoadingReasoning: false 
                });
            } catch (error) {
                console.error("Erro ao regenerar resposta:", error);
                const messageRef = doc(db, `artifacts/${appId}/users/${userId}/conversations/${currentConversationId}/messages`, assistantMessageId);
                await updateDoc(messageRef, { content: `Erro ao regenerar: ${error.message}`, updatedAt: serverTimestamp() });
            } finally { 
                setIsLoading(false); 
                 setMessages(prev => prev.map(m => m.id === assistantMessageId ? {...m, isRegenerating: false } : m));
            }
        } else { 
            console.error("Não foi possível encontrar o prompt do usuário anterior para regeneração."); 
        }
    }
  };

  const handleFetchReasoning = async (assistantMessageId, assistantMessageContent) => {
    if (!userId || !currentConversationId || !db || !assistantMessageContent) return;
    
    setMessages(prev => prev.map(m => m.id === assistantMessageId ? {...m, isLoadingReasoning: true, reasoningText: '' } : m));
    
    try {
        const convRef = doc(db, `artifacts/${appId}/users/${userId}/conversations`, currentConversationId);
        const convSnap = await getDoc(convRef);
        const conversationContext = convSnap.exists() ? convSnap.data().context : null;

        const reasoningPrompt = `Como Almail+, explique seu raciocínio passo a passo para a seguinte resposta que você forneceu anteriormente, garantindo que sua explicação esteja alinhada com as FAQs do Mercado Livre/Pago: "${assistantMessageContent}"\n\nLembre-se de seguir TODAS as instruções de formatação, especialmente para listas, conforme detalhado anteriormente.\n\n${LIST_FORMATTING_INSTRUCTIONS}`;
        const reasoningResponse = await callGeminiAPI(reasoningPrompt, [], {isTitleGeneration: false}, conversationContext);
        setMessages(prev => prev.map(m => m.id === assistantMessageId ? {...m, isLoadingReasoning: false, reasoningText: reasoningResponse } : m));
    } catch (error) {
        console.error("Erro ao buscar raciocínio:", error);
        setMessages(prev => prev.map(m => m.id === assistantMessageId ? {...m, isLoadingReasoning: false, reasoningText: `Erro ao buscar raciocínio: ${error.message}` } : m));
    }
  };

  const handleSendMessage = async (userInput) => {
    if (!userId || !currentConversationId || !db || !userInput.trim()) return;

    setIsLoading(true); 
    
    const userMsg = { role: 'user', content: userInput.trim(), timestamp: serverTimestamp() };
    await addDoc(collection(db, `artifacts/${appId}/users/${userId}/conversations/${currentConversationId}/messages`), userMsg);
    
    const convRef = doc(db, `artifacts/${appId}/users/${userId}/conversations/${currentConversationId}`);
    await setDoc(convRef, { updatedAt: serverTimestamp() }, { merge: true });
    
    const loadingId = `loading-${Date.now()}`;
    setMessages(prev => [...prev, { id: loadingId, role: 'assistant', content: '', isLoading: true, timestamp: new Date() }]);
    
    try {
      const convSnap = await getDoc(convRef);
      const conversationContext = convSnap.exists() ? convSnap.data().context : null;

      const messagesSnapshot = await getDocs(query(collection(db, `artifacts/${appId}/users/${userId}/conversations/${currentConversationId}/messages`), orderBy('timestamp', 'asc')));
      const history = prepareChatHistoryForAPI(messagesSnapshot.docs.map(d => d.data()));
      
      const assistantText = await callGeminiAPI(userInput, history, {}, conversationContext);
      
      setMessages(prev => prev.filter(msg => msg.id !== loadingId));
      
      const assistantMsg = { role: 'assistant', content: assistantText, timestamp: serverTimestamp(), feedback: null, reasoningText: '', isLoadingReasoning: false };
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/conversations/${currentConversationId}/messages`), assistantMsg);

    } catch (error) {
      console.error("Erro ao enviar/receber mensagem:", error);
      setMessages(prev => prev.filter(msg => msg.id !== loadingId));
      const errorMsg = { role: 'assistant', content: `Desculpe, ocorreu um erro: ${error.message}`, timestamp: serverTimestamp(), feedback: null, reasoningText: '', isLoadingReasoning: false };
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/conversations/${currentConversationId}/messages`), errorMsg);
    } finally { 
        setIsLoading(false); 
    }
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const toggleSidebarDesktop = () => setIsSidebarOpen(!isSidebarOpen);

  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 768;
      if (isDesktop) {
        if (isMobileMenuOpen) setIsMobileMenuOpen(false);
      } 
    };
    if (window.innerWidth >= 768) {
        setIsSidebarOpen(true); 
    } else {
        setIsSidebarOpen(false);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  if (!isAuthReady) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100">
        <Sparkles size={52} className="mb-5 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        <div className="flex items-center text-lg">
         <Loader2 className="animate-spin mr-3.5" size={26} /> Carregando Almail+...
        </div>
      </div>
    );
  }

  const currentConvDetails = conversations.find(c => c.id === currentConversationId);

  return (
    <div className={`flex h-screen antialiased font-inter text-neutral-800 dark:text-neutral-100 bg-white dark:bg-neutral-900 selection:bg-blue-100 dark:selection:bg-blue-700/40 overflow-hidden`}>
       <WelcomeModal isOpen={showWelcomeModal} onClose={handleCloseWelcomeModal} />
       <NewChatModal 
            isOpen={isNewChatModalOpen}
            onClose={() => setIsNewChatModalOpen(false)}
            onStart={handleStartChatWithContext}
            isLoading={isLoading}
        />
        <CreditsModal isOpen={isCreditsModalOpen} onClose={() => setIsCreditsModalOpen(false)} />

      {currentPage === 'home' && (
        <div className={`w-full h-full transition-opacity duration-300 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          <HomePage 
            onStartChat={handleCreateNewChat} 
            theme={theme} 
            onToggleTheme={toggleTheme} 
            conversations={conversations} 
            onSelectConversation={handleSelectConversation} 
            onOpenCredits={() => setIsCreditsModalOpen(true)}
          />
        </div>
      )}

      {currentPage === 'chat' && (
        <div className={`flex flex-1 w-full h-full transition-opacity duration-300 ease-in-out ${isTransitioning ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <button 
            onClick={toggleMobileMenu} 
            className="md:hidden fixed top-4 left-4 z-30 p-2.5 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm text-neutral-600 dark:text-neutral-300 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ring-1 ring-neutral-300/70 dark:ring-neutral-700/70"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>

          {isMobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-40 flex">
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={toggleMobileMenu}></div>
              <div className="relative w-3/4 max-w-[280px] h-full shadow-xl"> 
                <Sidebar
                  conversations={conversations} onSelectConversation={handleSelectConversation}
                  onCreateNewChat={handleCreateNewChat} currentConversationId={currentConversationId}
                  onDeleteConversation={handleDeleteConversation} isSidebarOpen={true}
                  toggleSidebar={toggleMobileMenu}
                  onToggleTheme={toggleTheme} currentTheme={theme} userId={userId}
                  onNavigateHome={handleNavigateHomeTransition}
                  isLoading={isLoading}
                />
              </div>
            </div>
          )}

          <div className={`hidden md:flex ${isSidebarOpen ? 'md:w-[280px]' : 'md:w-[76px]'} transition-all duration-300 ease-in-out flex-shrink-0`}>
            <Sidebar
                conversations={conversations} onSelectConversation={handleSelectConversation}
                onCreateNewChat={handleCreateNewChat} currentConversationId={currentConversationId}
                onDeleteConversation={handleDeleteConversation} isSidebarOpen={isSidebarOpen}
                toggleSidebar={toggleSidebarDesktop} onToggleTheme={toggleTheme} currentTheme={theme} userId={userId}
                onNavigateHome={handleNavigateHomeTransition}
                isLoading={isLoading}
            />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden min-h-0"> 
            <ChatView
                currentConversation={currentConvDetails} messages={messages}
                onSendMessage={handleSendMessage} isLoading={isLoading} userId={userId}
                onUpdateConversationTitle={handleUpdateConversationTitle} theme={theme}
                onRegenerateResponse={handleRegenerateResponse} onFetchReasoning={handleFetchReasoning}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const WelcomeModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const improvements = [
    { icon: Zap, title: "Performance Aprimorada", text: "A inteligência artificial agora opera com maior agilidade e respostas mais rápidas." },
    { icon: BrainCircuit, title: "Inteligência de Ecossistema", text: "Agora a IA reconhece o ecossistema (MP, ML, SOS) para dar respostas especializadas." },
    { icon: ShieldCheck, title: "Fluxos de SOS Restritos", text: "No modo SOS, a IA segue rigorosamente apenas os fluxos permitidos para essa fila de atendimento, garantindo segurança e precisão de acordo com o ecossistema." },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-lg md:max-w-xl max-h-[95vh] overflow-y-auto transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-fade-in-scale">
        <div className="p-4 sm:p-6 text-center">
          <div className="flex justify-center items-center mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 mb-4 sm:mb-5 shadow-lg">
             <Sparkles className="text-white w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-800 dark:text-neutral-50 mb-2">Bem-vindo(a) ao Almail+!</h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mb-1">De <span className="font-semibold text-neutral-600 dark:text-neutral-300">Beta 1.4.0</span> para a <span className="font-semibold text-green-500">Versão Oficial 1.0.0</span></p>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 mb-4 sm:mb-6">O Almail evoluiu! Confira as novidades que preparamos para você:</p>
          
          <div className="space-y-3 sm:space-y-4 text-left my-4 sm:my-6">
            {improvements.map((item, index) => (
              <div key={index} className="flex items-start space-x-3 sm:space-x-4 p-2.5 sm:p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900/40 rounded-full">
                  <item.icon className="text-blue-600 dark:text-blue-400 w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-700 dark:text-neutral-200 text-sm sm:text-base">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700 rounded-b-2xl">
            <button onClick={onClose}
                className="w-full flex justify-center items-center px-4 py-2.5 sm:py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 text-sm sm:text-base">
                Começar a Usar
            </button>
        </div>
      </div>
    </div>
  );
};

const CreditsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const teamMembers = [
    { name: "Lucas de Sousa Carneiro", role: "Desenvolvedor do Prompt", icon: User },
    { name: "Lucas Candido Luiz", role: "Desenvolvedor Fullstack", icon: BrainCircuit, github: "https://github.com/boltreskh" },
    { name: "Vitória de Freitas Pinheiro", role: "Desenvolvedora do Prompt", icon: Building }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-lg md:max-w-xl max-h-[95vh] overflow-y-auto transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-fade-in-scale">
        <div className="p-4 sm:p-6 text-center">
          <div className="flex justify-center items-center mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-4 sm:mb-5 shadow-lg">
             <Award className="text-white w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-800 dark:text-neutral-50 mb-2">Créditos</h1>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 mb-4 sm:mb-6">Uma ferramenta de suporte inteligente desenvolvida com dedicação para o time de Mercado Livre e Mercado Pago.</p>
          
          <div className="space-y-3 sm:space-y-4 text-left my-4 sm:my-6">
            <div className="mb-3 sm:mb-4">
              <h3 className="font-semibold text-neutral-700 dark:text-neutral-200 mb-2 sm:mb-3 flex items-center justify-center text-sm sm:text-base">
                <User className="mr-2 w-4 h-4 sm:w-4.5 sm:h-4.5" />
                Equipe de Desenvolvimento
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {teamMembers.map((member, index) => (
                  <div key={index} className="flex items-center space-x-3 sm:space-x-4 p-2.5 sm:p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg">
                    <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900/40 rounded-full">
                      <member.icon className="text-blue-600 dark:text-blue-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="font-semibold text-neutral-700 dark:text-neutral-200 text-xs sm:text-sm truncate">{member.name}</h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{member.role}</p>
                    </div>
                    {member.github && (
                      <a 
                        href={member.github} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                        </svg>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-start space-x-3 sm:space-x-4 p-2.5 sm:p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
              <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900/40 rounded-full">
                <Building className="text-blue-600 dark:text-blue-400 w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-700 dark:text-neutral-200 text-sm sm:text-base">Apoio e Colaboração</h3>
                <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300">Time de Mercado Livre e Mercado Pago</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Concentrix</p>
              </div>
            </div>

            <div className="text-center pt-2">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Versão 1.0.0 • Desenvolvido com ❤️ para melhorar o atendimento
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700 rounded-b-2xl">
            <button onClick={onClose}
                className="w-full flex justify-center items-center px-4 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 shadow-md text-sm sm:text-base">
                <Award className="mr-2 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Fechar
            </button>
        </div>
      </div>
    </div>
  );
};

export default App;
