CREATE TABLE `goal_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goalAmount` real NOT NULL,
	`cycleKey` text DEFAULT 'initial' NOT NULL,
	`salesAtTrigger` real NOT NULL,
	`message` text NOT NULL,
	`announcedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`sirenSentAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `goal_alerts_goal_cycle_unique` ON `goal_alerts` (`goalAmount`,`cycleKey`);--> statement-breakpoint
CREATE TABLE `hardware_commands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`commandKey` text NOT NULL,
	`type` text NOT NULL,
	`payload` text,
	`status` text DEFAULT 'QUEUED' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hardware_commands_commandKey_unique` ON `hardware_commands` (`commandKey`);--> statement-breakpoint
CREATE TABLE `operation_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`entityType` text,
	`entityId` integer,
	`payload` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `operation_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `operation_settings_key_unique` ON `operation_settings` (`key`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orderId` integer NOT NULL,
	`productId` integer NOT NULL,
	`productName` text NOT NULL,
	`quantity` integer NOT NULL,
	`unitPrice` real NOT NULL,
	`subtotal` real NOT NULL,
	FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket` integer NOT NULL,
	`requestKey` text NOT NULL,
	`status` text DEFAULT 'NEW' NOT NULL,
	`paymentMethod` text NOT NULL,
	`pixConfirmedAt` integer,
	`total` real NOT NULL,
	`note` text,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_ticket_unique` ON `orders` (`ticket`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_requestKey_unique` ON `orders` (`requestKey`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`price` real NOT NULL,
	`available` integer DEFAULT true NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `public_pix_campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`orderId` integer NOT NULL,
	`ticket` integer NOT NULL,
	`pixPayload` text NOT NULL,
	`activeUntil` integer NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `sponsors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`imageUrl` text NOT NULL,
	`backgroundColor` text DEFAULT '#fffaf0' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `unit_goal_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goalId` integer NOT NULL,
	`unitsAtTrigger` integer NOT NULL,
	`message` text NOT NULL,
	`announcedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`sirenSentAt` integer,
	FOREIGN KEY (`goalId`) REFERENCES `unit_goals`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unit_goal_alerts_goal_unique` ON `unit_goal_alerts` (`goalId`);--> statement-breakpoint
CREATE TABLE `unit_goal_products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`goalId` integer NOT NULL,
	`productId` integer NOT NULL,
	FOREIGN KEY (`goalId`) REFERENCES `unit_goals`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unit_goal_products_goal_product_unique` ON `unit_goal_products` (`goalId`,`productId`);--> statement-breakpoint
CREATE TABLE `unit_goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`targetUnits` integer NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'QUEUED' NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`activatedAt` integer,
	`completedAt` integer,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`lastSignedIn` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);