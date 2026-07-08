import katex from 'katex';
import { micromark } from 'micromark';
import { gfm, gfmHtml } from 'micromark-extension-gfm';
import { math, mathHtml } from 'micromark-extension-math';

function sanitizeRenderedHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  const allowedTags = new Set([
    'A',
    'BLOCKQUOTE',
    'BR',
    'CODE',
    'DIV',
    'EM',
    'H1',
    'H2',
    'H3',
    'H4',
    'HR',
    'LI',
    'OL',
    'P',
    'PRE',
    'SPAN',
    'STRONG',
    'TABLE',
    'TBODY',
    'TD',
    'TH',
    'THEAD',
    'TR',
    'UL',
  ]);
  const allowedAttributes = new Set(['aria-hidden', 'class', 'colspan', 'href', 'rel', 'rowspan', 'target', 'title']);

  template.content.querySelectorAll('*').forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(document.createTextNode(element.textContent || ''));
      return;
    }

    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || !allowedAttributes.has(name)) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (name === 'href') {
        try {
          const url = new URL(attribute.value, window.location.origin);
          if (!['http:', 'https:'].includes(url.protocol)) {
            element.removeAttribute(attribute.name);
          }
        } catch {
          element.removeAttribute(attribute.name);
        }
      }
    }
  });

  template.content.querySelectorAll('a[href]').forEach((link) => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noreferrer');
  });

  return template.innerHTML;
}

export function renderMarkdown(text) {
  return sanitizeRenderedHtml(
    micromark(String(text || ''), {
      extensions: [gfm(), math()],
      htmlExtensions: [gfmHtml(), mathHtml({ katex, throwOnError: false, strict: false })],
      allowDangerousHtml: false,
    }),
  );
}
