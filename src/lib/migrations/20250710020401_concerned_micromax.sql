CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password` text NOT NULL,
	`createdAt` text DEFAULT '2025-07-10T02:04:01.734Z' NOT NULL,
	`updatedAt` text DEFAULT '2025-07-10T02:04:01.734Z' NOT NULL,
	`lastLoginAt` text DEFAULT '2025-07-10T02:04:01.734Z' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_username_unique` ON `accounts` (`username`);