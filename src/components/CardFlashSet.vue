<template>
    <v-card raised :color="dark ? '#212121' : '#e0e0e0'" height="182">
        <v-card dark :color="card.color || 'primary'" height="100" class="pa-6">
            <div class="d-flex text-uppercase mb-2">
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
                    <div class="overline">learned</div>
                    <div class="caption">{{ percentage }}%</div>
                </div>
                <v-spacer></v-spacer>
                <v-chip
                    small
                    outlined
                    @click="onView"
                    :color="card.color"
                    :disabled="disabled"
                >
                    {{ `${percentage == 100 ? 'review' : 'browse'}` }}
                </v-chip>
            </template>
        </div>
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
    computed: {
        dark() {
            return this.$vuetify.theme.dark;
            ``;
        },
        labels() {
            return this.$store.getters.labels.filter((label) =>
                this.card.labels.includes(label.docId)
            );
        },
        percentage() {
            let totalCards = this.card.cards.length;
            return totalCards
                ? parseInt((this.totalLearned / totalCards) * 100)
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
    },
};
</script>

<style></style>
