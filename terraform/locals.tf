locals {
  base_tags = {
    project = "ticketmanager"
    env     = "dev"
    owner   = "amal-benhazem"
  }

  vm_gestion_name = "ticketmanager-vm-gestion"
  vm_db_name      = "ticketmanager-vm-db"
}
