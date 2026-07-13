// EGBLE Controller - gamma correction lookup table
//
// Perceptual brightness does not track PWM duty linearly. A linear duty ramp
// looks like it snaps bright early and then barely changes. Routing every
// level through this table is what makes fades look like a product rather
// than a cheap dimmer, so all brightness writes go through it.
//
// The table maps a perceptual input of 0..255 to a 10-bit PWM duty of 0..1023
// using gamma 2.0:
//
//     duty = round( 1023 * (level / 255) ^ 2.0 )
//
// Gamma 2.0 (softer than the 2.2 used for LEDs) suits EL inverters better: EL
// brightness rises steeply near the drive threshold and then flattens, so a
// gentler curve keeps a fade-in ramping evenly instead of holding dim and then
// rushing up. Retune per inverter: lower toward 1.7 if the ramp is still
// back-loaded, raise toward 2.2 if steady dimming looks washed out.
//
// To regenerate, run:
//     python3 firmware/tools/gen_gamma.py 2.0
// and paste the output over the array below. The gamma value is intentionally
// baked into the table rather than computed at runtime so the C3 never has to
// do pow() in the tick loop.

#pragma once

#include <stdint.h>

static const uint16_t GAMMA_LUT[256] = {
       0,    0,    0,    0,    0,    0,    1,    1,    1,    1,    2,    2,    2,    3,    3,    4,
       4,    5,    5,    6,    6,    7,    8,    8,    9,   10,   11,   11,   12,   13,   14,   15,
      16,   17,   18,   19,   20,   22,   23,   24,   25,   26,   28,   29,   30,   32,   33,   35,
      36,   38,   39,   41,   43,   44,   46,   48,   49,   51,   53,   55,   57,   59,   60,   62,
      64,   66,   69,   71,   73,   75,   77,   79,   82,   84,   86,   88,   91,   93,   96,   98,
     101,  103,  106,  108,  111,  114,  116,  119,  122,  125,  127,  130,  133,  136,  139,  142,
     145,  148,  151,  154,  157,  160,  164,  167,  170,  173,  177,  180,  184,  187,  190,  194,
     197,  201,  204,  208,  212,  215,  219,  223,  227,  230,  234,  238,  242,  246,  250,  254,
     258,  262,  266,  270,  274,  278,  282,  287,  291,  295,  300,  304,  308,  313,  317,  322,
     326,  331,  335,  340,  345,  349,  354,  359,  363,  368,  373,  378,  383,  388,  393,  398,
     403,  408,  413,  418,  423,  428,  434,  439,  444,  449,  455,  460,  465,  471,  476,  482,
     487,  493,  498,  504,  510,  515,  521,  527,  533,  538,  544,  550,  556,  562,  568,  574,
     580,  586,  592,  598,  604,  611,  617,  623,  629,  636,  642,  648,  655,  661,  668,  674,
     681,  687,  694,  700,  707,  714,  720,  727,  734,  741,  748,  755,  761,  768,  775,  782,
     789,  796,  804,  811,  818,  825,  832,  839,  847,  854,  861,  869,  876,  884,  891,  899,
     906,  914,  921,  929,  937,  944,  952,  960,  968,  975,  983,  991,  999, 1007, 1015, 1023,
};
