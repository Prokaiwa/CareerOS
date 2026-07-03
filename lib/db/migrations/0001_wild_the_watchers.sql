CREATE TABLE `brain_suggestions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text DEFAULT 'skill' NOT NULL,
	`skill_name` text NOT NULL,
	`source_job_id` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`answers` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`source_job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `cover_letter_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`job_id` integer,
	`parent_id` integer,
	`body` text NOT NULL,
	`rendered_md_path` text DEFAULT '' NOT NULL,
	`rendered_html_path` text DEFAULT '' NOT NULL,
	`ai_assisted` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE set null
);
