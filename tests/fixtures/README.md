# Synthetic barcode fixture

`archive-ean13.png` encodes the checksum-valid EAN-13 test value `4901234567894`.
It was generated locally using the open source bwip-js EAN-13 encoder with an
explicit white background, quiet zone, and human-readable caption. This is a
synthetic test image; it does not identify any real product and is never added
to the public physical-item catalogue.

The decoder test reads its pixels with Sharp and executes the actual ZXing
retail-barcode decoder. Camera lifecycle tests separately cover cancellation,
invalid check digits, and ownership of MediaStream tracks.
