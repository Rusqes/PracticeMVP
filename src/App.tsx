import { useMemo, useState, useRef, useEffect, type CSSProperties, type DragEvent, type FormEvent, type ReactNode, type Dispatch, type SetStateAction } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  epics as initialEpics,
  performers,
  sprints as initialSprints,
  statuses,
  taskTypes,
  type Performer,
  type DirectoryStatus,
  type DirectoryTaskType,
} from "./data";
import {
  formatDate,
  getEpicProgress,
  getSprintDatesLabel,
  getSprintMonthLabel,
  getSprintReadonlyFields,
  getUnscheduledBacklogTasks,
  isCompletedTask,
  moveItem,
  sortTasksForDisplay,
  type Epic,
  type Sprint,
  type SprintTask,
  type StatusName,
  type TaskTypeName,
} from "./domain";

type Screen = "backlog" | "sprints" | "settings";

type DragPayload =
  | { kind: "epic"; epicId: string }
  | { kind: "backlog-task"; epicId: string; taskId: string }
  | { kind: "sprint-task"; sprintId: string; taskId: string };

type CreateTaskModal = { epicId: string } | null;

const statusTone: Record<StatusName, string> = {
  Новая: "neutral",
  Запланировано: "blue",
  "В реализации": "teal",
  Выполнено: "green",
  Отклонено: "red",
  Заморожено: "violet",
};

const typeTone: Record<TaskTypeName, string> = {
  "Новый функционал": "violet",
  Улучшение: "amber",
  Инфраструктура: "teal",
  Исследование: "blue",
};

const productOptions = ["Проект 1", "Сайт"];
const streamOptions = ["Продуктовый", "Инженерный", "Смешанный"];
const performerSetOptions = [
  "Вася, Петя, Саша",
  "Марина, Саша",
  "Вася, Петя",
  "Вася, Саша",
  "Марина, Петя",
  "Вася",
  "Петя",
  "Саша",
  "Марина",
];

const cloneEpics = () =>
  initialEpics.map((epic) => ({
    ...epic,
    tasks: epic.tasks.map((task) => ({ ...task })),
  }));

const cloneSprints = () =>
  initialSprints.map((sprint) => ({
    ...sprint,
    tasks: sprint.tasks.map((task) => ({ ...task })),
  }));

function App() {
  const [screen, setScreen] = useState<Screen>("backlog");
  const [epicList, setEpicList] = useState<Epic[]>(cloneEpics);
  const [sprintList, setSprintList] = useState<Sprint[]>(cloneSprints);
  const [expandedEpicIds, setExpandedEpicIds] = useState(() => new Set([initialEpics[0].id]));
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [streamFilter, setStreamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [performerFilter, setPerformerFilter] = useState("all");
  const [taskContextMenu, setTaskContextMenu] = useState<{
    x: number;
    y: number;
    taskId: string;
    epicId: string;
  } | null>(null);
  const [epicContextMenu, setEpicContextMenu] = useState<{
    x: number;
    y: number;
    epicId: string;
  } | null>(null);
  const [editTaskModal, setEditTaskModal] = useState<{ epicId: string; task: SprintTask } | null>(null);
  const [editEpicModal, setEditEpicModal] = useState<Epic | null>(null);
  const [createEpicOpen, setCreateEpicOpen] = useState(false);
  const [createSprintOpen, setCreateSprintOpen] = useState(false);
  const [createTaskModal, setCreateTaskModal] = useState<CreateTaskModal>(null);

  const [productList, setProductList] = useState<string[]>(["Проект 1", "Сайт"]);
  const [streamList, setStreamList] = useState<string[]>(["Продуктовый", "Инженерный", "Смешанный"]);
  const [statusList, setStatusList] = useState<DirectoryStatus[]>(statuses);
  const [taskTypeList, setTaskTypeList] = useState<DirectoryTaskType[]>(taskTypes);
  const [performerList, setPerformerList] = useState<Performer[]>(performers);

  const performerSetOptions = useMemo(() => {
    const activeNames = performerList.filter((p) => p.active).map((p) => p.name);
    const options = [...activeNames];
    if (activeNames.length >= 2) {
      for (let i = 0; i < activeNames.length; i++) {
        for (let j = i + 1; j < activeNames.length; j++) {
          options.push(`${activeNames[i]}, ${activeNames[j]}`);
        }
      }
    }
    if (activeNames.length >= 3) {
      options.push(activeNames.join(", "));
    }
    return options.length > 0 ? Array.from(new Set(options)) : ["Не выбран"];
  }, [performerList]);
  const [activeSprintId, setActiveSprintId] = useState<string | null>(null);
  const [selectedBacklogTaskId, setSelectedBacklogTaskId] = useState<string | null>(null);
  const [plannedDate, setPlannedDate] = useState("");
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch initial data from Postgres via backend
  useEffect(() => {
    fetch("http://localhost:3000/api/data")
      .then((res) => {
        if (!res.ok) throw new Error("Backend response error");
        return res.json();
      })
      .then((data) => {
        setProductList(data.productList);
        setStreamList(data.streamList);
        setStatusList(data.statusList);
        setTaskTypeList(data.taskTypeList);
        setPerformerList(data.performerList);
        setEpicList(data.epicList);
        setSprintList(data.sprintList);
        setIsLoaded(true);
      })
      .catch((err) => {
        console.warn("Could not load from backend, using initial mock data", err);
        setIsLoaded(true);
      });
  }, []);

  // Save changes back to Postgres via backend
  useEffect(() => {
    if (!isLoaded) return;

    const payload = {
      productList,
      streamList,
      statusList,
      taskTypeList,
      performerList,
      epicList,
      sprintList,
    };

    fetch("http://localhost:3000/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.error("Failed to save state to backend:", err);
    });
  }, [isLoaded, productList, streamList, statusList, taskTypeList, performerList, epicList, sprintList]);

  const unscheduledTasks = useMemo(
    () => getUnscheduledBacklogTasks(epicList, sprintList),
    [epicList, sprintList],
  );
  const selectedSprint = sprintList.find((sprint) => sprint.id === activeSprintId) ?? null;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  };

  const startDrag = (event: DragEvent<HTMLElement>, payload: DragPayload) => {
    setDragPayload(payload);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(payload));
  };

  const getDragPayload = (event: DragEvent<HTMLElement>) => {
    if (dragPayload) {
      return dragPayload;
    }

    const raw = event.dataTransfer.getData("text/plain");
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as DragPayload;
    } catch {
      return null;
    }
  };

  const toggleEpic = (epicId: string) => {
    setExpandedEpicIds((current) => {
      const next = new Set(current);
      if (next.has(epicId)) {
        next.delete(epicId);
      } else {
        next.add(epicId);
      }
      return next;
    });
  };

  const dropEpic = (event: DragEvent<HTMLElement>, targetIndex: number) => {
    event.preventDefault();
    const payload = getDragPayload(event);
    if (!payload || payload.kind !== "epic") {
      return;
    }

    setEpicList((current) => {
      const sourceIndex = current.findIndex((epic) => epic.id === payload.epicId);
      return sourceIndex < 0 ? current : moveItem(current, sourceIndex, targetIndex);
    });
  };

  const dropBacklogTask = (event: DragEvent<HTMLElement>, targetEpicId: string, targetTaskId: string) => {
    event.preventDefault();
    const payload = getDragPayload(event);
    if (!payload || payload.kind !== "backlog-task" || payload.taskId === targetTaskId) {
      return;
    }

    setEpicList((current) => {
      const sourceEpic = current.find((epic) => epic.id === payload.epicId);
      const movedTask = sourceEpic?.tasks.find((task) => task.id === payload.taskId);
      if (!movedTask) {
        return current;
      }

      const withoutMoved = current.map((epic) =>
        epic.id === payload.epicId
          ? { ...epic, tasks: epic.tasks.filter((task) => task.id !== payload.taskId) }
          : { ...epic, tasks: [...epic.tasks] },
      );

      return withoutMoved.map((epic) => {
        if (epic.id !== targetEpicId) {
          return epic;
        }

        const targetIndex = epic.tasks.findIndex((task) => task.id === targetTaskId);
        const nextTasks = [...epic.tasks];
        nextTasks.splice(targetIndex < 0 ? nextTasks.length : targetIndex, 0, movedTask);
        return { ...epic, tasks: nextTasks };
      });
    });
  };

  const dropSprintTask = (event: DragEvent<HTMLElement>, targetSprintId: string, targetTaskId?: string) => {
    event.preventDefault();
    const payload = getDragPayload(event);
    if (!payload || payload.kind !== "sprint-task" || payload.taskId === targetTaskId) {
      return;
    }

    setSprintList((current) => {
      const sourceSprint = current.find((sprint) => sprint.id === payload.sprintId);
      const movedTask = sourceSprint?.tasks.find((task) => task.id === payload.taskId);
      if (!movedTask) {
        return current;
      }

      const withoutMoved = current.map((sprint) =>
        sprint.id === payload.sprintId
          ? { ...sprint, tasks: sprint.tasks.filter((task) => task.id !== payload.taskId) }
          : { ...sprint, tasks: [...sprint.tasks] },
      );

      return withoutMoved.map((sprint) => {
        if (sprint.id !== targetSprintId) {
          return sprint;
        }

        const targetIndex = targetTaskId
          ? sprint.tasks.findIndex((task) => task.id === targetTaskId)
          : sprint.tasks.length;
        const nextTasks = [...sprint.tasks];
        nextTasks.splice(targetIndex < 0 ? nextTasks.length : targetIndex, 0, movedTask);
        return { ...sprint, tasks: nextTasks };
      });
    });
  };

  const updateEpicStatus = (epicId: string, status: StatusName) => {
    setEpicList((current) =>
      current.map((epic) => (epic.id === epicId ? { ...epic, status } : epic)),
    );
  };

  const updateEpicProduct = (epicId: string, product: string) => {
    setEpicList((current) =>
      current.map((epic) => (epic.id === epicId ? { ...epic, product } : epic)),
    );
  };

  const updateEpicStream = (epicId: string, stream: string) => {
    setEpicList((current) =>
      current.map((epic) => (epic.id === epicId ? { ...epic, stream } : epic)),
    );
  };

  const updateEpicTaskType = (epicId: string, taskType: TaskTypeName) => {
    setEpicList((current) =>
      current.map((epic) => (epic.id === epicId ? { ...epic, taskType } : epic)),
    );
  };

  const updateEpicPerformers = (epicId: string, performersValue: string) => {
    const performersList = performersValue.split(",").map((name) => name.trim()).filter(Boolean);
    setEpicList((current) =>
      current.map((epic) => (epic.id === epicId ? { ...epic, performers: performersList } : epic)),
    );
  };

  const updateBacklogTaskStatus = (epicId: string, taskId: string, status: StatusName) => {
    setEpicList((current) =>
      current.map((epic) =>
        epic.id === epicId
          ? {
              ...epic,
              tasks: epic.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
            }
          : epic,
      ),
    );
  };

  const updateBacklogTaskProduct = (epicId: string, taskId: string, product: string) => {
    updateBacklogTask(epicId, taskId, { product });
  };

  const updateBacklogTaskStream = (epicId: string, taskId: string, stream: string) => {
    updateBacklogTask(epicId, taskId, { stream });
  };

  const updateBacklogTaskType = (epicId: string, taskId: string, taskType: TaskTypeName) => {
    updateBacklogTask(epicId, taskId, { taskType });
  };

  const updateBacklogTaskPerformer = (epicId: string, taskId: string, performer: string) => {
    updateBacklogTask(epicId, taskId, { owner: performer, performers: [performer] });
  };

  const updateBacklogTask = (epicId: string, taskId: string, changes: Partial<SprintTask>) => {
    setEpicList((current) =>
      current.map((epic) =>
        epic.id === epicId
          ? {
              ...epic,
              tasks: epic.tasks.map((task) => (task.id === taskId ? { ...task, ...changes } : task)),
            }
          : epic,
      ),
    );
  };

  const openSprintTaskModal = (sprintId: string) => {
    setActiveSprintId(sprintId);
    setSelectedBacklogTaskId(unscheduledTasks[0]?.id ?? null);
    setPlannedDate("");
  };

  const addTaskToSprint = (plannedDateVal: string, commentVal?: string, deviationVal?: string) => {
    const sprint = selectedSprint;
    const task = unscheduledTasks.find((candidate) => candidate.id === selectedBacklogTaskId);
    if (!sprint || !task || !plannedDateVal) {
      return;
    }

    const taskForSprint: SprintTask = {
      ...task,
      plannedDate: plannedDateVal,
      actualDate: undefined,
      comment: commentVal || undefined,
      deviation: deviationVal || undefined,
      status: task.status === "Выполнено" ? "Запланировано" : task.status,
    };

    setSprintList((current) =>
      current.map((item) =>
        item.id === sprint.id ? { ...item, tasks: [...item.tasks, taskForSprint] } : item,
      ),
    );
    setActiveSprintId(null);
    setSelectedBacklogTaskId(null);
    setPlannedDate("");
  };

  const updateActualDate = (sprintId: string, taskId: string, actualDate: string) => {
    setSprintList((current) =>
      current.map((sprint) =>
        sprint.id === sprintId
          ? {
              ...sprint,
              tasks: sprint.tasks.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      actualDate: actualDate || undefined,
                      status: actualDate ? "Выполнено" : task.status,
                    }
                  : task,
              ),
            }
          : sprint,
      ),
    );
  };

  const createEpic = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) {
      return;
    }

    const product = String(form.get("product") ?? productList[0] ?? "Проект 1");
    const stream = String(form.get("stream") ?? streamList[0] ?? "Продуктовый");
    const status = String(form.get("status") ?? statusList[0]?.name ?? "Новая") as StatusName;
    const id = `epic-${Date.now()}`;
    setEpicList((current) => [
      ...current,
      {
        id,
        title,
        status,
        product,
        stream,
        taskType: taskTypeList[0]?.name ?? "Новый функционал",
        performers: [],
        tasks: [],
      },
    ]);
    setExpandedEpicIds((current) => new Set([...current, id]));
    setCreateEpicOpen(false);
  };

  const editEpic = (epicId: string, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) {
      return;
    }

    const product = String(form.get("product") ?? "Проект 1");
    const stream = String(form.get("stream") ?? "Продуктовый");
    const status = String(form.get("status") ?? "Новая") as StatusName;

    setEpicList((current) =>
      current.map((epic) =>
        epic.id === epicId
          ? {
              ...epic,
              title,
              status,
              product,
              stream,
            }
          : epic,
      ),
    );
    setEditEpicModal(null);
  };

  const deleteEpic = (epicId: string) => {
    setEpicList((current) => current.filter((epic) => epic.id !== epicId));
    setExpandedEpicIds((current) => {
      const copy = new Set(current);
      copy.delete(epicId);
      return copy;
    });
  };

  const createTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createTaskModal) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) {
      return;
    }

    setEpicList((current) =>
      current.map((epic) => {
        if (epic.id !== createTaskModal.epicId) {
          return epic;
        }

        const task: SprintTask = {
          id: `task-${Date.now()}`,
          title,
          epicTitle: epic.title,
          status: statusList[0]?.name ?? "Новая",
          taskType: String(form.get("taskType") ?? taskTypeList[0]?.name ?? "Новый функционал") as TaskTypeName,
          product: epic.product,
          stream: epic.stream,
          performers: [],
          plannedDate: form.get("plannedDate") ? String(form.get("plannedDate")) : "",
          result: "Не начато",
        };

        return { ...epic, tasks: [task, ...epic.tasks] };
      }),
    );
    setCreateTaskModal(null);
  };

  const editTask = (updatedTask: SprintTask) => {
    if (!editTaskModal) return;
    setEpicList((current) =>
      current.map((epic) => {
        if (epic.id !== editTaskModal.epicId) return epic;
        return {
          ...epic,
          tasks: epic.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
        };
      })
    );
    setEditTaskModal(null);
    showToast("Задача успешно обновлена");
  };

  const deleteTask = (epicId: string, taskId: string) => {
    setEpicList((current) =>
      current.map((epic) => {
        if (epic.id !== epicId) return epic;
        return {
          ...epic,
          tasks: epic.tasks.filter((t) => t.id !== taskId),
        };
      })
    );
    showToast("Задача успешно удалена");
  };

  const createSprint = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const startDate = String(form.get("startDate") ?? "");
    const endDate = String(form.get("endDate") ?? "");
    const comment = String(form.get("comment") ?? "").trim();

    if (!title || !startDate || !endDate) {
      return;
    }

    const id = `sprint-${Date.now()}`;
    const newSprint: Sprint = {
      id,
      title,
      startDate,
      endDate,
      comment: comment || undefined,
      tasks: [],
    };

    setSprintList((current) => [...current, newSprint]);
    setCreateSprintOpen(false);
    showToast(`Спринт "${title}" успешно создан`);
  };

  const filteredEpics = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    let result = epicList;

    if (normalized) {
      result = result.filter(
        (epic) =>
          epic.title.toLowerCase().includes(normalized) ||
          epic.tasks.some((task) => task.title.toLowerCase().includes(normalized)),
      );
    }

    if (productFilter !== "all") {
      result = result.filter((epic) => epic.product === productFilter);
    }
    if (streamFilter !== "all") {
      result = result.filter((epic) => epic.stream === streamFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((epic) => epic.status === statusFilter);
    }
    if (performerFilter !== "all") {
      result = result.filter((epic) => {
        return epic.tasks.some((t) => t.owner === performerFilter || t.performers.includes(performerFilter));
      });
    }

    return result;
  }, [epicList, searchTerm, productFilter, streamFilter, statusFilter, performerFilter]);

  return (
    <div className="app-shell">
      <AppHeader screen={screen} setScreen={setScreen} />
      <main className="workspace">
        {screen === "backlog" && (
          <GlobalBacklog
            epics={filteredEpics}
            expandedEpicIds={expandedEpicIds}
            filterOpen={filterOpen}
            searchTerm={searchTerm}
            productFilter={productFilter}
            setProductFilter={setProductFilter}
            streamFilter={streamFilter}
            setStreamFilter={setStreamFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            performerFilter={performerFilter}
            setPerformerFilter={setPerformerFilter}
            onTaskContextMenu={(x, y, epicId, taskId) => setTaskContextMenu({ x, y, epicId, taskId })}
            onEpicContextMenu={(x, y, epicId) => setEpicContextMenu({ x, y, epicId })}
            onCreateEpic={() => setCreateEpicOpen(true)}
            onCreateTask={(epicId) => setCreateTaskModal({ epicId })}
            onDropEpic={dropEpic}
            onDropTask={dropBacklogTask}
            onEpicPerformersChange={updateEpicPerformers}
            onEpicProductChange={updateEpicProduct}
            onEpicStatusChange={updateEpicStatus}
            onEpicStreamChange={updateEpicStream}
            onEpicTaskTypeChange={updateEpicTaskType}
            onSearchChange={setSearchTerm}
            onStartDrag={startDrag}
            onTaskPerformerChange={updateBacklogTaskPerformer}
            onTaskProductChange={updateBacklogTaskProduct}
            onTaskStatusChange={updateBacklogTaskStatus}
            onTaskStreamChange={updateBacklogTaskStream}
            onTaskTypeChange={updateBacklogTaskType}
            onToggleEpic={toggleEpic}
            onToggleFilter={() => setFilterOpen((value) => !value)}
            onToast={showToast}
            productList={productList}
            streamList={streamList}
            statusList={statusList}
            taskTypeList={taskTypeList}
            performerList={performerList}
            performerSetOptions={performerSetOptions}
          />
        )}
        {screen === "sprints" && (
          <SprintPlanning
            sprints={sprintList}
            onActualDateChange={updateActualDate}
            onCreateSprint={() => setCreateSprintOpen(true)}
            onDropTask={dropSprintTask}
            onOpenAddTask={openSprintTaskModal}
            onStartDrag={startDrag}
          />
        )}
        {screen === "settings" && (
          <Directories
            productList={productList}
            setProductList={setProductList}
            streamList={streamList}
            setStreamList={setStreamList}
            statusList={statusList}
            setStatusList={setStatusList}
            taskTypeList={taskTypeList}
            setTaskTypeList={setTaskTypeList}
            performerList={performerList}
            setPerformerList={setPerformerList}
            onToast={showToast}
          />
        )}
      </main>

      {createEpicOpen && (
        <CreateEpicDialog
          onClose={() => setCreateEpicOpen(false)}
          onSubmit={createEpic}
          statusList={statusList}
          productList={productList}
          streamList={streamList}
        />
      )}
      {createSprintOpen && (
        <CreateSprintDialog onClose={() => setCreateSprintOpen(false)} onSubmit={createSprint} />
      )}
      {createTaskModal && (
        <CreateTaskDialog
          epic={epicList.find((epic) => epic.id === createTaskModal.epicId) ?? null}
          onClose={() => setCreateTaskModal(null)}
          onSubmit={createTask}
          taskTypeList={taskTypeList}
        />
      )}
      {selectedSprint && (
        <SprintTaskDialog
          availableTasks={unscheduledTasks}
          selectedTaskId={selectedBacklogTaskId}
          sprint={selectedSprint}
          onAdd={addTaskToSprint}
          onClose={() => setActiveSprintId(null)}
          onSelectTask={setSelectedBacklogTaskId}
        />
      )}
      {taskContextMenu && (
        <TaskContextMenu
          x={taskContextMenu.x}
          y={taskContextMenu.y}
          onClose={() => setTaskContextMenu(null)}
          onEdit={() => {
            const taskObj = epicList
              .find((e) => e.id === taskContextMenu.epicId)
              ?.tasks.find((t) => t.id === taskContextMenu.taskId);
            if (taskObj) {
              setEditTaskModal({ epicId: taskContextMenu.epicId, task: taskObj });
            }
            setTaskContextMenu(null);
          }}
          onDelete={() => {
            if (window.confirm("Вы уверены, что хотите удалить эту задачу?")) {
              deleteTask(taskContextMenu.epicId, taskContextMenu.taskId);
            }
            setTaskContextMenu(null);
          }}
        />
      )}
      {editTaskModal && (
        <EditTaskDialog
          epicId={editTaskModal.epicId}
          task={editTaskModal.task}
          onClose={() => setEditTaskModal(null)}
          onSubmit={editTask}
          taskTypeList={taskTypeList}
          productList={productList}
          streamList={streamList}
          statusList={statusList}
          performerList={performerList}
        />
      )}
      {epicContextMenu && (
        <TaskContextMenu
          x={epicContextMenu.x}
          y={epicContextMenu.y}
          onClose={() => setEpicContextMenu(null)}
          onEdit={() => {
            const epicObj = epicList.find((e) => e.id === epicContextMenu.epicId);
            if (epicObj) {
              setEditEpicModal(epicObj);
            }
            setEpicContextMenu(null);
          }}
          onDelete={() => {
            if (window.confirm("Вы уверены, что хотите удалить этот эпик?")) {
              deleteEpic(epicContextMenu.epicId);
            }
            setEpicContextMenu(null);
          }}
        />
      )}
      {editEpicModal && (
        <EditEpicDialog
          epic={editEpicModal}
          onClose={() => setEditEpicModal(null)}
          onSubmit={(e) => editEpic(editEpicModal.id, e)}
          statusList={statusList}
          productList={productList}
          streamList={streamList}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function AppHeader({
  screen,
  setScreen,
}: {
  screen: Screen;
  setScreen: (screen: Screen) => void;
}) {
  const navItems = [
    { id: "backlog" as const, label: "Global Backlog" },
    { id: "sprints" as const, label: "Sprint Planning" },
    { id: "settings" as const, label: "Settings" },
  ];

  return (
    <header className="app-header">
      <nav className="tracker-tabs" aria-label="Разделы продукта">
        {navItems.map((item) => {
          const active = screen === item.id;

          return (
            <button
              aria-selected={active}
              className={`tracker-tab ${active ? "active" : ""}`}
              key={item.id}
              onClick={() => setScreen(item.id)}
              role="tab"
              type="button"
            >
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}

function GlobalBacklog({
  epics,
  expandedEpicIds,
  filterOpen,
  searchTerm,
  productFilter,
  setProductFilter,
  streamFilter,
  setStreamFilter,
  statusFilter,
  setStatusFilter,
  performerFilter,
  setPerformerFilter,
  onTaskContextMenu,
  onEpicContextMenu,
  onCreateEpic,
  onCreateTask,
  onDropEpic,
  onDropTask,
  onEpicPerformersChange,
  onEpicProductChange,
  onEpicStatusChange,
  onEpicStreamChange,
  onEpicTaskTypeChange,
  onSearchChange,
  onStartDrag,
  onTaskPerformerChange,
  onTaskProductChange,
  onTaskStatusChange,
  onTaskStreamChange,
  onTaskTypeChange,
  onToggleEpic,
  onToggleFilter,
  onToast,
  productList,
  streamList,
  statusList,
  taskTypeList,
  performerList,
  performerSetOptions,
}: {
  epics: Epic[];
  expandedEpicIds: Set<string>;
  filterOpen: boolean;
  searchTerm: string;
  productFilter: string;
  setProductFilter: (val: string) => void;
  streamFilter: string;
  setStreamFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  performerFilter: string;
  setPerformerFilter: (val: string) => void;
  onTaskContextMenu: (x: number, y: number, epicId: string, taskId: string) => void;
  onEpicContextMenu: (x: number, y: number, epicId: string) => void;
  onCreateEpic: () => void;
  onCreateTask: (epicId: string) => void;
  onDropEpic: (event: DragEvent<HTMLElement>, targetIndex: number) => void;
  onDropTask: (event: DragEvent<HTMLElement>, targetEpicId: string, targetTaskId: string) => void;
  onEpicPerformersChange: (epicId: string, performersValue: string) => void;
  onEpicProductChange: (epicId: string, product: string) => void;
  onEpicStatusChange: (epicId: string, status: StatusName) => void;
  onEpicStreamChange: (epicId: string, stream: string) => void;
  onEpicTaskTypeChange: (epicId: string, taskType: TaskTypeName) => void;
  onSearchChange: (value: string) => void;
  onStartDrag: (event: DragEvent<HTMLElement>, payload: DragPayload) => void;
  onTaskPerformerChange: (epicId: string, taskId: string, performer: string) => void;
  onTaskProductChange: (epicId: string, taskId: string, product: string) => void;
  onTaskStatusChange: (epicId: string, taskId: string, status: StatusName) => void;
  onTaskStreamChange: (epicId: string, taskId: string, stream: string) => void;
  onTaskTypeChange: (epicId: string, taskId: string, taskType: TaskTypeName) => void;
  onToggleEpic: (epicId: string) => void;
  onToggleFilter: () => void;
  onToast: (message: string) => void;
  productList: string[];
  streamList: string[];
  statusList: DirectoryStatus[];
  taskTypeList: DirectoryTaskType[];
  performerList: Performer[];
  performerSetOptions: string[];
}) {
  return (
    <section className="page">
      <div className="backlog-surface" role="region" aria-label="Global backlog">
        <div className="toolbar backlog-toolbar" role="toolbar" aria-label="Действия backlog">
          <label className="search-field compact-search">
            <Search size={17} />
            <input
              aria-label="Поиск"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Поиск"
              value={searchTerm}
            />
          </label>
          <button
            aria-label="Фильтры"
            type="button"
            onClick={onToggleFilter}
            style={{
              position: "absolute",
              width: "1px",
              height: "1px",
              padding: 0,
              margin: "-1px",
              overflow: "hidden",
              clip: "rect(0, 0, 0, 0)",
              border: 0
            }}
          >
            Фильтры
          </button>
          <FilterPopover
            productList={productList}
            streamList={streamList}
            statusList={statusList}
            performerList={performerList}
            productFilter={productFilter}
            setProductFilter={setProductFilter}
            streamFilter={streamFilter}
            setStreamFilter={setStreamFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            performerFilter={performerFilter}
            setPerformerFilter={setPerformerFilter}
          />
          <button aria-label="Создать эпик" className="icon-button toolbar-create" onClick={onCreateEpic} type="button">
            <Plus size={18} />
          </button>
        </div>

        <div className="epic-list-shell" role="table" aria-label="Эпики backlog">
          <div className="epic-list-head" role="row">
            <span role="columnheader">Название</span>
            <span role="columnheader">Статус</span>
            <span role="columnheader">Продукт</span>
            <span role="columnheader">Стрим</span>
            <span role="columnheader">Тип задачи</span>
            <span role="columnheader">Исполнители</span>
            <span role="columnheader">Прогресс</span>
            <span role="columnheader" />
          </div>
          <div className="epic-list" role="rowgroup">
            {epics.map((epic, index) => (
              <EpicCard
                epic={epic}
                expanded={expandedEpicIds.has(epic.id)}
                index={index}
                key={epic.id}
                onCreateTask={onCreateTask}
                onDropEpic={onDropEpic}
                onDropTask={onDropTask}
                onEpicPerformersChange={onEpicPerformersChange}
                onEpicProductChange={onEpicProductChange}
                onEpicStatusChange={onEpicStatusChange}
                onEpicStreamChange={onEpicStreamChange}
                onEpicTaskTypeChange={onEpicTaskTypeChange}
                onStartDrag={onStartDrag}
                onTaskPerformerChange={onTaskPerformerChange}
                onTaskProductChange={onTaskProductChange}
                onTaskStatusChange={onTaskStatusChange}
                onTaskStreamChange={onTaskStreamChange}
                onTaskTypeChange={onTaskTypeChange}
                onToggleEpic={onToggleEpic}
                onToast={onToast}
                productFilter={productFilter}
                streamFilter={streamFilter}
                statusFilter={statusFilter}
                performerFilter={performerFilter}
                onTaskContextMenu={onTaskContextMenu}
                onEpicContextMenu={onEpicContextMenu}
                productList={productList}
                streamList={streamList}
                statusList={statusList}
                taskTypeList={taskTypeList}
                performerList={performerList}
                performerSetOptions={performerSetOptions}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterPopover({
  productList,
  streamList,
  statusList,
  performerList,
  productFilter,
  setProductFilter,
  streamFilter,
  setStreamFilter,
  statusFilter,
  setStatusFilter,
  performerFilter,
  setPerformerFilter,
}: {
  productList: string[];
  streamList: string[];
  statusList: DirectoryStatus[];
  performerList: Performer[];
  productFilter: string;
  setProductFilter: (val: string) => void;
  streamFilter: string;
  setStreamFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  performerFilter: string;
  setPerformerFilter: (val: string) => void;
}) {
  return (
    <div className="filter-popover" role="dialog" aria-label="Фильтры backlog">
      <div className="filter-group">
        <span className="filter-group-label">Продукт</span>
        <PillSelect
          ariaLabel="Продукт"
          onChange={(val) => setProductFilter(val === "Все продукты" ? "all" : val)}
          options={["Все продукты", ...productList]}
          value={productFilter === "all" ? "Все продукты" : productFilter}
        />
      </div>
      <div className="filter-group">
        <span className="filter-group-label">Стрим</span>
        <PillSelect
          ariaLabel="Стрим"
          onChange={(val) => setStreamFilter(val === "Все стримы" ? "all" : val)}
          options={["Все стримы", ...streamList]}
          value={streamFilter === "all" ? "Все стримы" : streamFilter}
        />
      </div>
      <div className="filter-group">
        <span className="filter-group-label">Статус</span>
        <PillSelect
          ariaLabel="Статус"
          onChange={(val) => setStatusFilter(val === "Все" ? "all" : val)}
          options={["Все", ...statusList.map((s) => s.name)]}
          value={statusFilter === "all" ? "Все" : statusFilter}
        />
      </div>
      <div className="filter-group">
        <span className="filter-group-label">Исполнитель</span>
        <PillSelect
          ariaLabel="Исполнитель"
          onChange={(val) => setPerformerFilter(val === "Все" ? "all" : val)}
          options={["Все", ...performerList.map((p) => p.name)]}
          value={performerFilter === "all" ? "Все" : performerFilter}
        />
      </div>
    </div>
  );
}

function getEpicSummary(epic: Epic): {
  performers: string;
} {
  const taskPerformers = new Set<string>();
  epic.tasks.forEach((task) => {
    if (task.owner) {
      taskPerformers.add(task.owner);
    } else {
      task.performers.forEach((p) => {
        if (p) taskPerformers.add(p);
      });
    }
  });
  const list = Array.from(taskPerformers).filter(Boolean);
  return {
    performers: list.length > 0 ? list.join(", ") : "—",
  };
}

function EpicCard({
  epic,
  expanded,
  index,
  onCreateTask,
  onDropEpic,
  onDropTask,
  onEpicPerformersChange,
  onEpicProductChange,
  onEpicStatusChange,
  onEpicStreamChange,
  onEpicTaskTypeChange,
  onStartDrag,
  onTaskPerformerChange,
  onTaskProductChange,
  onTaskStatusChange,
  onTaskStreamChange,
  onTaskTypeChange,
  onToggleEpic,
  onToast,
  productFilter,
  streamFilter,
  statusFilter,
  performerFilter,
  onTaskContextMenu,
  onEpicContextMenu,
  productList,
  streamList,
  statusList,
  taskTypeList,
  performerList,
  performerSetOptions,
}: {
  epic: Epic;
  expanded: boolean;
  index: number;
  onCreateTask: (epicId: string) => void;
  onDropEpic: (event: DragEvent<HTMLElement>, targetIndex: number) => void;
  onDropTask: (event: DragEvent<HTMLElement>, targetEpicId: string, targetTaskId: string) => void;
  onEpicPerformersChange: (epicId: string, performersValue: string) => void;
  onEpicProductChange: (epicId: string, product: string) => void;
  onEpicStatusChange: (epicId: string, status: StatusName) => void;
  onEpicStreamChange: (epicId: string, stream: string) => void;
  onEpicTaskTypeChange: (epicId: string, taskType: TaskTypeName) => void;
  onStartDrag: (event: DragEvent<HTMLElement>, payload: DragPayload) => void;
  onTaskPerformerChange: (epicId: string, taskId: string, performer: string) => void;
  onTaskProductChange: (epicId: string, taskId: string, product: string) => void;
  onTaskStatusChange: (epicId: string, taskId: string, status: StatusName) => void;
  onTaskStreamChange: (epicId: string, taskId: string, stream: string) => void;
  onTaskTypeChange: (epicId: string, taskId: string, taskType: TaskTypeName) => void;
  onToggleEpic: (epicId: string) => void;
  onToast: (message: string) => void;
  productFilter: string;
  streamFilter: string;
  statusFilter: string;
  performerFilter: string;
  onTaskContextMenu: (x: number, y: number, epicId: string, taskId: string) => void;
  onEpicContextMenu: (x: number, y: number, epicId: string) => void;
  productList: string[];
  streamList: string[];
  statusList: DirectoryStatus[];
  taskTypeList: DirectoryTaskType[];
  performerList: Performer[];
  performerSetOptions: string[];
}) {
  const progress = getEpicProgress(epic);
  const summary = getEpicSummary(epic);

  return (
    <article
      aria-label={`Эпик ${epic.title}`}
      className="epic-card"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDropEpic(event, index)}
    >
      <div
        className="epic-summary"
        onContextMenu={(e) => {
          e.preventDefault();
          onEpicContextMenu(e.clientX, e.clientY, epic.id);
        }}
        role="row"
      >
        <div className="epic-name-cell" role="cell">
          <span
            aria-label={`Перетащить эпик ${epic.title}`}
            className="drag-button"
            draggable
            onDragStart={(event) => onStartDrag(event, { kind: "epic", epicId: epic.id })}
            role="button"
            tabIndex={0}
          >
            <GripVertical size={20} />
          </span>
          <button
            aria-expanded={expanded}
            aria-label={`${expanded ? "Свернуть" : "Развернуть"} эпик ${epic.title}`}
            className="epic-title-button"
            onClick={() => onToggleEpic(epic.id)}
            type="button"
          >
            <strong className="epic-title">{epic.title}</strong>
          </button>
        </div>
        <div className="epic-cell" role="cell">
          <StatusSelect
            ariaLabel={`Статус эпика ${epic.title}`}
            onChange={(status) => onEpicStatusChange(epic.id, status)}
            statusesList={statusList}
            value={epic.status}
          />
        </div>
        <div className="epic-cell" role="cell">
          <PillSelect
            ariaLabel={`Продукт эпика ${epic.title}`}
            onChange={(product) => onEpicProductChange(epic.id, product)}
            options={productList}
            value={epic.product}
          />
        </div>
        <div className="epic-cell" role="cell">
          <PillSelect
            ariaLabel={`Стрим эпика ${epic.title}`}
            onChange={(stream) => onEpicStreamChange(epic.id, stream)}
            options={streamList}
            value={epic.stream}
          />
        </div>
        <div className="epic-cell" role="cell">
          <PillSelect
            ariaLabel={`Тип задачи эпика ${epic.title}`}
            onChange={(taskType) => onEpicTaskTypeChange(epic.id, taskType as TaskTypeName)}
            options={taskTypeList.map((type) => type.name)}
            tone={typeTone[epic.taskType]}
            value={epic.taskType}
          />
        </div>
        <div className="epic-cell" role="cell">
          <div
            aria-label={`Исполнители эпика ${epic.title}`}
            className="pill-select wide neutral"
            style={{
              pointerEvents: "none",
              backgroundImage: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "32px",
            }}
          >
            {summary.performers}
          </div>
        </div>
        <div className="progress-box" role="cell">
          <div className="progress-top">
            <strong>{progress.label}</strong>
          </div>
        </div>
        <div className="epic-actions" role="cell">
          <button className="icon-button" aria-label={`Добавить задачу в ${epic.title}`} onClick={() => onCreateTask(epic.id)} type="button">
            <Plus size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Меню эпика"
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              onEpicContextMenu(rect.left, rect.bottom, epic.id);
            }}
            type="button"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="task-panel">
          <div className="task-table backlog-task-table" role="table" aria-label={`Задачи эпика ${epic.title}`}>
            <div className="task-row task-head" role="row">
              <span role="columnheader">Название</span>
              <span role="columnheader">Статус</span>
              <span role="columnheader">Продукт</span>
              <span role="columnheader">Стрим</span>
              <span role="columnheader">Тип задачи</span>
              <span role="columnheader">Исполнитель</span>
              <span role="columnheader" />
            </div>
            {sortTasksForDisplay(
              epic.tasks.filter((task) => {
                if (productFilter !== "all" && task.product !== productFilter) return false;
                if (streamFilter !== "all" && task.stream !== streamFilter) return false;
                if (statusFilter !== "all" && task.status !== statusFilter) return false;
                if (performerFilter !== "all" && task.owner !== performerFilter && !task.performers.includes(performerFilter)) return false;
                return true;
              })
            ).map((task) => (
              <TaskRow
                epicId={epic.id}
                key={task.id}
                mode="backlog"
                onDropTask={(event) => onDropTask(event, epic.id, task.id)}
                onContextMenu={(x, y, taskId) => onTaskContextMenu(x, y, epic.id, taskId)}
                onPerformerChange={(taskId, performer) => onTaskPerformerChange(epic.id, taskId, performer)}
                onProductChange={(taskId, product) => onTaskProductChange(epic.id, taskId, product)}
                onStartDrag={onStartDrag}
                onStatusChange={(taskId, status) => onTaskStatusChange(epic.id, taskId, status)}
                onStreamChange={(taskId, stream) => onTaskStreamChange(epic.id, taskId, stream)}
                onTaskTypeChange={(taskId, taskType) => onTaskTypeChange(epic.id, taskId, taskType)}
                task={task}
                productList={productList}
                streamList={streamList}
                statusList={statusList}
                taskTypeList={taskTypeList}
                performerList={performerList}
              />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function TaskRow({
  epicId,
  mode,
  onActualDateChange,
  onDropTask,
  onContextMenu,
  onPerformerChange,
  onProductChange,
  onStartDrag,
  onStatusChange,
  onStreamChange,
  onTaskTypeChange,
  sprintId,
  task,
  productList = [],
  streamList = [],
  statusList = [],
  taskTypeList = [],
  performerList = [],
}: {
  epicId?: string;
  mode: "backlog" | "sprint";
  onActualDateChange?: (taskId: string, actualDate: string) => void;
  onDropTask: (event: DragEvent<HTMLElement>) => void;
  onContextMenu?: (x: number, y: number, taskId: string) => void;
  onPerformerChange?: (taskId: string, performer: string) => void;
  onProductChange?: (taskId: string, product: string) => void;
  onStartDrag: (event: DragEvent<HTMLElement>, payload: DragPayload) => void;
  onStatusChange?: (taskId: string, status: StatusName) => void;
  onStreamChange?: (taskId: string, stream: string) => void;
  onTaskTypeChange?: (taskId: string, taskType: TaskTypeName) => void;
  sprintId?: string;
  task: SprintTask;
  productList?: string[];
  streamList?: string[];
  statusList?: DirectoryStatus[];
  taskTypeList?: DirectoryTaskType[];
  performerList?: Performer[];
}) {
  const dragPayload: DragPayload =
    mode === "backlog"
      ? { kind: "backlog-task", epicId: epicId ?? "", taskId: task.id }
      : { kind: "sprint-task", sprintId: sprintId ?? "", taskId: task.id };

  return (
    <div
      className={`task-row ${isCompletedTask(task) ? "completed" : ""}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDropTask}
      onContextMenu={(e) => {
        if (mode === "backlog" && onContextMenu) {
          e.preventDefault();
          onContextMenu(e.clientX, e.clientY, task.id);
        }
      }}
      role="row"
    >
      <div className="task-name-cell">
        <span
          aria-label={`Перетащить задачу ${task.title}`}
          className="drag-button small-drag"
          draggable
          onDragStart={(event) => onStartDrag(event, dragPayload)}
          role="button"
          tabIndex={0}
        >
          <GripVertical size={17} />
        </span>
        <span className={`task-type-dot ${typeTone[task.taskType]}`}>
          {isCompletedTask(task) ? <Check size={13} /> : null}
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <strong>{task.title}</strong>
          {mode === "sprint" && <small>{task.epicTitle}</small>}
          {mode === "backlog" && task.comment && (
            <span style={{ fontSize: "11px", color: "#667085", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
              <span>💬</span>
              <span>{task.comment}</span>
            </span>
          )}
          {mode === "backlog" && task.result && (
            <span style={{ fontSize: "11px", color: "#2563eb", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
              <span>🎯</span>
              <span>{task.result}</span>
            </span>
          )}
        </div>
      </div>
      {mode === "backlog" ? (
        <StatusSelect
          ariaLabel={`Статус задачи ${task.title}`}
          onChange={(status) => onStatusChange?.(task.id, status)}
          statusesList={statusList}
          value={task.status}
        />
      ) : (
        <StatusChip status={task.status} />
      )}
      {mode === "backlog" ? (
        <PillSelect
          ariaLabel={`Продукт задачи ${task.title}`}
          onChange={(product) => onProductChange?.(task.id, product)}
          options={productList}
          value={task.product}
        />
      ) : null}
      {mode === "backlog" ? (
        <PillSelect
          ariaLabel={`Стрим задачи ${task.title}`}
          onChange={(stream) => onStreamChange?.(task.id, stream)}
          options={streamList}
          value={task.stream}
        />
      ) : null}
      {mode === "backlog" ? (
        <PillSelect
          ariaLabel={`Тип задачи ${task.title}`}
          onChange={(taskType) => onTaskTypeChange?.(task.id, taskType as TaskTypeName)}
          options={taskTypeList.map((type) => type.name)}
          tone={typeTone[task.taskType]}
          value={task.taskType}
        />
      ) : (
        <TypeChip type={task.taskType} />
      )}
      {mode === "backlog" ? (
        <PillSelect
          ariaLabel={`Исполнитель задачи ${task.title}`}
          onChange={(performer) => onPerformerChange?.(task.id, performer)}
          options={performerList.map((performer) => performer.name)}
          value={task.owner ?? task.performers[0] ?? (performerList[0]?.name || "Не выбран")}
        />
      ) : (
        <PerformerCell name={task.owner ?? task.performers[0]} />
      )}
      {mode === "sprint" && <span className="date-cell">{formatDate(task.plannedDate)}</span>}
      {mode === "backlog" && (
        <button
          className="icon-button"
          aria-label={`Меню задачи ${task.title}`}
          onClick={(e) => {
            e.stopPropagation();
            if (onContextMenu) {
              const rect = e.currentTarget.getBoundingClientRect();
              onContextMenu(rect.left, rect.bottom, task.id);
            }
          }}
          type="button"
        >
          <MoreHorizontal size={17} />
        </button>
      )}
      {mode === "sprint" && (
        <input
          aria-label={`Фактическая дата для ${task.title}`}
          className="actual-date-input"
          onChange={(event) => onActualDateChange?.(task.id, event.target.value)}
          type="date"
          value={task.actualDate ?? ""}
        />
      )}
    </div>
  );
}

function SprintPlanning({
  sprints,
  onActualDateChange,
  onCreateSprint,
  onDropTask,
  onOpenAddTask,
  onStartDrag,
}: {
  sprints: Sprint[];
  onActualDateChange: (sprintId: string, taskId: string, actualDate: string) => void;
  onCreateSprint: () => void;
  onDropTask: (event: DragEvent<HTMLElement>, targetSprintId: string, targetTaskId?: string) => void;
  onOpenAddTask: (sprintId: string) => void;
  onStartDrag: (event: DragEvent<HTMLElement>, payload: DragPayload) => void;
}) {
  return (
    <section className="page">
      <div className="toolbar page-actions" role="toolbar" aria-label="Действия спринтов">
        <button className="primary-button toolbar-create" onClick={onCreateSprint} type="button">
          <Plus size={18} />
          Создать спринт
        </button>
      </div>

      <div className="sprint-layout single-column">
        <div className="sprint-main">
          <Timeline sprints={sprints} />
          <div className="sprint-board">
            {sprints.map((sprint) => (
              <SprintSection
                key={sprint.id}
                onActualDateChange={onActualDateChange}
                onDropTask={onDropTask}
                onOpenAddTask={onOpenAddTask}
                onStartDrag={onStartDrag}
                sprint={sprint}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Timeline({ sprints }: { sprints: Sprint[] }) {
  const months = useMemo(() => Array.from(new Set(sprints.map((sprint) => getSprintMonthLabel(sprint.startDate)))), [sprints]);

  return (
    <div className="timeline" aria-label="Месяцы спринтов">
      {months.map((month) => (
        <div className="month-block" key={month}>
          <span>{month}</span>
          <div className="month-line" />
        </div>
      ))}
    </div>
  );
}

function SprintSection({
  sprint,
  onActualDateChange,
  onDropTask,
  onOpenAddTask,
  onStartDrag,
}: {
  sprint: Sprint;
  onActualDateChange: (sprintId: string, taskId: string, actualDate: string) => void;
  onDropTask: (event: DragEvent<HTMLElement>, targetSprintId: string, targetTaskId?: string) => void;
  onOpenAddTask: (sprintId: string) => void;
  onStartDrag: (event: DragEvent<HTMLElement>, payload: DragPayload) => void;
}) {
  return (
    <article
      className="sprint-card"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDropTask(event, sprint.id)}
    >
      <div className="sprint-card-header">
        <div>
          <h2>{sprint.title}</h2>
          <span>{getSprintDatesLabel(sprint.startDate, sprint.endDate)}</span>
          {sprint.comment && (
            <p className="sprint-comment" style={{ fontSize: "0.85rem", color: "#6B7280", marginTop: "4px" }}>
              {sprint.comment}
            </p>
          )}
        </div>
        <button className="ghost-icon-button" aria-label={`Добавить задачу в ${sprint.title}`} onClick={() => onOpenAddTask(sprint.id)} type="button">
          <Plus size={16} />
        </button>
      </div>
      <div className="task-table sprint-task-table">
        <div className="task-row task-head">
          <span>Задача</span>
          <span>Статус</span>
          <span>Тип</span>
          <span>Ответственный</span>
          <span>План</span>
          <span>Факт</span>
        </div>
        {sortTasksForDisplay(sprint.tasks).map((task) => (
          <TaskRow
            key={task.id}
            mode="sprint"
            onActualDateChange={(taskId, actualDate) => onActualDateChange(sprint.id, taskId, actualDate)}
            onDropTask={(event) => onDropTask(event, sprint.id, task.id)}
            onStartDrag={onStartDrag}
            sprintId={sprint.id}
            task={task}
          />
        ))}
      </div>
    </article>
  );
}

function SprintTaskDialog({
  availableTasks,
  selectedTaskId,
  sprint,
  onAdd,
  onClose,
  onSelectTask,
}: {
  availableTasks: SprintTask[];
  selectedTaskId: string | null;
  sprint: Sprint;
  onAdd: (plannedDate: string, comment?: string, deviation?: string) => void;
  onClose: () => void;
  onSelectTask: (taskId: string) => void;
}) {
  const [plannedDate, setPlannedDate] = useState("");
  const [comment, setComment] = useState("");
  const [deviation, setDeviation] = useState("");

  const epicTitles = useMemo(() => {
    return Array.from(new Set(availableTasks.map((t) => t.epicTitle)));
  }, [availableTasks]);

  const initialEpic = availableTasks.find((t) => t.id === selectedTaskId)?.epicTitle ?? epicTitles[0] ?? "";
  const [selectedEpicTitle, setSelectedEpicTitle] = useState(initialEpic);

  const tasksForSelectedEpic = useMemo(() => {
    return availableTasks.filter((t) => t.epicTitle === selectedEpicTitle);
  }, [availableTasks, selectedEpicTitle]);

  const selectedTask = availableTasks.find((task) => task.id === selectedTaskId) ?? tasksForSelectedEpic[0] ?? null;
  const readonly = selectedTask ? getSprintReadonlyFields(selectedTask) : null;

  const handleEpicChange = (epicTitle: string) => {
    setSelectedEpicTitle(epicTitle);
    const firstTask = availableTasks.find((t) => t.epicTitle === epicTitle);
    if (firstTask) {
      onSelectTask(firstTask.id);
    }
  };

  return (
    <Modal ariaLabel={`Добавить задачу в ${sprint.title}`} onClose={onClose} title={`Добавить задачу в ${sprint.title}`}>
      <div className="modal-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {epicTitles.length === 0 ? (
            <p className="empty-state">Все задачи backlog уже запланированы в спринтах.</p>
          ) : (
            <label className="field">
              <span>Эпик из global backlog</span>
              <PillSelect
                ariaLabel="Эпик из global backlog"
                onChange={handleEpicChange}
                options={epicTitles}
                value={selectedEpicTitle}
                wide
              />
            </label>
          )}

          <div className="backlog-picker" style={{ flex: 1, minHeight: "220px" }}>
            <h3>Задачи эпика</h3>
            {tasksForSelectedEpic.map((task) => (
              <button
                className={`backlog-choice ${selectedTask?.id === task.id ? "selected" : ""}`}
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                type="button"
              >
                <strong>{task.title}</strong>
                <span>
                  <StatusChip status={task.status} />
                  <TypeChip type={task.taskType} />
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="modal-side">
          <div className="form-grid">
            <label className="field">
              <span>Плановая дата</span>
              <input aria-label="Плановая дата" onChange={(event) => setPlannedDate(event.target.value)} type="date" value={plannedDate} />
            </label>
            <label className="field">
              <span>Отклонение</span>
              <input
                aria-label="Отклонение"
                onChange={(event) => setDeviation(event.target.value)}
                type="text"
                placeholder="Например: +1 день"
                value={deviation}
                style={{
                  width: "100%",
                  padding: "0.375rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #D1D5DB",
                }}
              />
            </label>
          </div>
          <label className="field" style={{ marginTop: "0.5rem", display: "block" }}>
            <span>Комментарий к задаче</span>
            <input
              aria-label="Комментарий к задаче"
              onChange={(event) => setComment(event.target.value)}
              type="text"
              placeholder="Комментарий..."
              value={comment}
              style={{
                width: "100%",
                padding: "0.375rem",
                borderRadius: "0.375rem",
                border: "1px solid #D1D5DB",
              }}
            />
          </label>
          <p className="helper-text" style={{ marginTop: "0.5rem" }}>
            Фактическая дата проставляется в строке задачи, когда работа выполнена.
          </p>

          {readonly && (
            <div className="readonly-card">
              <h3>Поля из backlog</h3>
              <ReadonlyField label="Статус" value={readonly.status} />
              <ReadonlyField label="Исполнители" value={readonly.performers} />
              <ReadonlyField label="Ответственный" value={readonly.owner} />
              <ReadonlyField label="Тип задачи" value={readonly.taskType} />
              <ReadonlyField label="Продукт" value={readonly.product} />
              <ReadonlyField label="Стрим" value={readonly.stream} />
              <ReadonlyField label="Результат" value={readonly.result} />
            </div>
          )}

          <div className="panel-actions">
            <button className="secondary-button" onClick={onClose} type="button">
              Отмена
            </button>
            <button className="primary-button" disabled={!selectedTask || !plannedDate} onClick={() => onAdd(plannedDate, comment, deviation)} type="button">
              Добавить в спринт
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function CreateEpicDialog({
  onClose,
  onSubmit,
  statusList,
  productList,
  streamList,
}: {
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  statusList: DirectoryStatus[];
  productList: string[];
  streamList: string[];
}) {
  const [status, setStatus] = useState<StatusName>("Новая");
  const [product, setProduct] = useState(productList[0] || "Проект 1");
  const [stream, setStream] = useState(streamList[0] || "Продуктовый");

  return (
    <Modal ariaLabel="Создать эпик" onClose={onClose} title="Создать эпик">
      <form className="form-stack" onSubmit={onSubmit}>
        <label>
          <span>Название</span>
          <input name="title" placeholder="Например: Новый onboarding" required />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Статус</span>
            <StatusSelect
              ariaLabel="Статус"
              name="status"
              onChange={(val) => setStatus(val)}
              statusesList={statusList}
              value={status}
            />
          </label>
          <label className="field">
            <span>Продукт</span>
            <PillSelect
              ariaLabel="Продукт"
              name="product"
              onChange={(val) => setProduct(val)}
              options={productList}
              value={product}
              wide
            />
          </label>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Стрим</span>
            <PillSelect
              ariaLabel="Стрим"
              name="stream"
              onChange={(val) => setStream(val)}
              options={streamList}
              value={stream}
              wide
            />
          </label>
        </div>
        <div className="panel-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            Отмена
          </button>
          <button className="primary-button" type="submit">
            Создать
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditEpicDialog({
  epic,
  onClose,
  onSubmit,
  statusList,
  productList,
  streamList,
}: {
  epic: Epic;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  statusList: DirectoryStatus[];
  productList: string[];
  streamList: string[];
}) {
  const [status, setStatus] = useState<StatusName>(epic.status);
  const [product, setProduct] = useState(epic.product);
  const [stream, setStream] = useState(epic.stream);

  return (
    <Modal ariaLabel="Редактировать эпик" onClose={onClose} title="Редактировать эпик">
      <form className="form-stack" onSubmit={onSubmit}>
        <label>
          <span>Название</span>
          <input name="title" defaultValue={epic.title} placeholder="Например: Новый onboarding" required />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Статус</span>
            <StatusSelect
              ariaLabel="Статус"
              name="status"
              onChange={(val) => setStatus(val)}
              statusesList={statusList}
              value={status}
            />
          </label>
          <label className="field">
            <span>Продукт</span>
            <PillSelect
              ariaLabel="Продукт"
              name="product"
              onChange={(val) => setProduct(val)}
              options={productList}
              value={product}
              wide
            />
          </label>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Стрим</span>
            <PillSelect
              ariaLabel="Стрим"
              name="stream"
              onChange={(val) => setStream(val)}
              options={streamList}
              value={stream}
              wide
            />
          </label>
        </div>
        <div className="panel-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            Отмена
          </button>
          <button className="primary-button" type="submit">
            Сохранить
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CreateTaskDialog({
  epic,
  onClose,
  onSubmit,
  taskTypeList,
  isBacklog = false,
}: {
  epic: Epic | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  taskTypeList: DirectoryTaskType[];
  isBacklog?: boolean;
}) {
  const [taskType, setTaskType] = useState<string>("Новый функционал");

  if (!epic) {
    return null;
  }

  return (
    <Modal ariaLabel={`Добавить задачу в ${epic.title}`} onClose={onClose} title={`Добавить задачу в ${epic.title}`}>
      <form className="form-stack" onSubmit={onSubmit}>
        <label>
          <span>Название</span>
          <input name="title" placeholder="Название задачи" required />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Тип задачи</span>
            <PillSelect
              ariaLabel="Тип задачи"
              name="taskType"
              onChange={(val) => setTaskType(val)}
              options={taskTypeList.map((type) => type.name)}
              value={taskType}
              wide
            />
          </label>
          {!isBacklog && (
            <label className="field">
              <span>Плановая дата</span>
              <input name="plannedDate" type="date" defaultValue="2026-07-10" />
            </label>
          )}
        </div>
        <div className="panel-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            Отмена
          </button>
          <button className="primary-button" type="submit">
            Добавить задачу
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({
  ariaLabel,
  children,
  onClose,
  title,
}: {
  ariaLabel: string;
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="modal-backdrop">
      <section aria-label={ariaLabel} className="modal-card" role="dialog">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Закрыть" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="readonly-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Directories({
  productList,
  setProductList,
  streamList,
  setStreamList,
  statusList,
  setStatusList,
  taskTypeList,
  setTaskTypeList,
  performerList,
  setPerformerList,
  onToast,
}: {
  productList: string[];
  setProductList: Dispatch<SetStateAction<string[]>>;
  streamList: string[];
  setStreamList: Dispatch<SetStateAction<string[]>>;
  statusList: DirectoryStatus[];
  setStatusList: Dispatch<SetStateAction<DirectoryStatus[]>>;
  taskTypeList: DirectoryTaskType[];
  setTaskTypeList: Dispatch<SetStateAction<DirectoryTaskType[]>>;
  performerList: Performer[];
  setPerformerList: Dispatch<SetStateAction<Performer[]>>;
  onToast: (message: string) => void;
}) {
  const [tab, setTab] = useState("Статусы");
  const tabs = ["Продукты", "Стримы", "Статусы", "Типы задач", "Исполнители"];

  // Local state for modal editor
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<"create" | "update">("create");
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("#6B7280");
  const [formProgress, setFormProgress] = useState(false);
  const [formRole, setFormRole] = useState("");
  const [formActive, setFormActive] = useState(true);

  const openCreateModal = () => {
    setEditMode("create");
    setEditIndex(null);
    setFormName("");
    setFormColor("#6B7280");
    setFormProgress(false);
    setFormRole("");
    setFormActive(true);
    setModalOpen(true);
  };

  const openEditModal = (index: number) => {
    setEditMode("update");
    setEditIndex(index);
    if (tab === "Продукты") {
      setFormName(productList[index]);
    } else if (tab === "Стримы") {
      setFormName(streamList[index]);
    } else if (tab === "Статусы") {
      setFormName(statusList[index].name);
      setFormColor(statusList[index].color);
      setFormProgress(statusList[index].progress);
    } else if (tab === "Типы задач") {
      setFormName(taskTypeList[index].name);
      setFormColor(taskTypeList[index].color);
    } else if (tab === "Исполнители") {
      setFormName(performerList[index].name);
      setFormRole(performerList[index].role);
      setFormActive(performerList[index].active);
    }
    setModalOpen(true);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    if (!name) return;

    if (tab === "Продукты") {
      if (editMode === "create") {
        setProductList([...productList, name]);
      } else if (editIndex !== null) {
        setProductList(productList.map((p, i) => i === editIndex ? name : p));
      }
    } else if (tab === "Стримы") {
      if (editMode === "create") {
        setStreamList([...streamList, name]);
      } else if (editIndex !== null) {
        setStreamList(streamList.map((s, i) => i === editIndex ? name : s));
      }
    } else if (tab === "Статусы") {
      const item: DirectoryStatus = { name: name as StatusName, color: formColor, progress: formProgress };
      if (editMode === "create") {
        setStatusList([...statusList, item]);
      } else if (editIndex !== null) {
        setStatusList(statusList.map((s, i) => i === editIndex ? item : s));
      }
    } else if (tab === "Типы задач") {
      const item: DirectoryTaskType = { name: name as TaskTypeName, color: formColor };
      if (editMode === "create") {
        setTaskTypeList([...taskTypeList, item]);
      } else if (editIndex !== null) {
        setTaskTypeList(taskTypeList.map((t, i) => i === editIndex ? item : t));
      }
    } else if (tab === "Исполнители") {
      const initials = name.slice(0, 1).toUpperCase();
      const item: Performer = { name, role: formRole || "Разработчик", active: formActive, initials };
      if (editMode === "create") {
        setPerformerList([...performerList, item]);
      } else if (editIndex !== null) {
        setPerformerList(performerList.map((p, i) => i === editIndex ? item : p));
      }
    }

    setModalOpen(false);
    onToast(`${tab}: сохранено успешно`);
  };

  const handleDelete = (index: number) => {
    if (!window.confirm(`Вы уверены, что хотите удалить элемент из ${tab}?`)) return;

    if (tab === "Продукты") {
      setProductList(productList.filter((_, i) => i !== index));
    } else if (tab === "Стримы") {
      setStreamList(streamList.filter((_, i) => i !== index));
    } else if (tab === "Статусы") {
      setStatusList(statusList.filter((_, i) => i !== index));
    } else if (tab === "Типы задач") {
      setTaskTypeList(taskTypeList.filter((_, i) => i !== index));
    } else if (tab === "Исполнители") {
      setPerformerList(performerList.filter((_, i) => i !== index));
    }
    onToast(`${tab}: удалено успешно`);
  };

  return (
    <section className="page">
      <div className="settings-topbar">
        <div className="tabs" role="tablist" aria-label="Справочники">
          {tabs.map((tabName) => (
            <button
              aria-selected={tab === tabName}
              className={tab === tabName ? "active" : ""}
              key={tabName}
              onClick={() => setTab(tabName)}
              role="tab"
              type="button"
            >
              {tabName}
            </button>
          ))}
        </div>
        <button className="primary-button toolbar-create" onClick={openCreateModal} type="button">
          <Plus size={18} />
          Добавить элемент
        </button>
      </div>

      <div className="settings-grid">
        <section className="directory-table-card">
          <div className="table-title-row">
            <h2>{tab}</h2>
          </div>
          <div className="directory-table">
            {tab === "Продукты" && (
              <>
                <div className="directory-row directory-head">
                  <span>Название продукта</span>
                  <span>Действия</span>
                </div>
                {productList.map((product, idx) => (
                  <div className="directory-row" key={product}>
                    <strong>{product}</strong>
                    <span className="action-icons">
                      <button className="icon-button" aria-label={`Редактировать ${product}`} onClick={() => openEditModal(idx)} type="button">
                        <Pencil size={16} />
                      </button>
                      <button className="icon-button danger" aria-label={`Удалить ${product}`} onClick={() => handleDelete(idx)} type="button">
                        <Trash2 size={16} />
                      </button>
                    </span>
                  </div>
                ))}
              </>
            )}

            {tab === "Стримы" && (
              <>
                <div className="directory-row directory-head">
                  <span>Название стрима</span>
                  <span>Действия</span>
                </div>
                {streamList.map((stream, idx) => (
                  <div className="directory-row" key={stream}>
                    <strong>{stream}</strong>
                    <span className="action-icons">
                      <button className="icon-button" aria-label={`Редактировать ${stream}`} onClick={() => openEditModal(idx)} type="button">
                        <Pencil size={16} />
                      </button>
                      <button className="icon-button danger" aria-label={`Удалить ${stream}`} onClick={() => handleDelete(idx)} type="button">
                        <Trash2 size={16} />
                      </button>
                    </span>
                  </div>
                ))}
              </>
            )}

            {tab === "Статусы" && (
              <>
                <div className="directory-row directory-head">
                  <span>Название</span>
                  <span>Цвет</span>
                  <span>Используется для прогресса</span>
                  <span>Действия</span>
                </div>
                {statusList.map((status, idx) => (
                  <div className="directory-row" key={status.name}>
                    <strong>{status.name}</strong>
                    <span className="color-swatch" style={{ "--swatch": status.color } as CSSProperties}>
                      <i />
                      {status.color}
                    </span>
                    <span
                      className={`toggle ${status.progress ? "on" : ""}`}
                      onClick={() => {
                        setStatusList(statusList.map((s, i) => i === idx ? { ...s, progress: !s.progress } : s));
                        onToast("Признак прогресса обновлен");
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <b />
                      {status.progress ? "Учитывать в прогрессе" : "Не учитывать"}
                    </span>
                    <span className="action-icons">
                      <button className="icon-button" aria-label={`Редактировать ${status.name}`} onClick={() => openEditModal(idx)} type="button">
                        <Pencil size={16} />
                      </button>
                      <button className="icon-button danger" aria-label={`Удалить ${status.name}`} onClick={() => handleDelete(idx)} type="button">
                        <Trash2 size={16} />
                      </button>
                    </span>
                  </div>
                ))}
              </>
            )}

            {tab === "Типы задач" && (
              <>
                <div className="directory-row directory-head">
                  <span>Название</span>
                  <span>Цвет</span>
                  <span>Действия</span>
                </div>
                {taskTypeList.map((type, idx) => (
                  <div className="directory-row" key={type.name}>
                    <strong>{type.name}</strong>
                    <span className="color-swatch" style={{ "--swatch": type.color } as CSSProperties}>
                      <i />
                      {type.color}
                    </span>
                    <span className="action-icons">
                      <button className="icon-button" aria-label={`Редактировать ${type.name}`} onClick={() => openEditModal(idx)} type="button">
                        <Pencil size={16} />
                      </button>
                      <button className="icon-button danger" aria-label={`Удалить ${type.name}`} onClick={() => handleDelete(idx)} type="button">
                        <Trash2 size={16} />
                      </button>
                    </span>
                  </div>
                ))}
              </>
            )}

            {tab === "Исполнители" && (
              <>
                <div className="directory-row directory-head">
                  <span>Исполнитель</span>
                  <span>Роль</span>
                  <span>Активен</span>
                  <span>Действия</span>
                </div>
                {performerList.map((performer, idx) => (
                  <div className="directory-row" key={performer.name}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div className="avatar" style={{ width: "28px", height: "28px", fontSize: "0.85rem" }}>{performer.initials}</div>
                      <strong>{performer.name}</strong>
                    </span>
                    <span>{performer.role}</span>
                    <span
                      className={`toggle ${performer.active ? "on" : ""}`}
                      onClick={() => {
                        setPerformerList(performerList.map((p, i) => i === idx ? { ...p, active: !p.active } : p));
                        onToast("Статус активности обновлен");
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <b />
                      {performer.active ? "Активен" : "Неактивен"}
                    </span>
                    <span className="action-icons">
                      <button className="icon-button" aria-label={`Редактировать ${performer.name}`} onClick={() => openEditModal(idx)} type="button">
                        <Pencil size={16} />
                      </button>
                      <button className="icon-button danger" aria-label={`Удалить ${performer.name}`} onClick={() => handleDelete(idx)} type="button">
                        <Trash2 size={16} />
                      </button>
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </section>

        <section className="directory-side-card">
          <div className="table-title-row">
            <h2>Исполнители команды</h2>
          </div>
          {performerList.map((performer) => (
            <div className="performer-row" key={performer.name}>
              <div className="avatar">{performer.initials}</div>
              <div>
                <strong>{performer.name}</strong>
                <span>{performer.role}</span>
              </div>
              <em className={performer.active ? "active" : ""}>{performer.active ? "Активен" : "Неактивен"}</em>
            </div>
          ))}
        </section>
      </div>

      {modalOpen && (
        <Modal
          ariaLabel={`${editMode === "create" ? "Добавить" : "Редактировать"} элемент`}
          onClose={() => setModalOpen(false)}
          title={`${editMode === "create" ? "Добавить" : "Редактировать"} элемент`}
        >
          <form className="form-stack" onSubmit={handleSave}>
            <label>
              <span>Название / Имя</span>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} required placeholder="Введите значение..." />
            </label>

            {(tab === "Статусы" || tab === "Типы задач") && (
              <label>
                <span>Цвет (HEX)</span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} style={{ padding: 0, width: "40px", height: "38px", border: "1px solid #D1D5DB", borderRadius: "0.375rem", cursor: "pointer" }} />
                  <input type="text" value={formColor} onChange={(e) => setFormColor(e.target.value)} required placeholder="#HEX" style={{ flex: 1 }} />
                </div>
              </label>
            )}

            {tab === "Статусы" && (
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexDirection: "row", cursor: "pointer", marginTop: "0.5rem" }}>
                <input type="checkbox" checked={formProgress} onChange={(e) => setFormProgress(e.target.checked)} style={{ width: "auto" }} />
                <span>Использовать для расчета прогресса эпика</span>
              </label>
            )}

            {tab === "Исполнители" && (
              <>
                <label>
                  <span>Роль</span>
                  <input value={formRole} onChange={(e) => setFormRole(e.target.value)} required placeholder="Например: Frontend Developer" />
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexDirection: "row", cursor: "pointer", marginTop: "0.5rem" }}>
                  <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} style={{ width: "auto" }} />
                  <span>Активный участник команды</span>
                </label>
              </>
            )}

            <div className="panel-actions">
              <button className="secondary-button" onClick={() => setModalOpen(false)} type="button">
                Отмена
              </button>
              <button className="primary-button" type="submit">
                Сохранить
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

function StatusChip({ label, status }: { label?: string; status: StatusName }) {
  return (
    <span aria-label={label} className={`chip ${statusTone[status]}`}>
      {status}
    </span>
  );
}

function StatusSelect({
  ariaLabel,
  onChange,
  value,
  statusesList,
  name,
}: {
  ariaLabel: string;
  onChange: (status: StatusName) => void;
  value: StatusName;
  statusesList: DirectoryStatus[];
  name?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`status-select-container ${isOpen ? "active-dropdown" : ""}`}
      style={{ position: "relative", display: "inline-block", justifySelf: "center" }}
    >
      <button
        type="button"
        className={`pill-select status-select ${statusTone[value]}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: "pointer", border: 0 }}
      >
        {value}
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="custom-select-dropdown"
        >
          {statusesList.map((status) => {
            const isSelected = status.name === value;
            return (
              <li
                key={status.name}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(status.name);
                  setIsOpen(false);
                }}
                className={`custom-select-option ${isSelected ? "selected" : ""}`}
              >
                {status.name}
              </li>
            );
          })}
        </ul>
      )}

      <select
        name={name}
        aria-label={ariaLabel}
        className={`pill-select status-select ${statusTone[value]}`}
        value={value}
        onChange={(event) => onChange(event.target.value as StatusName)}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
        }}
      >
        {statusesList.map((status) => (
          <option key={status.name} value={status.name}>
            {status.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function PillSelect({
  ariaLabel,
  onChange,
  options,
  tone,
  value,
  wide = false,
  name,
  labelPrefix,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  options: string[];
  tone?: string;
  value: string;
  wide?: boolean;
  name?: string;
  labelPrefix?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`pill-select-container ${isOpen ? "active-dropdown" : ""}`}
      style={{ position: "relative", display: "inline-block", justifySelf: "center" }}
    >
      <button
        type="button"
        className={`pill-select ${tone ?? "neutral"} ${wide ? "wide" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: "pointer", border: 0 }}
      >
        {labelPrefix ? (
          <>
            <span className="pill-select-label">{labelPrefix}</span>
            <span className="pill-select-value">{value}</span>
          </>
        ) : (
          value
        )}
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="custom-select-dropdown"
        >
          {options.map((opt) => {
            const isSelected = opt === value;
            return (
              <li
                key={opt}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`custom-select-option ${isSelected ? "selected" : ""}`}
              >
                {opt}
              </li>
            );
          })}
        </ul>
      )}

      <select
        name={name}
        aria-label={ariaLabel}
        className={`pill-select ${tone ?? "neutral"} ${wide ? "wide" : ""}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function TypeChip({ type }: { type: TaskTypeName }) {
  return <span className={`chip soft ${typeTone[type]}`}>{type}</span>;
}

function Tag({ children }: { children: string }) {
  return <span className="tag">{children}</span>;
}

function AvatarStack({ names }: { names: string[] }) {
  return (
    <div className="avatar-stack">
      {names.slice(0, 3).map((name) => (
        <div className="avatar small" key={name}>
          {name[0]}
        </div>
      ))}
    </div>
  );
}

function PerformerCell({ name }: { name?: string }) {
  return (
    <span className="performer-cell">
      <UserRound size={15} />
      {name ?? "Не выбран"}
    </span>
  );
}

function CreateSprintDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal ariaLabel="Создать спринт" onClose={onClose} title="Создать спринт">
      <form className="form-stack" onSubmit={onSubmit}>
        <label>
          <span>Название спринта</span>
          <input name="title" placeholder="Например: Спринт 6" required />
        </label>
        <div className="form-grid">
          <label>
            <span>Дата начала</span>
            <input name="startDate" type="date" required />
          </label>
          <label>
            <span>Дата окончания</span>
            <input name="endDate" type="date" required />
          </label>
        </div>
        <label>
          <span>Комментарий</span>
          <textarea
            name="comment"
            placeholder="Цели и комментарии к спринту..."
            rows={3}
            style={{
              width: "100%",
              padding: "0.375rem 0.75rem",
              borderRadius: "0.375rem",
              border: "1px solid #D1D5DB",
            }}
          />
        </label>
        <div className="panel-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            Отмена
          </button>
          <button className="primary-button" type="submit">
            Создать
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TaskContextMenu({
  x,
  y,
  onClose,
  onEdit,
  onDelete,
}: {
  x: number;
  y: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <button className="context-menu-item" onClick={onEdit} type="button">
        Редактировать
      </button>
      <button className="context-menu-item delete" onClick={onDelete} type="button">
        Удалить
      </button>
    </div>
  );
}

function EditTaskDialog({
  epicId,
  task,
  onClose,
  onSubmit,
  taskTypeList,
  productList,
  streamList,
  statusList,
  performerList,
}: {
  epicId: string;
  task: SprintTask;
  onClose: () => void;
  onSubmit: (updatedTask: SprintTask) => void;
  taskTypeList: DirectoryTaskType[];
  productList: string[];
  streamList: string[];
  statusList: DirectoryStatus[];
  performerList: Performer[];
}) {
  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<StatusName>(task.status);
  const [product, setProduct] = useState(task.product);
  const [stream, setStream] = useState(task.stream);
  const [taskType, setTaskType] = useState<TaskTypeName>(task.taskType);
  const [owner, setOwner] = useState(task.owner ?? task.performers[0] ?? "");
  const [comment, setComment] = useState(task.comment ?? "");
  const [result, setResult] = useState(task.result ?? "");

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({
      ...task,
      title: title.trim(),
      status,
      product,
      stream,
      taskType,
      owner: owner === "Не выбран" || !owner ? undefined : owner,
      performers: owner && owner !== "Не выбран" ? [owner] : [],
      comment: comment.trim(),
      result: result.trim(),
    });
  };

  return (
    <Modal ariaLabel={`Редактировать задачу: ${task.title}`} onClose={onClose} title="Редактировать задачу">
      <form className="form-stack" onSubmit={handleFormSubmit}>
        <label>
          <span>Название задачи</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Название задачи"
          />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Статус</span>
            <StatusSelect
              ariaLabel="Статус"
              onChange={(val) => setStatus(val)}
              statusesList={statusList}
              value={status}
            />
          </label>
          <label className="field">
            <span>Тип задачи</span>
            <PillSelect
              ariaLabel="Тип задачи"
              onChange={(val) => setTaskType(val as TaskTypeName)}
              options={taskTypeList.map((type) => type.name)}
              value={taskType}
              wide
            />
          </label>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Продукт</span>
            <PillSelect
              ariaLabel="Продукт"
              onChange={(val) => setProduct(val)}
              options={productList}
              value={product}
              wide
            />
          </label>
          <label className="field">
            <span>Стрим</span>
            <PillSelect
              ariaLabel="Стрим"
              onChange={(val) => setStream(val)}
              options={streamList}
              value={stream}
              wide
            />
          </label>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Исполнитель</span>
            <PillSelect
              ariaLabel="Исполнитель"
              onChange={(val) => setOwner(val === "Не выбран" ? "" : val)}
              options={["Не выбран", ...performerList.map((p) => p.name)]}
              value={owner || "Не выбран"}
              wide
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span>Результат</span>
            <input
              type="text"
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="🎯 Результат задачи..."
            />
          </label>
          <label>
            <span>Комментарий</span>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="💬 Комментарий к задаче..."
            />
          </label>
        </div>
        <div className="panel-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            Отмена
          </button>
          <button className="primary-button" type="submit">
            Сохранить
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default App;
