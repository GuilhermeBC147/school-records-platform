# Guia de implantação e operação da escola (PT-BR)

Este guia deixa o site pronto para uso e explica como a escola deve mantê-lo sem precisar entender programação. Ele foi escrito para duas pessoas diferentes:

| Pessoa | O que ela faz | O que ela não deve fazer |
| --- | --- | --- |
| Você ou uma pessoa técnica de confiança | Faz a primeira instalação, configura acessos, confirma backup e resolve alertas técnicos. | Não entrega senhas pessoais nem usa contas particulares como propriedade da escola. |
| Responsável da escola | Controla contas, pagamentos, contatos, aprova implantações e acompanha alertas. | Não usa terminal, não reinicia/reinstala o VPS e não apaga backups sem orientação técnica. |

> **Regra de segurança:** a escola deve ser dona da conta Hostinger, domínio, e-mail de alertas, armazenamento de backup, repositório GitHub e cofre de senhas. Uma pessoa pode ajudar a operar, mas não deve ser a única dona desses acessos.

## Como usar este guia

Substitua cada marcador abaixo pelo valor real antes de executar qualquer comando:

| Marcador | Exemplo | Onde guardar |
| --- | --- | --- |
| `<DOMINIO>` | `registros.escola.com.br` | Planilha/cofre da escola |
| `<IP_DO_VPS>` | `203.0.113.10` | Cofre da escola |
| `<EMAIL_OPERACOES>` | `tecnologia@escola.com.br` | Conta institucional |
| `<USUARIO_GITHUB>` | conta da escola no GitHub | Cofre da escola |
| `<REPOSITORIO>` | `GuilhermeBC147/school-records-platform` | GitHub da escola |

Pare e peça ajuda técnica se um passo não der o resultado indicado. Não tente “adivinhar” uma senha, apagar um volume Docker, reinstalar o VPS ou rodar a seed de demonstração.

## Parte A — decisões da escola antes de comprar/configurar

Registre por escrito estas decisões. Elas não precisam ser técnicas, mas precisam ter um responsável da escola.

1. **Domínio:** usar o domínio principal ou, de preferência, um subdomínio como `registros.<DOMINIO_DA_ESCOLA>`.
2. **Conta Hostinger:** e-mail institucional da escola, dois responsáveis, forma de pagamento e acesso de recuperação.
3. **Localização do VPS:** escolher Brasil se esta opção estiver disponível para a conta/plano; se não estiver, registrar a localização oferecida e obter a aprovação da escola antes de contratar.
4. **Backup externo:** uma conta que pertença à escola, diferente do VPS. Escolham quem paga e por quanto tempo os backups serão guardados. A recomendação inicial é 30 dias.
5. **Alertas:** um e-mail/grupo institucional que será lido por pelo menos duas pessoas. Alertas não devem ir apenas para WhatsApp ou e-mail pessoal de uma pessoa.
6. **Contato de incidente:** nome, telefone e e-mail de quem pode decidir uma restauração de dados. Restaurar dados substitui informações e exige autorização da escola.

## Parte B — primeira implantação (você faz uma única vez)

### 1. Criar e preparar o VPS na Hostinger

1. Entre na Hostinger usando a conta institucional da escola.
2. Crie um VPS. Selecione o modelo **Docker com Ubuntu 24.04** quando ele estiver disponível; a Hostinger informa que esse modelo já inclui Docker e Docker Compose. [Guia oficial da Hostinger](https://www.hostinger.com/support/8306612-how-to-use-the-docker-vps-template-at-hostinger/)
3. Escolha a localização aprovada pela escola e use um nome claro, por exemplo `school-records-prod`.
4. Na tela do VPS, anote o endereço IPv4 público como `<IP_DO_VPS>` no cofre de senhas da escola.
5. Ative os backups/snapshots automáticos do VPS no painel Hostinger. Eles são uma camada extra; não substituem os backups de banco fora do VPS.
6. Na área de chaves SSH do VPS, adicione **sua chave técnica de acesso inicial**, com senha/frase secreta. A Hostinger permite adicionar e revogar chaves na área VPS → Settings → SSH keys. [Instruções da Hostinger](https://www.hostinger.com/support/4792364-how-to-use-ssh-keys-at-hostinger-vps/)

**Resultado esperado:** você consegue conectar como `root` ao VPS com uma chave SSH, sem depender de senha enviada por e-mail.

### 2. Apontar o endereço do site

1. Escolha o endereço final, por exemplo `registros.escola.com.br`.
2. No provedor que controla o DNS do domínio, crie um registro do tipo **A**:

| Campo | Valor |
| --- | --- |
| Nome/Host | `registros` (ou o subdomínio escolhido) |
| Tipo | `A` |
| Destino/Valor | `<IP_DO_VPS>` |
| TTL | deixe o padrão do provedor |

3. Não apague registros de e-mail (MX, SPF, DKIM ou DMARC) existentes.
4. Espere a propagação. No seu computador Windows, confirme:

```powershell
nslookup registros.escola.com.br
```

O resultado deve mostrar `<IP_DO_VPS>`.

> Não avance para HTTPS se o domínio apontar para outro IP. O Caddy só consegue emitir e renovar o certificado se o DNS estiver correto e as portas 80 e 443 estiverem acessíveis. [Requisitos oficiais do Caddy](https://caddyserver.com/docs/automatic-https)

### 3. Criar as chaves necessárias no seu computador Windows

Abra **PowerShell** no seu computador. Essas chaves são diferentes e não devem ser misturadas.

1. **Chave pessoal de emergência:** crie uma chave com frase secreta para você/segundo técnico recuperar o servidor em uma emergência. Guarde a frase no cofre da escola.

```powershell
ssh-keygen -t ed25519 -C "acesso-emergencia-escola" -f "$HOME\.ssh\school-records-breakglass"
```

2. **Chave de implantação do GitHub:** crie uma segunda chave sem frase secreta. Ela ficará como segredo protegido do ambiente `production` do GitHub e só será usada pelo fluxo automático de implantação.

```powershell
ssh-keygen -t ed25519 -C "github-actions-school-records-production" -f "$HOME\.ssh\school-records-github-deploy"
```

Quando o comando perguntar pela frase secreta dessa chave de automação, pressione **Enter** duas vezes para deixá-la vazia.

> A chave sem frase secreta é aceitável apenas porque ficará limitada ao ambiente protegido do GitHub e ao usuário específico de implantação no VPS. Nunca envie o arquivo privado `.ssh\school-records-github-deploy` por e-mail ou WhatsApp.

### 4. Preparar o VPS por SSH

Conecte-se com sua chave técnica inicial:

```powershell
ssh root@<IP_DO_VPS>
```

No VPS, atualize os pacotes e instale as ferramentas operacionais. O modelo Docker da Hostinger já deve ter Docker/Compose; estes comandos instalam apenas os utilitários adicionais.

```bash
apt update
apt upgrade -y
apt install -y git curl python3 rclone postgresql-client
docker compose version
rclone version
```

Crie o usuário que fará as implantações e dê a ele acesso ao Docker:

```bash
adduser --disabled-password --gecos "" school-records-deploy
usermod -aG docker school-records-deploy
install -d -m 700 -o school-records-deploy -g school-records-deploy /home/school-records-deploy/.ssh
```

Do seu computador Windows, copie a parte pública da chave de implantação para o VPS:

```powershell
scp "$HOME\.ssh\school-records-github-deploy.pub" root@<IP_DO_VPS>:/tmp/school-records-github-deploy.pub
```

De volta ao VPS, instale essa chave para o usuário de implantação:

```bash
install -m 600 -o school-records-deploy -g school-records-deploy /tmp/school-records-github-deploy.pub /home/school-records-deploy/.ssh/authorized_keys
rm /tmp/school-records-github-deploy.pub
```

Abra uma **segunda** janela do PowerShell e confirme antes de fechar o acesso `root`:

```powershell
ssh -i "$HOME\.ssh\school-records-github-deploy" school-records-deploy@<IP_DO_VPS>
```

**Resultado esperado:** a segunda conexão funciona. Só depois disso configure a política de SSH/firewall da escola. Nunca desative o acesso atual antes de testar a nova chave.

### 5. Configurar o firewall do VPS

Ainda como `root`, permita somente SSH, HTTP e HTTPS. Se a escola tiver IPs fixos de administração, restrinja SSH a eles; caso não tenha, mantenha SSH aberto temporariamente e proteja-o com as chaves.

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status verbose
```

No firewall da Hostinger, permita as mesmas portas. **Não abra** 5432, 3000 ou qualquer porta de PostgreSQL. O banco só deve aceitar conexões internas dos containers.

### 6. Dar ao VPS acesso de leitura ao repositório e às imagens

Entre no VPS como `school-records-deploy` e crie uma chave exclusiva para ele ler o repositório:

```bash
sudo -iu school-records-deploy
ssh-keygen -t ed25519 -C "school-records-vps-readonly" -f ~/.ssh/id_ed25519_github -N ""
cat ~/.ssh/id_ed25519_github.pub
```

Copie a última linha mostrada. No GitHub do repositório, vá em **Settings → Deploy keys → Add deploy key**, cole a chave e deixe a opção de escrita desmarcada. Em seguida, no VPS:

```bash
ssh -T git@github.com
```

Uma mensagem dizendo que a autenticação funcionou, mesmo sem acesso a terminal GitHub, é o resultado esperado.

Digite `exit` para voltar ao usuário `root`. Depois crie a pasta e clone o repositório:

```bash
sudo install -d -m 0755 -o school-records-deploy -g school-records-deploy /opt/school-records-platform
sudo -iu school-records-deploy git clone git@github.com:<REPOSITORIO>.git /opt/school-records-platform/current
```

Se o pacote de imagens do GitHub Container Registry for privado, crie um token de leitura de pacotes pertencente à escola e faça login no VPS sem colocar o token no histórico:

```bash
sudo -iu school-records-deploy bash
read -rsp "Token de leitura do GHCR: " GHCR_TOKEN; echo
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u <USUARIO_GITHUB> --password-stdin
unset GHCR_TOKEN
exit
```

### 7. Configurar o ambiente secreto no VPS

No VPS, crie o local protegido e copie o modelo seguro:

```bash
sudo install -d -m 0750 -o root -g school-records-deploy /etc/school-records-platform
sudo cp /opt/school-records-platform/current/.env.production.example /etc/school-records-platform/production.env
sudo chown root:school-records-deploy /etc/school-records-platform/production.env
sudo chmod 0640 /etc/school-records-platform/production.env
sudo nano /etc/school-records-platform/production.env
```

Para evitar problemas de URL, gere as três senhas com caracteres hexadecimais simples. Rode cada comando e copie o resultado diretamente para o cofre da escola e para o arquivo secreto:

```bash
openssl rand -hex 32  # POSTGRES_PASSWORD
openssl rand -hex 32  # APP_DATABASE_PASSWORD
openssl rand -hex 48  # AUTH_SECRET
```

No arquivo, complete pelo menos estes valores:

| Variável | Como preencher |
| --- | --- |
| `APP_DOMAIN` | `<DOMINIO>` sem `https://` |
| `CADDY_ACME_EMAIL` | `<EMAIL_OPERACOES>` |
| `POSTGRES_PASSWORD` | primeira senha gerada |
| `APP_DATABASE_PASSWORD` | segunda senha gerada |
| `DATABASE_URL` | use a senha do app em `postgresql://school_records_app:SENHA@postgres:5432/school_records?schema=public` |
| `MIGRATION_DATABASE_URL` | use a senha do dono em `postgresql://school_records_owner:SENHA@postgres:5432/school_records?schema=public` |
| `AUTH_SECRET` | terceira senha gerada |
| `RCLONE_REMOTE` | destino de backup da escola, configurado na próxima seção |
| `ALERT_WEBHOOK_URL` | webhook do alerta institucional, se já disponível |

Deixe `APP_IMAGE` e `MIGRATION_IMAGE` como estão no modelo: a implantação aprovada substitui esses valores pela imagem exata da versão publicada.

### 8. Configurar backup externo e alertas antes do lançamento

Entre como `school-records-deploy` e configure o armazenamento externo escolhido pela escola:

```bash
sudo -iu school-records-deploy rclone config
```

Siga as telas do provedor escolhido. Dê um nome simples ao remoto, por exemplo `backup-escola`, e crie uma pasta exclusiva para o sistema. Depois teste sem mostrar credenciais:

```bash
sudo -iu school-records-deploy rclone lsd backup-escola:
```

Atualize `RCLONE_REMOTE` para algo como `backup-escola:school-records-platform/postgres`. Mantenha `REQUIRE_OFFSITE_BACKUP=true`: se o armazenamento externo não funcionar, o backup deve falhar e avisar, não fingir que está protegido.

Crie também um alerta institucional e um monitor externo de disponibilidade. Configure o primeiro URL de webhook em `ALERT_WEBHOOK_URL`; configure o monitor para acessar `https://<DOMINIO>/api/health/live`. O monitor externo é importante porque detecta quando o site não está acessível pela internet.

### 9. Configurar o ambiente `production` do GitHub

No repositório GitHub, vá em **Settings → Environments → New environment** e crie `production`.

1. Restrinja as implantações à branch aprovada pela escola.
2. Ative aprovação manual por uma segunda pessoa, se o plano GitHub da escola disponibilizar esse recurso.
3. Em **Environment secrets**, cadastre:

| Nome | Conteúdo |
| --- | --- |
| `PRODUCTION_SSH_HOST` | `<IP_DO_VPS>` |
| `PRODUCTION_SSH_PORT` | `22` |
| `PRODUCTION_SSH_USER` | `school-records-deploy` |
| `PRODUCTION_SSH_PRIVATE_KEY` | conteúdo inteiro de `school-records-github-deploy` **sem** `.pub` |
| `PRODUCTION_SSH_KNOWN_HOSTS` | chave pública do servidor verificada no passo abaixo |

4. Em **Environment variables**, cadastre `PRODUCTION_DOMAIN` com `<DOMINIO>`.

Para obter a chave conhecida, rode no seu computador e compare a impressão/fingerprint com a exibida no painel Hostinger antes de salvar:

```powershell
ssh-keyscan -H <IP_DO_VPS>
```

Segredos de ambiente só ficam disponíveis ao trabalho de implantação depois que as regras do ambiente são satisfeitas. [Documentação do GitHub](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments)

### 10. Fazer a primeira implantação

Antes de iniciar, confirme todos os itens:

- [ ] DNS de `<DOMINIO>` aponta para `<IP_DO_VPS>`.
- [ ] Portas 80 e 443 estão liberadas; 5432 e 3000 não estão.
- [ ] O repositório foi clonado em `/opt/school-records-platform/current`.
- [ ] O VPS consegue fazer `docker login` no GHCR, se necessário.
- [ ] O arquivo `/etc/school-records-platform/production.env` existe e não está no Git.
- [ ] Backup Hostinger, `rclone`, alerta e monitor externo pertencem à escola.
- [ ] A PR de operações e este guia já foram revisados e mesclados à branch `main`; o VPS não deve clonar uma branch de rascunho.

No GitHub, abra **Actions → Deploy production → Run workflow**. Aguarde os testes e a publicação das imagens. Quando o GitHub pedir aprovação de produção, a pessoa autorizada da escola deve aprovar somente após conferir a versão.

No VPS, acompanhe o resultado sem alterar nada:

```bash
sudo -iu school-records-deploy
cd /opt/school-records-platform/current
ENV_FILE=/etc/school-records-platform/production.env ./ops/restart.sh
```

No navegador, abra `https://<DOMINIO>/api/health/live`. O resultado esperado é:

```json
{"status":"ok"}
```

### 11. Criar o primeiro administrador

Após a primeira implantação saudável, ainda falta criar a primeira conta que poderá administrar a escola. Este é o único comando de criação inicial. Ele pede os dados e a senha sem exibi-los, só funciona se **não existir nenhum usuário** e recusa todas as tentativas posteriores.

```bash
sudo -iu school-records-deploy
cd /opt/school-records-platform/current
ENV_FILE=/etc/school-records-platform/production.env ./ops/bootstrap-first-admin.sh
```

Use um e-mail institucional da escola e uma senha com pelo menos 12 caracteres, guardada apenas no cofre da escola. Em seguida, abra `https://<DOMINIO>/login`, entre com essa conta e crie as demais contas pela tela **Gerenciar contas**. **Nunca rode** `npm run db:seed` em produção.

### 12. Ativar a rotina automática e confirmar o lançamento

Instale os agendamentos:

```bash
sudo cp /opt/school-records-platform/current/ops/systemd/school-records-*.service /etc/systemd/system/
sudo cp /opt/school-records-platform/current/ops/systemd/school-records-*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now school-records-backup.timer school-records-backup-check.timer school-records-monitor.timer school-records-restore-rehearsal.timer
systemctl list-timers 'school-records-*'
```

Faça um backup manual e uma checagem antes de declarar o site pronto:

```bash
sudo -iu school-records-deploy
cd /opt/school-records-platform/current
ENV_FILE=/etc/school-records-platform/production.env ./ops/backup-postgres.sh manual
ENV_FILE=/etc/school-records-platform/production.env ./ops/check-backup.sh
```

Faça também uma restauração de ensaio em banco temporário. Ela não substitui o banco de produção:

```bash
ENV_FILE=/etc/school-records-platform/production.env ./ops/restore-rehearsal.sh
```

Registre a data, o responsável e o resultado no documento de operação da escola.

## Parte C — rotina simples para a escola

### O que verificar semanalmente

1. Abra o endereço normal do sistema e confirme que aparece o cadeado no navegador.
2. Confirme que pelo menos dois responsáveis ainda conseguem entrar na Hostinger, no GitHub e no e-mail de alertas.
3. Verifique se chegou algum alerta. Se não chegou alerta, não é necessário abrir o terminal.
4. Faça a exportação de registros que a direção desejar para uso administrativo. Lembre-se: CSV não substitui o backup do banco.

### O que verificar mensalmente

1. Confirme que a cobrança Hostinger e o armazenamento externo continuam ativos.
2. Peça à pessoa técnica para revisar atualizações, espaço em disco, histórico dos timers e idade do backup.
3. Confirme que as duas pessoas responsáveis e os contatos de incidente ainda trabalham na escola.

### Quando um alerta chegar

| Mensagem percebida | Ação da escola | O que não fazer |
| --- | --- | --- |
| Site não abre | Tire uma captura de tela, anote horário e avise a pessoa técnica. | Não reinstale o VPS. |
| Aviso de backup falhou/ausente | Avise a pessoa técnica no mesmo dia. | Não apague arquivos ou tente restaurar por conta própria. |
| Aviso de disco cheio | Avise a pessoa técnica imediatamente. | Não apague volumes Docker ou banco de dados. |
| Senha/chave perdida | Avise os dois responsáveis e revogue o acesso comprometido. | Não compartilhe uma nova senha por chat. |
| Suspeita de dados errados/perdidos | Pare a entrada de novos registros, anote o horário e avise a direção + pessoa técnica. | Não sobrescreva o banco nem rode comandos de restauração. |

### O que a escola nunca deve fazer

- Não compartilhar credenciais por e-mail, WhatsApp ou planilha aberta.
- Não clicar em “reinstalar VPS”, “resetar servidor” ou “restaurar snapshot” sem decisão escrita da direção e da pessoa técnica.
- Não abrir a porta 5432 do PostgreSQL.
- Não apagar backups, volumes Docker ou arquivos em `/var/lib/docker`.
- Não executar a seed de desenvolvimento.
- Não aprovar uma implantação no GitHub se não souber qual versão está sendo liberada.

## Referências e guia técnico

Para comandos avançados, rollback, rotação de credenciais e incidentes, use [operator-runbook.md](operator-runbook.md). Para os critérios de segurança e lançamento, use [production-readiness.md](production-readiness.md). O guia em inglês é destinado à pessoa técnica; este documento é o manual principal da escola em português.
