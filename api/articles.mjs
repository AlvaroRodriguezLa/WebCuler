import { json } from './_lib/auth.mjs';
import { listDrafts, loadDraft, saveArticle } from './_lib/articles.mjs';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, 'https://studio.invalid');
      const slug = url.searchParams.get('slug');
      const result = slug ? await loadDraft(req, res, slug) : await listDrafts(req, res);
      return json(res, 200, { ok: true, result });
    }
    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const result = await saveArticle(req, res, body);
      return json(res, 200, result);
    }
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { ok: false, error: 'Método no permitido.' });
  } catch (error) {
    return json(res, error.status || 500, { ok: false, error: error.message || 'No se pudo completar la operación.' });
  }
}
