<template>
    <v-card
        flat
        class="flash-card my-8"
        :style="
            `height: ${browse ? 'calc(100vh - 224px)' : 'calc(100vh - 320px)'}`
        "
    >
        <v-dialog v-model="editing" :max-width="$vuetify.breakpoint.smAndUp ? '50vw':''">
            <v-card class="pa-6">
                <v-textarea
                    rounded
                    outlined
                    auto-grow
                    hide-details
                    :color="color || '#e91e63'"
                    :value="flipped ? value.back : value.front"
                    :ref="`${value.id}${flipped ? 'back' : 'front'}`"
                    @input="update(flipped ? 'back' : 'front', $event)"
                    :placeholder="
                        `Enter text for ${flipped ? 'back' : 'front'} side`
                    "
                >
                    <template #append>
                        <v-btn
                            icon
                            small
                            @click="editing = false"
                            :color="color || '#e91e63'"
                        >
                            <v-icon>
                                mdi-check
                            </v-icon>
                        </v-btn>
                    </template>
                </v-textarea>
            </v-card>
        </v-dialog>
        <div
            class="flash-card-inner"
            :class="[
                flipped ? 'flash-card-inner--rotated' : '',
                browse
                    ? `flash-card-bordered--${
                          value.learned ? 'success' : 'error'
                      }`
                    : '',
            ]"
        >
            <div
                class="flash-card-front pa-6 "
                :style="`background-color: ${color || '#e91e63'}`"
            >
                <div class="flash-card-content">
                    <div
                        class="align-center justify-center fill-height"
                        :class="editing ? '' : 'd-flex'"
                    >
                        <div
                            @click="onTextClick"
                            v-if="!editing && !flipped"
                            class="headline d-inline-block my-4"
                        >
                            {{
                                value.front ||
                                    'example front side of a flashcard'
                            }}
                        </div>
                    </div>
                </div>
                <div class="flash-card-label-container">
                    <v-chip-group dark>
                        <v-chip
                            dark
                            small
                            outlined
                            input-value
                            class="mr-1"
                            text-color="white"
                            :key="label.docId"
                            v-for="label in labels"
                        >
                            {{ label.label }}
                        </v-chip>
                    </v-chip-group>
                </div>
                <div class="flash-card-actions d-flex align-center mb-2">
                    <v-btn v-if="browse" icon dark @click="onLearnCheck">
                        <v-icon>{{
                            value.learned ? 'mdi-close' : 'mdi-check'
                        }}</v-icon>
                    </v-btn>
                    <v-btn v-else icon dark @click="$emit('delete', value)">
                        <v-icon>mdi-trash-can</v-icon>
                    </v-btn>
                    <v-spacer></v-spacer>
                    <div class="caption number-icon">
                        {{ number }}
                    </div>
                    <v-spacer></v-spacer>
                    <v-btn icon dark @click="onCardFlip">
                        <v-icon>mdi-flip-to-back</v-icon>
                    </v-btn>
                </div>
            </div>
            <div
                class="flash-card-back pa-6"
                :style="`background-color: ${color || '#e91e63'}`"
            >
                <div class="flash-card-content">
                    <div
                        class="align-center justify-center fill-height"
                        :class="editing ? '' : 'd-flex'"
                    >
                        <div
                            @click="onTextClick"
                            v-if="!editing && flipped"
                            class="headline d-inline-block my-4"
                        >
                            {{
                                value.back || 'example back side of a flashcard'
                            }}
                        </div>
                    </div>
                </div>
                <div class="flash-card-label-container"></div>
                <div class="flash-card-actions d-flex align-center mb-2">
                    <v-spacer></v-spacer>
                    <v-btn icon dark @click="onCardFlip">
                        <v-icon>mdi-flip-to-front</v-icon>
                    </v-btn>
                </div>
            </div>
        </div>
    </v-card>
</template>

<script>
export default {
    props: ['value', 'color', 'labels', 'browse', 'number'],
    data() {
        return {
            flipped: false,
            editing: false,
            flippedCount: 0,
        };
    },
    methods: {
        update(key, value) {
            this.$emit('input', { ...this.value, [key]: value });
        },
        onTextClick() {
            if (this.browse) {
                return;
            } else {
                this.editing = true;
                setTimeout(() => {
                    this.$nextTick(() => {
                        this.$refs[
                            `${this.value.id}${this.flipped ? 'back' : 'front'}`
                        ].focus();
                    });
                }, 50);
            }
        },
        onLearnCheck() {
            if (!this.flippedCount) {
                this.update('learned', !this.value.learned);
            }
        },
        onCardFlip() {
            if (this.browse) {
                this.update('learned', false);
                this.flippedCount++;
            }
            this.$emit('flip');
            this.editing = false;
            this.flipped = !this.flipped;
        },
    },
};
</script>

<style scoped>
.flash-card {
    width: 100vw;
    padding: 0 4.25vw;
    perspective: 1000px;
    border-radius: 28px;
}

.flash-card-inner {
    width: 100%;
    height: 100%;
    text-align: center;
    position: relative;
    border-radius: 28px;
    will-change: transform;
    transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    transform-style: preserve-3d;
}

.flash-card-label-container {
    min-height: 32px;
    overflow: hidden;
}

.flash-card-content {
    overflow-x: hidden;
    height: calc(100% - 60px);
}

.flash-card-inner--rotated {
    transform: rotateY(180deg);
}

.flash-card-front,
.flash-card-back {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 28px;
    will-change: transform;
    backface-visibility: hidden;
}

.flash-card-front {
    color: white;
}

.flash-card-back {
    color: white;
    transform: rotateY(180deg);
}

.number-icon {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    box-sizing: border-box;
    border: 1.5px solid white;
}

.flash-card-bordered--success {
    box-sizing: border-box;
    border-bottom: 4px solid #4caf50;
    border-bottom-left-radius: 32px !important;
    border-bottom-right-radius: 32px !important;
}
.flash-card-bordered--error {
    box-sizing: border-box;
    border-bottom: 4px solid #212121;
    border-bottom-left-radius: 32px !important;
    border-bottom-right-radius: 32px !important;
}
</style>
