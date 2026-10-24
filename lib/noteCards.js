const BLOCK_PATTERN = /<(h[1-6]|p|li|blockquote|pre)[^>]*>[\s\S]*?<\/\1>/gi;

export function notePlainText(html = "") {
  return String(html)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(value) {
  const text = notePlainText(value);
  return text ? text.split(/\s+/).length : 0;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function splitOversizedBlock(block, targetWords) {
  if (wordCount(block) <= targetWords * 1.15 || /^<h[1-6]/i.test(block)) return [block];

  const segmented = String(block)
    .replace(/<br\s*\/?>/gi, " ||| ")
    .replace(/\s*•\s*/g, " ||| • ");
  const plain = notePlainText(segmented).replace(/\s*\|\|\|\s*/g, " ||| ");
  const sentences = plain
    .replace(/([.!?])\s+/g, "$1 ||| ")
    .split("|||")
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks = [];
  let current = [];
  let count = 0;

  sentences.forEach((sentence) => {
    const sentenceWords = wordCount(sentence);
    if (current.length && count + sentenceWords > targetWords) {
      chunks.push(current.join(" "));
      current = [];
      count = 0;
    }
    current.push(sentence);
    count += sentenceWords;
  });
  if (current.length) chunks.push(current.join(" "));

  return chunks.map((chunk) => `<p>${escapeHtml(chunk)}</p>`);
}

function plainTextCards(html, targetWords) {
  const text = notePlainText(html);
  if (!text) return [];

  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const cards = [];
  let current = [];
  let count = 0;

  sentences.forEach((sentence) => {
    const sentenceCount = wordCount(sentence);
    if (current.length && count + sentenceCount > targetWords) {
      cards.push(`<p>${current.join(" ").trim()}</p>`);
      current = [];
      count = 0;
    }
    current.push(sentence.trim());
    count += sentenceCount;
  });

  if (current.length) cards.push(`<p>${current.join(" ").trim()}</p>`);
  return cards;
}

export function createNoteCards(html = "", targetWords = 40) {
  const matchedBlocks = String(html).match(BLOCK_PATTERN);
  const contentCards = [];

  if (!matchedBlocks?.length) {
    return plainTextCards(html, targetWords).map((content, index, cards) => ({
      content,
      words: wordCount(content),
      label: index === 0 ? "Start here" : index === cards.length - 1 ? "Key takeaway" : `Idea ${index + 1}`,
    }));
  }

  const blocks = matchedBlocks.flatMap((block) => splitOversizedBlock(block, targetWords));

  let current = [];
  let count = 0;

  blocks.forEach((block) => {
    const isHeading = /^<h[1-6]/i.test(block);
    const blockWords = wordCount(block);

    if (current.length && (isHeading || count + blockWords > targetWords)) {
      contentCards.push(current.join(""));
      current = [];
      count = 0;
    }

    current.push(block);
    count += blockWords;
  });

  if (current.length) contentCards.push(current.join(""));

  return contentCards.map((content, index) => ({
    content,
    words: wordCount(content),
    label:
      index === 0
        ? "Start here"
        : index === contentCards.length - 1
          ? "Key takeaway"
          : `Idea ${index + 1}`,
  }));
}

export function noteCardCount(html = "") {
  return Math.max(1, createNoteCards(html).length);
}
