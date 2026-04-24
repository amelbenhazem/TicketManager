# =============================================================================
# TicketManager — sorties Terraform (infra AKS)
# =============================================================================

output "resource_group_name" {
  description = "Nom du groupe de ressources créé."
  value       = azurerm_resource_group.main.name
}

output "resource_group_id" {
  description = "Identifiant ARM du groupe de ressources."
  value       = azurerm_resource_group.main.id
}

output "location" {
  description = "Région Azure déployée."
  value       = azurerm_resource_group.main.location
}

output "virtual_network_name" {
  description = "Nom du réseau virtuel."
  value       = azurerm_virtual_network.main.name
}

output "virtual_network_id" {
  description = "Identifiant ARM du VNet."
  value       = azurerm_virtual_network.main.id
}

output "aks_subnet_name" {
  description = "Nom du sous-réseau des nœuds AKS."
  value       = azurerm_subnet.aks.name
}

output "aks_subnet_id" {
  description = "Identifiant ARM du sous-réseau AKS."
  value       = azurerm_subnet.aks.id
}

output "network_security_group_name" {
  description = "Nom du NSG associé au sous-réseau AKS."
  value       = azurerm_network_security_group.aks.name
}

output "network_security_group_id" {
  description = "Identifiant ARM du NSG."
  value       = azurerm_network_security_group.aks.id
}

output "aks_cluster_name" {
  description = "Nom du cluster Kubernetes managé."
  value       = azurerm_kubernetes_cluster.main.name
}

output "aks_cluster_id" {
  description = "Identifiant ARM du cluster AKS."
  value       = azurerm_kubernetes_cluster.main.id
}

output "aks_fqdn" {
  description = "FQDN public du serveur API Kubernetes (si applicable)."
  value       = azurerm_kubernetes_cluster.main.fqdn
}

output "aks_kubernetes_version" {
  description = "Version Kubernetes effective du plan de contrôle."
  value       = azurerm_kubernetes_cluster.main.kubernetes_version
}

output "aks_node_resource_group" {
  description = "Groupe de ressources contenant les nœuds et ressources infra du cluster."
  value       = azurerm_kubernetes_cluster.main.node_resource_group
}

output "aks_identity_principal_id" {
  description = "Object ID de l’identité managée du cluster (SystemAssigned), utile pour RBAC Azure."
  value       = azurerm_kubernetes_cluster.main.identity[0].principal_id
}

output "kube_config_raw" {
  description = "Kubeconfig admin encodé (base64). À manipuler avec précaution ; préférer Azure AD / workload identity en production."
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive   = true
}
