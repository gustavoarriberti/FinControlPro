# FinControl Pro — Sistema de Controle Financeiro Inteligente

Aplicação Web Fullstack responsiva em **Next.js 15 (App Router, TypeScript, Tailwind CSS)** projetada para controle completo de faturas de cartão de crédito, projeção automática de parcelamentos futuros, gestão de assinaturas/contas recorrentes e finanças compartilhadas em grupo familiar.

## Funcionalidades Implementadas

1. **Gestão Completa de Cartões e Ciclo de Faturas**
   - Controle de limites totais, comprometidos (considerando todas as parcelas futuras em aberto) e disponíveis.
   - Configuração de dia de fechamento e dia de vencimento por cartão.
   - Cálculo automático do mês de referência da fatura ao lançar uma compra e distribuição automática das parcelas (`1/N` até `N/N`) nos meses futuros.
   - Status de fatura: `OPEN` (Aberta), `CLOSED` (Fechada), `PARTIALLY_PAID` (Parcialmente Paga) e `PAID` (Quitada).

2. **Ingestão e Extração Inteligente de Faturas (`PDF`, `OFX`, `CSV`)**
   - **Parser Nativo `.OFX` e `.CSV`**: Leitura imediata de extratos estruturados (Nubank, Itaú, Inter, C6, Bradesco, Santander) com detecção de parcelas (`01/05`, `3/10`) e classificação automática de categoria por estabelecimento.
   - **Extrator Híbrido de `.PDF` com IA (Google Gemini 2.5 Flash)**: Suporta leitura inteligente de faturas em PDF de qualquer banco brasileiro + motor heurístico local integrado.
   - **Tela de Conciliação Prévias**: Revise e edite descrições, categorias, parcelas e privacidade antes de gravar os lançamentos na fatura.
   - **Arquivamento do Documento Original**: O arquivo da fatura fica vinculado e acessível diretamente no cartão.

3. **Quitação de Fatura com Comprovante**
   - Registro de pagamento total ou parcial, data da quitação, meio de pagamento e upload do **comprovante de pagamento (PDF ou imagem)**.

4. **Transações Recorrentes, Assinaturas e Alertas de Vencimento**
   - Gestão de despesas fixas (Aluguel, Condomínio, Energia, Internet, Streaming) e receitas recorrentes (Salários).
   - Central de notificações In-App + disparo de lembretes de vencimento por e-mail via **Resend API**.

5. **Finanças Compartilhadas (Grupo Familiar) & Privacidade Configurável**
   - Cada cartão, lançamento ou conta recorrente pode ser marcado como **`SHARED` (Compartilhado com a família)** ou **`PRIVATE` (Visível apenas para o criador)**.
   - Alternador rápido de visão de membro no cabeçalho para validar a privacidade entre membros da família.

6. **Categorias, Subcategorias e Tags Personalizadas**
   - Criação de categorias com cores, subcategorias e tags (`#essencial`, `#parcelado`, `#casa`, `#viagem-ferias`, etc.).

---

## Como Executar Localmente

### 1. Instalar dependências e iniciar o servidor de desenvolvimento
```bash
npm install
npm run dev
```
Acesse `http://localhost:3000`.

> O sistema já inicia pronto para uso com persistência local automática (`data/store.json` e `public/uploads/`) e dados iniciais de demonstração.

### 2. (Opcional) Subir PostgreSQL com Docker e Prisma
```bash
cp .env.example .env
docker compose up -d
npx prisma generate
npx prisma db push
```

### 3. (Opcional) Variáveis de Ambiente (`.env`)
- `GEMINI_API_KEY`: Habilita extração via LLM Google Gemini 2.5 Flash para PDFs complexos.
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`: Habilita upload dos PDFs de faturas e comprovantes diretamente no Supabase Storage.
- `RESEND_API_KEY`: Habilita o envio real de e-mails de alerta de vencimento.
