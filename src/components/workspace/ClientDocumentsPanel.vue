<template>
  <DocumentLibrary :documents="documents" :loading="loading" :error="error" :archived="archived" title="Documents" description="Draft and finalised documents for this client." empty-text="Create a recoverable draft from the client workspace." @create="$emit('create')" @edit="$emit('edit',$event)" @view="$emit('view',$event)" @download="$emit('download',$event)" @archive="$emit('archive',$event)" @restore="$emit('restore',$event)" @update:archived="$emit('update:archived',$event)" />
</template>
<script setup>
import DocumentLibrary from './DocumentLibrary.vue';
defineProps({documents:{type:Array,default:()=>[]},loading:Boolean,error:{type:String,default:''},archived:Boolean});
defineEmits(['create','edit','view','download','archive','restore','update:archived']);
</script>
