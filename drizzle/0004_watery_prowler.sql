ALTER TABLE `goal_alerts` DROP INDEX `goal_alerts_goalAmount_unique`;--> statement-breakpoint
ALTER TABLE `goal_alerts` ADD `cycleKey` varchar(64) DEFAULT 'initial' NOT NULL;