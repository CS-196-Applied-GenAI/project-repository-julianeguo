import fs from "node:fs";
import path from "node:path";

const APP_ROOT = path.resolve(__dirname, "..");
const TEST_FILE_SUFFIX = ".test.";

function collectSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(absolutePath));
      continue;
    }

    if (!/\.(ts|tsx)$/.test(entry.name)) {
      continue;
    }

    if (entry.name.includes(TEST_FILE_SUFFIX)) {
      continue;
    }

    files.push(absolutePath);
  }

  return files;
}

describe("frontend file smoke imports", () => {
  const sourceFiles = collectSourceFiles(APP_ROOT)
    .map((filePath) => path.relative(path.resolve(__dirname, "../../.."), filePath))
    .sort();

  test("discovers app files", () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  for (const relativeFilePath of sourceFiles) {
    test(`imports ${relativeFilePath}`, () => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
        require(path.resolve(__dirname, "../../..", relativeFilePath));
      }).not.toThrow();
    });
  }
});
