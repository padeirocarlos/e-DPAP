# Manual do Administrador — e-DPAP

Instalação, administração, segurança, cópias de segurança e entrega do sistema à DPAP.

---

## 1. Arquitectura

Três componentes que partilham o mesmo contrato de API:

- **DPAP-api** — Spring Boot + PostgreSQL/PostGIS (REST, JWT, lógica de negócio).
- **DPAP-web** — Next.js (gestão, painéis, mapa, rede, relatórios, administração).
- **DPAP-mobile** — PWA (Vite + React + Dexie) para recolha offline no terreno.

O questionário é definido **uma única vez** em `schema/form_schema.json` (16 módulos). A base de dados, a interface, a validação e as exportações derivam deste esquema.

## 2. Requisitos do servidor

- Linux (Ubuntu LTS recomendado), **Docker + Docker Compose**.
- Mínimo sugerido: 4 vCPU, 16 GB RAM, 500 GB SSD.
- Portas: API `8080`, web `3100` (configurável), PostgreSQL interno.

## 3. Instalação (desenvolvimento)

```bash
./start.sh          # sobe API (Docker) + web + mobile em modo de desenvolvimento
./start.sh lan      # idem, acessível a telemóveis/tablets na mesma rede Wi-Fi
./start.sh stop     # pára tudo
```

A API expõe a documentação **OpenAPI** em `…/api/swagger-ui.html` (e `…/api/v3/api-docs`).

## 4. Instalação (produção)

A configuração vem de `.env.deploy` (ver `.env.deploy.example`). O `deploy.sh` **recusa arrancar com segredos de demonstração** (falha fechada):

```bash
cp .env.deploy.example .env.deploy     # defina JWT_SECRET, DB_PASSWORD, CORS_ALLOWED_ORIGINS…
./deploy.sh                            # arranque de produção (SEED_DEMO_DATA=false)
./deploy.sh stop
```

Defina também **`ATTACHMENTS_DIR`** para um volume persistente (fotografias) e sirva tudo atrás de um proxy HTTPS (TLS 1.2+).

## 5. Utilizadores e perfis

Em **Administração** (apenas Administrador do Sistema): criar/editar/desactivar utilizadores e atribuir um dos seis perfis (ver manual do utilizador). O e-mail é imutável após a criação; a senha pode ser **reposta**. As senhas são guardadas com **BCrypt**.

As regras de autorização são aplicadas no **servidor** (a interface só esconde o que o perfil não pode fazer). O âmbito geográfico por utilizador (`user_scope`) permite limitar um analista/supervisor a distritos específicos.

## 6. Auditoria

Todas as acções que alteram dados — e **todas as exportações** — são registadas em `audit_log` (quem, quando, o quê). Consulte em **Administração → Auditoria**.

## 7. Cópias de segurança e restauro

**Cópia completa em formatos abertos** (entrega à DPAP, BRD FR-EXP-4):

```bash
./scripts/dump.sh
# Produz dumps/dpap-<data>/ com:
#   dump.sql, csv/*.csv, attachments/, dicionario.json
```

**Restauro** a partir do dump SQL:

```bash
# com a base de dados a correr:
cd DPAP-api && docker compose exec -T db psql -U dpap -d dpap < caminho/para/dump.sql
```

Recomenda-se agendar `./scripts/dump.sh` **diariamente** (ex.: `cron`) e guardar as cópias fora do servidor. Teste o restauro antes da entrega.

## 8. Exportações

- **Relatórios** (web): CSV/Excel/PDF do cadastro, com filtros e colunas à escolha.
- **GeoJSON/KML** dos actores (para QGIS), com opção de **anonimização** dos produtores individuais (FR-EXP-5).
- **Dicionário de dados** (JSON/CSV) — a especificação do questionário por versão de formulário.
- Endpoints equivalentes na API (ver OpenAPI): `GET /actors/export`, `GET /form/dictionary`.

## 9. Versões do questionário

A versão activa do formulário e a ronda de recolha são semeadas no arranque (`form_version` 1.0 "PUBLISHED", ronda "Linha de base 2026"). **Alterar o questionário** significa editar `schema/form_schema.json` e propagar (ver `schema/README.md`); uma alteração estrutural cria uma **nova versão** de formulário, preservando a leitura das submissões antigas.

## 10. Segurança (resumo)

- JWT stateless; o backend revalida o token em cada pedido (fronteira de segurança real).
- HTTPS obrigatório em produção; segredos fora do código (`.env.deploy`).
- Consentimento (0.12) obrigatório; contactos ocultos para Analista/Parceiro quando A.23 = Não.
- Produtores individuais nunca aparecem em mapas de parceiros com localização exacta (exportação anonimizada com perturbação do ponto).

## 11. Entrega à DPAP (checklist)

- [ ] Código-fonte dos três componentes + `schema/`.
- [ ] `docker-compose.yml`, `start.sh`, `deploy.sh`, `scripts/dump.sh`, `.env.deploy.example`.
- [ ] Credenciais de administrador (entregues em separado, de forma segura).
- [ ] Cópia completa dos dados em formato aberto (`./scripts/dump.sh`).
- [ ] Documentação técnica + estes manuais (PT).
- [ ] Sessão de formação aos técnicos da DPAP.
