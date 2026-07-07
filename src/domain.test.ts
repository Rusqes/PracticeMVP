import { describe, expect, it } from "vitest";
import {
  getEpicProgress,
  getSprintReadonlyFields,
  getUnscheduledBacklogTasks,
  moveItem,
  sortTasksForDisplay,
  type Epic,
  type SprintTask,
} from "./domain";

const tasks: SprintTask[] = [
  {
    id: "done-early",
    title: "Выполненная раньше",
    epicTitle: "Личный кабинет клиента",
    status: "Выполнено",
    taskType: "Улучшение",
    product: "Проект 1",
    stream: "Продуктовый",
    performers: ["Саша"],
    owner: "Саша",
    plannedDate: "2026-07-08",
    actualDate: "2026-07-08",
    result: "Готово",
  },
  {
    id: "active-later",
    title: "Активная позже",
    epicTitle: "Личный кабинет клиента",
    status: "В реализации",
    taskType: "Новый функционал",
    product: "Проект 1",
    stream: "Продуктовый",
    performers: ["Вася"],
    owner: "Вася",
    plannedDate: "2026-07-10",
    result: "В работе",
  },
  {
    id: "active-earlier",
    title: "Активная раньше",
    epicTitle: "Личный кабинет клиента",
    status: "Запланировано",
    taskType: "Инфраструктура",
    product: "Проект 1",
    stream: "Инженерный",
    performers: ["Петя"],
    owner: "Петя",
    plannedDate: "2026-07-09",
    result: "Запланировано",
  },
];

describe("sprint tracker domain helpers", () => {
  it("keeps completed tasks below active tasks even when their dates are earlier", () => {
    expect(sortTasksForDisplay(tasks).map((task) => task.id)).toEqual([
      "active-earlier",
      "active-later",
      "done-early",
    ]);
  });

  it("counts only tasks with the completed status for epic progress", () => {
    const epic: Epic = {
      id: "epic-1",
      title: "Личный кабинет клиента",
      status: "В реализации",
      product: "Проект 1",
      stream: "Продуктовый",
      taskType: "Новый функционал",
      performers: ["Вася", "Петя", "Саша"],
      tasks,
    };

    expect(getEpicProgress(epic)).toEqual({
      done: 1,
      total: 3,
      label: "1 из 3",
      percent: 33,
    });
  });

  it("returns sprint add-form readonly fields copied from the selected backlog task", () => {
    expect(getSprintReadonlyFields(tasks[0])).toEqual({
      status: "Выполнено",
      performers: "Саша",
      owner: "Саша",
      taskType: "Улучшение",
      product: "Проект 1",
      stream: "Продуктовый",
      result: "Готово",
    });
  });

  it("returns only backlog tasks that are not already planned in any sprint", () => {
    const epic: Epic = {
      id: "epic-1",
      title: "Личный кабинет клиента",
      status: "В реализации",
      product: "Проект 1",
      stream: "Продуктовый",
      taskType: "Новый функционал",
      performers: ["Вася"],
      tasks,
    };

    expect(getUnscheduledBacklogTasks([epic], [{ tasks: [tasks[0]] }]).map((task) => task.id)).toEqual([
      "active-later",
      "active-earlier",
    ]);
  });

  it("moves an item to the requested position without mutating the original array", () => {
    const source = ["epic-a", "epic-b", "epic-c"];

    expect(moveItem(source, 0, 2)).toEqual(["epic-b", "epic-c", "epic-a"]);
    expect(source).toEqual(["epic-a", "epic-b", "epic-c"]);
  });
});
