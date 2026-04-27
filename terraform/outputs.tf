output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "resource_group_id" {
  value = azurerm_resource_group.main.id
}

output "location" {
  value = azurerm_resource_group.main.location
}

output "virtual_network_name" {
  value = azurerm_virtual_network.main.name
}

output "virtual_network_id" {
  value = azurerm_virtual_network.main.id
}

output "aks_subnet_name" {
  value = azurerm_subnet.aks.name
}

output "aks_subnet_id" {
  value = azurerm_subnet.aks.id
}

output "network_security_group_name" {
  value = azurerm_network_security_group.aks.name
}

output "network_security_group_id" {
  value = azurerm_network_security_group.aks.id
}

output "aks_cluster_name" {
  value = azurerm_kubernetes_cluster.main.name
}

output "aks_cluster_id" {
  value = azurerm_kubernetes_cluster.main.id
}

output "aks_fqdn" {
  value = azurerm_kubernetes_cluster.main.fqdn
}

output "aks_kubernetes_version" {
  value = azurerm_kubernetes_cluster.main.kubernetes_version
}

output "aks_node_resource_group" {
  value = azurerm_kubernetes_cluster.main.node_resource_group
}

output "aks_identity_principal_id" {
  value = azurerm_kubernetes_cluster.main.identity[0].principal_id
}

output "kube_config_raw" {
  value     = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive = true
}
