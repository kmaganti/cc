ALTER TABLE `customers` ADD `passwordHash` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `resetToken` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `resetExpiresAt` text;