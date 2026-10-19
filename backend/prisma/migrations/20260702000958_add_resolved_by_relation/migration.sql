-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "resolvedById" TEXT;

-- CreateIndex
CREATE INDEX "reports_resolvedById_idx" ON "reports"("resolvedById");

-- CreateIndex
CREATE INDEX "reports_reportedId_idx" ON "reports"("reportedId");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
