PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`path` text NOT NULL,
	`blockType` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`createdById` text NOT NULL,
	`parentId` integer,
	FOREIGN KEY (`createdById`) REFERENCES `accounts`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parentId`) REFERENCES `blocks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_blocks`("id", "uuid", "name", "description", "path", "blockType", "createdAt", "updatedAt", "createdById", "parentId") SELECT "id", "uuid", "name", "description", "path", "blockType", "createdAt", "updatedAt", "createdById", "parentId" FROM `blocks`;--> statement-breakpoint
DROP TABLE `blocks`;--> statement-breakpoint
ALTER TABLE `__new_blocks` RENAME TO `blocks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `blocks_uuid_unique` ON `blocks` (`uuid`);--> statement-breakpoint
CREATE INDEX `blocks_uuid_idx` ON `blocks` (`uuid`);--> statement-breakpoint
CREATE INDEX `blocks_created_by_idx` ON `blocks` (`createdById`);--> statement-breakpoint
CREATE INDEX `blocks_parent_idx` ON `blocks` (`parentId`);--> statement-breakpoint
CREATE INDEX `blocks_path_idx` ON `blocks` (`path`);--> statement-breakpoint
CREATE INDEX `blocks_block_type_idx` ON `blocks` (`blockType`);--> statement-breakpoint
CREATE INDEX `blocks_container_parent_idx` ON `blocks` (`parentId`,`blockType`);--> statement-breakpoint
ALTER TABLE `accounts` ADD `passwordHashVersion` text DEFAULT 'bcrypt' NOT NULL;--> statement-breakpoint
ALTER TABLE `accounts` ADD `passwordSalt` text;--> statement-breakpoint
ALTER TABLE `fields` ALTER COLUMN "createdById" TO "createdById" text NOT NULL REFERENCES accounts(uuid) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fields` ALTER COLUMN "blockId" TO "blockId" text NOT NULL REFERENCES blocks(uuid) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_fields` ALTER COLUMN "fieldId" TO "fieldId" text NOT NULL REFERENCES fields(uuid) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `text_fields` ALTER COLUMN "fieldId" TO "fieldId" text NOT NULL REFERENCES fields(uuid) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `todo_fields` ALTER COLUMN "fieldId" TO "fieldId" text NOT NULL REFERENCES fields(uuid) ON DELETE cascade ON UPDATE no action;