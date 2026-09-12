import { useEffect } from 'react';

const SUFFIX = 'Hearthlog';

/**
 * Sets the document title, and optionally the meta description, per route.
 * Both matter for SEO and for anyone navigating by tab title or screen reader.
 */
export const useDocumentTitle = (title, description) => {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : `${SUFFIX} — a cozy Life RPG`;

    if (!description) return;
    const tag = document.querySelector('meta[name="description"]');
    if (tag) tag.setAttribute('content', description);
  }, [title, description]);
};

export default useDocumentTitle;
