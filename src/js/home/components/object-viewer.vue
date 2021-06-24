<template>
    <b-row>
        <b-col>
            <b-input placeholder="First name" v-model="firstNameComp"></b-input>
        </b-col>
        <b-col>
            <b-input placeholder="Last name" v-model="lastName"></b-input>
        </b-col>
        <b-col>
            <b-input placeholder="Middle name" v-model="middleName"></b-input>
        </b-col>
    </b-row>
</template>

<script>
module.exports = {
    props: {
        firstName: null,
        lastName: null,
        middleName: null,
    },
    computed: {
        firstNameComp: {
            get() {
                return this.firstName;
            },
            set(val) { console.log(val)
                this.$emit('update:firstName', val);
            }
        }
    },
};
</script>