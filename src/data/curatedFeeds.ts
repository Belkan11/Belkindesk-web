import { CuratedCategoryPreset, FeedSource, Article } from '../types';

export const DEFAULT_AI_PROMPTS = {
  engineer: 'Перепиши материал как краткую единую практическую сводку для инженера и мастера по ремонту техники. Укажи устройство, симптом, причину и метод диагностики или ремонта. Сохрани модели, маркировки, схемы и профессиональные термины единым связным текстом без воды.',
  medical: 'Составь качественное связное клиническое резюме статьи на русском языке для врача-кардиолога. Изложи суть исследования, ключевые параметры, дозировки и практическое значение в виде одного цельного, ёмкого содержания без искусственного дробления на секции.',
  economist: 'Составь аналитическую сводку для экономиста и финансиста: ключевые макропоказатели, тренды рынков, процентные ставки, котировки и экспертные прогнозы единым емким текстом без лишней воды.',
  automobilist: 'Составь практический обзор для автомобилиста и специалиста автосервиса: модели авто, типичные неисправности ДВС и КПП, регламенты ТО, код ошибок и рекомендации по диагностике.',
  it: 'Составь техническое резюме для разработчика и IT-специалиста: архитектурные решения, релизы библиотек, уязвимости, тулинг и лучшие практики программирования.',
  business: 'Составь деловую сводку для предпринимателя: рыночные тренды, инвестиции, инструменты роста бизнеса, изменения законодательства и кейсы.',
  universal: 'Составь четкое связное резюме новости на русском языке: ключевые факты, цифры и практическая суть единым емким текстом без клише, рекламы и искусственного дробления на блоки.'
};

export const ENGINEER_DEFAULT_FEEDS: FeedSource[] = [
  {
    id: 'feed-yt-frp',
    title: 'FRP',
    type: 'youtube',
    searchQuery: 'android smartphone tablet unlock FRP bypass',
    hashtags: ['FRP bypass', 'Google account remove', 'Android unlock', 'screen lock remove', 'PIN lock remove', 'Honor FRP', 'Huawei FRP', 'Oppo FRP', 'Realme FRP', 'Vivo FRP', 'Samsung FRP', 'Xiaomi FRP'],
    url: 'https://www.youtube.com/results?search_query=android+smartphone+tablet+unlock+FRP+bypass',
    category: 'Разблокировка & ПО',
    description: 'Инструкции и байпас FRP / Google аккаунтов на телефонах и планшетах',
    status: 'idle',
    enabled: true,
  },
  {
    id: 'feed-yt-android-repair',
    title: 'Android',
    type: 'youtube',
    searchQuery: 'микропайка телефон ремонт платы samsung xiaomi',
    hashtags: ['ремонт телефонов', 'пайка bga', 'reballing', 'microsoldering', 'samsung repair', 'xiaomi repair'],
    url: 'https://www.youtube.com/results?search_query=микропайка+телефон+ремонт+платы+samsung+xiaomi',
    category: 'Пайка & Железо',
    description: 'Микропайка, реболл процессоров, замена контроллеров питания',
    status: 'idle',
    enabled: true,
  },
  {
    id: 'feed-yt-apple-repair',
    title: 'Apple',
    type: 'youtube',
    searchQuery: 'apple #ремонт, плата, пайка, микропайка, не включается, не заряжается, pmic, no power, bootloop, charging ic, usb-c, short circuit, board repair, microsoldering, reball',
    hashtags: ['apple repair', 'iphone no power', 'pmic', 'short circuit', 'tristar', 'u2', 'nand swap'],
    url: 'https://www.youtube.com/results?search_query=apple+board+repair+microsoldering',
    category: 'Apple Инженерия',
    description: 'Диагностика коротких замыканий, замена PMIC, ремонт цепей питания iPhone/iPad',
    status: 'idle',
    enabled: true,
  },
  {
    id: 'feed-pikabu-repair',
    title: 'Ремонт техники',
    type: 'pikabu',
    searchQuery: 'ремонт техники смартфоны пайка микроскоп',
    hashtags: ['ремонт техники', 'ремонт телефонов', 'электроника', 'длиннопост'],
    url: 'https://pikabu.ru/tag/Ремонт%20техники/hot',
    category: 'Кейсы ремонтов',
    description: 'Пошаговые фотоотчеты и интересные случаи ремонта от мастеров',
    status: 'idle',
    enabled: true,
  },
  {
    id: 'feed-4pda-news',
    title: '4PDA Hard & Soft',
    type: '4pda',
    searchQuery: 'прошивки модификации инструкции схемы',
    hashtags: ['прошивка', 'android', 'root', 'twrp', 'fastboot'],
    url: 'https://4pda.to/feed/',
    category: 'Прошивки & 4PDA',
    description: 'Форумные ветки, схемы, дампы памяти и решения софтовых проблем',
    status: 'idle',
    enabled: true,
  },
  {
    id: 'feed-reddit-mobilerepair',
    title: 'Reddit r/mobilerepair',
    type: 'reddit',
    searchQuery: 'microsoldering logic board schematic troubleshooting',
    hashtags: ['mobilerepair', 'microsoldering', 'logicboard', 'schematics'],
    url: 'https://www.reddit.com/r/mobilerepair/.rss',
    category: 'Мировое комьюнити',
    description: 'Обмен опытом с зарубежными инженерами и сервисными центрами',
    status: 'idle',
    enabled: true,
  }
];

export const MEDICAL_FEEDS: FeedSource[] = [
  {
    id: 'feed-rko',
    title: 'РКО — Российское кардиологическое общество',
    url: 'https://scardio.ru/rss/',
    siteUrl: 'https://scardio.ru',
    category: 'Кардиология РФ',
    description: 'Официальные клинические рекомендации, съезды и новости РКО',
    icon: 'Heart',
    status: 'idle',
    isPinned: true,
  },
  {
    id: 'feed-rkj',
    title: 'Российский кардиологический журнал',
    url: 'https://russjcardiol.elpub.ru/jour/rss',
    siteUrl: 'https://russjcardiol.elpub.ru',
    category: 'Кардиология РФ',
    description: 'Рецензируемый научно-практический журнал ВАК/Scopus',
    icon: 'BookOpen',
    status: 'idle',
    isPinned: true,
  },
  {
    id: 'feed-minzdrav',
    title: 'Минздрав России',
    url: 'https://minzdrav.gov.ru/rss',
    siteUrl: 'https://minzdrav.gov.ru',
    category: 'Здравоохранение РФ',
    description: 'Официальные приказы, стандарты медпомощи и пресс-релизы',
    icon: 'Shield',
    status: 'idle',
    isPinned: true,
  },
  {
    id: 'feed-esc',
    title: 'ESC — European Society of Cardiology',
    url: 'https://www.escardio.org/rss/guidelines.xml',
    siteUrl: 'https://www.escardio.org',
    category: 'Мировая кардиология',
    description: 'Европейские клинические гайдлайны и конгрессы ESC',
    icon: 'Globe',
    status: 'idle',
    isPinned: true,
  },
  {
    id: 'feed-acc',
    title: 'ACC — American College of Cardiology',
    url: 'https://www.acc.org/rss/clinical-topics',
    siteUrl: 'https://www.acc.org',
    category: 'Мировая кардиология',
    description: 'Образование, клинические протоколы и встречи ACC',
    icon: 'Activity',
    status: 'idle',
    isPinned: true,
  },
  {
    id: 'feed-aha',
    title: 'AHA — сердце, сосуды (American Heart)',
    url: 'https://newsroom.heart.org/rss.xml',
    siteUrl: 'https://www.heart.org',
    category: 'Мировая кардиология',
    description: 'Исследования сердечно-сосудистых заболеваний и инсультов',
    icon: 'HeartPulse',
    status: 'idle',
    isPinned: true,
  },
  {
    id: 'feed-jacc',
    title: 'JACC — новые исследования',
    url: 'https://www.jacc.org/action/showFeed?type=etoc&feed=rss&jc=jacc',
    siteUrl: 'https://www.jacc.org',
    category: 'Клинические журналы',
    description: 'Journal of the American College of Cardiology',
    icon: 'FileText',
    status: 'idle',
  },
  {
    id: 'feed-bmj-heart',
    title: 'BMJ Heart — клиническая кардиология',
    url: 'https://heart.bmj.com/rss/current.xml',
    siteUrl: 'https://heart.bmj.com',
    category: 'Клинические журналы',
    description: 'Международный рецензируемый кардиологический журнал BMJ',
    icon: 'Stethoscope',
    status: 'idle',
  },
  {
    id: 'feed-nejm',
    title: 'NEJM — общая клиническая медицина',
    url: 'https://www.nejm.org/action/showFeed?type=etoc&feed=rss&jc=nejm',
    siteUrl: 'https://www.nejm.org',
    category: 'Клинические журналы',
    description: 'The New England Journal of Medicine',
    icon: 'BookmarkCheck',
    status: 'idle',
  },
  {
    id: 'feed-who',
    title: 'ВОЗ — мировые новости здравоохранения',
    url: 'https://www.who.int/rss-feeds/news-english.xml',
    siteUrl: 'https://www.who.int',
    category: 'Международные стандарты',
    description: 'Всемирная организация здравоохранения: эпидемиология и протоколы',
    icon: 'Globe2',
    status: 'idle',
  }
];

export const INITIAL_MEDICAL_ARTICLES: Article[] = [
  {
    id: 'art-hf-def-2026',
    feedId: 'feed-rko',
    feedTitle: 'РКО — Российское кардиологическое общество',
    feedCategory: 'Кардиология РФ',
    title: 'Второе универсальное определение сердечной недостаточности (2026)',
    titleRu: 'Обновленные клинические рекомендации: Второе универсальное определение сердечной недостаточности (2026)',
    summaryOneLine: 'Опубликованы уточненные пороговые уровни NT-proBNP и протокол квадротерапии для ранних стадий ХСН.',
    summaryThreeLines: 'Экспертный комитет РКО представил второе универсальное определение сердечной недостаточности с детализацией стадий A–D. Пересмотрены диагностические пороги натрийуретических пептидов для амбулаторных и экстренных больных. Подтверждена необходимость немедленного старта квадротерапии (ARNI, бета-блокатор, АМКР, иSGLT2).',
    detailedContent: 'Второе универсальное определение сердечной недостаточности (2026) стандартизирует критерии стадирования и фенотипирования пациентов.\n\nОсновные положения:\n1. Стадия A (риск): наличие АГ, СД-2 или ожирения без органического поражения сердца.\n2. Стадия B (доклиническая ХСН): повышение NT-proBNP > 125 пг/мл или структурные изменения миокарда (ГЛЖ, дилатация ЛП).\n3. Стадии C и D: манифестная и рефрактерная ХСН с показаниями к аппаратной поддержке (CRT-D, LVAD).\n\nТерапевтический консилиум рекомендует инициировать 4 базовых класса препаратов без ожидания ухудшения фракции выброса.',
    keyTerms: ['ХСН', 'NT-proBNP', 'Квадротерапия', 'иSGLT2', 'ARNI', 'ЭхоКГ'],
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80'
    ],
    link: 'https://scardio.ru/guidelines/heart_failure_2026',
    pubDate: '2026-06-25 17:45',
    isoDate: '2026-06-25T17:45:00Z',
    author: 'Комитет экспертов РКО',
    content: 'Опубликовано второе универсальное определение сердечной недостаточности (2026). Обновлены критерии стадирования (A, B, C, D), пороговые значения натрийуретических пептидов (NT-proBNP/BNP) и алгоритмы титрации квадротерапии (ARNI/ACEI, бета-блокаторы, АМКР, иНГЛТ-2).',
    contentSnippet: 'Второе универсальное определение сердечной недостаточности представляет обновленные критерии стратификации риска и фенотипирования...',
    isRead: false,
    isStarred: true,
  },
  {
    id: 'art-acc-edu',
    feedId: 'feed-acc',
    feedTitle: 'ACC — American College of Cardiology',
    feedCategory: 'Мировая кардиология',
    title: 'ACC Guidelines 2026: Advances in TAVI and Transcatheter Mitral Valve Repair',
    titleRu: 'Руководство ACC 2026: Достижения в транскатетерной имплантации аортального клапана (TAVI)',
    summaryOneLine: 'Расширены показания к TAVI у пациентов низкого хирургического риска с бессимптомным критическим стенозом.',
    summaryThreeLines: 'Коллегия кардиологов ACC представила обновленный клинический протокол транскатетерного протезирования клапанов сердца. Новые данные долгосрочной выживаемости подтверждают безопасность малоинвазивных вмешательств у пациентов среднего и молодого возраста. Описаны стандарты интраоперационного УЗИ-контроля и профилактики дислокации стента.',
    detailedContent: 'Ключевые аспекты руководства ACC 2026 по транскатетерным вмешательствам:\n\n1. Показания: TAVI рекомендован при площади аортального отверстия < 0.8 см² и среднем градиенте давления > 40 мм рт. ст., включая пациентов с низкой фракцией выброса.\n2. Доступ: трансфеморальный доступ признан золотым стандартом с минимизацией сосудистых осложнений благодаря системам ушивания ProGlide/MANTA.\n3. Антитромботическая терапия: монотерапия прямыми оральными антикоагулянтами (ПОАК) предпочтительнее двойной антиагрегантной схемы при сопутствующей фибрилляции предсердий.',
    keyTerms: ['TAVI', 'Аортальный стеноз', 'Эндоваскулярная хирургия', 'ПОАК', 'ЭхоКГ'],
    imageUrl: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80'
    ],
    link: 'https://www.acc.org/education-and-meetings',
    pubDate: '2026-06-25 18:20',
    isoDate: '2026-06-25T18:20:00Z',
    author: 'ACC Editorial Board',
    content: 'Американский колледж кардиологии (ACC) предлагает комплексные образовательные программы, сертификационные курсы и международные симпозиумы для практикующих кардиологов, интервенционистов и кардиохирургов.',
    contentSnippet: 'Образовательные программы ACC помогают кардиологам оставаться в курсе последних исследований и клинических рекомендаций...',
    isRead: false,
    isStarred: false,
  },
  {
    id: 'art-rkj-statin',
    feedId: 'feed-rkj',
    feedTitle: 'Российский кардиологический журнал',
    feedCategory: 'Кардиология РФ',
    title: 'Комбинированная гиполипидемическая терапия: статины, эзетимиб и ингибиторы PCSK9',
    titleRu: 'Клиническое исследование: Достижение целевых уровней ХС-ЛНП при комбинированной терапии',
    summaryOneLine: 'Тройная комбинация позволяет достичь целевого ХС-ЛНП < 1.4 ммоль/л у 92% пациентов очень высокого сердечно-сосудистого риска.',
    summaryThreeLines: 'Опубликованы результаты многоцентрового исследования по оптимизации липидного профиля у пациентов после острого коронарного синдрома. Раннее назначение ингибиторов PCSK9 в комбинации с высокоинтенсивными статинами и эзетимибом стабилизирует атеросклеротические бляшки и снижает риск повторного инфаркта миокарда на 44%.',
    detailedContent: 'Исследование эффективности гиполипидемической терапии при ОКС:\n\n• Дизайн: проспективное наблюдение 1450 пациентов с острым инфарктом миокарда.\n• Группа контроля: аторвастатин 80 мг. Группа вмешательства: аторвастатин 80 мг + эзетимиб 10 мг + эволокумаб 140 мг подкожно 1 раз в 2 недели.\n• Результаты: в группе тройной терапии медиана ХС-ЛНП снизилась до 0.98 ммоль/л уже на 4-й неделе.\n• Безопасность: значимых повышений ферментов АЛТ/АСТ и КФК не зарегистрировано.',
    keyTerms: ['ХС-ЛНП', 'Статины', 'Эзетимиб', 'PCSK9', 'ОКС', 'Атеросклероз'],
    imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80'
    ],
    link: 'https://russjcardiol.elpub.ru/jour/article/view/5120',
    pubDate: '2026-06-25 16:30',
    isoDate: '2026-06-25T16:30:00Z',
    author: 'Проф. А. И. Мартынов',
    content: 'Опубликованы результаты многоцентрового исследования по оптимизации липидного профиля у пациентов после ОКС.',
    contentSnippet: 'Клинические данные по комбинированной терапии ингибиторами PCSK9 и статинами...',
    isRead: false,
    isStarred: false,
  },
  {
    id: 'art-esc-afib',
    feedId: 'feed-esc',
    feedTitle: 'ESC — European Society of Cardiology',
    feedCategory: 'Мировая кардиология',
    title: 'Pulsed Field Ablation (PFA) vs Cryoballoon in Paroxysmal Atrial Fibrillation',
    titleRu: 'Импульсно-полевая аблация (PFA) против криоаблации при пароксизмальной фибрилляции предсердий',
    summaryOneLine: 'Технология PFA показала сопоставимую изоляцию устьев легочных вен при нулевом риске повреждения пищевода и диафрагмального нерва.',
    summaryThreeLines: 'Европейское общество кардиологов опубликовало мета-анализ применения импульсно-полевой аблации (PFA) в интервенционной аритмологии. Процедура нетепловой аблации занимает в среднем 42 минуты против 78 минут при криоаблации. Тканеспецифичность электрических импульсов предотвращает повреждение сосудистого эндотелия и окружающих нервных стволов.',
    detailedContent: 'Сравнительный анализ PFA и криотермической аблации:\n\n1. Механизм действия: электропорация клеточных мембран кардиомиоцитов ультракороткими микросекундными высоковольтными импульсами.\n2. Эффективность: стойкая изоляция легочных вен через 12 месяцев достигнута у 84.6% пациентов с пароксизмальной ФП.\n3. Профиль безопасности: 0 случаев повреждения возвратного гортанного нерва, стеноза легочных вен и образования пищеводно-предсердных фистул.',
    keyTerms: ['PFA', 'Фибрилляция предсердий', 'Электропорация', 'Аритмология', 'Изоляция ЛВ'],
    imageUrl: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=80'
    ],
    link: 'https://escardio.org/guidelines/afib-pfa-2026',
    pubDate: '2026-06-25 15:10',
    isoDate: '2026-06-25T15:10:00Z',
    author: 'ESC Arrhythmia Working Group',
    content: 'Импульсно-полевая аблация продемонстрировала высокую скорость выполнения и селективное воздействие на миокард.',
    contentSnippet: 'Клинические испытания новой технологии электропорации в лечении нарушений сердечного ритма...',
    isRead: false,
    isStarred: false,
  },
  {
    id: 'art-minzdrav-rehab',
    feedId: 'feed-minzdrav',
    feedTitle: 'Минздрав России',
    feedCategory: 'Здравоохранение РФ',
    title: 'Порядок организации кардиологической реабилитации третьего этапа (Приказ Минздрава)',
    titleRu: 'Приказ Минздрава России: Новый порядок диспансерного наблюдения и телереабилитации при ИБС',
    summaryOneLine: 'Утвержден норматив дистанционного мониторинга ЭКГ и АД для пациентов после реваскуляризации миокарда.',
    summaryThreeLines: 'Министерство здравоохранения РФ утвердило методические рекомендации по ведению кардиопациентов на поликлиническом этапе. Введены цифровые паспорта здоровья и обязательный телеметрический контроль гемодинамики в течение 12 месяцев после стентирования или шунтирования коронарных артерий.',
    detailedContent: 'Основные положения приказа Минздрава по кардиореабилитации:\n\n• Этапность: I этап (ОРИТ) -> II этап (специализированное отделение) -> III этап (амбулаторно-поликлинический с телемедициной).\n• Телемониторинг: обеспечение пациентов носимыми регистраторами давления и суточными ЭКГ-патчами с автоматической передачей в ЕМИАС.\n• Целевые показатели: АД < 130/80 мм рт. ст., ЧСС покоя 55-60 уд/мин, ХС-ЛНП < 1.4 ммоль/л.',
    keyTerms: ['Минздрав РФ', 'Реабилитация', 'Телемедицина', 'ЕМИАС', 'ИБС', 'Стентирование'],
    imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&auto=format&fit=crop&q=80',
    imageUrls: [
      'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&auto=format&fit=crop&q=80'
    ],
    link: 'https://minzdrav.gov.ru/orders/rehab-cardio-2026',
    pubDate: '2026-06-25 14:00',
    isoDate: '2026-06-25T14:00:00Z',
    author: 'Департамент организации медицинской помощи',
    content: 'Утвержден обновленный регламент диспансеризации и амбулаторной кардиореабилитации.',
    contentSnippet: 'Нормативно-правовые акты Минздрава РФ по стандартам кардиологической помощи...',
    isRead: false,
    isStarred: false,
  }
];

export const CURATED_FEED_PRESETS: CuratedCategoryPreset[] = [
  {
    category: 'Инженер & Ремонт',
    icon: 'Wrench',
    description: 'Электроника, микропайка, схемы и ремонт техники',
    feeds: [
      {
        title: '4PDA Hard & Soft',
        url: 'https://4pda.to/feed/',
        siteUrl: 'https://4pda.to',
        description: 'Форумные ветки, схемы, прошивки и решения аппаратных проблем',
        tags: ['4PDA', 'Прошивки', 'Схемы']
      },
      {
        title: 'Пикабу — Ремонт техники',
        url: 'https://pikabu.ru/tag/Ремонт%20техники/hot',
        siteUrl: 'https://pikabu.ru',
        description: 'Пошаговые фотоотчеты и интересные кейсы восстановления электроники',
        tags: ['Ремонт', 'Кейсы', 'Электроника']
      },
      {
        title: 'Habr — Hardware & Circuits',
        url: 'https://habr.com/ru/rss/hubs/hardware/articles/?fl=ru',
        siteUrl: 'https://habr.com',
        description: 'Статьи инженеров по схемотехнике, микроконтроллерам и ремонту',
        tags: ['Хабр', 'Железо', 'Схемотехника']
      },
      {
        title: 'IXBT Hardware',
        url: 'https://www.ixbt.com/export/index.rss',
        siteUrl: 'https://www.ixbt.com',
        description: 'Обзоры комплектующих, процессоров, материнских плат и плат',
        tags: ['IXBT', 'Обзоры', 'Комплектующие']
      },
      {
        title: 'Radiokot — Радиолюбители',
        url: 'https://radiokot.ru/rss.xml',
        siteUrl: 'https://radiokot.ru',
        description: 'Схемы блоков питания, измерительных приборов, паяльных станций',
        tags: ['Радиокот', 'Паяльник', 'Схемы']
      },
      {
        title: 'YouTube — Паяльник TV',
        url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC1T03b9mB3QY2z1qK5N2w0Q',
        siteUrl: 'https://youtube.com',
        description: 'Видеоинструкции по ремонту материнских плат и ноутбуков',
        tags: ['YouTube', 'Видео', 'Ремонт']
      },
      {
        title: 'CyberForum — Электроника',
        url: 'https://www.cyberforum.ru/rss.xml',
        siteUrl: 'https://www.cyberforum.ru',
        description: 'Техническая помощь по ремонту и диагностике радиоэлектроники',
        tags: ['Форум', 'Диагностика', 'Помощь']
      },
      {
        title: 'Easyelectronics — Микроконтроллеры',
        url: 'https://easyelectronics.ru/feed',
        siteUrl: 'https://easyelectronics.ru',
        description: 'Уроки по STM32, AVR, разводке плат и силовой электронике',
        tags: ['STM32', 'Электроника', 'Пихто']
      },
      {
        title: 'Electrik.org — Электрика и силовая',
        url: 'https://www.electrik.org/forum/rss.php',
        siteUrl: 'https://www.electrik.org',
        description: 'Профессиональный форум электриков, силовые схемы и щиты',
        tags: ['Электрика', 'Силовая', 'Щиты']
      },
      {
        title: 'ChipDip — Новости и обзоры',
        url: 'https://www.chipdip.ru/rss/news',
        siteUrl: 'https://www.chipdip.ru',
        description: 'Новинки радиодеталей, измерительных приборов и инструментов',
        tags: ['ЧипДип', 'Компоненты', 'Приборы']
      }
    ]
  },
  {
    category: 'Кардиология & Медицина',
    icon: 'Heart',
    description: 'Клинические рекомендации, РКО, ESC и ACC гайдлайны',
    feeds: [
      {
        title: 'РКО — Российское кардиологическое общество',
        url: 'https://scardio.ru/rss/',
        siteUrl: 'https://scardio.ru',
        description: 'Официальные клинические рекомендации, съезды и новости РКО',
        tags: ['РКО', 'Кардиология', 'Рекомендации']
      },
      {
        title: 'Российский кардиологический журнал',
        url: 'https://russjcardiol.elpub.ru/jour/rss',
        siteUrl: 'https://russjcardiol.elpub.ru',
        description: 'Рецензируемый научно-практический журнал ВАК/Scopus',
        tags: ['ВАК', 'Scopus', 'Исследования']
      },
      {
        title: 'ESC — European Society of Cardiology',
        url: 'https://www.escardio.org/rss/guidelines.xml',
        siteUrl: 'https://www.escardio.org',
        description: 'Европейские клинические гайдлайны и конгрессы ESC',
        tags: ['ESC', 'Cardiology', 'Guidelines']
      },
      {
        title: 'ACC — American College of Cardiology',
        url: 'https://www.acc.org/rss/latest-cardiology-news',
        siteUrl: 'https://www.acc.org',
        description: 'Американские клинические исследования и гайдлайны JACC',
        tags: ['ACC', 'JACC', 'Clinical']
      },
      {
        title: 'Минздрав РФ — Клинические рекомендации',
        url: 'https://minzdrav.gov.ru/rss',
        siteUrl: 'https://minzdrav.gov.ru',
        description: 'Официальные нормативы, приказы и стандарты медпомощи Минздрава',
        tags: ['Минздрав', 'Стандарты', 'Приказы']
      },
      {
        title: 'PubMed — Cardiology Recent',
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1KqYj2w7xQZ9v8L3?limit=50&utm_campaign=opensearch',
        siteUrl: 'https://pubmed.ncbi.nlm.nih.gov',
        description: 'Мировые медицинские статьи и рандомизированные исследования',
        tags: ['PubMed', 'Science', 'RCT']
      },
      {
        title: 'NEJM — New England Journal of Medicine',
        url: 'https://www.nejm.org/action/showFeed?type=etoc&feed=rss&jc=nejm',
        siteUrl: 'https://www.nejm.org',
        description: 'Ведущие медицинские публикации мирового уровня',
        tags: ['NEJM', 'Medicine', 'Research']
      },
      {
        title: 'Lancet — Cardiology',
        url: 'https://www.thelancet.com/rss/lancet_cardiology.xml',
        siteUrl: 'https://www.thelancet.com',
        description: 'Специализированные исследования сердечно-сосудистой патологии',
        tags: ['Lancet', 'Cardio', 'Impact']
      },
      {
        title: 'CardioWeb — Новости кардиологии',
        url: 'https://www.cardioweb.ru/rss.xml',
        siteUrl: 'https://www.cardioweb.ru',
        description: 'Национальный медицинский исследовательский центр кардиологии',
        tags: ['НМИЦ', 'Кардиоцентр', 'Новости']
      },
      {
        title: 'Vrachu.ru — Портал врачей',
        url: 'https://vrachu.ru/rss',
        siteUrl: 'https://vrachu.ru',
        description: 'Клинические разборы, вебинары и профессиональное сообщество',
        tags: ['Врачу', 'Вебинары', 'Клиническая']
      }
    ]
  },
  {
    category: 'Экономика & Финансы',
    icon: 'TrendingUp',
    description: 'Макроэкономика, биржи, рынки и финансы',
    feeds: [
      {
        title: 'РБК — Главные новости экономики',
        url: 'https://rssexport.rbc.ru/rbcnews/news/30/full.rss',
        siteUrl: 'https://www.rbc.ru',
        description: 'Финансовые рынки, котировки, аналитика и бизнес-новости',
        tags: ['РБК', 'Экономика', 'Финансы']
      },
      {
        title: 'Ведомости — Финансы и рынки',
        url: 'https://www.vedomosti.ru/rss/news',
        siteUrl: 'https://www.vedomosti.ru',
        description: 'Деловая пресса, макроэкономика, корпоративные финансы',
        tags: ['Ведомости', 'Бизнес', 'Рынки']
      },
      {
        title: 'Коммерсантъ — Финансы',
        url: 'https://www.kommersant.ru/RSS/ny_finances.xml',
        siteUrl: 'https://www.kommersant.ru',
        description: 'Банки, инвестиции, валютный рынок и макроэкономика',
        tags: ['Ъ', 'Банки', 'Инвестиции']
      },
      {
        title: 'Forbes Russia — Бизнес и Финансы',
        url: 'https://www.forbes.ru/netcat_files/rss/all_materials.xml',
        siteUrl: 'https://www.forbes.ru',
        description: 'Рейтинги, миллиардеры, инвестиционные стратегии и рынки',
        tags: ['Forbes', 'Капитал', 'Рейтинги']
      },
      {
        title: 'Investing.com — Рынки',
        url: 'https://ru.investing.com/rss/news.rss',
        siteUrl: 'https://ru.investing.com',
        description: 'Котировки акций, сырье, криптовалюты, форекс и аналитика',
        tags: ['Investing', 'Биржа', 'Акции']
      },
      {
        title: 'Банки.ру — Новости банков',
        url: 'https://www.banki.ru/xml/news.rss',
        siteUrl: 'https://www.banki.ru',
        description: 'Вклады, кредиты, ставки ЦБ и обзоры банковского сектора',
        tags: ['Банки.ру', 'Кредиты', 'Вклады']
      },
      {
        title: 'Прайм — Агентство экономических новостей',
        url: 'https://1prime.ru/export/rss2/index.xml',
        siteUrl: 'https://1prime.ru',
        description: 'Оперативная финансовая лента, курсы валют, сырьевые рынки',
        tags: ['Прайм', 'Валюта', 'Сырье']
      },
      {
        title: 'Finam — Аналитика и прогнозы',
        url: 'https://www.finam.ru/analysis/conf/rss/',
        siteUrl: 'https://www.finam.ru',
        description: 'Инвестиционные идеи, технический анализ и обзоры эмитентов',
        tags: ['Финам', 'Прогнозы', 'Акции']
      },
      {
        title: 'Smart-Lab — Блоги инвесторов',
        url: 'https://smart-lab.ru/rss/',
        siteUrl: 'https://smart-lab.ru',
        description: 'Сообщество частных инвесторов, мнения по акциям и дивидендам',
        tags: ['Смартлаб', 'Инвесторы', 'Дивиденды']
      },
      {
        title: 'БКС Экспресс — Инвестиции',
        url: 'https://bcs-express.ru/rss',
        siteUrl: 'https://bcs-express.ru',
        description: 'Аналитика фондового рынка, портфели и торговые рекомендации',
        tags: ['БКС', 'Портфель', 'Рынок']
      }
    ]
  },
  {
    category: 'Автомобили & Автосервис',
    icon: 'Car',
    description: 'Тест-драйвы, автозапчасти, ремонт ДВС и новинки автопрома',
    feeds: [
      {
        title: 'За рулем (ZR.ru)',
        url: 'https://www.zr.ru/rss/news/',
        siteUrl: 'https://www.zr.ru',
        description: 'Главный автомобильный журнал: тест-драйвы, ПДД, обслуживание',
        tags: ['Авто', 'Тест-драйв', 'Ремонт']
      },
      {
        title: 'Колеса.ру',
        url: 'https://www.kolesa.ru/feed',
        siteUrl: 'https://www.kolesa.ru',
        description: 'Автомобильные новости, новинки рынка и технический разбор',
        tags: ['Колеса', 'Автоновости', 'Обзоры']
      },
      {
        title: 'Авто.ру — Журнал',
        url: 'https://mag.auto.ru/rss/',
        siteUrl: 'https://mag.auto.ru',
        description: 'Тест-драйвы новых авто, советы по покупке с пробегом и гайды',
        tags: ['Авто.ру', 'Б/У', 'Тесты']
      },
      {
        title: 'Дром.ру — Новости',
        url: 'https://news.drom.ru/rss.xml',
        siteUrl: 'https://drom.ru',
        description: 'Крупнейший автомобильный портал: новости, отзывы владельцев',
        tags: ['Дром', 'Отзывы', 'Обзоры']
      },
      {
        title: 'Motor.ru — Тест-драйвы',
        url: 'https://motor.ru/rss',
        siteUrl: 'https://motor.ru',
        description: 'Премиальные автомобили, суперкары, автоспорт и тест-драйвы',
        tags: ['Motor', 'Спорткар', 'Тест']
      },
      {
        title: 'Авито Авто — Журнал',
        url: 'https://www.avito.ru/avito-autoclub/rss',
        siteUrl: 'https://www.avito.ru',
        description: 'Аналитика вторичного рынка авто, запчасти и обслуживание',
        tags: ['Авито', 'Вторичка', 'Запчасти']
      },
      {
        title: 'IXBT Auto',
        url: 'https://www.ixbt.com/export/autonews.rss',
        siteUrl: 'https://www.ixbt.com',
        description: 'Электромобили, китайский автопром, бортовая электроника',
        tags: ['Электромобили', 'Китай', 'Бортсеть']
      },
      {
        title: 'ABW.BY — Автобизнес',
        url: 'https://www.abw.by/rss',
        siteUrl: 'https://www.abw.by',
        description: 'Ремонт двигателей, разборки, эксплуатация и техосмотр',
        tags: ['ABW', 'Эксплуатация', 'ДВС']
      },
      {
        title: 'ZR.ru — Эксплуатация и ремонт',
        url: 'https://www.zr.ru/rss/repair/',
        siteUrl: 'https://www.zr.ru',
        description: 'Советы по самостоятельному обслуживанию и ремонту машин',
        tags: ['СвоимиРуками', 'Ремонт', 'Гайд']
      },
      {
        title: 'Автопанорама',
        url: 'https://autopanorama.by/feed/',
        siteUrl: 'https://autopanorama.by',
        description: 'Видеообзоры кроссоверов, внедорожников и автохимии',
        tags: ['Кроссоверы', 'Обзоры', 'Видео']
      }
    ]
  },
  {
    category: 'IT & Разработка',
    icon: 'Code',
    description: 'Программирование, архитектура, тулинг и технологии',
    feeds: [
      {
        title: 'Хабр — Все публикации',
        url: 'https://habr.com/ru/rss/all/?fl=ru',
        siteUrl: 'https://habr.com',
        description: 'Крупнейшее IT-сообщество: разработка, DevOps, AI, железо',
        tags: ['Хабр', 'IT', 'Разработка']
      },
      {
        title: 'TProger — IT для разработчиков',
        url: 'https://tproger.ru/feed/',
        siteUrl: 'https://tproger.ru',
        description: 'Полезные материалы, туториалы и шпаргалки для программистов',
        tags: ['TProger', 'Кодинг', 'Обучение']
      },
      {
        title: 'OpenNET — Новости свободного ПО',
        url: 'https://www.opennet.ru/opennet.rss',
        siteUrl: 'https://www.opennet.ru',
        description: 'Linux, ядра, системное администрирование, релизы ПО',
        tags: ['OpenNET', 'Linux', 'Sysadmin']
      },
      {
        title: 'Habr — Программирование',
        url: 'https://habr.com/ru/rss/hubs/programming/articles/?fl=ru',
        siteUrl: 'https://habr.com',
        description: 'Алгоритмы, языки программирования, паттерны проектирования',
        tags: ['Программирование', 'Архитектура', 'Code']
      },
      {
        title: 'Xakep.ru — Инфобез и хакинг',
        url: 'https://xakep.ru/feed/',
        siteUrl: 'https://xakep.ru',
        description: 'Кибербезопасность, уязвимости, пентест и защита систем',
        tags: ['Xakep', 'Sec', 'Pentest']
      },
      {
        title: 'Proglib — Библиотека программиста',
        url: 'https://proglib.io/feed.xml',
        siteUrl: 'https://proglib.io',
        description: 'Разбор задач, Python, JavaScript, базы данных и карьеры IT',
        tags: ['Proglib', 'Python', 'JS']
      },
      {
        title: 'Habr — Искусственный интеллект (AI)',
        url: 'https://habr.com/ru/rss/hubs/artificial_intelligence/articles/?fl=ru',
        siteUrl: 'https://habr.com',
        description: 'LLM, нейросети, машинное обучение и генеративный AI',
        tags: ['AI', 'LLM', 'MachineLearning']
      },
      {
        title: 'Dev.by — ИТ-сообщество',
        url: 'https://dev.by/rss',
        siteUrl: 'https://dev.by',
        description: 'Новости ИТ-индустрии, стартапы, интервью с инженерами',
        tags: ['Dev.by', 'Индустрия', 'Карьера']
      },
      {
        title: 'ServerNews — Серверное железо',
        url: 'https://servernews.ru/export/rss.xml',
        siteUrl: 'https://servernews.ru',
        description: 'Дата-центры, облачные технологии, серверные процессоры и ЦОД',
        tags: ['Cloud', 'Datacenter', 'Server']
      },
      {
        title: 'GitHub Trending — Top Repos',
        url: 'https://github-trending-rss.herokuapp.com/daily',
        siteUrl: 'https://github.com',
        description: 'Самые популярные open-source репозитории дня',
        tags: ['GitHub', 'OpenSource', 'Trending']
      }
    ]
  },
  {
    category: 'Бизнес & Предпринимательство',
    icon: 'Briefcase',
    description: 'Стартапы, управление, маркетинг и кейсы',
    feeds: [
      {
        title: 'VC.ru — Бизнес и технологии',
        url: 'https://vc.ru/rss',
        siteUrl: 'https://vc.ru',
        description: 'Опыт предпринимателей, маркетинг, стартапы и новые бизнесы',
        tags: ['VC.ru', 'Бизнес', 'Стартапы']
      },
      {
        title: 'Rusbase (RB.ru) — Инвестиции и стартапы',
        url: 'https://rb.ru/rss/',
        siteUrl: 'https://rb.ru',
        description: 'Российские венчурные фонды, технологический бизнес и фаундеры',
        tags: ['RB.ru', 'Венчур', 'Фаундеры']
      },
      {
        title: 'Inc. Russia — Журнал для предпринимателей',
        url: 'https://incrussia.ru/feed/',
        siteUrl: 'https://incrussia.ru',
        description: 'Как управлять бизнесом, масштабирование и истории успеха',
        tags: ['Inc', 'Менеджмент', 'Успех']
      },
      {
        title: 'Секрет фирмы — Бизнес-журнал',
        url: 'https://secretmag.ru/rss',
        siteUrl: 'https://secretmag.ru',
        description: 'Практические советы по ведению бизнеса, законы и налоги',
        tags: ['СекретФирмы', 'Налоги', 'Право']
      },
      {
        title: 'Habr — Менеджмент и маркетинг',
        url: 'https://habr.com/ru/rss/hubs/management/articles/?fl=ru',
        siteUrl: 'https://habr.com',
        description: 'Управление продуктом (Product Management), Agile и маркетинг',
        tags: ['Management', 'Agile', 'Product']
      },
      {
        title: 'Cossa.ru — Маркетинг и PR',
        url: 'https://www.cossa.ru/rss/',
        siteUrl: 'https://www.cossa.ru',
        description: 'Цифровой маркетинг, реклама, SMM, кейсы продвижения брендов',
        tags: ['Cossa', 'Маркетинг', 'PR']
      },
      {
        title: 'AdIndex — Реклама и бизнес',
        url: 'https://adindex.ru/rss/all.xml',
        siteUrl: 'https://adindex.ru',
        description: 'Рынок рекламы, медиаисследования и брендинг',
        tags: ['AdIndex', 'Реклама', 'Брендинг']
      },
      {
        title: 'Retail.ru — Розничная торговля',
        url: 'https://www.retail.ru/rss/',
        siteUrl: 'https://www.retail.ru',
        description: 'Ритейл, электронная коммерция, маркетплейсы и логистика',
        tags: ['Retail', 'Маркетплейсы', 'E-com']
      },
      {
        title: 'E-Pepper — Электронная коммерция',
        url: 'https://e-pepper.ru/feed/',
        siteUrl: 'https://e-pepper.ru',
        description: 'Интернет-торговля, кейсы Wildberries, Ozon и интернет-магазинов',
        tags: ['E-commerce', 'Wildberries', 'Ozon']
      },
      {
        title: 'Harvard Business Review Russia',
        url: 'https://hbr-russia.ru/rss.xml',
        siteUrl: 'https://hbr-russia.ru',
        description: 'Мировой опыт лидерства, стратегия и бизнес-модели',
        tags: ['HBR', 'Стратегия', 'Лидерство']
      }
    ]
  }
];

export const DEFAULT_INITIAL_FEEDS = MEDICAL_FEEDS;
