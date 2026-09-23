// Jednorazowa weryfikacja logiki storage bez przeglądarki (uruchamiam i kasuję).
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
};

const {
  normalizePlannerTasks,
  loadStoredData,
  saveStoredData,
  serializeBackup,
  importStoredData,
} = await import("../src/utils/storage.ts");

let failures = 0;
const check = (name: string, cond: boolean) => {
  console.log((cond ? "OK  " : "FAIL") + " " + name);
  if (!cond) failures++;
};

// 1. Sanityzator odrzuca śmieci, przepuszcza poprawne zadania z payloadem
const tasks = normalizePlannerTasks([
  null,
  "string",
  { id: "x" }, // brak title
  {
    id: "t1",
    title: "Rolka",
    time: "12:00",
    date: "2026-09-01",
    completed: false,
    targetTab: 1,
    format: "Rolka",
    payload: { reel: { hook: "H", phrases: ["a", 42, "b"], duration: 9, hashtags: ["#x"] } },
  },
  { id: "t2", title: "X", date: "złe", targetTab: 99, completed: "tak", category: "???", payload: { reel: { hook: 7 } } },
]);
check("filtruje śmieci (3->2? nie, t2 przechodzi bez payloadu)", tasks.length === 2);
check("payload reel zachowany", tasks[0].payload?.reel?.hook === "H");
check("phrases tylko stringi", JSON.stringify(tasks[0].payload?.reel?.phrases) === '["a","b"]');
check("zła data -> ''", tasks[1].date === "");
check("zły targetTab -> undefined", tasks[1].targetTab === undefined);
check("completed nie-true -> false", tasks[1].completed === false);
check("śmieciowy payload odpada", tasks[1].payload === undefined);
check("kategoria spoza listy -> inne", tasks[1].category === "inne");

// 2. Zadania przeżywają cykl zapis/odczyt localStorage
const base = loadStoredData();
check("pusty start ma planner_tasks []", Array.isArray(base.planner_tasks) && base.planner_tasks.length === 0);
check("martwe pola zniknęły z typu/shape", !("account_stats" in base) && !("daily_logs" in base) && !("used_assets" in base) && !("carousel_packages" in base) && !("best_streak" in base) && !("monetization_goal" in base));
saveStoredData({ ...base, planner_tasks: tasks });
const reloaded = loadStoredData();
check("zadania przeżywają reload", reloaded.planner_tasks?.length === 2);
check("payload po reload dalej OK", reloaded.planner_tasks?.[0]?.payload?.reel?.duration === 9);

// 3. Import: walidacja przed nadpisaniem
check("odrzuca nie-JSON", !importStoredData("nie json").ok);
check("odrzuca tablicę", !importStoredData("[1,2,3]").ok);
check("odrzuca obcy JSON", !importStoredData('{"nauka":"fizyka"}').ok);
const foreign = {
  posts: [],
  xp: 3,
  planner_tasks: [
    {
      id: "a",
      title: "T",
      completed: false,
      date: "2026-01-01",
      time: "12:00",
      category: "post",
      payload: { post: { text: "abc" } },
    },
  ],
};
const res = importStoredData(JSON.stringify(foreign));
check("przyjmuje poprawną kopię", res.ok === true);
const afterImport = loadStoredData();
check("import wchodzi do stanu", afterImport.planner_tasks?.[0]?.payload?.post?.text === "abc");
check("snapshot przed importem zapisany", localStorage.getItem("stark_focus_pre_import_backup") !== null);

// 4. Serializator eksportu = ten sam kształt co zapis
check("serializeBackup parsuje się z powrotem", JSON.parse(serializeBackup(base)).xp !== undefined);

console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
