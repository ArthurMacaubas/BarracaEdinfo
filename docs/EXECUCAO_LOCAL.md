# Executar a Barraca Agostina localmente

## 1. Pré-requisitos

Instale **Node.js 22 LTS** e `pnpm`. O projeto usa TypeScript, Vite, Express e MySQL/MariaDB. Para executar a operação com dados persistentes, tenha também um servidor MySQL ou MariaDB disponível. [1] [2]

| Requisito | Uso no projeto |
| --- | --- |
| Node.js 22 LTS | Executa o servidor Express, Vite e os scripts TypeScript. |
| pnpm | Instala as dependências travadas no `pnpm-lock.yaml`. |
| MySQL/MariaDB | Persiste produtos, pedidos, metas, PIX, patrocinadores e auditoria. |
| Arduino IDE | Necessária apenas para gravar o sketch do controlador físico. |

## 2. Preparar o Ubuntu ou Raspberry Pi

Atualize o sistema e instale o Git e o MariaDB:

```bash
sudo apt update
sudo apt install -y git mariadb-server
sudo systemctl enable --now mariadb
```

Instale o **Node.js 22 LTS** pelo método oficial da distribuição escolhida e confirme a instalação. Depois habilite o gerenciador de pacotes incluído no Node:

```bash
node --version
corepack enable
pnpm --version
```

Os dois últimos comandos devem mostrar uma versão do Node `v22.x` e uma versão do `pnpm`. Se `pnpm` não aparecer, feche e abra o terminal após executar `corepack enable`.

## 3. Criar banco e usuário da aplicação

Abra o console do MariaDB:

```bash
sudo mariadb
```

Execute os comandos abaixo, trocando `UMA_SENHA_FORTE` por uma senha exclusiva da aplicação:

```sql
CREATE DATABASE barraca_agostina CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'barraca'@'localhost' IDENTIFIED BY 'UMA_SENHA_FORTE';
GRANT ALL PRIVILEGES ON barraca_agostina.* TO 'barraca'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 4. Clonar e instalar

No terminal, execute:

```bash
git clone https://github.com/ArthurMacaubas/BarracaEdinfo.git
cd BarracaEdinfo
corepack enable
pnpm install
```

Se for conectar o Arduino pela porta USB, permita a compilação do driver serial nativo quando o `pnpm` solicitar. No `pnpm approve-builds`, selecione `@serialport/bindings-cpp`; em seguida, execute `pnpm rebuild @serialport/bindings-cpp`.

## 5. Criar o arquivo `.env`

Na raiz do projeto, crie o arquivo `.env` com valores locais. **Não envie esse arquivo ao GitHub.**

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL="mysql://barraca:UMA_SENHA_FORTE@127.0.0.1:3306/barraca_agostina"
JWT_SECRET="troque-por-uma-chave-longa-e-aleatoria"
HARDWARE_SERIAL_PORT="/dev/ttyACM0"
HARDWARE_SERIAL_BAUD_RATE="115200"

# Necessários somente se você for usar login OAuth da plataforma Manus localmente.
VITE_APP_ID=""
OAUTH_SERVER_URL=""
OWNER_OPEN_ID=""
```

> Sem `DATABASE_URL`, o servidor pode iniciar, mas os recursos que dependem de persistência não funcionarão corretamente. O login OAuth também exige credenciais válidas; as rotas operacionais públicas continuam carregando sem login automático.

## 6. Aplicar o schema do banco

Com o MySQL/MariaDB ativo e a `DATABASE_URL` configurada, execute:

```bash
pnpm db:push
```

Esse comando gera e aplica as migrations Drizzle ao banco configurado. [3]

## 7. Rodar em desenvolvimento

```bash
pnpm dev
```

Abra no navegador:

```text
http://localhost:3000
```

Se a porta 3000 estiver ocupada, o servidor escolhe a próxima porta livre e mostra o endereço no terminal. Para testar em outro dispositivo da mesma rede, use o IP local da máquina, como `http://192.168.0.50:3000`.

## 8. Validar antes de usar

```bash
pnpm check
pnpm test
```

Para gerar e rodar a versão de produção localmente:

```bash
pnpm build
pnpm start
```

## 9. Arduino e hardware

O Arduino deve ser ligado por USB à mesma máquina/Raspberry Pi onde o **backend local** está em execução. O sketch e a ligação dos dois relés estão em:

```text
firmware/arduino_barraca_agostina/arduino_barraca_agostina.ino
docs/CONEXAO_ARDUINO.md
```

Configure `HARDWARE_SERIAL_PORT` para ativar a ponte serial local. No Linux, confirme a porta com `ls /dev/ttyACM* /dev/ttyUSB*`; no Windows, use a porta indicada pela Arduino IDE, como `COM3`. O site hospedado na nuvem não tem acesso direto à porta USB local.

## Problemas comuns

| Sintoma | Verificação |
| --- | --- |
| `DATABASE_URL is required` | Confira se o `.env` está na raiz e se a URL do MySQL está correta. |
| `ECONNREFUSED` no banco | Inicie MySQL/MariaDB e confirme host, porta, usuário e senha. |
| Porta 3000 ocupada | Veja no terminal a porta alternativa escolhida ou finalize o processo que usa a porta. |
| Arduino continua `OFFLINE` | Confira `HARDWARE_SERIAL_PORT`, cabo USB de dados, sketch gravado, permissão da porta serial e se o backend foi reiniciado. |
| Login OAuth falha | Configure `VITE_APP_ID` e `OAUTH_SERVER_URL` com credenciais válidas, ou use os fluxos públicos durante o desenvolvimento. |

## Referências

[1] [Node.js — Download](https://nodejs.org/en/download)

[2] [pnpm — Installation](https://pnpm.io/installation)

[3] [Drizzle Kit — Overview](https://orm.drizzle.team/docs/kit-overview)
