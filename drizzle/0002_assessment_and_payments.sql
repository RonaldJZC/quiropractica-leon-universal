ALTER TABLE `session_packages` ADD `sessions_per_week` integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE `session_packages` ADD `start_date` text;
--> statement-breakpoint
ALTER TABLE `session_packages` ADD `total_amount_cents` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE `patient_assessments` (
  `id` text PRIMARY KEY NOT NULL,
  `patient_id` text NOT NULL,
  `reason` text,
  `conditions` text,
  `body_analysis` text,
  `weight_kg` real,
  `height_cm` real,
  `bmi` real,
  `healthy_weight_min_kg` real,
  `healthy_weight_max_kg` real,
  `target_weight_kg` real,
  `diet_plan` text,
  `notes` text,
  `assessed_at` text NOT NULL,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_patient_assessments_patient_date` ON `patient_assessments` (`patient_id`,`assessed_at`);
--> statement-breakpoint
CREATE TABLE `payments` (
  `id` text PRIMARY KEY NOT NULL,
  `patient_id` text NOT NULL,
  `amount_cents` integer NOT NULL,
  `method` text,
  `notes` text,
  `paid_at` text NOT NULL,
  FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_payments_patient_date` ON `payments` (`patient_id`,`paid_at`);
--> statement-breakpoint
PRAGMA optimize;
