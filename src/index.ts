#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from './lib/zod-to-json.js';
import { DigihubClient } from './client.js';
import {
    CreateSessionSchema,
    CreateSolutionSchema,
    CreateStorySchema,
    ListQuerySchema,
    SlugParam,
    UpdateSessionSchema,
    UpdateSolutionSchema,
    UpdateStorySchema,
    UploadMediaSchema,
} from './schemas.js';

const baseUrl = process.env.DIGIHUB_BASE_URL;
const token = process.env.DIGIHUB_API_TOKEN;

if (!baseUrl || !token) {
    process.stderr.write(
        'digihub-mcp: missing DIGIHUB_BASE_URL or DIGIHUB_API_TOKEN environment variables.\n',
    );
    process.exit(1);
}

const client = new DigihubClient({ baseUrl, token });

const tools = [
    // Stories
    { name: 'list_stories', description: 'List stories with optional filters.', input: ListQuerySchema, handler: (args: any) => client.request('GET', '/api/stories', { query: args }) },
    { name: 'get_story', description: 'Fetch a single story by slug.', input: SlugParam, handler: (args: any) => client.request('GET', `/api/stories/${args.slug}`) },
    { name: 'create_story', description: 'Create a new story.', input: CreateStorySchema, handler: (args: any) => client.request('POST', '/api/stories', { body: args }) },
    { name: 'update_story', description: 'Update an existing story by slug.', input: SlugParam.merge(UpdateStorySchema), handler: ({ slug, ...rest }: any) => client.request('PATCH', `/api/stories/${slug}`, { body: rest }) },
    { name: 'delete_story', description: 'Soft-delete a story by slug.', input: SlugParam, handler: (args: any) => client.request('DELETE', `/api/stories/${args.slug}`) },
    // Solutions
    { name: 'list_solutions', description: 'List solutions with optional filters.', input: ListQuerySchema, handler: (args: any) => client.request('GET', '/api/solutions', { query: args }) },
    { name: 'get_solution', description: 'Fetch a single solution by slug.', input: SlugParam, handler: (args: any) => client.request('GET', `/api/solutions/${args.slug}`) },
    { name: 'create_solution', description: 'Create a new solution.', input: CreateSolutionSchema, handler: (args: any) => client.request('POST', '/api/solutions', { body: args }) },
    { name: 'update_solution', description: 'Update an existing solution by slug.', input: SlugParam.merge(UpdateSolutionSchema), handler: ({ slug, ...rest }: any) => client.request('PATCH', `/api/solutions/${slug}`, { body: rest }) },
    { name: 'delete_solution', description: 'Soft-delete a solution by slug.', input: SlugParam, handler: (args: any) => client.request('DELETE', `/api/solutions/${args.slug}`) },
    // Sessions
    { name: 'list_sessions', description: 'List sessions (events) with optional filters.', input: ListQuerySchema, handler: (args: any) => client.request('GET', '/api/sessions', { query: args }) },
    { name: 'get_session', description: 'Fetch a single session by slug.', input: SlugParam, handler: (args: any) => client.request('GET', `/api/sessions/${args.slug}`) },
    { name: 'create_session', description: 'Create a new session (event).', input: CreateSessionSchema, handler: (args: any) => client.request('POST', '/api/sessions', { body: args }) },
    { name: 'update_session', description: 'Update an existing session by slug.', input: SlugParam.merge(UpdateSessionSchema), handler: ({ slug, ...rest }: any) => client.request('PATCH', `/api/sessions/${slug}`, { body: rest }) },
    { name: 'delete_session', description: 'Soft-delete a session by slug.', input: SlugParam, handler: (args: any) => client.request('DELETE', `/api/sessions/${args.slug}`) },
    // Media
    { name: 'upload_media', description: 'Upload a local file or have the server fetch a remote URL. Returns a `/storage/...` URL to reference in hero_image / media[].url.', input: UploadMediaSchema, handler: (args: any) => client.uploadMedia(args) },
    // Self
    { name: 'whoami', description: 'Returns the authenticated user and the abilities granted to the current token.', input: undefined, handler: () => client.request('GET', '/api/me') },
];

const server = new Server(
    { name: 'digihub-mcp', version: '0.1.2' },
    { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.input ? zodToJsonSchema(t.input) : { type: 'object', properties: {} },
    })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = tools.find((t) => t.name === req.params.name);
    if (!tool) throw new Error(`Unknown tool: ${req.params.name}`);

    const raw = req.params.arguments ?? {};
    const args = tool.input ? tool.input.parse(raw) : raw;

    try {
        const result = await tool.handler(args);
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            isError: true,
            content: [{ type: 'text', text: message }],
        };
    }
});

const transport = new StdioServerTransport();
await server.connect(transport);
