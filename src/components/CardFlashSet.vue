<template>
    <v-card raised dark height="30vh">
        <v-card color="primary" height="20vh" class="pa-6">
            <div class="text-uppercase">
                {{ card.title }}
            </div>
        </v-card>
        <div class="d-flex align-center px-6 py-5">
            <div>
                <div class="grey--text overline">learned</div>
                <div class="caption">100%</div>
            </div>
            <v-spacer></v-spacer>
            <v-chip small class="primary" outlined @click="onEdit">EDIT</v-chip>
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
    methods: {
        onEdit() {
            navigateToPath(`/${this.card.id}/edit`);
        },
    },
};
</script>

<style></style>
