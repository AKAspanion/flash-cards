<template>
    <div class="profile-container">
        <bar-top @click:left="goBack">
            <template #left-button>
                <v-icon size="32" color="primary">mdi-arrow-left</v-icon>
            </template>
            <template #left-text>
                home
            </template>
        </bar-top>
        <div class="profile-content">
            <div class="px-8 pb-8">
                <v-avatar
                    size="72"
                    class="ml-n1"
                    :color="!$vuetify.theme.dark ? 'white' : '#404040'"
                >
                    <template v-if="currentUser.photoURL">
                        <v-img :src="currentUser.photoURL"></v-img>
                    </template>
                    <template v-else>
                        <div
                            v-if="currentUser.displayName"
                            class="display-1 font-weight-medium"
                        >
                            {{ getInitials(currentUser.displayName) }}
                        </div>
                        <v-icon v-else size="72" color="primary"
                            >mdi-face</v-icon
                        >
                    </template>
                </v-avatar>
                <div class="text-capitalize title profile-text">
                    {{ currentUser.displayName || 'na' }}
                </div>
                <div class="text-lowercase caption profile-text">
                    {{ currentUser.email || 'na' }}
                </div>
            </div>
            <v-card
                flat
                :color="dark ? '#212121' : '#e0e0e0'"
                class="pa-8 profile-card"
                min-height="calc(100vh - 292px)"
            >
                <div class="d-flex align-start pb-8">
                    <v-icon>mdi-calendar</v-icon>
                    <div class="pl-8">
                        <div class="caption">Member Since</div>
                        <div class="subtitle-2">
                            {{ currentUser.userSince.slice(0, 16) }}
                        </div>
                    </div>
                </div>
                <div class="d-flex align-start">
                    <v-icon>mdi-label-variant</v-icon>
                    <div class="pl-8">
                        <div class="caption">Your Labels</div>
                        <div class="subtitle-2">
                            Create new label or select one to edit
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
                                        :placeholder="`Create new label`"
                                    >
                                    </v-text-field>
                                </v-list-item-content>
                                <v-list-item-action>
                                    <v-btn
                                        icon
                                        color="primary"
                                        @click="onLabelCreate"
                                        :disabled="labelLoading || !this.label"
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
                                            label.docId === selectedLabel.docId
                                    "
                                >
                                    {{ label.label }}
                                </v-chip>
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
import { navigateToPath, getInitials, loadData } from '@/util';
import BarTop from '@/components/BarTop.vue';
import BtnAction from '@/components/BtnAction.vue';
import FirebaseWeb from '@/firebase';
const firebase = new FirebaseWeb();
export default {
    name: 'Profile',
    components: { BarTop, BtnAction },
    data() {
        return {
            selectedLabel: null,
            labelLoading: false,
            hideSignout: false,
            displayName: '',
            label: '',
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
        getInitials(name) {
            getInitials(name);
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
                            //TODO
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
        resetLabel() {
            this.label = '';
            this.labelLoading = false;
            this.selectedLabel = null;
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
    },
};
</script>

<style scoped>
.profile-container {
    min-height: 100vh;
}
.profile-content {
    height: calc(100vh - 136px);
    overflow-y: auto;
}
.profile-text {
    padding-left: 2px;
}
.profile-card {
    border-bottom-right-radius: 0px !important;
    border-bottom-left-radius: 0px !important;
    padding-bottom: 88px !important;
}
</style>
