const fs = require('fs');

// 1. Update ControlCenterModal.tsx
let ccm = fs.readFileSync('src/components/ControlCenterModal.tsx', 'utf-8');
ccm = ccm.replace(
  'Энергосбережение лимитов ИИ (Anti-Quota Exhaustion)',
  'Автоматическая AI-обработка новых новостей'
);
ccm = ccm.replace(
  'При отключении автоматического ИИ-перевода новые ленты синхронизируются мгновенно без запросов к Gemini, исключая ошибку 429 (Resource Exhausted). Перевод и суммаризацию можно вызывать вручную для нужных статей.',
  'При отключении автоматической AI-обработки новые ленты загружаются мгновенно без запросов к AI. Обработку можно запускать вручную для нужных статей.'
);
ccm = ccm.replace(
  "<span>{enableAutoAiProcessing ? 'Авто-ИИ: ВКЛ' : 'ЭКО-режим: ВКЛ'}</span>",
  "<span>{enableAutoAiProcessing ? 'ВКЛ' : 'ВЫКЛ'}</span>"
);
fs.writeFileSync('src/components/ControlCenterModal.tsx', ccm);

// 2. Update ArticleReaderPane.tsx
let arp = fs.readFileSync('src/components/ArticleReaderPane.tsx', 'utf-8');
arp = arp.replace(
  'Энергосбережение: карточка без ИИ-обработки',
  'Новость ожидает AI-обработки'
);
arp = arp.replace(
  'Для сохранения лимитов ИИ автоматический перевод отключен. Вы можете вручную перевести статью, создать выжимку и заполнить карту ремонта.',
  'Вы можете вручную перевести статью, создать выжимку и извлечь данные с помощью AI.'
);
arp = arp.replace(
  "<span>{isRefreshing ? 'Обработка...' : 'Адаптировать с ИИ'}</span>",
  "<span>{isRefreshing ? 'Обработка...' : 'Обработать AI'}</span>"
);
fs.writeFileSync('src/components/ArticleReaderPane.tsx', arp);

// 3. Update MedicalNewsPane.tsx
let mnp = fs.readFileSync('src/components/MedicalNewsPane.tsx', 'utf-8');
mnp = mnp.replace(
  '<span>Перераспределить и обработать новости</span>',
  '<span>Обработать выбранные AI</span>'
);
mnp = mnp.replace(
  'title="Перераспределить и обработать все сохраненные новости с помощью ИИ согласно вашему промпту"',
  'title="Обработать текущие статьи с помощью AI согласно вашему промпту"'
);
fs.writeFileSync('src/components/MedicalNewsPane.tsx', mnp);

console.log('UI texts updated.');
