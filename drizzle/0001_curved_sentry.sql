CREATE TABLE `hardware_commands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commandKey` varchar(120) NOT NULL,
	`type` varchar(40) NOT NULL,
	`payload` text,
	`status` enum('QUEUED','SENT','ACK','FAILED') NOT NULL DEFAULT 'QUEUED',
	`attempts` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hardware_commands_id` PRIMARY KEY(`id`),
	CONSTRAINT `hardware_commands_commandKey_unique` UNIQUE(`commandKey`)
);
--> statement-breakpoint
CREATE TABLE `operation_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` varchar(80) NOT NULL,
	`entityType` varchar(50),
	`entityId` int,
	`payload` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operation_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `operation_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(80) NOT NULL,
	`value` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operation_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `operation_settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(120) NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`subtotal` decimal(10,2) NOT NULL,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticket` int NOT NULL,
	`requestKey` varchar(100) NOT NULL,
	`status` enum('NEW','PREPARING','READY','DELIVERED','CANCELLED') NOT NULL DEFAULT 'NEW',
	`paymentMethod` enum('PIX','CASH','CARD') NOT NULL,
	`total` decimal(10,2) NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_ticket_unique` UNIQUE(`ticket`),
	CONSTRAINT `orders_requestKey_unique` UNIQUE(`requestKey`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`category` varchar(60) NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`available` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
