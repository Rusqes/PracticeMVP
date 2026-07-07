import express from "express";
import cors from "cors";
import pg from "pg";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const pool = new pg.Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "postgres2026",
  database: "postgres",
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        name TEXT PRIMARY KEY
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS streams (
        name TEXT PRIMARY KEY
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS statuses (
        name TEXT PRIMARY KEY,
        color TEXT NOT NULL,
        progress BOOLEAN NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS task_types (
        name TEXT PRIMARY KEY,
        color TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS performers (
        name TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        active BOOLEAN NOT NULL,
        initials TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS epics (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        product TEXT NOT NULL,
        stream TEXT NOT NULL,
        task_type TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sprints (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        comment TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sprint_tasks (
        id TEXT PRIMARY KEY,
        epic_id TEXT REFERENCES epics(id) ON DELETE CASCADE,
        sprint_id TEXT REFERENCES sprints(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        task_type TEXT NOT NULL,
        product TEXT NOT NULL,
        stream TEXT NOT NULL,
        owner TEXT,
        planned_date TEXT NOT NULL,
        actual_date TEXT,
        result TEXT NOT NULL,
        comment TEXT,
        deviation TEXT
      )
    `);

    // Check if empty and seed
    const prodCheck = await client.query("SELECT COUNT(*) FROM products");
    if (parseInt(prodCheck.rows[0].count, 10) === 0) {
      console.log("Database is empty. Seeding initial data...");

      // Seed products & streams
      const initialProducts = ["Проект 1", "Сайт"];
      for (const prod of initialProducts) {
        await client.query("INSERT INTO products (name) VALUES ($1)", [prod]);
      }

      const initialStreams = ["Продуктовый", "Инженерный", "Смешанный"];
      for (const stream of initialStreams) {
        await client.query("INSERT INTO streams (name) VALUES ($1)", [stream]);
      }

      // Seed statuses
      const initialStatuses = [
        { name: "Новая", color: "#6B7280", progress: false },
        { name: "Запланировано", color: "#2563EB", progress: false },
        { name: "В реализации", color: "#0F766E", progress: false },
        { name: "Выполнено", color: "#16A34A", progress: true },
        { name: "Отклонено", color: "#DC2626", progress: false },
        { name: "Заморожено", color: "#7C3AED", progress: false },
      ];
      for (const status of initialStatuses) {
        await client.query("INSERT INTO statuses (name, color, progress) VALUES ($1, $2, $3)", [
          status.name,
          status.color,
          status.progress,
        ]);
      }

      // Seed task types
      const initialTaskTypes = [
        { name: "Новый функционал", color: "#7C3AED" },
        { name: "Улучшение", color: "#CA8A04" },
        { name: "Инфраструктура", color: "#0F766E" },
        { name: "Исследование", color: "#2563EB" },
      ];
      for (const type of initialTaskTypes) {
        await client.query("INSERT INTO task_types (name, color) VALUES ($1, $2)", [type.name, type.color]);
      }

      // Seed performers
      const initialPerformers = [
        { name: "Вася", role: "Frontend", active: true, initials: "В" },
        { name: "Петя", role: "Backend", active: true, initials: "П" },
        { name: "Саша", role: "Product", active: true, initials: "С" },
        { name: "Марина", role: "QA", active: false, initials: "М" },
      ];
      for (const perf of initialPerformers) {
        await client.query("INSERT INTO performers (name, role, active, initials) VALUES ($1, $2, $3, $4)", [
          perf.name,
          perf.role,
          perf.active,
          perf.initials,
        ]);
      }

      // Seed epics
      await client.query(
        "INSERT INTO epics (id, title, status, product, stream, task_type) VALUES ($1, $2, $3, $4, $5, $6)",
        ["client-account", "Личный кабинет клиента", "В реализации", "Проект 1", "Продуктовый", "Новый функционал"]
      );

      // Seed sprints
      await client.query(
        "INSERT INTO sprints (id, title, start_date, end_date, comment) VALUES ($1, $2, $3, $4, $5)",
        ["sprint-1", "Спринт 1", "2026-06-25", "2026-07-08", "Первый спринт проекта"]
      );

      // Seed sprint tasks
      const initialTasks = [
        {
          id: "sso",
          epic_id: "client-account",
          sprint_id: null,
          title: "Добавить авторизацию через SSO",
          status: "Запланировано",
          task_type: "Новый функционал",
          product: "Проект 1",
          stream: "Продуктовый",
          owner: "Вася",
          planned_date: "2026-07-01",
          result: "Готов дизайн API",
        },
        {
          id: "profile-page",
          epic_id: "client-account",
          sprint_id: "sprint-1",
          title: "Сделать страницу профиля",
          status: "В реализации",
          task_type: "Новый функционал",
          product: "Проект 1",
          stream: "Продуктовый",
          owner: "Вася",
          planned_date: "2026-07-02",
          result: "Верстка в работе",
        },
        {
          id: "avatar",
          epic_id: "client-account",
          sprint_id: "sprint-1",
          title: "Загрузка аватара",
          status: "Выполнено",
          task_type: "Улучшение",
          product: "Проект 1",
          stream: "Продуктовый",
          owner: "Саша",
          planned_date: "2026-06-27",
          actual_date: "2026-06-27",
          result: "В релизе",
        },
        {
          id: "history",
          epic_id: "client-account",
          sprint_id: null,
          title: "История действий пользователя",
          status: "Выполнено",
          task_type: "Исследование",
          product: "Проект 1",
          stream: "Продуктовый",
          owner: "Петя",
          planned_date: "2026-06-27",
          actual_date: "2026-06-27",
          result: "Сбор логов завершен",
        },
      ];

      for (const t of initialTasks) {
        await client.query(
          "INSERT INTO sprint_tasks (id, epic_id, sprint_id, title, status, task_type, product, stream, owner, planned_date, actual_date, result, comment, deviation) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)",
          [
            t.id,
            t.epic_id,
            t.sprint_id,
            t.title,
            t.status,
            t.task_type,
            t.product,
            t.stream,
            t.owner,
            t.planned_date,
            t.actual_date || null,
            t.result,
            null,
            null,
          ]
        );
      }
    }

    await client.query("COMMIT");
    console.log("Database initialized successfully.");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error initializing database:", err);
  } finally {
    client.release();
  }
}

app.get("/api/data", async (req, res) => {
  try {
    const productsRes = await pool.query("SELECT name FROM products");
    const streamsRes = await pool.query("SELECT name FROM streams");
    const statusesRes = await pool.query("SELECT name, color, progress FROM statuses");
    const taskTypesRes = await pool.query("SELECT name, color FROM task_types");
    const performersRes = await pool.query("SELECT name, role, active, initials FROM performers");
    const epicsRes = await pool.query("SELECT id, title, status, product, stream, task_type FROM epics");
    const sprintsRes = await pool.query("SELECT id, title, start_date, end_date, comment FROM sprints");
    const tasksRes = await pool.query("SELECT * FROM sprint_tasks");

    const productList = productsRes.rows.map((r) => r.name);
    const streamList = streamsRes.rows.map((r) => r.name);
    const statusList = statusesRes.rows;
    const taskTypeList = taskTypesRes.rows;
    const performerList = performersRes.rows;

    const tasksByEpic: Record<string, any[]> = {};
    const tasksBySprint: Record<string, any[]> = {};

    for (const t of tasksRes.rows) {
      const task = {
        id: t.id,
        title: t.title,
        epicTitle: "",
        status: t.status,
        taskType: t.task_type,
        product: t.product,
        stream: t.stream,
        performers: [t.owner || ""],
        owner: t.owner || undefined,
        plannedDate: t.planned_date,
        actualDate: t.actual_date || undefined,
        deviation: t.deviation || undefined,
        comment: t.comment || undefined,
        result: t.result,
      };

      if (t.epic_id) {
        if (!tasksByEpic[t.epic_id]) tasksByEpic[t.epic_id] = [];
        tasksByEpic[t.epic_id].push(task);
      }
      if (t.sprint_id) {
        if (!tasksBySprint[t.sprint_id]) tasksBySprint[t.sprint_id] = [];
        tasksBySprint[t.sprint_id].push(task);
      }
    }

    const epicList = epicsRes.rows.map((e) => {
      const tasks = tasksByEpic[e.id] || [];
      tasks.forEach((t) => (t.epicTitle = e.title));
      const taskPerformers = new Set<string>();
      tasks.forEach((t) => {
        if (t.owner) taskPerformers.add(t.owner);
      });
      return {
        id: e.id,
        title: e.title,
        status: e.status,
        product: e.product,
        stream: e.stream,
        taskType: e.task_type,
        performers: Array.from(taskPerformers),
        tasks,
      };
    });

    const sprintList = sprintsRes.rows.map((s) => {
      const tasks = tasksBySprint[s.id] || [];
      tasks.forEach((t) => {
        const parentEpic = epicsRes.rows.find(
          (ep) => ep.id === tasksRes.rows.find((tr) => tr.id === t.id)?.epic_id
        );
        if (parentEpic) t.epicTitle = parentEpic.title;
      });
      return {
        id: s.id,
        title: s.title,
        startDate: s.start_date,
        endDate: s.end_date,
        comment: s.comment || undefined,
        tasks,
      };
    });

    res.json({
      productList,
      streamList,
      statusList,
      taskTypeList,
      performerList,
      epicList,
      sprintList,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/save", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { productList, streamList, statusList, taskTypeList, performerList, epicList, sprintList } = req.body;

    // 1. Products
    await client.query("DELETE FROM products");
    for (const prod of productList) {
      await client.query("INSERT INTO products (name) VALUES ($1)", [prod]);
    }

    // 2. Streams
    await client.query("DELETE FROM streams");
    for (const str of streamList) {
      await client.query("INSERT INTO streams (name) VALUES ($1)", [str]);
    }

    // 3. Statuses
    await client.query("DELETE FROM statuses");
    for (const status of statusList) {
      await client.query("INSERT INTO statuses (name, color, progress) VALUES ($1, $2, $3)", [
        status.name,
        status.color,
        status.progress,
      ]);
    }

    // 4. Task Types
    await client.query("DELETE FROM task_types");
    for (const type of taskTypeList) {
      await client.query("INSERT INTO task_types (name, color) VALUES ($1, $2)", [type.name, type.color]);
    }

    // 5. Performers
    await client.query("DELETE FROM performers");
    for (const perf of performerList) {
      await client.query("INSERT INTO performers (name, role, active, initials) VALUES ($1, $2, $3, $4)", [
        perf.name,
        perf.role,
        perf.active,
        perf.initials,
      ]);
    }

    // 6. Epics & Tasks
    await client.query("DELETE FROM sprint_tasks");
    await client.query("DELETE FROM epics");
    for (const epic of epicList) {
      await client.query(
        "INSERT INTO epics (id, title, status, product, stream, task_type) VALUES ($1, $2, $3, $4, $5, $6)",
        [epic.id, epic.title, epic.status, epic.product, epic.stream, epic.taskType]
      );

      for (const task of epic.tasks) {
        let sprintId: string | null = null;
        for (const sprint of sprintList) {
          if (sprint.tasks.some((t: any) => t.id === task.id)) {
            sprintId = sprint.id;
            break;
          }
        }

        await client.query(
          "INSERT INTO sprint_tasks (id, epic_id, sprint_id, title, status, task_type, product, stream, owner, planned_date, actual_date, result, comment, deviation) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)",
          [
            task.id,
            epic.id,
            sprintId,
            task.title,
            task.status,
            task.taskType,
            task.product,
            task.stream,
            task.owner || null,
            task.plannedDate,
            task.actualDate || null,
            task.result,
            task.comment || null,
            task.deviation || null,
          ]
        );
      }
    }

    // 7. Sprints
    await client.query("DELETE FROM sprints");
    for (const sprint of sprintList) {
      await client.query(
        "INSERT INTO sprints (id, title, start_date, end_date, comment) VALUES ($1, $2, $3, $4, $5)",
        [sprint.id, sprint.title, sprint.startDate, sprint.endDate, sprint.comment || null]
      );
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err: any) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.listen(port, async () => {
  console.log(`Backend server listening at http://localhost:${port}`);
  await initDB();
});
