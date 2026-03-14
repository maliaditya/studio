import { normalizeDateKey, normalizeText, safeString, unique } from "@/lib/shiv/normalize";
import { buildAliasLookupForName, getStaticTaskAliasMap, mergeTaskAliasMaps } from "@/lib/shiv/taskAliases";
import type { Domain, ShivEntity, ShivIndex } from "@/lib/shiv/types";

type AnyRecord = Record<string, unknown>;

const domainList: Domain[] = ["task", "routine", "bothering", "resource", "skill", "health", "canvas", "journal"];

const asArray = <T = AnyRecord>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const asObject = (value: unknown): AnyRecord => (value && typeof value === "object" ? (value as AnyRecord) : {});

const isLikelyMetadataKey = (key: string) => {
  const normalized = normalizeText(key).replace(/\s+/g, "");
  if (!normalized) return false;
  return (
    normalized === "id" ||
    normalized === "eid" ||
    normalized === "source" ||
    normalized === "domain" ||
    normalized === "payload" ||
    normalized === "parentid" ||
    normalized === "parentresourceid" ||
    normalized === "parentresourcename" ||
    normalized === "folderid" ||
    normalized === "createdat" ||
    normalized === "updatedat" ||
    normalized === "timestamp" ||
    normalized === "order" ||
    normalized === "index"
  );
};

const isLikelyNoiseText = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (/^(res|folder|habit|hack|project|skill)_\d{6,}/i.test(trimmed)) return true;
  if (/^[a-f0-9]{16,}$/i.test(trimmed)) return true;
  return false;
};

const collectTextDeep = (value: unknown, depth = 0): string[] => {
  if (depth > 4) return [];
  if (value === null || value === undefined) return [];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const text = safeString(value).trim();
    return text ? [text] : [];
  }
  if (Array.isArray(value)) return value.flatMap((item) => collectTextDeep(item, depth + 1));
  if (typeof value === "object") {
    return Object.values(value as AnyRecord).flatMap((item) => collectTextDeep(item, depth + 1));
  }
  return [];
};

const collectUserFacingTextDeep = (value: unknown, depth = 0): string[] => {
  if (depth > 4) return [];
  if (value === null || value === undefined) return [];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const text = safeString(value).trim();
    if (!text || isLikelyNoiseText(text)) return [];
    return [text];
  }
  if (Array.isArray(value)) return value.flatMap((item) => collectUserFacingTextDeep(item, depth + 1));
  if (typeof value === "object") {
    return Object.entries(value as AnyRecord).flatMap(([key, item]) =>
      isLikelyMetadataKey(key) ? [] : collectUserFacingTextDeep(item, depth + 1)
    );
  }
  return [];
};

const buildEntity = (
  domain: Domain,
  id: string,
  name: string,
  text: string,
  aliases: string[],
  payload: AnyRecord
): ShivEntity => ({
  id,
  domain,
  name: safeString(name).trim() || "Untitled",
  text: safeString(text).trim() || safeString(name).trim() || "",
  aliases: unique(aliases.map((a) => safeString(a).trim().toLowerCase())),
  payload,
});

export const buildShivIndex = (appContext: AnyRecord): ShivIndex => {
  const entities: ShivEntity[] = [];
  const today = (appContext.today || {}) as AnyRecord;
  const routines = (appContext.routines || {}) as AnyRecord;
  const botherings = (appContext.botherings || {}) as AnyRecord;
  const data = (appContext.data || {}) as AnyRecord;
  const mindset = (appContext.mindsetTaskLinks || {}) as AnyRecord;
  const journal = (appContext.journal || {}) as AnyRecord;
  const settings = (appContext.settings || {}) as AnyRecord;
  const meta = (appContext.meta || {}) as AnyRecord;
  const mergedTaskAliases = mergeTaskAliasMaps(
    getStaticTaskAliasMap(),
    (settings.shivDynamicTaskAliases || {}) as Record<string, unknown>
  );
  const addTaskAliases = (name: string): string[] => buildAliasLookupForName(name, mergedTaskAliases);

  const todayTasks = asArray<AnyRecord>(today.tasks);
  todayTasks.forEach((task, index) => {
    const name = safeString(task.details);
    entities.push(
      buildEntity(
        "task",
        safeString(task.id) || `task-${index}`,
        name,
        `${name} ${safeString(task.slot)} ${safeString(task.type)} ${task.completed ? "completed" : "pending"}`,
        addTaskAliases(name),
        {
          ...task,
          source: "today.tasks",
        }
      )
    );
  });

  const routinesUpcoming = asArray<AnyRecord>(routines.upcoming);
  routinesUpcoming.forEach((routine, index) => {
    const name = safeString(routine.details);
    entities.push(
      buildEntity(
        "routine",
        safeString(routine.id) || `routine-upcoming-${index}`,
        name,
        `${name} ${safeString(routine.slot)} ${safeString(routine.recurrence)} ${safeString(routine.nextDate)} ${safeString(routine.nextInRelative)}`,
        addTaskAliases(name),
        {
          ...routine,
          source: "routines.upcoming",
        }
      )
    );
  });

  const routinesDueToday = asArray<AnyRecord>(routines.dueToday);
  routinesDueToday.forEach((routine, index) => {
    const name = safeString(routine.details);
    entities.push(
      buildEntity(
        "routine",
        safeString(routine.id) || `routine-due-${index}`,
        name,
        `${name} ${safeString(routine.slot)} due today`,
        addTaskAliases(name),
        {
          ...routine,
          source: "routines.dueToday",
        }
      )
    );
  });

  const routineDefs = asArray<AnyRecord>(settings.routines);
  routineDefs.forEach((routine, index) => {
    const name = safeString(routine.details);
    entities.push(
      buildEntity(
        "routine",
        safeString(routine.id) || `routine-def-${index}`,
        name,
        `${name} ${safeString(routine.slot)} ${safeString((routine.routine as AnyRecord)?.type)}`,
        addTaskAliases(name),
        {
          ...routine,
          source: "settings.routines",
        }
      )
    );
  });

  const botheringBySource = (botherings.bySource || {}) as AnyRecord;
  (["external", "mismatch", "constraint"] as const).forEach((sourceKey) => {
    const points = asArray<AnyRecord>(botheringBySource[sourceKey]);
    points.forEach((item, index) => {
      const name = safeString(item.text) || `Bothering ${sourceKey} ${index + 1}`;
      const linkedTasks = asArray<AnyRecord>(item.linkedTasks)
        .map((task) => safeString(task.details))
        .filter(Boolean)
        .join(" ");
      entities.push(
        buildEntity(
          "bothering",
          safeString(item.id) || `bothering-${sourceKey}-${index}`,
          name,
          `${name} ${sourceKey} ${linkedTasks}`,
          [name, sourceKey],
          {
            ...item,
            source: sourceKey,
          }
        )
      );
    });
  });

  const mindsetUpcoming = asArray<AnyRecord>(mindset.upcoming);
  mindsetUpcoming.forEach((task, index) => {
    const name = safeString(task.details);
    entities.push(
      buildEntity(
        "task",
        safeString(task.taskId) || safeString(task.id) || `mindset-task-${index}`,
        name,
        `${name} ${safeString(task.slotName)} ${safeString(task.source)} ${safeString(task.nextDate)}`,
        addTaskAliases(name),
        {
          ...task,
          source: "mindsetTaskLinks.upcoming",
        }
      )
    );
  });

  const resourceFolders = asArray<AnyRecord>(data.resourceFolders);
  const folderMap = new Map<string, string>();
  resourceFolders.forEach((folder) => {
    const folderId = safeString(folder.id);
    const folderName = safeString(folder.name);
    if (folderId && folderName) folderMap.set(folderId, folderName);
  });

  const resources = asArray<AnyRecord>(data.resources);
  resources.forEach((resource, index) => {
    const name = safeString(resource.name);
    const folderName = folderMap.get(safeString(resource.folderId)) || "";
    const resourceType = safeString(resource.type);
    const points = asArray<AnyRecord>(resource.points);
    const pointPayloads = points
      .map((point) => {
        const text = safeString(point.text || point.displayText || point.title);
        const url = safeString(point.url || point.link);
        const type = safeString(point.type || (url ? "link" : "text"));
        return {
          type,
          text,
          url,
        };
      })
      .filter((point) => point.text || point.url);
    const pointsText = pointPayloads
      .flatMap((point) => collectUserFacingTextDeep(point))
      .slice(0, 120)
      .join(" ");
    const richText = collectUserFacingTextDeep({
      description: resource.description,
      link: resource.link,
      githubLink: resource.githubLink,
      demoLink: resource.demoLink,
      trigger: resource.trigger,
      response: resource.response,
      reward: resource.reward,
      newResponse: resource.newResponse,
      urges: resource.urges,
      resistances: resource.resistances,
      strengths: resource.strengths,
      mechanismFramework: resource.mechanismFramework,
      benefit: resource.benefit,
      law: resource.law,
      modelUrl: resource.modelUrl,
      formalization: resource.formalization,
    })
      .slice(0, 180)
      .join(" ");

    entities.push(
      buildEntity(
        "resource",
        safeString(resource.id) || `resource-${index}`,
        name,
        `${name} ${resourceType} ${folderName} ${pointsText} ${richText}`,
        unique([name, resourceType, folderName, safeString(resource.icon)].filter(Boolean)),
        {
          id: safeString(resource.id),
          name,
          type: resourceType,
          folderName,
          description: safeString(resource.description),
          link: safeString(resource.link),
          githubLink: safeString(resource.githubLink),
          demoLink: safeString(resource.demoLink),
          points: pointPayloads.slice(0, 24),
          source: "data.resources",
        }
      )
    );

    points.slice(0, 120).forEach((point, pointIdx) => {
      const pointText = safeString(point.text || point.displayText || point.url || point.link);
      if (!pointText) return;
      const pointUrl = safeString(point.url || point.link);
      const pointType = safeString(point.type || (pointUrl ? "link" : "text"));
      entities.push(
        buildEntity(
          "resource",
          `${safeString(resource.id) || `resource-${index}`}:point:${pointIdx}`,
          `${name}: ${pointText.slice(0, 72)}`,
          `${pointText} ${pointType} ${pointUrl}`,
          [name, pointType, pointText, folderName],
          {
            text: pointText,
            type: pointType,
            url: pointUrl,
            parentResourceId: safeString(resource.id),
            parentResourceName: name,
            source: "data.resources.points",
          }
        )
      );
    });
  });

  resourceFolders.forEach((folder, index) => {
    const name = safeString(folder.name) || `Folder ${index + 1}`;
    entities.push(
      buildEntity(
        "resource",
        safeString(folder.id) || `resource-folder-${index}`,
        name,
        `${name} folder`,
        [name, "folder"],
        {
          ...folder,
          source: "data.resourceFolders",
        }
      )
    );
  });

  const habitCards = asArray<AnyRecord>(data.habitCards);
  habitCards.slice(0, 200).forEach((habit, index) => {
    const name = safeString(habit.name) || `Habit ${index + 1}`;
    const text = collectUserFacingTextDeep(habit).slice(0, 180).join(" ");
    entities.push(
      buildEntity(
        "resource",
        safeString(habit.id) || `habit-card-${index}`,
        name,
        `${name} habit card ${text}`,
        [name, "habit", "resource card"],
        {
          ...habit,
          source: "data.habitCards",
        }
      )
    );
  });

  const brainHacks = asArray<AnyRecord>(data.brainHacks);
  brainHacks.slice(0, 200).forEach((hack, index) => {
    const name = safeString(hack.title || hack.name || hack.text) || `Brain Hack ${index + 1}`;
    const text = collectUserFacingTextDeep(hack).slice(0, 160).join(" ");
    entities.push(
      buildEntity(
        "resource",
        safeString(hack.id) || `brain-hack-${index}`,
        name,
        `${name} brain hack ${text}`,
        [name, "brain hack", "resource card"],
        {
          ...hack,
          source: "data.brainHacks",
        }
      )
    );
  });

  const projects = asArray<AnyRecord>(data.projects);
  projects.forEach((project, index) => {
    const name = safeString(project.name) || `Project ${index + 1}`;
    entities.push(
      buildEntity(
        "skill",
        safeString(project.id) || `project-${index}`,
        name,
        `${name} ${safeString(project.description)}`,
        [name, "project"],
        {
          ...project,
          source: "data.projects",
        }
      )
    );
  });

  const coreSkills = asArray<AnyRecord>(data.coreSkills);
  coreSkills.forEach((skill, index) => {
    const name = safeString(skill.name) || `Skill ${index + 1}`;
    entities.push(
      buildEntity(
        "skill",
        safeString(skill.id) || `core-skill-${index}`,
        name,
        `${name} ${safeString(skill.type)}`,
        [name, "skill", safeString(skill.type)],
        {
          ...skill,
          source: "data.coreSkills",
        }
      )
    );
  });

  const logsSummary = (data.logsSummary || {}) as AnyRecord;
  if (Object.keys(logsSummary).length > 0) {
    entities.push(
      buildEntity(
        "skill",
        "logs-summary",
        "Logs Summary",
        Object.entries(logsSummary)
          .map(([k, v]) => `${k} ${safeString(v)}`)
          .join(" "),
        ["logs", "summary", "skills"],
        {
          ...logsSummary,
          source: "data.logsSummary",
        }
      )
    );
  }

  const health = (data.health || {}) as AnyRecord;
  const latestWeightLog = (health.latestWeightLog || {}) as AnyRecord;
  if (Object.keys(latestWeightLog).length > 0) {
    entities.push(
      buildEntity(
        "health",
        "health-latest-weight",
        "Current Weight",
        `${safeString(latestWeightLog.weight)} ${safeString(latestWeightLog.date)} weight`,
        ["current weight", "latest weight", "weight"],
        {
          latestWeightLog,
          goalWeight: health.goalWeight,
          source: "data.health.latestWeightLog",
        }
      )
    );
  }

  const canvasLayout = (data.canvasLayout || {}) as AnyRecord;
  const canvasNodes = asArray<AnyRecord>(canvasLayout.nodes);
  canvasNodes.slice(0, 200).forEach((node, index) => {
    const nodeData = asObject(node.data);
    const name =
      safeString(nodeData.label || nodeData.text || nodeData.name || nodeData.title || node.id) ||
      `Canvas Node ${index + 1}`;
    const nodeText = collectTextDeep(nodeData).slice(0, 100).join(" ");
    entities.push(
      buildEntity(
        "canvas",
        safeString(node.id) || `canvas-node-${index}`,
        name,
        `${name} canvas ${nodeText} ${safeString(node.type)}`,
        [name, "canvas", safeString(node.type)],
        {
          ...node,
          source: "data.canvasLayout.nodes",
        }
      )
    );
  });

  const canvasEdges = asArray<AnyRecord>(canvasLayout.edges);
  canvasEdges.slice(0, 250).forEach((edge, index) => {
    const name = safeString(edge.label) || `Canvas Edge ${index + 1}`;
    entities.push(
      buildEntity(
        "canvas",
        safeString(edge.id) || `canvas-edge-${index}`,
        name,
        `${name} ${safeString(edge.source)} ${safeString(edge.target)} ${safeString(edge.fromSide)} ${safeString(edge.toSide)} canvas edge`,
        [name, "canvas edge", safeString(edge.source), safeString(edge.target)],
        {
          ...edge,
          source: "data.canvasLayout.edges",
        }
      )
    );
  });

  const recentJournalSessions = asArray<AnyRecord>(journal.recentSessions);
  recentJournalSessions.slice(0, 20).forEach((entry, index) => {
    const name = safeString(entry.date) || `Journal ${index + 1}`;
    const text = [
      safeString(entry.date),
      safeString(entry.status),
      safeString(entry.note),
      safeString((entry.topCauses || []).join(" ")),
      safeString(entry.unresolvedBotherings),
      safeString(entry.moodRating),
      safeString(entry.energyRating),
      safeString(entry.stressRating),
      "journal",
    ]
      .filter(Boolean)
      .join(" ");
    entities.push(
      buildEntity(
        "journal",
        `journal-session-${safeString(entry.date) || index}`,
        `Journal ${safeString(entry.date) || index + 1}`,
        text,
        [safeString(entry.date), "journal", "daily journal", ...(asArray<string>(entry.topCauses) || [])],
        {
          ...entry,
          source: "journal.recentSessions",
        }
      )
    );
  });

  const journalPatterns = asArray<AnyRecord>(journal.patterns);
  journalPatterns.slice(0, 20).forEach((entry, index) => {
    const cause = safeString(entry.cause) || `pattern-${index + 1}`;
    const count = safeString(entry.count);
    entities.push(
      buildEntity(
        "journal",
        `journal-pattern-${cause || index}`,
        `Journal pattern: ${cause}`,
        `${cause} ${count} journal pattern`,
        [cause, "journal pattern", "journal"],
        {
          ...entry,
          source: "journal.patterns",
        }
      )
    );
  });

  const byDomain = {
    task: [] as ShivEntity[],
    routine: [] as ShivEntity[],
    bothering: [] as ShivEntity[],
    resource: [] as ShivEntity[],
    skill: [] as ShivEntity[],
    health: [] as ShivEntity[],
    canvas: [] as ShivEntity[],
    journal: [] as ShivEntity[],
  };

  for (const entity of entities) {
    byDomain[entity.domain].push(entity);
  }

  for (const domain of domainList) {
    byDomain[domain] = byDomain[domain].filter((entity, idx, arr) => {
      const first = arr.findIndex((item) => item.id === entity.id && normalizeText(item.name) === normalizeText(entity.name));
      return first === idx;
    });
  }

  return {
    entities,
    byDomain,
    meta: {
      todayKey: normalizeDateKey(meta.todayKey) || new Date().toISOString().slice(0, 10),
      currentSlot: safeString(meta.currentSlot),
      contextScopes: ((appContext.contextScopes || {}) as Record<string, boolean>) || {},
    },
  };
};
