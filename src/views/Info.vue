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
                        <v-icon>mdi-dev-to</v-icon>
                        <div class="pl-8">
                            <div class="caption">{{ 'Author' }}</div>
                            <div class="subtitle-2">
                                {{ 'Ankit Kumar Pandit' }}
                            </div>
                        </div>
                    </div>
                    <div class="d-flex align-start pb-8">
                        <v-icon>mdi-alpha-v-circle-outline</v-icon>
                        <div class="pl-8">
                            <div class="caption">{{ 'Version' }}</div>
                            <div class="subtitle-2">
                                {{ '0.0.1 beta' }}
                            </div>
                        </div>
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
    computed:{  
        dark() {
            return this.$vuetify.theme.dark;
        },
    },
    methods: {
        goBack() {
            navigateToPath('/home');
        },
    },
};
</script>

<style scoped>
.info-logo{
    height: 300px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}
.info-logo--img{
    width: 160px;
    padding: 12px;
}
.info-logo--text{
    text-align: center;
}
.info-card{
    height: calc(100vh - 436px);
    border-bottom-right-radius: 0px !important;
    border-bottom-left-radius: 0px !important;
    padding-bottom: 88px !important;
}
.info-content{   
    padding-top: 1px; 
    height: calc(100vh - 437px);
    padding: 32px 32px 88px 32px;
    overflow-y: auto;
}
</style>
