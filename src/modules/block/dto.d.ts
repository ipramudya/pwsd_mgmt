export type CreateBlockRequestDto = {
  name: string;
  description?: string;
  parentId?: string;
  isFinal?: boolean;
};

export type GetBlocksRequestDto = {
  limit?: number;
  cursor?: string;
  sort?: 'asc' | 'desc';
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  deepLevel?: number;
};

export type BlockDto = {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  deepLevel: number;
  isFinal: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  parentId: string | null;
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
  deepLevel: number;
  isFinal: boolean;
  createdById: string;
  parentId?: string;
};

export type BlockRecord = {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  deepLevel: number;
  isFinal: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  parentId: string | null;
};

export type GetBlocksQuery = {
  limit: number;
  cursor?: string;
  sort: 'asc' | 'desc';
  sortBy: 'createdAt' | 'updatedAt' | 'name';
  deepLevel: number;
  createdById: string;
};
