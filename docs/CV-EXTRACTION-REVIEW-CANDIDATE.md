# ARIA HUB — CV Extraction & Applicant Review (Candidate)

**Branch:** feature/applicant-intelligence-milestone-1

**STATUS: source implementation in progress, NOT deployed, no Vercel, no main merge, no Oracle service, no production database change.**

## What this slice adds
- Applicant CV private library upload and download (existing M2) remain unchanged and gated.
- Additive `ApplicantDocument` attempt, claim, retry and review-timestamp metadata.
- Dedicated opt-in local extractor `scripts/applicant-cv-extraction-worker.ts`. No Next.js HTTP request runs PDF parsing or OCR, and no AI model is called.
- Extracts native PDFs (Poppler `pdfinfo` + `pdftotext`), DOCX `word/document.xml` (`unzip -p`), and JPG/PNG/WebP photos (Sharp normalized PNG + Tesseract `eng+fas+pus`). Scanned PDFs fall back to OCR of at most three pages.
- Bounded one-pass PDF page count (max 12), input max 8MB, subprocess 8–30s deadlines, max stdout 250k, image pixel/resize caps and no shell arguments.
- Hash-parity checked on fetched bytes; uploaded CV already passed ClamAV and extension/signature validation.
- Extracted facts are **proposals**, not verified. Candidate evidence snippet and confidence saved privately; no full raw CV or personal text in operational logs.
- Explicit EN/FA/PS review UI. User selects which facts are correct, corrects them, and confirms. Existing verified facts are preserved by default; overwrite requires a separate explicit selection.
- Review API is applicant-owned, transactionally locks the applicant/document, rejects stale hash/second review, and writes only approved fields into `ApplicantProfile.verifiedCareerFacts`.
- Matcher can reload verified education/skills; CV Builder includes a manual **Import reviewed profile** button to seed skills, languages, certifications and incomplete education/employment entries without fabricating job titles, employers, schools or dates. It never overwrites existing editor text.
- Important: full CV sync **across devices is not implemented** by this slice. Existing browser-local drafts stay available.

## Feature flags OFF by default
- `APPLICANT_AUTH_ENABLED=true`
- `CLOUD_CV_STORAGE_ENABLED=true`
- `CV_CLAMAV_ENABLED=true`
- `CV_OCR_ENABLED=true` **only in private staging after real OCR QA**
- `APPLICANT_MATCHER_V3_ENABLED=true` to allow verified career facts endpoint for Matcher and CV Builder.
- `CV_PRIVATE_BUCKET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` server secrets only. The bucket MUST be verified private.

## Manual private staging checks
1. Verify a confidential test-only Supabase Storage bucket (public=false) and the Next.js server database identity. Never use production applicant data.
2. Install and validate Poppler (`pdftotext`, `pdfinfo`, `pdftoppm`), `unzip`, Sharp native library, ClamAV (`clamscan`), Tesseract and traineddata `eng`, `fas`, `pus` **on the actual ARM64 environment**. `tesseract --list-langs` must list all three; missing packs cause a safe extraction failure rather than claiming successful OCR.
3. Run candidate CI: clean PostgreSQL migration and zero schema drift, `tsc --noEmit`, focused extraction and previous applicant tests, dry-run worker, standalone build.
4. Manual read-only report: `bun --conditions=react-server scripts/applicant-cv-extraction-worker.ts`; never enables writes.
5. With isolated staging bucket and verified test documents only: `CV_OCR_ENABLED=true bun --conditions=react-server scripts/applicant-cv-extraction-worker.ts --apply`. Claims at most 3 rows/tick; automatically recovers stale 20-min leases, max 3 attempts. **No schedule configured.**
6. Test 12-page text PDF, image-only PDF, native DOCX, scanned CV phone photo, Persian, Pashto and English, multiple columns, poorly lit images, malformed and malware files, very large documents, corrupted ZIP; compare to hand-verified ground truth.
7. Inspect owner-only review page and confirm no profile writes before consent; test correction/duplicate review/stale hash, two different applicant accounts, delete while processing, and origin/CSRF guards.
8. Confirm reviewed education/skills flow into Matcher and a manually imported CV Builder draft without overwriting previous verified facts.
9. Manually verify no PII in worker logs, DB error fields, HTTP caching or telemetry. Set retention and account deletion policy before release.
10. Never merge/deploy until full strict CI, Supabase least-privilege RLS evaluation, privacy compliance and owner sign-off.

## Known blockers (DO NOT OVERSTATE)
- Real OCR accuracy on Afghan Persian/Pashto scans and ARM64 tool availability has NOT been measured. No benchmark corpus has been run. OCR is offline by default.
- Structured work history is retained as user-reviewed **excerpts**, not auto-inferred employer, dates or achievements. More advanced extraction/AI interpretation would require separate guarded implementation.
- OCR/image pre-processing failure modes and Zip/PDF adversarial fuzzing need independent security review.
- Existing strict CI dependency advisories and inherited worker/translation suite issues remain separate merge blockers.
- Private CV cross-device draft syncing, multiple CV versions on cloud, full applicant deletion/export, WhatsApp, mobile push, expanded admin modules and owner-viewable staging are still incomplete.

**Outcome: CV Intelligence candidate added; full master implementation remains incomplete.**
