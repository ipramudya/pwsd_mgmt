export type CreateBlockRequestDto = {
  name: string;
  description?: string;
  parentId?: string;
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

export type BlockDto = {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  path: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  parentId: number | null;
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
  createdById: string;
  parentId?: number;
};

export type BlockRecord = {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  path: string;
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
