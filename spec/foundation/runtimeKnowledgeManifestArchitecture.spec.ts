import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import ts from "typescript";

const sourceRoot = join(
  process.cwd(),
  "src",
  "foundation",
  "runtime",
  "knowledge",
);
const specRoot = join(process.cwd(), "spec", "foundation");

describe("runtime knowledge manifest architecture", () => {
  it("keeps every owned module and spec within physical and callable limits", () => {
    for (const file of ownedFiles())
      expect(inspection(file)).toEqual({
        file: basename(file),
        violations: [],
      });
  });
});

function ownedFiles(): string[] {
  const source = readdirSync(sourceRoot)
    .filter((name) => name.endsWith(".ts"))
    .map((name) => join(sourceRoot, name));
  const specs = readdirSync(specRoot)
    .filter(
      (name) =>
        name.startsWith("runtimeKnowledgeManifest") && name.endsWith(".ts"),
    )
    .map((name) => join(specRoot, name));
  return [...source, ...specs];
}

function inspection(file: string): { file: string; violations: string[] } {
  const text = readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const violations = moduleViolation(file, text).concat(
    callableViolations(source),
  );
  classFilenameViolations(source, file, violations);
  return { file: basename(file), violations };
}

function moduleViolation(file: string, text: string): string[] {
  const limit = file.includes(`${sourceRoot}/`) ? 200 : 300;
  return text.split("\n").length - 1 <= limit ? [] : ["module"];
}

function callableViolations(source: ts.SourceFile): string[] {
  const violations: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionLike(node)) {
      const start = source.getLineAndCharacterOfPosition(
        node.getStart(source),
      ).line;
      const end = source.getLineAndCharacterOfPosition(node.end).line;
      if (end - start + 1 > 40) violations.push("function");
      if (ts.isConstructorDeclaration(node) && end - start + 1 > 25)
        violations.push("constructor");
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return violations;
}

function classFilenameViolations(
  source: ts.SourceFile,
  file: string,
  violations: string[],
): void {
  source.forEachChild((node) => {
    if (
      ts.isClassDeclaration(node) &&
      node.name &&
      basename(file, ".ts") !== node.name.text
    )
      violations.push("class-filename");
  });
}
