🚀 Otimizador e Moderador de Mídia com Firebase
Este projeto implementa uma solução completa e automatizada para gerenciar uploads de mídia (imagens e vídeos) no Firebase. Ele utiliza Cloud Functions para otimizar, validar e moderar o conteúdo em tempo real, garantindo a performance, segurança e integridade da sua aplicação. O front-end inclui validações no cliente para uma melhor experiência do usuário (UX).

✨ Principais Funcionalidades
Back-end (Cloud Functions)
Otimização Automática:

Imagens: Redimensiona para no máximo 1280x1280px e comprime para JPEG.

Vídeos: Reduz a resolução para 720p e compacta o bitrate.

Validação e Segurança:

Bloqueia arquivos de tamanho zero ou com mimetype inconsistente.

Rejeita arquivos com nomes suspeitos (contendo palavras como virus, malware).

Moderação de Conteúdo:

Utiliza a Google Cloud Vision API para analisar imagens e bloquear conteúdo adulto, violento ou impróprio.

Limpeza Automatizada:

Se um arquivo é rejeitado, ele é automaticamente excluído do Storage.

O post correspondente na coleção posts do Firestore é deletado.

Um log detalhado do evento é salvo na coleção media_moderation_logs.

Front-end (Firebase Hosting)
Validação no Cliente:

Bloqueia o envio de arquivos com mais de 10MB.

Permite apenas os tipos de arquivo configurados (JPG, PNG, MP4, etc.).

Feedback em Tempo Real:

Exibe mensagens claras de erro ou sucesso e uma barra de progresso.

🛠️ Explicação Técnica da Solução
A solução é centrada em uma única Cloud Function (processUploadedMedia) que orquestra todo o fluxo de trabalho.

Gatilho (Trigger): A função é acionada pelo evento storage.object.finalize, que ocorre sempre que um novo arquivo é enviado com sucesso para o Firebase Storage.

Validações Iniciais (Guards): Antes de qualquer processamento, a função faz verificações rápidas para evitar trabalho desnecessário:

Verifica se o arquivo já foi otimizado (através de um metadado optimized: true).

Garante que o arquivo está na pasta uploads/, ignorando outras localizações.

Bloco de Validação e Moderação (try):

A função entra em um bloco try...catch, onde todas as operações de risco são executadas.

Validação de Metadados: Verifica se o arquivo tem tamanho zero, se o nome contém palavras proibidas ou se a extensão não corresponde ao tipo de conteúdo (mimetype).

Moderação com Vision API: Se o arquivo é uma imagem, ele é enviado para a Google Cloud Vision API para uma análise de "SafeSearch". Se o conteúdo for classificado como adulto ou violento, a função lança um erro.

Fluxo de Sucesso:

Se todas as validações passarem, o arquivo é baixado para o ambiente temporário da função.

sharp (para imagens) ou ffmpeg (para vídeos) processam e otimizam o arquivo.

A versão otimizada é enviada de volta para o Storage, substituindo o arquivo original no mesmo caminho e adicionando o metadado optimized: true.

Fluxo de Falha (catch):

Se qualquer etapa dentro do bloco try falhar (seja uma validação, a moderação da Vision ou um erro de decodificação do sharp/ffmpeg), a execução pula para o bloco catch.

O arquivo problemático é deletado do Storage.

A função busca e deleta o post correspondente no Firestore.

Um log detalhado é gravado na coleção media_moderation_logs com o motivo exato da falha.

📚 Bibliotecas Utilizadas
firebase-functions: SDK principal para criar e gerenciar as Cloud Functions.

firebase-admin: Permite que a função interaja com outros serviços do Firebase (Storage, Firestore) com privilégios de administrador.

@google-cloud/vision: Cliente oficial da Google para se conectar à API Cloud Vision e realizar a análise de conteúdo.

sharp: Biblioteca de alta performance para processamento de imagens, usada para redimensionar e comprimir.

fluent-ffmpeg: Um wrapper amigável para a ferramenta FFmpeg, facilitando a manipulação e re-codificação de vídeos.

⚙️ Guia de Instalação e Deploy
Siga estes passos para configurar e publicar o projeto do zero.

Passo 1: Criar um Projeto no Firebase
Crie sua conta: Acesse o site do Firebase e crie uma conta gratuita.

Crie um projeto: No console, clique em "Adicionar projeto".

Faça o Upgrade para o Plano "Blaze": No menu ⚙️ > "Uso e faturamento", modifique o plano para Blaze (Pague conforme o uso). Isto é necessário para usar a Vision API. O nível gratuito é generoso e você provavelmente não pagará nada para testar.

Passo 2: Configurar o Projeto Localmente
Pré-requisitos: Instale o Node.js e o Firebase CLI (npm install -g firebase-tools).

Download do Código: Baixe e descompacte os arquivos deste projeto em uma pasta.

Login e Inicialização: No terminal, dentro da pasta do projeto, rode os seguintes comandos:

firebase login
firebase init 

Ao inicializar, selecione Functions e Hosting com as setas e a barra de espaço. Escolha "Use an existing project" e selecione o projeto que você criou. Configure o Hosting para usar a pasta public.

Passo 3: Adicionar as Credenciais ao index.html
No Console do Firebase, vá para Configurações do projeto (⚙️).

Na aba "Geral", role até "Seus apps" e clique no ícone </> para criar um "App da Web".

O Firebase exibirá um objeto firebaseConfig. Copie este objeto.

Abra o arquivo public/index.html no seu editor. Encontre o local indicado e cole suas credenciais, como no exemplo abaixo:

<script>
    // =======================================================================================
    // COLE A CONFIGURAÇÃO DO SEU PROJETO FIREBASE AQUI
    // =======================================================================================
    const firebaseConfig = {
        apiKey: "AIzaSy...",
        authDomain: "seu-projeto.firebaseapp.com",
        projectId: "seu-projeto",
        storageBucket: "seu-projeto.appspot.com",
        messagingSenderId: "1234567890",
        appId: "1:1234567890:web:abcdef123456"
    };

    // Inicializa o Firebase
    firebase.initializeApp(firebaseConfig);
    const storage = firebase.storage();

    // ... resto do script
</script>

Passo 4: Instalar Dependências e Habilitar APIs
Instale as dependências do back-end. No terminal, rode:

cd functions
npm install

Habilite a Vision API: Vá para o Google Cloud Console, procure por "Cloud Vision API" e clique em "Ativar".

Passo 5: Publicar o Projeto (Deploy)
Para subir as Cloud Functions:

firebase deploy --only functions

Para subir o seu site (index.html):

firebase deploy --only hosting

Ao final, o terminal te dará a URL do seu site.

📊 Prints e Logs do Funcionamento
Não é possível gerar prints, mas aqui estão exemplos do que você verá nos logs e no seu banco de dados, que comprovam o funcionamento.

Cenário 1: Upload de Sucesso
No Firebase Storage, você verá o tamanho do arquivo diminuir. Nos logs da sua Cloud Function (em Build > Functions > Registros), você verá:

[uploads/minha-foto.jpg] Iniciando validação e moderação.
[uploads/minha-foto.jpg] Validação concluída com sucesso.
[uploads/minha-foto.jpg] Iniciando otimização.
[uploads/minha-foto.jpg] Otimização e upload concluídos.

Cenário 2: Rejeição por Nome Inválido
Ao enviar um arquivo chamado virus.jpg, você verá no Firestore, na coleção media_moderation_logs, um novo documento como este:

{
  "mediaPath": "uploads/virus.jpg",
  "deletedFromStorage": true,
  "postDeleted": true,
  "reason": "Nome de arquivo suspeito detectado.",
  "timestamp": "June 29, 2025 at 8:15:30 PM UTC-3"
}

Cenário 3: Rejeição pela Vision API
Ao enviar uma imagem considerada inadequada, o log de moderação será similar a este:

{
  "mediaPath": "uploads/imagem-inapropriada.jpg",
  "deletedFromStorage": true,
  "postDeleted": false,
  "reason": "Conteúdo inapropriado detectado (Adult: VERY_LIKELY, Violence: UNLIKELY, Racy: LIKELY)",
  "timestamp": "June 29, 2025 at 8:20:10 PM UTC-3"
}
