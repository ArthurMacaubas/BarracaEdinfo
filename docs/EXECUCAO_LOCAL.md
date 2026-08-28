# Executar a Barraca Agostina localmente com SQLite

Este sistema foi preparado para uso **offline-first**. Produtos, pedidos, metas, PIX, patrocinadores e registros de auditoria ficam em um arquivo SQLite dentro da instalação local, sem depender de MariaDB ou MySQL em execução.

> O arquivo padrão é `data/barraca-agostina.sqlite`. Ele é criado automaticamente na primeira inicialização, usa modo WAL e não é enviado ao GitHub.

## 1. Pré-requisitos

Instale o **Node.js 22 LTS**, o Git e o `npm`. Não é necessário instalar MariaDB, MySQL, Docker ou outro serviço de banco de dados. O Arduino IDE é necessário apenas para gravar o firmware no Arduino. O Drizzle possui suporte oficial a bancos SQLite locais por meio de clientes compatíveis com arquivo. [1]

| Requisito | Uso no sistema |
| --- | --- |
| Node.js 22 LTS | Executa o servidor Express, a interface Vite e os comandos locais. |
| Git | Baixa e atualiza o código do projeto. |
| npm | Instala as dependências travadas no projeto. |
| Arduino IDE | Grava o sketch dos relés, somente quando houver hardware. |

No Ubuntu, macOS ou Windows, instale Git e habilite o gerenciador de pacotes do Node:

```bash
sudo apt update
sudo apt install -y git
corepack enable
node --version
npm --version
```

## 2. Baixar e instalar o projeto

Execute os comandos abaixo uma única vez:

```bash
git clone https://github.com/ArthurMacaubas/BarracaEdinfo.git
cd BarracaEdinfo
corepack enable
npm install
```

## 3. Configurar o ambiente local

Crie um arquivo chamado `.env` na raiz do projeto. Ele não deve ser enviado ao GitHub.

```dotenv
NODE_ENV=development
PORT=3000

# Opcional: se omitido, o sistema usará ./data/barraca-agostina.sqlite
DATABASE_FILE="./data/barraca-agostina.sqlite"

# A operação local não exige credenciais de login.
HARDWARE_SERIAL_PORT="auto"
HARDWARE_SERIAL_BAUD_RATE="115200"
```

O caminho definido por `DATABASE_FILE` é relativo à pasta do projeto. Você também pode usar um caminho absoluto, como `DATABASE_FILE="/home/pi/BarracaEdinfo/data/barraca-agostina.sqlite"`, se quiser manter os dados em outro disco local. **Não coloque o arquivo SQLite em uma pasta compartilhada pela rede.**

## 4. Criar e verificar o banco local

Na primeira execução, o comando abaixo cria o diretório de dados, aplica as migrations SQLite e verifica uma consulta no arquivo local:

```bash
npm run db:verify
```

O mesmo processo é executado automaticamente quando o sistema inicia. Após uma futura alteração de schema, gere uma migration e aplique-a no banco local:

```bash
npm run db:generate
npm run db:push
```

## 5. Iniciar a barraca

Para desenvolvimento ou operação local, execute:

```bash
npm run dev
```

Abra `http://localhost:3000`. Para acessar pelo caixa, tablet ou segundo monitor na mesma rede, abra o endereço IP local do computador local, por exemplo `http://192.168.0.50:3000`.

Todos os dispositivos usam a mesma API local; apenas o computador local que executa `npm run dev` acessa o arquivo SQLite e a porta USB do Arduino.

## 6. Backup e restauração

Antes de copiar, restaurar ou substituir o banco, **pare o servidor** com `Ctrl+C`. Em seguida, copie apenas o arquivo SQLite para uma unidade USB, outro disco local ou local seguro.

```bash
mkdir -p backups
cp data/barraca-agostina.sqlite "backups/barraca-agostina-$(date +%F-%H%M).sqlite"
```

Para restaurar um backup, pare o sistema e substitua o arquivo atual. Guarde uma cópia do arquivo atual antes de restaurar.

```bash
cp data/barraca-agostina.sqlite "backups/antes-da-restauracao-$(date +%F-%H%M).sqlite"
cp backups/SEU_BACKUP.sqlite data/barraca-agostina.sqlite
npm run db:verify
```

| Situação | Procedimento recomendado |
| --- | --- |
| Trocar de computador local | Com o servidor parado, copie `data/barraca-agostina.sqlite` para a mesma pasta na nova instalação. |
| Salvar antes do evento | Faça uma cópia do arquivo em `backups/` e também em uma unidade USB. |
| Recuperar uma cópia anterior | Pare o servidor, guarde o arquivo atual, substitua pelo backup e execute `npm run db:verify`. |
| Arquivo inacessível | Confira permissões da pasta `data/` e restaure o backup mais recente conhecido. |

## 7. Importar dados de uma instalação MariaDB/MySQL anterior

Se já existirem dados no MariaDB/MySQL antigo, faça primeiro um backup do banco antigo e do novo arquivo SQLite. Depois, com o servidor local parado, informe a URL da origem e execute a importação.

```bash
MYSQL_SOURCE_URL="mysql://USUARIO:SENHA@127.0.0.1:3306/barraca_agostina" \
npm run db:import-mysql -- --replace
```

O parâmetro `--replace` só é permitido de propósito: ele limpa os dados atuais no arquivo SQLite antes de importar. A rotina valida referências entre tabelas ao final. Sem uma origem MySQL/MariaDB disponível, comece com o novo SQLite vazio normalmente.

## 8. Arduino e hardware

O Arduino deve ser conectado por USB ao mesmo computador local que executa o backend local. O sketch e o guia elétrico estão em:

```text
firmware/arduino_barraca_agostina/arduino_barraca_agostina.ino
docs/CONEXAO_ARDUINO.md
```

Mantenha `HARDWARE_SERIAL_PORT="auto"` para detectar automaticamente a porta. Caso existam vários dispositivos seriais, informe a porta correta, como `/dev/ttyACM0`, `/dev/ttyUSB0` ou `COM3`. Uma versão hospedada na nuvem não consegue acessar USB local nem preservar o arquivo SQLite como armazenamento operacional.

## 9. Validar antes do evento

```bash
npm run check
npm test
npm run db:verify
npm run dev
```

Confirme o cadastro de produtos, a criação de um pedido, a confirmação PIX, a tela pública e o painel de relés antes de abrir a barraca.

## Problemas comuns

| Sintoma | Verificação |
| --- | --- |
| Erro ao abrir o banco | Confira se a pasta definida em `DATABASE_FILE` existe e se o usuário tem permissão de escrita. |
| Dados sumiram após trocar de computador | Copie o arquivo `data/barraca-agostina.sqlite` da instalação anterior antes de iniciar a nova. |
| Banco ficou em local errado | Ajuste `DATABASE_FILE`, mova o arquivo com o sistema parado e execute `npm run db:verify`. |
| Arduino continua `OFFLINE` | Confira cabo USB de dados, sketch gravado, porta serial, permissões e reinicie o backend. |
| Acesso ao painel local | A operação local não possui login; mantenha o servidor restrito à rede confiável e não exponha a porta diretamente à Internet. |

## Referências

[1] [Drizzle ORM — SQLite](https://orm.drizzle.team/docs/sqlite/get-started-sqlite)

[2] [Node.js — Download](https://nodejs.org/en/download)

[3] [npm — Installation](https://npm.io/installation)
