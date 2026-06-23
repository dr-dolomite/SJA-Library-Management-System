-- CreateEnum
CREATE TYPE "BorrowerStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "CopyStatus" AS ENUM ('available', 'borrowed', 'lost');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('booked', 'cancelled', 'completed');

-- CreateTable
CREATE TABLE "borrowers" (
    "id" UUID NOT NULL,
    "card_qr" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" "BorrowerStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "borrowers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "isbn" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_copies" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "copy_qr" TEXT NOT NULL,
    "status" "CopyStatus" NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_copies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" UUID NOT NULL,
    "copy_id" UUID NOT NULL,
    "borrower_id" UUID NOT NULL,
    "borrowed_by" TEXT NOT NULL,
    "returned_to" TEXT,
    "borrowed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMP(3) NOT NULL,
    "returned_at" TIMESTAMP(3),

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_reservations" (
    "id" UUID NOT NULL,
    "reserved_by" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'booked',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "borrowers_card_qr_key" ON "borrowers"("card_qr");

-- CreateIndex
CREATE UNIQUE INDEX "book_copies_copy_qr_key" ON "book_copies"("copy_qr");

-- CreateIndex
CREATE INDEX "book_copies_book_id_idx" ON "book_copies"("book_id");

-- CreateIndex
CREATE INDEX "loans_copy_id_idx" ON "loans"("copy_id");

-- CreateIndex
CREATE INDEX "loans_borrower_id_idx" ON "loans"("borrower_id");

-- CreateIndex
CREATE INDEX "loans_borrowed_by_idx" ON "loans"("borrowed_by");

-- CreateIndex
CREATE INDEX "venue_reservations_reserved_by_idx" ON "venue_reservations"("reserved_by");

-- CreateIndex
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs"("actor");

-- AddForeignKey
ALTER TABLE "book_copies" ADD CONSTRAINT "book_copies_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_copy_id_fkey" FOREIGN KEY ("copy_id") REFERENCES "book_copies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_id_fkey" FOREIGN KEY ("borrower_id") REFERENCES "borrowers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrowed_by_fkey" FOREIGN KEY ("borrowed_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_returned_to_fkey" FOREIGN KEY ("returned_to") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_reservations" ADD CONSTRAINT "venue_reservations_reserved_by_fkey" FOREIGN KEY ("reserved_by") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_fkey" FOREIGN KEY ("actor") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
