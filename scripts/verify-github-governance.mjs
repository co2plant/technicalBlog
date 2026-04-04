import fs from "node:fs";
import path from "node:path";

const REQUIRED_CONTRIBUTING_HEADINGS = [
  "Commit Rules",
  "Branch Naming",
  "Pull Request Rules",
  "Merge Strategy",
  "Self-Review Checklist"
];

const REQUIRED_PR_TEMPLATE_HEADINGS = [
  "Purpose",
  "Files Changed",
  "Verification",
  "Out of Scope",
  "Rollback Impact",
  "Checklist"
];

const REQUIRED_TYPES = ["feat", "fix", "refactor", "test", "docs", "chore"];

function parseArgs(argv) {
  let root = ".";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--root") {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --root");
      }
      root = value;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { root: path.resolve(process.cwd(), root) };
}

function headingRegex(heading) {
  return new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "im");
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

function readFileIfExists(filePath, failures) {
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing required file: ${filePath}`);
    return null;
  }

  const stats = fs.statSync(filePath);
  if (!stats.isFile()) {
    failures.push(`Required path is not a file: ${filePath}`);
    return null;
  }

  return fs.readFileSync(filePath, "utf8");
}

function verifyContributing(content, filePath, failures) {
  for (const heading of REQUIRED_CONTRIBUTING_HEADINGS) {
    if (!headingRegex(heading).test(content)) {
      failures.push(`Missing heading in ${filePath}: ## ${heading}`);
    }
  }

  const lower = content.toLowerCase();

  if (!lower.includes("type(scope): concise intent")) {
    failures.push(`Missing phrase in ${filePath}: type(scope): concise intent`);
  }

  for (const type of REQUIRED_TYPES) {
    const regex = new RegExp(`\\b${escapeRegExp(type)}\\b`, "i");
    if (!regex.test(content)) {
      failures.push(`Missing allowed commit type in ${filePath}: ${type}`);
    }
  }

  if (!lower.includes("large batch")) {
    failures.push(`Missing prohibition phrase in ${filePath}: large batch`);
  }
}

function verifyPullRequestTemplate(content, filePath, failures) {
  for (const heading of REQUIRED_PR_TEMPLATE_HEADINGS) {
    if (!headingRegex(heading).test(content)) {
      failures.push(`Missing heading in ${filePath}: ## ${heading}`);
    }
  }

  if (!/-\s*\[\s\]/.test(content)) {
    failures.push(`Missing checklist marker in ${filePath}: - [ ]`);
  }
}

function main() {
  const failures = [];
  let root;

  try {
    ({ root } = parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(`Argument error: ${error.message}`);
    process.exit(1);
  }

  const contributingPath = path.join(root, ".github", "CONTRIBUTING.md");
  const prTemplatePath = path.join(root, ".github", "pull_request_template.md");

  const contributingContent = readFileIfExists(contributingPath, failures);
  if (contributingContent !== null) {
    verifyContributing(contributingContent, contributingPath, failures);
  }

  const prTemplateContent = readFileIfExists(prTemplatePath, failures);
  if (prTemplateContent !== null) {
    verifyPullRequestTemplate(prTemplateContent, prTemplatePath, failures);
  }

  if (failures.length > 0) {
    console.error("GitHub governance verification failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`GitHub governance verification passed for root: ${root}`);
  console.log(`- Verified ${contributingPath}`);
  console.log(`- Verified ${prTemplatePath}`);
}

main();
