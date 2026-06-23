import { promises as fs } from "node:fs";
import path from "node:path";

const INTERVIEW_SHARE_PAGES_ENV = "INTERVIEW_SHARE_PAGES";
const INTERVIEW_SHARE_PAGES_BASE64_ENV = "INTERVIEW_SHARE_PAGES_BASE64";
const PRIVATE_INTERVIEWS_DIR = path.join(process.cwd(), ".private", "interviews");
const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export type InterviewQuestion = {
  question: string;
  topic?: string;
  intent?: string;
  followUps: string[];
};

export type InterviewRecord = {
  company: string;
  position?: string;
  stage?: string;
  interviewDate: string;
  questions: InterviewQuestion[];
  notes: string[];
};

export type InterviewSharePage = {
  id: string;
  title: string;
  description?: string;
  audienceLabel?: string;
  updatedAt?: string;
  interviews: InterviewRecord[];
};

export async function getInterviewSharePage(shareId: string): Promise<InterviewSharePage | null> {
  if (!isValidShareId(shareId)) {
    return null;
  }

  const pages = await getInterviewSharePages();
  return pages.find((page) => page.id === shareId) ?? null;
}

export async function getInterviewSharePages(): Promise<InterviewSharePage[]> {
  const [environmentPages, privateFilePages] = await Promise.all([
    readInterviewPagesFromEnvironment(),
    readInterviewPagesFromPrivateFiles(),
  ]);
  const pagesById = new Map<string, InterviewSharePage>();

  for (const page of environmentPages) {
    pagesById.set(page.id, page);
  }

  for (const page of privateFilePages) {
    pagesById.set(page.id, page);
  }

  return [...pagesById.values()];
}

export function parseInterviewSharePagesFromJson(source: string, sourceName = "<inline>"): InterviewSharePage[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw new Error(`Invalid interview share JSON in ${sourceName}: ${(error as Error).message}`);
  }

  const rawPages = normalizeRawPages(parsed, sourceName);
  return rawPages.map((rawPage, index) => parseInterviewSharePage(rawPage, `${sourceName}[${index}]`));
}

export function isValidShareId(shareId: string): boolean {
  return SHARE_ID_PATTERN.test(shareId);
}

async function readInterviewPagesFromEnvironment(): Promise<InterviewSharePage[]> {
  const pages: InterviewSharePage[] = [];
  const rawJson = process.env[INTERVIEW_SHARE_PAGES_ENV]?.trim();
  const rawBase64Json = process.env[INTERVIEW_SHARE_PAGES_BASE64_ENV]?.trim();

  if (rawJson) {
    pages.push(...parseInterviewSharePagesFromJson(rawJson, INTERVIEW_SHARE_PAGES_ENV));
  }

  if (rawBase64Json) {
    const decodedJson = Buffer.from(rawBase64Json, "base64").toString("utf8");
    pages.push(...parseInterviewSharePagesFromJson(decodedJson, INTERVIEW_SHARE_PAGES_BASE64_ENV));
  }

  return pages;
}

async function readInterviewPagesFromPrivateFiles(): Promise<InterviewSharePage[]> {
  let entries: string[];

  try {
    entries = await fs.readdir(PRIVATE_INTERVIEWS_DIR);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  const jsonFiles = entries.filter((entry) => path.extname(entry) === ".json");
  const pages = await Promise.all(
    jsonFiles.map(async (fileName) => {
      const fullPath = path.join(PRIVATE_INTERVIEWS_DIR, fileName);
      const fileContent = await fs.readFile(fullPath, "utf8");

      return parseInterviewSharePagesFromJson(fileContent, fullPath);
    }),
  );

  return pages.flat();
}

function normalizeRawPages(parsed: unknown, sourceName: string): unknown[] {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (isRecord(parsed) && Array.isArray(parsed.pages)) {
    return parsed.pages;
  }

  if (isRecord(parsed)) {
    return [parsed];
  }

  throw new Error(`Invalid interview share JSON in ${sourceName}: expected an object, an array, or { "pages": [] }.`);
}

function parseInterviewSharePage(rawPage: unknown, pathLabel: string): InterviewSharePage {
  const page = requireRecord(rawPage, pathLabel);
  const id = requireString(page.id, `${pathLabel}.id`);

  if (!isValidShareId(id)) {
    throw new Error(`${pathLabel}.id must be 16-128 URL-safe characters.`);
  }

  const title = optionalString(page.title) ?? "면접 질문 정리";
  const description = optionalString(page.description);
  const audienceLabel = optionalString(page.audienceLabel);
  const updatedAt = optionalDateString(page.updatedAt, `${pathLabel}.updatedAt`);
  const interviews = requireArray(page.interviews, `${pathLabel}.interviews`)
    .map((rawInterview, index) => parseInterviewRecord(rawInterview, `${pathLabel}.interviews[${index}]`))
    .sort(compareInterviewsByDateDescending);

  if (interviews.length === 0) {
    throw new Error(`${pathLabel}.interviews must contain at least one interview.`);
  }

  return {
    id,
    title,
    description,
    audienceLabel,
    updatedAt,
    interviews,
  };
}

function parseInterviewRecord(rawInterview: unknown, pathLabel: string): InterviewRecord {
  const interview = requireRecord(rawInterview, pathLabel);
  const company = requireString(interview.company, `${pathLabel}.company`);
  const position = optionalString(interview.position);
  const stage = optionalString(interview.stage);
  const interviewDate = requireDateString(interview.interviewDate, `${pathLabel}.interviewDate`);
  const questions = requireArray(interview.questions, `${pathLabel}.questions`).map((rawQuestion, index) =>
    parseInterviewQuestion(rawQuestion, `${pathLabel}.questions[${index}]`),
  );
  const notes = optionalStringArray(interview.notes, `${pathLabel}.notes`) ?? [];

  if (questions.length === 0) {
    throw new Error(`${pathLabel}.questions must contain at least one question.`);
  }

  return {
    company,
    position,
    stage,
    interviewDate,
    questions,
    notes,
  };
}

function parseInterviewQuestion(rawQuestion: unknown, pathLabel: string): InterviewQuestion {
  if (typeof rawQuestion === "string") {
    return {
      question: requireNonEmptyString(rawQuestion, pathLabel),
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

function compareInterviewsByDateDescending(left: InterviewRecord, right: InterviewRecord): number {
  return Date.parse(`${right.interviewDate}T00:00:00.000Z`) - Date.parse(`${left.interviewDate}T00:00:00.000Z`);
}

function requireRecord(value: unknown, pathLabel: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${pathLabel} must be an object.`);
  }

  return value;
}

function requireArray(value: unknown, pathLabel: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${pathLabel} must be an array.`);
  }

  return value;
}

function requireString(value: unknown, pathLabel: string): string {
  return requireNonEmptyString(value, pathLabel);
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return requireNonEmptyString(value, "<optional string>");
}

function optionalStringArray(value: unknown, pathLabel: string): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(`${pathLabel} must be an array.`);
  }

  return value.map((entry, index) => requireNonEmptyString(entry, `${pathLabel}[${index}]`));
}

function requireDateString(value: unknown, pathLabel: string): string {
  const dateString = requireNonEmptyString(value, pathLabel);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

  if (!match) {
    throw new Error(`${pathLabel} must use YYYY-MM-DD.`);
  }

  const [, yearString, monthString, dayString] = match;
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsedDate = new Date(timestamp);

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new Error(`${pathLabel} must be a real calendar date.`);
  }

  return dateString;
}

function optionalDateString(value: unknown, pathLabel: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return requireDateString(value, pathLabel);
}

function requireNonEmptyString(value: unknown, pathLabel: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${pathLabel} must be a non-empty string.`);
  }

  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
