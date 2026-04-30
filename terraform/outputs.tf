output "resource_group_name" {
  description = "Resolved existing resource group."
  value       = data.azurestack_resource_group.main.name
}

output "vnet_name" {
  description = "Resolved existing virtual network."
  value       = data.azurestack_virtual_network.existing.name
}

output "subnet_name" {
  description = "Resolved existing subnet."
  value       = data.azurestack_subnet.existing.name
}

output "subnet_id" {
  description = "Resolved existing subnet ID."
  value       = data.azurestack_subnet.existing.id
}

output "vm_gestion_public_ip" {
  description = "Public IP assigned to vm-gestion."
  value       = azurestack_public_ip.vm_gestion.ip_address
}

output "vm_gestion_private_ip" {
  description = "Private IP assigned to vm-gestion."
  value       = azurestack_network_interface.vm_gestion.private_ip_address
}

output "vm_db_private_ip" {
  description = "Private IP assigned to vm-db."
  value       = azurestack_network_interface.vm_db.private_ip_address
}
