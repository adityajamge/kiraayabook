import { pgTable, uuid, text, integer, date, timestamp } from 'drizzle-orm/pg-core'

export const organisations = pgTable('organisations', {
  id:         uuid('id').defaultRandom().primaryKey(),
  name:       text('name').notNull(),
  plan:       text('plan').notNull().default('starter'),
  created_at: timestamp('created_at').defaultNow(),
})

export const users = pgTable('users', {
  id:            uuid('id').defaultRandom().primaryKey(),
  org_id:        uuid('org_id').notNull().references(() => organisations.id),
  email:         text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role:          text('role').notNull().default('owner'),
  created_at:    timestamp('created_at').defaultNow(),
})

export const rooms = pgTable('rooms', {
  id:          uuid('id').defaultRandom().primaryKey(),
  org_id:      uuid('org_id').notNull().references(() => organisations.id),
  room_number: text('room_number').notNull(),
  capacity:    integer('capacity').notNull(),
  floor:       text('floor'),
  type:        text('type'),
  created_at:  timestamp('created_at').defaultNow(),
})

export const tenants = pgTable('tenants', {
  id:            uuid('id').defaultRandom().primaryKey(),
  org_id:        uuid('org_id').notNull().references(() => organisations.id),
  room_id:       uuid('room_id').notNull().references(() => rooms.id),
  name:          text('name').notNull(),
  phone:         text('phone').notNull(),
  email:         text('email'),
  cot_number:    text('cot_number'),
  move_in_date:  date('move_in_date').notNull(),
  move_out_date: date('move_out_date'),
  status:        text('status').notNull().default('active'),
  created_at:    timestamp('created_at').defaultNow(),
})

export const rent_records = pgTable('rent_records', {
  id:           uuid('id').defaultRandom().primaryKey(),
  org_id:       uuid('org_id').notNull().references(() => organisations.id),
  tenant_id:    uuid('tenant_id').notNull().references(() => tenants.id),
  amount:       integer('amount').notNull(),
  month:        text('month').notNull(),
  due_date:     date('due_date').notNull(),
  paid_date:    date('paid_date'),
  payment_mode: text('payment_mode'),
  status:       text('status').notNull().default('pending'),
  created_at:   timestamp('created_at').defaultNow(),
})

export const documents = pgTable('documents', {
  id:          uuid('id').defaultRandom().primaryKey(),
  org_id:      uuid('org_id').notNull().references(() => organisations.id),
  tenant_id:   uuid('tenant_id').notNull().references(() => tenants.id),
  doc_type:    text('doc_type').notNull(),
  file_url:    text('file_url').notNull(),
  uploaded_at: timestamp('uploaded_at').defaultNow(),
})
