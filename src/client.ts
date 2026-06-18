import { readFile } from 'node:fs/promises';
import { basename, isAbsolute, resolve } from 'node:path';

export interface ClientConfig {
    baseUrl: string;
    token: string;
}

export class DigihubClient {
    private readonly baseUrl: string;
    private readonly token: string;

    constructor(config: ClientConfig) {
        this.baseUrl = config.baseUrl.replace(/\/+$/, '');
        this.token = config.token;
    }

    async request<T = unknown>(
        method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
        path: string,
        options: { body?: unknown; query?: Record<string, string | number | boolean | undefined> } = {},
    ): Promise<T> {
        const url = new URL(this.baseUrl + path);
        if (options.query) {
            for (const [k, v] of Object.entries(options.query)) {
                if (v !== undefined && v !== null && v !== '') {
                    url.searchParams.set(k, String(v));
                }
            }
        }

        const init: RequestInit = {
            method,
            headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: 'application/json',
            },
        };

        if (options.body !== undefined) {
            (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
            init.body = JSON.stringify(options.body);
        }

        const res = await fetch(url.toString(), init);
        const text = await res.text();
        let parsed: unknown = null;
        if (text.length > 0) {
            try {
                parsed = JSON.parse(text);
            } catch {
                parsed = text;
            }
        }

        if (!res.ok) {
            const detail = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
            throw new Error(`${method} ${path} failed: ${res.status} ${res.statusText} — ${detail}`);
        }

        return parsed as T;
    }

    /**
     * Upload a file (local path) or fetch a URL server-side and return the resulting public URL.
     */
    async uploadMedia(input: { file?: string; url?: string; subdir?: string }): Promise<{ url: string; extension: string; size: number }> {
        if (input.url && !input.file) {
            return this.request<{ url: string; extension: string; size: number }>('POST', '/api/media', {
                body: { url: input.url, subdir: input.subdir },
            });
        }

        if (!input.file) {
            throw new Error('uploadMedia requires either `file` (local path) or `url`.');
        }

        const filePath = isAbsolute(input.file) ? input.file : resolve(process.cwd(), input.file);
        const buffer = await readFile(filePath);
        const form = new FormData();
        form.append('file', new Blob([new Uint8Array(buffer)]), basename(filePath));
        if (input.subdir) form.append('subdir', input.subdir);

        const res = await fetch(`${this.baseUrl}/api/media`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: 'application/json',
            },
            body: form,
        });

        const text = await res.text();
        if (!res.ok) throw new Error(`Media upload failed: ${res.status} — ${text}`);
        return JSON.parse(text);
    }
}
