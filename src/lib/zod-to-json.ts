import type { ZodTypeAny } from 'zod';

/**
 * Minimal Zod -> JSON Schema converter for MCP tool inputSchema.
 * Supports the subset of Zod types we use in this server: object, string,
 * number, boolean, enum, array, optional, union, datetime, url.
 *
 * Avoiding the `zod-to-json-schema` npm dep keeps this package install
 * footprint tiny — MCP only needs the schema to advertise tool inputs to
 * the model, the actual validation is done by Zod itself at call time.
 */
export function zodToJsonSchema(schema: ZodTypeAny): Record<string, unknown> {
    const def: any = (schema as any)._def;
    const type = def.typeName;

    switch (type) {
        case 'ZodObject': {
            const shape = (typeof def.shape === 'function' ? def.shape() : def.shape) as Record<string, ZodTypeAny>;
            const required: string[] = [];
            const properties: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(shape)) {
                properties[k] = zodToJsonSchema(v);
                if (!isOptional(v)) required.push(k);
            }
            const out: Record<string, unknown> = { type: 'object', properties };
            if (required.length) out.required = required;
            return out;
        }
        case 'ZodString': {
            const out: Record<string, unknown> = { type: 'string' };
            for (const check of def.checks ?? []) {
                if (check.kind === 'url') out.format = 'uri';
                if (check.kind === 'datetime') out.format = 'date-time';
                if (check.kind === 'regex') out.pattern = String(check.regex).slice(1, -1);
            }
            if (def.description) out.description = def.description;
            return out;
        }
        case 'ZodNumber':
            return { type: 'number' };
        case 'ZodBoolean':
            return { type: 'boolean' };
        case 'ZodEnum':
            return { type: 'string', enum: def.values };
        case 'ZodArray':
            return { type: 'array', items: zodToJsonSchema(def.type) };
        case 'ZodOptional':
        case 'ZodDefault':
        case 'ZodNullable':
            return zodToJsonSchema(def.innerType);
        case 'ZodEffects':
            return zodToJsonSchema(def.schema);
        case 'ZodUnion': {
            return { oneOf: (def.options as ZodTypeAny[]).map(zodToJsonSchema) };
        }
        default:
            return {};
    }
}

function isOptional(schema: ZodTypeAny): boolean {
    const tn = (schema as any)._def?.typeName;
    return tn === 'ZodOptional' || tn === 'ZodDefault' || tn === 'ZodNullable';
}
