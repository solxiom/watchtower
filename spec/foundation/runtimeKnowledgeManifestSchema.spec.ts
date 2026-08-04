import { readFile } from "node:fs/promises";
import path from "node:path";
import { RuntimeKnowledgeManifestSchemaConsumer } from "../../src/foundation/runtime/knowledge/RuntimeKnowledgeManifestSchemaConsumer.js";

it("accepts both checked-in full documents through fragment and aggregate schemas", async () => {
  const [runtime, knowledge] = await documents();
  for (const schema of await schemas()) {
    expect(validate(schema, "runtimeManifest", runtime)).toBeTrue();
    expect(validate(schema, "knowledgeManifest", knowledge)).toBeTrue();
  }
});

it("rejects malformed, missing, extra, and unsupported runtime values", async () => {
  const [runtime] = await documents();
  const cases = [
    null,
    omit(runtime, "actions"),
    { ...runtime, unexpected: true },
    { ...runtime, runtimeVersion: "" },
    { ...runtime, requiredCommands: ["Bad"] },
    { ...runtime, actions: ["bad action"] },
  ];
  for (const schema of await schemas())
    for (const value of cases)
      expect(validate(schema, "runtimeManifest", value)).toBeFalse();
});

it("rejects duplicate asset paths even when their metadata differs", async () => {
  const [runtime] = await documents();
  const duplicate = {
    ...runtime,
    assets: [
      runtime.assets[0],
      { ...runtime.assets[0], sha256: `sha256:${"0".repeat(64)}` },
    ],
  };
  for (const schema of await schemas())
    expect(validate(schema, "runtimeManifest", duplicate)).toBeFalse();
});

it("rejects invalid knowledge version, mode, and provenance", async () => {
  const [, knowledge] = await documents();
  const cases = [
    { ...knowledge, knowledgeVersion: "" },
    { ...knowledge, assets: [{ ...knowledge.assets[0], mode: "0600" }] },
    { ...knowledge, provenance: { ...knowledge.provenance, commit: "0" } },
  ];
  for (const schema of await schemas())
    for (const value of cases)
      expect(validate(schema, "knowledgeManifest", value)).toBeFalse();
});
interface ManifestDocument extends Record<string, unknown> {
  assets: Array<Record<string, unknown>>;
  provenance?: Record<string, unknown>;
}

async function documents(): Promise<[ManifestDocument, ManifestDocument]> {
  const values = await Promise.all(
    ["runtime/manifest.json", "knowledge/manifest.json"].map(
      async (file) =>
        JSON.parse(
          await readFile(path.join(process.cwd(), file), "utf8"),
        ) as ManifestDocument,
    ),
  );
  return [values[0], values[1]];
}
async function schemas(): Promise<Record<string, unknown>[]> {
  const [fragment, core, aggregate] = await Promise.all([
    schema("docs/spec/schemas/v1/runtimeKnowledgeManifest.schema.json"),
    schema("docs/spec/schemas/v1/core.schema.json"),
    schema("docs/spec/schemas/v1.schema.json"),
  ]);
  return [
    {
      ...fragment,
      $defs: {
        ...(core.$defs as Record<string, unknown>),
        ...(fragment.$defs as Record<string, unknown>),
      },
    },
    aggregate,
  ];
}
async function schema(file: string): Promise<Record<string, unknown>> {
  return JSON.parse(
    await readFile(path.join(process.cwd(), file), "utf8"),
  ) as Record<string, unknown>;
}
function validate(
  schema: Record<string, unknown>,
  definition: "runtimeManifest" | "knowledgeManifest",
  value: unknown,
): boolean {
  return new RuntimeKnowledgeManifestSchemaConsumer().validate(
    schema,
    definition,
    value,
  );
}
function omit(
  value: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const copy = { ...value };
  delete copy[key];
  return copy;
}
