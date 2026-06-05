-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "geoValidated" BOOLEAN DEFAULT false,
ADD COLUMN     "ipValidated" BOOLEAN DEFAULT false,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "locationType" TEXT,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "wifiIp" TEXT;

-- CreateTable
CREATE TABLE "OpeType" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountType" TEXT NOT NULL DEFAULT 'FIXED',
    "fixedAmount" DOUBLE PRECISION,
    "billRequired" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpeType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpeEntry" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "opeTypeId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "billUrl" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpeEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OpeType" ADD CONSTRAINT "OpeType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeEntry" ADD CONSTRAINT "OpeEntry_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpeEntry" ADD CONSTRAINT "OpeEntry_opeTypeId_fkey" FOREIGN KEY ("opeTypeId") REFERENCES "OpeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
