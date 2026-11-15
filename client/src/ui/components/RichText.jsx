// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Text with tiny mark-up:
//   [[id]]         a glossary word (underlined, clickable)
//   [[id|text]]    a glossary word showing another text
//   **bold**
// Accepts a string or a bilingual object { es, en } (it picks the active language).
//   <RichText text={{ es: 'Una [[cme|nube de plasma]]', en: 'A [[cme|plasma cloud]]' }} as="p" className="..." />
import { Fragment } from 'react';
import { GLOSSARY } from '../../content/glossary.js';
import { pick, useI18n } from '../../i18n.jsx';
import { Term } from './Glossary.jsx';

const TOKEN = /\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]|\*\*([^*]+)\*\*/gi;

/** Splits a marked-up string into parts: { kind: 'text' | 'term' | 'bold', ... }. */
export function parseRich(text) {
  const out = [];
  let last = 0;
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text))) {
    if (m.index > last) out.push({ kind: 'text', value: text.slice(last, m.index) });
    if (m[1]) out.push({ kind: 'term', id: m[1].toLowerCase(), label: m[2] });
    else out.push({ kind: 'bold', value: m[3] });
    last = TOKEN.lastIndex;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}

/** Renders parsed parts. Bold text is parsed again, so a glossary word inside **bold** still works ("**4 rocas de [[anorthosite]]**"). */
function renderParts(parts, lang) {
  return parts.map((p, i) => {
    if (p.kind === 'text') return <Fragment key={i}>{p.value}</Fragment>;
    if (p.kind === 'bold') return <strong key={i}>{renderParts(parseRich(p.value), lang)}</strong>;
    const entry = GLOSSARY[p.id];
    if (!entry) return <Fragment key={i}>{p.label ?? p.id}</Fragment>;
    return (
      <Term key={i} id={p.id}>
        {p.label ?? entry[lang]?.term ?? entry.es.term}
      </Term>
    );
  });
}

export default function RichText({ text, as: Tag = 'span', className }) {
  const { lang } = useI18n();
  const str = pick(text, lang);
  if (!str) return null;
  return <Tag className={className}>{renderParts(parseRich(str), lang)}</Tag>;
}
