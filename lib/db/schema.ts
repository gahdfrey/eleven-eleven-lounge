import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Single source of truth for every table. After editing, run
 * `npm run db:generate` to write a migration into drizzle/, then
 * `npm run db:migrate` to apply it.
 *
 * Money is stored as integer kobo (₦1 = 100 kobo) to avoid float rounding.
 */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ─── People ─────────────────────────────────────────────────────────────────

/** finance = read-only money reports and receiving cash; no orders, menu or stock. */
export const ROLES = ["admin", "manager", "staff", "finance"] as const;
export type Role = (typeof ROLES)[number];

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    /** Sequential number in order of creation; drives the username 11:11/<staffNo>. */
    staffNo: integer("staff_no").notNull(),
    username: text("username").notNull(),
    firstname: text("firstname").notNull(),
    lastname: text("lastname").notNull(),
    email: text("email"),
    phone: text("phone"),
    password: text("password").notNull(),
    role: text("role").$type<Role>().notNull().default("staff"),
    /** Deactivated users cannot log in and lose access immediately. */
    active: boolean("active").notNull().default(true),
    /** Set for new accounts and password resets; forces a change on next login. */
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    uniqueIndex("users_username_unique").on(t.username),
    uniqueIndex("users_staff_no_unique").on(t.staffNo),
    index("users_updated_idx").on(t.updatedAt),
  ],
);

// ─── Menu & inventory ───────────────────────────────────────────────────────

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("categories_updated_idx").on(t.updatedAt)],
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id").references(() => categories.id),
    name: text("name").notNull(),
    description: text("description"),
    /** Price in kobo. */
    price: integer("price").notNull(),
    /** When true, every accepted order deducts stock and is blocked if stock runs out. */
    trackStock: boolean("track_stock").notNull().default(true),
    stockQty: integer("stock_qty").notNull().default(0),
    lowStockAt: integer("low_stock_at").notNull().default(5),
    /** Manually hide an item from the menu without deleting it. */
    available: boolean("available").notNull().default(true),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("products_category_idx").on(t.categoryId), index("products_updated_idx").on(t.updatedAt)],
);

export const STOCK_REASONS = ["restock", "sale", "void", "adjustment", "waste"] as const;
export type StockReason = (typeof STOCK_REASONS)[number];

/** Append-only ledger: every change to products.stockQty writes one row here. */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id").notNull().references(() => products.id),
    change: integer("change").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    reason: text("reason").$type<StockReason>().notNull(),
    orderId: integer("order_id"),
    userId: integer("user_id").references(() => users.id),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("stock_movements_product_idx").on(t.productId),
    index("stock_movements_created_idx").on(t.createdAt),
  ],
);

// ─── Tables, bills & orders ─────────────────────────────────────────────────

export const loungeTables = pgTable(
  "lounge_tables",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    /** Secret in the table's QR code URL (/t/<qrToken>). */
    qrToken: text("qr_token").notNull(),
    active: boolean("active").notNull().default(true),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("lounge_tables_qr_token_unique").on(t.qrToken), index("lounge_tables_updated_idx").on(t.updatedAt)],
);

export const BILL_STATUSES = ["open", "paid", "void"] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];
export const PAYMENT_METHODS = ["cash", "transfer", "pos"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** A customer's tab. Always owned by exactly one staff member, who is accountable for its money. */
export const bills = pgTable(
  "bills",
  {
    id: serial("id").primaryKey(),
    staffId: integer("staff_id").notNull().references(() => users.id),
    tableId: integer("table_id").references(() => loungeTables.id),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    /** Secret that lets the customer watch this bill at /bill/<accessToken>. */
    accessToken: text("access_token").notNull(),
    status: text("status").$type<BillStatus>().notNull().default("open"),
    paymentMethod: text("payment_method").$type<PaymentMethod>(),
    /** Total at the moment it was paid, in kobo — frozen for reporting. */
    paidAmount: integer("paid_amount"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paidById: integer("paid_by_id").references(() => users.id),
    voidReason: text("void_reason"),
    voidedById: integer("voided_by_id").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("bills_access_token_unique").on(t.accessToken),
    index("bills_staff_status_idx").on(t.staffId, t.status),
    index("bills_paid_at_idx").on(t.paidAt),
    index("bills_status_idx").on(t.status),
    index("bills_updated_idx").on(t.updatedAt),
  ],
);

export const ORDER_STATUSES = ["pending", "accepted", "served", "rejected", "void"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
/** Orders in these statuses count toward the bill. Stock leaves inventory when an order is served (see stockDeductedAt). */
export const BILLABLE_ORDER_STATUSES: OrderStatus[] = ["accepted", "served"];

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    billId: integer("bill_id").notNull().references(() => bills.id),
    staffId: integer("staff_id").notNull().references(() => users.id),
    /** "customer" = placed by QR, needs staff acceptance; "staff" = entered by staff. */
    source: text("source").$type<"customer" | "staff">().notNull(),
    status: text("status").$type<OrderStatus>().notNull().default("pending"),
    note: text("note"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    servedAt: timestamp("served_at", { withTimezone: true }),
    /** When this order's stock left inventory (on serve, or when its bill was paid). Null = not deducted. */
    stockDeductedAt: timestamp("stock_deducted_at", { withTimezone: true }),
    /**
     * Random id the customer's phone sends with an order. If a flaky connection
     * makes the phone send the same order twice, the second is recognised and
     * ignored instead of creating a duplicate.
     */
    clientRef: text("client_ref"),
    rejectReason: text("reject_reason"),
    voidReason: text("void_reason"),
    voidedById: integer("voided_by_id").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    index("orders_bill_idx").on(t.billId),
    index("orders_staff_status_idx").on(t.staffId, t.status),
    index("orders_status_created_idx").on(t.status, t.createdAt),
    index("orders_created_idx").on(t.createdAt),
    index("orders_updated_idx").on(t.updatedAt),
    uniqueIndex("orders_client_ref_unique").on(t.clientRef),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => orders.id),
    productId: integer("product_id").notNull().references(() => products.id),
    /** Snapshot of name and price at order time, so later menu edits don't rewrite history. */
    name: text("name").notNull(),
    unitPrice: integer("unit_price").notNull(),
    qty: integer("qty").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/** Cash handed over by a staff member to management. */
export const remittances = pgTable(
  "remittances",
  {
    id: serial("id").primaryKey(),
    staffId: integer("staff_id").notNull().references(() => users.id),
    amount: integer("amount").notNull(),
    receivedById: integer("received_by_id").notNull().references(() => users.id),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("remittances_staff_idx").on(t.staffId)],
);

// ─── Notifications & events ─────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.readAt), index("notifications_user_created_idx").on(t.userId, t.createdAt)],
);

export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    /** Free text such as "Free entry" or "₦10,000 gate". */
    entry: text("entry"),
    published: boolean("published").notNull().default(true),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("events_starts_at_idx").on(t.startsAt), index("events_updated_idx").on(t.updatedAt)],
);

// ─── Reservations ───────────────────────────────────────────────────────────

export const RESERVATION_STATUSES = ["pending", "confirmed", "seated", "completed", "cancelled", "no_show"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];
export const SEATING_OPTIONS = ["standard", "vip", "booth", "bar"] as const;
export type Seating = (typeof SEATING_OPTIONS)[number];

/**
 * A table booking, from the website form or entered by staff (phone/walk-up).
 * `night` + `arrivalTime` are venue-local and kept as text: a 1:00 AM arrival
 * on night 2026-11-20 belongs to Friday night, not Saturday.
 */
export const reservations = pgTable(
  "reservations",
  {
    id: serial("id").primaryKey(),
    /** Short code the guest quotes at the door, e.g. "R7KX2Q". */
    reference: text("reference").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    /** YYYY-MM-DD: the night of the booking. */
    night: text("night").notNull(),
    /** HH:MM, 24h. Times before noon are after midnight on that night. */
    arrivalTime: text("arrival_time").notNull(),
    partySize: integer("party_size").notNull(),
    seating: text("seating").$type<Seating>().notNull().default("standard"),
    occasion: text("occasion"),
    notes: text("notes"),
    status: text("status").$type<ReservationStatus>().notNull().default("pending"),
    source: text("source").$type<"website" | "staff">().notNull().default("website"),
    tableId: integer("table_id").references(() => loungeTables.id),
    /** Who last confirmed/seated/cancelled it. */
    handledById: integer("handled_by_id").references(() => users.id),
    staffNote: text("staff_note"),
    /** Random id from the guest's browser, so a double-submit can't create two bookings. */
    clientRef: text("client_ref"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("reservations_reference_unique").on(t.reference),
    uniqueIndex("reservations_client_ref_unique").on(t.clientRef),
    index("reservations_night_idx").on(t.night, t.status),
    index("reservations_updated_idx").on(t.updatedAt),
  ],
);

export type Reservation = typeof reservations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type Order = typeof orders.$inferSelect;
