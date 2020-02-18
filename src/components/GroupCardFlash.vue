<template>
    <div class="group-card-slider" id="cardslidercontainer">
        <section
            :key="card.id + index"
            v-for="(card, index) in value"
            :style="`width: ${mobile ? '82.5' : '70.5'}vw;`"
        >
            <card-flash
                :number="index + 1"
                :browse="browse"
                :color="color"
                :value="card"
                :labels="labels"
                @input="onUpdate"
                @delete="onDelete"
            ></card-flash>
        </section>
        <section>
            <div class="dummy-section"></div>
        </section>
    </div>
</template>

<script>
import CardFlash from '@/components/CardFlash.vue';
export default {
    props: ['value', 'color', 'labels', 'browse'],
    components: {
        CardFlash,
    },
    data() {
        return {
            model: null,
            scrolling: false
        };
    },
    computed: {
        mobile() {
            return this.$vuetify.breakpoint.xsOnly;
        },
    },
    methods: {
        onUpdate(val) {
            let newData = [...this.value];
            newData[newData.findIndex((obj) => obj.id === val.id)] = {
                ...val,
            };
            this.$emit('input', newData);
        },
        onDelete(val) {
            let newData = this.value.filter((obj) => obj.id !== val.id);
            this.$emit('input', newData);
        },
        handleScroll(event){
            if(this.scrolling) return;
            let container = document.getElementById('cardslidercontainer');
            container.scrollLeft += event.deltaY * 5;
            this.scrolling = true;
            setTimeout(()=>{
                this.scrolling = false;
            }, 500)
        }
    },
    created(){
        if(!this.mobile){
            this.$nextTick(()=>{
                let container = document.getElementById('cardslidercontainer');
                container.addEventListener('wheel', this.handleScroll, false);
            })
        }
    },
    destroyed(){
        if(!this.mobile){
            let container = document.getElementById('cardslidercontainer');
            container.removeEventListener('wheel', this.handleScroll, false);  
        }  
    }
};
</script>

<style scoped>
.group-card-slider {
    display: flex;
    overflow-x: scroll;
    scroll-behavior: smooth;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
}
section {
    position: relative;
    height: calc(100vh - 160px);
    scroll-snap-align: none center;
}
.dummy-section {
    width: 32px !important;
    height: calc(100vh - 160px);
}
section:first-child {
    margin-left: 32px;
}
.group-card-slider::-webkit-scrollbar {
    width: 0 !important;
}
.group-card-slider {
    overflow: -moz-scrollbars-none;
}
.group-card-slider {
    -ms-overflow-style: none;
}
.group-card-btn {
    position: absolute;
    bottom: 38px;
}
.group-card-btn--right {
    left: calc(50% + 99px);
}
.group-card-btn--left {
    left: calc(50% - 144px);
}
</style>
