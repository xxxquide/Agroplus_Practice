const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");

const ensureUploads = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const createWorkbook = ({ fields, machinery, inventory }) => {
  const workbook = XLSX.utils.book_new();
  const fieldsSheet = XLSX.utils.json_to_sheet(fields);
  const machinerySheet = XLSX.utils.json_to_sheet(machinery);
  const inventorySheet = XLSX.utils.json_to_sheet(inventory);
  XLSX.utils.book_append_sheet(workbook, fieldsSheet, "Поля");
  XLSX.utils.book_append_sheet(workbook, machinerySheet, "Техніка");
  XLSX.utils.book_append_sheet(workbook, inventorySheet, "Склад");
  return workbook;
};

const makeSample1 = () => ({
  fields: [
    {
      Код: "A1",
      Назва: "Північне",
      Культура: "Пшениця",
      Район: "Вінницький",
      Площа: 120.5,
      "Прогноз врожаю": 68,
      Вологість: 24,
      Посів: "2025-10-04",
      Огляд: "2026-01-18",
      Широта: 49.233,
      Довгота: 28.468,
      Розмір: 0.6
    },
    {
      Код: "B7",
      Назва: "Східне",
      Культура: "Кукурудза",
      Район: "Гайсинський",
      Площа: 86,
      "Прогноз врожаю": 52,
      Вологість: 28,
      Посів: "2025-09-22",
      Огляд: "2026-01-25",
      Широта: 49.102,
      Довгота: 28.923,
      Розмір: 0.45
    },
    {
      Код: "C3",
      Назва: "Південне",
      Культура: "Соя",
      Район: "Жмеринський",
      Площа: 64.2,
      "Прогноз врожаю": 31,
      Вологість: 22,
      Посів: "2025-10-12",
      Огляд: "2026-01-30",
      Широта: 48.976,
      Довгота: 28.112,
      Розмір: 0.4
    }
  ],
  machinery: [
    { Назва: "Трактор №5", Тип: "Трактор", Статус: "ACTIVE" },
    { Назва: "Комбайн №4", Тип: "Комбайн", Статус: "MAINTENANCE" }
  ],
  inventory: [
    {
      Name: "Дизель",
      Category: "Паливо",
      Quantity: 12000,
      Unit: "л",
      Responsible: "Олександр",
      MinThreshold: 5000
    },
    {
      Name: "Селітра",
      Category: "Добрива",
      Quantity: 18.5,
      Unit: "т",
      Responsible: "Ірина",
      MinThreshold: 8
    },
    {
      Name: "Засіб Х",
      Category: "ЗЗР",
      Quantity: 320,
      Unit: "л",
      Responsible: "Андрій",
      MinThreshold: 120
    }
  ]
});

const makeSample2 = () => ({
  fields: [
    {
      Код: "D2",
      Назва: "Західне",
      Культура: "Ячмінь",
      Район: "Хмільницький",
      Площа: 92.4,
      "Прогноз врожаю": 47,
      Вологість: 21,
      Посів: "2025-09-15",
      Огляд: "2026-02-02",
      Широта: 49.389,
      Довгота: 27.994,
      Розмір: 0.55
    },
    {
      Код: "E9",
      Назва: "Долинне",
      Культура: "Соняшник",
      Район: "Могилів-Подільський",
      Площа: 74,
      "Прогноз врожаю": 36,
      Вологість: 26,
      Посів: "2025-10-20",
      Огляд: "2026-01-28",
      Широта: 48.446,
      Довгота: 27.795,
      Розмір: 0.5
    }
  ],
  machinery: [
    { Назва: "Обприскувач №2", Тип: "Обприскувач", Статус: "ACTIVE" },
    { Назва: "Сівалка №1", Тип: "Сівалка", Статус: "OFFLINE" }
  ],
  inventory: [
    {
      Name: "Насіння пшениці",
      Category: "Насіння",
      Quantity: 5.2,
      Unit: "т",
      Responsible: "Оксана",
      MinThreshold: 2
    },
    {
      Name: "Мастило",
      Category: "Техніка",
      Quantity: 210,
      Unit: "л",
      Responsible: "Сергій",
      MinThreshold: 80
    }
  ]
});

const writeSample = (filename, data) => {
  const workbook = createWorkbook(data);
  XLSX.writeFile(workbook, filename);
};

const run = () => {
  const uploadsDir = path.resolve(__dirname, "..", "uploads");
  ensureUploads(uploadsDir);
  writeSample(path.join(uploadsDir, "sample-report-2026-1.xlsx"), makeSample1());
  writeSample(path.join(uploadsDir, "sample-report-2026-2.xlsx"), makeSample2());
};

run();
