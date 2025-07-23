import { container, inject, injectable } from 'tsyringe';
import { getLogger } from '../../lib/logger';
import type { AppContext } from '../../types';
import FieldService from '../field/service';
import type {
  SearchBlockResultDto,
  SearchBreadcrumbDto,
  SearchFieldMatchRecord,
  SearchRecord,
  SearchRequestDto,
  SearchResponseDto,
} from './dto';
import SearchRepository from './repository';

@injectable()
export default class SearchService {
  constructor(
    @inject(SearchRepository)
    private readonly repository: SearchRepository,
    @inject(FieldService)
    private readonly fieldService: FieldService
  ) {}

  async search(
    c: AppContext,
    input: SearchRequestDto,
    userId: string
  ): Promise<SearchResponseDto> {
    const logger = getLogger(c, 'search-service');

    logger.info(
      {
        query: input.query,
        userId,
        blockType: input.blockType,
        sortBy: input.sortBy,
        sort: input.sort,
      },
      'Starting comprehensive search'
    );

    // Perform parallel searches for blocks and fields
    const [blockSearchResult, fieldSearchResult] = await Promise.all([
      this.searchBlocks(c, input, userId),
      this.searchFieldsInTerminalBlocks(c, input, userId),
    ]);

    // Combine and deduplicate results
    const combinedResults = await this.combineSearchResults(
      c,
      blockSearchResult.blocks,
      fieldSearchResult.fieldMatches,
      input,
      userId
    );

    // Apply pagination to combined results
    const limit = input.limit || 20;
    const offset = input.cursor ? Number.parseInt(input.cursor, 10) : 0;
    const paginatedResults = combinedResults.slice(offset, offset + limit);
    const hasNext = combinedResults.length > offset + limit;
    const nextCursor = hasNext ? String(offset + limit) : null;

    const totalResults = blockSearchResult.total + fieldSearchResult.total;

    logger.info(
      {
        query: input.query,
        blockMatches: blockSearchResult.blocks.length,
        fieldMatches: fieldSearchResult.fieldMatches.length,
        combinedResults: combinedResults.length,
        paginatedResults: paginatedResults.length,
        totalResults,
      },
      'Search completed successfully'
    );

    return {
      results: paginatedResults,
      nextCursor,
      hasNext,
      total: totalResults,
      query: input.query,
    };
  }

  private async searchBlocks(
    c: AppContext,
    input: SearchRequestDto,
    userId: string
  ): Promise<{ blocks: SearchRecord[]; total: number }> {
    const result = await this.repository.searchBlocks(c, input, userId);
    return {
      blocks: result.blocks,
      total: result.total,
    };
  }

  private async searchFieldsInTerminalBlocks(
    c: AppContext,
    input: SearchRequestDto,
    userId: string
  ): Promise<{ fieldMatches: SearchFieldMatchRecord[]; total: number }> {
    const result = await this.repository.searchFieldsInTerminalBlocks(
      c,
      input,
      userId
    );
    return {
      fieldMatches: result.fieldMatches,
      total: result.total,
    };
  }

  private async combineSearchResults(
    c: AppContext,
    blockResults: SearchRecord[],
    fieldMatches: SearchFieldMatchRecord[],
    input: SearchRequestDto,
    userId: string
  ): Promise<SearchBlockResultDto[]> {
    const logger = getLogger(c, 'search-service');

    logger.info(
      {
        blockCount: blockResults.length,
        fieldMatchCount: fieldMatches.length,
      },
      'Combining search results'
    );

    const resultMap = new Map<string, SearchBlockResultDto>();

    // Process direct block matches
    await this.processBlockMatches(c, blockResults, input, userId, resultMap);

    // Process field matches
    await this.processFieldMatches(c, fieldMatches, userId, resultMap);

    const combinedResults = Array.from(resultMap.values());
    this.sortResultsByRelevance(combinedResults);

    logger.info(
      { combinedCount: combinedResults.length },
      'Search results combined and sorted'
    );

    return combinedResults;
  }

  private async processBlockMatches(
    c: AppContext,
    blockResults: SearchRecord[],
    input: SearchRequestDto,
    userId: string,
    resultMap: Map<string, SearchBlockResultDto>
  ): Promise<void> {
    const blockPromises = blockResults.map(async (block) => {
      const breadcrumbs = await this.repository.getBreadcrumbs(c, block.id);
      const relativePath = this.generateRelativePath(breadcrumbs, block.name);
      const matchType = this.determineBlockMatchType(block, input.query);

      const searchResult: SearchBlockResultDto = {
        ...block,
        breadcrumbs,
        relativePath,
        matchType,
        fields: undefined,
      };

      await this.addFieldsToTerminalBlock(c, searchResult, userId);
      return { uuid: block.uuid, result: searchResult };
    });

    const processedBlocks = await Promise.all(blockPromises);

    for (const { uuid, result } of processedBlocks) {
      resultMap.set(uuid, result);
    }
  }

  private async processFieldMatches(
    c: AppContext,
    fieldMatches: SearchFieldMatchRecord[],
    userId: string,
    resultMap: Map<string, SearchBlockResultDto>
  ): Promise<void> {
    const fieldPromises = fieldMatches
      .filter(
        (fieldMatch) =>
          !this.shouldSkipFieldMatch(fieldMatch.blockUuid, resultMap)
      )
      .map(async (fieldMatch) => {
        const searchResult = await this.createFieldMatchResult(
          c,
          fieldMatch,
          userId
        );
        return { uuid: fieldMatch.blockUuid, result: searchResult };
      });

    const processedFields = await Promise.all(fieldPromises);

    for (const { uuid, result } of processedFields) {
      resultMap.set(uuid, result);
    }
  }

  private shouldSkipFieldMatch(
    blockUuid: string,
    resultMap: Map<string, SearchBlockResultDto>
  ): boolean {
    if (resultMap.has(blockUuid)) {
      const existing = resultMap.get(blockUuid);
      if (existing) {
        return (
          existing.matchType === 'block_name' ||
          existing.matchType === 'block_description'
        );
      }
    }
    return false;
  }

  private async createFieldMatchResult(
    c: AppContext,
    fieldMatch: SearchFieldMatchRecord,
    userId: string
  ): Promise<SearchBlockResultDto> {
    const breadcrumbs = await this.repository.getBreadcrumbs(
      c,
      fieldMatch.blockId
    );
    const relativePath = this.generateRelativePath(
      breadcrumbs,
      fieldMatch.blockName
    );

    const searchResult: SearchBlockResultDto = {
      id: fieldMatch.blockId,
      uuid: fieldMatch.blockUuid,
      name: fieldMatch.blockName,
      description: fieldMatch.blockDescription,
      path: fieldMatch.blockPath,
      blockType: fieldMatch.blockType,
      createdAt: fieldMatch.blockCreatedAt,
      updatedAt: fieldMatch.blockUpdatedAt,
      createdById: fieldMatch.blockCreatedById,
      parentId: fieldMatch.blockParentId,
      breadcrumbs,
      relativePath,
      matchType: 'field_name',
      matchedField: {
        id: fieldMatch.fieldId,
        uuid: fieldMatch.fieldUuid,
        name: fieldMatch.fieldName,
        type: fieldMatch.fieldType,
      },
      fields: undefined,
    };

    await this.addFieldsToTerminalBlock(c, searchResult, userId);
    return searchResult;
  }

  private async addFieldsToTerminalBlock(
    c: AppContext,
    searchResult: SearchBlockResultDto,
    userId: string
  ): Promise<void> {
    if (searchResult.blockType === 'terminal') {
      const logger = getLogger(c, 'search-service');

      try {
        const fields = await this.fieldService.getFieldsWithDecryptedPasswords(
          c,
          searchResult.uuid,
          userId
        );
        searchResult.fields = fields;
      } catch (error) {
        logger.warn(
          {
            blockId: searchResult.uuid,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          'Failed to retrieve fields for terminal block in search results'
        );
        searchResult.fields = [];
      }
    }
  }

  private sortResultsByRelevance(results: SearchBlockResultDto[]): void {
    const priority = {
      block_name: 1,
      field_name: 2,
      block_description: 3,
    };

    results.sort((a, b) => {
      const aPriority = priority[a.matchType];
      const bPriority = priority[b.matchType];

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  private generateRelativePath(
    breadcrumbs: SearchBreadcrumbDto[],
    currentName: string
  ): string {
    const pathParts = breadcrumbs.map((b) => b.name);
    pathParts.push(currentName);
    return pathParts.length > 1 ? pathParts.join(' > ') : currentName;
  }

  private determineBlockMatchType(
    block: SearchRecord,
    query: string
  ): 'block_name' | 'block_description' {
    const lowerQuery = query.toLowerCase();
    const lowerName = block.name.toLowerCase();
    const lowerDescription = (block.description || '').toLowerCase();

    if (lowerName.includes(lowerQuery)) {
      return 'block_name';
    }
    if (lowerDescription.includes(lowerQuery)) {
      return 'block_description';
    }
    return 'block_name'; // Default fallback
  }
}

container.registerSingleton(SearchService);
