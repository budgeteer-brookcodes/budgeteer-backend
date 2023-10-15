/*
  Warnings:

  - Added the required column `expires` to the `AccessToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AccessToken" ADD COLUMN     "expires" TIMESTAMP(3) NOT NULL;
