-- Migration to implement path enumeration for hierarchical blocks
-- 1. Add path column
-- 2. Remove deepLevel and isFinal columns  
-- 3. Change parentId from text to integer (numeric ID reference)
-- 4. Populate path values for existing data
-- 5. Add path index

-- Add new path column
ALTER TABLE `blocks` ADD COLUMN `path` text NOT NULL DEFAULT '/';

-- Update parentId column type and make it nullable integer
PRAGMA foreign_keys=OFF;

CREATE TABLE `__new_blocks` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `uuid` text NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `path` text NOT NULL,
  `createdAt` integer DEFAULT (unixepoch()) NOT NULL,
  `updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
  `createdById` text NOT NULL,
  `parentId` integer
);

-- Copy data with path generation based on current hierarchy
INSERT INTO `__new_blocks` (
  `id`, `uuid`, `name`, `description`, `path`, `createdAt`, 
  `updatedAt`, `createdById`, `parentId`
)
SELECT 
  b.`id`, 
  b.`uuid`, 
  b.`name`, 
  b.`description`,
  CASE 
    WHEN b.`parentId` IS NULL THEN '/' || b.`id` || '/'
    ELSE (
      SELECT '/' || p.`id` || '/' || b.`id` || '/'
      FROM `blocks` p 
      WHERE p.`uuid` = b.`parentId`
    )
  END as `path`,
  b.`createdAt`,
  b.`updatedAt`, 
  b.`createdById`,
  CASE 
    WHEN b.`parentId` IS NULL THEN NULL
    ELSE (
      SELECT p.`id`
      FROM `blocks` p 
      WHERE p.`uuid` = b.`parentId`
    )
  END as `parentId`
FROM `blocks` b;

DROP TABLE `blocks`;
ALTER TABLE `__new_blocks` RENAME TO `blocks`;

PRAGMA foreign_keys=ON;

-- Recreate all indexes
CREATE UNIQUE INDEX `blocks_uuid_unique` ON `blocks` (`uuid`);
CREATE INDEX `blocks_uuid_idx` ON `blocks` (`uuid`);
CREATE INDEX `blocks_created_by_idx` ON `blocks` (`createdById`);
CREATE INDEX `blocks_parent_idx` ON `blocks` (`parentId`);
CREATE INDEX `blocks_path_idx` ON `blocks` (`path`);