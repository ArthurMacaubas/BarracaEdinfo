CREATE TABLE `goal_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`goalAmount` decimal(10,2) NOT NULL,
	`salesAtTrigger` decimal(10,2) NOT NULL,
	`message` text NOT NULL,
	`announcedAt` timestamp NOT NULL DEFAULT (now()),
	`sirenSentAt` timestamp,
	CONSTRAINT `goal_alerts_id` PRIMARY KEY(`id`),
	CONSTRAINT `goal_alerts_goalAmount_unique` UNIQUE(`goalAmount`)
);
--> statement-breakpoint
CREATE TABLE `public_pix_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`ticket` int NOT NULL,
	`pixPayload` text NOT NULL,
	`activeUntil` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `public_pix_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sponsors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`imageUrl` text NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sponsors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `public_pix_campaigns` ADD CONSTRAINT `public_pix_campaigns_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE restrict ON UPDATE cascade;