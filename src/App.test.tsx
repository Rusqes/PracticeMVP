import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("Sprint Tracker MVP front", () => {
  it("renders the global backlog screen with epic progress and creation actions", () => {
    render(<App />);

    const workspace = screen.getByRole("main");
    const toolbar = screen.getByRole("toolbar", { name: "Действия backlog" });
    expect(within(workspace).queryByText("SPRINT TRACKER MVP")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Global Backlog" })).not.toBeInTheDocument();
    expect(within(toolbar).getByRole("button", { name: "Создать эпик" })).toHaveClass("icon-button");
    expect(screen.queryByText("Алексей Смирнов")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Поиск")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Фильтры" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Global backlog" })).toBeInTheDocument();
    const epicTable = screen.getByRole("table", { name: "Эпики backlog" });
    const epicHeaderRow = within(epicTable).getAllByRole("row")[0];
    const epicHeaders = within(epicHeaderRow).getAllByRole("columnheader").map((header) => header.textContent);
    expect(epicHeaders).toEqual([
      "Название",
      "Статус",
      "Продукт",
      "Стрим",
      "Тип задачи",
      "Исполнители",
      "Прогресс",
      "",
    ]);
    expect(screen.getByText("Личный кабинет клиента")).toBeInTheDocument();
    const firstEpicRow = within(epicTable)
      .getAllByRole("row")
      .find((row) => within(row).queryByText("Личный кабинет клиента"));
    expect(firstEpicRow).toBeDefined();
    expect(within(firstEpicRow as HTMLElement).getByLabelText("Тип задачи эпика Личный кабинет клиента")).toHaveValue("Новый функционал");
    expect(within(firstEpicRow as HTMLElement).queryByText("Готов дизайн API")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Статус эпика Личный кабинет клиента")).toHaveValue("В реализации");
    expect(screen.getByText("4 из 6")).toBeInTheDocument();
    expect(document.querySelector(".progress-track")).toBeNull();
    expect(screen.getByRole("button", { name: "Добавить задачу в Личный кабинет клиента" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Раскрыть эпик" })).not.toBeInTheDocument();
    const firstTaskTable = screen.getByRole("table", { name: "Задачи эпика Личный кабинет клиента" });
    expect(within(firstTaskTable).getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Название",
      "Статус",
      "Продукт",
      "Стрим",
      "Тип задачи",
      "Исполнитель",
      "",
    ]);
    const firstTaskRow = within(firstTaskTable)
      .getAllByRole("row")
      .find((row) => within(row).queryByText("Добавить авторизацию через SSO"));
    expect(firstTaskRow).toBeDefined();
    expect(within(firstTaskRow as HTMLElement).getByLabelText("Продукт задачи Добавить авторизацию через SSO")).toHaveValue("Проект 1");
    expect(within(firstTaskRow as HTMLElement).getByLabelText("Стрим задачи Добавить авторизацию через SSO")).toHaveValue("Продуктовый");
    expect(within(firstTaskTable).queryByText("01.07.2026")).not.toBeInTheDocument();
    expect(screen.queryByText(/Duration:/i)).not.toBeInTheDocument();
  });

  it("toggles an epic by clicking the title area", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Свернуть эпик Личный кабинет клиента" }));

    expect(screen.queryByRole("table", { name: "Задачи эпика Личный кабинет клиента" })).not.toBeInTheDocument();
  });

  it("lets users change backlog epic and task statuses from the full status directory", async () => {
    const user = userEvent.setup();
    render(<App />);

    const epicStatus = screen.getByLabelText("Статус эпика Личный кабинет клиента");
    await user.selectOptions(epicStatus, "Заморожено");
    expect(epicStatus).toHaveValue("Заморожено");

    const taskStatus = screen.getByLabelText("Статус задачи Добавить авторизацию через SSO");
    ["Новая", "Запланировано", "В реализации", "Выполнено", "Отклонено", "Заморожено"].forEach((status) => {
      expect(within(taskStatus).getByRole("option", { name: status })).toBeInTheDocument();
    });

    await user.selectOptions(taskStatus, "Отклонено");
    expect(taskStatus).toHaveValue("Отклонено");
  });

  it("lets users edit epic directory fields with the same pill controls", async () => {
    const user = userEvent.setup();
    render(<App />);

    const product = screen.getByLabelText("Продукт эпика Личный кабинет клиента");
    const stream = screen.getByLabelText("Стрим эпика Личный кабинет клиента");
    const taskType = screen.getByLabelText("Тип задачи эпика Личный кабинет клиента");
    const performersSelect = screen.getByLabelText("Исполнители эпика Личный кабинет клиента");

    expect(product).toHaveClass("pill-select");
    expect(stream).toHaveClass("pill-select");
    expect(taskType).toHaveClass("pill-select");
    expect(performersSelect).toHaveClass("pill-select");

    await user.selectOptions(product, "Сайт");
    await user.selectOptions(stream, "Инженерный");
    await user.selectOptions(taskType, "Исследование");

    expect(product).toHaveValue("Сайт");
    expect(stream).toHaveValue("Инженерный");
    expect(taskType).toHaveValue("Исследование");
    expect(performersSelect).toHaveTextContent("Вася, Саша, Петя");
  });

  it("lets users edit backlog task directory fields with the same pill controls", async () => {
    const user = userEvent.setup();
    render(<App />);

    const product = screen.getByLabelText("Продукт задачи Добавить авторизацию через SSO");
    const stream = screen.getByLabelText("Стрим задачи Добавить авторизацию через SSO");
    const taskType = screen.getByLabelText("Тип задачи Добавить авторизацию через SSO");
    const performer = screen.getByLabelText("Исполнитель задачи Добавить авторизацию через SSO");

    expect(product).toHaveClass("pill-select");
    expect(stream).toHaveClass("pill-select");
    expect(taskType).toHaveClass("pill-select");
    expect(performer).toHaveClass("pill-select");

    await user.selectOptions(product, "Сайт");
    await user.selectOptions(stream, "Инженерный");
    await user.selectOptions(taskType, "Исследование");
    await user.selectOptions(performer, "Петя");

    expect(product).toHaveValue("Сайт");
    expect(stream).toHaveValue("Инженерный");
    expect(taskType).toHaveValue("Исследование");
    expect(performer).toHaveValue("Петя");
  });

  it("places main sections as top header tabs", async () => {
    const user = userEvent.setup();
    render(<App />);

    const headerNav = screen.getByRole("navigation", { name: "Разделы продукта" });
    expect(screen.queryByText("Sprint Tracker")).not.toBeInTheDocument();
    expect(screen.queryByText("MVP")).not.toBeInTheDocument();
    expect(headerNav.querySelector("svg")).toBeNull();
    expect(within(headerNav).getByRole("tab", { name: /global backlog/i })).toHaveAttribute("aria-selected", "true");
    expect(within(headerNav).getByRole("tab", { name: /sprint planning/i })).toHaveAttribute("aria-selected", "false");
    expect(screen.queryByRole("navigation", { name: "Главная навигация" })).not.toBeInTheDocument();

    await user.click(within(headerNav).getByRole("tab", { name: /sprint planning/i }));

    expect(within(headerNav).getByRole("tab", { name: /sprint planning/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("heading", { name: "Sprint Planning" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Добавить задачу в Спринт 3" })).toBeInTheDocument();
  });

  it("opens backlog filters from one compact filter button", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Фильтры" }));

    const filters = screen.getByRole("dialog", { name: "Фильтры backlog" });
    expect(within(filters).getByLabelText("Продукт")).toBeInTheDocument();
    expect(within(filters).getByLabelText("Стрим")).toBeInTheDocument();
    expect(within(filters).getByLabelText("Статус")).toBeInTheDocument();
    expect(within(filters).getByLabelText("Исполнитель")).toBeInTheDocument();

    const statusFilter = within(filters).getByLabelText("Статус");
    ["Новая", "Запланировано", "В реализации", "Выполнено", "Отклонено", "Заморожено"].forEach((status) => {
      expect(within(statusFilter).getByRole("option", { name: status })).toBeInTheDocument();
    });
  });

  it("adds an unscheduled backlog task to a sprint from the sprint plus modal", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: /sprint planning/i }));
    await user.click(screen.getByRole("button", { name: "Добавить задачу в Спринт 3" }));

    const dialog = screen.getByRole("dialog", { name: "Добавить задачу в Спринт 3" });
    expect(within(dialog).getByText("Обновить описание тарифов")).toBeInTheDocument();
    expect(within(dialog).queryByText("Подтверждение email")).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /обновить описание тарифов/i }));
    await user.clear(within(dialog).getByLabelText("Плановая дата"));
    await user.type(within(dialog).getByLabelText("Плановая дата"), "2026-06-18");
    await user.click(within(dialog).getByRole("button", { name: "Добавить в спринт" }));

    expect(screen.queryByRole("dialog", { name: "Добавить задачу в Спринт 3" })).not.toBeInTheDocument();
    expect(screen.getByText("Обновить описание тарифов")).toBeInTheDocument();
  });

  it("lets a user set the actual completion date on a sprint task", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: /sprint planning/i }));
    const actualDate = screen.getByLabelText("Фактическая дата для Добавить авторизацию через SSO");

    await user.clear(actualDate);
    await user.type(actualDate, "2026-07-04");

    expect(actualDate).toHaveValue("2026-07-04");
    expect(screen.getAllByText("Выполнено").length).toBeGreaterThan(0);
  });

  it("switches to settings and shows status and performer directories", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("tab", { name: /settings/i }));

    expect(screen.queryByRole("heading", { name: "Справочники" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Статусы" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Используется для прогресса")).toBeInTheDocument();
    expect(screen.getByText("Исполнители")).toBeInTheDocument();
    expect(screen.getByText("Неактивен")).toBeInTheDocument();
  });
});
