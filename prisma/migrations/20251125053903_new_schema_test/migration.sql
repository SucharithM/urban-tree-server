/*
  Warnings:

  - You are about to drop the `Node` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- DropTable
DROP TABLE "Node";

-- CreateTable
CREATE TABLE "tree_nodes" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "boardId" TEXT,
    "name" TEXT,
    "location" TEXT,
    "sensorDepths" TEXT,
    "sitePi" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "species" TEXT,
    "dbh" DOUBLE PRECISION,
    "dendroSlope" DOUBLE PRECISION,
    "dendroOffset" DOUBLE PRECISION,
    "initialDbh" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tree_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_readings" (
    "id" TEXT NOT NULL,
    "treeNodeId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "temperature" DOUBLE PRECISION,
    "pressure" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "dendrometer" DOUBLE PRECISION,
    "sapflow1" DOUBLE PRECISION,
    "sapflow2" DOUBLE PRECISION,
    "sapflow3" DOUBLE PRECISION,
    "sapflow4" DOUBLE PRECISION,
    "battery" DOUBLE PRECISION,
    "lipoCharge" DOUBLE PRECISION,
    "notes" TEXT,
    "dataSource" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "computed_readings" (
    "id" TEXT NOT NULL,
    "treeNodeId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "dendroCalibratedMm" DOUBLE PRECISION,
    "sapflowCmPerHr" DOUBLE PRECISION,
    "sfMaxD" DOUBLE PRECISION,
    "sfSignal" DOUBLE PRECISION,
    "sfNoise" DOUBLE PRECISION,
    "rawReadingId" TEXT,
    "dataSource" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "computed_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "sheetsProcessed" TEXT[],
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "recordsImported" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "warnings" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "errors" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tree_nodes_nodeId_key" ON "tree_nodes"("nodeId");

-- CreateIndex
CREATE INDEX "tree_nodes_nodeId_idx" ON "tree_nodes"("nodeId");

-- CreateIndex
CREATE INDEX "raw_readings_treeNodeId_timestamp_idx" ON "raw_readings"("treeNodeId", "timestamp");

-- CreateIndex
CREATE INDEX "raw_readings_timestamp_idx" ON "raw_readings"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "raw_readings_treeNodeId_timestamp_key" ON "raw_readings"("treeNodeId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "computed_readings_rawReadingId_key" ON "computed_readings"("rawReadingId");

-- CreateIndex
CREATE INDEX "computed_readings_treeNodeId_timestamp_idx" ON "computed_readings"("treeNodeId", "timestamp");

-- CreateIndex
CREATE INDEX "computed_readings_timestamp_idx" ON "computed_readings"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "computed_readings_treeNodeId_timestamp_key" ON "computed_readings"("treeNodeId", "timestamp");

-- CreateIndex
CREATE INDEX "import_jobs_status_idx" ON "import_jobs"("status");

-- CreateIndex
CREATE INDEX "import_jobs_startedAt_idx" ON "import_jobs"("startedAt");

-- AddForeignKey
ALTER TABLE "raw_readings" ADD CONSTRAINT "raw_readings_treeNodeId_fkey" FOREIGN KEY ("treeNodeId") REFERENCES "tree_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "computed_readings" ADD CONSTRAINT "computed_readings_rawReadingId_fkey" FOREIGN KEY ("rawReadingId") REFERENCES "raw_readings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "computed_readings" ADD CONSTRAINT "computed_readings_treeNodeId_fkey" FOREIGN KEY ("treeNodeId") REFERENCES "tree_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
