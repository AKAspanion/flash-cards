<template>
    <div class="profile-container">
        <bar-top @click:left="goBack">
            <template #left-button>
                <v-icon size="32" color="primary">mdi-arrow-left</v-icon>
            </template>
            <template #left-text>
                {{ $t('common.home') }}
            </template>
        </bar-top>
        <div class="profile-content">
            <div class="px-8 pb-8">
                <div class="d-flex align-center profile-avatar">
                    <v-avatar
                        size="88"
                        class="ml-n1"
                        @click="
                            editingUrl = true;
                            editingName = false;
                        "
                        :color="!$vuetify.theme.dark ? 'white' : '#404040'"
                    >
                        <v-img
                            v-if="editingUrl"
                            v-show="!imageErr"
                            :src="user.photoURL || 'a'"
                            @load="imageErr = false"
                            @error="imageErr = true"
                        ></v-img>
                        <v-img
                            v-else
                            v-show="!imageErr"
                            @load="imageErr = false"
                            @error="imageErr = true"
                            :src="currentUser.photoURL || 'a'"
                        ></v-img>
                        <v-icon v-show="imageErr" size="88" color="primary">
                            mdi-face
                        </v-icon>
                    </v-avatar>
                    <template v-if="editingUrl">
                        <v-text-field
                            dense
                            rounded
                            outlined
                            autofocus
                            hide-details
                            class="pl-3"
                            v-model="user.photoURL"
                            append-icon="mdi-check"
                            placeholder="Enter your photo url"
                            @click:append="onUserEdit()"
                        ></v-text-field>
                        <v-btn icon class="ml-3" @click="resetEdit('url')">
                            <v-icon>
                                mdi-close
                            </v-icon>
                        </v-btn>
                    </template>
                </div>
                <div class="d-flex title profile-text">
                    <template v-if="!editingName">
                        <div
                            class="pt-3 pb-1"
                            @click="
                                editingName = true;
                                editingUrl = false;
                            "
                        >
                            {{ currentUser.displayName || 'na' }}
                        </div>
                    </template>
                    <template v-else>
                        <v-text-field
                            dense
                            rounded
                            outlined
                            autofocus
                            hide-details
                            class="pt-2"
                            v-model="user.displayName"
                            append-icon="mdi-check"
                            placeholder="Enter your name"
                            @click:append="onUserEdit()"
                        ></v-text-field>
                        <v-btn
                            icon
                            class="ml-3 mt-2"
                            @click="resetEdit('name')"
                        >
                            <v-icon>
                                mdi-close
                            </v-icon>
                        </v-btn>
                    </template>
                </div>
                <div
                    class="text-lowercase caption profile-text"
                    :class="editingName ? 'mt-2' : 'mt-n2'"
                >
                    {{ currentUser.email || 'na' }}
                </div>
            </div>
            <v-card
                flat
                class="profile-card"
                :color="dark ? '#212121' : '#e0e0e0'"
                min-height="calc(100vh - 300px)"
            >
                <div class="profile-card-content">
                    <div
                        :key="i"
                        v-for="(time, i) in timeMeta"
                        class="d-flex align-start pb-8"
                    >
                        <v-icon>{{ time.icon }}</v-icon>
                        <div class="pl-8">
                            <div class="caption">{{ $t(time.name) }}</div>
                            <div class="subtitle-2">
                                {{ currentUser[time.key].slice(0, 16) }}
                            </div>
                        </div>
                    </div>
                    <div class="d-flex align-start pb-8">
                        <v-icon>mdi-label-variant</v-icon>
                        <div class="pl-8">
                            <div class="caption">
                                {{ $t('profile.label.title') }}
                            </div>
                            <div class="subtitle-2">
                                {{ $t('profile.label.subtitle') }}
                            </div>
                            <div class="subtitle-2">
                                <v-list-item dense class="px-0">
                                    <v-list-item-content class="py-1">
                                        <v-text-field
                                            flat
                                            dense
                                            rounded
                                            outlined
                                            hide-details
                                            v-model="label"
                                            :disabled="labelLoading"
                                            @keyup.enter="onLabelCreate"
                                            @focus="hideSignout = true"
                                            @blur="hideSignout = false"
                                            :placeholder="
                                                $t('profile.label.create')
                                            "
                                        >
                                        </v-text-field>
                                    </v-list-item-content>
                                    <v-list-item-action>
                                        <v-btn
                                            icon
                                            color="primary"
                                            @click="onLabelCreate"
                                            :disabled="
                                                labelLoading || !this.label
                                            "
                                        >
                                            <v-icon>{{
                                                !selectedLabel
                                                    ? 'mdi-plus-circle'
                                                    : 'mdi-check'
                                            }}</v-icon>
                                        </v-btn>
                                    </v-list-item-action>
                                </v-list-item>
                                <div class="py-1 mt-n2">
                                    <v-chip
                                        small
                                        outlined
                                        color="primary"
                                        class="mr-3 mt-2"
                                        :key="label.docId"
                                        v-for="label in labels"
                                        @click="onLabelClick(label)"
                                        :input-value="
                                            selectedLabel &&
                                                label.docId ===
                                                    selectedLabel.docId
                                        "
                                    >
                                        {{ label.label }}
                                    </v-chip>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </v-card>
        </div>
        <btn-action
            rounded
            height="50"
            color="primary"
            @click="onSignout"
            v-if="hideSignoutBtn"
        >
            Sign out
        </btn-action>
    </div>
</template>

<script>
import { navigateToPath, loadData } from '@/util';
import BarTop from '@/components/BarTop.vue';
import BtnAction from '@/components/BtnAction.vue';
import FirebaseWeb from '@/firebase';
const firebase = new FirebaseWeb();
export default {
    name: 'Profile',
    components: { BarTop, BtnAction },
    data() {
        return {
            editingUrl: false,
            editingName: false,
            selectedLabel: null,
            labelLoading: false,
            hideSignout: false,
            editLoading: false,
            label: '',
            imageErr: false,
            user: {
                displayName: '',
                photoURL: '',
            },
            timeMeta: [
                {
                    icon: 'mdi-calendar-star',
                    name: 'profile.member',
                    key: 'creationTime',
                },
                {
                    icon: 'mdi-clock',
                    name: 'profile.login',
                    key: 'lastSignInTime',
                },
            ],
        };
    },
    computed: {
        hideSignoutBtn() {
            return this.$vuetify.breakpoint.xsOnly ? !this.hideSignout : true;
        },
        currentUser() {
            return this.$store.getters.user;
        },
        labels() {
            return this.$store.getters.labels;
        },
        dark() {
            return this.$vuetify.theme.dark;
        },
        userSame() {
            return (
                JSON.stringify(this.currentUser) === JSON.stringify(this.user)
            );
        },
    },
    watch: {
        selectedLabel: {
            handler(val) {
                if (val) {
                    this.label = this.selectedLabel.label;
                } else {
                    this.label = '';
                }
            },
            deep: true,
        },
    },
    methods: {
        goBack() {
            navigateToPath('/home');
        },
        onSignout() {
            firebase.signOut();
        },
        onLabelCreate() {
            this.labelLoading = true;
            if (this.selectedLabel) {
                if (this.selectedLabel.label !== this.label) {
                    firebase
                        .updateLabel({
                            ...this.selectedLabel,
                            label: this.label,
                        })
                        .then((res) => {
                            this.$store.dispatch('UPDATE_LABEL', {
                                ...this.selectedLabel,
                                label: this.label,
                            });
                        })
                        .catch((err) => {
                            // TODO
                        })
                        .finally(() => {
                            this.resetLabel();
                        });
                } else {
                    this.resetLabel();
                }
            } else {
                firebase
                    .addLabel(this.currentUser, this.label)
                    .then((res) => {
                        this.$store.dispatch('ADD_LABEL', {
                            docId: res.id,
                            label: this.label,
                            uid: this.currentUser.uid,
                        });
                    })
                    .catch((err) => {
                        //TODO
                    })
                    .finally(() => {
                        this.resetLabel();
                    });
            }
        },
        onLabelClick(label) {
            if (
                this.selectedLabel &&
                this.selectedLabel.docId === label.docId
            ) {
                this.selectedLabel = null;
            } else {
                this.selectedLabel = label;
            }
        },
        onUserEdit() {
            this.editLoading = true;
            firebase
                .updateUserProfile(this.user)
                .then(() => {
                    this.$store.dispatch('SET_LOCAL_USER', {
                        ...this.user,
                    });
                })
                .catch((e) => {
                    this.$store.dispatch(
                        'SHOW_SNACK',
                        this.$t('toast.error.name.edit')
                    );
                })
                .finally(() => {
                    this.editingUrl = false;
                    this.editingName = false;
                    this.editLoading = false;
                });
        },
        resetLabel() {
            this.label = '';
            this.labelLoading = false;
            this.selectedLabel = null;
        },
        resetEdit(type) {
            switch (type) {
                case 'url':
                    this.editingUrl = false;
                    this.user.photoURL = this.currentUser.photoURL;
                    break;
                case 'name':
                    this.editingName = false;
                    this.user.displayName = this.currentUser.displayName;
                    break;
                default:
                    break;
            }
        },
    },
    mounted() {
        if (!this.$store.getters.landingVisited) {
            this.labelLoading = true;
            this.$store.dispatch('LOADING', true);
            loadData(this.currentUser)
                .then((data) => {
                    this.$store.dispatch('SET_FLASH_CARDS', data[0]);
                    this.$store.dispatch('SET_LABELS', data[1]);
                    this.$store.dispatch('LANDING_VISITED', true);
                })
                .catch(() => {
                    this.$store.dispatch('SET_FLASH_CARDS', []);
                    this.$store.dispatch('SET_LABELS', []);
                    this.$store.dispatch('LANDING_VISITED', false);
                })
                .finally(() => {
                    this.labelLoading = true;
                    this.$store.dispatch('LOADING', false);
                });
        }
        this.user = { ...this.currentUser };
    },
};
</script>

<style scoped>
.profile-container {
    min-height: 100vh;
}
.profile-content {
    height: calc(100vh - 136px);
}
.profile-text {
    padding-left: 2px;
    transition: all 0.3s ease-in-out;
}
.profile-card {
    padding-top: 1px;
    height: calc(100vh - 136px);
    border-bottom-right-radius: 0px !important;
    border-bottom-left-radius: 0px !important;
    padding-bottom: 88px !important;
}
.profile-card-content {
    height: calc(100vh - 317px);
    padding: 32px 32px 88px 32px;
    overflow-y: auto;
}
.profile-avatar {
    min-height: 72px;
}
</style>
