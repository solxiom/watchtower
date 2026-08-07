import { readdir, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { RuntimeKnowledgeManifestError } from "../../src/contracts/runtimeKnowledgeManifests.js";
import { RuntimeKnowledgeManifestValidator } from "../../src/foundation/runtime/knowledge/RuntimeKnowledgeManifestValidator.js";

const validator = new RuntimeKnowledgeManifestValidator();

it("accepts the committed manifests and verifies their complete asset/action observations", async () => {
  const runtime = validator.validateRuntime(
    await document("runtime/manifest.json"),
  );
  const knowledge = validator.validateKnowledge(
    await document("knowledge/manifest.json"),
  );
  expect(
    validator.verifyAssets(runtime, await observations("runtime-nvb")),
  ).toEqual({ ok: true });
  expect(
    validator.verifyActions(runtime, [
      "wt:git:publish-commits",
      "wt:git:record-acceptance",
      "wt:runtime:smoke",
    ]),
  ).toEqual({ ok: true });
  expect(
    validator.verifyAssets(knowledge, await observations("knowledge")),
  ).toEqual({ ok: true });
  expect(Object.isFrozen(knowledge.provenance)).toBeTrue();
});

it("rejects malformed, missing, extra, duplicate, and unsafe manifest fields", async () => {
  const source = (await document("runtime/manifest.json")) as Record<
    string,
    unknown
  >;
  const missing = structuredClone(source);
  delete missing.actions;
  expectError(missing, "MANIFEST_SCHEMA_INVALID");
  expectError({ ...source, extra: true }, "MANIFEST_SCHEMA_INVALID");
  expectError(
    { ...source, manifestId: "foreign" },
    "MANIFEST_IDENTITY_INVALID",
  );
  expectError(
    { ...source, actions: ["wt:runtime:smoke", "wt:runtime:smoke"] },
    "MANIFEST_SCHEMA_INVALID",
  );
  expectError(
    {
      ...source,
      assets: [
        {
          path: "../escape",
          sha256: "sha256:" + "0".repeat(64),
          mode: "0644",
        },
      ],
    },
    "MANIFEST_SCHEMA_INVALID",
  );
});

it("rejects missing, extra, checksum-mismatched, and mode-mismatched assets", async () => {
  const source = (await document("runtime/manifest.json")) as Record<
    string,
    unknown
  >;
  const manifest = validator.validateRuntime({
    ...source,
    assets: [{ path: "bin/wt", sha256: digest("a"), mode: "0755" }],
  });
  expect(validator.verifyAssets(manifest, [])).toEqual({
    ok: false,
    reason: "MANIFEST_ASSET_MISSING",
    subject: "bin/wt",
  });
  expect(
    validator.verifyAssets(manifest, [
      { path: "bin/wt", sha256: digest("b"), mode: "0755" },
    ]),
  ).toEqual({
    ok: false,
    reason: "MANIFEST_ASSET_CHECKSUM_MISMATCH",
    subject: "bin/wt",
  });
  expect(
    validator.verifyAssets(manifest, [
      { path: "bin/wt", sha256: digest("a"), mode: "0644" },
    ]),
  ).toEqual({
    ok: false,
    reason: "MANIFEST_ASSET_MODE_MISMATCH",
    subject: "bin/wt",
  });
  expect(
    validator.verifyAssets(manifest, [
      { path: "bin/wt", sha256: digest("a"), mode: "0755" },
      { path: "extra", sha256: digest("a"), mode: "0644" },
    ]),
  ).toEqual({ ok: false, reason: "MANIFEST_ASSET_EXTRA", subject: "extra" });
});

it("rejects missing and extra actions", async () => {
  const manifest = validator.validateRuntime(
    await document("runtime/manifest.json"),
  );
  expect(validator.verifyActions(manifest, [])).toEqual({
    ok: false,
    reason: "MANIFEST_ACTION_MISSING",
    subject: "wt:git:publish-commits",
  });
  expect(
    validator.verifyActions(manifest, [
      "wt:git:publish-commits",
      "wt:git:record-acceptance",
      "wt:runtime:smoke",
      "wt:foreign",
    ]),
  ).toEqual({
    ok: false,
    reason: "MANIFEST_ACTION_EXTRA",
    subject: "wt:foreign",
  });
  expect(validator.verifyActions(manifest, ["wt:runtime:smoke", "wt:runtime:smoke"])).toEqual({
    ok: false,
    reason: "MANIFEST_ACTION_DUPLICATE",
    subject: "wt:runtime:smoke",
  });
});

it("rejects duplicate asset observations and unaccepted provenance or compatibility", async () => {
  const runtime = validator.validateRuntime(
    await document("runtime/manifest.json"),
  );
  const knowledge = validator.validateKnowledge(
    await document("knowledge/manifest.json"),
  );
  const observed = await observations("runtime-nvb");
  expect(validator.verifyAssets(runtime, [observed[0], observed[0]])).toEqual({
    ok: false,
    reason: "MANIFEST_ASSET_DUPLICATE",
    subject: observed[0].path,
  });
  expect(
    validator.verifyKnowledgeProvenance(knowledge, {
      ...knowledge.provenance,
      commit: "0".repeat(40),
    }),
  ).toEqual({
    ok: false,
    reason: "MANIFEST_PROVENANCE_UNACCEPTED",
    subject: "provenance",
  });
  expect(validator.verifyCompatibility(runtime, knowledge)).toEqual({
    ok: true,
  });
  expect(
    validator.verifyCompatibility(
      { ...runtime, compatibleKnowledgeVersions: ["9.9.9"] },
      knowledge,
    ),
  ).toEqual({
    ok: false,
    reason: "MANIFEST_COMPATIBILITY_INVALID",
    subject: "runtime/knowledge",
  });
});

function expectError(value: unknown, reason: string): void {
  try {
    validator.validateRuntime(value);
    fail("Expected validation to fail.");
  } catch (error: unknown) {
    expect(error instanceof RuntimeKnowledgeManifestError).toBeTrue();
    if (error instanceof RuntimeKnowledgeManifestError)
      expect(error.reason).toBe(reason);
  }
}

async function document(relativePath: string): Promise<unknown> {
  return JSON.parse(
    await readFile(path.join(process.cwd(), relativePath), "utf8"),
  ) as unknown;
}

async function observations(
  relativeRoot: string,
): Promise<
  Array<{ path: string; sha256: `sha256:${string}`; mode: "0644" | "0755" }>
> {
  const root = path.join(process.cwd(), relativeRoot);
  const files = await filesBelow(root, root);
  const managed = files.filter((file) =>
    relativeRoot === "knowledge"
      ? file !== path.join(root, "manifest.json")
      : !file.endsWith("import-record.json"),
  );
  return Promise.all(
    managed.map(async (file) => ({
      path: path.relative(root, file).replaceAll(path.sep, "/"),
      sha256: `sha256:${createHash("sha256")
        .update(await readFile(file))
        .digest("hex")}` as `sha256:${string}`,
      mode: ((await stat(file)).mode & 0o111) === 0 ? "0644" : "0755",
    })),
  );
}

async function filesBelow(root: string, directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const children = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? filesBelow(root, path.join(directory, entry.name))
        : [path.join(directory, entry.name)],
    ),
  );
  return children.flat().filter((file) => file.startsWith(root));
}

function digest(character: string): `sha256:${string}` {
  return `sha256:${character.repeat(64)}`;
}
