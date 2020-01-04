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
                            v-if="!editing"
                            class="headline"
                            @click="editing = true"
                        >
                            {{ detail.front || frontText }}
                        </span>
                        <v-textarea
                            v-else
                            outlined
                            autofocus
                            auto-grow
                            v-model="frontText"
                        >
                        </v-textarea>
                    </div>
                </div>
                <div class="flash-card-actions d-flex align-center mt-6">
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
                        {{ detail.back || backText }}
                    </div>
                </div>
                <div class="flash-card-actions d-flex align-center mt-6">
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
    props: {
        detail: {
            type: Object,
        },
    },
    data() {
        return {
            flipped: false,
            editing: false,
            frontText: 'this is example front side',
            backText: 'this is example back side',
        };
    },
    components: {},
    methods: {
        onCardFlip() {
            this.$emit('flip');
            this.flipped = !this.flipped;
        },
    },
};
</script>

<style scoped>
.flash-card {
    width: 80vw;
    perspective: 1000px;
    border-radius: 24px;
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
    border-radius: 24px;
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
    border-radius: 24px;
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
