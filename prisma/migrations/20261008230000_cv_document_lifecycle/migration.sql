-- Candidate-only status transition support for transactional CV lifecycle.
-- Preserve all existing documents. The checks are strictly enumerated.
ALTER TABLE "ApplicantDocument" DROP CONSTRAINT "ApplicantDocument_status_check";
ALTER TABLE "ApplicantDocument" ADD CONSTRAINT "ApplicantDocument_status_check"
 CHECK ("status" IN ('storing','uploaded','processing','review','failed','deleting'));
