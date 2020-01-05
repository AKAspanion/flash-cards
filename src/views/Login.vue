<template>
    <div
        class="d-flex fill-height align-center justify-center"
        style="height: 100vh;"
    >
        <v-card class="pa-6">
            <v-form
                ref="formLogin"
                v-model="loginForm"
                @submit.prevent="onLogin"
            >
                <v-text-field
                    rounded
                    outlined
                    label="Email"
                    v-model="user.email"
                ></v-text-field>
                <v-text-field
                    rounded
                    outlined
                    type="password"
                    label="Password"
                    v-model="user.password"
                ></v-text-field>
                <div class="d-flex align-center">
                    <v-spacer></v-spacer>
                    <v-btn
                        type="submit"
                        rounded
                        color="primary"
                        :loading="loading"
                    >
                        Login
                    </v-btn>
                </div>
            </v-form>
        </v-card>
    </div>
</template>

<script>
import { navigateToPath } from '@/util';
import FirebaseWeb from '@/firebase';
const firebase = new FirebaseWeb();

export default {
    data() {
        return {
            user: {
                email: '',
                password: '',
            },
            loginForm: false,
            loading: false,
        };
    },
    methods: {
        onLogin() {
            this.loading = true;
            firebase
                .signInWithEmail(this.user)
                .then(() => {
                    navigateToPath('/home');
                })
                .catch((err) => {
                    this.$store.dispatch('SHOW_SNACK', err.message);
                })
                .finally(() => {
                    this.loading = false;
                });
        },
    },
};
</script>

<style></style>
