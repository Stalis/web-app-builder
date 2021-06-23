import _get from 'lodash/get';
import Vue from 'vue';

console.log(_get({ a: { b: {}, c: [ 1, 2, 3]} }, 'a.c[1]'))

let app = new Vue();