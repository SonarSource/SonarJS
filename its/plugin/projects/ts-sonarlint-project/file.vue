<template>
    <p>{{greeting}}</p>
</template>

<script lang="ts">
    var xs: string[] = ["a", "b", "c", "d"];
    delete xs[2];
</script>

<style>
    p {
    text-align: center;
}
</style>
