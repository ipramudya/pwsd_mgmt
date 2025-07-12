import { and, asc, desc, eq, gt, like, lt, sql } from 'drizzle-orm';
import { createDatabase, type Database } from '../../lib/database';
import { DatabaseError } from '../../lib/error-handler';
import { getLogger } from '../../lib/logger';
import { blocks } from '../../lib/schemas';
import type { AppContext } from '../../types';
import type {
  BlockRecord,
  BreadcrumbDto,
  CreateBlockInput,
  GetBlocksQuery,
  MoveBlockInput,
  UpdateBlockInput,
} from './dto';

export class BlockRepository {
  private db: Database;
  private logger: ReturnType<typeof getLogger>;

  constructor(c: AppContext) {
    this.db = createDatabase(c);
    this.logger = getLogger(c, 'block-repository');
  }

  async createBlock(input: CreateBlockInput): Promise<BlockRecord> {
    try {
      this.logger.info(
        { uuid: input.uuid, name: input.name, createdById: input.createdById },
        'Creating block'
      );

      const [result] = await this.db
        .insert(blocks)
        .values({
          uuid: input.uuid,
          name: input.name,
          description: input.description || null,
          path: input.path,
          blockType: input.blockType,
          createdById: input.createdById,
          parentId: input.parentId || null,
        })
        .returning();

      this.logger.info(
        { uuid: input.uuid, blockId: result.id },
        'Block created successfully'
      );

      return {
        id: result.id,
        uuid: result.uuid,
        name: result.name,
        description: result.description,
        path: result.path,
        blockType: result.blockType as 'container' | 'terminal',
        createdAt: new Date(Number(result.createdAt) * 1000),
        updatedAt: new Date(Number(result.updatedAt) * 1000),
        createdById: result.createdById,
        parentId: result.parentId,
      };
    } catch (error) {
      this.logger.error(
        { uuid: input.uuid, name: input.name, error },
        'Failed to create block'
      );
      throw new DatabaseError('Failed to create block', { error });
    }
  }

  async findBlockByUuid(uuid: string): Promise<BlockRecord | null> {
    try {
      this.logger.info({ uuid }, 'Finding block by uuid');

      const [block] = await this.db
        .select()
        .from(blocks)
        .where(eq(blocks.uuid, uuid))
        .limit(1);

      if (!block) {
        this.logger.info({ uuid }, 'Block not found by uuid');
        return null;
      }

      this.logger.info({ uuid, blockId: block.id }, 'Block found by uuid');

      return {
        id: block.id,
        uuid: block.uuid,
        name: block.name,
        blockType: block.blockType,
        description: block.description,
        path: block.path,
        createdAt: new Date(Number(block.createdAt) * 1000),
        updatedAt: new Date(Number(block.updatedAt) * 1000),
        createdById: block.createdById,
        parentId: block.parentId,
      };
    } catch (error) {
      this.logger.error({ uuid, error }, 'Failed to find block by uuid');
      throw new DatabaseError('Failed to find block by uuid', { error });
    }
  }

  async getBlocks(query: GetBlocksQuery): Promise<{
    blocks: BlockRecord[];
    nextCursor: string | null;
    total: number;
  }> {
    try {
      this.logger.info(query, 'Getting blocks with query');

      const baseConditions = and(
        eq(blocks.createdById, query.createdById),
        like(blocks.path, `${query.parentPath}%`),
        sql`LENGTH(${blocks.path}) - LENGTH(REPLACE(${blocks.path}, '/', '')) = LENGTH(${query.parentPath}) - LENGTH(REPLACE(${query.parentPath}, '/', '')) + 1`
      );

      let whereCondition = baseConditions;

      if (query.cursor) {
        const cursorCondition =
          query.sort === 'desc'
            ? lt(blocks[query.sortBy], query.cursor)
            : gt(blocks[query.sortBy], query.cursor);
        whereCondition = and(baseConditions, cursorCondition);
      }

      const orderDirection = query.sort === 'desc' ? desc : asc;
      const sortColumn = blocks[query.sortBy];

      const results = await this.db
        .select()
        .from(blocks)
        .where(whereCondition)
        .orderBy(orderDirection(sortColumn))
        .limit(query.limit + 1);

      const hasNext = results.length > query.limit;
      const blockResults = hasNext ? results.slice(0, -1) : results;

      const transformedBlocks: BlockRecord[] = blockResults.map((block) => ({
        id: block.id,
        uuid: block.uuid,
        name: block.name,
        description: block.description,
        path: block.path,
        blockType: block.blockType as 'container' | 'terminal',
        createdAt: new Date(Number(block.createdAt) * 1000),
        updatedAt: new Date(Number(block.updatedAt) * 1000),
        createdById: block.createdById,
        parentId: block.parentId,
      }));

      const nextCursor =
        hasNext && blockResults.length > 0
          ? String(blockResults.at(-1)?.[query.sortBy])
          : null;

      const [totalResult] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(blocks)
        .where(baseConditions);

      this.logger.info(
        {
          foundBlocks: transformedBlocks.length,
          hasNext,
          nextCursor,
          total: totalResult.count,
        },
        'Blocks retrieved successfully'
      );

      return {
        blocks: transformedBlocks,
        nextCursor,
        total: totalResult.count,
      };
    } catch (error) {
      this.logger.error({ query, error }, 'Failed to get blocks');
      throw new DatabaseError('Failed to get blocks', { error });
    }
  }

  async updateBlock(input: UpdateBlockInput): Promise<BlockRecord> {
    try {
      this.logger.info({ uuid: input.uuid }, 'Updating block');

      const updateData: Record<string, unknown> = {
        updatedAt: sql`(unixepoch())`,
      };

      if (input.name !== undefined) {
        updateData.name = input.name;
      }
      if (input.description !== undefined) {
        updateData.description = input.description;
      }

      const [result] = await this.db
        .update(blocks)
        .set(updateData)
        .where(eq(blocks.uuid, input.uuid))
        .returning();

      if (!result) {
        throw new DatabaseError('Block not found for update');
      }

      this.logger.info({ uuid: input.uuid }, 'Block updated successfully');

      return {
        id: result.id,
        uuid: result.uuid,
        name: result.name,
        description: result.description,
        path: result.path,
        blockType: result.blockType as 'container' | 'terminal',
        createdAt: new Date(Number(result.createdAt) * 1000),
        updatedAt: new Date(Number(result.updatedAt) * 1000),
        createdById: result.createdById,
        parentId: result.parentId,
      };
    } catch (error) {
      this.logger.error({ uuid: input.uuid, error }, 'Failed to update block');
      throw new DatabaseError('Failed to update block', { error });
    }
  }

  async moveBlock(input: MoveBlockInput): Promise<void> {
    try {
      this.logger.info(
        { uuid: input.uuid, newPath: input.newPath },
        'Moving block'
      );

      const block = await this.findBlockByUuid(input.uuid);
      if (!block) {
        throw new DatabaseError('Block not found for move operation');
      }

      const oldPath = block.path;
      const newPath = input.newPath;

      await this.db.transaction(async (tx) => {
        await tx
          .update(blocks)
          .set({
            path: newPath,
            parentId: input.newParentId,
            updatedAt: sql`(unixepoch())`,
          })
          .where(eq(blocks.uuid, input.uuid));

        const descendants = await tx
          .select()
          .from(blocks)
          .where(like(blocks.path, `${oldPath}%`));

        const updatePromises = descendants
          .filter((descendant) => descendant.path !== oldPath)
          .map((descendant) => {
            const newDescendantPath = descendant.path.replace(oldPath, newPath);
            return tx
              .update(blocks)
              .set({
                path: newDescendantPath,
                updatedAt: sql`(unixepoch())`,
              })
              .where(eq(blocks.id, descendant.id));
          });

        await Promise.all(updatePromises);
      });

      this.logger.info({ uuid: input.uuid }, 'Block moved successfully');
    } catch (error) {
      this.logger.error({ uuid: input.uuid, error }, 'Failed to move block');
      throw new DatabaseError('Failed to move block', { error });
    }
  }

  async getBreadcrumbs(blockUuid: string): Promise<BreadcrumbDto[]> {
    try {
      this.logger.info({ blockUuid }, 'Getting breadcrumbs for block');

      const block = await this.findBlockByUuid(blockUuid);
      if (!block) {
        throw new DatabaseError('Block not found for breadcrumbs');
      }

      const pathSegments = block.path.split('/').filter(Boolean).map(Number);

      if (pathSegments.length === 0) {
        return [];
      }

      const breadcrumbBlocks = await this.db
        .select({
          id: blocks.id,
          uuid: blocks.uuid,
          name: blocks.name,
        })
        .from(blocks)
        .where(sql`${blocks.id} IN (${pathSegments.join(',')})`)
        .orderBy(
          sql`CASE ${pathSegments.map((id, index) => `WHEN ${blocks.id} = ${id} THEN ${index}`).join(' ')} END`
        );

      this.logger.info(
        { blockUuid, breadcrumbCount: breadcrumbBlocks.length },
        'Breadcrumbs retrieved successfully'
      );

      return breadcrumbBlocks;
    } catch (error) {
      this.logger.error({ blockUuid, error }, 'Failed to get breadcrumbs');
      throw new DatabaseError('Failed to get breadcrumbs', { error });
    }
  }

  async deleteBlock(uuid: string): Promise<void> {
    try {
      this.logger.info({ uuid }, 'Deleting block and descendants');

      const block = await this.findBlockByUuid(uuid);
      if (!block) {
        throw new DatabaseError('Block not found for deletion');
      }

      await this.db.delete(blocks).where(like(blocks.path, `${block.path}%`));

      this.logger.info({ uuid }, 'Block and descendants deleted successfully');
    } catch (error) {
      this.logger.error({ uuid, error }, 'Failed to delete block');
      throw new DatabaseError('Failed to delete block', { error });
    }
  }
}
