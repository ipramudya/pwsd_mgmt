CREATE TABLE `blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`deepLevel` integer DEFAULT 0 NOT NULL,
	`isFinal` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`createdById` text NOT NULL,
	`parentId` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `blocks_uuid_unique` ON `blocks` (`uuid`);--> statement-breakpoint
CREATE INDEX `blocks_uuid_idx` ON `blocks` (`uuid`);--> statement-breakpoint
CREATE INDEX `blocks_created_by_idx` ON `blocks` (`createdById`);--> statement-breakpoint
CREATE INDEX `blocks_parent_idx` ON `blocks` (`parentId`);--> statement-breakpoint
CREATE TABLE `fields` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`createdById` text NOT NULL,
	`blockId` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fields_uuid_unique` ON `fields` (`uuid`);--> statement-breakpoint
CREATE INDEX `fields_uuid_idx` ON `fields` (`uuid`);--> statement-breakpoint
CREATE INDEX `fields_created_by_idx` ON `fields` (`createdById`);--> statement-breakpoint
CREATE INDEX `fields_block_idx` ON `fields` (`blockId`);--> statement-breakpoint
CREATE INDEX `fields_type_idx` ON `fields` (`type`);--> statement-breakpoint
CREATE TABLE `password_fields` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`password` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`fieldId` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `password_fields_field_idx` ON `password_fields` (`fieldId`);--> statement-breakpoint
CREATE TABLE `text_fields` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`fieldId` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `text_fields_field_idx` ON `text_fields` (`fieldId`);--> statement-breakpoint
CREATE TABLE `todo_fields` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`isChecked` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`fieldId` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `todo_fields_field_idx` ON `todo_fields` (`fieldId`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch()) NOT NULL,
	`lastLoginAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_accounts`("id", "uuid", "username", "password", "createdAt", "updatedAt", "lastLoginAt") SELECT "id", "uuid", "username", "password", "createdAt", "updatedAt", "lastLoginAt" FROM `accounts`;--> statement-breakpoint
DROP TABLE `accounts`;--> statement-breakpoint
ALTER TABLE `__new_accounts` RENAME TO `accounts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_uuid_unique` ON `accounts` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_username_unique` ON `accounts` (`username`);--> statement-breakpoint
CREATE INDEX `accounts_uuid_idx` ON `accounts` (`uuid`);--> statement-breakpoint
CREATE INDEX `accounts_username_idx` ON `accounts` (`username`);