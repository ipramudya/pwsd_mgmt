import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  like,
  lt,
  sql,
  type SQL,
} from 'drizzle-orm';
import { container, injectable } from 'tsyringe';
import { createDatabase } from '../../lib/database';
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
  RecentBlocksQuery,
  UpdateBlockInput,
} from './dto';

@injectable()
export default class BlockRepository {
  async createBlock(
    c: AppContext,
    input: CreateBlockInput
  ): Promise<BlockRecord> {
    const logger = getLogger(c, 'block-repository');
    const db = createDatabase(c);

    try {
      logger.info(
        { uuid: input.uuid, name: input.name, createdById: input.createdById },
        'Creating block'
      );

      const [result] = await db
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

      logger.info(
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
      logger.error(
        { uuid: input.uuid, name: input.name, error },
        'Failed to create block'
      );
      throw new DatabaseError('Failed to create block', { error });
    }
  }

  async findBlockByUuid(
    c: AppContext,
    uuid: string
  ): Promise<BlockRecord | null> {
    const logger = getLogger(c, 'block-repository');
    const db = createDatabase(c);

    try {
      logger.info({ uuid }, 'Finding block by uuid');

      const [block] = await db
        .select()
        .from(blocks)
        .where(eq(blocks.uuid, uuid))
        .limit(1);

      if (!block) {
        logger.info({ uuid }, 'Block not found by uuid');
        return null;
      }

      logger.info({ uuid, blockId: block.id }, 'Block found by uuid');

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
      logger.error({ uuid, error }, 'Failed to find block by uuid');
      throw new DatabaseError('Failed to find block by uuid', { error });
    }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Legacy function needs refactoring
  async getBlocks(
    c: AppContext,
    query: GetBlocksQuery
  ): Promise<{
    blocks: BlockRecord[];
    nextCursor: string | null;
    total: number;
  }> {
    const logger = getLogger(c, 'block-repository');
    const db = createDatabase(c);

    try {
      logger.info(query, 'Getting blocks with query');

      const baseConditions = and(
        eq(blocks.createdById, query.createdById),
        like(blocks.path, `${query.parentPath}%`),
        sql`LENGTH(${blocks.path}) - LENGTH(REPLACE(${blocks.path}, '/', '')) = LENGTH(${query.parentPath}) - LENGTH(REPLACE(${query.parentPath}, '/', '')) + 1`
      );

      let whereCondition = baseConditions;

      if (query.cursor) {
        try {
          let cursorCondition: SQL | undefined;

          if (query.sortBy === 'createdAt' || query.sortBy === 'updatedAt') {
            // For date fields, convert cursor to Date object
            let dateCursor: Date | undefined;

            const date = new Date(query.cursor);
            if (Number.isNaN(date.getTime())) {
              // If invalid date, try to parse as numeric timestamp
              const numericCursor = Number(query.cursor);
              if (Number.isNaN(numericCursor)) {
                logger.warn(
                  { cursor: query.cursor, sortBy: query.sortBy },
                  'Invalid cursor value, skipping cursor-based pagination'
                );
                dateCursor = undefined;
              } else {
                // Treat as Unix timestamp and convert to Date
                dateCursor = new Date(numericCursor * 1000);
              }
            } else {
              dateCursor = date;
            }

            if (dateCursor && !Number.isNaN(dateCursor.getTime())) {
              cursorCondition =
                query.sort === 'desc'
                  ? lt(blocks[query.sortBy], dateCursor)
                  : gt(blocks[query.sortBy], dateCursor);
            }
          } else if (query.sortBy === 'name') {
            // For name field, use string cursor
            cursorCondition =
              query.sort === 'desc'
                ? lt(blocks[query.sortBy], query.cursor)
                : gt(blocks[query.sortBy], query.cursor);
          } else if (query.sortBy === 'blockType') {
            // For blockType field, validate cursor value and use string cursor
            if (query.cursor === 'container' || query.cursor === 'terminal') {
              cursorCondition =
                query.sort === 'desc'
                  ? gt(blocks[query.sortBy], query.cursor) // Reversed because we reverse sort direction
                  : lt(blocks[query.sortBy], query.cursor);
            } else {
              logger.warn(
                { cursor: query.cursor, sortBy: query.sortBy },
                'Invalid blockType cursor value, skipping cursor-based pagination'
              );
              whereCondition = baseConditions;
            }
          }

          if (cursorCondition) {
            whereCondition = and(baseConditions, cursorCondition);
          }
        } catch (error) {
          logger.warn(
            { cursor: query.cursor, sortBy: query.sortBy, error },
            'Failed to parse cursor, skipping cursor-based pagination'
          );
          whereCondition = baseConditions;
        }
      }

      const orderDirection = query.sort === 'desc' ? desc : asc;

      let orderByClause: SQL[];
      if (query.sortBy === 'blockType') {
        // For blockType sorting: 'desc' = container first, 'asc' = terminal first
        // Container comes before terminal alphabetically, so we reverse the sort direction
        const blockTypeDirection = query.sort === 'desc' ? asc : desc;
        orderByClause = [
          blockTypeDirection(blocks.blockType),
          desc(blocks.createdAt),
        ];
      } else {
        const sortColumn = blocks[query.sortBy];
        orderByClause = [orderDirection(sortColumn)];
      }

      const results = await db
        .select()
        .from(blocks)
        .where(whereCondition)
        .orderBy(...orderByClause)
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

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(blocks)
        .where(baseConditions);

      logger.info(
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
      logger.error({ query, error }, 'Failed to get blocks');
      throw new DatabaseError('Failed to get blocks', { error });
    }
  }

  async updateBlock(
    c: AppContext,
    input: UpdateBlockInput
  ): Promise<BlockRecord> {
    const logger = getLogger(c, 'block-repository');
    const db = createDatabase(c);

    try {
      logger.info({ uuid: input.uuid }, 'Updating block');

      const updateData: Record<string, unknown> = {
        updatedAt: sql`(unixepoch())`,
      };

      if (input.name !== undefined) {
        updateData.name = input.name;
      }
      if (input.description !== undefined) {
        updateData.description = input.description;
      }

      const [result] = await db
        .update(blocks)
        .set(updateData)
        .where(eq(blocks.uuid, input.uuid))
        .returning();

      if (!result) {
        throw new DatabaseError('Block not found for update');
      }

      logger.info({ uuid: input.uuid }, 'Block updated successfully');

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
      logger.error({ uuid: input.uuid, error }, 'Failed to update block');
      throw new DatabaseError('Failed to update block', { error });
    }
  }

  async moveBlock(c: AppContext, input: MoveBlockInput): Promise<void> {
    const logger = getLogger(c, 'block-repository');
    const db = createDatabase(c);

    try {
      logger.info({ uuid: input.uuid, newPath: input.newPath }, 'Moving block');

      const block = await this.findBlockByUuid(c, input.uuid);
      if (!block) {
        throw new DatabaseError('Block not found for move operation');
      }

      const oldPath = block.path;
      const newPath = input.newPath;

      await db.transaction(async (tx) => {
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

      logger.info({ uuid: input.uuid }, 'Block moved successfully');
    } catch (error) {
      logger.error({ uuid: input.uuid, error }, 'Failed to move block');
      throw new DatabaseError('Failed to move block', { error });
    }
  }

  async getBreadcrumbs(
    c: AppContext,
    blockUuid: string
  ): Promise<BreadcrumbDto[]> {
    const logger = getLogger(c, 'block-repository');
    const db = createDatabase(c);

    try {
      logger.info({ blockUuid }, 'Getting breadcrumbs for block');

      const block = await this.findBlockByUuid(c, blockUuid);
      if (!block) {
        throw new DatabaseError('Block not found for breadcrumbs');
      }

      // Extract parent IDs from path and include current block
      // Filter out UUIDs and keep only numeric IDs
      const rawSegments = block.path.split('/').filter(Boolean);
      const pathSegments = rawSegments
        .map((segment) => {
          const num = Number(segment);
          if (Number.isNaN(num)) {
            logger.warn(
              { blockUuid, segment, fullPath: block.path },
              'Found non-numeric segment in block path - this should not happen'
            );
            return null;
          }
          return num;
        })
        .filter((id): id is number => id !== null);
      const allBlockIds = [...pathSegments, block.id];

      if (allBlockIds.length === 1) {
        // Only current block, return it as single breadcrumb (root level)
        return [
          {
            id: block.id,
            uuid: block.uuid,
            name: block.name,
            path: `/${block.uuid}`,
          },
        ];
      }

      // Query all blocks in the hierarchy (parents + current)
      const breadcrumbBlocks = await db
        .select({
          id: blocks.id,
          uuid: blocks.uuid,
          name: blocks.name,
        })
        .from(blocks)
        .where(inArray(blocks.id, allBlockIds))
        .orderBy(
          sql`CASE ${sql.join(
            allBlockIds.map(
              (id, index) => sql`WHEN ${blocks.id} = ${id} THEN ${index}`
            ),
            sql` `
          )} END`
        );

      // Build incremental paths for navigation
      const breadcrumbsWithPaths: BreadcrumbDto[] = breadcrumbBlocks.map(
        (breadcrumb, index) => ({
          id: breadcrumb.id,
          uuid: breadcrumb.uuid,
          name: breadcrumb.name,
          path: `/${breadcrumbBlocks
            .slice(0, index + 1)
            .map((b) => b.uuid)
            .join('/')}`,
        })
      );

      logger.info(
        { blockUuid, breadcrumbCount: breadcrumbsWithPaths.length },
        'Breadcrumbs retrieved successfully'
      );

      return breadcrumbsWithPaths;
    } catch (error) {
      logger.error({ blockUuid, error }, 'Failed to get breadcrumbs');
      throw new DatabaseError('Failed to get breadcrumbs', { error });
    }
  }

  async deleteBlock(c: AppContext, uuid: string): Promise<void> {
    const logger = getLogger(c, 'block-repository');
    const db = createDatabase(c);

    try {
      logger.info({ uuid }, 'Deleting block and descendants');

      const block = await this.findBlockByUuid(c, uuid);
      if (!block) {
        throw new DatabaseError('Block not found for deletion');
      }

      await db.delete(blocks).where(like(blocks.path, `${block.path}%`));

      logger.info({ uuid }, 'Block and descendants deleted successfully');
    } catch (error) {
      logger.error({ uuid, error }, 'Failed to delete block');
      throw new DatabaseError('Failed to delete block', { error });
    }
  }

  async getRecentBlocks(
    c: AppContext,
    query: RecentBlocksQuery
  ): Promise<BlockRecord[]> {
    const logger = getLogger(c, 'block-repository');
    const db = createDatabase(c);

    try {
      logger.info(
        { days: query.days, createdById: query.createdById },
        'Getting recently created blocks'
      );

      const now = new Date();
      const dateThreshold = new Date(
        now.getTime() - query.days * 24 * 60 * 60 * 1000
      );

      const results = await db
        .select()
        .from(blocks)
        .where(
          and(
            eq(blocks.createdById, query.createdById),
            gte(blocks.createdAt, dateThreshold)
          )
        )
        .orderBy(desc(blocks.createdAt))
        .limit(10);

      const transformedBlocks: BlockRecord[] = results.map((block) => ({
        id: block.id,
        uuid: block.uuid,
        name: block.name,
        description: block.description,
        path: block.path,
        blockType: block.blockType as 'container' | 'terminal',
        createdAt: block.createdAt,
        updatedAt: block.updatedAt,
        createdById: block.createdById,
        parentId: block.parentId,
      }));

      logger.info(
        { days: query.days, foundBlocks: transformedBlocks.length },
        'Recent blocks retrieved successfully'
      );

      return transformedBlocks;
    } catch (error) {
      logger.error({ query, error }, 'Failed to get recent blocks');
      throw new DatabaseError('Failed to get recent blocks', { error });
    }
  }

  async getRecentUpdatedBlocks(
    c: AppContext,
    query: RecentBlocksQuery
  ): Promise<BlockRecord[]> {
    const logger = getLogger(c, 'block-repository');
    const db = createDatabase(c);

    try {
      logger.info(
        { days: query.days, createdById: query.createdById },
        'Getting recently updated blocks'
      );

      const now = new Date();
      const dateThreshold = new Date(
        now.getTime() - query.days * 24 * 60 * 60 * 1000
      );

      const results = await db
        .select()
        .from(blocks)
        .where(
          and(
            eq(blocks.createdById, query.createdById),
            gte(blocks.updatedAt, dateThreshold)
          )
        )
        .orderBy(desc(blocks.updatedAt))
        .limit(10);

      const transformedBlocks: BlockRecord[] = results.map((block) => ({
        id: block.id,
        uuid: block.uuid,
        name: block.name,
        description: block.description,
        path: block.path,
        blockType: block.blockType as 'container' | 'terminal',
        createdAt: block.createdAt,
        updatedAt: block.updatedAt,
        createdById: block.createdById,
        parentId: block.parentId,
      }));

      logger.info(
        { days: query.days, foundBlocks: transformedBlocks.length },
        'Recent updated blocks retrieved successfully'
      );

      return transformedBlocks;
    } catch (error) {
      logger.error({ query, error }, 'Failed to get recent updated blocks');
      throw new DatabaseError('Failed to get recent updated blocks', { error });
    }
  }
}

container.registerSingleton(BlockRepository);
