# Aponta palavras com gênero marcado nos textos de content/nome (escrita neutra é o padrão).
# Uso: python3 -I worker/scripts/lint-genero.py content/nome
import json, re, sys, pathlib
RAIZES = r"lembrad|just|compreendid|generos|equilibrad|querid|respeitad|tímid|indecis|ouvid|amad|inquiet|reservad|sincer|microgerenciad|human|sobrecarregad|exaust|controlad|limitad|cansad|sozinh|preocupad|determinad|decidid|tranquil|calm|segur|obrigad|apaixonad|ansios|pres|perdid|julgad|vist|valorizad|reconhecid|escolhid|cobrad|esquecid|organizad|focad|dedicad|ocupad|magoad|frustrad|realizad|admirad|intimidad|pressionad|apagad|motivad|cuidados|rígid|fechad|lent|resistent|ingênu|ingrat|bondos|confiáve|disperso|sufocad|perfeit|bom|boa|vivo|apegad|desapegad|conservador|intimidador|ser bom|acolhedor|compreensiv|bem-sucedid|sério|séria|calad|dur|pronto"
PADRAO = re.compile(r"\b(você|te|ser|é|ficar|fica|sente|sentir|esteja|estar|está|seja|parecer|parece|deixa|deixar|mesmo)\b([^.,;:!?]{0,25}?)\b((?:" + RAIZES + r")[oa]s?)\b", re.I)
def textos(o, caminho=""):
    if isinstance(o, str):
        yield caminho, o
    elif isinstance(o, list):
        for i, x in enumerate(o): yield from textos(x, f"{caminho}[{i}]")
    elif isinstance(o, dict):
        if set(o) == {"ela", "ele", "neutro"}: return
        for k, v in o.items():
            if not k.startswith("_"): yield from textos(v, f"{caminho}.{k}")
total = 0
for arq in sorted(pathlib.Path(sys.argv[1]).glob("*.json")):
    for cam, t in textos(json.loads(arq.read_text(encoding="utf-8"))):
        for m in PADRAO.finditer(t):
            total += 1
            print(f"{arq.name}{cam}: …{m.group(0)}…")
print(f"{total} ocorrências", file=sys.stderr)
