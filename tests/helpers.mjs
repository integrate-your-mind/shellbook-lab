import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function tempDir(prefix) {
  return mkdtemp(join(tmpdir(), `shellbook-lab-${prefix}-`));
}

export async function writeExecutable(dir, name, body) {
  await mkdir(dir, { recursive: true });
  const path = join(dir, name);
  await writeFile(path, body, { mode: 0o755 });
  return path;
}

export async function withEnv(updates, run) {
  const previous = new Map(Object.keys(updates).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

export async function withCwd(path, run) {
  const previous = process.cwd();
  process.chdir(path);
  try {
    return await run();
  } finally {
    process.chdir(previous);
  }
}
