#!/usr/bin/env bash
# Test de fumée après la mise en ligne. Usage : ./scripts/test-production.sh https://votre-domaine.com
set -u
BASE="${1:?Usage: $0 https://votre-domaine.com}"
ok=0; ko=0
verifie() { # nom, attendu, obtenu
  if [ "$2" = "$3" ]; then echo "  OK   $1"; ok=$((ok+1)); else echo "  ECHEC $1 (attendu $2, obtenu $3)"; ko=$((ko+1)); fi
}
echo "Test de $BASE"
REDIR=$(curl -s -o /dev/null -w "%{http_code}" "${BASE/https:/http:}/api/sante"); case "$REDIR" in 301|308) REDIR=ok;; esac; verifie "HTTP redirige vers HTTPS" "ok" "$REDIR"
verifie "/api/sante répond 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/sante")"
verifie "commandes sans jeton => 401" "401" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/orders")"
EMAIL="test$(date +%s)@exemple.com"
CODE=$(curl -s -o /tmp/reg.json -w '%{http_code}' -H 'Content-Type: application/json' \
  -d "{\"nom\":\"Test\",\"prenom\":\"Prod\",\"email\":\"$EMAIL\",\"mot_de_passe\":\"Test12345\"}" "$BASE/api/auth/register")
verifie "inscription => 201" "201" "$CODE"
TOKEN=$(sed -n 's/.*"token":"\([^"]*\)".*/\1/p' /tmp/reg.json)
verifie "historique des commandes avec jeton => 200" "200" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$BASE/api/orders")"
verifie "paiement d'une commande inexistante => 404" "404" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"carte":{"numero":"4242424242424242","expiration":"12/30","cvv":"123"}}' "$BASE/api/orders/999999/pay")"
rm -f /tmp/reg.json
echo "Résultat : $ok OK, $ko échec(s)"; [ "$ko" -eq 0 ]
