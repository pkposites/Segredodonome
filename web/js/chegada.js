// Roda no <head>, antes do app (script clássico, síncrono). RASTREAMENTO_META.md, 2.
// Ordem: 1) fbclid → cookie _fbc; 2) o passe (#p=) sai do endereço; 3) Pixel + PageView com event_id.
// O app.js depois tira UTMs e fbclid do endereço e manda o mesmo event_id ao Worker (rastreio.js).
(function () {
  var PIXEL_ID = "2132885950950048";
  var OFICIAL = "segredo.relatoriorda.com.br";
  var VERSAO_COOKIES = "2026-10-b"; // igual a CONFIG.VERSAO_COOKIES (js/config.js)
  if (location.hostname !== OFICIAL) return; // prévia e localhost: nenhum evento vai à Meta

  // Quem tocou em "Recusar" no aviso de cookies não é medido (oposição, LGPD art. 18, § 2º).
  var recusou = false;
  try {
    var escolha = JSON.parse(localStorage.getItem("sdn_cookies") || "null");
    recusou = !!escolha && escolha.valor === "recusado" && escolha.versao === VERSAO_COOKIES;
  } catch (e) {}

  // 1) _fbc no formato fb.1.<timestamp_ms>.<fbclid>, 90 dias, para todo o relatoriorda.com.br.
  var fbclid = new URLSearchParams(location.search).get("fbclid");
  if (!recusou && fbclid && /^[\w-]{1,500}$/.test(fbclid)) {
    var atual = (document.cookie.match(/(?:^|; )_fbc=([^;]*)/) || [])[1];
    if (!atual || atual.split(".").slice(3).join(".") !== fbclid) {
      document.cookie = "_fbc=fb.1." + Date.now() + "." + fbclid + "; domain=.relatoriorda.com.br; path=/; max-age=" + 90 * 86400 + "; SameSite=Lax; Secure";
    }
  }

  // _fbp no formato da Meta (fb.1.<timestamp_ms>.<aleatório>), criado já aqui para o primeiro envio ao
  // Worker sair com ele; o Pixel reaproveita o cookie existente em vez de criar outro.
  if (!recusou && !/(?:^|; )_fbp=/.test(document.cookie)) {
    var aleatorio = crypto.getRandomValues(new Uint32Array(1))[0];
    document.cookie = "_fbp=fb.1." + Date.now() + "." + aleatorio + "; domain=.relatoriorda.com.br; path=/; max-age=" + 90 * 86400 + "; SameSite=Lax; Secure";
  }

  // 2) O link de acesso nunca chega à Meta: o passe vai para o aparelho antes do PageView.
  var passe = location.hash.match(/^#p=([A-Za-z0-9_-]{20,4096})$/);
  if (passe) {
    try { localStorage.setItem("sdn_passe", JSON.stringify(passe[1])); } catch (e) {}
    history.replaceState(history.state, "", "/r" + location.search);
  }

  if (recusou) return;

  // 3) Código base da Meta, eventos automáticos desligados, PageView com event_id.
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  var id = crypto.randomUUID ? crypto.randomUUID() : Array.prototype.map.call(crypto.getRandomValues(new Uint8Array(16)), function (x) { return (x + 256).toString(16).slice(1); }).join("");
  window.fbq("set", "autoConfig", false, PIXEL_ID);
  window.fbq("init", PIXEL_ID);
  window.fbq("track", "PageView", {}, { eventID: id });
  // O rastreio.js usa este id no envio ao Worker do PageView da chegada (deduplicação).
  window.__sdnChegada = { eventId: id, caminho: location.pathname };
})();
