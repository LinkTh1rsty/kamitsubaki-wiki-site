// Shared by the upload workbenches and submit endpoints. Drafts allow incomplete fields.
export function photoSubmissionIssues(metadata) {
  const fields = {};
  if (!metadata.title?.trim()) fields.title = 'gallery_title_required';
  if (!metadata.author?.trim()) fields.author = 'gallery_author_required';
  if (!metadata.sourceTitle?.trim()) fields.sourceTitle = 'gallery_source_required';
  if (!metadata.rightsBasis) fields.rightsBasis = 'gallery_rights_required';
  if (metadata.rightsBasis === 'official' && !metadata.sourceUrl?.trim())
    fields.sourceUrl = 'gallery_original_url_required';
  if (metadata.sourceUrl) {
    try {
      if (!['https:', 'http:'].includes(new URL(metadata.sourceUrl).protocol)) fields.sourceUrl = 'gallery_url_invalid';
    } catch {
      fields.sourceUrl = 'gallery_url_invalid';
    }
  }
  if (metadata.rightsBasis === 'authorized' && !metadata.rightsEvidence?.trim())
    fields.rightsEvidence = 'gallery_evidence_required';
  return fields;
}
