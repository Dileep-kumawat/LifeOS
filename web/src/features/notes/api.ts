import { apiClient } from "../../lib/apiClient";
import type {
  Note,
  NoteFolder,
  NotesListResponse,
  FoldersResponse,
  TagsResponse
} from "./types";

export interface ListNotesParams {
  folderId?: string | null;
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const notesApi = {
  async list(params: ListNotesParams): Promise<NotesListResponse> {
    const response = await apiClient.get("/notes", { params });
    return response.data;
  },

  async get(id: string): Promise<Note> {
    const response = await apiClient.get(`/notes/${id}`);
    return response.data.note;
  },

  async create(input: {
    title: string;
    content?: unknown;
    folderId?: string | null;
    tags?: string[];
  }): Promise<Note> {
    const response = await apiClient.post("/notes", input);
    return response.data.note;
  },

  async update(
    id: string,
    input: {
      title?: string;
      content?: unknown;
      folderId?: string | null;
      tags?: string[];
    }
  ): Promise<Note> {
    const response = await apiClient.patch(`/notes/${id}`, input);
    return response.data.note;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/notes/${id}`);
  },

  async listFolders(): Promise<NoteFolder[]> {
    const response = await apiClient.get<FoldersResponse>("/notes/folders");
    return response.data.folders;
  },

  async createFolder(input: { name: string; parentFolderId?: string | null }): Promise<NoteFolder> {
    const response = await apiClient.post("/notes/folders", input);
    return response.data.folder;
  },

  async renameFolder(id: string, input: { name?: string; parentFolderId?: string | null }): Promise<NoteFolder> {
    const response = await apiClient.patch(`/notes/folders/${id}`, input);
    return response.data.folder;
  },

  async deleteFolder(id: string): Promise<void> {
    await apiClient.delete(`/notes/folders/${id}`);
  },

  async listTags(): Promise<string[]> {
    const response = await apiClient.get<TagsResponse>("/notes/tags");
    return response.data.tags;
  }
};