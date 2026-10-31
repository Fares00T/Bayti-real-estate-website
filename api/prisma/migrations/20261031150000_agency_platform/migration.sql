-- AlterTable
ALTER TABLE `Post` ADD COLUMN `hiddenByOwner` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `agencyActive` BOOLEAN NOT NULL DEFAULT true;
