import {
  and,
  asc,
  desc,
  eq,
  isNotNull,
  like,
  or,
  type SQL,
  sql,
} from 'drizzle-orm';
import { createDatabase, type Database } from '../../lib/database';
import { DatabaseError } from '../../lib/error-handler';
import { getLogger } from '../../lib/logger';
import { blocks, fields } from '../../lib/schemas';
import type { AppContext } from '../../types';
import type {
  SearchFieldMatchRecord,
  SearchRecord,
  SearchRequestDto,
} from './dto';

export class SearchRepository {
  private db: Database;
  private logger: ReturnType<typeof getLogger>;

  constructor(c: AppContext) {
    this.db = createDatabase(c);
    this.logger = getLogger(c, 'search-repository');
  }

  async searchBlocks(
    input: SearchRequestDto,
    userId: string
  ): Promise<{
    blocks: SearchRecord[];
    total: number;
    nextCursor: string | null;
  }> {
    try {
      this.logger.info(
        { query: input.query, userId, blockType: input.blockType },
        'Searching blocks by name and description'
      );

      const searchPattern = `%${input.query}%`;
      const limit = input.limit || 20;
      const offset = input.cursor ? Number.parseInt(input.cursor, 10) : 0;

      const baseConditions = this.buildBlockSearchConditions(
        userId,
        searchPattern,
        input.blockType
      );
      const orderBy = this.buildBlockOrderBy(input, searchPattern);

      const searchResults = await this.executeBlockSearch(
        baseConditions,
        orderBy,
        limit,
        offset
      );

      const total = await this.getBlockSearchCount(baseConditions);
      const { results, hasNext, nextCursor } = this.processPaginationResults(
        searchResults,
        limit,
        offset
      );

      this.logger.info(
        {
          query: input.query,
          foundResults: results.length,
          total,
          hasNext,
        },
        'Block search completed successfully'
      );

      return { blocks: results, total, nextCursor };
    } catch (error) {
      this.logger.error(error, 'Failed to search blocks');
      throw new DatabaseError('Failed to search blocks');
    }
  }

  private buildBlockSearchConditions(
    userId: string,
    searchPattern: string,
    blockType?: string
  ): SQL[] {
    const nameCondition = like(blocks.name, searchPattern);
    const descCondition = and(
      isNotNull(blocks.description),
      like(blocks.description, searchPattern)
    );

    const conditions: SQL[] = [
      eq(blocks.createdById, userId),
      or(nameCondition, descCondition) as SQL,
    ];

    if (blockType && blockType !== 'all') {
      conditions.push(
        eq(blocks.blockType, blockType as 'container' | 'terminal')
      );
    }

    return conditions;
  }

  private buildBlockOrderBy(
    input: SearchRequestDto,
    searchPattern: string
  ): SQL | SQL[] {
    switch (input.sortBy) {
      case 'name':
        return input.sort === 'asc' ? asc(blocks.name) : desc(blocks.name);
      case 'createdAt':
        return input.sort === 'asc'
          ? asc(blocks.createdAt)
          : desc(blocks.createdAt);
      case 'updatedAt':
        return input.sort === 'asc'
          ? asc(blocks.updatedAt)
          : desc(blocks.updatedAt);
      default:
        return [
          sql`CASE 
            WHEN ${blocks.name} LIKE ${searchPattern} THEN 1 
            WHEN ${blocks.description} LIKE ${searchPattern} THEN 2 
            ELSE 3 
          END`,
          desc(blocks.updatedAt),
        ];
    }
  }

  private executeBlockSearch(
    conditions: SQL[],
    orderBy: SQL | SQL[],
    limit: number,
    offset: number
  ) {
    return this.db
      .select()
      .from(blocks)
      .where(and(...conditions))
      .orderBy(...(Array.isArray(orderBy) ? orderBy : [orderBy]))
      .limit(limit + 1)
      .offset(offset);
  }

  private async getBlockSearchCount(conditions: SQL[]): Promise<number> {
    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(blocks)
      .where(and(...conditions));

    return countResult?.count || 0;
  }

  private processPaginationResults<T>(
    results: T[],
    limit: number,
    offset: number
  ) {
    const hasNext = results.length > limit;
    const paginatedResults = hasNext ? results.slice(0, limit) : results;
    const nextCursor = hasNext ? String(offset + limit) : null;

    return {
      results: paginatedResults,
      hasNext,
      nextCursor,
    };
  }

  async searchFieldsInTerminalBlocks(
    input: SearchRequestDto,
    userId: string
  ): Promise<{
    fieldMatches: SearchFieldMatchRecord[];
    total: number;
    nextCursor: string | null;
  }> {
    try {
      this.logger.info(
        { query: input.query, userId },
        'Searching fields in terminal blocks'
      );

      const searchPattern = `%${input.query}%`;
      const limit = input.limit || 20;
      const offset = input.cursor ? Number.parseInt(input.cursor, 10) : 0;

      const conditions = this.buildFieldSearchConditions(userId, searchPattern);
      const orderBy = this.buildFieldOrderBy(searchPattern);

      const fieldMatches = await this.executeFieldSearch(
        conditions,
        orderBy,
        limit,
        offset
      );

      const total = await this.getFieldSearchCount(conditions);
      const { results, hasNext, nextCursor } = this.processPaginationResults(
        fieldMatches,
        limit,
        offset
      );

      this.logger.info(
        {
          query: input.query,
          foundFieldMatches: results.length,
          total,
          hasNext,
        },
        'Field search completed successfully'
      );

      return { fieldMatches: results, total, nextCursor };
    } catch (error) {
      this.logger.error(error, 'Failed to search fields');
      throw new DatabaseError('Failed to search fields');
    }
  }

  private buildFieldSearchConditions(
    userId: string,
    searchPattern: string
  ): SQL[] {
    return [
      eq(blocks.createdById, userId),
      eq(blocks.blockType, 'terminal'),
      like(fields.name, searchPattern),
    ];
  }

  private buildFieldOrderBy(searchPattern: string): SQL[] {
    return [
      sql`CASE 
        WHEN ${fields.name} LIKE ${searchPattern} THEN 1 
        ELSE 2 
      END`,
      desc(blocks.updatedAt),
    ];
  }

  private executeFieldSearch(
    conditions: SQL[],
    orderBy: SQL[],
    limit: number,
    offset: number
  ) {
    return this.db
      .select({
        blockId: blocks.id,
        blockUuid: blocks.uuid,
        blockName: blocks.name,
        blockDescription: blocks.description,
        blockPath: blocks.path,
        blockType: blocks.blockType,
        blockCreatedAt: blocks.createdAt,
        blockUpdatedAt: blocks.updatedAt,
        blockCreatedById: blocks.createdById,
        blockParentId: blocks.parentId,
        fieldId: fields.id,
        fieldUuid: fields.uuid,
        fieldName: fields.name,
        fieldType: fields.type,
        fieldCreatedAt: fields.createdAt,
        fieldUpdatedAt: fields.updatedAt,
        fieldCreatedById: fields.createdById,
      })
      .from(blocks)
      .innerJoin(fields, eq(fields.blockId, blocks.uuid))
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit + 1)
      .offset(offset);
  }

  private async getFieldSearchCount(conditions: SQL[]): Promise<number> {
    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(blocks)
      .innerJoin(fields, eq(fields.blockId, blocks.uuid))
      .where(and(...conditions));

    return countResult?.count || 0;
  }

  async getBreadcrumbs(
    blockId: number
  ): Promise<{ id: number; uuid: string; name: string }[]> {
    try {
      this.logger.info({ blockId }, 'Getting breadcrumbs for search result');

      // Get the target block first to extract its path
      const [targetBlock] = await this.db
        .select()
        .from(blocks)
        .where(eq(blocks.id, blockId))
        .limit(1);

      if (!targetBlock) {
        return [];
      }

      // Extract parent IDs from path (e.g., "/123/456/789/" -> [123, 456, 789])
      const pathSegments = targetBlock.path
        .split('/')
        .filter((segment) => segment && !Number.isNaN(Number(segment)))
        .map(Number);

      if (pathSegments.length === 0) {
        return [];
      }

      // Get all parent blocks in the path
      const parentBlocks = await this.db
        .select({
          id: blocks.id,
          uuid: blocks.uuid,
          name: blocks.name,
        })
        .from(blocks)
        .where(or(...pathSegments.map((id) => eq(blocks.id, id))));

      // Sort breadcrumbs by path order
      const sortedBreadcrumbs = pathSegments
        .map((pathId) => parentBlocks.find((block) => block.id === pathId))
        .filter(
          (block): block is { id: number; uuid: string; name: string } =>
            !!block
        );

      this.logger.info(
        { blockId, breadcrumbCount: sortedBreadcrumbs.length },
        'Breadcrumbs retrieved successfully'
      );

      return sortedBreadcrumbs;
    } catch (error) {
      this.logger.error(error, 'Failed to get breadcrumbs');
      throw new DatabaseError('Failed to get breadcrumbs');
    }
  }
}
