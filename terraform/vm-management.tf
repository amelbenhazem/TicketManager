# =============================================================================
# 05 — VM-gestion : administration, Ansible, supervision du cluster
# =============================================================================
# IP publique pour accès SSH opérateur ; la VM reste dans snet-mgmt.
# vm_gestion_attach_existing_os_disk = true : rattache le disque OS conservé
# (Kubernetes, Terraform, etc.) après suppression de la VM en échec.
# =============================================================================

resource "azurestack_public_ip" "gestion" {
  name                = "${local.vm_gestion_name}-pip"
  location            = var.location
  resource_group_name = data.azurestack_resource_group.main.name
  allocation_method   = "Static"
  tags                = local.tags
}

resource "azurestack_network_interface" "gestion" {
  name                = "${local.vm_gestion_name}-nic"
  location            = var.location
  resource_group_name = data.azurestack_resource_group.main.name

  ip_configuration {
    name                          = "primary"
    subnet_id                     = azurestack_subnet.mgmt.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurestack_public_ip.gestion.id
  }

  tags = local.tags
}

resource "azurestack_virtual_machine" "gestion" {
  name                  = local.vm_gestion_name
  location              = var.location
  resource_group_name   = data.azurestack_resource_group.main.name
  network_interface_ids            = [azurestack_network_interface.gestion.id]
  vm_size                          = var.vm_size_gestion
  delete_os_disk_on_termination    = false
  delete_data_disks_on_termination = false

  dynamic "storage_image_reference" {
    for_each = var.vm_gestion_attach_existing_os_disk ? [] : [1]
    content {
      publisher = var.image_publisher
      offer     = var.image_offer
      sku       = var.image_sku
      version   = var.image_version
    }
  }

  storage_os_disk {
    name            = "${local.vm_gestion_name}-os"
    caching         = "ReadWrite"
    create_option   = var.vm_gestion_attach_existing_os_disk ? "Attach" : "FromImage"
    os_type         = var.vm_gestion_attach_existing_os_disk ? "Linux" : null
    managed_disk_id = var.vm_gestion_attach_existing_os_disk ? local.vm_gestion_os_disk_id : null
    managed_disk_type = var.vm_gestion_attach_existing_os_disk ? null : "Standard_LRS"
  }

  dynamic "os_profile" {
    for_each = var.vm_gestion_attach_existing_os_disk ? [] : [1]
    content {
      computer_name  = local.vm_gestion_name
      admin_username = var.admin_username
    }
  }

  dynamic "os_profile_linux_config" {
    for_each = var.vm_gestion_attach_existing_os_disk ? [] : [1]
    content {
      disable_password_authentication = true
      ssh_keys {
        path     = "/home/${var.admin_username}/.ssh/authorized_keys"
        key_data = var.ssh_public_key
      }
    }
  }

  tags = local.tags

  lifecycle {
    ignore_changes = [
      vm_size,
      os_profile,
      os_profile_linux_config,
      storage_os_disk,
      storage_image_reference,
    ]
  }
}
