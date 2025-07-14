import type { FieldWithDataDto } from '../field/dto';

export type SearchRequestDto = {
  query: string;
  blockType?: 'container' | 'terminal' | 'all';
  limit?: number;
  cursor?: string;
  sort?: 'asc' | 'desc';
  sortBy?: 'relevance' | 'name' | 'createdAt' | 'updatedAt';
};

export type SearchBreadcrumbDto = {
  id: number;
  uuid: string;
  name: string;
};

export type SearchBlockResultDto = {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  path: string;
  blockType: 'container' | 'terminal';
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  parentId: number | null;
  // Navigation support
  breadcrumbs: SearchBreadcrumbDto[];
  relativePath: string; // Human-readable path like "Root > Work > Projects"
  // Fields for terminal blocks
  fields?: FieldWithDataDto[];
  // Search metadata
  matchType: 'block_name' | 'block_description' | 'field_name';
  matchedField?: {
    id: number;
    uuid: string;
    name: string;
    type: 'text' | 'password' | 'todo';
  };
};

export type SearchResponseDto = {
  results: SearchBlockResultDto[];
  nextCursor: string | null;
  hasNext: boolean;
  total: number;
  query: string;
};

export type SearchRecord = {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  path: string;
  blockType: 'container' | 'terminal';
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  parentId: number | null;
};

export type SearchFieldMatchRecord = {
  blockId: number;
  blockUuid: string;
  blockName: string;
  blockDescription: string | null;
  blockPath: string;
  blockType: 'container' | 'terminal';
  blockCreatedAt: Date;
  blockUpdatedAt: Date;
  blockCreatedById: string;
  blockParentId: number | null;
  fieldId: number;
  fieldUuid: string;
  fieldName: string;
  fieldType: 'text' | 'password' | 'todo';
  fieldCreatedAt: Date;
  fieldUpdatedAt: Date;
  fieldCreatedById: string;
};
