-- AlterTable
ALTER TABLE `Post` ADD COLUMN `reviewNote` TEXT NULL,
    ADD COLUMN `reviewedAt` DATETIME(3) NULL,
    ADD COLUMN `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending';


-- Listings that existed before moderation was introduced stay public
UPDATE `Post` SET `status` = 'approved', `reviewedAt` = NOW();
