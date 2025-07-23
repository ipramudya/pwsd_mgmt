import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { gunzip, gzip } from 'node:zlib';
import { inject, injectable } from 'tsyringe';
import { ValidationError } from '../../lib/error-handler';
import { getLogger } from '../../lib/logger';
import type { AppContext } from '../../types';
import type { BlockRecord, CreateBlockInput } from '../block/dto';
import type {
  CreateFieldInput,
  CreatePasswordFieldInput,
  CreateTextFieldInput,
  CreateTodoFieldInput,
} from '../field/dto';
import {
  decryptPasswordFromStorage,
  encryptPasswordForStorage,
} from '../field/password-encryption';
import type {
  ExportDataDto,
  ExportDataRequestDto,
  ExportDataResponseDto,
  ExportedBlockDto,
  ExportedFieldDto,
  ImportDataRequestDto,
  ImportDataResponseDto,
  ImportErrorDto,
  ImportSummaryDto,
} from './dto';
import DataTransferRepository from './repository.di';
import type { FieldWithData, ProcessBlockOptions, UserRecord } from './types';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// Regex constants for filename generation
const TIMESTAMP_REGEX_1 = /[-:]/g;
const TIMESTAMP_REGEX_2 = /\..+/;

@injectable()
export default class DataTransferService {
  constructor(
    @inject(DataTransferRepository)
    private readonly repository: DataTransferRepository
  ) {}

  async exportUserData(
    c: AppContext,
    options: ExportDataRequestDto,
    userId: string
  ): Promise<ExportDataResponseDto> {
    const logger = getLogger(c, 'data-transfer-service');

    logger.info(
      {
        userId,
        format: options.format,
        decryptPasswords: options.decryptPasswords,
      },
      'Starting user data export'
    );

    try {
      const { user, blocks, fields } = await this.repository.getAllUserData(
        c,
        userId
      );

      const fieldsByBlock = this.groupFieldsByBlock(fields);
      const exportedBlocks = this.convertBlocksToExportFormat(
        c,
        blocks,
        fieldsByBlock,
        options
      );
      const rootBlocks = this.buildHierarchy(blocks, exportedBlocks);
      const exportData = this.createExportData(
        user,
        rootBlocks,
        blocks,
        fields.map((f) => ({ id: f.field.id })),
        options
      );

      return await this.compressAndFinalize(c, exportData, user.username);
    } catch (error) {
      logger.error(
        {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to export user data'
      );
      throw error;
    }
  }

  private groupFieldsByBlock(fields: FieldWithData[]) {
    const fieldsByBlock = new Map<string, FieldWithData[]>();
    for (const field of fields) {
      const blockUuid = field.field.blockId;
      if (!fieldsByBlock.has(blockUuid)) {
        fieldsByBlock.set(blockUuid, []);
      }
      fieldsByBlock.get(blockUuid)?.push(field);
    }
    return fieldsByBlock;
  }

  private convertBlocksToExportFormat(
    c: AppContext,
    blocks: BlockRecord[],
    fieldsByBlock: Map<string, FieldWithData[]>,
    options: ExportDataRequestDto
  ) {
    const blockMap = new Map(blocks.map((b) => [b.id, b]));
    const exportedBlocks = new Map<number, ExportedBlockDto>();

    for (const block of blocks) {
      const exportedFields = this.processBlockFields(
        c,
        block,
        fieldsByBlock,
        options
      );

      const exportedBlock: ExportedBlockDto = {
        uuid: block.uuid,
        name: block.name,
        description: block.description,
        blockType: block.blockType,
        createdAt: block.createdAt.toISOString(),
        updatedAt: block.updatedAt.toISOString(),
        parentUuid: block.parentId
          ? blockMap.get(block.parentId)?.uuid
          : undefined,
        fields: exportedFields.length > 0 ? exportedFields : undefined,
        children: [],
      };

      exportedBlocks.set(block.id, exportedBlock);
    }

    return exportedBlocks;
  }

  private processBlockFields(
    c: AppContext,
    block: Pick<BlockRecord, 'uuid' | 'blockType'>,
    fieldsByBlock: Map<string, FieldWithData[]>,
    options: ExportDataRequestDto
  ): ExportedFieldDto[] {
    const exportedFields: ExportedFieldDto[] = [];

    if (block.blockType === 'terminal') {
      const blockFields = fieldsByBlock.get(block.uuid) || [];

      for (const fieldWithData of blockFields) {
        const field = fieldWithData.field;
        const fieldData = this.processFieldData(
          c,
          fieldWithData,
          field,
          options
        );

        exportedFields.push({
          uuid: field.uuid,
          name: field.name,
          type: field.type,
          createdAt: field.createdAt.toISOString(),
          updatedAt: field.updatedAt.toISOString(),
          data: fieldData,
        });
      }
    }

    return exportedFields;
  }

  private processFieldData(
    c: AppContext,
    fieldWithData: FieldWithData,
    field: FieldWithData['field'],
    options: ExportDataRequestDto
  ): ExportedFieldDto['data'] {
    const logger = getLogger(c, 'data-transfer-service');

    switch (field.type) {
      case 'text':
        return {
          type: 'text',
          text: fieldWithData.textField?.text || '',
        };
      case 'password': {
        const encryptedPassword = fieldWithData.passwordField?.password || '';
        let passwordValue = encryptedPassword;
        let isEncrypted = true;

        if (options.format === 'plain' && options.decryptPasswords) {
          try {
            passwordValue = decryptPasswordFromStorage(encryptedPassword);
            isEncrypted = false;
          } catch (error) {
            logger.warn(
              {
                fieldId: field.uuid,
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              'Failed to decrypt password, keeping encrypted'
            );
          }
        }

        return {
          type: 'password',
          password: passwordValue,
          isEncrypted,
        };
      }
      case 'todo':
        return {
          type: 'todo',
          isChecked: Boolean(fieldWithData.todoField?.isChecked),
        };
      default:
        throw new ValidationError(`Unknown field type: ${field.type}`);
    }
  }

  private buildHierarchy(
    blocks: Pick<BlockRecord, 'id' | 'parentId'>[],
    exportedBlocks: Map<number, ExportedBlockDto>
  ): ExportedBlockDto[] {
    const rootBlocks: ExportedBlockDto[] = [];

    for (const block of blocks) {
      const exportedBlock = exportedBlocks.get(block.id);
      if (!exportedBlock) {
        continue;
      }

      if (block.parentId) {
        const parent = exportedBlocks.get(block.parentId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(exportedBlock);
        }
      } else {
        rootBlocks.push(exportedBlock);
      }
    }

    this.cleanupEmptyChildren(rootBlocks);
    return rootBlocks;
  }

  private cleanupEmptyChildren(blocks: ExportedBlockDto[]): void {
    const cleanupChildren = (block: ExportedBlockDto) => {
      if (block.children && block.children.length === 0) {
        block.children = undefined;
      } else if (block.children) {
        block.children.forEach(cleanupChildren);
      }
    };
    blocks.forEach(cleanupChildren);
  }

  private createExportData(
    user: UserRecord,
    rootBlocks: ExportedBlockDto[],
    blocks: Array<{ id: number }>,
    fields: Array<{ id: number }>,
    options: ExportDataRequestDto
  ): ExportDataDto {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportFormat: options.format || 'encrypted',
      user: {
        username: user.username,
        uuid: user.uuid,
      },
      data: {
        blocks: rootBlocks,
      },
      metadata: {
        totalBlocks: blocks.length,
        totalFields: fields.length,
        exportSizeBytes: 0,
        compressedSizeBytes: 0,
        passwordsDecrypted:
          options.format === 'plain' && options.decryptPasswords === true,
      },
    };
  }

  private async compressAndFinalize(
    c: AppContext,
    exportData: ExportDataDto,
    username: string
  ): Promise<ExportDataResponseDto> {
    const logger = getLogger(c, 'data-transfer-service');

    const jsonString = JSON.stringify(exportData);
    exportData.metadata.exportSizeBytes = Buffer.from(
      jsonString,
      'utf8'
    ).length;

    const compressedBuffer = await gzipAsync(jsonString);
    exportData.metadata.compressedSizeBytes = compressedBuffer.length;

    const timestamp = new Date()
      .toISOString()
      .replace(TIMESTAMP_REGEX_1, '')
      .replace(TIMESTAMP_REGEX_2, '')
      .replace('T', '_');

    const filename = `${timestamp}_${username}_export.json.gz`;

    logger.info(
      {
        filename,
        originalSize: exportData.metadata.exportSizeBytes,
        compressedSize: exportData.metadata.compressedSizeBytes,
        compressionRatio: (
          (1 -
            exportData.metadata.compressedSizeBytes /
              exportData.metadata.exportSizeBytes) *
          100
        ).toFixed(1),
        totalBlocks: exportData.metadata.totalBlocks,
        totalFields: exportData.metadata.totalFields,
      },
      'User data exported successfully'
    );

    return {
      fileData: compressedBuffer.buffer.slice(
        compressedBuffer.byteOffset,
        compressedBuffer.byteOffset + compressedBuffer.byteLength
      ) as ArrayBuffer,
      filename,
      contentType: 'application/gzip',
      contentLength: compressedBuffer.length,
    };
  }

  async importUserData(
    c: AppContext,
    importRequest: ImportDataRequestDto,
    userId: string
  ): Promise<ImportDataResponseDto> {
    const logger = getLogger(c, 'data-transfer-service');

    logger.info(
      {
        userId,
        fileName: importRequest.file.name,
        fileSize: importRequest.file.size,
        options: importRequest.options,
      },
      'Starting user data import'
    );

    const summary: ImportSummaryDto = {
      blocksImported: 0,
      fieldsImported: 0,
      blocksSkipped: 0,
      fieldsSkipped: 0,
      blocksUpdated: 0,
      fieldsUpdated: 0,
    };

    const errors: ImportErrorDto[] = [];
    const processedBlocks = new Set<string>();

    try {
      // Parse the uploaded file
      const exportData = await this.parseImportFile(c, importRequest.file);

      if (!exportData) {
        throw new ValidationError('Invalid import file format');
      }

      const options: ProcessBlockOptions = {
        overwriteExisting: importRequest.options?.overwriteExisting ?? false,
        preserveUuids: importRequest.options?.preserveUuids ?? true,
        skipInvalidData: importRequest.options?.skipInvalidData ?? false,
      };

      // Clear existing data if overwriting
      if (options.overwriteExisting) {
        await this.repository.clearAllUserData(c, userId);
        logger.info({ userId }, 'Cleared existing user data for import');
      }

      // Collect all blocks for processing
      const allBlocks: ExportedBlockDto[] = [];
      const collectBlocks = (blocks: ExportedBlockDto[]) => {
        for (const block of blocks) {
          allBlocks.push(block);
          if (block.children) {
            collectBlocks(block.children);
          }
        }
      };
      collectBlocks(exportData.data.blocks);

      // Process blocks in dependency order
      const blockIdMap = new Map<string, number>();
      const blocksToCreate: CreateBlockInput[] = [];
      const fieldsToCreate: CreateFieldInput[] = [];
      const textFieldsToCreate: CreateTextFieldInput[] = [];
      const passwordFieldsToCreate: CreatePasswordFieldInput[] = [];
      const todoFieldsToCreate: CreateTodoFieldInput[] = [];

      const processBlock = async (block: ExportedBlockDto): Promise<void> => {
        if (processedBlocks.has(block.uuid)) {
          return;
        }

        // Process parent first if exists
        if (block.parentUuid) {
          const parentBlock = allBlocks.find(
            (b) => b.uuid === block.parentUuid
          );
          if (parentBlock) {
            await this.processParentBlock(
              parentBlock,
              allBlocks,
              processBlock,
              processedBlocks
            );
          }
        }

        // Process current block
        await this.processSingleBlock(
          c,
          block,
          options,
          userId,
          summary,
          errors,
          processedBlocks,
          blockIdMap,
          blocksToCreate,
          fieldsToCreate,
          textFieldsToCreate,
          passwordFieldsToCreate,
          todoFieldsToCreate
        );
      };

      // Process all blocks sequentially to maintain dependency order
      const processBlocksRecursively = async (
        blocksToProcess: ExportedBlockDto[],
        index = 0
      ): Promise<void> => {
        if (index >= blocksToProcess.length) {
          return;
        }

        await processBlock(blocksToProcess[index]);
        await processBlocksRecursively(blocksToProcess, index + 1);
      };

      await processBlocksRecursively(allBlocks);

      // Batch import all data
      if (blocksToCreate.length > 0 || fieldsToCreate.length > 0) {
        await this.repository.batchImportData(
          c,
          blocksToCreate,
          fieldsToCreate,
          textFieldsToCreate,
          passwordFieldsToCreate,
          todoFieldsToCreate
        );
      }

      logger.info(
        {
          userId,
          summary,
          errorsCount: errors.length,
        },
        'User data import completed'
      );

      return {
        success: errors.length === 0,
        summary,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      logger.error(
        {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to import user data'
      );
      throw error;
    }
  }

  private async parseImportFile(
    c: AppContext,
    file: File
  ): Promise<ExportDataDto | null> {
    const logger = getLogger(c, 'data-transfer-service');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Try to parse as JSON first (uncompressed)
      try {
        const jsonString = new TextDecoder().decode(buffer);
        const parsed = JSON.parse(jsonString);
        if (this.isValidExportData(parsed)) {
          return parsed;
        }
      } catch {
        // Not JSON, continue to try gzip
      }

      // Try to decompress as gzip
      try {
        const decompressed = await gunzipAsync(buffer);
        const jsonString = decompressed.toString('utf8');
        const parsed = JSON.parse(jsonString);
        if (this.isValidExportData(parsed)) {
          return parsed;
        }
      } catch {
        // Not gzip, return null
      }

      return null;
    } catch (error) {
      logger.error(
        {
          fileName: file.name,
          fileSize: file.size,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to parse import file'
      );
      return null;
    }
  }

  private isValidExportData(data: unknown): data is ExportDataDto {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const exportData = data as ExportDataDto;

    return (
      typeof exportData.version === 'string' &&
      typeof exportData.exportedAt === 'string' &&
      typeof exportData.exportFormat === 'string' &&
      exportData.user &&
      typeof exportData.user.username === 'string' &&
      typeof exportData.user.uuid === 'string' &&
      exportData.data &&
      Array.isArray(exportData.data.blocks)
    );
  }

  private async processParentBlock(
    block: ExportedBlockDto,
    allBlocks: ExportedBlockDto[],
    processBlock: (blockToProcess: ExportedBlockDto) => Promise<void>,
    processedBlocks: Set<string>
  ): Promise<void> {
    if (block.parentUuid) {
      const parentBlock = allBlocks.find((b) => b.uuid === block.parentUuid);
      if (parentBlock && !processedBlocks.has(parentBlock.uuid)) {
        await processBlock(parentBlock);
      }
    }
  }

  private async processSingleBlock(
    c: AppContext,
    block: ExportedBlockDto,
    options: ProcessBlockOptions,
    userId: string,
    summary: ImportSummaryDto,
    errors: ImportErrorDto[],
    processedBlocks: Set<string>,
    blockIdMap: Map<string, number>,
    blocksToCreate: CreateBlockInput[],
    fieldsToCreate: CreateFieldInput[],
    textFieldsToCreate: CreateTextFieldInput[],
    passwordFieldsToCreate: CreatePasswordFieldInput[],
    todoFieldsToCreate: CreateTodoFieldInput[]
  ): Promise<void> {
    try {
      const blockUuid = options.preserveUuids ? block.uuid : randomUUID();

      const shouldSkip = await this.shouldSkipExistingBlock(
        c,
        blockUuid,
        block.uuid,
        options,
        summary,
        errors,
        processedBlocks
      );
      if (shouldSkip) {
        return;
      }

      const blockInput = this.createBlockInput(
        block,
        blockUuid,
        userId,
        options,
        blockIdMap,
        blocksToCreate
      );

      blocksToCreate.push(blockInput);
      blockIdMap.set(block.uuid, blocksToCreate.length);

      if (block.blockType === 'terminal' && block.fields) {
        this.processImportBlockFields(
          block.fields,
          options,
          userId,
          blockUuid,
          summary,
          errors,
          fieldsToCreate,
          textFieldsToCreate,
          passwordFieldsToCreate,
          todoFieldsToCreate
        );
      }

      summary.blocksImported++;
      processedBlocks.add(block.uuid);
    } catch (blockError) {
      this.handleBlockImportError(
        blockError,
        block.uuid,
        options,
        summary,
        errors
      );
    }
  }

  private processImportBlockFields(
    fields: ExportedFieldDto[],
    options: ProcessBlockOptions,
    userId: string,
    blockUuid: string,
    summary: ImportSummaryDto,
    errors: ImportErrorDto[],
    fieldsToCreate: CreateFieldInput[],
    textFieldsToCreate: CreateTextFieldInput[],
    passwordFieldsToCreate: CreatePasswordFieldInput[],
    todoFieldsToCreate: CreateTodoFieldInput[]
  ): void {
    for (const field of fields) {
      try {
        const fieldUuid = options.preserveUuids ? field.uuid : randomUUID();

        const fieldInput: CreateFieldInput = {
          uuid: fieldUuid,
          name: field.name,
          type: field.type,
          createdById: userId,
          blockId: blockUuid,
        };

        fieldsToCreate.push(fieldInput);

        // Create type-specific field data
        this.processImportFieldData(
          field,
          fieldUuid,
          textFieldsToCreate,
          passwordFieldsToCreate,
          todoFieldsToCreate
        );

        summary.fieldsImported++;
      } catch (fieldError) {
        summary.fieldsSkipped++;
        if (!options.skipInvalidData) {
          errors.push({
            type: 'field',
            identifier: field.uuid,
            error: `Field import error: ${fieldError instanceof Error ? fieldError.message : 'Unknown error'}`,
          });
        }
      }
    }
  }

  private processImportFieldData(
    field: ExportedFieldDto,
    fieldUuid: string,
    textFieldsToCreate: CreateTextFieldInput[],
    passwordFieldsToCreate: CreatePasswordFieldInput[],
    todoFieldsToCreate: CreateTodoFieldInput[]
  ): void {
    switch (field.type) {
      case 'text': {
        const textData = field.data as { text: string };
        textFieldsToCreate.push({
          text: textData.text,
          fieldId: fieldUuid,
        });
        break;
      }
      case 'password': {
        const passwordData = field.data as {
          password: string;
          isEncrypted: boolean;
        };
        let passwordValue = passwordData.password;

        // Re-encrypt if password was decrypted for export
        if (!passwordData.isEncrypted) {
          passwordValue = encryptPasswordForStorage(passwordData.password);
        }

        passwordFieldsToCreate.push({
          password: passwordValue,
          fieldId: fieldUuid,
        });
        break;
      }
      case 'todo': {
        const todoData = field.data as { isChecked: boolean };
        todoFieldsToCreate.push({
          isChecked: Boolean(todoData.isChecked),
          fieldId: fieldUuid,
        });
        break;
      }
      default:
        throw new ValidationError(`Unknown field type: ${field.type}`);
    }
  }

  private async shouldSkipExistingBlock(
    c: AppContext,
    blockUuid: string,
    originalBlockUuid: string,
    options: Pick<ProcessBlockOptions, 'overwriteExisting' | 'skipInvalidData'>,
    summary: ImportSummaryDto,
    errors: ImportErrorDto[],
    processedBlocks: Set<string>
  ): Promise<boolean> {
    if (
      (await this.repository.blockExists(c, blockUuid)) &&
      !options.overwriteExisting
    ) {
      if (options.skipInvalidData) {
        summary.blocksSkipped++;
        processedBlocks.add(originalBlockUuid);
        return true;
      }
      errors.push({
        type: 'block',
        identifier: originalBlockUuid,
        error: 'Block already exists and overwrite is disabled',
      });
      return true;
    }
    return false;
  }

  private createBlockInput(
    block: ExportedBlockDto,
    blockUuid: string,
    userId: string,
    options: Pick<ProcessBlockOptions, 'preserveUuids'>,
    blockIdMap: Map<string, number>,
    blocksToCreate: CreateBlockInput[]
  ): CreateBlockInput {
    const parentId = block.parentUuid ? blockIdMap.get(block.parentUuid) : null;
    let path = '/';

    if (parentId && block.parentUuid) {
      const parentBlockInput = blocksToCreate.find((b) =>
        options.preserveUuids
          ? b.uuid === block.parentUuid
          : blockIdMap.get(block.parentUuid || '') ===
            blocksToCreate.indexOf(b) + 1
      );
      if (parentBlockInput) {
        path = `${parentBlockInput.path}${parentId}/`;
      }
    }

    return {
      uuid: blockUuid,
      name: block.name,
      description: block.description || undefined,
      path,
      blockType: block.blockType,
      createdById: userId,
      parentId: parentId || undefined,
    };
  }

  private handleBlockImportError(
    blockError: unknown,
    blockUuid: string,
    options: Pick<ProcessBlockOptions, 'skipInvalidData'>,
    summary: ImportSummaryDto,
    errors: ImportErrorDto[]
  ): void {
    summary.blocksSkipped++;
    if (!options.skipInvalidData) {
      errors.push({
        type: 'block',
        identifier: blockUuid,
        error: `Block import error: ${blockError instanceof Error ? blockError.message : 'Unknown error'}`,
      });
    }
  }
}
