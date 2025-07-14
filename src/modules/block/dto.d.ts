export type CreateBlockRequestDto = {
  name: string;
  description?: string;
  parentId?: string;
  blockType: 'container' | 'terminal';
};

export type GetBlocksRequestDto = {
  limit?: number;
  cursor?: string;
  sort?: 'asc' | 'desc';
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  parentId?: string;
};

export type GetBreadcrumbsRequestDto = {
  blockId: string;
};

export type BreadcrumbDto = {
  id: number;
  uuid: string;
  name: string;
};

export type GetBreadcrumbsResponseDto = {
  breadcrumbs: BreadcrumbDto[];
};

export type MoveBlockRequestDto = {
  targetParentId?: string;
};

import type { FieldWithDataDto } from '../field/dto';

export type BlockDto = {
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
  fields?: FieldWithDataDto[]; // Only populated for terminal blocks
};

export type CreateBlockResponseDto = {
  block: BlockDto;
};

export type GetBlocksResponseDto = {
  blocks: BlockDto[];
  nextCursor: string | null;
  hasNext: boolean;
  total: number;
};

export type CreateBlockInput = {
  uuid: string;
  name: string;
  description?: string;
  path: string;
  blockType: 'container' | 'terminal';
  createdById: string;
  parentId?: number;
};

export type BlockRecord = {
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

export type GetBlocksQuery = {
  limit: number;
  cursor?: string;
  sort: 'asc' | 'desc';
  sortBy: 'createdAt' | 'updatedAt' | 'name';
  parentPath: string;
  createdById: string;
};

export type UpdateBlockInput = {
  uuid: string;
  name?: string;
  description?: string;
};

export type MoveBlockInput = {
  uuid: string;
  newPath: string;
  newParentId: number | null;
};

export type RecentBlocksRequestDto = {
  days?: number;
};

export type RecentBlocksResponseDto = {
  blocks: BlockDto[];
  count: number;
  timeframe: number;
};

export type RecentBlocksQuery = {
  days: number;
  createdById: string;
};
