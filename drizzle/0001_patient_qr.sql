ALTER TABLE `patients` ADD `qr_token` text;
--> statement-breakpoint
ALTER TABLE `patients` ADD `qr_issued_at` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_patients_qr_token` ON `patients` (`qr_token`);
--> statement-breakpoint
PRAGMA optimize;
