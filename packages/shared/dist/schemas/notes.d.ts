import { z } from "zod";
export declare const MAX_FOLDER_DEPTH = 5;
export declare const MAX_NOTE_TITLE_LENGTH = 300;
export declare const MAX_FOLDER_NAME_LENGTH = 200;
export declare const MAX_TAG_LENGTH = 50;
export declare const MAX_TAGS_PER_NOTE = 20;
export declare const MAX_SEARCH_LENGTH = 200;
export declare const prosemirrorDocSchema: z.ZodObject<{
    type: z.ZodLiteral<"doc">;
    content: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "doc";
    content: Record<string, unknown>[];
}, {
    type: "doc";
    content?: Record<string, unknown>[] | undefined;
}>;
export type ProseMirrorDoc = z.infer<typeof prosemirrorDocSchema>;
export declare const createNoteSchema: z.ZodObject<{
    title: z.ZodDefault<z.ZodString>;
    content: z.ZodDefault<z.ZodObject<{
        type: z.ZodLiteral<"doc">;
        content: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "doc";
        content: Record<string, unknown>[];
    }, {
        type: "doc";
        content?: Record<string, unknown>[] | undefined;
    }>>;
    folderId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    tags: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    content: {
        type: "doc";
        content: Record<string, unknown>[];
    };
    folderId: string | null;
    tags: string[];
}, {
    title?: string | undefined;
    content?: {
        type: "doc";
        content?: Record<string, unknown>[] | undefined;
    } | undefined;
    folderId?: string | null | undefined;
    tags?: string[] | undefined;
}>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export declare const updateNoteSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodObject<{
        type: z.ZodLiteral<"doc">;
        content: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "doc";
        content: Record<string, unknown>[];
    }, {
        type: "doc";
        content?: Record<string, unknown>[] | undefined;
    }>>;
    folderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    content?: {
        type: "doc";
        content: Record<string, unknown>[];
    } | undefined;
    folderId?: string | null | undefined;
    tags?: string[] | undefined;
}, {
    title?: string | undefined;
    content?: {
        type: "doc";
        content?: Record<string, unknown>[] | undefined;
    } | undefined;
    folderId?: string | null | undefined;
    tags?: string[] | undefined;
}>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export declare const listNotesQuerySchema: z.ZodObject<{
    folderId: z.ZodOptional<z.ZodString>;
    tag: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    folderId?: string | undefined;
    tag?: string | undefined;
    search?: string | undefined;
}, {
    folderId?: string | undefined;
    tag?: string | undefined;
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
}>;
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;
export declare const noteParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type NoteParams = z.infer<typeof noteParamsSchema>;
export declare const createFolderSchema: z.ZodObject<{
    name: z.ZodString;
    parentFolderId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    parentFolderId: string | null;
}, {
    name: string;
    parentFolderId?: string | null | undefined;
}>;
export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export declare const updateFolderSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    parentFolderId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    parentFolderId?: string | null | undefined;
}, {
    name?: string | undefined;
    parentFolderId?: string | null | undefined;
}>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
export declare const folderParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type FolderParams = z.infer<typeof folderParamsSchema>;
