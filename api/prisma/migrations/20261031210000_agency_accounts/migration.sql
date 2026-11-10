-- Agency accounts: opened by registering an agency, they sign in on the
-- agency platform only. Existing agency owners are agency accounts.
ALTER TABLE `User` ADD COLUMN `accountType` ENUM('individual', 'agency') NOT NULL DEFAULT 'individual';
UPDATE `User` u JOIN `Agency` a ON a.`ownerId` = u.`id` SET u.`accountType` = 'agency';
