<template>
    <v-card raised :color="dark ? '#212121' : '#e0e0e0'" height="182">
        <v-card
            dark
            :id="id"
            class="pa-6"
            height="100"
            style="z-index: 2"
            :color="card.color || 'primary'"
            @touchstart="handleMouseDown"
            @touchmove="handleMouseMove"
            @touchend="handleMouseUp"
        >
            <div class="d-flex text-uppercase">
                <v-scale-transition origin="center center">
                    <v-icon
                        class="mr-1"
                        color="yellow"
                        v-if="card.fav"
                        @click="$emit('star')"
                    >
                        mdi-star
                    </v-icon>
                </v-scale-transition>
                <div
                    class="text-truncate"
                    :title="card.title || 'untitled set'"
                >
                    {{ card.title || 'untitled set' }}
                </div>
                <v-spacer></v-spacer>
                <div class="ml-2" v-if="!bin">
                    <v-chip
                        small
                        outlined
                        dark
                        @click="onEdit"
                        :disabled="disabled"
                    >
                        <v-icon small>mdi-pencil</v-icon>
                    </v-chip>
                </div>
            </div>
            <v-chip-group>
                <v-chip
                    dark
                    small
                    outlined
                    input-value
                    class="mr-1"
                    text-color="white"
                    :key="label.docId"
                    :disabled="disabled"
                    v-for="label in labels"
                    @click="$emit('label', label)"
                >
                    {{ label.label }}
                </v-chip>
            </v-chip-group>
        </v-card>
        <div class="d-flex align-center pa-6">
            <template v-if="bin">
                <v-btn
                    icon
                    :color="card.color"
                    :disabled="disabled"
                    @click="$emit('delete', card)"
                >
                    <v-icon>mdi-trash-can</v-icon>
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn
                    icon
                    :color="card.color"
                    :disabled="disabled"
                    @click="$emit('restore', card)"
                >
                    <v-icon>mdi-restore</v-icon>
                </v-btn>
            </template>
            <template v-else>
                <div>
                    <div class="overline">memorized</div>
                    <div class="caption d-flex align-center">
                        <div>{{ ratio }}</div>
                        <div class="mx-2">-</div>
                        <div>{{ percentage }}%</div>
                    </div>
                </div>
                <v-spacer></v-spacer>
                <v-chip small outlined @click="onView" :disabled="disabled">
                    {{ `${percentage == 100 ? 'review' : 'browse'}` }}
                </v-chip>
            </template>
        </div>
        <v-icon
            :color="leftTriggered ? 'yellow' : ''"
            class="cardflash-set-hidden-icon cardflash-set-hidden-icon--left"
        >
            mdi-star
        </v-icon>
        <v-icon
            :color="rightTriggered ? 'error' : ''"
            class="cardflash-set-hidden-icon cardflash-set-hidden-icon--right"
        >
            mdi-trash-can
        </v-icon>
    </v-card>
</template>

<script>
import { navigateToPath } from '@/util';
export default {
    name: 'CardFlashSet',
    props: {
        card: {
            type: Object,
            required: true,
        },
        bin: {
            type: Boolean,
            default: false,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    data() {
        return {
            scrolledY: 'no',
            leftTriggered: false,
            rightTriggered: false,
            touchStartEvent: null,
            id: `set${new Date().getTime()}`,
        };
    },
    computed: {
        dark() {
            return this.$vuetify.theme.dark;
        },
        labels() {
            return this.$store.getters.labels.filter((label) => {
                return this.card.labels.includes(label.docId);
            });
        },
        ratio() {
            return `${this.totalLearned} / ${this.card.cards.length}`;
        },
        percentage() {
            const totalCards = this.card.cards.length;
            return totalCards
                ? parseInt((this.totalLearned / totalCards) * 100, 10)
                : 0;
        },
        totalLearned() {
            return this.card.cards.reduce((total, value) => {
                return (total += value.learned ? 1 : 0);
            }, 0);
        },
    },
    methods: {
        onEdit() {
            navigateToPath(`/${this.card.id}/edit`);
        },
        onView() {
            navigateToPath(`/${this.card.id}/view`);
        },
        handleMouseDown(e) {
            if (this.bin) {
                return;
            }
            this.touchStartEvent = e;
        },
        handleMouseMove(e) {
            if (this.bin) {
                return;
            }
            const yDist = Math.abs(
                this.touchStartEvent.touches[0].clientY -
                    e.changedTouches[0].clientY
            );
            const xDist = Math.abs(
                this.touchStartEvent.touches[0].clientX -
                    e.changedTouches[0].clientX
            );
            if (this.scrolledY === 'no') {
                if (yDist > xDist) {
                    this.scrolledY = 'yes';
                } else {
                    this.scrolledY = 'ohno';
                }
            }
            if (this.scrolledY === 'yes') {
                return;
            }
            const cardDOM = document.getElementById(this.id);
            const touchDistance =
                this.touchStartEvent.touches[0].clientX - e.touches[0].clientX;
            cardDOM.style.transition = `none`;
            if (Math.abs(touchDistance) <= 100) {
                cardDOM.style.transform = `translate3d(${-touchDistance}px, 0px, 0px)`;
            }
            const triggerPoint = Math.abs(touchDistance) >= 62;
            const triggerNegative = touchDistance < 0;
            if (triggerNegative) {
                this.leftTriggered = triggerPoint;
            } else {
                this.rightTriggered = triggerPoint;
            }
        },
        handleMouseUp(e) {
            if (this.bin) {
                return;
            }
            if (this.leftTriggered) {
                this.$emit('fav', this.card);
            }
            if (this.rightTriggered) {
                this.$emit('delete', this.card);
            }
            const cardDOM = document.getElementById(this.id);
            cardDOM.style.transition = `transform 200ms ease-out`;
            cardDOM.style.transform = `translate3d(0px, 0px, 0px)`;
            this.leftTriggered = false;
            this.rightTriggered = false;
            this.touchStartEvent = null;
            this.scrolledY = 'no';
        },
    },
};
</script>

<style scoped>
.cardflash-set-hidden-icon {
    position: absolute;
    z-index: 1;
    top: 38px;
}
.cardflash-set-hidden-icon--left {
    left: 38px;
}
.cardflash-set-hidden-icon--right {
    right: 38px;
}
</style>
