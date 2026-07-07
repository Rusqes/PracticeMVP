import type { Epic, Sprint, SprintTask, StatusName, TaskTypeName } from "./domain";

export type DirectoryStatus = {
  name: StatusName;
  color: string;
  progress: boolean;
};

export type DirectoryTaskType = {
  name: TaskTypeName;
  color: string;
};

export type Performer = {
  name: string;
  role: string;
  active: boolean;
  initials: string;
};


export const statuses: DirectoryStatus[] = [
  { name: "Новая", color: "#6B7280", progress: false },
  { name: "Запланировано", color: "#2563EB", progress: false },
  { name: "В реализации", color: "#0F766E", progress: false },
  { name: "Выполнено", color: "#16A34A", progress: true },
  { name: "Отклонено", color: "#DC2626", progress: false },
  { name: "Заморожено", color: "#7C3AED", progress: false },
];

export const taskTypes: DirectoryTaskType[] = [
  { name: "Новый функционал", color: "#7C3AED" },
  { name: "Улучшение", color: "#CA8A04" },
  { name: "Инфраструктура", color: "#0F766E" },
  { name: "Исследование", color: "#2563EB" },
];

export const performers: Performer[] = [
  { name: "Вася", role: "Frontend", active: true, initials: "В" },
  { name: "Петя", role: "Backend", active: true, initials: "П" },
  { name: "Саша", role: "Product", active: true, initials: "С" },
  { name: "Марина", role: "QA", active: false, initials: "М" },
];

export const epics: Epic[] = [
  {
    id: "client-account",
    title: "Личный кабинет клиента",
    status: "В реализации",
    product: "Проект 1",
    stream: "Продуктовый",
    taskType: "Новый функционал",
    performers: ["Вася", "Петя", "Саша"],
    tasks: [
      {
        id: "sso",
        title: "Добавить авторизацию через SSO",
        epicTitle: "Личный кабинет клиента",
        status: "Запланировано",
        taskType: "Новый функционал",
        product: "Проект 1",
        stream: "Продуктовый",
        performers: ["Вася", "Петя"],
        owner: "Вася",
        plannedDate: "2026-07-01",
        result: "Готов дизайн API",
      },
      {
        id: "profile-page",
        title: "Сделать страницу профиля",
        epicTitle: "Личный кабинет клиента",
        status: "В реализации",
        taskType: "Новый функционал",
        product: "Проект 1",
        stream: "Продуктовый",
        performers: ["Вася", "Саша"],
        owner: "Вася",
        plannedDate: "2026-07-02",
        result: "Верстка в работе",
      },
      {
        id: "avatar",
        title: "Загрузка аватара",
        epicTitle: "Личный кабинет клиента",
        status: "Выполнено",
        taskType: "Улучшение",
        product: "Проект 1",
        stream: "Продуктовый",
        performers: ["Саша"],
        owner: "Саша",
        plannedDate: "2026-06-27",
        actualDate: "2026-06-27",
        result: "В релизе",
      },
      {
        id: "history",
        title: "История действий пользователя",
        epicTitle: "Личный кабинет клиента",
        status: "Выполнено",
        taskType: "Исследование",
        product: "Проект 1",
        stream: "Смешанный",
        performers: ["Петя"],
        owner: "Петя",
        plannedDate: "2026-06-29",
        actualDate: "2026-06-30",
        deviation: "+1 день",
        result: "Согласован формат логов",
      },
      {
        id: "password",
        title: "Сброс пароля по ссылке",
        epicTitle: "Личный кабинет клиента",
        status: "Выполнено",
        taskType: "Новый функционал",
        product: "Проект 1",
        stream: "Инженерный",
        performers: ["Вася", "Петя"],
        owner: "Петя",
        plannedDate: "2026-06-26",
        actualDate: "2026-06-26",
        result: "Принято",
      },
      {
        id: "email-confirm",
        title: "Подтверждение email",
        epicTitle: "Личный кабинет клиента",
        status: "Выполнено",
        taskType: "Новый функционал",
        product: "Проект 1",
        stream: "Инженерный",
        performers: ["Вася"],
        owner: "Вася",
        plannedDate: "2026-06-25",
        actualDate: "2026-06-25",
        result: "Принято",
      },
    ],
  },
  {
    id: "product-showcase",
    title: "Витрина продукта",
    status: "Запланировано",
    product: "Сайт",
    stream: "Смешанный",
    taskType: "Улучшение",
    performers: ["Марина", "Саша"],
    tasks: [
      {
        id: "landing-copy",
        title: "Обновить описание тарифов",
        epicTitle: "Витрина продукта",
        status: "Запланировано",
        taskType: "Улучшение",
        product: "Сайт",
        stream: "Продуктовый",
        performers: ["Саша"],
        owner: "Саша",
        plannedDate: "2026-07-05",
        result: "Требуется ревью",
      },
      {
        id: "seo-tech",
        title: "Техническое SEO",
        epicTitle: "Витрина продукта",
        status: "Заморожено",
        taskType: "Инфраструктура",
        product: "Сайт",
        stream: "Инженерный",
        performers: ["Марина", "Петя"],
        plannedDate: "2026-07-06",
        result: "Черновик",
      },
      {
        id: "showcase-responsive",
        title: "Проверить адаптивность витрины",
        epicTitle: "Витрина продукта",
        status: "Новая",
        taskType: "Исследование",
        product: "Сайт",
        stream: "Смешанный",
        performers: ["Марина"],
        owner: "Марина",
        plannedDate: "2026-07-07",
        result: "Не начато",
      },
    ],
  },
];

export const sprints: Sprint[] = [
  {
    id: "sprint-3",
    title: "Спринт 3",
    startDate: "2026-06-15",
    endDate: "2026-06-19",
    comment: "Первичные работы по дизайну профиля и авторизации",
    tasks: [epics[0].tasks[4], epics[0].tasks[5]],
  },
  {
    id: "sprint-4",
    title: "Спринт 4",
    startDate: "2026-06-22",
    endDate: "2026-06-26",
    comment: "Разработка дизайна API, настройка SSO и загрузки аватара",
    tasks: [epics[0].tasks[2], epics[0].tasks[3]],
  },
  {
    id: "sprint-5",
    title: "Спринт 5",
    startDate: "2026-06-29",
    endDate: "2026-07-03",
    comment: "Внедрение фич личного кабинета и подготовка MVP к релизу",
    tasks: [epics[0].tasks[0], epics[0].tasks[1], epics[1].tasks[1]],
  },
];
