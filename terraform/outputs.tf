# =============================================================================
# 99 — Sorties
# =============================================================================

output "resource_group_name" {
  description = "Groupe de ressources cible."
  value       = data.azurestack_resource_group.main.name
}

output "virtual_network_name" {
  description = "Nom du réseau virtuel créé."
  value       = azurestack_virtual_network.main.name
}

output "virtual_network_id" {
  value = azurestack_virtual_network.main.id
}

output "subnet_mgmt_id" {
  value = azurestack_subnet.mgmt.id
}

output "subnet_db_id" {
  value = azurestack_subnet.db.id
}

output "subnet_aks_id" {
  value = azurestack_subnet.aks.id
}

output "vm_gestion_public_ip" {
  value = azurestack_public_ip.gestion.ip_address
}


output "vm_gestion_private_ip" {
  value = azurestack_network_interface.gestion.private_ip_address
}

output "vm_db_private_ip" {
  value = azurestack_network_interface.db.private_ip_address
}

output "mongodb_connection_hint" {
  value = "mongodb://${azurestack_network_interface.db.private_ip_address}:27017/ticketmanager"
}