/**
 * One-Line Movie V4 – Smart Worker (with Admin Maintenance Switch)
 * 고객은 사용만 / 관리자만 점검 ON-OFF
 * Cloudflare Workers + KV(SETTINGS) 필요
 * env: ADMIN_KEY
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function text(msg, status = 200) {
  return new Response(msg, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function isMaintenance(env) {
  // KV에 maintenance = "1" 이면 점검모드
  const v = await env.SETTINGS.get("maintenance");
  return v === "1";
}

function adminOk(request, env) {
  const keyQ = new URL(request.url).searchParams.get("key") || "";
  const keyH = request.headers.get("Authorization") || "";
  // 둘 중 하나만 맞아도 OK
  return keyQ === env.ADMIN_KEY || keyH === `Bearer ${env.ADMIN_KEY}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") return text("OK", 200);

    const path = url.pathname;

    // 0) 상태 확인 (누구나 가능)
    if (path === "/" || path === "/status") {
      const maintenance = await isMaintenance(env);
      return json({
        ok: true,
        engine: "one-line-movie-v4",
        maintenance,
        timestamp: new Date().toISOString(),
      });
    }

    // 1) 관리자: 점검 ON/OFF (관리자만)
    // /admin/maintenance?on=1&key=ADMIN_KEY
    if (path === "/admin/maintenance") {
      if (!adminOk(request, env)) return json({ ok: false, error: "NO_ADMIN" }, 401);

      const on = url.searchParams.get("on"); // "1" or "0"
      const value = on === "1" ? "1" : "0";
      await env.SETTINGS.put("maintenance", value);

      return json({
        ok: true,
        maintenance: value === "1",
        note: value === "1" ? "점검모드 ON" : "점검모드 OFF",
      });
    }

    // 2) V4 엔진 호출 엔드포인트 (고객이 쓰는 곳)
    // /v4?line=한줄&genre=미스터리&tone=건조&len=60
    if (path === "/v4") {
      const maintenance = await isMaintenance(env);
      if (maintenance) {
        // 게임처럼 점검중 응답
        return json({
          ok: false,
          maintenance: true,
          message: "서비스 점검 중입니다. 잠시 후 다시 시도해주세요.",
        }, 503);
      }

      const line = (url.searchParams.get("line") || "").trim();
      const genre = url.searchParams.get("genre") || "미스터리";
      const tone = url.searchParams.get("tone") || "건조·진지";
      const len = url.searchParams.get("len") || "60";

      // 지금은 “서버가 V4를 받았다” 수준으로 반환 (안전/무료)
      // 다음 단계에서 여기서 진짜 V4 생성 로직(프롬프트/씬/SRT)을 넣으면 됨.
      return json({
        ok: true,
        engine: "one-line-movie-v4",
        mode: "v4-api",
        input: { line, genre, tone, len },
        note: "V4 서버 뇌 연결 성공 (다음: 생성 로직 넣기)",
        timestamp: new Date().toISOString(),
      });
    }

    // 그 외
    return json({ ok: false, error: "NOT_FOUND", path }, 404);
  },
};