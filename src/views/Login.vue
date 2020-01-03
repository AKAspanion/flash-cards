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
                <v-btn type="submit" :loading="loading">Login</v-btn>
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
            loading: false
        };
    },
    methods: {
        onLogin() {
            this.loading = true;
            firebase.signInWithEmail(this.user)
                .then(()=>{
                    navigateToPath('/home');
                })
                .catch((err)=>{
                    console.log(err);
                })
                .finally(()=>{                
                    this.loading = false;
                })
        },
    },
};
</script>

<style></style>
