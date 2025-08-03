-- CreateTable
CREATE TABLE `devices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `device_id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NULL,
    `location` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `last_seen` DATETIME(0) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `devices_device_id_key`(`device_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sensor_readings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `device_id` VARCHAR(50) NOT NULL,
    `temperature` DECIMAL(4, 1) NOT NULL,
    `humidity` DECIMAL(4, 1) NOT NULL,
    `recorded_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_readings_device_id`(`device_id`),
    INDEX `idx_readings_recorded_at`(`recorded_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `relays` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `device_id` VARCHAR(50) NOT NULL,
    `relay_channel` INTEGER NOT NULL,
    `name` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `desired_state` BOOLEAN NOT NULL DEFAULT false,
    `current_state` BOOLEAN NOT NULL DEFAULT false,
    `last_updated` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `relays_device_id_relay_channel_key`(`device_id`, `relay_channel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `relay_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `relay_id` INTEGER NOT NULL,
    `schedule_name` VARCHAR(100) NULL,
    `start_time` TIME NOT NULL,
    `duration_minutes` INTEGER NOT NULL,
    `days_of_week` VARCHAR(7) NULL DEFAULT '1111111',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `idx_schedules_relay_id`(`relay_id`),
    UNIQUE INDEX `relay_schedules_relay_id_start_time_days_of_week_key`(`relay_id`, `start_time`, `days_of_week`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `fullName` VARCHAR(100) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sensor_readings` ADD CONSTRAINT `sensor_readings_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `devices`(`device_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `relays` ADD CONSTRAINT `relays_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `devices`(`device_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `relay_schedules` ADD CONSTRAINT `relay_schedules_relay_id_fkey` FOREIGN KEY (`relay_id`) REFERENCES `relays`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
