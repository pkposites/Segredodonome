// Página mostrada em /painel sem a chave certa: gera a chave no navegador do Rob (nunca no
// servidor) e mostra, passo a passo, onde cadastrá-la e qual é o link final do painel.
export const PAGINA_ACESSO = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Acesso ao painel · Segredo do Nome</title>
<style>
:root{--fundo:#140e1a;--cartao:#1e1626;--borda:#3a2d47;--texto:#f3ece6;--apoio:#bfb3c4;--coral:#ff8a6b;--ouro:#f2c879;--ok:#8fd6a8;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--fundo);color:var(--texto);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif;padding:28px 16px 48px}
main{max-width:560px;margin:0 auto;display:grid;gap:18px}h1{font-size:26px;margin:0}p{margin:0;color:var(--apoio)}
ol{margin:0;padding-left:22px;display:grid;gap:14px}li b{color:var(--texto)}
.cx{background:var(--cartao);border:1px solid var(--borda);border-radius:12px;padding:12px 14px;display:flex;gap:10px;align-items:center;justify-content:space-between}
.cx code{font:15px ui-monospace,Menlo,Consolas,monospace;overflow-wrap:anywhere;color:var(--ouro);min-width:0}
button{font:600 14px system-ui,sans-serif;border:0;border-radius:8px;padding:9px 14px;cursor:pointer;background:var(--ouro);color:#1a0f12;flex:none}
button:focus-visible{outline:2px solid var(--coral);outline-offset:2px}button.ok{background:var(--ok)}
.aviso{border-left:3px solid var(--coral);padding:6px 12px;color:var(--apoio);font-size:14px}
a{color:var(--ouro)}
</style></head><body><main>
<h1>Acesso ao painel</h1>
<p id="motivo">Este link não tem a chave do painel. Crie a sua em 1 minuto:</p>
<ol>
  <li>Esta é a sua chave, gerada agora no seu navegador. <b>Copie:</b>
    <div class="cx"><code id="chave"></code><button type="button" data-copiar="chave">Copiar</button></div></li>
  <li>Na Cloudflare: <b>Workers &amp; Pages → segredodonome → Settings → Variables and Secrets → Add</b>.
    Tipo <b>Secret</b>, nome <b>PAINEL_CHAVE</b>, cole a chave no valor e clique em <b>Deploy</b>.</li>
  <li>Este é o <b>seu link do painel</b>. Copie e salve nos favoritos:
    <div class="cx"><code id="link"></code><button type="button" data-copiar="link">Copiar</button></div>
    <p style="margin-top:8px"><a id="abrir" href="#">Abrir o painel</a> (funciona depois do passo 2)</p></li>
</ol>
<p class="aviso">Quem tiver esse link vê os números e pode editar gasto e taxas. Não compartilhe. Para trocar, gere outra chave aqui e substitua o Secret.</p>
</main>
<script>
(function () {
  var letras = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  var bytes = new Uint8Array(32); crypto.getRandomValues(bytes);
  var chave = ""; for (var i = 0; i < bytes.length; i++) chave += letras[bytes[i] % letras.length];
  var link = location.origin + "/painel?k=" + chave;
  document.getElementById("chave").textContent = chave;
  document.getElementById("link").textContent = link;
  document.getElementById("abrir").href = link;
  if (new URLSearchParams(location.search).get("k")) {
    document.getElementById("motivo").textContent = "A chave deste link não confere com a cadastrada na Cloudflare. Use o link salvo, ou crie uma chave nova:";
  }
  document.querySelectorAll("[data-copiar]").forEach(function (b) {
    b.addEventListener("click", function () {
      var texto = document.getElementById(b.getAttribute("data-copiar")).textContent;
      navigator.clipboard.writeText(texto).then(function () { b.textContent = "Copiado"; b.className = "ok"; },
        function () { var r = document.createRange(); r.selectNodeContents(document.getElementById(b.getAttribute("data-copiar"))); var s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Ctrl+C"; });
    });
  });
})();
</script></body></html>`;
