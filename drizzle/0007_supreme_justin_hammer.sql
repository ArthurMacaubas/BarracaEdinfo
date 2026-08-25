CREATE TABLE `unit_goal_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`goalId` int NOT NULL,
	`unitsAtTrigger` int NOT NULL,
	`message` text NOT NULL,
	`announcedAt` timestamp NOT NULL DEFAULT (now()),
	`sirenSentAt` timestamp,
	CONSTRAINT `unit_goal_alerts_id` PRIMARY KEY(`id`),
	CONSTRAINT `unit_goal_alerts_goal_unique` UNIQUE(`goalId`)
);
--> statement-breakpoint
CREATE TABLE `unit_goal_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`goalId` int NOT NULL,
	`productId` int NOT NULL,
	CONSTRAINT `unit_goal_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `unit_goal_products_goal_product_unique` UNIQUE(`goalId`,`productId`)
);
--> statement-breakpoint
CREATE TABLE `unit_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`targetUnits` int NOT NULL,
	`message` text NOT NULL,
	`status` enum('QUEUED','ACTIVE','COMPLETED','PAUSED') NOT NULL DEFAULT 'QUEUED',
	`priority` int NOT NULL DEFAULT 0,
	`activatedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `unit_goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `unit_goal_alerts` ADD CONSTRAINT `unit_goal_alerts_goalId_unit_goals_id_fk` FOREIGN KEY (`goalId`) REFERENCES `unit_goals`(`id`) ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `unit_goal_products` ADD CONSTRAINT `unit_goal_products_goalId_unit_goals_id_fk` FOREIGN KEY (`goalId`) REFERENCES `unit_goals`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `unit_goal_products` ADD CONSTRAINT `unit_goal_products_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE restrict ON UPDATE cascade;