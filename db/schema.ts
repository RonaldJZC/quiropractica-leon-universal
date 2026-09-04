import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';

export const patients = sqliteTable(
  'patients',
  {
    id: text('id').primaryKey(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    searchName: text('search_name').notNull(),
    birthDate: text('birth_date'),
    sex: text('sex'),
    phone: text('phone'),
    email: text('email'),
    pinHash: text('pin_hash').notNull(),
    qrToken: text('qr_token'),
    qrIssuedAt: text('qr_issued_at'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_patients_search_name').on(table.searchName),
    uniqueIndex('idx_patients_qr_token').on(table.qrToken),
  ],
);

export const appointments = sqliteTable(
  'appointments',
  {
    id: text('id').primaryKey(),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    appointmentDate: text('appointment_date').notNull(),
    startTime: text('start_time').notNull(),
    durationMinutes: integer('duration_minutes').notNull().default(45),
    status: text('status').notNull().default('scheduled'),
    reason: text('reason'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_appointments_date_status').on(
      table.appointmentDate,
      table.status,
    ),
    index('idx_appointments_patient_id').on(table.patientId),
  ],
);

export const checkIns = sqliteTable(
  'check_ins',
  {
    id: text('id').primaryKey(),
    appointmentId: text('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    locationCode: text('location_code').notNull(),
    checkedInAt: text('checked_in_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_check_ins_appointment_unique').on(table.appointmentId),
    index('idx_check_ins_patient_id').on(table.patientId),
  ],
);

export const sessionPackages = sqliteTable(
  'session_packages',
  {
    id: text('id').primaryKey(),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    totalSessions: integer('total_sessions').notNull(),
    usedSessions: integer('used_sessions').notNull().default(0),
    sessionsPerWeek: integer('sessions_per_week').notNull().default(1),
    startDate: text('start_date'),
    totalAmountCents: integer('total_amount_cents').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_session_packages_patient_id').on(table.patientId)],
);

export const clinicalVisits = sqliteTable(
  'clinical_visits',
  {
    id: text('id').primaryKey(),
    appointmentId: text('appointment_id').references(() => appointments.id),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    weightKg: integer('weight_kg'),
    heightCm: integer('height_cm'),
    painLevel: integer('pain_level'),
    notes: text('notes'),
    completedAt: text('completed_at'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_clinical_visits_patient_id').on(table.patientId)],
);

export const patientAssessments = sqliteTable(
  'patient_assessments',
  {
    id: text('id').primaryKey(),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    reason: text('reason'),
    conditions: text('conditions'),
    bodyAnalysis: text('body_analysis'),
    weightKg: real('weight_kg'),
    heightCm: real('height_cm'),
    bmi: real('bmi'),
    healthyWeightMinKg: real('healthy_weight_min_kg'),
    healthyWeightMaxKg: real('healthy_weight_max_kg'),
    targetWeightKg: real('target_weight_kg'),
    dietPlan: text('diet_plan'),
    notes: text('notes'),
    assessedAt: text('assessed_at').notNull(),
  },
  (table) => [index('idx_patient_assessments_patient_date').on(table.patientId, table.assessedAt)],
);

export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    amountCents: integer('amount_cents').notNull(),
    method: text('method'),
    notes: text('notes'),
    paidAt: text('paid_at').notNull(),
  },
  (table) => [index('idx_payments_patient_date').on(table.patientId, table.paidAt)],
);

export const supplements = sqliteTable(
  'supplements',
  {
    id: text('id').primaryKey(),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    instructions: text('instructions'),
    quantity: text('quantity'),
    lotNumber: text('lot_number'),
    expiresAt: text('expires_at'),
    recordedAt: text('recorded_at').notNull(),
  },
  (table) => [index('idx_supplements_patient_id').on(table.patientId)],
);

export const mediaFiles = sqliteTable(
  'media_files',
  {
    id: text('id').primaryKey(),
    patientId: text('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    visitId: text('visit_id').references(() => clinicalVisits.id),
    objectKey: text('object_key').notNull(),
    fileName: text('file_name').notNull(),
    contentType: text('content_type').notNull(),
    category: text('category').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_media_files_patient_id').on(table.patientId)],
);

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id').notNull(),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_audit_logs_entity').on(table.entityType, table.entityId)],
);
