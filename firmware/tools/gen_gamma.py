#!/usr/bin/env python3
"""Regenerate the gamma lookup table used by the EGBLE firmware.

Usage:
    python3 gen_gamma.py [gamma]

Prints a C array mapping perceptual input 0..255 to 10-bit PWM duty 0..1023.
Paste the output over the GAMMA_LUT array in firmware/egble-controller/gamma.h.
Default gamma is 2.2, a good starting point for EL inverters.
"""
import sys


def main() -> None:
    gamma = float(sys.argv[1]) if len(sys.argv) > 1 else 2.2
    vals = [round(1023 * ((i / 255) ** gamma)) for i in range(256)]
    print(f"// gamma = {gamma}")
    for i in range(0, 256, 16):
        row = ", ".join("%4d" % v for v in vals[i:i + 16])
        print(f"    {row},")


if __name__ == "__main__":
    main()
