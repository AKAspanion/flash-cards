<template>
    <v-card flat class="flash-card ma-8 mr-0">
        <div
            class="flash-card-inner"
            :class="flipped ? 'flash-card-inner--rotated' : ''"
        >
            <div class="flash-card-front pa-6">
                <div class="flash-card-content">
                    <div class="d-flex align-center justify-center fill-height">
                        <span
                            v-if="!editing && !flipped"
                            class="headline"
                            @click="editing = true"
                        >
                            {{ value.front || 'this is example front side' }}
                        </span>
                        <v-textarea
                            dark
                            rounded
                            outlined
                            rows="10"
                            hide-details
                            :value="value.front"
                            v-if="editing && !flipped"
                            @input="update('front', $event)"
                        >
                        </v-textarea>
                    </div>
                </div>
                <div class="flash-card-actions d-flex align-center my-3">
                    <v-btn icon dark @click="$emit('delete')">
                        <v-icon>mdi-delete</v-icon>
                    </v-btn>
                    <v-spacer></v-spacer>
                    <v-btn v-if="editing" icon dark @click="editing = false"
                        ><v-icon>mdi-check</v-icon></v-btn
                    >
                    <v-spacer></v-spacer>
                    <v-btn icon dark @click="onCardFlip">
                        <v-icon>mdi-flip-horizontal</v-icon>
                    </v-btn>
                </div>
            </div>
            <div class="flash-card-back pa-6">
                <div class="flash-card-content">
                    <div class="d-flex align-center justify-center fill-height">
                        <span
                            v-if="!editing && flipped"
                            class="headline"
                            @click="editing = true"
                        >
                            {{ value.back || 'this is example back side' }}
                        </span>
                        <v-textarea
                            dark
                            rounded
                            outlined
                            rows="10"
                            hide-details
                            :value="value.back"
                            v-if="editing && flipped"
                            @input="update('back', $event)"
                        >
                        </v-textarea>
                    </div>
                </div>
                <div class="flash-card-actions d-flex align-center my-3">
                    <v-spacer></v-spacer>
                    <v-btn v-if="editing" icon dark @click="editing = false"
                        ><v-icon>mdi-check</v-icon></v-btn
                    >
                    <v-spacer></v-spacer>
                    <v-btn icon dark @click="onCardFlip">
                        <v-icon>mdi-flip-horizontal</v-icon>
                    </v-btn>
                </div>
            </div>
        </div>
    </v-card>
</template>

<script>
export default {
    props: ['value'],
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
    height: calc(100vh - 320px);
}

.flash-card:last-of-type {
    margin-right: 32px !important;
}

.flash-card-inner {
    position: relative;
    width: 100%;
    height: 100%;
    text-align: center;
    border-radius: 28px;
    transition: transform 0.3s;
    transform-style: preserve-3d;
}

.flash-card-content {
    overflow: hidden;
    height: calc(100% - 50px);
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
    background-color: #2980b9;
    color: white;
}

.flash-card-back {
    background-color: #2980b9;
    color: white;
    transform: rotateY(180deg);
}
</style>
