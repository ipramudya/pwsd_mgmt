// Export types
export type ExportFormat = 'encrypted' | 'plain';

export type ExportDataRequestDto = {
  format?: ExportFormat;
  decryptPasswords?: boolean;
};

export type ExportDataResponseDto = {
  fileData: ArrayBuffer;
  filename: string;
  contentType: string;
  contentLength: number;
};

export type ExportDataDto = {
  version: string;
  exportedAt: string;
  exportFormat: ExportFormat;
  user: {
    username: string;
    uuid: string;
  };
  data: {
    blocks: ExportedBlockDto[];
  };
  metadata: {
    totalBlocks: number;
    totalFields: number;
    exportSizeBytes: number;
    compressedSizeBytes: number;
    passwordsDecrypted: boolean;
  };
};

export type ExportedBlockDto = {
  uuid: string;
  name: string;
  description: string | null;
  blockType: 'container' | 'terminal';
  createdAt: string;
  updatedAt: string;
  parentUuid?: string;
  fields?: ExportedFieldDto[];
  children?: ExportedBlockDto[];
};

export type ExportedFieldDto = {
  uuid: string;
  name: string;
  type: 'text' | 'password' | 'todo';
  createdAt: string;
  updatedAt: string;
  data: ExportedTextFieldDto | ExportedPasswordFieldDto | ExportedTodoFieldDto;
};

export type ExportedTextFieldDto = {
  type: 'text';
  text: string;
};

export type ExportedPasswordFieldDto = {
  type: 'password';
  password: string;
  isEncrypted: boolean;
};

export type ExportedTodoFieldDto = {
  type: 'todo';
  isChecked: boolean;
};

// Import types
export type ImportDataRequestDto = {
  file: File;
  options?: ImportOptions;
};

export type ImportDataResponseDto = {
  success: boolean;
  summary: ImportSummaryDto;
  errors?: ImportErrorDto[];
};

export type ImportOptions = {
  overwriteExisting?: boolean;
  preserveUuids?: boolean;
  skipInvalidData?: boolean;
};

export type ImportSummaryDto = {
  blocksImported: number;
  fieldsImported: number;
  blocksSkipped: number;
  fieldsSkipped: number;
  blocksUpdated: number;
  fieldsUpdated: number;
};

export type ImportErrorDto = {
  type: 'block' | 'field';
  identifier: string;
  error: string;
};
