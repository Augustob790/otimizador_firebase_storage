# 🚀 Otimizador e Moderador de Mídia com Firebase

Este projeto implementa uma solução completa e automatizada para gerenciar uploads de mídia (imagens e vídeos) no Firebase. Ele utiliza Cloud Functions para otimizar, validar e moderar o conteúdo em tempo real, garantindo a performance, segurança e integridade da sua aplicação. O front-end inclui validações no cliente para uma melhor experiência do usuário (UX).

-----

## 📖 Tabela de Conteúdos

  - [✨ Principais Funcionalidades](https://www.google.com/search?q=%23-principais-funcionalidades)
  - [🛠️ Arquitetura da Solução](https://www.google.com/search?q=%23%EF%B8%8F-arquitetura-da-solu%C3%A7%C3%A3o)
  - [📚 Stack Tecnológica](https://www.google.com/search?q=%23-stack-tecnol%C3%B3gica)
  - [📁 Estrutura do Projeto](https://www.google.com/search?q=%23-estrutura-do-projeto)
  - [⚙️ Guia de Instalação e Deploy](https://www.google.com/search?q=%23%EF%B8%8F-guia-de-instala%C3%A7%C3%A3o-e-deploy)
  - [🔧 Opcional: Configurando a Região e Outras Opções da Função](https://www.google.com/search?q=%23-opcional-configurando-a-regi%C3%A3o-e-outras-op%C3%A7%C3%B5es-da-fun%C3%A7%C3%A3o)
  - [🚀 Deploy com um Comando (Bash Script)](https://www.google.com/search?q=%23-deploy-com-um-comando-bash-script)
  - [📊 Logs e Cenários de Uso](https://www.google.com/search?q=%23-logs-e-cen%C3%A1rios-de-uso)
  - [🤝 Contribuições](https://www.google.com/search?q=%23-contribui%C3%A7%C3%B5es)
  - [📄 Licença](https://www.google.com/search?q=%23-licen%C3%A7a)

## ✨ Principais Funcionalidades

### Back-end (Cloud Functions)

  - **Otimização Automática:**
      - **Imagens:** Redimensiona para no máximo `1280x1280px` e comprime para `JPEG` de alta qualidade.
      - **Vídeos:** Reduz a resolução para `720p` e compacta o bitrate para otimizar o carregamento.
  - **Validação e Segurança:**
      - Bloqueia arquivos de tamanho zero ou com *mimetype* inconsistente.
      - Rejeita arquivos com nomes suspeitos (contendo palavras como `virus`, `malware`).
  - **Limpeza Automatizada:**
      - Se um arquivo é rejeitado, ele é **automaticamente excluído** do Storage.
      - O post correspondente na coleção `posts` do Firestore é deletado.
      - Um log detalhado do evento é salvo na coleção `media_moderation_logs`.

### Front-end (Firebase Hosting)

  - **Validação no Cliente:**
      - Bloqueia o envio de arquivos com mais de **10MB**.
      - Permite apenas os tipos de arquivo configurados (`JPG`, `PNG`, `MP4`, etc.).
  - **Feedback em Tempo Real:**
      - Exibe mensagens claras de erro ou sucesso e uma barra de progresso.

## 🛠️ Arquitetura da Solução

A solução é centrada em uma única Cloud Function (`processUploadedMedia`) que orquestra todo o fluxo de trabalho.

1.  **Gatilho (Trigger):** A função é acionada pelo evento `storage.object.finalize`, que ocorre sempre que um novo arquivo é enviado para o Firebase Storage.

2.  **Validações Iniciais (Guards):** Antes de qualquer processamento, a função faz verificações rápidas para evitar trabalho desnecessário:

      - Verifica se o arquivo já foi otimizado (através do metadado `optimized: true`).
      - Garante que o arquivo está na pasta `uploads/`, ignorando outras localizações.

3.  **Bloco de Validação e Moderação (`try...catch`):**

      - **Fluxo de Sucesso (`try`):**
        1.  **Validação de Metadados:** Verifica tamanho do arquivo, nomes proibidos e correspondência entre extensão e *mimetype*.
        2.  **Otimização:** O arquivo é baixado, processado com `sharp` (imagens) ou `ffmpeg` (vídeos) e otimizado.
        3.  **Re-upload:** A versão otimizada substitui o arquivo original, recebendo o metadado `optimized: true`.
      - **Fluxo de Falha (`catch`):**
        1.  Se qualquer etapa falhar, a execução salta para o bloco `catch`.
        2.  O arquivo problemático é **deletado** do Storage.
        3.  O post correspondente no Firestore é localizado e **deletado**.
        4.  Um log detalhado com o motivo da falha é gravado na coleção `media_moderation_logs`.

## 📚 Stack Tecnológica

  - **`firebase-functions`**: SDK para criar e gerenciar as Cloud Functions.
  - **`firebase-admin`**: Permite interagir com serviços do Firebase (Storage, Firestore) com privilégios de administrador.
  - **`sharp`**: Biblioteca de alta performance para processamento de imagens.
  - **`fluent-ffmpeg`**: Wrapper amigável para a ferramenta `FFmpeg` para manipulação de vídeos.

## 📁 Estrutura do Projeto

```
.
├── functions/
│   ├── index.js        # Lógica principal da Cloud Function
│   ├── package.json
│   └── node_modules/
├── public/
│   ├── index.html      # Front-end da aplicação de teste
│   └── (outros assets como css, js)
├── .firebaserc         # Configuração do projeto Firebase
├── firebase.json       # Define regras de deploy para Hosting e Functions
└── README.md           # Esta documentação
```

## ⚙️ Guia de Instalação e Deploy

Siga estes passos para configurar e publicar o projeto do zero.

### Passo 0: Pré-requisitos

  - [Node.js](https://nodejs.org/) (versão LTS recomendada)
  - Conta no [Firebase](https://firebase.google.com/)
  - Firebase CLI instalado globalmente:
    ```bash
    npm install -g firebase-tools
    ```

### Passo 1: Criar e Configurar o Projeto Firebase

1.  Crie um projeto no [Console do Firebase](https://console.firebase.google.com/).
2.  Faça o **Upgrade para o Plano "Blaze"** (Pague conforme o uso). No menu ⚙️ \> "Uso e faturamento", modifique o plano. Isso é **necessário** para usar o Firebase Storage. O nível gratuito é generoso e você provavelmente não pagará nada para testar.

### Passo 2: Configurar o Projeto Localmente

1.  Clone este repositório e navegue até a pasta do projeto.
2.  Faça o login no Firebase e inicialize o projeto:
    ```bash
    firebase login
    firebase init
    ```
      - Durante a inicialização:
          - Selecione **Functions** e **Hosting** (use as setas e a barra de espaço).
          - Escolha "Use an existing project" e selecione o projeto que você criou.
          - Para Functions, selecione JavaScript.
          - Para Hosting, use o diretório padrão (`public`).

### Passo 3: Adicionar as Credenciais ao `index.html`

1.  No Console do Firebase, vá para **Configurações do projeto (⚙️)**.

2.  Na aba "Geral", role até "Seus apps" e clique no ícone `</>` para criar um "App da Web".

3.  O Firebase exibirá um objeto `firebaseConfig`. Copie este objeto.

4.  Abra o arquivo `public/index.html` e cole suas credenciais no local indicado:

    ```html
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
        measurementId: ""
      };
      // ... resto do script
    </script>
    ```

### Passo 4: Instalar Dependências e Habilitar APIs

1.  Instale as dependências do back-end:
    ```bash
    cd functions
    npm install
    ```
    
### Passo 5: Publicar o Projeto (Deploy)

1.  Volte para a pasta raiz do projeto.
2.  Para subir **apenas as Cloud Functions**:
    ```bash
    firebase deploy --only functions
    ```
3.  Para subir **apenas o seu site** (`index.html`):
    ```bash
    firebase deploy --only hosting
    ```
4.  Para subir **tudo de uma vez**:
    ```bash
    firebase deploy
    ```

Ao final, o terminal fornecerá a URL do seu site.

### 🔧 Opcional: Configurando a Região e Outras Opções da Função

Por padrão, as Cloud Functions são implantadas na região `us-central1`. Para otimizar a performance e reduzir a latência, é **altamente recomendado** que você execute suas funções na mesma região onde seu banco de dados Firestore e seu bucket do Cloud Storage estão localizados. Para projetos no Brasil, a região ideal geralmente é `southamerica-east1` (São Paulo).

Você pode definir a região e outras opções de execução (como memória e tempo limite) diretamente no código da sua função.

#### Para JavaScript (`functions/index.js` - Sintaxe de 1ª Geração)

Você pode encadear os métodos `.region()` e `.runWith()` antes de definir o gatilho.

```javascript
// functions/index.js

const functions = require("firebase-functions");
// ...outros imports

// DEPOIS (com região e opções):
exports.processUploadedMedia = functions
  .region("southamerica-east1") // <-- Define a região aqui
  .runWith({ timeoutSeconds: 300, memory: "1GiB" }) // <-- Define memória e timeout
  .storage
  .object()
  .onFinalize(async (object) => {
    // ... seu código de otimização e moderação continua aqui
  });
```

#### Para TypeScript (`functions/src/index.ts` - Sintaxe de 2ª Geração)

A sintaxe mais moderna (Geração 2), comum em projetos TypeScript, permite passar um objeto de configuração com todas as opções.

```typescript
// functions/src/index.ts (ou main.ts)

import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as logger from "firebase-functions/logger";

export const processUploadedMedia = onObjectFinalized({
    // Opções de configuração da função
    cpu: 1,
    memory: "1GiB",
    timeoutSeconds: 300,
    region: "southamerica-east1", // <-- Defina a região e outras opções aqui
  }, async (event) => {
    
    const filePath = event.data.name;
    logger.info(`Novo arquivo ${filePath} detectado para processamento.`);

    // ... sua lógica de otimização e moderação aqui
});
```

## 🚀 Deploy com um Comando (Bash Script)

Para facilitar o deploy, você pode criar um script `deploy.sh` na raiz do seu projeto.

**deploy.sh**

```bash
#!/bin/bash

# Script para instalar dependências e fazer deploy no Firebase

echo "🚀 Iniciando processo de deploy..."

# Navega para a pasta de functions e instala as dependências
echo "📦 Instalando dependências das Cloud Functions..."
cd functions
npm install
cd ..

# Faz o deploy de tudo (Functions e Hosting)
echo "☁️  Publicando no Firebase..."
firebase deploy

echo "✅ Deploy concluído com sucesso!"
```

Para usá-lo, primeiro dê permissão de execução e depois rode o script:

```bash
chmod +x deploy.sh
./deploy.sh
```

## 📊 Logs e Cenários de Uso

Você pode acompanhar a execução da sua função em **Firebase Console \> Build \> Functions \> Registros**.

#### Cenário 1: Upload de Sucesso

  - **No Storage:** O tamanho do arquivo diminui.
  - **Nos Logs da Função:**
    ```
    [uploads/minha-foto.jpg] Iniciando validação e moderação.
    [uploads/minha-foto.jpg] Validação concluída com sucesso.
    [uploads/minha-foto.jpg] Iniciando otimização.
    [uploads/minha-foto.jpg] Otimização e upload concluídos.
    ```

#### Cenário 2: Rejeição por Nome Inválido

  - **No Firestore (coleção `media_moderation_logs`):** Um novo documento será criado.

    ```json
    {
      "mediaPath": "uploads/virus.jpg",
      "deletedFromStorage": true,
      "postDeleted": true,
      "reason": "Nome de arquivo suspeito detectado.",
      "timestamp": "June 29, 2025 at 8:15:30 PM UTC-3"
    }
    ```

## 🤝 Contribuições

Contribuições são bem-vindas\! Sinta-se à vontade para abrir uma *issue* para relatar bugs ou sugerir melhorias. Se quiser adicionar uma nova funcionalidade, por favor, abra uma *issue* para discussão antes de enviar um *pull request*.

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.
