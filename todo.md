# Projeto TODO

- [x] Criar shell visual refinado para operação em telas grandes e touchscreen
- [x] Implementar navegação entre Caixa, Produção, Chamadas, Dashboard e Configurações
- [x] Implementar catálogo de produtos configurável com nome, categoria, preço e disponibilidade
- [x] Implementar montagem rápida de pedidos com quantidades, total e remoção de itens
- [x] Implementar registro de senha e forma de pagamento no fechamento do pedido
- [x] Implementar persistência de produtos, pedidos, itens, configurações e eventos operacionais
- [x] Implementar ciclo de pedidos em filas: novo, em preparo, pronto, entregue e cancelado
- [x] Implementar tela de produção com atualização rápida dos pedidos e tempo de espera
- [x] Implementar tela pública de chamadas para segundo monitor com senha atual e histórico
- [x] Implementar dashboard operacional com vendas, pedidos, ticket médio e filas
- [x] Implementar configurações de operação sem valores fixos no código
- [x] Implementar trilha de eventos para auditoria e diagnóstico
- [x] Implementar indicadores visíveis de banco, rede e Arduino
- [x] Implementar camada HardwareController desacoplada com LEDs, sirene, fila, timeout, reconexão, idempotência e logs
- [x] Implementar comportamento resiliente quando o Arduino ou a rede estiverem indisponíveis
- [x] Documentar a topologia local no Raspberry Pi, incluindo a separação entre sistema web e Arduino
- [x] Implementar chave idempotente mantida no caixa para prevenir pedidos duplicados em nova tentativa
- [x] Criar migrations e manter schema do banco sincronizado
- [x] Criar testes Vitest para pedidos, transições e hardware, preservando a compatibilidade de autenticação
- [x] Executar checagem TypeScript e suíte de testes
- [x] Revisar visualmente desktop e layout de produção/chamadas
- [x] Salvar checkpoint final e entregar a versão funcional

- [x] Gerar e aplicar migrations para o schema operacional
- [x] Completar reconexão automática com backoff e persistência de comandos de hardware
- [x] Validar as migrations, transições e trilha de auditoria por checagem técnica e testes
- [x] Aplicar chaves estrangeiras para relacionar produtos, pedidos e itens com integridade referencial
- [x] Exibir filas fechadas de entregues e cancelados na tela de produção
- [x] Exibir a trilha de eventos de auditoria no painel de configurações e diagnóstico
- [x] Validar a área de auditoria e a ponte de hardware após a integração visual
- [x] Cobrir em Vitest a criação de pedido, itens, pagamento e idempotência por chave de requisição
- [x] Validar a recuperação do caixa após indisponibilidade de rede ou banco, preservando o pedido sem duplicação
- [x] Validar em interface a área de auditoria e diagnóstico de hardware
- [x] Cobrir em Vitest cálculo de itens, pagamento, transições e idempotência do pedido por chave de requisição
- [x] Cobrir em Vitest a criação persistida de pedido e itens, forma de pagamento e reuso idempotente da chave de requisição
- [x] Simular o retorno de falha temporária preservando a mesma chave de requisição do pedido
- [x] Persistir itens, forma de pagamento e observação da comanda ativa para recuperação após recarga

## Histórico

- Requisitos consolidados a partir do prompt principal e da solicitação de implementação.
- [x] Verificar e aplicar a edição visual manual indicada para o título da interface — o título foi localizado e a anotação “perfeito” não solicitou mudança adicional
