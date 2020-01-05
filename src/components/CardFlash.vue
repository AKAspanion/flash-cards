<template>
    <v-card flat class="flash-card mx-8 mr-0">
        <div
            class="flash-card-inner"
            :class="flipped ? 'flash-card-inner--rotated' : ''"
        >
            <div
                class="flash-card-front pa-6"
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
                        <v-textarea
                            dark
                            rounded
                            outlined
                            hide-details
                            :value="value.front"
                            :ref="value.id + 'front'"
                            v-if="editing && !flipped"
                            @input="update('front', $event)"
                        >
                            <template #append>
                                <v-btn small icon @click="editing = false">
                                    <v-icon>
                                        mdi-check
                                    </v-icon>
                                </v-btn>
                            </template>
                        </v-textarea>
                    </div>
                </div>
                <div class="flash-card-label-container">
                    <v-chip
                        dark
                        small
                        outlined
                        input-value
                        class="mr-1 mt-2"
                        text-color="white"
                        :key="label.docId"
                        v-for="label in labels"
                    >
                        {{ label.label }}
                    </v-chip>
                </div>
                <div class="flash-card-actions d-flex align-center mb-2">
                    <v-btn icon dark @click="$emit('delete', value)">
                        <v-icon>mdi-trash-can</v-icon>
                    </v-btn>
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
                        <v-textarea
                            dark
                            rounded
                            outlined
                            hide-details
                            :value="value.back"
                            :ref="value.id + 'back'"
                            v-if="editing && flipped"
                            @input="update('back', $event)"
                        >
                            <template #append>
                                <v-btn small icon @click="editing = false">
                                    <v-icon>
                                        mdi-check
                                    </v-icon>
                                </v-btn>
                            </template>
                        </v-textarea>
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
    props: ['value', 'color', 'labels'],
    data() {
        return {
            flipped: false,
            editing: false,
        };
    },
    methods: {
        update(key, value) {
            this.$emit('input', { ...this.value, [key]: value });
        },
        onTextClick() {
            this.editing = true;
            setTimeout(() => {
                this.$nextTick(() => {
                    this.$refs[
                        `${this.value.id}${this.flipped ? 'back' : 'front'}`
                    ].focus();
                });
            }, 50);
        },
        onCardFlip() {
            this.$emit('flip');
            this.editing = false;
            this.flipped = !this.flipped;
        },
    },
};
</script>

<style scoped>
.flash-card {
    width: 75vw;
    max-width: 350px;
    perspective: 1000px;
    border-radius: 28px;
    height: calc(100vh - 256px);
}

.flash-card:last-of-type {
    margin-right: 32px !important;
}

.flash-card-inner {
    width: 100%;
    height: 100%;
    text-align: center;
    position: relative;
    border-radius: 28px;
    transition: transform 0.3s;
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
    backface-visibility: hidden;
}

.flash-card-front {
    color: white;
}

.flash-card-back {
    color: white;
    transform: rotateY(180deg);
}
</style>
