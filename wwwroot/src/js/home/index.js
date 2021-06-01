import Vue from 'vue';
import ObjectViewer from './components/object-viewer.vue'

console.log('home/index.js');

globalThis.app = new Vue({
    el: '#root',
    data: {
        user: 'Stalis',
        userData: {
            firstName: null,
            lastName: null,
            middleName: null,
        },
    },
    components: {
        'object-viewer': ObjectViewer,
    },
});