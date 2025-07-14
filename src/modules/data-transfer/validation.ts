import { z } from 'zod';
import { zValidator } from '../../lib/validator-wrapper';

// Export validation schema
const exportDataSchema = z.object({
  format: z.enum(['encrypted', 'plain']).default('encrypted'),
  decryptPasswords: z.boolean().default(false),
});

// Import validation schema - validates multipart form data
const importDataSchema = z.object({
  file: z
    .instanceof(File, { message: 'File is required' })
    .refine((file) => file.size > 0, 'File cannot be empty')
    .refine(
      (file) => file.size <= 50 * 1024 * 1024,
      'File size must be less than 50MB'
    )
    .refine((file) => {
      const allowedTypes = [
        'application/gzip',
        'application/x-gzip',
        'application/octet-stream',
        'application/json',
        'text/plain',
      ];
      return (
        allowedTypes.includes(file.type) ||
        file.name.endsWith('.gz') ||
        file.name.endsWith('.json')
      );
    }, 'File must be a valid export file (.gz, .json, or gzip compressed)'),
  options: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) {
        return;
      }
      try {
        return JSON.parse(val);
      } catch {
        return;
      }
    })
    .pipe(
      z
        .object({
          overwriteExisting: z.boolean().default(false),
          preserveUuids: z.boolean().default(true),
          skipInvalidData: z.boolean().default(false),
        })
        .optional()
    ),
});

export const dataTransferValidations = {
  exportData: zValidator(
    'json',
    exportDataSchema,
    'Export data validation failed'
  ),
  importData: zValidator(
    'form',
    importDataSchema,
    'Import data validation failed'
  ),
};
