#!/usr/bin/env bash
# Déploie MongoDB in-cluster + met à jour le secret backend + rollout.
# Usage sur vm-gestion :
#   export KUBECONFIG=~/kubernetes/ticketmanager-k8s/kubeconfig/kubeconfig.dc2.json
#   cd ~/azagent/_work/1/s   # ou repo avec k8s/
#   chmod +x k8s/deploy-mongodb-incluster.sh
#   ./k8s/deploy-mongodb-incluster.sh
#
# Variables optionnelles :
#   JWT_SECRET=...     (sinon lu depuis le pod backend en cours)
#   SKIP_MIGRATE=1     (ne pas copier les données depuis vm-db)
#   APPLY_HOSTPATH_PV=1 (force mongodb-pv-hostpath.yaml si PVC Pending)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
K8S_DIR="$ROOT/k8s"
NAMESPACE="${NAMESPACE:-ticketmanager}"

export KUBECONFIG="${KUBECONFIG:-$HOME/kubernetes/ticketmanager-k8s/kubeconfig/kubeconfig.dc2.json}"

if [[ ! -f "$KUBECONFIG" ]]; then
  echo "KUBECONFIG introuvable: $KUBECONFIG" >&2
  exit 1
fi

for f in mongodb-service.yaml mongodb-statefulset.yaml backend-deployment.yaml; do
  if [[ ! -f "$K8S_DIR/$f" ]]; then
    echo "Fichier manquant: $K8S_DIR/$f" >&2
    echo "Téléchargez depuis GitHub :" >&2
    echo "  curl -fsSL -o $K8S_DIR/$f https://raw.githubusercontent.com/amelbenhazem/TicketManager/main/k8s/$f" >&2
    exit 1
  fi
done

echo "==> MongoDB Service + StatefulSet"
kubectl apply -f "$K8S_DIR/mongodb-service.yaml"
kubectl apply -f "$K8S_DIR/mongodb-statefulset.yaml"

if [[ "${APPLY_HOSTPATH_PV:-}" == "1" ]]; then
  echo "==> PV hostPath (optionnel)"
  kubectl apply -f "$K8S_DIR/mongodb-pv-hostpath.yaml"
  kubectl delete pod mongodb-0 -n "$NAMESPACE" --ignore-not-found --wait=false
fi

echo "==> Attente pod MongoDB"
if ! kubectl wait --for=condition=ready pod -l app=mongodb -n "$NAMESPACE" --timeout=300s 2>/dev/null; then
  echo "##[warning]PVC peut être Pending — sur worker 10.1.3.4 :"
  echo "  sudo mkdir -p /var/lib/ticketmanager/mongodb && sudo chown 999:999 /var/lib/ticketmanager/mongodb"
  echo "  APPLY_HOSTPATH_PV=1 $0"
  kubectl get pvc -n "$NAMESPACE"
  kubectl describe pod -n "$NAMESPACE" -l app=mongodb | tail -30
  exit 1
fi

if [[ "${SKIP_MIGRATE:-}" != "1" && -x "$K8S_DIR/migrate-mongodb-from-vm-db.sh" ]]; then
  echo "==> Migration données vm-db -> pod K8s"
  "$K8S_DIR/migrate-mongodb-from-vm-db.sh" || echo "##[warning]Migration ignorée ou échouée (vm-db off ?)"
fi

echo "==> JWT_SECRET"
JWT="${JWT_SECRET:-}"
if [[ -z "$JWT" ]]; then
  JWT="$(kubectl exec -n "$NAMESPACE" deployment/ticket-backend -- printenv JWT_SECRET 2>/dev/null || true)"
fi
if [[ -z "$JWT" || "$JWT" == "..." ]]; then
  echo "JWT_SECRET invalide. Exportez la variable du pipeline Azure DevOps :" >&2
  echo "  export JWT_SECRET='votre_secret'" >&2
  exit 1
fi

CORS_ORIGIN="${CORS_ORIGIN:-http://102.141.206.164:30080,http://10.1.3.4:30080,http://10.1.3.5:30080}"
MONGODB_URI="${MONGODB_URI:-mongodb://mongodb:27017/ticketmanager}"

echo "==> Secret backend-secret"
kubectl create secret generic backend-secret \
  -n "$NAMESPACE" \
  --from-literal=MONGODB_URI="$MONGODB_URI" \
  --from-literal=JWT_SECRET="$JWT" \
  --from-literal=JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-7d}" \
  --from-literal=NODE_ENV="production" \
  --from-literal=PORT="3001" \
  --from-literal=CORS_ORIGIN="$CORS_ORIGIN" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "==> Backend deployment (initContainer wait-for-mongodb)"
kubectl apply -f "$K8S_DIR/backend-deployment.yaml"
kubectl rollout restart deployment/ticket-backend -n "$NAMESPACE"
kubectl rollout status deployment/ticket-backend -n "$NAMESPACE" --timeout=300s

echo ""
kubectl get pods,svc -n "$NAMESPACE"
echo ""
echo "==> Test login"
curl -sf -X POST "http://10.1.3.4:30081/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rfc.com","password":"Admin123!"}' | head -c 120
echo ""
