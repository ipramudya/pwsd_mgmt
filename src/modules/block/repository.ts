import { and, asc, desc, eq, gt, lt, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { DatabaseError } from '../../lib/error-handler';
import { getLogger } from '../../lib/logger';
import { blocks } from '../../lib/schemas';
import type { AppContext } from '../../types';
import type { BlockRecord, CreateBlockInput, GetBlocksQuery } from './dto';

export class BlockRepository {
  private db: ReturnType<typeof drizzle>;
  private logger: ReturnType<typeof getLogger>;

  constructor(c: AppContext) {
    this.db = drizzle(c.env.DB);
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
          deepLevel: input.deepLevel,
          isFinal: input.isFinal,
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
        deepLevel: result.deepLevel,
        isFinal: Boolean(result.isFinal),
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
        description: block.description,
        deepLevel: block.deepLevel,
        isFinal: Boolean(block.isFinal),
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
        eq(blocks.deepLevel, query.deepLevel)
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
        deepLevel: block.deepLevel,
        isFinal: Boolean(block.isFinal),
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
}
