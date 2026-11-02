/**
 * Portuguese (pt) message catalog — the single source of truth for all
 * user-facing text in the app and the base type for every other locale.
 *
 * Rules:
 * - No user-facing string may be hardcoded in a component; add it here instead.
 * - Leaves are plain strings (serializable across the server/client boundary).
 * - Use `{name}` placeholders for interpolation and resolve them with
 *   `format()` from `@/i18n/format`.
 */

export const pt = {
  app: {
    name: "e-DPAP",
    fullName: "Cadastro Georreferenciado de Atores — DPAP Maputo",
    tagline:
      "Mapeamento de atores da agricultura, pecuária, pescas e aquacultura",
  },

  common: {
    actions: {
      create: "Criar",
      save: "Guardar",
      cancel: "Cancelar",
      edit: "Editar",
      delete: "Eliminar",
      search: "Pesquisar",
      filter: "Filtrar",
      clear: "Limpar",
      export: "Exportar",
      back: "Voltar",
      next: "Seguinte",
      previous: "Anterior",
      confirm: "Confirmar",
      retry: "Tentar novamente",
    },
    states: {
      loading: "A carregar…",
      saving: "A guardar…",
      empty: "Sem registos",
      error: "Ocorreu um erro",
      noResults: "Nenhum resultado encontrado",
      required: "Obrigatório",
      optional: "Opcional",
    },
    pagination: {
      /** {from}, {to}, {total} */
      summary: "A mostrar {from}–{to} de {total}",
      pageSize: "Registos por página",
    },
  },

  nav: {
    dashboard: "Painel",
    map: "Mapa",
    actors: "Atores",
    submissions: "Entrevistas",
    conformance: "Conformidade",
    network: "Rede",
    reports: "Relatórios",
    administration: "Administração",
    skipToContent: "Saltar para o conteúdo",
    primary: "Navegação principal",
  },

  conformance: {
    title: "Conformidade de Dados",
    subtitle:
      "Fila de revisão das entrevistas submetidas. Verifique os sinais de qualidade e aprove, devolva ou rejeite cada registo.",
    empty: "Não há entrevistas por rever de momento.",
    loadError: "Não foi possível carregar a fila de conformidade.",
    pending: "{count} por rever",
    columns: {
      number: "Nº",
      actor: "Actor",
      district: "Distrito",
      qcFlags: "Sinais QC",
      status: "Estado",
      updated: "Actualizado",
    },
    noFlags: "—",
    open: "Abrir",
  },

  submissions: {
    title: "Entrevistas",
    subtitle: "Questionários recolhidos no terreno e o seu fluxo de validação.",
    new: "Nova entrevista",
    restart: "Recomeçar",
    restartConfirm: "Descartar esta entrevista e começar uma nova?",
    newTitle: "Nova entrevista",
    newSubtitle: "Preencha o questionário módulo a módulo. A lógica de salto aplica-se automaticamente.",
    empty: "Ainda não há entrevistas.",
    loadError: "Não foi possível carregar as entrevistas.",
    columns: {
      number: "Nº",
      actor: "Actor",
      status: "Estado",
      district: "Distrito",
      updated: "Actualizado",
    },
    detailTitle: "Entrevista",
    back: "Voltar à lista",
    answers: "Respostas",
    metadata: "Metadados",
    noAnswer: "—",
    submitted: "Entrevista submetida.",
    submitErrors: "Corrija os campos obrigatórios antes de submeter.",
    createError: "Não foi possível guardar a entrevista.",
    transitioned: "Estado actualizado.",
    transitionError: "Não foi possível actualizar o estado.",
    actions: {
      SUBMIT: "Submeter",
      OPEN_REVIEW: "Iniciar revisão",
      RETURN: "Devolver",
      APPROVE: "Aprovar",
      REJECT: "Rejeitar",
      PUBLISH: "Publicar no registo",
    },
    reasonPrompt: "Indique o motivo",
    review: {
      qcTitle: "Controlo de qualidade",
      noFlags: "Sem alertas de qualidade.",
      commentsTitle: "Comentários de revisão",
      noComments: "Sem comentários.",
      addComment: "Adicionar comentário",
      commentPlaceholder: "Escreva um comentário…",
      commentError: "Não foi possível adicionar o comentário.",
      duplicatesTitle: "Possíveis duplicados",
      noDuplicates: "Nenhum duplicado encontrado.",
      mergeInto: "Fundir neste actor",
      mergeConfirm: "Fundir este actor publicado no duplicado seleccionado?",
      merged: "Actores fundidos.",
      mergeError: "Não foi possível fundir os actores.",
      severity: { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta" },
    },
    status: {
      DRAFT: "Rascunho",
      SUBMITTED: "Submetida",
      UNDER_REVIEW: "Em revisão",
      RETURNED: "Devolvida",
      APPROVED: "Aprovada",
      PUBLISHED: "Publicada",
      REJECTED: "Rejeitada",
    },
  },

  network: {
    title: "Rede multi-actor",
    subtitle: "Relações entre actores do sector, a partir das entrevistas publicadas.",
    filterLabel: "Tipo de relação:",
    allTypes: "Todos",
    registered: "Actor registado",
    unregistered: "Parceiro não registado",
    degree: "Ligações",
    openProfile: "Abrir perfil",
    empty: "Ainda não há relações na rede.",
    metrics: {
      nodes: "Nós",
      edges: "Ligações",
      registered: "Actores registados",
      isolated: "Actores isolados",
      mostConnected: "Mais ligados",
    },
  },

  indicators: {
    title: "Indicadores",
    byLevel: "Actores por nível de actuação",
    bySex: "Respondentes por sexo",
    coordination: "Articulação com o Governo",
    knowsPlans: "Conhece os planos do Governo",
    participates: "Participa na planificação",
    programmes: "Programas e projectos",
    beneficiaries: "Beneficiários (H / M)",
    byModule: "Completude por módulo",
    byModuleHint: "Percentagem de campos relevantes preenchidos nas entrevistas publicadas.",
    moduleApplicable: "{count} entrevistas",
    moduleEmpty: "Ainda não há entrevistas publicadas.",
  },

  form: {
    moduleWord: "Módulo",
    previous: "Anterior",
    next: "Seguinte",
    submit: "Submeter",
    review: "Rever",
    addRow: "Adicionar linha",
    removeRow: "Remover",
    captureGps: "Capturar GPS",
    capturing: "A capturar…",
    accuracy: "Precisão",
    gpsLowAccuracy: "Precisão acima de 10 m. Indique o motivo para continuar.",
    gpsReason: "Motivo da baixa precisão",
    gpsManual: "Ou insira as coordenadas manualmente:",
    gpsLat: "Latitude",
    gpsLon: "Longitude",
    takePhoto: "Carregar fotografia",
    replacePhoto: "Substituir fotografia",
    removePhoto: "Remover",
    choose: "Seleccione…",
    otherSpecify: "Especificar",
    errorsTitle: "Campos obrigatórios em falta",
  },

  dashboard: {
    title: "Painel",
    subtitle: "Visão geral do cadastro de atores",
    metrics: {
      totalActors: "Total de atores",
      byDistrict: "Atores por distrito",
      bySector: "Atores por setor",
      byType: "Atores por tipo",
      registrationTrend: "Tendência de registos",
      coverage: "Distritos cobertos",
      completeness: "Completude dos dados",
      syncStatus: "Por sincronizar",
    },
    placeholder:
      "Os indicadores serão apresentados aqui assim que existirem dados registados.",
    clickHint: "Clique numa categoria para ver os atores.",
    viewAll: "Ver todos",
    /** {count} */
    more: "+{count} mais",
    drilldownEmpty: "Nenhum ator nesta categoria.",
    drilldownError: "Não foi possível carregar os atores.",
    trendEmpty: "Ainda sem dados de tendência.",
    /** {value}, {total} */
    ofTotal: "{value} de {total}",
  },

  map: {
    title: "Mapa de atores",
    subtitle: "Distribuição georreferenciada dos atores registados",
    loading: "A carregar o mapa…",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores do OpenStreetMap</a>',
    filters: {
      district: "Distrito",
      locality: "Localidade",
      sector: "Setor",
      actorType: "Tipo de ator",
      allDistricts: "Todos os distritos",
      allSectors: "Todos os setores",
    },
    emptyLayer: "Nenhum ator corresponde aos filtros selecionados.",
  },

  actors: {
    title: "Atores",
    subtitle: "Gestão do cadastro de atores",
    newActor: "Novo ator",
    list: {
      columns: {
        name: "Nome",
        type: "Tipo",
        sector: "Setor",
        district: "Distrito",
        updatedAt: "Atualizado em",
        actions: "Ações",
      },
      empty: "Ainda não existem atores registados.",
      noMatches: "Nenhum ator corresponde aos filtros selecionados.",
    },
    filters: {
      searchPlaceholder: "Pesquisar por nome…",
      district: "Distrito",
      sector: "Setor",
      actorType: "Tipo de ator",
      allDistricts: "Todos os distritos",
      allSectors: "Todos os setores",
      allTypes: "Todos os tipos",
      clear: "Limpar filtros",
    },
    rowActions: {
      /** {name} */
      edit: "Editar {name}",
      /** {name} */
      delete: "Eliminar {name}",
      /** {name} */
      view: "Ver detalhes de {name}",
    },
    detail: {
      back: "Voltar à lista",
      edit: "Editar",
      yes: "Sim",
      no: "Não",
      empty: "—",
      metadata: "Metadados do registo",
      createdAt: "Criado em",
      updatedAt: "Atualizado em",
      version: "Versão",
      viewOnMap: "Ver no mapa",
      coordinates: "Coordenadas",
    },
    delete: {
      /** {name} */
      confirm: "Pretende eliminar «{name}»? Esta ação não pode ser anulada.",
      error: "Não foi possível eliminar o ator. Tente novamente.",
    },
    form: {
      createTitle: "Registar novo ator",
      editTitle: "Editar ator",
      sections: {
        identification: "Identificação",
        profile: "Perfil do respondente",
        location: "Localização",
        scope: "Âmbito de actuação",
        legal: "Situação legal",
        contacts: "Contactos",
        activity: "Atividade",
        financing: "Financiamento",
      },
      fields: {
        name: "Nome",
        registrationNumber: "Número de registo",
        actorType: "Tipo de ator",
        legalStatus: "Estatuto legal",
        sector: "Setor",
        district: "Distrito",
        administrativePost: "Posto administrativo",
        locality: "Localidade",
        latitude: "Latitude",
        longitude: "Longitude",
        responsiblePerson: "Pessoa responsável",
        phone: "Telemóvel",
        email: "Correio eletrónico",
        address: "Endereço",
        description: "Descrição da atividade",
        observations: "Observações",
        startDate: "Data de início da atividade",
        fundingType: "Tipo de financiamento",
        imageUrl: "Imagem (URL)",
        acronym: "Sigla ou nome comercial",
        respondentSex: "Sexo do respondente",
        respondentAge: "Idade do respondente",
        respondentEducation: "Nível de escolaridade do respondente",
        phoneAlt: "Telefone alternativo / WhatsApp",
        website: "Website / redes sociais",
        subsectors: "Subsectores em que actua",
        valueChainLinks: "Elos da cadeia de valor em que actua",
        operationLevel: "Nível de actuação mais elevado",
        districtsOfOperation: "Distritos da Província de Maputo onde actua",
        legalFormality: "Situação legal",
        registrationDocs: "Documentos de registo e licenças que possui",
        nuit: "NUIT",
        consent: "O respondente aceita participar no inquérito",
        contactSharingConsent:
          "Autoriza partilhar os contactos com os parceiros da DPAP",
        fundingSources: "Fontes de financiamento",
        receivedCredit: "Obteve crédito nos últimos 12 meses",
      },
      selectOption: "Selecione…",
      hints: {
        registrationNumber:
          "Deixe em branco se o ator ainda não possuir número de registo.",
        coordinates: "Capturadas automaticamente no terreno via GPS.",
        description:
          "Descreva a atividade do ator com o máximo de detalhe possível.",
        imageUrl: "Ligação para uma fotografia do ator ou da atividade.",
      },
      saved: "Ator registado com sucesso.",
      updated: "Ator atualizado com sucesso.",
      conflictStale:
        "Este ator foi alterado por outro utilizador. Recarregue a página e tente novamente.",
      saveError:
        "Não foi possível guardar o ator. Verifique a ligação e tente novamente.",
      conflictError:
        "Já existe um ator com estes dados. Reveja os duplicados antes de guardar.",
      restart: "Recomeçar",
      restartConfirm: "Limpar o formulário e começar um novo registo?",
    },
  },

  reports: {
    title: "Relatórios",
    subtitle: "Filtre o cadastro e exporte apenas o que precisa",
    summary: {
      /** {count} */
      matched: "{count} atores correspondem aos filtros atuais",
      none: "Nenhum ator corresponde aos filtros atuais.",
      filtersTitle: "1. Filtrar",
      filtersHint: "Defina os filtros; o total e a exportação atualizam-se automaticamente.",
    },
    columns: {
      heading: "2. Escolher colunas a imprimir",
      all: "Todas",
      none: "Nenhuma",
      /** {n}, {total} */
      selected: "{n} de {total} colunas selecionadas",
    },
    export: {
      heading: "3. Exportar",
      description: "A exportação respeita os filtros e as colunas selecionadas.",
      csv: "CSV",
      xlsx: "Excel",
      pdf: "PDF",
      csvNote: "O CSV abre em qualquer folha de cálculo; o Excel e o PDF requerem o backend completo.",
      /** {format} */
      download: "Exportar {format}",
    },
    geo: {
      heading: "Dados georreferenciados",
      description: "Exporte os actores para SIG (QGIS) em formato aberto.",
      anonymised: "Anonimizar produtores individuais",
      geojson: "GeoJSON",
      kml: "KML",
    },
    dictionary: {
      heading: "Dicionário de dados",
      description: "A especificação do questionário (todos os campos, códigos e validações).",
      json: "JSON",
      csv: "CSV",
    },
    errors: {
      formato:
        "Este formato só está disponível com o backend completo. No modo de demonstração utilize CSV.",
      exportacao:
        "Não foi possível gerar a exportação. Verifique a ligação e tente novamente.",
    },
  },

  validation: {
    required: "Este campo é obrigatório.",
    /** {field} */
    requiredField: "O campo {field} é obrigatório.",
    /** {min} */
    minLength: "Deve ter pelo menos {min} caracteres.",
    /** {max} */
    maxLength: "Não pode ter mais de {max} caracteres.",
    email: "Introduza um endereço de correio eletrónico válido.",
    phone: "Introduza um número de telemóvel válido de Moçambique.",
    latitude: "A latitude deve estar entre -90 e 90.",
    longitude: "A longitude deve estar entre -180 e 180.",
    invalidOption: "Selecione uma opção válida.",
  },

  duplicates: {
    checking: "A verificar duplicados…",
    none: "Nenhum registo semelhante encontrado.",
    /** {count} */
    found:
      "Foram encontrados {count} registos semelhantes. Verifique antes de guardar para evitar duplicação.",
    /** {name}, {district} */
    exact:
      "Já existe um ator «{name}» no distrito de {district}. Não é possível criar um duplicado.",
    viewExisting: "Ver registo existente",
    confirmAnyway: "Registar mesmo assim",
  },

  roles: {
    sysadmin: "Administrador do Sistema",
    datamanager: "Gestor de Dados",
    supervisor: "Supervisor",
    enumerator: "Inquiridor",
    analyst: "Analista",
    partner: "Parceiro",
  },

  auth: {
    login: {
      title: "Iniciar sessão",
      subtitle: "Aceda à plataforma de gestão do DPAP",
      heroTagline:
        "Sistema georreferenciado de mapeamento de atores da agricultura, pecuária, pescas e aquacultura.",
      gov: "República de Moçambique · Província de Maputo",
      email: "Correio eletrónico",
      password: "Palavra-passe",
      submit: "Entrar",
      submitting: "A entrar…",
      invalid: "Credenciais inválidas. Verifique e tente novamente.",
      error: "Não foi possível iniciar sessão. Tente novamente.",
      devHint:
        "Modo de demonstração — use um dos endereços abaixo com qualquer palavra-passe:",
    },
    session: {
      /** {name} */
      signedInAs: "{name}",
      role: "Perfil",
      logout: "Terminar sessão",
    },
    forbidden: {
      title: "Acesso restrito",
      description: "Não tem permissões para aceder a esta área.",
    },
  },

  admin: {
    title: "Administração",
    subtitle: "Gestão de utilizadores, territórios e definições do sistema",
    sections: {
      users: "Utilizadores",
      territories: "Territórios",
      categories: "Categorias",
      settings: "Definições do sistema",
    },
    placeholder: "Módulo de administração em desenvolvimento.",
    users: {
      title: "Utilizadores",
      subtitle: "Gestão de contas e perfis de acesso",
      newUser: "Novo utilizador",
      columns: {
        name: "Nome",
        email: "Correio eletrónico",
        role: "Perfil",
        status: "Estado",
        actions: "Ações",
      },
      status: {
        enabled: "Ativo",
        disabled: "Inativo",
      },
      empty: "Nenhum utilizador registado.",
      form: {
        createTitle: "Novo utilizador",
        editTitle: "Editar utilizador",
        name: "Nome",
        email: "Correio eletrónico",
        role: "Perfil",
        password: "Palavra-passe",
        passwordHint: "Mínimo de 8 caracteres.",
        passwordEditHint: "Deixe em branco para manter a palavra-passe atual.",
        enabled: "Conta ativa",
        emailImmutable: "O correio eletrónico não pode ser alterado.",
      },
      created: "Utilizador criado com sucesso.",
      updated: "Utilizador atualizado com sucesso.",
      conflictError:
        "Já existe um utilizador com este correio eletrónico.",
      saveError: "Não foi possível guardar o utilizador. Tente novamente.",
      deleteError: "Não foi possível eliminar o utilizador.",
      /** {name} */
      deleteConfirm: "Pretende eliminar «{name}»? Esta ação não pode ser anulada.",
    },
    audit: {
      title: "Registo de auditoria",
      subtitle: "Histórico de alterações aos dados do sistema",
      columns: {
        at: "Data e hora",
        user: "Utilizador",
        action: "Ação",
        entity: "Entidade",
        summary: "Detalhe",
      },
      actions: {
        CREATE: "Criação",
        UPDATE: "Atualização",
        DELETE: "Eliminação",
      },
      entities: {
        ACTOR: "Ator",
        USER: "Utilizador",
      },
      filters: {
        entity: "Entidade",
        action: "Ação",
        allEntities: "Todas as entidades",
        allActions: "Todas as ações",
        clear: "Limpar filtros",
      },
      empty: "Sem registos de auditoria.",
      /** {from}, {to}, {total} */
      summary: "A mostrar {from}–{to} de {total}",
    },
  },

  domain: {
    actorType: {
      PRODUCER: "Produtor",
      PRODUCER_ASSOCIATION: "Associação de produtores",
      LIVESTOCK_PRODUCER: "Produtor pecuário",
      FISHERIES_ACTOR: "Ator das pescas",
      AQUACULTURE_ACTOR: "Ator da aquacultura",
      NGO: "ONG",
      INTERNATIONAL_ORGANIZATION: "Organização internacional",
      COOPERATION_AGENCY: "Agência de cooperação",
      RESEARCH_INSTITUTION: "Instituição de investigação",
      EDUCATIONAL_INSTITUTION: "Instituição de ensino",
      PRIVATE_COMPANY: "Empresa privada",
      PUBLIC_INSTITUTION: "Instituição pública",
    },
    sector: {
      AGRICULTURE: "Agricultura",
      LIVESTOCK: "Pecuária",
      FISHERIES: "Pescas",
      AQUACULTURE: "Aquacultura",
    },
    legalStatus: {
      INDIVIDUAL: "Singular",
      ASSOCIATION: "Associação",
      COOPERATIVE: "Cooperativa",
      COMPANY: "Empresa",
      PUBLIC: "Entidade pública",
      NGO: "Organização não governamental",
      INFORMAL: "Informal",
    },
    fundingType: {
      SELF: "Autofinanciamento",
      PUBLIC: "Financiamento público",
      PRIVATE: "Financiamento privado",
      DONOR: "Doadores / Cooperação",
      MIXED: "Misto",
    },
    respondentSex: {
      MALE: "Masculino",
      FEMALE: "Feminino",
    },
    education: {
      NONE: "Nenhum",
      PRIMARY: "Primário",
      SECONDARY: "Secundário",
      TECHNICAL: "Técnico-profissional",
      HIGHER: "Superior",
    },
    subsector: {
      AGRICULTURE: "Agricultura",
      LIVESTOCK: "Pecuária",
      FISHERIES: "Pesca",
      AQUACULTURE: "Aquacultura",
      AGROPROCESSING: "Agro-processamento",
      OTHER: "Outro",
    },
    valueChainLink: {
      INPUTS: "Fornecimento de insumos",
      PRODUCTION: "Produção",
      PROCESSING: "Transformação / processamento",
      MARKETING: "Comercialização",
      LOGISTICS: "Logística, transporte e armazenagem",
      EXTENSION: "Assistência técnica / extensão",
      FINANCE: "Serviços financeiros",
      RESEARCH: "Investigação / formação",
      REGULATION: "Regulação / gestão pública",
      OTHER: "Outro",
    },
    operationLevel: {
      NATIONAL: "Nacional",
      PROVINCIAL: "Provincial",
      DISTRICT: "Distrital",
      ADMIN_POST: "Posto Administrativo",
      LOCALITY: "Localidade / comunitário",
    },
    legalFormality: {
      REGISTERED: "Formalmente registado / legalizado",
      IN_PROGRESS: "Em processo de registo",
      INFORMAL: "Não registado (informal)",
    },
    registrationDoc: {
      PERMIT: "Alvará / licença de actividade",
      ENTITY_CERT: "Certidão de registo de entidade legal",
      STATUTES: "Estatutos publicados no Boletim da República",
      NUIT: "NUIT",
      FISHING_LICENSE: "Licença de pesca",
      AQUA_LICENSE: "Licença de aquacultura",
      DUAT: "DUAT",
      PRODUCER_CARD: "Cartão / registo de produtor",
      OTHER: "Outro",
    },
    fundingSource: {
      OWN: "Recursos próprios",
      BANK: "Crédito bancário",
      MICROFINANCE: "Microfinanças",
      PROJECT: "Projecto / ONG",
      GOVERNMENT: "Governo / programa público",
      FAMILY: "Família / informal",
      NONE: "Nenhum",
    },
  },

  errors: {
    notFound: {
      title: "Página não encontrada",
      description: "A página que procura não existe ou foi movida.",
      backHome: "Voltar ao painel",
    },
    generic: {
      title: "Algo correu mal",
      description:
        "Não foi possível concluir a operação. Tente novamente mais tarde.",
    },
  },
} as const;
