# =============================================================================
# 07 — Périmètre Kubernetes (AKS / AKS Engine) sur Azure Stack Hub
# =============================================================================
# Ce fichier ne crée pas le cluster Kubernetes : sur Azure Stack Hub, le
# déploiement complet du plan de contrôle et des nœuds relève souvent d'outils
# comme AKS Engine (génération de modèles ARM) ou d'offres Kubernetes du portail.
#
# Terraform fournit ici le sous-réseau dédié (azurestack_subnet.aks) et le NSG
# associé, ce qui permet :
#   - de documenter l'architecture dans le rapport ;
#   - d'enchaîner ensuite avec Ansible / manifests sans ambiguïté d'adressage.
# =============================================================================

# (Aucune ressource supplémentaire requise dans ce fichier.)
