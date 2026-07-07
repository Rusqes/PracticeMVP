export type StatusName =
  | "Новая"
  | "Запланировано"
  | "В реализации"
  | "Выполнено"
  | "Отклонено"
  | "Заморожено";

export type TaskTypeName =
  | "Новый функционал"
  | "Улучшение"
  | "Инфраструктура"
  | "Исследование";

export type SprintTask = {
  id: string;
  title: string;
  epicTitle: string;
  status: StatusName;
  taskType: TaskTypeName;
  product: string;
  stream: string;
  performers: string[];
  owner?: string;
  plannedDate: string;
  actualDate?: string;
  deviation?: string;
  comment?: string;
  result: string;
};

export type Epic = {
  id: string;
  title: string;
  status: StatusName;
  product: string;
  stream: string;
  taskType: TaskTypeName;
  performers: string[];
  tasks: SprintTask[];
};

export type Sprint = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  comment?: string;
  tasks: SprintTask[];
};

export type SprintLike = {
  tasks: SprintTask[];
};

const RUSSIAN_MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

export function getSprintDatesLabel(startDate: string, endDate: string) {
  if (!startDate || !endDate) return "—";
  const [, startMonth, startDay] = startDate.split("-");
  const [, endMonth, endDay] = endDate.split("-");
  return `${startDay}.${startMonth} - ${endDay}.${endMonth}`;
}

export function getSprintMonthLabel(startDate: string) {
  if (!startDate) return "—";
  const [year, month] = startDate.split("-");
  const monthIndex = parseInt(month, 10) - 1;
  if (monthIndex >= 0 && monthIndex < 12) {
    return `${RUSSIAN_MONTHS[monthIndex]} ${year}`;
  }
  return `Месяц ${month} ${year}`;
}


const COMPLETED_STATUS: StatusName = "Выполнено";

const dateValue = (date?: string) => (date ? new Date(date).getTime() : Number.MAX_SAFE_INTEGER);

export const isCompletedTask = (task: SprintTask) => task.status === COMPLETED_STATUS;

export function sortTasksForDisplay(tasks: SprintTask[]) {
  return [...tasks].sort((a, b) => {
    const aDone = isCompletedTask(a);
    const bDone = isCompletedTask(b);

    if (aDone !== bDone) {
      return aDone ? 1 : -1;
    }

    const aDate = aDone ? a.actualDate ?? a.plannedDate : a.plannedDate;
    const bDate = bDone ? b.actualDate ?? b.plannedDate : b.plannedDate;
    return dateValue(aDate) - dateValue(bDate);
  });
}

export function getEpicProgress(epic: Epic) {
  const total = epic.tasks.length;
  const done = epic.tasks.filter((task) => task.status === COMPLETED_STATUS).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return {
    done,
    total,
    label: total === 0 ? "0 из 0" : `${done} из ${total}`,
    percent,
  };
}

export function getSprintReadonlyFields(task: SprintTask) {
  return {
    status: task.status,
    performers: task.performers.join(", "),
    owner: task.owner ?? "Не выбран",
    taskType: task.taskType,
    product: task.product,
    stream: task.stream,
    result: task.result,
  };
}

export function getUnscheduledBacklogTasks(epics: Epic[], sprints: SprintLike[]) {
  const scheduledTaskIds = new Set(sprints.flatMap((sprint) => sprint.tasks.map((task) => task.id)));

  return epics.flatMap((epic) => epic.tasks).filter((task) => !scheduledTaskIds.has(task.id));
}

export function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) {
    return [...items];
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function formatDate(date?: string) {
  if (!date) {
    return "—";
  }

  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}
