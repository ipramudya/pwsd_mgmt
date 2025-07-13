import { randomUUID } from 'node:crypto';
import { NotFoundError, ValidationError } from '../../lib/error-handler';
import { getLogger } from '../../lib/logger';
import type { AppContext } from '../../types';
import { FieldService } from '../field/service';
import { validateBlockTypeForChildren } from './block-type';
import type {
  BlockDto,
  BlockRecord,
  CreateBlockRequestDto,
  CreateBlockResponseDto,
  GetBlocksRequestDto,
  GetBlocksResponseDto,
  GetBreadcrumbsRequestDto,
  GetBreadcrumbsResponseDto,
  MoveBlockRequestDto,
} from './dto';
import { BlockRepository } from './repository';

export class BlockService {
  private repository: BlockRepository;
  private fieldService: FieldService;
  private logger: ReturnType<typeof getLogger>;

  constructor(c: AppContext) {
    this.repository = new BlockRepository(c);
    this.fieldService = new FieldService(c);
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
    }

    const blockUuid = randomUUID();

    if (parentBlock) {
      try {
        validateBlockTypeForChildren(parentBlock.blockType);
      } catch {
        this.logger.warn(
          { parentId: input.parentId, parentBlockType: parentBlock.blockType },
          'Block creation failed: cannot add child blocks to terminal blocks'
        );
        throw new ValidationError('Cannot add child blocks to terminal blocks');
      }
    }

    const createdBlock = await this.repository.createBlock({
      uuid: blockUuid,
      name: input.name,
      description: input.description,
      path: parentBlock
        ? `${parentBlock.path}${parentBlock.id}/`
        : `/${Date.now()}/`,
      blockType: input.blockType,
      createdById,
      parentId: parentBlock?.id,
    });

    if (parentBlock) {
      const correctPath = `${parentBlock.path}${createdBlock.id}/`;
      await this.repository.updateBlock({
        uuid: blockUuid,
        name: input.name,
        description: input.description,
      });

      await this.repository.moveBlock({
        uuid: blockUuid,
        newPath: correctPath,
        newParentId: parentBlock.id,
      });

      const updatedBlock = await this.repository.findBlockByUuid(blockUuid);
      if (!updatedBlock) {
        throw new Error('Failed to retrieve updated block');
      }
      return {
        block: this.toBlockDto(updatedBlock),
      };
    }

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
        parentId: input.parentId,
        sort: input.sort,
        sortBy: input.sortBy,
      },
      'Attempting to get blocks'
    );

    let parentPath = '/';

    if (input.parentId) {
      const parentBlock = await this.repository.findBlockByUuid(input.parentId);
      if (!parentBlock) {
        throw new NotFoundError('Parent block not found');
      }
      if (parentBlock.createdById !== createdById) {
        throw new NotFoundError('Parent block not found');
      }
      parentPath = `${parentBlock.path}${parentBlock.id}/`;
    }

    const query = {
      limit: input.limit || 10,
      cursor: input.cursor,
      sort: input.sort || 'desc',
      sortBy: input.sortBy || 'createdAt',
      parentPath,
      createdById,
    };

    const result = await this.repository.getBlocks(query);

    // Transform blocks and include fields for terminal blocks
    const transformedBlocks = await Promise.all(
      result.blocks.map(async (block) => {
        const blockDto = this.toBlockDto(block);

        // If it's a terminal block, include its fields
        if (block.blockType === 'terminal') {
          try {
            const fields =
              await this.fieldService.getFieldsWithDecryptedPasswords(
                block.uuid,
                createdById
              );
            blockDto.fields = fields;
          } catch (error) {
            // If there's an error getting fields, log it but don't fail the whole request
            this.logger.warn(
              {
                blockId: block.uuid,
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              'Failed to retrieve fields for terminal block'
            );
            blockDto.fields = [];
          }
        }

        return blockDto;
      })
    );

    this.logger.info(
      {
        createdById,
        foundBlocks: transformedBlocks.length,
        total: result.total,
        hasNext: !!result.nextCursor,
      },
      'Blocks with fields retrieved successfully'
    );

    return {
      blocks: transformedBlocks,
      nextCursor: result.nextCursor,
      hasNext: !!result.nextCursor,
      total: result.total,
    };
  }

  async getBreadcrumbs(
    input: GetBreadcrumbsRequestDto,
    createdById: string
  ): Promise<GetBreadcrumbsResponseDto> {
    this.logger.info(
      { blockId: input.blockId, createdById },
      'Getting breadcrumbs'
    );

    const block = await this.repository.findBlockByUuid(input.blockId);
    if (!block) {
      throw new NotFoundError('Block not found');
    }

    if (block.createdById !== createdById) {
      throw new NotFoundError('Block not found');
    }

    const breadcrumbs = await this.repository.getBreadcrumbs(input.blockId);

    this.logger.info(
      { blockId: input.blockId, breadcrumbCount: breadcrumbs.length },
      'Breadcrumbs retrieved successfully'
    );

    return { breadcrumbs };
  }

  async updateBlock(
    uuid: string,
    input: Partial<CreateBlockRequestDto>,
    createdById: string
  ): Promise<CreateBlockResponseDto> {
    this.logger.info({ uuid, createdById }, 'Updating block');

    const existingBlock = await this.repository.findBlockByUuid(uuid);
    if (!existingBlock || existingBlock.createdById !== createdById) {
      throw new NotFoundError('Block not found');
    }

    const updatedBlock = await this.repository.updateBlock({
      uuid,
      name: input.name,
      description: input.description,
    });

    this.logger.info({ uuid }, 'Block updated successfully');

    return {
      block: this.toBlockDto(updatedBlock),
    };
  }

  async moveBlock(
    uuid: string,
    input: MoveBlockRequestDto,
    createdById: string
  ): Promise<void> {
    this.logger.info(
      { uuid, targetParentId: input.targetParentId },
      'Moving block'
    );

    const blockToMove = await this.repository.findBlockByUuid(uuid);
    if (!blockToMove || blockToMove.createdById !== createdById) {
      throw new NotFoundError('Block not found');
    }

    let newPath: string;
    let newParentId: number | null = null;

    if (input.targetParentId) {
      const targetParent = await this.repository.findBlockByUuid(
        input.targetParentId
      );
      if (!targetParent || targetParent.createdById !== createdById) {
        throw new NotFoundError('Target parent block not found');
      }

      if (targetParent.path.startsWith(blockToMove.path)) {
        throw new ValidationError('Cannot move block to its own descendant');
      }

      newPath = `${targetParent.path}${targetParent.id}/${blockToMove.id}/`;
      newParentId = targetParent.id;
    } else {
      newPath = `/${blockToMove.id}/`;
    }

    await this.repository.moveBlock({
      uuid,
      newPath,
      newParentId,
    });

    this.logger.info({ uuid }, 'Block moved successfully');
  }

  async deleteBlock(
    uuid: string,
    createdById: string,
    confirmationName: string
  ): Promise<void> {
    this.logger.info({ uuid, createdById }, 'Deleting block');

    const block = await this.repository.findBlockByUuid(uuid);
    if (!block || block.createdById !== createdById) {
      throw new NotFoundError('Block not found');
    }

    if (block.name !== confirmationName) {
      throw new ValidationError('Block name confirmation does not match');
    }

    await this.repository.deleteBlock(uuid);

    this.logger.info({ uuid }, 'Block deleted successfully');
  }

  private toBlockDto(block: BlockRecord): BlockDto {
    return {
      id: block.id,
      uuid: block.uuid,
      name: block.name,
      description: block.description,
      path: block.path,
      blockType: block.blockType,
      createdAt: block.createdAt,
      updatedAt: block.updatedAt,
      createdById: block.createdById,
      parentId: block.parentId,
    };
  }
}
