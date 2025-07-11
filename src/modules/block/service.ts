import { randomUUID } from 'node:crypto';
import { NotFoundError } from '../../lib/error-handler';
import { getLogger } from '../../lib/logger';
import type { AppContext } from '../../types';
import type {
  BlockDto,
  BlockRecord,
  CreateBlockRequestDto,
  CreateBlockResponseDto,
  GetBlocksRequestDto,
  GetBlocksResponseDto,
} from './dto';
import { BlockRepository } from './repository';

export class BlockService {
  private repository: BlockRepository;
  private logger: ReturnType<typeof getLogger>;

  constructor(c: AppContext) {
    this.repository = new BlockRepository(c);
    this.logger = getLogger(c, 'block-service');
  }

  async createBlock(
    input: CreateBlockRequestDto,
    createdById: string
  ): Promise<CreateBlockResponseDto> {
    this.logger.info(
      { name: input.name, createdById, parentId: input.parentId },
      'Attempting to create block'
    );

    let deepLevel = 0;
    let parentBlock: BlockRecord | null = null;

    if (input.parentId) {
      parentBlock = await this.repository.findBlockByUuid(input.parentId);
      if (!parentBlock) {
        this.logger.warn(
          { parentId: input.parentId },
          'Block creation failed: parent block not found'
        );
        throw new NotFoundError('Parent block not found');
      }

      if (parentBlock.createdById !== createdById) {
        this.logger.warn(
          {
            parentId: input.parentId,
            createdById,
            parentCreatedById: parentBlock.createdById,
          },
          'Block creation failed: parent block not owned by user'
        );
        throw new NotFoundError('Parent block not found');
      }

      deepLevel = parentBlock.deepLevel + 1;
    }

    const blockUuid = randomUUID();

    const createdBlock = await this.repository.createBlock({
      uuid: blockUuid,
      name: input.name,
      description: input.description,
      deepLevel,
      isFinal: input.isFinal ?? false,
      createdById,
      parentId: input.parentId,
    });

    this.logger.info(
      { blockUuid, name: input.name, createdById },
      'Block created successfully'
    );

    return {
      block: this.toBlockDto(createdBlock),
    };
  }

  async getBlocks(
    input: GetBlocksRequestDto,
    createdById: string
  ): Promise<GetBlocksResponseDto> {
    this.logger.info(
      {
        createdById,
        limit: input.limit,
        deepLevel: input.deepLevel,
        sort: input.sort,
        sortBy: input.sortBy,
      },
      'Attempting to get blocks'
    );

    const query = {
      limit: input.limit || 10,
      cursor: input.cursor,
      sort: input.sort || 'desc',
      sortBy: input.sortBy || 'createdAt',
      deepLevel: input.deepLevel ?? 0,
      createdById,
    };

    const result = await this.repository.getBlocks(query);

    const transformedBlocks = result.blocks.map((block) =>
      this.toBlockDto(block)
    );

    this.logger.info(
      {
        createdById,
        foundBlocks: transformedBlocks.length,
        total: result.total,
        hasNext: !!result.nextCursor,
      },
      'Blocks retrieved successfully'
    );

    return {
      blocks: transformedBlocks,
      nextCursor: result.nextCursor,
      hasNext: !!result.nextCursor,
      total: result.total,
    };
  }

  private toBlockDto(block: BlockRecord): BlockDto {
    return {
      id: block.id,
      uuid: block.uuid,
      name: block.name,
      description: block.description,
      deepLevel: block.deepLevel,
      isFinal: block.isFinal,
      createdAt: block.createdAt,
      updatedAt: block.updatedAt,
      createdById: block.createdById,
      parentId: block.parentId,
    };
  }
}
