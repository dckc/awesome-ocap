# jq script to validate the partition table of the target disk.
#
# It checks for:
# - GPT label
# - Exactly two partitions
# - Correct size and type for the EFI partition
# - Correct type for the Linux root partition
#
# Exits with status 0 if all checks pass, non-zero otherwise.
.partitiontable.label == "gpt" and
(.partitiontable.partitions | length == 2) and
.partitiontable.partitions[0].size == 2095104 and
.partitiontable.partitions[0].type == "C12A7328-F81F-11D2-BA4B-00A0C93EC93B" and
.partitiontable.partitions[1].type == "0FC63DAF-8483-4772-8E79-3D69D8477DE4"
