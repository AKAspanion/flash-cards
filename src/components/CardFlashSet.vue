<template>
    <v-card raised :color="dark ? '#212121' : '#e0e0e0'" height="190">
        <v-card dark :color="card.color || 'primary'" height="108" class="pa-6">
            <div class="d-flex text-uppercase mb-3">
                <div
                    class="text-truncate"
                    :title="card.title || 'untitled set'"
                >
                    {{ card.title || 'untitled set' }}
                </div>
                <v-spacer></v-spacer>
                <div class="ml-2">
                    <v-chip small outlined @click="onEdit" dark>
                        <v-icon small>mdi-pencil</v-icon>
                    </v-chip>
                </div>
            </div>
            <div class="mt-3">
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
            </div>
        </v-card>
        <div class="d-flex align-center pa-6">
            <div>
                <div class="overline">learned</div>
                <div class="caption">100%</div>
            </div>
            <v-spacer></v-spacer>
            <v-chip small :color="card.color" outlined @click="onView">
                browse
            </v-chip>
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
