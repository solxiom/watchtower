import Ajv2020 from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";

/** The sole production owner for the versioned manifest schema extension. */
export class RuntimeKnowledgeManifestSchemaConsumer {
  validate(
    schema: Record<string, unknown>,
    definition: "runtimeManifest" | "knowledgeManifest",
    value: unknown,
  ): boolean {
    return this.validator(schema, definition)(value) === true;
  }

  private validator(
    schema: Record<string, unknown>,
    definition: string,
  ): ValidateFunction {
    const ajv = new Ajv2020({ strict: false });
    ajv.addKeyword({
      keyword: "x-watchtower-uniqueBy",
      type: "array",
      schemaType: "string",
      validate: (key: string, values: unknown[]) => uniqueProperty(values, key),
    });
    return ajv.compile({ $defs: schema.$defs, $ref: `#/$defs/${definition}` });
  }
}

function uniqueProperty(values: readonly unknown[], key: string): boolean {
  const seen = new Set<unknown>();
  for (const value of values) {
    const property =
      typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)[key]
        : undefined;
    if (seen.has(property)) return false;
    seen.add(property);
  }
  return true;
}
