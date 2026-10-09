# CV Intelligence — isolated document-format validation

Run through the existing Applicant Candidate Verification workflow only.
The corpus is generated offline, never from private applicant CVs. Fixtures
contain fictional qualifications and real PDF/DOCX/JPEG/PNG/WebP bytes.

Coverage:
- PDF with an English embedded text layer -> Poppler / pdftotext
- English, Afghanistan Persian and Pashto DOCX -> ZIP / document.xml
- English, Afghanistan Persian and Pashto scanned PDFs -> Poppler rasterization + Tesseract
- English, Afghanistan Persian and Pashto simulated desk-photo JPEG -> Sharp + Tesseract
- English PNG and WebP OCR
- SHA-256 mismatch, malformed PDF and unapproved-facts invariants

This proves that the *actual extraction worker code* runs across formats under
an isolated Linux runner with local eng/fas/pus traineddata. OCR suggestions
are not saved into a profile without separate explicit user review.

**Limits:** Desk-camera photos are programmatically simulated, not captured on
a physical phone. No handwriting benchmark, actual applicant documents,
physical Android/iPhone photographs, real Oracle ARM64 memory profiling,
production OCR worker, network storage, or live review flow is exercised here.
Do not claim user-facing extraction or mobile production quality based on this
corpus alone.

Local reproduction after installing Poppler, Tesseract eng/fas/pus, unzip,
Pillow, python-docx, reportlab, libraqm and Noto/DejaVu fonts:

```bash
python3 scripts/tests/generate-cv-validation-corpus.py --out /tmp/aria-cv-corpus
bun --conditions=react-server test tests/applicant-cv-real-fixtures.test.ts
```

The CI job keeps every applicant feature flag OFF and never invokes staging
or production worker apply modes.
