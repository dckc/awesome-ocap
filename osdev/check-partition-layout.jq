# jq script to validate the partition table of the target disk.
#
# It checks for:
# - GPT label
# - At least four partitions
# - Correct size, type, and name for the first four partitions
#
# Exits with status 0 if all checks pass, non-zero otherwise.
.partitiontable.label == "gpt" and
(.partitiontable.partitions | length >= 4) and
(.partitiontable.partitions[0] | .size == 2097152 and .type == "C12A7328-F81F-11D2-BA4B-00A0C93EC93B" and .name == "ESP") and
(.partitiontable.partitions[1] | .size == 209715200 and .type == "0FC63DAF-8483-4772-8E79-3D69D8477DE4" and .name == "Guix") and
(.partitiontable.partitions[2] | .size == 41943040 and .type == "0FC63DAF-8483-4772-8E79-3D69D8477DE4" and .name == "Genode") and
(.partitiontable.partitions[3] | .size == 419430400 and .type == "0FC63DAF-8483-4772-8E79-3D69D8477DE4" and .name == "Shared")
