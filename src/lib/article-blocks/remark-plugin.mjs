import { decodeEnrichedBlock, renderArticleBlock } from '../../../public/article-blocks.mjs';
import playerAssets from '../../../public/data/player-assets-approved.json' with { type: 'json' };

const assetBase = process.env.BASE_PATH || '';

function visit(parent, file, options) {
  if (!Array.isArray(parent.children)) return;
  parent.children = parent.children.map((node) => {
    if (node.type === 'code' && ['oneshot', 'tactic', 'tactic-comparison', 'stats', 'insight', 'chart', 'source-note', 'oneshot-svg'].includes(node.lang)) {
      const line = node.position?.start?.line || 1;
      try {
        const block = decodeEnrichedBlock(node.lang, node.value, `Bloque ${node.lang} · línea ${line}`);
        const showPlayerPhotos = file.data?.astro?.frontmatter?.showPlayerPhotos === true;
        return { type: 'html', value: renderArticleBlock(block, { ...options, showPlayerPhotos }), position: node.position };
      } catch (error) {
        throw new Error(`${file.path || 'artículo Markdown'}:${line}: ${error.message}`);
      }
    }
    visit(node, file, options);
    return node;
  });
}

export function createRemarkArticleBlocks(options = {}) {
  return (tree, file) => visit(tree, file, { playerAssets, assetBase, ...options });
}

export default function remarkArticleBlocks() { return createRemarkArticleBlocks(); }
