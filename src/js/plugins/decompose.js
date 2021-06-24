import Vue from 'vue';

class DecomposePlugin {
    static install(v, options) {
        Vue.directive('decompose', 
            (el, binding, vnode, oldVnode) => {
                let keys = Object.keys(binding.value);
                keys.forEach(item => {
                    el.attributes.setNamedItem({ name: 'v-bind.sync', value: binding.value[item] });
                });
            }
        );
    }
}

