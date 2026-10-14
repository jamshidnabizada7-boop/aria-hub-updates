ALTER TABLE "ApplicantWhatsAppContact" ADD COLUMN "phoneLookupHash" TEXT;
ALTER TABLE "ApplicantWhatsAppContact" ADD COLUMN "lastInboundAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "ApplicantWhatsAppContact_phoneLookupHash_key" ON "ApplicantWhatsAppContact"("phoneLookupHash");
ALTER TABLE "ApplicantChannelDelivery" ADD COLUMN "providerMessageId" TEXT;
