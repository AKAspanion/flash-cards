<template>
    <div
        class="login-container"
        :style="`background: ${dark ? '#212121' : '#e0e0e0'}`"
    >
        <div class="login-wrapper">
            <img alt="logo" src="images/flash-cards-logo.png" style="width:64px;" />
            <div class="pt-4 headline text-uppercase">Flashcards</div>
            <div class="pa-2 pb-6 caption font-weight-light">
                {{ isSignIn ? 'Login to application' : 'Create an account' }}
            </div>
            <div class="login-content elevation-2">
                <v-form
                    ref="formLogin"
                    v-model="loginForm"
                    @submit.prevent="isSignIn ? onLogin() : onSignup()"
                >
                    <div>
                        <v-text-field
                            solo
                            flat
                            rounded
                            autofocus
                            height="48"
                            label="Email"
                            hide-details
                            class="email-field"
                            v-model="user.email"
                            :rules="[rules.empty.email, rules.nospace.email]"
                        ></v-text-field>
                        <v-text-field
                            solo
                            flat
                            rounded
                            height="48"
                            hide-details
                            type="password"
                            label="Password"
                            class="password-field"
                            v-model="user.password"
                            :rules="[
                                rules.empty.password,
                                rules.nospace.password,
                            ]"
                        ></v-text-field>
                        <v-expand-transition>
                            <v-text-field
                                solo
                                flat
                                rounded
                                height="48"
                                hide-details
                                v-if="!isSignIn"
                                type="password"
                                label="Re-Enter Password"
                                class="password-field"
                                v-model="user.repassword"
                                :rules="[
                                    rules.empty.password,
                                    rules.nospace.password,
                                ]"
                            ></v-text-field>
                        </v-expand-transition>
                    </div>
                    <v-btn
                        block
                        rounded
                        depressed
                        height="48"
                        type="submit"
                        color="primary"
                        :disabled="!loginForm"
                        :loading="logingIn || signingUp"
                    >
                        {{ !isSignIn ? 'Sign up' : 'Login' }}
                    </v-btn>
                </v-form>
            </div>
            <div class="overline py-6">OR</div>
            <div class="d-flex justify-center">
                <v-btn
                    icon
                    class="ma-1"
                    @click="isSignIn ? onGoolgeSignin() : onGoogleSignUp()"
                >
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
                repassword: '',
            },
            rules: {
                empty: {
                    email: (v) => !!v || this.$t('email.enter'),
                    password: (v) => !!v || this.$t('rule.password.required'),
                },
                nospace: {
                    password: (v) =>
                        (v && !/\s/g.test(v)) || this.$t('rule.space.password'),
                    email: (v) =>
                        (v && !/\s/g.test(v)) || this.$t('rule.space.email'),
                },
            },
            logingIn: false,
            signingUp: false,
            loginForm: false,
            isSignIn: true,
        };
    },
    computed: {
        dark() {
            return this.$vuetify.theme.dark;
        },
        passValid() {
            let { password, repassword } = this.user;
            return password === repassword;
        },
    },
    methods: {
        onGoolgeSignin() {
            firebase.signInWithGoogle();
        },
        onGoogleSignUp() {
            firebase.signUpWithGoogle();
        },
        onSignup() {
            if (this.passValid) {
                this.signingUp = true;
                firebase
                    .signUpWithEmail({
                        email: this.user.email,
                        password: this.user.password,
                    })
                    .then((response) => {
                        this.$store.dispatch(
                            'SHOW_SNACK',
                            this.$t('toast.success.sign-up')
                        );
                        this.navigateToPath('/home');
                    })
                    .catch((err) => {
                        this.$store.dispatch(
                            'SHOW_SNACK',
                            err.message || this.$t('toast.error.sign-up')
                        );
                    })
                    .then(() => {
                        this.signingUp = false;
                    });
            } else {
                this.$store.dispatch('SHOW_SNACK', 'Passwords do not match!');
            }
        },
        onLogin() {
            this.logingIn = true;
            firebase
                .signInWithEmail(this.user)
                .then(() => {
                    navigateToPath('/home');
                })
                .catch((err) => {
                    this.$store.dispatch('SHOW_SNACK', err.message);
                })
                .finally(() => {
                    this.logingIn = false;
                });
        },
    },
    mounted() {
        if (firebase.getUser()) {
            navigateToPath('/home');
        }
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
