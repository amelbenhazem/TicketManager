#!/usr/bin/env bash
# Genere kubernetes/apimodel.json depuis ~/terraform (agent-vm).
# Usage : bash generate-apimodel.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="${TF_DIR:-/home/azureuser/terraform}"
OUT="${SCRIPT_DIR}/apimodel.json"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa_ticketmanager.pub}"

if [[ ! -d "$TF_DIR" ]]; then
  echo "Erreur: dossier Terraform introuvable: $TF_DIR" >&2
  exit 1
fi

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Erreur: cle publique SSH introuvable: $SSH_KEY" >&2
  echo "Definir SSH_KEY=/chemin/vers/cle.pub ou copier id_rsa_ticketmanager.pub sur la VM." >&2
  exit 1
fi

if [[ ! -f "$TF_DIR/terraform.tfvars" ]]; then
  echo "Erreur: terraform.tfvars manquant dans $TF_DIR" >&2
  exit 1
fi

cd "$TF_DIR"

SUBNET_AKS_ID="$(terraform output -raw subnet_aks_id)"
RG="$(terraform output -raw resource_group_name)"
LOCATION="$(grep -E '^\s*location\s*=' terraform.tfvars | head -1 | sed 's/.*=\s*"\([^"]*\)".*/\1/')"
CLIENT_ID="$(grep -E '^\s*client_id\s*=' terraform.tfvars | head -1 | sed 's/.*=\s*"\([^"]*\)".*/\1/')"
CLIENT_SECRET="$(grep -E '^\s*client_secret\s*=' terraform.tfvars | head -1 | sed 's/.*=\s*"\([^"]*\)".*/\1/')"
SSH_LINE="$(tr -d '\n\r' < "$SSH_KEY")"

if [[ -z "$SUBNET_AKS_ID" || -z "$RG" || -z "$CLIENT_ID" || -z "$CLIENT_SECRET" ]]; then
  echo "Erreur: outputs Terraform ou credentials SP incomplets." >&2
  exit 1
fi

LOCATION="${LOCATION:-dc2}"

cat > "$OUT" <<EOF
{
  "apiVersion": "vlabs",
  "location": "${LOCATION}",
  "resourceGroup": "${RG}",
  "properties": {
    "orchestratorProfile": {
      "orchestratorType": "Kubernetes",
      "orchestratorVersion": "1.27.7",
      "kubernetesConfig": {
        "networkPlugin": "azure",
        "loadBalancerSku": "basic",
        "useInstanceMetadata": false,
        "enableRbac": true,
        "clusterSubnet": "ticketmanager-iac-snet-aks",
        "subnet": "ticketmanager-iac-snet-aks",
        "vnetSubnetID": "${SUBNET_AKS_ID}"
      }
    },
    "masterProfile": {
      "count": 1,
      "dnsPrefix": "ticketmanager-k8s",
      "vmSize": "Standard_D2s_v3",
      "vnetSubnetId": "${SUBNET_AKS_ID}",
      "firstConsecutiveStaticIP": "10.1.3.10",
      "vnetCidr": "10.1.0.0/16"
    },
    "agentPoolProfiles": [
      {
        "name": "agentpool",
        "count": 2,
        "vmSize": "Standard_D2s_v3",
        "availabilityProfile": "availabilityset",
        "vnetSubnetId": "${SUBNET_AKS_ID}"
      }
    ],
    "linuxProfile": {
      "adminUsername": "azureuser",
      "ssh": {
        "publicKeys": [
          {
            "keyData": "${SSH_LINE}"
          }
        ]
      }
    },
    "servicePrincipalProfile": {
      "clientId": "${CLIENT_ID}",
      "secret": "${CLIENT_SECRET}"
    }
  }
}
EOF

echo "OK: $OUT genere (contient des secrets — ne pas commiter)."
