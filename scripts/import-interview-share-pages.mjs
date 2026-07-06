import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import process from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const ENV_JSON_NAMES = ["interview_share_pages", "interview-share-pages", "INTERVIEW_SHARE_PAGES"];
const ENV_BASE64_NAMES = ["interview_share_pages_base64", "interview-share-pages-base64", "INTERVIEW_SHARE_PAGES_BASE64"];

loadLocalEnvFiles([".env.local", ".env"]);

const source = await readSource(process.argv.slice(2));
const pages = parsePages(source.content, source.name);

if (pages.length === 0) {
  throw new Error(`No interview share pages found in ${source.name}.`);
}

const connectionString = nonEmptyEnv("POSTGRES_PRISMA_URL");

if (!connectionString) {
  throw new Error("POSTGRES_PRISMA_URL is required to import interview share pages.");
}

const adapter = new PrismaPg({ connectionString: withPgSslCompatibility(connectionString) });
const prisma = new PrismaClient({ adapter });

try {
  const result = await prisma.$transaction(async (tx) => {
    const imported = [];

    for (const [pageIndex, page] of pages.entries()) {
      const sharePage = await tx.interviewSharePage.upsert({
        where: { shareId: page.id },
        create: {
          shareId: page.id,
          title: page.title,
          description: page.description,
          audienceLabel: page.audienceLabel,
          updatedAt: page.updatedAt,
          isActive: true,
        },
        update: {
          title: page.title,
          description: page.description,
          audienceLabel: page.audienceLabel,
          updatedAt: page.updatedAt,
          isActive: true,
        },
      });

      await tx.interviewRecord.deleteMany({
        where: {
          sharePageId: sharePage.id,
        },
      });

      for (const [interviewIndex, interview] of page.interviews.entries()) {
        await tx.interviewRecord.create({
          data: {
            sharePageId: sharePage.id,
            company: interview.company,
            position: interview.position,
            stage: interview.stage,
            interviewDate: interview.interviewDate,
            sortOrder: interviewIndex,
            notes: interview.notes,
            questions: {
              create: interview.questions.map((question, questionIndex) => ({
                question: question.question,
                topic: question.topic,
                intent: question.intent,
                followUps: question.followUps,
                sortOrder: questionIndex,
              })),
            },
          },
        });
      }

      imported.push({
        index: pageIndex,
        shareId: page.id,
        interviews: page.interviews.length,
        questions: page.interviews.reduce((total, interview) => total + interview.questions.length, 0),
      });
    }

    return imported;
  });

  const totalInterviews = result.reduce((total, page) => total + page.interviews, 0);
  const totalQuestions = result.reduce((total, page) => total + page.questions, 0);

  console.log(
    JSON.stringify(
      {
        source: source.name,
        pages: result.length,
        interviews: totalInterviews,
        questions: totalQuestions,
        shareIds: result.map((page) => page.shareId),
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}

async function readSource(args) {
  const stdinFlagIndex = args.indexOf("--stdin");

  if (stdinFlagIndex !== -1) {
    return {
      name: "<stdin>",
      content: await readStdin(),
    };
  }

  const explicitPath = args.find((arg) => !arg.startsWith("--")) ?? nonEmptyEnv("INTERVIEW_SHARE_PAGES_IMPORT_FILE");

  if (explicitPath) {
    const fullPath = resolve(explicitPath);
    return {
      name: fullPath,
      content: readJsonPath(fullPath),
    };
  }

  const envContent = readEnvironmentContent();

  if (envContent) {
    return envContent;
  }

  const privateDir = resolve(".private", "interviews");

  if (existsSync(privateDir)) {
    return {
      name: privateDir,
      content: readJsonPath(privateDir),
    };
  }

  throw new Error(
    "Provide a JSON file path, pass --stdin, set INTERVIEW_SHARE_PAGES_IMPORT_FILE, or add .private/interviews/*.json.",
  );
}

function readJsonPath(fullPath) {
  const stats = statSync(fullPath);

  if (stats.isDirectory()) {
    const jsonFiles = readdirSync(fullPath)
      .filter((fileName) => extname(fileName) === ".json")
      .sort()
      .map((fileName) => readFileSync(join(fullPath, fileName), "utf8"));

    return `[${jsonFiles.join(",")}]`;
  }

  return readFileSync(fullPath, "utf8");
}

function readEnvironmentContent() {
  const jsonSources = ENV_JSON_NAMES.map((name) => [name, nonEmptyEnv(name)]).filter(([, value]) => value);
  const base64Sources = ENV_BASE64_NAMES.map((name) => [name, nonEmptyEnv(name)]).filter(([, value]) => value);
  const sources = [
    ...jsonSources.map(([name, value]) => ({ name, content: value })),
    ...base64Sources.map(([name, value]) => ({
      name,
      content: Buffer.from(value, "base64").toString("utf8"),
    })),
  ];

  if (sources.length === 0) {
    return null;
  }

  return {
    name: sources.map((sourceItem) => sourceItem.name).join(", "),
    content: `[${sources.map((sourceItem) => sourceItem.content).join(",")}]`,
  };
}

function parsePages(source, sourceName) {
  let parsed;

  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw new Error(`Invalid interview share JSON in ${sourceName}: ${error.message}`);
  }

  return normalizePages(parsed, sourceName).map((page, pageIndex) => parsePage(page, `${sourceName}[${pageIndex}]`));
}

function normalizePages(parsed, sourceName) {
  if (Array.isArray(parsed)) {
    return parsed.flatMap((entry) => normalizePages(entry, sourceName));
  }

  if (isRecord(parsed) && Array.isArray(parsed.pages)) {
    return parsed.pages;
  }

  if (isRecord(parsed)) {
    return [parsed];
  }

  throw new Error(`Invalid interview share JSON in ${sourceName}: expected an object, an array, or { "pages": [] }.`);
}

function parsePage(rawPage, pathLabel) {
  const page = requireRecord(rawPage, pathLabel);
  const id = requireString(page.id, `${pathLabel}.id`);

  if (!SHARE_ID_PATTERN.test(id)) {
    throw new Error(`${pathLabel}.id must be 16-128 URL-safe characters.`);
  }

  const interviews = requireArray(page.interviews, `${pathLabel}.interviews`).map((rawInterview, interviewIndex) =>
    parseInterview(rawInterview, `${pathLabel}.interviews[${interviewIndex}]`),
  );

  if (interviews.length === 0) {
    throw new Error(`${pathLabel}.interviews must contain at least one interview.`);
  }

  return {
    id,
    title: optionalString(page.title) ?? "면접 질문 정리",
    description: optionalString(page.description),
    audienceLabel: optionalString(page.audienceLabel),
    updatedAt: optionalDate(page.updatedAt, `${pathLabel}.updatedAt`),
    interviews,
  };
}

function parseInterview(rawInterview, pathLabel) {
  const interview = requireRecord(rawInterview, pathLabel);
  const questions = requireArray(interview.questions, `${pathLabel}.questions`).map((rawQuestion, questionIndex) =>
    parseQuestion(rawQuestion, `${pathLabel}.questions[${questionIndex}]`),
  );

  if (questions.length === 0) {
    throw new Error(`${pathLabel}.questions must contain at least one question.`);
  }

  return {
    company: requireString(interview.company, `${pathLabel}.company`),
    position: optionalString(interview.position),
    stage: optionalString(interview.stage),
    interviewDate: optionalDate(interview.interviewDate, `${pathLabel}.interviewDate`),
    notes: optionalStringArray(interview.notes, `${pathLabel}.notes`) ?? [],
    questions,
  };
}

function parseQuestion(rawQuestion, pathLabel) {
  if (typeof rawQuestion === "string") {
    return {
      question: requireString(rawQuestion, pathLabel),
      topic: undefined,
      intent: undefined,
      followUps: [],
    };
  }

  const question = requireRecord(rawQuestion, pathLabel);

  return {
    question: requireString(question.question, `${pathLabel}.question`),
    topic: optionalString(question.topic),
    intent: optionalString(question.intent),
    followUps: optionalStringArray(question.followUps, `${pathLabel}.followUps`) ?? [],
  };
}

function optionalDate(value, pathLabel) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const dateString = requireDateString(value, pathLabel);
  return new Date(`${dateString}T00:00:00.000Z`);
}

function requireDateString(value, pathLabel) {
  const dateString = requireString(value, pathLabel);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

  if (!match) {
    throw new Error(`${pathLabel} must use YYYY-MM-DD.`);
  }

  const [, yearString, monthString, dayString] = match;
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new Error(`${pathLabel} must be a real calendar date.`);
  }

  return dateString;
}

function optionalString(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  return requireString(value, "<optional string>");
}

function optionalStringArray(value, pathLabel) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(`${pathLabel} must be an array.`);
  }

  return value.map((entry, entryIndex) => requireString(entry, `${pathLabel}[${entryIndex}]`));
}

function requireString(value, pathLabel) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${pathLabel} must be a non-empty string.`);
  }

  return value.trim();
}

function requireArray(value, pathLabel) {
  if (!Array.isArray(value)) {
    throw new Error(`${pathLabel} must be an array.`);
  }

  return value;
}

function requireRecord(value, pathLabel) {
  if (!isRecord(value)) {
    throw new Error(`${pathLabel} must be an object.`);
  }

  return value;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function loadLocalEnvFiles(fileNames) {
  for (const fileName of fileNames) {
    const fullPath = resolve(fileName);

    if (!existsSync(fullPath)) {
      continue;
    }

    const source = readFileSync(fullPath, "utf8");

    for (const line of source.split(/\r?\n/)) {
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());

      if (!match || nonEmptyEnv(match[1])) {
        continue;
      }

      const [, key, rawValue] = match;
      process.env[key] = unquoteEnvValue(rawValue.trim());
    }
  }
}

function unquoteEnvValue(value) {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replaceAll("\\n", "\n");
  }

  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  return value;
}

function nonEmptyEnv(key) {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

function withPgSslCompatibility(databaseUrl) {
  const url = new URL(databaseUrl);

  if (url.searchParams.get("sslmode") === "require" && !url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
  }

  return url.toString();
}

async function readStdin() {
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}
