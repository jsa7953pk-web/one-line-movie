/**
 * One-Line Movie V4 – Free Echo Worker
 * 비용 없음 / 상태 확인용 서버
 * Cloudflare Workers 기준
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const msg = url.searchParams.get("msg") || "";

    const result = {
      ok: true,
      engine: "one-line-movie-v4",
      mode: "server-echo",
      received: msg,
      timestamp: new Date().toISOString(),
      note: "서버가 정상 작동 중입니다"
    };

    return new Response(
      JSON.stringify(result, null, 2),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
};