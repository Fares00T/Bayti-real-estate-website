-- AlterTable
ALTER TABLE `Post` ADD COLUMN `agencyId` INTEGER NULL,
    ADD COLUMN `availability` ENUM('available', 'under_offer', 'sold', 'rented') NOT NULL DEFAULT 'available',
    ADD COLUMN `featured` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `status` ENUM('pending', 'approved', 'rejected', 'unpublished', 'archived') NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE `User` ADD COLUMN `agencyId` INTEGER NULL,
    ADD COLUMN `agencyRole` ENUM('owner', 'manager', 'agent') NULL,
    ADD COLUMN `lastLoginAt` DATETIME(3) NULL,
    ADD COLUMN `status` ENUM('active', 'suspended', 'deactivated') NOT NULL DEFAULT 'active',
    ADD COLUMN `statusReason` TEXT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `verified` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `role` ENUM('client', 'agent', 'agency', 'admin') NOT NULL DEFAULT 'client';

-- CreateTable
CREATE TABLE `Agency` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ownerId` INTEGER NULL,
    `entityType` ENUM('natural_person', 'legal_entity') NOT NULL DEFAULT 'legal_entity',
    `legalName` VARCHAR(191) NOT NULL,
    `tradeName` VARCHAR(191) NOT NULL,
    `legalForm` VARCHAR(191) NULL,
    `rcNumber` VARCHAR(191) NULL,
    `nif` VARCHAR(191) NULL,
    `nis` VARCHAR(191) NULL,
    `articleImposition` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `wilaya` VARCHAR(191) NULL,
    `commune` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `about` TEXT NULL,
    `repFullName` VARCHAR(191) NULL,
    `repPosition` VARCHAR(191) NULL,
    `repPhone` VARCHAR(191) NULL,
    `repEmail` VARCHAR(191) NULL,
    `approvalNumber` VARCHAR(191) NULL,
    `approvalWilaya` VARCHAR(191) NULL,
    `approvalIssueDate` DATETIME(3) NULL,
    `approvalExpiryDate` DATETIME(3) NULL,
    `status` ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
    `statusReason` TEXT NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Agency_ownerId_key`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgencyApplication` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `applicantId` INTEGER NOT NULL,
    `agencyId` INTEGER NULL,
    `status` ENUM('draft', 'submitted', 'under_review', 'info_required', 'resubmitted', 'approved', 'rejected') NOT NULL DEFAULT 'draft',
    `entityType` ENUM('natural_person', 'legal_entity') NOT NULL DEFAULT 'legal_entity',
    `legalName` VARCHAR(191) NULL,
    `tradeName` VARCHAR(191) NULL,
    `legalForm` VARCHAR(191) NULL,
    `rcNumber` VARCHAR(191) NULL,
    `nif` VARCHAR(191) NULL,
    `nis` VARCHAR(191) NULL,
    `articleImposition` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `wilaya` VARCHAR(191) NULL,
    `commune` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `repFullName` VARCHAR(191) NULL,
    `repBirthDate` DATETIME(3) NULL,
    `repNationality` VARCHAR(191) NULL,
    `repIdNumber` VARCHAR(191) NULL,
    `repPhone` VARCHAR(191) NULL,
    `repEmail` VARCHAR(191) NULL,
    `repPosition` VARCHAR(191) NULL,
    `approvalNumber` VARCHAR(191) NULL,
    `approvalWilaya` VARCHAR(191) NULL,
    `approvalIssueDate` DATETIME(3) NULL,
    `approvalExpiryDate` DATETIME(3) NULL,
    `qualifiedPersonName` VARCHAR(191) NULL,
    `qualification` VARCHAR(191) NULL,
    `message` TEXT NULL,
    `checklist` JSON NULL,
    `requestMessage` TEXT NULL,
    `decisionNote` TEXT NULL,
    `submittedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewerId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AgencyApplication_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApplicationEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `applicationId` INTEGER NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `fromStatus` ENUM('draft', 'submitted', 'under_review', 'info_required', 'resubmitted', 'approved', 'rejected') NULL,
    `toStatus` ENUM('draft', 'submitted', 'under_review', 'info_required', 'resubmitted', 'approved', 'rejected') NULL,
    `message` TEXT NULL,
    `actorId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApplicationNote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `applicationId` INTEGER NOT NULL,
    `authorId` INTEGER NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kind` VARCHAR(40) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `size` INTEGER NOT NULL,
    `storageKey` VARCHAR(120) NOT NULL,
    `sha256` VARCHAR(64) NOT NULL,
    `applicationId` INTEGER NULL,
    `agencyId` INTEGER NULL,
    `reportId` INTEGER NULL,
    `userId` INTEGER NULL,
    `uploadedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Document_storageKey_key`(`storageKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `audience` ENUM('admin', 'user') NOT NULL,
    `userId` INTEGER NULL,
    `type` VARCHAR(50) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NULL,
    `link` VARCHAR(191) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_audience_readAt_idx`(`audience`, `readAt`),
    INDEX `Notification_userId_readAt_idx`(`userId`, `readAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actorId` INTEGER NULL,
    `action` VARCHAR(60) NOT NULL,
    `entityType` VARCHAR(40) NOT NULL,
    `entityId` INTEGER NULL,
    `summary` VARCHAR(191) NOT NULL,
    `details` JSON NULL,
    `ip` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Report` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kind` ENUM('user', 'post') NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `details` TEXT NULL,
    `reporterId` INTEGER NULL,
    `reporterName` VARCHAR(191) NULL,
    `reporterEmail` VARCHAR(191) NULL,
    `postId` INTEGER NULL,
    `reportedUserId` INTEGER NULL,
    `reportedUserText` VARCHAR(191) NULL,
    `status` ENUM('open', 'resolved', 'dismissed') NOT NULL DEFAULT 'open',
    `resolution` TEXT NULL,
    `resolvedAt` DATETIME(3) NULL,
    `resolvedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Report_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `key` VARCHAR(60) NOT NULL,
    `value` JSON NOT NULL,
    `updatedById` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PasswordResetToken_tokenHash_key`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_agencyId_fkey` FOREIGN KEY (`agencyId`) REFERENCES `Agency`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_agencyId_fkey` FOREIGN KEY (`agencyId`) REFERENCES `Agency`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Agency` ADD CONSTRAINT `Agency_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgencyApplication` ADD CONSTRAINT `AgencyApplication_applicantId_fkey` FOREIGN KEY (`applicantId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgencyApplication` ADD CONSTRAINT `AgencyApplication_agencyId_fkey` FOREIGN KEY (`agencyId`) REFERENCES `Agency`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationEvent` ADD CONSTRAINT `ApplicationEvent_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `AgencyApplication`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationEvent` ADD CONSTRAINT `ApplicationEvent_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationNote` ADD CONSTRAINT `ApplicationNote_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `AgencyApplication`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationNote` ADD CONSTRAINT `ApplicationNote_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `AgencyApplication`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_agencyId_fkey` FOREIGN KEY (`agencyId`) REFERENCES `Agency`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `Report`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_reportedUserId_fkey` FOREIGN KEY (`reportedUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Existing agency accounts were approved by hand before this system existed:
-- give each one an Agency record it owns, and attach its listings to it.
INSERT INTO `Agency` (`ownerId`, `legalName`, `tradeName`, `phone`, `email`, `website`, `about`, `address`, `verified`, `verifiedAt`, `createdAt`, `updatedAt`)
SELECT `id`, COALESCE(NULLIF(`agencyName`, ''), `username`), COALESCE(NULLIF(`agencyName`, ''), `username`),
       `phone`, `email`, `website`, `about`, `location`, true, NOW(3), `createdAt`, NOW(3)
FROM `User` WHERE `role` = 'agency';

UPDATE `User` u JOIN `Agency` a ON a.`ownerId` = u.`id`
SET u.`agencyId` = a.`id`, u.`agencyRole` = 'owner', u.`verified` = true;

UPDATE `Post` p JOIN `User` u ON u.`id` = p.`userId`
SET p.`agencyId` = u.`agencyId` WHERE u.`agencyId` IS NOT NULL;

UPDATE `User` SET `verified` = true WHERE `role` = 'admin';
