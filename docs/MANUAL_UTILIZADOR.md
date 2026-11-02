# Manual do Utilizador — e-DPAP

**Sistema de Mapeamento Multi-actor e Multi-nível do Sector Agrário e Pesqueiro — Província de Maputo (DPAP)**

Este manual destina-se aos **inquiridores**, **supervisores** e **analistas**. O administrador tem um manual próprio (`MANUAL_ADMINISTRADOR.md`).

---

## 1. Perfis de acesso

O sistema tem seis perfis (BRD §3.3):

| Perfil | O que pode fazer |
|---|---|
| Administrador do Sistema | Controlo técnico total: utilizadores, cópias de segurança, configuração. |
| Gestor de Dados | Listas de códigos, validação final, de-duplicação, publicação, exportações. |
| Supervisor | Revê, comenta, aprova ou devolve as entrevistas da sua equipa. |
| Inquiridor | Recolhe dados (offline/online); edita os seus rascunhos e os devolvidos. |
| Analista | Consulta dados aprovados, painéis, mapa, rede e exportações. |
| Parceiro | Apenas painéis e mapa agregados; contactos ocultos. |

## 2. Iniciar sessão

- **Plataforma web** (gestão): abra o endereço do servidor e entre em **Entrar** com o seu e-mail e senha.
- **Aplicação móvel (PWA)** para recolha no terreno: abra o endereço no telemóvel/tablet e **instale** a aplicação (opção "Adicionar ao ecrã inicial"). Depois de iniciar sessão uma vez com ligação, a aplicação funciona **offline**.

## 3. Recolher uma entrevista (aplicação móvel, inquirido)

1. No separador **Entrevistas**, toque em **Nova entrevista**.
2. Preencha **módulo a módulo**. As perguntas que não se aplicam **desaparecem automaticamente** (lógica de salto) conforme as suas respostas (ex.: o tipo de actor em 0.13 e os subsectores em A.15 determinam os módulos seguintes).
3. **Consentimento (0.12):** se o respondente **não** aceitar, a entrevista termina em 0.15 e só o módulo 0 é guardado.
4. **GPS (0.10):** toque em **Capturar GPS**. Se a precisão for superior a 10 m, indique o **motivo** antes de continuar.
5. **Fotografia (0.11):** opcional; é comprimida automaticamente (≤ 2 MB).
6. Para campos obrigatórios sem resposta pode usar **Não sabe** / **Não respondeu**.
7. **Guardar é automático**: cada alteração é gravada no dispositivo. Pode fechar e retomar mais tarde.
8. No último módulo, toque em **Submeter**. Se faltarem campos obrigatórios, o sistema indica-os.

### Sincronização

- Tudo é guardado **primeiro no dispositivo**. Quando houver ligação, a aplicação **sincroniza sozinha** (e também pode usar o botão de sincronização).
- O estado de cada entrevista aparece na lista: **Rascunho**, **Por sincronizar**, **Sincronizada** ou **Erro**.
- As fotografias são enviadas em separado para não sobrecarregar a ligação.

## 4. Fluxo de validação (supervisor / gestor)

Cada entrevista segue estes estados (BRD §4.2):

```
Rascunho → Submetida → Em revisão → (Devolvida → Submetida) → Aprovada → Publicada
                                   └→ Rejeitada
```

Na **plataforma web**, em **Entrevistas**, abra uma entrevista para ver:

- As **respostas** organizadas por módulo.
- O **Controlo de qualidade** (alertas automáticos: GPS fora da província, duração atípica, possível duplicado, excesso de "Não sabe").
- Os **comentários de revisão** — pode adicionar comentários.
- As **acções**: Iniciar revisão, Aprovar, **Devolver** ou **Rejeitar** (estas duas exigem motivo).

O **Gestor de Dados** pode depois **Publicar no registo**: a entrevista passa a um **Actor** do cadastro (com identificador permanente `MPT-...`). Se o sistema detectar **possíveis duplicados**, pode **fundir** o actor no existente.

## 5. Consultar os dados

- **Painel**: totais por distrito, sector e tipo; tendência de registo; indicadores (nível de actuação, sexo, articulação com o Governo, programas).
- **Mapa**: actores georreferenciados, com cor por sector (legenda no canto). Clique num ponto para ver o nome e o tipo.
- **Rede**: grafo das relações entre actores (módulo N.03/J.13). Filtre por tipo de relação; passe o rato sobre um nó para ver as ligações e abrir o perfil.
- **Atores**: lista pesquisável; clique num nome para ver a ficha completa.

## 6. Exportar (Relatórios)

Em **Relatórios**:

1. **Filtrar** o cadastro (distrito, sector, tipo, pesquisa). O total actualiza-se.
2. **Escolher as colunas** a imprimir.
3. **Exportar** em CSV / Excel / PDF.
4. **Dados georreferenciados**: exportar **GeoJSON** ou **KML** (para QGIS), com opção de **anonimizar** os produtores individuais.
5. **Dicionário de dados**: descarregar a especificação completa do questionário (JSON ou CSV).

## 7. Dicas para o terreno

- Sincronize sempre que apanhar rede; os dados ficam seguros no dispositivo até lá.
- Verifique a **precisão do GPS** antes de guardar o ponto.
- Use **Não sabe/Não respondeu** em vez de deixar campos obrigatórios vazios.
