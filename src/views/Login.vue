<template>
    <div
        class="login-container"
        :style="`background: ${dark ? '#212121' : '#e0e0e0'}`"
    >
        <div class="login-wrapper">
            <img src="images/flash-cards-logo.png" style="width:64px;" />
            <div class="pt-4 headline text-uppercase">Flashcards</div>
            <div class="pa-2 pb-6 caption font-weight-light">
                {{ isSignIn ? 'Login to application' : 'Create an account' }}
            </div>
            <div class="login-content elevation-2">
                <v-form
                    ref="formLogin"
                    v-model="loginForm"
                    @submit.prevent="onLogin"
                >
                    <div>
                        <v-text-field
                            solo
                            flat
                            rounded
                            autofocus
                            height="56"
                            label="Email"
                            hide-details
                            class="email-field"
                            v-model="user.email"
                        ></v-text-field>
                        <v-text-field
                            solo
                            flat
                            rounded
                            height="56"
                            hide-details
                            type="password"
                            label="Password"
                            class="password-field"
                            v-model="user.password"
                        ></v-text-field>
                        <v-expand-transition>
                            <v-text-field
                                solo
                                flat
                                rounded
                                height="56"
                                hide-details
                                v-if="!isSignIn"
                                type="password"
                                label="Re-enter Password"
                                class="password-field"
                                v-model="user.password"
                            ></v-text-field>
                        </v-expand-transition>
                    </div>
                    <v-btn
                        dark
                        block
                        rounded
                        depressed
                        height="56"
                        type="submit"
                        color="primary"
                        :loading="loading"
                    >
                        {{ !isSignIn ? 'Sign up' : 'Login' }}
                    </v-btn>
                </v-form>
            </div>
            <div class="overline py-6">OR</div>
            <div class="d-flex justify-center">
                <v-btn icon class="ma-1">
                    <v-icon color="rgb(59, 89, 152)">
                        mdi-facebook
                    </v-icon>
                </v-btn>
                <v-btn icon class="ma-1">
                    <v-icon color="rgb(23, 156, 82)">
                        mdi-google
                    </v-icon>
                </v-btn>
            </div>
            <div class="caption py-6">
                {{
                    !isSignIn
                        ? 'Already have an account? '
                        : `Don't have an account? `
                }}
                <span
                    @click="isSignIn = !isSignIn"
                    class="primary--text selectable"
                >
                    {{ isSignIn ? 'Sign up' : 'Login' }}
                </span>
            </div>
        </div>
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
            isSignIn: true,
        };
    },
    computed: {
        dark() {
            return this.$vuetify.theme.dark;
        },
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
    width: 100vw;
    min-height: 100vh;
    display: flex;
    align-items: center;
    background: #e91e63;
    justify-content: center;
}
.login-wrapper {
    width: calc(100% - 64px);
    text-align: center;
    max-width: 400px;
    margin: 0px auto;
}
.login-content {
    border-radius: 24px;
}
.login-content >>> .v-btn--rounded {
    border-top-right-radius: 0px !important;
    border-top-left-radius: 0px !important;
}
.login-content >>> .password-field.v-text-field--rounded {
    border-radius: 0px !important;
}
.login-content >>> .email-field.v-text-field--rounded {
    border-top-right-radius: 24px !important;
    border-top-left-radius: 24px !important;
    border-bottom-right-radius: 0px !important;
    border-bottom-left-radius: 0px !important;
}
</style>
