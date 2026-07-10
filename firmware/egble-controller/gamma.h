// EGBLE Controller - gamma correction lookup table
//
// Perceptual brightness does not track PWM duty linearly. A linear duty ramp
// looks like it snaps bright early and then barely changes. Routing every
// level through this table is what makes fades look like a product rather
// than a cheap dimmer, so all brightness writes go through it.
//
// The table maps a perceptual input of 0..255 to a 10-bit PWM duty of 0..1023
// using gamma 2.2:
//
//     duty = round( 1023 * (level / 255) ^ 2.2 )
//
// To regenerate (for example to try a different gamma), run:
//     python3 firmware/tools/gen_gamma.py 2.2
// and paste the output over the array below. The gamma value is intentionally
// baked into the table rather than computed at runtime so the C3 never has to
// do pow() in the tick loop.

#pragma once

#include <stdint.h>

static const uint16_t GAMMA_LUT[256] = {
     0,    0,    0,    0,    0,    0,    0,    0,    1,    1,    1,    1,    1,    1,    2,    2,
     2,    3,    3,    3,    4,    4,    5,    5,    6,    6,    7,    7,    8,    9,    9,   10,
    11,   11,   12,   13,   14,   15,   16,   16,   17,   18,   19,   20,   21,   23,   24,   25,
    26,   27,   28,   30,   31,   32,   34,   35,   36,   38,   39,   41,   42,   44,   46,   47,
    49,   51,   52,   54,   56,   58,   60,   61,   63,   65,   67,   69,   71,   73,   76,   78,
    80,   82,   84,   87,   89,   91,   94,   96,   98,  101,  103,  106,  109,  111,  114,  117,
   119,  122,  125,  128,  130,  133,  136,  139,  142,  145,  148,  151,  155,  158,  161,  164,
   167,  171,  174,  177,  181,  184,  188,  191,  195,  198,  202,  206,  209,  213,  217,  221,
   225,  228,  232,  236,  240,  244,  248,  252,  257,  261,  265,  269,  274,  278,  282,  287,
   291,  295,  300,  304,  309,  314,  318,  323,  328,  333,  337,  342,  347,  352,  357,  362,
   367,  372,  377,  382,  387,  393,  398,  403,  408,  414,  419,  425,  430,  436,  441,  447,
   452,  458,  464,  470,  475,  481,  487,  493,  499,  505,  511,  517,  523,  529,  535,  542,
   548,  554,  561,  567,  573,  580,  586,  593,  599,  606,  613,  619,  626,  633,  640,  647,
   653,  660,  667,  674,  681,  689,  696,  703,  710,  717,  725,  732,  739,  747,  754,  762,
   769,  777,  784,  792,  800,  807,  815,  823,  831,  839,  847,  855,  863,  871,  879,  887,
   895,  903,  912,  920,  928,  937,  945,  954,  962,  971,  979,  988,  997, 1005, 1014, 1023,
};
