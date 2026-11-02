/**
 * Portuguese (pt) message catalog — the single source of truth for all
 * user-facing text in the mobile PWA. No user-facing string may be hardcoded in
 * a component; add it here instead. `{placeholders}` are resolved with
 * `format()`. Domain codes are the keys under `domain.*` (shared wire contract
 * with DPAP-web and the backend).
 */

export const pt = {
  app: {
    name: "e-DPAP",
    tagline: "Recolha de dados no terreno",
    subtitle: "Agricultura, pecuária, pescas e aquacultura — DPAP Maputo",
  },

  common: {
    actions: {
      save: "Guardar",
      cancel: "Cancelar",
      edit: "Editar",
      delete: "Eliminar",
      confirm: "Confirmar",
      retry: "Tentar novamente",
      add: "Adicionar",
      back: "Voltar",
      close: "Fechar",
    },
    states: {
      loading: "A carregar…",
      saving: "A guardar…",
      empty: "Sem registos",
      required: "Obrigatório",
      optional: "Opcional",
    },
  },

  nav: {
    list: "Atores",
    newActor: "Novo ator",
    title: "Registos locais",
    interviews: "Entrevistas",
    actorsTab: "Atores",
  },

  interviews: {
    title: "Entrevistas",
    new: "Nova entrevista",
    restart: "Recomeçar",
    restartConfirm: "Descartar esta entrevista e começar uma nova?",
    empty: "Ainda não há entrevistas neste dispositivo.",
    statusDraft: "Rascunho",
    statusPending: "Por sincronizar",
    statusSynced: "Sincronizada",
    statusError: "Erro",
    number: "Nº {n}",
    open: "Abrir",
    discard: "Eliminar",
    discardConfirm: "Eliminar esta entrevista?",
    savedDraft: "Rascunho guardado",
    submitBlocked: "Corrija os campos obrigatórios antes de submeter.",
    submitted: "Entrevista submetida.",
    errorsCount: "{n} campo(s) por preencher",
    untitled: "Entrevista sem nome",
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
    takePhoto: "Tirar fotografia",
    replacePhoto: "Substituir fotografia",
    removePhoto: "Remover",
    choose: "Seleccione…",
    otherSpecify: "Especificar",
    errorsTitle: "Campos obrigatórios em falta",
  },

  sync: {
    online: "Online",
    offline: "Offline",
    syncNow: "Sincronizar",
    syncing: "A sincronizar…",
    /** {count} */
    pending: "{count} por sincronizar",
    allSynced: "Tudo sincronizado",
    /** {count} */
    received: "{count} recebidos do servidor",
    /** {at} */
    lastSync: "Última sincronização: {at}",
    never: "ainda não sincronizado",
    offlineHint:
      "Sem ligação. Os registos ficam guardados no dispositivo e serão enviados automaticamente quando houver rede.",
    /** {ok}, {failed} */
    result: "{ok} enviados, {failed} com erro.",
    conflictResolved: "Conflito resolvido pela versão mais recente do servidor.",
    error: "Não foi possível sincronizar. Tentaremos novamente.",
  },

  auth: {
    title: "Iniciar sessão",
    subtitle: "Aceda para recolher dados no terreno",
    email: "Correio eletrónico",
    password: "Palavra-passe",
    submit: "Entrar",
    submitting: "A entrar…",
    invalid: "Credenciais inválidas. Verifique e tente novamente.",
    offline: "É necessária ligação à internet para iniciar sessão a primeira vez.",
    error: "Não foi possível iniciar sessão. Tente novamente.",
    logout: "Terminar sessão",
    /** {name} */
    signedInAs: "Sessão: {name}",
  },

  actors: {
    restart: "Recomeçar",
    restartConfirm: "Limpar o formulário e começar um novo registo?",
    list: {
      title: "Registos locais",
      empty: "Ainda não recolheu nenhum ator. Toque em «Novo ator» para começar.",
      /** {count} */
      count: "{count} registos",
      searchPlaceholder: "Pesquisar por nome…",
    },
    status: {
      pending: "Por sincronizar",
      synced: "Sincronizado",
      conflict: "Conflito",
    },
    form: {
      createTitle: "Novo ator",
      editTitle: "Editar ator",
      sections: {
        identification: "Identificação",
        profile: "Perfil do respondente",
        location: "Localização",
        gps: "Coordenadas GPS",
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
        districtsOfOperation: "Distritos onde actua",
        legalFormality: "Situação legal",
        registrationDocs: "Documentos de registo e licenças",
        nuit: "NUIT",
        consent: "O respondente aceita participar no inquérito",
        contactSharingConsent: "Autoriza partilhar os contactos com a DPAP",
        fundingSources: "Fontes de financiamento",
        receivedCredit: "Obteve crédito nos últimos 12 meses",
      },
      activityHint: "Acrescente o máximo de detalhe possível sobre a atividade.",
      select: "Selecione…",
      saved: "Ator guardado no dispositivo.",
      deleteConfirm: "Eliminar este registo local?",
    },
    conflict: {
      title: "Conflito de sincronização",
      /** {count} */
      banner: "{count} registo(s) com conflito a precisar de revisão.",
      duplicate:
        "O servidor já tem um ator com estes dados. Edite para o diferenciar (por exemplo, o nome ou o número de registo) e guarde para tentar novamente, ou elimine este registo local.",
      generic:
        "A última sincronização falhou. Reveja os dados e guarde para tentar novamente.",
      /** {detail} */
      detail: "Detalhe: {detail}",
    },
    gps: {
      capture: "Capturar GPS",
      capturing: "A obter localização…",
      /** {accuracy} */
      accuracy: "Precisão: ±{accuracy} m",
      /** {at} */
      capturedAt: "Capturado às {at}",
      unavailable: "GPS indisponível neste dispositivo.",
      denied: "Permissão de localização negada. Ative-a para capturar coordenadas.",
      error: "Não foi possível obter a localização. Tente novamente ao ar livre.",
      manualHint: "Pode introduzir as coordenadas manualmente se o GPS falhar.",
    },
  },

  validation: {
    required: "Este campo é obrigatório.",
    /** {min} */
    minLength: "Deve ter pelo menos {min} caracteres.",
    email: "Introduza um endereço de correio eletrónico válido.",
    phone: "Introduza um número de telemóvel válido de Moçambique.",
    latitude: "A latitude deve estar entre -90 e 90.",
    longitude: "A longitude deve estar entre -180 e 180.",
    invalidOption: "Selecione uma opção válida.",
    fixErrors: "Corrija os campos assinalados antes de guardar.",
  },

  duplicates: {
    checking: "A verificar duplicados…",
    /** {count} */
    found:
      "Foram encontrados {count} registos semelhantes neste dispositivo. Verifique antes de guardar.",
    /** {name}, {district} */
    exact:
      "Já existe «{name}» no distrito selecionado neste dispositivo. Não é possível criar um duplicado.",
    saveAnyway: "Guardar mesmo assim",
  },

  roles: {
    sysadmin: "Administrador do Sistema",
    datamanager: "Gestor de Dados",
    supervisor: "Supervisor",
    enumerator: "Inquiridor",
    analyst: "Analista",
    partner: "Parceiro",
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
    generic: "Algo correu mal. Tente novamente.",
    loadFailed: "Não foi possível carregar os dados.",
  },
} as const;

export type Dictionary = typeof pt;
