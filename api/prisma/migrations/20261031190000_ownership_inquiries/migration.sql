-- Ownership, inquiries, invitations and verification (docs/ARCHITECTURE.md §7).
-- Every step that changes a type copies the data first; nothing is lost.

-- 1. Verification becomes its own lifecycle (pending / verified / revoked)
ALTER TABLE `Agency`
    ADD COLUMN `verification` ENUM('pending', 'verified', 'revoked') NOT NULL DEFAULT 'pending',
    ADD COLUMN `verificationNote` TEXT NULL;
UPDATE `Agency` SET `verification` = IF(`verified`, 'verified', 'pending');
ALTER TABLE `Agency` DROP COLUMN `verified`;

-- 2. `role` is the staff role only; agency membership stays in agencyId/agencyRole
UPDATE `User` SET `role` = 'client' WHERE `role` IN ('agent', 'agency');
ALTER TABLE `User`
    MODIFY `role` ENUM('client', 'admin') NOT NULL DEFAULT 'client',
    ADD COLUMN `passwordChangedAt` DATETIME(3) NULL;

-- 3. Long text was silently cut at 191 characters (non-strict sql_mode)
ALTER TABLE `Chat` MODIFY `lastMessage` TEXT NULL;
ALTER TABLE `Message` MODIFY `text` TEXT NOT NULL;
ALTER TABLE `PostDetail` MODIFY `desc` TEXT NOT NULL;

-- 4. Listings: who published it is recorded; the responsible account may be
--    empty for an unassigned agency listing
ALTER TABLE `Post` DROP FOREIGN KEY `Post_userId_fkey`;
ALTER TABLE `Post` ADD COLUMN `createdById` INTEGER NULL, MODIFY `userId` INTEGER NULL;
UPDATE `Post` SET `createdById` = `userId`;
ALTER TABLE `Post` ADD CONSTRAINT `Post_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Post` ADD CONSTRAINT `Post_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX `Post_agencyId_status_idx` ON `Post`(`agencyId`, `status`);
CREATE INDEX `Post_userId_status_idx` ON `Post`(`userId`, `status`);

-- 5. Inquiries replace visit requests addressed to a person
CREATE TABLE `Inquiry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('question', 'visit') NOT NULL DEFAULT 'question',
    `status` ENUM('open', 'scheduled', 'closed', 'declined', 'cancelled') NOT NULL DEFAULT 'open',
    `clientId` INTEGER NOT NULL,
    `postId` INTEGER NULL,
    `postTitle` VARCHAR(191) NOT NULL,
    `agencyId` INTEGER NULL,
    `ownerId` INTEGER NULL,
    `assignedToId` INTEGER NULL,
    `message` TEXT NULL,
    `contactPhone` VARCHAR(40) NULL,
    `preferredDate` VARCHAR(20) NULL,
    `preferredTime` VARCHAR(20) NULL,
    `confirmedDate` VARCHAR(20) NULL,
    `confirmedTime` VARCHAR(20) NULL,
    `declineReason` TEXT NULL,
    `chatId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Inquiry_chatId_key`(`chatId`),
    INDEX `Inquiry_agencyId_status_idx`(`agencyId`, `status`),
    INDEX `Inquiry_ownerId_status_idx`(`ownerId`, `status`),
    INDEX `Inquiry_assignedToId_status_idx`(`assignedToId`, `status`),
    UNIQUE INDEX `Inquiry_clientId_postId_key`(`clientId`, `postId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Existing visit requests, routed the new way. A client with several requests
-- on one property ends up with one inquiry carrying the latest request.
INSERT INTO `Inquiry` (`type`, `status`, `clientId`, `postId`, `postTitle`, `agencyId`, `ownerId`, `assignedToId`,
    `message`, `contactPhone`, `preferredDate`, `preferredTime`, `confirmedDate`, `confirmedTime`, `declineReason`,
    `createdAt`, `updatedAt`)
SELECT 'visit',
    CASE t.`status` WHEN 'pending' THEN 'open' WHEN 'confirmed' THEN 'scheduled' WHEN 'completed' THEN 'closed' ELSE t.`status` END,
    t.`clientId`, t.`propertyId`, LEFT(p.`title`, 191), p.`agencyId`,
    IF(p.`agencyId` IS NULL, p.`userId`, NULL),
    IF(p.`agencyId` IS NULL, NULL, p.`userId`),
    t.`message`, LEFT(t.`contactPhone`, 40), LEFT(t.`preferredDate`, 20), LEFT(t.`preferredTime`, 20),
    LEFT(t.`confirmedDate`, 20), LEFT(t.`confirmedTime`, 20), t.`declineReason`, t.`createdAt`, t.`updatedAt`
FROM `TourRequest` t JOIN `Post` p ON p.`id` = t.`propertyId`
ORDER BY t.`id`
ON DUPLICATE KEY UPDATE
    `status` = VALUES(`status`), `message` = VALUES(`message`), `contactPhone` = VALUES(`contactPhone`),
    `preferredDate` = VALUES(`preferredDate`), `preferredTime` = VALUES(`preferredTime`),
    `confirmedDate` = VALUES(`confirmedDate`), `confirmedTime` = VALUES(`confirmedTime`),
    `declineReason` = VALUES(`declineReason`), `updatedAt` = VALUES(`updatedAt`);

ALTER TABLE `TourRequest` DROP FOREIGN KEY `TourRequest_agencyId_fkey`;
ALTER TABLE `TourRequest` DROP FOREIGN KEY `TourRequest_clientId_fkey`;
ALTER TABLE `TourRequest` DROP FOREIGN KEY `TourRequest_propertyId_fkey`;
DROP TABLE `TourRequest`;

-- 6. Joining an agency needs the person's consent
CREATE TABLE `AgencyInvitation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `agencyId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `agencyRole` ENUM('owner', 'manager', 'agent') NOT NULL DEFAULT 'agent',
    `status` ENUM('pending', 'accepted', 'declined', 'revoked') NOT NULL DEFAULT 'pending',
    `invitedById` INTEGER NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `respondedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AgencyInvitation_userId_status_idx`(`userId`, `status`),
    INDEX `AgencyInvitation_agencyId_status_idx`(`agencyId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Inquiry` ADD CONSTRAINT `Inquiry_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Inquiry` ADD CONSTRAINT `Inquiry_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Inquiry` ADD CONSTRAINT `Inquiry_agencyId_fkey` FOREIGN KEY (`agencyId`) REFERENCES `Agency`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Inquiry` ADD CONSTRAINT `Inquiry_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Inquiry` ADD CONSTRAINT `Inquiry_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `Inquiry` ADD CONSTRAINT `Inquiry_chatId_fkey` FOREIGN KEY (`chatId`) REFERENCES `Chat`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `AgencyInvitation` ADD CONSTRAINT `AgencyInvitation_agencyId_fkey` FOREIGN KEY (`agencyId`) REFERENCES `Agency`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AgencyInvitation` ADD CONSTRAINT `AgencyInvitation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AgencyInvitation` ADD CONSTRAINT `AgencyInvitation_invitedById_fkey` FOREIGN KEY (`invitedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
