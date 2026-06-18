import { z } from 'zod';

const Translation = z.object({ de: z.string().optional(), en: z.string().optional() }).refine(
    (v) => v.de || v.en,
    { message: 'Provide at least one of de/en' },
);

const RelatedLink = z.object({
    label: z.string(),
    url: z.string().url(),
    type: z.string().optional(),
});

const MediaItem = z.object({
    kind: z.enum(['image', 'video', 'pdf', 'audio']),
    url: z.string(),
    caption: z.string().optional(),
});

export const StoryFormats = ['news', 'case_study', 'newsletter', 'use_case', 'success_story'] as const;
export const ContentStatus = ['draft', 'published', 'archived'] as const;

export const CreateStorySchema = z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/, 'lowercase letters, digits and dashes only'),
    pillar_id: z.number().int().optional(),
    title: Translation,
    lead: Translation,
    body: z.object({ de: z.string().optional(), en: z.string().optional() }).optional(),
    format: z.enum(StoryFormats),
    hero_image: z.string().optional(),
    author_name: z.string().optional(),
    related_links: z.array(RelatedLink).optional(),
    media: z.array(MediaItem).optional(),
    featured: z.boolean().optional(),
    status: z.enum(ContentStatus).optional(),
    published_at: z.string().datetime().optional(),
    tag_slugs: z.array(z.string()).optional(),
});

export const UpdateStorySchema = CreateStorySchema.partial();

export const CreateSolutionSchema = z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    pillar_id: z.number().int().optional(),
    title: Translation,
    summary: Translation,
    body: z.object({ de: z.string().optional(), en: z.string().optional() }).optional(),
    hero_image: z.string().optional(),
    icon: z.string().optional(),
    business_areas: z.array(z.string()).optional(),
    target_audiences: z.array(z.string()).optional(),
    featured: z.boolean().optional(),
    cta_link: z.string().url().optional(),
    status: z.enum(ContentStatus).optional(),
    published_at: z.string().datetime().optional(),
    sort_order: z.number().int().min(0).optional(),
    tag_slugs: z.array(z.string()).optional(),
});

export const UpdateSolutionSchema = CreateSolutionSchema.partial();

export const SessionStatus = ['draft', 'published', 'archived', 'cancelled'] as const;

export const CreateSessionSchema = z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    pillar_id: z.number().int().optional(),
    title: Translation,
    summary: Translation,
    body: z.object({ de: z.string().optional(), en: z.string().optional() }).optional(),
    format: z.string(),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime().optional(),
    location: z.string().optional(),
    capacity: z.number().int().min(0).optional(),
    business_areas: z.array(z.string()).optional(),
    hero_image: z.string().optional(),
    register_url: z.string().url().optional(),
    featured: z.boolean().optional(),
    status: z.enum(SessionStatus).optional(),
    tag_slugs: z.array(z.string()).optional(),
});

export const UpdateSessionSchema = CreateSessionSchema.partial();

export const ListQuerySchema = z.object({
    status: z.enum(ContentStatus).optional(),
    format: z.string().optional(),
    pillar_id: z.number().int().optional(),
    featured: z.boolean().optional(),
    upcoming: z.boolean().optional(),
    per_page: z.number().int().min(1).max(100).optional(),
    page: z.number().int().min(1).optional(),
});

export const SlugParam = z.object({ slug: z.string() });

export const UploadMediaSchema = z.object({
    file: z.string().optional().describe('Local file path (absolute or relative to cwd)'),
    url: z.string().url().optional().describe('Remote URL to fetch and re-host'),
    subdir: z.enum(['uploads', 'stories', 'solutions', 'sessions']).optional(),
}).refine((v) => v.file || v.url, { message: 'Provide either file or url' });
