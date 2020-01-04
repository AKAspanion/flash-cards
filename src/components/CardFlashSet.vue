<template>
    <v-card raised :color="dark ? '#212121' : '#e0e0e0'" height="200">
        <v-card dark :color="card.color || 'primary'" height="116" class="pa-6">
            <div class="text-uppercase">
                {{ card.title }}
            </div>
        </v-card>
        <div class="d-flex align-center pa-6">
            <div>
                <div class="overline">learned</div>
                <div class="caption">100%</div>
            </div>
            <v-spacer></v-spacer>
            <v-chip small color="primary" outlined @click="onEdit">EDIT</v-chip>
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
        },
    },
    methods: {
        onEdit() {
            navigateToPath(`/${this.card.id}/edit`);
        },
    },
};
</script>

<style></style>
