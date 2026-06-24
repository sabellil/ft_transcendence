-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('Online', 'Offline');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('User', 'Moderator', 'Admin');

-- CreateEnum
CREATE TYPE "UsershipStatus" AS ENUM ('Pending', 'Requested', 'Friend', 'Blocked');

-- CreateEnum
CREATE TYPE "GuildshipStatus" AS ENUM ('UserRequest', 'OwnerRequest', 'User', 'Owner');

-- CreateEnum
CREATE TYPE "CardRarity" AS ENUM ('Common', 'Uncommon', 'Rare', 'Legendary');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('None', 'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon');

-- CreateEnum
CREATE TYPE "CardshipStatus" AS ENUM ('Unpossessed', 'Possessed', 'Wanted', 'Available');

-- CreateEnum
CREATE TYPE "CardshipExchangeStatus" AS ENUM ('ExchangePending', 'ExchangeRequested');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '',
    "status" "UserStatus" NOT NULL DEFAULT 'Offline',
    "role" "UserRole" NOT NULL DEFAULT 'User',
    "usershipIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "cardshipIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "cardshipExchangeIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "messageIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usership" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "UsershipStatus" NOT NULL,

    CONSTRAINT "Usership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "banner" TEXT NOT NULL DEFAULT '',
    "guildshipIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guildship" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "GuildshipStatus" NOT NULL,

    CONSTRAINT "Guildship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "pokemon" TEXT NOT NULL,
    "rarity" "CardRarity" NOT NULL DEFAULT 'Common',
    "type" "CardType" NOT NULL DEFAULT 'None',
    "subType" "CardType" NOT NULL DEFAULT 'None',
    "health" INTEGER NOT NULL DEFAULT 0,
    "image" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cardship" (
    "id" SERIAL NOT NULL,
    "cardId" INTEGER NOT NULL,
    "status" "CardshipStatus" NOT NULL,

    CONSTRAINT "Cardship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardshipExchange" (
    "id" SERIAL NOT NULL,
    "cardId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "CardshipExchangeStatus" NOT NULL,

    CONSTRAINT "CardshipExchange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_name_key" ON "Guild"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Card_name_key" ON "Card"("name");
