# Makefile for managing a VirtualBox VM on a physical disk.

#
# --- Configuration ---
#

# DANGER: Set this to the target physical disk.
# All data on this disk may be lost.
# Use `lsblk` to find the correct device.
TARGET_DISK?=/dev/disk/by-id/ata-Samsung_SSD_860_QVO_1TB_S59HNG0N105827B

# Name of the VirtualBox VM to create and manage.
VM_NAME?=ocap-dev-vm

#
# --- Non-Destructive Targets ---
#

.PHONY: help perms run check-partitioning

# Default target

help:
	@echo "Makefile for OCap OS Dev VM"
	@echo ""
	@if [ ! -b "$(TARGET_DISK)" ]; then \
		echo "ERROR: TARGET_DISK '$(TARGET_DISK)' does not exist or is not a block device."; \
		echo "Please set TARGET_DISK to a valid device. For example:"; \
		echo "  export TARGET_DISK=/dev/sdX"; \
		exit 1; \
	fi
	@echo "Current configuration:"
	@echo "  TARGET_DISK = $(TARGET_DISK)"
	@echo "  VM_NAME     = $(VM_NAME)"
	@echo ""
	@echo "Usage:"
	@echo "  make -C osdev perms          - Add current user to 'disk' group (requires logout/login)."
	@echo "  make -C osdev physical.vmdk  - Create the VMDK file pointing to TARGET_DISK."
	@echo "  make -C osdev run            - Start the VirtualBox VM."
	@echo "  sudo make -C osdev check-partitioning - Check if partitioning is already done."
	@echo ""
	@echo "  WARNING: Destructive commands follow."
	@echo "  sudo make -C osdev partition-disk - Partition TARGET_DISK (WIPES ALL DATA)."
	@echo "  sudo make -C osdev format-disk    - Format partitions on TARGET_DISK (WIPES ALL DATA)."


perms:
	@echo "Adding user '$(USER)' to the 'disk' group..."
	@echo "You must log out and log back in for this to take effect."
	sudo usermod -aG disk $(USER)

physical.vmdk:
	@echo "Creating VMDK mapping for $(TARGET_DISK)..."
	rm -f $@
	VBoxManage internalcommands createrawvmdk -filename $@ -rawdisk $(TARGET_DISK)

run:
	VBoxManage startvm "$(VM_NAME)"

check-partitioning: partition-table.sfdisk
	@echo "Checking if partition layout on $(TARGET_DISK) matches $<..."
	@if sudo sfdisk -d $(TARGET_DISK) | diff -u $< -; then \
		echo "Partition layout matches."; \
	else \
		echo; echo "Partition layout MISMATCH (see diff above)."; \
		exit 1; \
	fi


#
# --- DANGEROUS: Destructive Disk Operations ---
#
# These targets will WIPE ALL DATA on TARGET_DISK.
# Adapted from https://gist.github.com/dckc/c11561caed0d24f23d9224ce38e0133f
#

.PHONY: partition-disk format-disk

partition-disk: partition-table.sfdisk
	@if sudo sfdisk -d $(TARGET_DISK) | diff -q $< - >/dev/null 2>&1; then \
		echo "Partition layout on $(TARGET_DISK) already matches $<. Nothing to do."; \
	else \
		echo "!!! WARNING: About to partition $(TARGET_DISK) using layout from $<. ALL DATA WILL BE LOST. !!!"; \
		read -p "Press Enter to continue or Ctrl+C to abort."; \
		sudo sfdisk $(TARGET_DISK) < $<; \
	fi

format-disk:
	@echo "!!! WARNING: About to format $(TARGET_DISK). ALL DATA WILL BE LOST. !!!"
	@read -p "Press Enter to continue or Ctrl+C to abort."
	sudo mkfs.vfat -n ESP $$(realpath $(TARGET_DISK)-part1)
	sudo mkfs.ext4 -L osdev-root -F $$(realpath $(TARGET_DISK)-part2)
