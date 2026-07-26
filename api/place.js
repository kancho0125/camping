// 카카오 로컬 키워드 검색 프록시 — REST 키를 브라우저에 노출하지 않기 위한 서버리스 함수.
// Vercel 환경변수 KAKAO_REST_KEY 필요. 캠핑장 상호(POI) 검색용.
export default async function handler(req, res) {
  const q = (req.query.q || '').toString().trim();
  if (!q) { res.status(400).json({ error: 'q required' }); return; }
  const key = process.env.KAKAO_REST_KEY;
  if (!key) { res.status(503).json({ error: 'no key' }); return; }
  try {
    const r = await fetch(
      'https://dapi.kakao.com/v2/local/search/keyword.json?size=5&query=' + encodeURIComponent(q),
      { headers: { Authorization: 'KakaoAK ' + key } }
    );
    if (!r.ok) { res.status(502).json({ error: 'kakao ' + r.status }); return; }
    const j = await r.json();
    const out = (j.documents || []).map(d => ({
      name: d.place_name,
      addr: d.road_address_name || d.address_name || '',
      lat: parseFloat(d.y),
      lng: parseFloat(d.x),
      category: d.category_group_name || ''
    }));
    res.setHeader('Cache-Control', 's-maxage=86400');
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: 'fail' });
  }
}
