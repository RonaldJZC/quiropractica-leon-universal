CREATE TABLE `patients` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`search_name` text NOT NULL,
	`birth_date` text,
	`sex` text,
	`phone` text,
	`email` text,
	`pin_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_patients_search_name` ON `patients` (`search_name`);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`appointment_date` text NOT NULL,
	`start_time` text NOT NULL,
	`duration_minutes` integer DEFAULT 45 NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`reason` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_appointments_date_status` ON `appointments` (`appointment_date`,`status`);
--> statement-breakpoint
CREATE INDEX `idx_appointments_patient_id` ON `appointments` (`patient_id`);
--> statement-breakpoint
CREATE TABLE `check_ins` (
	`id` text PRIMARY KEY NOT NULL,
	`appointment_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`location_code` text NOT NULL,
	`checked_in_at` text NOT NULL,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_check_ins_appointment_unique` ON `check_ins` (`appointment_id`);
--> statement-breakpoint
CREATE INDEX `idx_check_ins_patient_id` ON `check_ins` (`patient_id`);
--> statement-breakpoint
CREATE TABLE `session_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`total_sessions` integer NOT NULL,
	`used_sessions` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_session_packages_patient_id` ON `session_packages` (`patient_id`);
--> statement-breakpoint
CREATE TABLE `clinical_visits` (
	`id` text PRIMARY KEY NOT NULL,
	`appointment_id` text,
	`patient_id` text NOT NULL,
	`weight_kg` integer,
	`height_cm` integer,
	`pain_level` integer,
	`notes` text,
	`completed_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_clinical_visits_patient_id` ON `clinical_visits` (`patient_id`);
--> statement-breakpoint
CREATE TABLE `supplements` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`name` text NOT NULL,
	`instructions` text,
	`quantity` text,
	`lot_number` text,
	`expires_at` text,
	`recorded_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_supplements_patient_id` ON `supplements` (`patient_id`);
--> statement-breakpoint
CREATE TABLE `media_files` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`visit_id` text,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`category` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`visit_id`) REFERENCES `clinical_visits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_media_files_patient_id` ON `media_files` (`patient_id`);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_entity` ON `audit_logs` (`entity_type`,`entity_id`);
--> statement-breakpoint
PRAGMA optimize;
