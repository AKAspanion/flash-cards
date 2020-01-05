<template>
    <v-menu v-model="menu" :close-on-content-click="false">
        <template #activator="{on}">
            <v-btn :color="value" small icon v-on="on">
                <v-icon>
                    mdi-palette
                </v-icon>
            </v-btn>
        </template>
        <v-card flat class="pa-6" width="272">
            <v-item-group mandatory :value="value" @change="update">
                <v-row no-gutters>
                    <template v-for="color in colors">
                        <v-item
                            :key="color"
                            :value="color"
                            v-slot:default="{ active, toggle }"
                        >
                            <v-avatar
                                class="ma-1"
                                :color="color"
                                @click="toggle"
                            >
                                <v-fab-transition>
                                    <v-icon v-if="active" dark>
                                        mdi-check
                                    </v-icon>
                                </v-fab-transition>
                            </v-avatar>
                        </v-item>
                    </template>
                </v-row>
            </v-item-group>
            <div class="d-flex">
                <v-spacer></v-spacer>
                <v-btn class="mt-4" text @click="menu = false">
                    done
                </v-btn>
            </div>
        </v-card>
    </v-menu>
</template>

<script>
export default {
    props: ['value'],
    data() {
        return {
            menu: false,
            colors: [
                '#F4511E',
                '#43A047',
                '#009688',
                '#1E88E5',
                '#5E35B1',
                '#8E24AA',
                '#827717',
                '#E91E63',
            ],
        };
    },
    methods: {
        update(val) {
            this.$emit('input', val);
        },
    },
};
</script>

<style></style>
