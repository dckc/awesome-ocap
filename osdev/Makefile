# Makefile for managing a VirtualBox VM on a physical disk.

#
# --- Configuration ---
#

# WARNING: Set this to the target physical disk.
# All data on this disk may be lost.
# Use `lsblk` to find the correct device.
TARGET_DISK?=/dev/disk/by-id/ata-Samsung_SSD_860_QVO_1TB_S59HNG0N105827B

# Name of the VirtualBox VM to create and manage.
VM_NAME?=ocap-dev-vm

#
# --- Non-Destructive Targets ---
#

.PHONY: help perms run check-partitioning create-vm check-formatting

# Default target

help:
	@echo "Makefile for OCap OS Dev VM"
	@echo ""
	@if [ ! -b "$(TARGET_DISK)" ]; then \
		echo "ERROR: TARGET_DISK '$(TARGET_DISK)' does not exist or is not a block device."; \
		echo "Please set TARGET_DISK to a valid device. For example:"; \
		echo "  export TARGET_DISK=/dev/disk/by-id/ata-YOUR_DISK_NAME_HERE"; \
		exit 1; \
	fi
	@echo "Current configuration:"
	@echo "  TARGET_DISK = $(TARGET_DISK)"
	@echo "  VM_NAME     = $(VM_NAME)"
	@echo ""
	@echo "Usage:"
	@echo "  make -C osdev perms          - Add current user to 'disk' group (requires logout/login)."
	@echo "  make -C osdev physical.vmdk  - Create the VMDK file pointing to TARGET_DISK."
	@echo "  make -C osdev create-vm      - Create the VirtualBox VM definition."
	@echo "  make -C osdev run            - Start the VirtualBox VM."
	@echo "  sudo make -C osdev check-partitioning - Check if partitioning is already done."
	@echo "  sudo make -C osdev check-formatting - Check if formatting is already done."
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

create-vm: physical.vmdk
	@if VBoxManage showvminfo "$(VM_NAME)" >/dev/null 2>&1; then \
		echo "VirtualBox VM '$(VM_NAME)' already exists. Nothing to do."; \
	else \
		echo "Creating VirtualBox VM '$(VM_NAME)'..."; \
		VBoxManage createvm --name "$(VM_NAME)" --ostype "Linux_64" --register; \
		VBoxManage modifyvm "$(VM_NAME)" --firmware efi; \
		VBoxManage storagectl "$(VM_NAME)" --name "SATA Controller" --add sata --controller IntelAhci; \
		VBoxManage storageattach "$(VM_NAME)" --storagectl "SATA Controller" --port 0 --device 0 --type hdd --medium $(CURDIR)/physical.vmdk; \
		echo "VM '$(VM_NAME)' created successfully."; \
	fi

check-partitioning: check-partition-layout.jq
	@echo "Checking if partition layout on $(TARGET_DISK) is correct..."
	@if ! command -v jq > /dev/null; then \
		echo "ERROR: 'jq' command not found. Please install jq."; \
		exit 1; \
	fi
	@if sudo sfdisk --json $(TARGET_DISK) | jq -e -f $< > /dev/null; then \
		echo "Partition layout is correct."; \
	else \
		echo "Partition layout is INCORRECT or disk is not partitioned."; \
		exit 1; \
	fi

check-formatting:
	@echo "Checking formatting on $(TARGET_DISK)..."
	@PART1_OK=false; \
	if [ -b "$(TARGET_DISK)-part1" ] && \
	   [ "$$(sudo blkid -s TYPE -o value $(TARGET_DISK)-part1 2>/dev/null)" = "vfat" ] && \
	   [ "$$(sudo blkid -s LABEL -o value $(TARGET_DISK)-part1 2>/dev/null)" = "ESP" ]; then \
		PART1_OK=true; \
	fi; \
	PART2_OK=false; \
	if [ -b "$(TARGET_DISK)-part2" ] && \
	   [ "$$(sudo blkid -s TYPE -o value $(TARGET_DISK)-part2 2>/dev/null)" = "ext4" ] && \
	   [ "$$(sudo blkid -s LABEL -o value $(TARGET_DISK)-part2 2>/dev/null)" = "osdev-root" ]; then \
		PART2_OK=true; \
	fi; \
	if $$PART1_OK && $$PART2_OK; then \
		echo "Partitions are correctly formatted."; \
	else \
		echo "Partitions are NOT correctly formatted."; \
		exit 1; \
	fi


#
# --- DANGEROUS: Destructive Disk Operations ---
#
# These targets will WIPE ALL DATA on TARGET_DISK.
# Adapted from https://gist.github.com/dckc/c11561caed0d24f23d9224ce38e0133f
#

.PHONY: partition-disk format-disk

partition-disk: partition-table.sfdisk check-partition-layout.jq
	@if ! command -v jq > /dev/null; then \
		echo "ERROR: 'jq' command not found. Please install jq."; \
		exit 1; \
	fi
	@if sudo sfdisk --json $(TARGET_DISK) | jq -e -f check-partition-layout.jq > /dev/null 2>&1; then \
		echo "Partition layout on $(TARGET_DISK) is already correct. Nothing to do."; \
	else \
		echo "!!! WARNING: About to partition $(TARGET_DISK) using layout from partition-table.sfdisk. ALL DATA WILL BE LOST. !!!"; \
		read -p "Press Enter to continue or Ctrl+C to abort."; \
		sudo sfdisk $(TARGET_DISK) < partition-table.sfdisk; \
	fi

format-disk:
	@PART1_OK=false; \
	if [ -b "$(TARGET_DISK)-part1" ] && \
	   [ "$$(sudo blkid -s TYPE -o value $(TARGET_DISK)-part1 2>/dev/null)" = "vfat" ] && \
	   [ "$$(sudo blkid -s LABEL -o value $(TARGET_DISK)-part1 2>/dev/null)" = "ESP" ]; then \
		PART1_OK=true; \
	fi; \
	PART2_OK=false; \
	if [ -b "$(TARGET_DISK)-part2" ] && \
	   [ "$$(sudo blkid -s TYPE -o value $(TARGET_DISK)-part2 2>/dev/null)" = "ext4" ] && \
	   [ "$$(sudo blkid -s LABEL -o value $(TARGET_DISK)-part2 2>/dev/null)" = "osdev-root" ]; then \
		PART2_OK=true; \
	fi; \
	if $$PART1_OK && $$PART2_OK; then \
		echo "Partitions on $(TARGET_DISK) are already formatted. Nothing to do."; \
	else \
		echo "!!! WARNING: About to format $(TARGET_DISK). ALL DATA WILL BE LOST. !!!"; \
		read -p "Press Enter to continue or Ctrl+C to abort."; \
		sudo mkfs.vfat -n ESP $$(realpath $(TARGET_DISK)-part1); \
		sudo mkfs.ext4 -L osdev-root -F $$(realpath $(TARGET_DISK)-part2); \
	fi
