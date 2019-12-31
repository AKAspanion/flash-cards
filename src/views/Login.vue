<template>
    <div class="d-flex fill fill-height align-center justify-center">
        <v-card class="pa-4">
            <v-form
                ref="formLogin"
                v-model="loginForm"
                @submit.prevent="onLogin"
            >
                <v-text-field label="Email" v-model="user.email"></v-text-field>
                <v-text-field
                    label="Password"
                    v-model="user.password"
                ></v-text-field>
                <v-btn type="submit">Login</v-btn>
            </v-form>
        </v-card>
    </div>
</template>

<script>
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
        };
    },
    methods: {
        onLogin() {
            if (!firebase.isAppInitialized()) {
                firebase.initializeFirebase();
            }
            firebase.signInWithEmail(this.user);
        },
    },
};
</script>

<style></style>
