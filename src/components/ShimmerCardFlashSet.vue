<template>
    <v-card raised :color="dark ? '#212121' : '#eeeeee'" height="182">
        <v-card class="pa-6" height="100">
            <v-row no-gutters>
                <v-skeleton-loader
                    type="heading"
                    width="100%"
                ></v-skeleton-loader>
                <v-skeleton-loader
                    style="position: absolute; right: -10px;"
                    type="heading"
                    width="80"
                ></v-skeleton-loader>
            </v-row>
            <v-row no-gutters class="my-3">
                <v-skeleton-loader
                    type="heading"
                    width="150"
                ></v-skeleton-loader>
                <v-skeleton-loader
                    type="heading"
                    width="150"
                    style="position: absolute; left: 100px;"
                ></v-skeleton-loader>
            </v-row>
        </v-card>
        <div class="pa-6">
            <v-row no-gutters align="center">
                <div>
                    <v-skeleton-loader
                        type="text"
                        width="100"
                    ></v-skeleton-loader>
                    <v-skeleton-loader
                        type="text"
                        width="40"
                    ></v-skeleton-loader>
                </div>
                <v-spacer></v-spacer>
                <v-skeleton-loader
                    style="margin-right: -60px;"
                    type="heading"
                    width="120"
                ></v-skeleton-loader>
            </v-row>
        </div>
    </v-card>
</template>

<script>
export default {
    computed: {
        dark() {
            return this.$vuetify.theme.dark;
        },
    },
};
</script>

<style></style>
