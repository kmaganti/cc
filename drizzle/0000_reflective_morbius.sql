CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`address` text NOT NULL,
	`club` text NOT NULL,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_unique` ON `customers` (`email`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`orderId` text NOT NULL,
	`productId` text NOT NULL,
	`productName` text NOT NULL,
	`quantity` integer NOT NULL,
	`price` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`customerId` text NOT NULL,
	`customerName` text NOT NULL,
	`customerEmail` text NOT NULL,
	`status` text NOT NULL,
	`trackingNumber` text NOT NULL,
	`carrier` text NOT NULL,
	`eta` text NOT NULL,
	`total` integer NOT NULL,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`price` integer NOT NULL,
	`image` text NOT NULL,
	`accent` text NOT NULL,
	`description` text NOT NULL,
	`stock` integer NOT NULL,
	`status` text NOT NULL,
	`featured` integer NOT NULL
);
