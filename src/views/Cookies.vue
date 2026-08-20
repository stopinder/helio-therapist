<template>
  <PublicPageShell title="Cookie information" eyebrow="Privacy" summary="A plain-language description of browser storage used by Helios.">
    <section><h2 class="type-subsection">Current public site</h2><p class="mt-2 type-body text-ink-secondary">The current Helios codebase does not include advertising or analytics cookies, and no non-essential cookie mechanism was found during this Gate 3 review. For that reason, Helios does not currently show a consent banner solely for the public information pages.</p></section>
    <section><h2 class="type-subsection">Authentication and connected services</h2><p class="mt-2 type-body text-ink-secondary">Signing in and using connected third-party services may involve browser storage or cookies that are necessary for authentication, security or the service the user requests. Final production behaviour must be checked in the deployed application before launch.</p></section>
    <section><h2 class="type-subsection">If this changes</h2><p class="mt-2 type-body text-ink-secondary">If Helios later introduces analytics, advertising or other non-essential browser storage, this information and the consent mechanism must be reviewed before that technology is enabled.</p></section>
  </PublicPageShell>
</template>
<script setup>import PublicPageShell from '../components/PublicPageShell.vue'</script>
