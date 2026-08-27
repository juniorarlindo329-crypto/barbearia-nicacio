BARBEARIA NICÁCIO — MVP PWA

Arquivos:
- index.html: app do cliente
- admin.html: painel básico do barbeiro
- styles.css: visual
- app.js: lógica de agendamento
- manifest.json / sw.js: instalação como PWA

Como testar:
1. Rode em um servidor local (não abra apenas o arquivo index.html).
2. Exemplo com Python:
   python -m http.server 8000
3. Abra http://localhost:8000

Observação:
Esta versão salva os agendamentos no navegador (localStorage).
Para uso real com vários clientes, o próximo passo é ligar a um banco de dados/backend
(Supabase/Firebase/Node + PostgreSQL) e adicionar login, usuários, barbeiros e notificações.
