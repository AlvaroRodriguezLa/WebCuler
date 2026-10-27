import { json } from './_lib/auth.mjs';
import { deletePublished, listArticleIndex, listDrafts, listPublished, loadDraft, loadPublished, saveArticle } from './_lib/articles.mjs';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, 'https://studio.invalid');
      const slug = url.searchParams.get('slug');
      const published = url.searchParams.get('published') === 'true';
      if (url.searchParams.get('index') === 'all' && !slug) return json(res, 200, { ok: true, result: await listArticleIndex(req, res) });
      const result = slug ? (published ? await loadPublished(req, res, slug) : await loadDraft(req, res, slug)) : (published ? await listPublished(req, res) : await listDrafts(req, res));
      return json(res, 200, { ok: true, result });
    }
    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const result = await saveArticle(req, res, body);
      return json(res, 200, result);
    }
    if (req.method === 'DELETE') {
      const url = new URL(req.url, 'https://studio.invalid');
      const slug = url.searchParams.get('slug');
      if (!slug) return json(res, 400, { ok: false, error: 'Indica qué artículo publicado quieres eliminar.' });
      const result = await deletePublished(req, res, slug);
      return json(res, 200, result);
    }
    res.setHeader('Allow', 'GET, POST, DELETE');
    return json(res, 405, { ok: false, error: 'Método no permitido.' });
  } catch (error) {
    return json(res, error.status || 500, { ok: false, error: error.message || 'No se pudo completar la operación.' });
  }
}
