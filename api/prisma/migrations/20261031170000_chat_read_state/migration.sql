-- AlterTable
ALTER TABLE `ChatUser` ADD COLUMN `lastReadAt` DATETIME(3) NULL;

-- Conversations that already exist count as read, so nobody's inbox lights up
UPDATE `ChatUser` SET `lastReadAt` = NOW(3);

-- CreateIndex
CREATE INDEX `Message_chatId_createdAt_idx` ON `Message`(`chatId`, `createdAt`);
