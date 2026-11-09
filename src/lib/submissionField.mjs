// Attach field feedback to its label/control without removing an existing hint.
export function setSubmissionFieldError(control, message = '') {
  const feedback = control.closest('.submission-field')?.querySelector('[data-field-error]');
  if (message) control.setAttribute('aria-invalid', 'true');
  else control.removeAttribute('aria-invalid');
  if (!feedback) return;
  const ids = (control.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== feedback.id);
  feedback.textContent = message;
  feedback.hidden = !message;
  if (message) ids.push(feedback.id);
  if (ids.length) control.setAttribute('aria-describedby', ids.join(' '));
  else control.removeAttribute('aria-describedby');
}

export function focusSubmissionField(control) {
  control.focus({ preventScroll: true });
  control.scrollIntoView({ block: 'center' });
}
