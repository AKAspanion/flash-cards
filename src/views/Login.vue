<template>
    <div class="login-container">
        <div style="height:60vh"></div>
        <v-card
            flat
            class="px-6 py-7 login-content"
            :color="dark ? '#212121' : '#e0e0e0'"
        >
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

<style scoped>
.login-container {
    height: 100vh;
    background: #e91e63;
}
.login-content {
    height: 40vh;
    border-bottom-right-radius: 0px !important;
    border-bottom-left-radius: 0px !important;
}
</style>
