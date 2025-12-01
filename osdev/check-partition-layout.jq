# jq script to transform lsblk json output to a canonical representation
# for comparison. It extracts the partlabel, size, and parttype from the
# first four partitions.
# It handles both nested (with "children") and flat lsblk output formats.
# If the disk has no partitions, it produces an empty array.
(.blockdevices[0].children // .blockdevices[1:] // [])[:4] | map({partlabel, size, parttype})
