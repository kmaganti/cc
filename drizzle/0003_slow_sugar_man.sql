CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`image` text NOT NULL,
	`sortOrder` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `product_cross_sells` (
	`id` text PRIMARY KEY NOT NULL,
	`productId` text NOT NULL,
	`relatedProductId` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`image` text NOT NULL,
	`sortOrder` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_groups_name_unique` ON `product_groups` (`name`);--> statement-breakpoint
ALTER TABLE `products` ADD `groupId` text;