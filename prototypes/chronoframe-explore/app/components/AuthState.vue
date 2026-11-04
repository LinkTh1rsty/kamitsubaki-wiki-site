<script setup lang="ts">
const { loggedIn, user, session, ready, clear } = useUserSession()
</script>
<template><slot :logged-in="loggedIn" :user="user" :session="session" :ready="ready" :clear="clear" /></template>
