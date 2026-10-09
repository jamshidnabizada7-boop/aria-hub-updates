ALTER TABLE "Opportunity" ADD COLUMN "publicationRevision" INTEGER NOT NULL DEFAULT 0;
CREATE FUNCTION public.aria_opportunity_publication_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW."status" IS DISTINCT FROM OLD."status" AND NEW."status"='published' THEN
  NEW."publicationRevision" := OLD."publicationRevision" + 1;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.aria_opportunity_publication_revision() FROM PUBLIC;
CREATE TRIGGER "Opportunity_publication_revision" BEFORE UPDATE OF "status" ON "Opportunity"
 FOR EACH ROW EXECUTE FUNCTION public.aria_opportunity_publication_revision();
