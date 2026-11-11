# Especificação - Document Management System

## 1. Objetivo

Permitir que um usuário envie, liste e baixe documentos, armazenando os arquivos no filesystem local e mantendo seus metadados em memória.

## 2. Escopo

### Dentro do escopo

- Envio de um documento por requisição, com validação de tipo e tamanho.
- Armazenamento dos bytes localmente em `backend/storage` usando Multer com `diskStorage`.
- Registro em memória dos metadados necessários para listar e localizar documentos.
- Listagem e download dos documentos associados à identidade simulada configurada para a aplicação.
- Interface React para upload, listagem e download, com estados de carregamento, vazio e erro.

### Fora do escopo

- Autenticação, cadastro de usuários e isolamento seguro entre usuários reais. O MVP usa uma identidade simulada e não deve ser considerado um sistema multiusuário seguro.
- Exclusão, edição, busca, compartilhamento ou versionamento de documentos.
- Banco de dados, persistência de metadados entre reinícios, armazenamento externo ou em nuvem.
- Upload de múltiplos arquivos em uma única requisição.

### Estado atual

O repositório contém apenas um seed: o backend implementa `GET /health`; os endpoints de documentos e a experiência funcional no frontend ainda não estão implementados. Esta especificação descreve o comportamento desejado do MVP, não funcionalidades já disponíveis.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um único arquivo no campo multipart `file` para `POST /upload`. |
| RF-02 | O sistema aceita arquivos PDF, DOC, DOCX, JPEG e PNG, limitados a 10 MiB (10 × 1024 × 1024 bytes). Arquivos ausentes, de tipo não permitido ou acima do limite são rejeitados com erro documentado. |
| RF-03 | Após validar o arquivo, o sistema grava seu conteúdo em `backend/storage`, usando um nome físico gerado pela aplicação, e cria metadados com identificador único e data/hora UTC. O nome original nunca é usado como caminho de armazenamento. |
| RF-04 | O sistema associa cada documento ao usuário simulado configurado. A identidade é obtida de `DMS_DEFAULT_OWNER`; se não definida, usa `local-user`. Não há autenticação no MVP. |
| RF-05 | O usuário pode listar os metadados dos documentos associados à identidade simulada atual. Uma lista sem documentos retorna sucesso com coleção vazia. |
| RF-06 | O usuário pode baixar um documento pelo identificador se os metadados existirem e pertencerem à identidade simulada atual. A resposta é binária e sugere o nome original como nome de download, tratado com segurança. |
| RF-07 | O sistema retorna erros consistentes para requisições inválidas, arquivo grande demais, documento indisponível e falhas internas, sem expor caminhos locais ou detalhes internos. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são armazenados exclusivamente no filesystem local em `backend/storage`, por meio do Multer configurado com `diskStorage`. Não são usados provedores externos. |
| RNF-02 | Os metadados permanecem em memória durante a execução do processo e são perdidos ao reiniciá-lo. Arquivos remanescentes sem metadados não aparecem na listagem e não podem ser baixados; sua limpeza automática não faz parte deste MVP. |
| RNF-03 | O backend usa Node.js e Express em CommonJS; o frontend usa React e Vite em ESM; o código é JavaScript. A porta do backend é configurada por `PORT`, com padrão `3000`. |
| RNF-04 | O backend segue o fluxo `routes -> controllers -> services -> repositories`. Rotas delegam aos controllers; regras de negócio ficam nos services; acesso a arquivos e metadados fica nos repositories. |
| RNF-05 | O nome físico do arquivo é gerado pela aplicação e não contém o nome original fornecido pelo cliente. Caminhos internos nunca são retornados ao cliente. O nome original é preservado apenas como metadado e deve ser codificado/sanitizado ao compor `Content-Disposition`. |
| RNF-06 | O frontend acessa a API com `fetch` pelo prefixo `/api`. O proxy atual do Vite encaminha `/api` ao backend e remove esse prefixo; por isso, as rotas do backend são `/upload` e `/documents`, sem `/api`. |
| RNF-07 | O backend utiliza o runner nativo `node:test` para cobrir regras e contratos, incluindo upload, listagem, download, validações e falhas de filesystem. |

## 5. Modelo de dados (metadados do documento)

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único UUID gerado pelo servidor. |
| `originalName` | string | Nome original enviado pelo cliente; usado para exibição e nome sugerido no download, nunca como caminho local. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data/hora UTC do upload em formato ISO 8601. |
| `owner` | string | Identificador da identidade simulada (`DMS_DEFAULT_OWNER`, ou `local-user` por padrão). |

O repositório pode manter internamente um nome de armazenamento gerado e a informação necessária para servir o arquivo. Esses dados não fazem parte do modelo público da API. Os metadados são mantidos em uma estrutura em memória; não existe persistência nem recuperação automática após reiniciar o processo.

## 6. Contratos de API

### Formato comum de erro

Respostas de erro usam `application/json`:

```json
{
  "error": {
    "code": "INVALID_FILE_TYPE",
    "message": "O tipo de arquivo não é permitido."
  }
}
```

O valor de `code` é estável para clientes; `message` é uma mensagem legível em português. Respostas não devem incluir stack trace, caminhos de arquivos ou detalhes internos.

### `POST /upload`

- **Entrada:** `multipart/form-data` com exatamente um arquivo no campo `file`.
- **Validação:** aceita PDF, DOC, DOCX, JPEG e PNG, até 10 MiB. Arquivos devem corresponder à allowlist de extensão e tipo MIME; validação de extensão/MIME não substitui antivírus e não é garantia de conteúdo seguro.
- **Sucesso:** `201 Created`, `Content-Type: application/json`.
- **Corpo de sucesso:** objeto com os metadados públicos do documento.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "originalName": "relatorio.pdf",
  "size": 2048,
  "uploadedAt": "2026-11-11T12:00:00.000Z",
  "owner": "local-user"
}
```

- **Erros:** `400 MISSING_FILE` se o campo estiver ausente; `400 INVALID_FILE_TYPE` se o tipo não for permitido; `413 FILE_TOO_LARGE` se exceder o limite; `500 INTERNAL_ERROR` em falha inesperada de gravação.

### `GET /documents`

- **Entrada:** nenhuma.
- **Sucesso:** `200 OK`, `Content-Type: application/json`; lista somente documentos da identidade simulada atual, ordenada por `uploadedAt` decrescente.
- **Corpo de sucesso:** `{ "documents": [ ...metadados públicos... ] }`. Sem resultados, retorna `{ "documents": [] }`.
- **Erros:** `500 INTERNAL_ERROR` em falha inesperada ao consultar o repositório.

### `GET /documents/:id/download`

- **Entrada:** `id` UUID na URL.
- **Sucesso:** `200 OK`, conteúdo binário, `Content-Type` correspondente ao tipo validado e `Content-Disposition: attachment` com o nome original devidamente codificado. A resposta não inclui metadados JSON.
- **Erros:** `404 DOCUMENT_NOT_FOUND` se o id não existir, não tiver metadados disponíveis após reinício ou não pertencer à identidade simulada atual; `500 INTERNAL_ERROR` em falha inesperada de leitura.

Retornar `404` também para documentos de outra identidade evita revelar se um identificador existe. No estado atual sem autenticação, `owner` é uma configuração compartilhada pelo processo, não uma identidade fornecida por sessão.

## 7. Decisões arquiteturais

- Backend em Clean Architecture simples: `routes -> controllers -> services -> repositories`.
- Rotas do Express definem os caminhos e encaminham as requisições; controllers validam a fronteira HTTP e formatam respostas; services aplicam regras de negócio; repositories encapsulam filesystem e coleção de metadados em memória.
- Multer com `diskStorage` grava exclusivamente em `backend/storage`; o nome físico do arquivo é gerado no servidor. A aplicação não concatena entrada do usuário a caminhos locais.
- Metadados mantidos em memória nesta fase. Reiniciar o processo perde os metadados mesmo que os arquivos permaneçam no disco. Arquivos órfãos não são listados nem servidos e sua remoção é futura.
- O dono é simulado com `DMS_DEFAULT_OWNER`, padrão `local-user`; não implementar login ou apresentar a configuração como autenticação/isolamento de segurança.
- Frontend React organizado por componentes, páginas e serviços, usando `fetch` no prefixo `/api` via proxy Vite.
- Configurações operacionais via variáveis de ambiente, incluindo `PORT` e `DMS_DEFAULT_OWNER`; diretório de armazenamento permanece local em `backend/storage`.

## 8. Plano de execução

As etapas abaixo descrevem implementação futura. Esta entrega contém apenas a especificação; não inclui execução ou criação dos arquivos de backend e frontend.

1. Implementar configuração do backend, identidade simulada, validação de arquivo e armazenamento local com Multer `diskStorage`, incluindo limite de tamanho e allowlist.
2. Implementar repository de arquivos e metadados em memória, usando ids UUID e nomes físicos gerados; cobrir falhas de leitura/gravação e a ausência de metadados após reinício.
3. Implementar services, controllers e rotas para upload, listagem e download, com formato de erro consistente e testes de contrato usando `node:test`.
4. Implementar no frontend os fluxos de envio, listagem e download, com estados de carregamento, lista vazia e erros, consumindo `/api` pelo proxy do Vite.
5. Validar a integração de ponta a ponta e os critérios de aceite: upload válido e inválido, limite de tamanho, listagem por owner, download byte a byte, id inexistente e erros de filesystem; confirmar que a API nunca expõe caminhos locais.