import { Clause, FolderNode, SampleTemplate, QuestionnaireAnswer } from '../types';

export const INITIAL_FOLDERS: FolderNode[] = [
  { id: '1', name: 'Договоры (Agreements)', parentId: null },
  { id: '2', name: 'Поставка (Supply)', parentId: '1' },
  { id: '3', name: 'Предмет договора', parentId: '2' },
  { id: '19', name: 'Ответственность', parentId: '2' },
  { id: '26', name: 'Форс-мажор', parentId: '2' },
  { id: '34', name: 'Приемка товара', parentId: '2' },
  { id: '60', name: 'Порядок поставки', parentId: '2' },
  { id: '8', name: 'Подряд (Contracting)', parentId: '1' },
  { id: '9', name: 'Ответственность и оплата', parentId: '8' },
  { id: '11', name: 'Общие условия', parentId: '1' },
  { id: '12', name: 'Срок действия договора', parentId: '11' },
  { id: '14', name: 'Подписи', parentId: '11' },
  { id: '29', name: 'Реквизиты', parentId: '11' },
  { id: '36', name: 'Форс-мажор и военное положение', parentId: '11' },
  { id: '55', name: 'Уведомления и документооборот', parentId: '11' },
  { id: '58', name: 'Ограничения ответственности', parentId: '11' },
  { id: '65', name: 'Электронный документооборот (ЭДО)', parentId: '11' },
  { id: '73', name: 'Санкционные оговорки и гарантии', parentId: '11' },
  { id: '16', name: 'Аренда (Lease)', parentId: '1' },
  { id: '88', name: 'Прекращение договора', parentId: '16' },
  { id: '31', name: 'ВЭД / Арбитраж (International)', parentId: '1' },
  { id: '32', name: 'Арбитражные оговорки', parentId: '31' },
];

export const INITIAL_QUESTIONNAIRE: QuestionnaireAnswer[] = [
  {
    id: 'product_name',
    label: 'Наименование товара / продукции',
    type: 'text',
    value: 'Металлопрокат марки Ст3сп',
    affectsVariable: 'Товар'
  },
  {
    id: 'payment_type',
    label: 'Порядок оплаты договора',
    type: 'select',
    value: 'Предоплата (100%)',
    options: ['Предоплата (100%)', 'Постоплата (по факту)', 'Смешанная (50/50)'],
    affectsVariable: 'Счет-фактура'
  },
  {
    id: 'penalty_rate',
    label: 'Размер неустойки за просрочку (% в день)',
    type: 'number',
    value: 0.5,
    affectsVariable: '0,5'
  },
  {
    id: 'delay_days',
    label: 'Допустимый срок просрочки поставки (в днях)',
    type: 'number',
    value: 5,
    affectsVariable: '5'
  },
  {
    id: 'annual_interest',
    label: 'Процент годовых за пользование предоплатой (%)',
    type: 'number',
    value: 18,
    affectsVariable: '18'
  },
  {
    id: 'include_edo',
    label: 'Использовать электронный документооборот (КЭП / M.E.Doc / Вчасно)',
    type: 'boolean',
    value: true,
    affectsClauseId: '68'
  },
  {
    id: 'sanctions_check',
    label: 'Включать жесткие санкционные гарантии и запевнения',
    type: 'boolean',
    value: true,
    affectsClauseId: '74'
  },
  {
    id: 'jurisdiction',
    label: 'Юрисдикция разрешения споров',
    type: 'select',
    value: 'Украина (Хозяйственный суд)',
    options: ['Украина (Хозяйственный суд)', 'Польша (МКАС г. Варшава)', 'Великобритания (LCIA)'],
    affectsClauseId: '33'
  }
];

export const INITIAL_CLAUSES: Clause[] = [
  {
    id: '71',
    name: 'Согласование условий путем оплаты счета',
    category: 'Поставка',
    folderId: '3',
    titleRu: 'Согласование условий поставки',
    titleEn: 'Agreement on delivery terms',
    contentRu: 'Факт поставки [Товара] или факт оплаты [Счета-фактуры] означает взаимное согласие [Поставщика] и [Покупателя] с условиями поставки и условиями оплаты [Товара], ценой, общим количеством, ассортиментом и номенклатурой [Товара], указанными в [Счетах-фактурах] [Поставщика].',
    contentEn: 'The fact of delivery of the [Goods] or payment of the [Invoice] constitutes mutual agreement of the [Supplier] and the [Buyer] with the terms of delivery, payment, price, and quantity stated in the [Supplier]\'s invoices.',
    level: 0,
    isFavorite: true,
    variables: ['Товар', 'Счет-фактура', 'Поставщик', 'Покупатель'],
    tags: ['поставка', 'оплата', 'счет'],
    questions: [
      {
        id: 'product_name',
        label: 'Наименование товара / продукции',
        type: 'text',
        value: 'Металлопрокат марки Ст3сп',
        affectsVariable: 'Товар'
      },
      {
        id: 'payment_type',
        label: 'Порядок оплаты договора',
        type: 'select',
        value: 'Предоплата (100%)',
        options: ['Предоплата (100%)', 'Постоплата (по факту)', 'Смешанная (50/50)'],
        affectsVariable: 'Счет-фактура'
      }
    ]
  },
  {
    id: '20',
    name: 'Неустойка за несвоевременную поставку',
    category: 'Ответственность',
    folderId: '19',
    titleRu: 'Ответственность Поставщика',
    titleEn: 'Supplier Liability',
    contentRu: 'В случае нарушения [Поставщиком] сроков поставки [Продукции], [Поставщик] уплачивает [Покупателю] неустойку в размере [0,5]% от стоимости непоставленной [Продукции] за каждый день просрочки поставки.',
    contentEn: 'In case of breach by the [Supplier] of the delivery terms of the [Products], the [Supplier] shall pay to the [Buyer] a penalty of [0.5]% of the value of undelivered [Products] for each day of delay.',
    level: 0,
    isFavorite: true,
    variables: ['Поставщик', 'Продукция', 'Покупатель', '0,5'],
    tags: ['неустойка', 'просрочка', 'штраф'],
    questions: [
      {
        id: 'penalty_rate',
        label: 'Размер неустойки за просрочку (% в день)',
        type: 'number',
        value: 0.5,
        affectsVariable: '0,5'
      }
    ]
  },
  {
    id: '21',
    name: 'Проценты за предоплату при просрочке',
    category: 'Ответственность',
    folderId: '19',
    titleRu: 'Проценты за пользование денежными средствами',
    titleEn: 'Interest on Prepayment',
    contentRu: 'Если сроки поставки [Продукции] нарушены более чем на [5] дней, а [Покупателем] внесена предоплата, [Поставщик] за пользование денежными средствами обязан уплатить [Покупателю] [18]% годовых от суммы предоплаты за период с даты оплаты до дня фактической поставки или возврата средств.',
    contentEn: 'If delivery is delayed by more than [5] days and prepayment was made, the [Supplier] shall pay [18]% per annum on the prepaid amount for the delay period.',
    level: 0,
    isFavorite: false,
    variables: ['Продукция', 'Покупатель', '5', 'Поставщик', '18'],
    tags: ['предоплата', 'проценты', 'возврат'],
    questions: [
      {
        id: 'delay_days',
        label: 'Допустимый срок просрочки поставки (в днях)',
        type: 'number',
        value: 5,
        affectsVariable: '5'
      },
      {
        id: 'annual_interest',
        label: 'Процент годовых за пользование предоплатой (%)',
        type: 'number',
        value: 18,
        affectsVariable: '18'
      }
    ]
  },
  {
    id: '35',
    name: 'Приемка товара по Инструкции П-6 и П-7',
    category: 'Приемка',
    folderId: '34',
    titleRu: 'Порядок приемки товара',
    titleEn: 'Procedure for Acceptance of Goods',
    contentRu: 'Приемка [Товара] по количеству и качеству осуществляется [Покупателем] в соответствии с установленными стандартами и сопроводительными документами.\n\tСтороны согласовали, что [Покупатель] имеет право составить акты приемки Товара по качеству/количеству односторонне при отсутствии специализированной инспекции.',
    contentEn: 'Acceptance of [Goods] by quantity and quality is executed by [Buyer] in accordance with standards and transport documents.',
    level: 0,
    isFavorite: false,
    variables: ['Товар', 'Покупатель'],
    tags: ['приемка', 'качество', 'количество'],
    questions: []
  },
  {
    id: '10',
    name: 'Односторонний отказ от договора подряда',
    category: 'Подряд',
    folderId: '9',
    titleRu: 'Расторжение договора и возврат предоплаты',
    titleEn: 'Termination and Prepayment Refund',
    contentRu: 'В случае если сроки выполнения работ нарушены более чем на [10] дней, [Заказчик] имеет право отказаться от договора в одностороннем порядке путем направления письменного уведомления [Подрядчику].\n\tПри этом [Подрядчик] обязан в течение [3] дней возвратить [Заказчику] предоплату за вычетом фактически выполненных и принятых работ.',
    contentEn: 'In the event that the deadlines for performing work are breached by more than [10] days, the [Customer] has the right to unilaterally terminate the agreement.',
    level: 0,
    isFavorite: true,
    variables: ['10', 'Заказчик', 'Подрядчик', '3'],
    tags: ['подряд', 'расторжение', 'предоплата'],
    questions: [
      {
        id: 'delay_limit',
        label: 'Срок просрочки для одностороннего отказа (в днях)',
        type: 'number',
        value: 10,
        affectsVariable: '10'
      },
      {
        id: 'refund_days',
        label: 'Срок возврата предоплаты (в днях)',
        type: 'number',
        value: 3,
        affectsVariable: '3'
      }
    ]
  },
  {
    id: '13',
    name: 'Срок действия договора',
    category: 'Общие условия',
    folderId: '12',
    titleRu: 'Срок действия договора',
    titleEn: 'Term of Agreement',
    contentRu: 'Настоящий Договор вступает в силу с момента его подписания обеими Сторонами и действует до [31.12.2026] года или до полного выполнения Сторонами своих обязательств по настоящему Договору.',
    contentEn: 'This Agreement enters into force upon signature by both Parties and remains valid until [31.12.2026] or until full execution of contractual obligations.',
    level: 0,
    isFavorite: true,
    variables: ['31.12.2026'],
    tags: ['срок', 'действие', 'дата'],
    questions: []
  },
  {
    id: '57',
    name: 'Обмен электронными сообщениями',
    category: 'Общие условия',
    folderId: '55',
    titleRu: 'Электронная коммуникация',
    titleEn: 'Electronic Communications',
    contentRu: 'Стороны согласились, что уведомления, счета-фактуры, приложения к Договору и письма, полученные и переданные с помощью электронной почты на адреса, указанные в Договоре, имеют юридическую силу письменного оригинала.\n\tАдрес электронной почты [Поставщика]: [supplier@example.com]\n\tАдрес электронной почты [Заказчика]: [customer@example.com]',
    contentEn: 'The Parties agreed that notices, invoices, and documents exchanged via email addresses listed in the Agreement carry the legal force of an original written document.',
    level: 0,
    isFavorite: true,
    variables: ['Поставщик', 'supplier@example.com', 'Заказчик', 'customer@example.com'],
    tags: ['email', 'связь', 'электронная почта'],
    questions: []
  },
  {
    id: '68',
    name: 'Электронный документооборот (ЭДО / КЭП)',
    category: 'ЭДО',
    folderId: '65',
    titleRu: 'Электронный документооборот',
    titleEn: 'Electronic Document Interchange',
    contentRu: 'Стороны обязуются использовать электронный документооблачный сервис (M.E.Doc / Вчасно / Власне ПО) для подписи первичных документов, спецификаций и актов с использованием квалифицированной электронной подписи (КЭП/УЭП).\n\tОтправленные электронные документы имеют полную юридическую силу и признаются равнозначными бумажным документам.',
    contentEn: 'The Parties undertake to use an electronic document management system for signing primary documents and specifications using Qualified Electronic Signatures (QES).',
    level: 0,
    isFavorite: true,
    variables: [],
    tags: ['ЭДО', 'КЭП', 'M.E.Doc', 'Вчасно', 'цифровая подпись'],
    questions: [
      {
        id: 'include_edo',
        label: 'Использовать электронный документооборот (КЭП / M.E.Doc / Вчасно)',
        type: 'boolean',
        value: true,
        affectsClauseId: '68'
      }
    ]
  },
  {
    id: '74',
    name: 'Застережение про бенефициаров и санкции',
    category: 'Застережения',
    folderId: '73',
    titleRu: 'Санкционные гарантии Сторон',
    titleEn: 'Sanctions Warranties',
    contentRu: 'Стороны подтверждают и гарантируют, что на момент заключения этого договора, конечными бенефициарными владельцами, акционерами или руководителями юридических лиц не являются лица из санкционных списков, а также государства-агрессоры.',
    contentEn: 'The Parties confirm and warrant that as of the date of execution, no ultimate beneficial owners or directors belong to sanctioned lists or hostile state jurisdictions.',
    level: 0,
    isFavorite: true,
    variables: [],
    tags: ['санкции', 'гарантии', 'бенефициары'],
    questions: [
      {
        id: 'sanctions_check',
        label: 'Включать жесткие санкционные гарантии и заверения',
        type: 'boolean',
        value: true,
        affectsClauseId: '74'
      }
    ]
  },
  {
    id: '91',
    name: 'Полная версия Форс-Мажора',
    category: 'Форс-мажор',
    folderId: '36',
    titleRu: 'Форс-мажорные обстоятельства',
    titleEn: 'Force Majeure Clause',
    contentRu: 'Стороны освобождаются от ответственности за неисполнение или ненадлежащее исполнение обязательств по настоящему Договору в случае возникновения обстоятельств непреодолимой силы (форс-мажор), возникших вне воли Сторон.\n\tСторона, для которой сложились форс-мажорные обстоятельства, обязана в течение [14] дней уведомить другую Сторону и предоставить сертификат Торгово-промышленной палаты.',
    contentEn: 'The Parties shall be released from liability for partial or complete non-performance of obligations under this Agreement if such failure is caused by force majeure events.\n\tThe affected Party shall notify the other Party within [14] days and provide a Certificate from the Chamber of Commerce.',
    level: 0,
    isFavorite: false,
    variables: ['14'],
    tags: ['форс-мажор', 'ТПП', 'война', 'карантин'],
    questions: []
  },
  {
    id: '33',
    name: 'Альтернативный международный арбитраж',
    category: 'ВЭД',
    folderId: '32',
    titleRu: 'Порядок разрешения споров (Арбитраж)',
    titleEn: 'Dispute Resolution (Arbitration)',
    contentRu: 'Все споры и разногласия, возникающие из настоящего контракта, по выбору инициирующей Стороны подлежат разрешению либо в судах [Украины], либо в судах [Польши], либо в Арбитражном Суде при [Польской Хозяйственной Палате] в г. [Варшава] единоличным арбитром.',
    contentEn: 'Any dispute, controversy or claim arising out of or relating to this contract shall be settled at the option of the initiating Party either by courts of [Ukraine], courts of [Poland], or under Arbitration Rules of the Court of Arbitration at the [Polish Chamber of Commerce] in [Warsaw].',
    level: 0,
    isFavorite: false,
    variables: ['Украины', 'Польши', 'Польской Хозяйственной Палате', 'Варшава'],
    tags: ['ВЭД', 'арбитраж', 'международный', 'суд'],
    questions: [
      {
        id: 'jurisdiction',
        label: 'Юрисдикция разрешения споров',
        type: 'select',
        value: 'Украина (Хозяйственный суд)',
        options: ['Украина (Хозяйственный суд)', 'Польша (МКАС г. Варшава)', 'Великобритания (LCIA)'],
        affectsClauseId: '33'
      }
    ]
  },
  {
    id: '18',
    name: 'Одностороннее прекращение аренды',
    category: 'Аренда',
    folderId: '88',
    titleRu: 'Прекращение договора аренды',
    titleEn: 'Lease Agreement Termination',
    contentRu: 'Датой прекращения договора в случаях, предусмотренных настоящим пунктом, является дата получения [Арендатором] уведомления [Арендодателя]. При ненадлежащем вручении письмо считается полученным на [5]-й день с момента сдачи организации связи.',
    contentEn: 'The termination date of the lease shall be the date of receipt by the [Tenant] of notice from the [Landlord].',
    level: 0,
    isFavorite: true,
    variables: ['Арендатором', 'Арендодателя', '5'],
    tags: ['аренда', 'уведомление', 'расторжение'],
    questions: []
  }
];

export const SAMPLE_TEMPLATES: SampleTemplate[] = [
  {
    id: 'tpl-supply',
    name: 'Договор поставки товаров',
    category: 'Поставка',
    description: 'Комплексный шаблон поставки: правила приемки, санкции, неустойка и ЭДО.',
    partyARole: 'Поставщик',
    partyBRole: 'Покупатель',
    clauseIds: ['71', '35', '20', '21', '57', '68', '74', '91', '13'],
    questionnaire: INITIAL_QUESTIONNAIRE,
    customVariables: {
      'Товар': 'Металлопрокат марки Ст3сп',
      'Продукция': 'Лист стальной 10мм',
      'Счет-фактура': 'Счет-фактура № 102',
      '0,5': '0.5',
      '18': '18',
      '5': '5',
      '14': '14',
      '31.12.2026': '31.12.2026'
    }
  },
  {
    id: 'tpl-contracting',
    name: 'Договор подряда (Выполнение работ)',
    category: 'Подряд',
    description: 'Шаблон подряда с гибкими правилами расторжения, возвратом авансов и санкционными гарантиями.',
    partyARole: 'Подрядчик',
    partyBRole: 'Заказчик',
    clauseIds: ['10', '57', '68', '74', '91', '13'],
    questionnaire: [
      {
        id: 'work_type',
        label: 'Описание выполняемых подрядных работ',
        type: 'text',
        value: 'Монтаж строительных конструкций',
        affectsVariable: 'Работы'
      },
      {
        id: 'delay_limit',
        label: 'Срок просрочки для одностороннего отказа (в днях)',
        type: 'number',
        value: 10,
        affectsVariable: '10'
      },
      {
        id: 'refund_days',
        label: 'Срок возврата предоплаты (в днях)',
        type: 'number',
        value: 3,
        affectsVariable: '3'
      },
      {
        id: 'use_edo',
        label: 'Использовать электронный документооборот (ЭДО)',
        type: 'boolean',
        value: true,
        affectsClauseId: '68'
      }
    ],
    customVariables: {
      '10': '10',
      '3': '3',
      'Заказчик': 'Заказчик',
      'Подрядчик': 'Подрядчик',
      '31.12.2026': '31.12.2026'
    }
  },
  {
    id: 'tpl-ved',
    name: 'ВЭД Контракт с арбитражем',
    category: 'ВЭД',
    description: 'Двуязычный международный контракт с альтернативным арбитражем и выбором подсудности.',
    partyARole: 'Продавец (Seller)',
    partyBRole: 'Покупатель (Buyer)',
    clauseIds: ['71', '20', '33', '74', '91', '13'],
    questionnaire: [
      {
        id: 'country_jurisdiction',
        label: 'Выберите страну международного арбитража',
        type: 'select',
        value: 'Польша (МКАС г. Варшава)',
        options: ['Украина (Хозяйственный суд)', 'Польша (МКАС г. Варшава)', 'Великобритания (LCIA)'],
        affectsVariable: 'Польши'
      },
      {
        id: 'bilingual_mode',
        label: 'Составлять контракт на двух языках (RU / EN)',
        type: 'boolean',
        value: true
      }
    ],
    customVariables: {
      'Украины': 'Украины',
      'Польши': 'Польши',
      'Польской Хозяйственной Палате': 'Польской Хозяйственной Палате',
      'Варшава': 'Варшава'
    }
  }
];
