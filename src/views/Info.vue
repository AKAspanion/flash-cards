<template>
    <div>
        <bar-top @click:left="goBack">
            <template #left-button>
                <v-icon size="32" color="primary">mdi-arrow-left</v-icon>
            </template>
            <template #left-text>
                {{ $t('common.home') }}
            </template>
        </bar-top>
        <div class="info-container">
            <div class="info-logo">
                <div class="info-logo--img">
                    <v-img src="/images/flash-cards-logo.png"></v-img>
                </div>
                <div class="info-logo--text headline full-width">
                    FLASHCARDS
                </div>
                <div class="info-logo--text subtitle-1 full-width">
                    Memorization Application
                </div>
            </div>
            <v-card
                flat
                class="info-card"
                :color="dark ? '#212121' : '#e0e0e0'"
                min-height="calc(100vh - 436px)"
            >
                <div class="info-content">
                    <div class="d-flex align-start pb-8">
                        <v-icon>mdi-glasses</v-icon>
                        <div class="pl-8">
                            <div class="subtitle-2">{{ 'Author' }}</div>
                            <div class="caption">
                                {{ 'Ankit Kumar Pandit' }}
                            </div>
                        </div>
                    </div>
                    <div class="d-flex align-start pb-8">
                        <v-icon>mdi-alpha-v-circle-outline</v-icon>
                        <div class="pl-8">
                            <div class="subtitle-2">{{ 'Version' }}</div>
                            <div class="caption">
                                {{ '0.0.1 beta' }}
                            </div>
                        </div>
                    </div>
                    <div class="d-flex align-start pb-8">
                        <v-icon>mdi-share-variant</v-icon>
                        <div class="pl-8 pb-2">
                            <div class="subtitle-2">{{ 'Share' }}</div>
                            <div class="caption">
                                {{ 'Share the app' }}
                            </div>
                        </div>
                        <v-spacer></v-spacer>
                        <v-btn
                            small
                            icon
                            class="ml-3"
                            @click="copyLink('play')"
                        >
                            <v-icon>mdi-google-play</v-icon>
                        </v-btn>
                        <v-btn small class="ml-3" icon @click="copyLink('web')">
                            <v-icon>mdi-web</v-icon>
                        </v-btn>
                    </div>
                    <div class="d-flex align-start pb-8">
                        <v-icon>mdi-star</v-icon>
                        <div class="pl-8 pb-2">
                            <div class="subtitle-2">{{ 'Rate' }}</div>
                            <div class="caption">
                                {{ 'Rate on play store' }}
                            </div>
                        </div>
                        <v-spacer></v-spacer>
                        <v-btn small icon @click="openPlayStore">
                            <v-icon>mdi-message-draw</v-icon>
                        </v-btn>
                    </div>
                </div>
            </v-card>
        </div>
    </div>
</template>

<script>
import { navigateToPath } from '@/util';
import BarTop from '@/components/BarTop.vue';
export default {
    name: 'Info',
    components: {
        BarTop,
    },
    data() {
        return {
            url: {
                play:
                    'https://play.google.com/store/apps/details?id=com.flashcards.twa',
                web: 'https://spanion-flash-cards.web.app/',
            },
        };
    },
    computed: {
        dark() {
            return this.$vuetify.theme.dark;
        },
    },
    methods: {
        goBack() {
            navigateToPath('/home');
        },
        copyLink(type) {
            let that = this;
            navigator.clipboard
                .writeText(this.url[type])
                .then(() => {
                    let text = '';
                    switch (type) {
                        case 'play':
                            text = 'Google play store link copied!';
                            break;
                        case 'web':
                            text = 'WEB app link copied!';
                            break;
                        default:
                            break;
                    }
                    that.$store.dispatch('SHOW_SNACK', text);
                })
                .catch(() => {
                    that.$store.dispatch('SHOW_SNACK', 'Could not copy text');
                });
        },
        openPlayStore() {
            window.open(this.url);
        },
    },
};
</script>

<style scoped>
.info-logo {
    height: 300px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}
.info-logo--img {
    width: 160px;
    padding: 12px;
}
.info-logo--text {
    text-align: center;
}
.info-card {
    height: calc(100vh - 436px);
    border-bottom-right-radius: 0px !important;
    border-bottom-left-radius: 0px !important;
    padding-bottom: 88px !important;
}
.info-content {
    padding-top: 1px;
    height: calc(100vh - 437px);
    padding: 32px 32px 88px 32px;
    overflow-y: auto;
}
</style>
