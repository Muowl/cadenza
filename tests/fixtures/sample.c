#include <stdio.h>
#include "stage.h"

#define MAX_TRACKS 12
#define SECONDS(t) ((t)->seconds)

typedef struct track {
    const char *title;
    unsigned int seconds;
} track_t;

enum cue { CUE_START, CUE_FADE = 2, CUE_STOP };

static int encore(track_t *setlist, size_t count) {
    int total = 0;
    for (size_t i = 0; i < count && i < MAX_TRACKS; ++i) {
        if (SECONDS(&setlist[i]) == 0) continue;
        total += setlist[i].seconds;
    }
#ifdef DEBUG
    printf("total: %d s\n", total);
#endif
    return total > 0 ? total : -1;
}
